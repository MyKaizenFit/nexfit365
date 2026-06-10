import json
import logging
import time
import traceback
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from django.conf import settings
from django.core.mail import EmailMessage

logger = logging.getLogger(__name__)

SENSITIVE_KEYS = {
    "authorization",
    "cookie",
    "password",
    "password1",
    "password2",
    "old_password",
    "new_password",
    "token",
    "access",
    "refresh",
    "secret",
    "api_key",
    "apikey",
    "csrfmiddlewaretoken",
}


_RECENT_REPORTS: dict[str, float] = {}
_DEDUP_WINDOW_SECONDS = 60


def is_expected_auth_failure(
    *,
    response_status: int | None,
    response_data: Any = None,
    exc: Exception | None = None,
) -> bool:
    """401 por token caducado o inválido: flujo normal de JWT, no alertar."""
    if response_status != 401:
        return False

    if exc is not None and exc.__class__.__name__ == "InvalidToken":
        return True

    if not isinstance(response_data, dict):
        return False

    if response_data.get("code") == "token_not_valid":
        return True

    detail = str(response_data.get("detail", "")).lower()
    if "token" in detail and ("expired" in detail or "not valid" in detail):
        return True

    for message in response_data.get("messages") or []:
        if isinstance(message, dict):
            text = str(message.get("message", "")).lower()
            if "expired" in text or "blacklisted" in text:
                return True

    return False


def _report_dedup_key(request, response_status: int | None, response_data: Any) -> str:
    meta = getattr(request, "META", {}) or {}
    ip = meta.get("HTTP_CF_CONNECTING_IP") or meta.get("REMOTE_ADDR", "unknown")
    path = getattr(request, "path", "")
    code = ""
    if isinstance(response_data, dict):
        code = str(response_data.get("code", ""))
    return f"{response_status}:{code}:{ip}:{path}"


def _is_duplicate_report(key: str) -> bool:
    now = time.time()
    expired = [item for item, ts in _RECENT_REPORTS.items() if now - ts >= _DEDUP_WINDOW_SECONDS]
    for item in expired:
        _RECENT_REPORTS.pop(item, None)

    last_seen = _RECENT_REPORTS.get(key)
    if last_seen is not None and now - last_seen < _DEDUP_WINDOW_SECONDS:
        return True

    _RECENT_REPORTS[key] = now
    return False


def should_capture_error_report(
    *,
    request,
    response_status: int | None,
    response_data: Any = None,
    exc: Exception | None = None,
) -> bool:
    if is_expected_auth_failure(
        response_status=response_status,
        response_data=response_data,
        exc=exc,
    ):
        return False

    dedup_key = _report_dedup_key(request, response_status, response_data)
    if _is_duplicate_report(dedup_key):
        return False

    return True


def _safe_value(value: Any, depth: int = 0) -> Any:
    if depth > 4:
        return "[truncated-depth]"

    if hasattr(value, "name") and hasattr(value, "size"):
        return {
            "file_name": getattr(value, "name", ""),
            "content_type": getattr(value, "content_type", ""),
            "size": getattr(value, "size", None),
        }

    if isinstance(value, dict):
        return {
            str(key): "[redacted]" if str(key).lower() in SENSITIVE_KEYS else _safe_value(item, depth + 1)
            for key, item in value.items()
        }

    if isinstance(value, (list, tuple)):
        return [_safe_value(item, depth + 1) for item in list(value)[:50]]

    if isinstance(value, bytes):
        return f"[{len(value)} bytes]"

    if isinstance(value, (str, int, float, bool)) or value is None:
        if isinstance(value, str) and len(value) > 2000:
            return value[:2000] + "...[truncated]"
        return value

    return str(value)


def _request_data(request) -> Any:
    try:
        data = getattr(request, "data", None)
        if data is not None:
            if hasattr(data, "dict"):
                data = data.dict()
            return _safe_value(data)
    except Exception as exc:
        return f"[could not read request.data: {exc}]"

    try:
        body = getattr(request, "body", b"")
        if not body:
            return None
        body_text = body[:4000].decode("utf-8", errors="replace")
        content_type = (getattr(request, "META", {}) or {}).get("CONTENT_TYPE", "")
        if "application/json" in content_type:
            try:
                return _safe_value(json.loads(body_text))
            except json.JSONDecodeError:
                pass
        return _safe_value(body_text)
    except Exception as exc:
        return f"[could not read request.body: {exc}]"


