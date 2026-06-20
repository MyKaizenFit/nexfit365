"""Utilidades para construir URLs públicas de archivos media."""

from __future__ import annotations

import os

from django.conf import settings


def get_public_media_base_url() -> str:
    """Base URL del dominio que sirve /media/ (API en producción)."""
    configured = os.getenv("PUBLIC_MEDIA_BASE_URL", "").strip().rstrip("/")
    if configured:
        return configured

    for host in settings.ALLOWED_HOSTS:
        host = (host or "").strip()
        if host.startswith("api."):
            return f"https://{host}"

    return ""


def build_public_media_url(request, media_path: str | None) -> str | None:
    """URL absoluta HTTPS para un archivo en MEDIA_URL."""
    if not media_path:
        return None

    if media_path.startswith(("http://", "https://")):
        url = media_path
    elif request:
        url = request.build_absolute_uri(media_path)
    else:
        base = get_public_media_base_url()
        if not base:
            return media_path
        clean_path = media_path if media_path.startswith("/") else f"/{media_path}"
        url = f"{base}{clean_path}"

    forwarded_proto = (request.META.get("HTTP_X_FORWARDED_PROTO") if request else "") or ""
    forwarded_proto = forwarded_proto.split(",")[0].strip().lower()
    host = ""
    if request:
        host = (request.get_host() or "").split(":")[0].lower()
    is_local_host = host in {"localhost", "127.0.0.1", "0.0.0.0"} or host.endswith(".local")

    should_force_https = (
        forwarded_proto == "https"
        or (request and request.is_secure())
        or (not settings.DEBUG and not is_local_host)
        or (not request and get_public_media_base_url().startswith("https://"))
    )

    if should_force_https and url.startswith("http://"):
        return "https://" + url[len("http://") :]
    return url
