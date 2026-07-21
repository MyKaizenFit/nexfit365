"""Signed URLs for progress photos (PII). Exercise videos stay on public /media/."""

from __future__ import annotations

import mimetypes
from pathlib import Path
from urllib.parse import quote

from django.conf import settings
from django.core import signing
from django.http import FileResponse, Http404, HttpResponseForbidden
from django.views.static import serve as django_serve
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request

PROGRESS_MEDIA_PREFIX = "progress_photos/"
PROGRESS_MEDIA_SALT = "progress-media-v1"
# Long enough for dashboard galleries; rotate by changing SECRET_KEY / salt.
PROGRESS_MEDIA_MAX_AGE = 60 * 60 * 24 * 7  # 7 days


def sign_progress_media_path(relative_path: str) -> str:
    return signing.TimestampSigner(salt=PROGRESS_MEDIA_SALT).sign(relative_path)


def unsign_progress_media_path(token: str) -> str:
    return signing.TimestampSigner(salt=PROGRESS_MEDIA_SALT).unsign(
        token, max_age=PROGRESS_MEDIA_MAX_AGE
    )


def build_signed_progress_media_url(request, file_field) -> str | None:
    """Absolute URL to the signed progress media endpoint (works in <img src>)."""
    if not file_field:
        return None
    relative = getattr(file_field, "name", None) or str(file_field)
    if not relative.startswith(PROGRESS_MEDIA_PREFIX):
        # Unexpected path — do not expose via public media helper.
        relative = relative.lstrip("/")
        if not relative.startswith(PROGRESS_MEDIA_PREFIX):
            return None
    token = sign_progress_media_path(relative)
    path = f"/api/progress/protected-media/?token={quote(token, safe='')}"
    if not request:
        return path

    url = request.build_absolute_uri(path)
    forwarded_proto = (request.META.get("HTTP_X_FORWARDED_PROTO") or "").split(",")[0].strip().lower()
    host = (request.get_host() or "").split(":")[0].lower()
    is_local_host = host in {"localhost", "127.0.0.1", "0.0.0.0"} or host.endswith(".local")
    should_force_https = (
        forwarded_proto == "https"
        or request.is_secure()
        or (not settings.DEBUG and not is_local_host)
    )
    if should_force_https and url.startswith("http://"):
        return "https://" + url[len("http://") :]
    return url


@api_view(["GET"])
@permission_classes([AllowAny])
def protected_progress_media(request: Request):
    """Serve progress_photos/* only with a valid signed token."""
    token = request.query_params.get("token")
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
    if not relative.startswith(PROGRESS_MEDIA_PREFIX):
        return HttpResponseForbidden("Not a progress media path")

    media_root = Path(settings.MEDIA_ROOT)
    full_path = (media_root / relative).resolve()
    try:
        full_path.relative_to(media_root.resolve())
    except ValueError:
        return HttpResponseForbidden("Invalid path")
    if not full_path.is_file():
        raise Http404("File not found")

    content_type, _ = mimetypes.guess_type(str(full_path))
    return FileResponse(full_path.open("rb"), content_type=content_type or "application/octet-stream")


def serve_media_with_progress_guard(request, path):
    """
    Django fallback media serve: block progress_photos (use signed endpoint).
    Exercise videos and other non-PII paths remain public.
    """
    normalized = (path or "").lstrip("/")
    if normalized.startswith(PROGRESS_MEDIA_PREFIX):
        return HttpResponseForbidden(
            "Progress photos require a signed URL (/api/progress/protected-media/)."
        )
    return django_serve(request, path, document_root=settings.MEDIA_ROOT)