def _request_headers(request) -> dict[str, Any]:
    headers = {}
    meta = getattr(request, "META", {}) or {}
    for key, value in meta.items():
        if key.startswith("HTTP_") or key in {"CONTENT_TYPE", "CONTENT_LENGTH", "REMOTE_ADDR"}:
            name = key.removeprefix("HTTP_").replace("_", "-").title()
            headers[name] = "[redacted]" if name.lower() in SENSITIVE_KEYS else _safe_value(value)
    return headers


def _user_info(request) -> dict[str, Any]:
    user = getattr(request, "user", None)
    if not user or not getattr(user, "is_authenticated", False):
        return {"authenticated": False}
    return {
        "authenticated": True,
        "id": getattr(user, "id", None),
        "email": getattr(user, "email", ""),
        "role": getattr(user, "role", ""),
        "is_staff": getattr(user, "is_staff", False),
        "is_superuser": getattr(user, "is_superuser", False),
    }


def _view_info(context: dict[str, Any] | None) -> dict[str, Any]:
    view = (context or {}).get("view")
    if not view:
        return {}
    return {
        "view": view.__class__.__name__,
        "action": getattr(view, "action", None),
        "basename": getattr(view, "basename", None),
    }


def _client_info(headers: dict[str, Any]) -> dict[str, Any]:
    return {
        "path": headers.get("X-Client-Path", ""),
        "url": headers.get("X-Client-Url", ""),
        "user_agent": headers.get("User-Agent", ""),
        "referer": headers.get("Referer", ""),
    }


def _error_log_dir() -> Path:
    configured = getattr(settings, "ERROR_REPORT_LOG_DIR", None)
    path = Path(configured) if configured else Path(settings.BASE_DIR) / "logs" / "error-reports"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _recipients() -> list[str]:
    configured = getattr(settings, "ERROR_REPORT_EMAILS", [])
    if isinstance(configured, str):
        return [item.strip() for item in configured.split(",") if item.strip()]
    return [item for item in configured if item]


def capture_error_report(
    *,
    request,
    exc: Exception | None = None,
    context: dict[str, Any] | None = None,
    response_status: int | None = None,
    response_data: Any = None,
    source: str = "api",
) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    report_id = uuid.uuid4().hex
    exc_text = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__)) if exc else ""
    request_path = getattr(request, "get_full_path", lambda: getattr(request, "path", ""))()
    headers = _request_headers(request)

    report = {
        "id": report_id,
        "timestamp_utc": now.isoformat(),
        "source": source,
        "status_code": response_status,
        "error_type": exc.__class__.__name__ if exc else None,
        "error": str(exc) if exc else _safe_value(response_data),
        "traceback": exc_text,
        "user": _user_info(request),
        "request": {
            "method": getattr(request, "method", ""),
            "path": getattr(request, "path", ""),
            "full_path": request_path,
            "headers": headers,
            "data": _request_data(request),
        },
        "client": _client_info(headers),
        "view": _view_info(context),
        "response": _safe_value(response_data),
    }

    log_path = _error_log_dir() / f"{now.strftime('%Y%m%d-%H%M%S')}-{report_id}.json"
    log_path.write_text(json.dumps(report, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    report["log_path"] = str(log_path)

    logger.error("Captured error report %s at %s", report_id, log_path)
    _send_error_email(report)
    return report


def _send_error_email(report: dict[str, Any]) -> None:
    recipients = _recipients()
    if not recipients:
        return

    subject = (
        f"[NexFit ERROR] {report.get('status_code') or 'exception'} "
        f"{report['request'].get('method')} {report['request'].get('path')}"
    )
    user = report.get("user", {})
    body = (
        f"ID: {report['id']}\n"
        f"Fecha UTC: {report['timestamp_utc']}\n"
        f"Estado: {report.get('status_code')}\n"
        f"Usuario: {user.get('email') or 'anonimo'} (id={user.get('id')})\n"
        f"Accion: {report.get('view', {}).get('view')}.{report.get('view', {}).get('action')}\n"
        f"Pantalla frontend: {report.get('client', {}).get('path') or 'no disponible'}\n"
        f"URL frontend: {report.get('client', {}).get('url') or 'no disponible'}\n"
        f"Ruta: {report['request'].get('method')} {report['request'].get('full_path')}\n"
        f"Error: {report.get('error')}\n"
        f"Log servidor: {report.get('log_path')}\n\n"
        "Detalle completo:\n"
        f"{json.dumps(report, ensure_ascii=False, indent=2, default=str)[:20000]}"
    )

    try:
        email = EmailMessage(
            subject=subject[:180],
            body=body,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
            to=recipients,
        )
        email.send(fail_silently=False)
    except Exception:
        logger.exception("Could not send error report email %s", report.get("id"))
