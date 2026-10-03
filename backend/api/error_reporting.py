import json
import logging
import re
import time
import traceback
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from django.conf import settings
from django.core.mail import EmailMessage

logger = logging.getLogger(__name__)

# Solo estos 403/409 son flujo de producto. Un 403 con otro código sigue siendo informe.
EXPECTED_APPLICATION_CODES = {
    "health_consent_required",
    "legal_pending",
    "health_cleanup_pending",
}

EXPECTED_VALIDATION_TYPES = {"ValidationError", "ParseError"}

HEADER_ALLOWLIST = {"CONTENT_TYPE", "CONTENT_LENGTH"}

# Defensa extra: en estas rutas ni el texto de la excepción se guarda.
_HEALTH_PREFIXES = (
    "/api/profile",
    "/api/me",
    "/api/auth/me",
    "/api/nutrition/",
    "/api/admin/nutrition/",
    "/api/progress-photos",
    "/api/weight-history",
    "/api/measurements",
    "/api/progress-stats",
    "/api/daily-wellness",
    "/api/rest-wellness",
    "/api/mood",
    "/api/progress/protected-media",
    "/api/admin/progress/",
    "/api/legal/events",
)

_EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)
_SENSITIVE_ASSIGN_RE = re.compile(
    r"(?i)([\"']?(?:password|password1|password2|old_password|new_password|"
    r"token|access|refresh|secret|api_key|apikey|authorization|cookie|"
    r"set-cookie|csrf|csrfmiddlewaretoken|x-csrftoken|email|birth_date|"
    r"gender|weight|height|target_weight|allergies|dietary_restrictions|"
    r"medical_conditions|injuries|injuries_or_medical_issues|"
    r"additional_info_for_admin|notes|wellness|motivation|sleep|mood)"
    r"[\"']?\s*[:=]\s*)(?:[\"'][^\"']*[\"']|\S+)"
)


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


def _application_code(response_data: Any, exc: Exception | None) -> str:
    if isinstance(response_data, dict):
        code = response_data.get("code")
        if code:
            return str(code)
        detail = response_data.get("detail")
        if isinstance(detail, dict) and detail.get("code"):
            return str(detail["code"])
    if exc is None:
        return ""
    default_code = getattr(exc, "default_code", None)
    if isinstance(default_code, str) and default_code:
        return default_code
    return ""


def _is_expected_client_behavior(
    *,
    response_status: int | None,
    response_data: Any,
    exc: Exception | None,
) -> bool:
    """Errores de producto o de cliente. No oculta 500 ni un 403 de otro código."""
    if response_status in {401, 404}:
        return True
    if response_status == 400 and exc is not None and exc.__class__.__name__ in EXPECTED_VALIDATION_TYPES:
        return True
    code = _application_code(response_data, exc)
    if response_status == 403 and code in {"health_consent_required", "legal_pending"}:
        return True
    if response_status == 409 and code == "health_cleanup_pending":
        return True
    return False


def should_capture_error_report(
    *,
    request,
    response_status: int | None,
    response_data: Any = None,
    exc: Exception | None = None,
) -> bool:
    if _is_expected_client_behavior(
        response_status=response_status,
        response_data=response_data,
        exc=exc,
    ):
        return False

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


def _redact_text(value: str) -> str:
    text = _EMAIL_RE.sub("[redacted]", value or "")
    return _SENSITIVE_ASSIGN_RE.sub(r"\1[redacted]", text)


def _path_without_query(value: str) -> str:
    if not value:
        return ""
    raw = str(value).strip()
    if "://" in raw:
        split = urlsplit(raw)
        return split.path or ""
    return raw.split("?", 1)[0].split("#", 1)[0]


def _is_health_endpoint(path: str) -> bool:
    normalized = _path_without_query(path).rstrip("/") or "/"
    for prefix in _HEALTH_PREFIXES:
        base = prefix.rstrip("/")
        if normalized == base or normalized.startswith(base + "/"):
            return True
    return False


def _allowlisted_headers(request) -> dict[str, str]:
    meta = getattr(request, "META", {}) or {}
    headers = {}
    for key in HEADER_ALLOWLIST:
        value = meta.get(key)
        if value:
            headers[key.lower().replace("_", "-")] = str(value)[:120]
    return headers


def _user_info(request) -> dict[str, Any]:
    user = getattr(request, "user", None)
    if not user or not getattr(user, "is_authenticated", False):
        return {"authenticated": False}
    return {
        "authenticated": True,
        "id": getattr(user, "id", None),
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


def _client_info(request) -> dict[str, Any]:
    meta = getattr(request, "META", {}) or {}
    return {
        "path": _path_without_query(meta.get("HTTP_X_CLIENT_PATH", "")),
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
    path = _path_without_query(getattr(request, "path", "") or "")
    health_endpoint = _is_health_endpoint(path)
    error_code = _application_code(response_data, exc)
    if exc and not health_endpoint:
        error_text = _redact_text(str(exc))[:500]
        exc_text = _redact_text("".join(traceback.format_exception(type(exc), exc, exc.__traceback__)))
    else:
        error_text = exc.__class__.__name__ if exc else error_code
        exc_text = ""

    report = {
        "id": report_id,
        "timestamp_utc": now.isoformat(),
        "source": source,
        "status_code": response_status,
        "error_code": error_code,
        "error_type": exc.__class__.__name__ if exc else None,
        "error": error_text,
        "traceback": exc_text,
        "user": _user_info(request),
        "request": {
            "method": getattr(request, "method", ""),
            "path": path,
            "headers": _allowlisted_headers(request),
        },
        "client": _client_info(request),
        "view": _view_info(context),
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
        f"Codigo: {report.get('error_code') or 'sin codigo'}\n"
        f"Usuario id: {user.get('id') if user.get('authenticated') else 'anonimo'}\n"
        f"Accion: {report.get('view', {}).get('view')}.{report.get('view', {}).get('action')}\n"
        f"Pantalla frontend: {report.get('client', {}).get('path') or 'no disponible'}\n"
        f"Ruta: {report['request'].get('method')} {report['request'].get('path')}\n"
        f"Error: {report.get('error_type') or report.get('error')}\n"
        f"Log servidor: {report.get('log_path')}\n"
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
