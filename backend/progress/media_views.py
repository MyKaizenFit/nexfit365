"""Signed URLs for PII media (progress photos + profile pictures). Public exercise media stays on /media/."""

from __future__ import annotations

import mimetypes
import re
from pathlib import Path
from urllib.parse import quote

from django.conf import settings
from django.core import signing
from django.http import FileResponse, Http404, HttpResponseForbidden
from django.views.static import serve as django_serve
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request

from backend.media_urls import build_public_absolute_url

PROGRESS_MEDIA_PREFIX = "progress_photos/"
PROFILE_MEDIA_PREFIX = "profile_pictures/"
PII_MEDIA_PREFIXES = (PROGRESS_MEDIA_PREFIX, PROFILE_MEDIA_PREFIX)
PROGRESS_MEDIA_SALT = "progress-media-v1"
# Minted again on each photo/profile API response and kept only in memory.
# 15 minutes covers a gallery or avatar view; a reload gets a new signature.
PROGRESS_MEDIA_MAX_AGE = 15 * 60
_TOKEN_IN_QUERY = re.compile(r"(^|[?&])token=[^&\s]*")
_ACCESS_LOG_URI_KEYS = ("QUERY_STRING", "RAW_URI", "REQUEST_URI", "HTTP_REFERER")


def sign_progress_media_path(relative_path: str) -> str:
    return signing.TimestampSigner(salt=PROGRESS_MEDIA_SALT).sign(relative_path)


def unsign_progress_media_path(token: str) -> str:
    return signing.TimestampSigner(salt=PROGRESS_MEDIA_SALT).unsign(
        token, max_age=PROGRESS_MEDIA_MAX_AGE
    )


def redact_progress_media_token(request) -> None:
    """Strip the signed token from fields gunicorn copies into the access log."""
    meta = getattr(request, "META", None)
    if not isinstance(meta, dict):
        return
    for key in _ACCESS_LOG_URI_KEYS:
        value = meta.get(key)
        if isinstance(value, str) and "token=" in value:
            meta[key] = _TOKEN_IN_QUERY.sub(r"\1token=<REDACTED>", value)


def build_signed_pii_media_url(request, file_field, required_prefix: str) -> str | None:
    """Absolute URL to the signed PII media endpoint (works in <img src>).

    Sigue siendo /api/progress/protected-media/ (no /media/ público).
    Con PUBLIC_MEDIA_BASE_URL=https://metodosk.com/nexfit la URL pública es
    https://metodosk.com/nexfit/api/progress/protected-media/?token=...
    """
    if not file_field:
        return None
    relative = getattr(file_field, "name", None) or str(file_field)
    relative = relative.lstrip("/")
    if not relative.startswith(required_prefix):
        return None
    token = sign_progress_media_path(relative)
    path = f"/api/progress/protected-media/?token={quote(token, safe='')}"
    return build_public_absolute_url(request, path)


def build_signed_progress_media_url(request, file_field) -> str | None:
    return build_signed_pii_media_url(request, file_field, PROGRESS_MEDIA_PREFIX)


def build_signed_profile_media_url(request, file_field) -> str | None:
    return build_signed_pii_media_url(request, file_field, PROFILE_MEDIA_PREFIX)


@api_view(["GET"])
@permission_classes([AllowAny])
def protected_progress_media(request: Request):
    """Serve progress_photos/* or profile_pictures/* only with a valid signed token."""
    token = request.query_params.get("token")
    # Gunicorn logs RAW_URI after the view returns. Drop the secret first.
    redact_progress_media_token(request)
    if not token:
        return HttpResponseForbidden("Missing token")
    try:
        relative = unsign_progress_media_path(token)
    except signing.SignatureExpired:
        return HttpResponseForbidden("Expired token")
    except signing.BadSignature:
        return HttpResponseForbidden("Invalid token")

    if ".." in relative or relative.startswith("/"):
        return HttpResponseForbidden("Invalid path")
    if not relative.startswith(PII_MEDIA_PREFIXES):
        return HttpResponseForbidden("Not a protected media path")

    media_root = Path(settings.MEDIA_ROOT)
    full_path = (media_root / relative).resolve()
    try:
        full_path.relative_to(media_root.resolve())
    except ValueError:
        return HttpResponseForbidden("Invalid path")
    if not full_path.is_file():
        raise Http404("File not found")

    content_type, _ = mimetypes.guess_type(str(full_path))
    response = FileResponse(
        full_path.open("rb"),
        content_type=content_type or "application/octet-stream",
    )
    response["Cache-Control"] = "private, no-store"
    # Inline display without the original upload name.
    response["Content-Disposition"] = "inline"
    return response


def serve_media_with_progress_guard(request, path):
    """
    Django fallback media serve: block PII paths (use signed endpoint).
    Exercise videos and other non-PII paths remain public.
    """
    normalized = (path or "").lstrip("/")
    if normalized.startswith(PII_MEDIA_PREFIXES):
        return HttpResponseForbidden(
            "Protected media requires a signed URL (/api/progress/protected-media/)."
        )
    return django_serve(request, path, document_root=settings.MEDIA_ROOT)
