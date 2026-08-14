"""Utilidades para construir URLs públicas de archivos media."""

from __future__ import annotations

import os

from django.conf import settings
from rest_framework import serializers


def _configured_public_media_base_url() -> str:
    """Valor explícito de PUBLIC_MEDIA_BASE_URL, sin fallback.

    Es el origen (más prefijo de app, si existe) que sirve rutas de Django.
    No incluir /media ni /api: esas rutas se concatenan después.

    Actual:  https://api.nexfit365.dpdns.org
    Futuro:  https://metodosk.com/nexfit
    """
    return os.getenv("PUBLIC_MEDIA_BASE_URL", "").strip().rstrip("/")


def get_public_media_base_url() -> str:
    """Base URL del dominio que sirve /media/ (API en producción)."""
    configured = _configured_public_media_base_url()
    if configured:
        return configured

    for host in settings.ALLOWED_HOSTS:
        host = (host or "").strip()
        if host.startswith("api."):
            return f"https://{host}"

    return ""


def build_public_absolute_url(request, path: str | None) -> str | None:
    """URL absoluta pública para un path de Django (/media/... o /api/...).

    Si PUBLIC_MEDIA_BASE_URL está definido, se usa siempre (aunque haya request).
    Así Nginx puede reescribir /nexfit/api → /api sin que las URLs generadas
    pierdan /nexfit ni usen origin-nexfit.metodosk.com.
    Las URLs http(s) absolutas (históricas o externas) no se reescriben.
    """
    if not path:
        return None

    if path.startswith(("http://", "https://")):
        url = path
    else:
        configured = _configured_public_media_base_url()
        if configured:
            clean_path = path if path.startswith("/") else f"/{path}"
            url = f"{configured}{clean_path}"
        elif request:
            url = request.build_absolute_uri(path)
        else:
            base = get_public_media_base_url()
            if not base:
                return path
            clean_path = path if path.startswith("/") else f"/{path}"
            url = f"{base}{clean_path}"

    forwarded_proto = (request.META.get("HTTP_X_FORWARDED_PROTO") if request else "") or ""
    forwarded_proto = forwarded_proto.split(",")[0].strip().lower()
    host = ""
    if request:
        host = (request.get_host() or "").split(":")[0].lower()
    is_local_host = (
        host in {"localhost", "127.0.0.1", "0.0.0.0", "testserver"}
        or host.endswith(".local")
    )

    should_force_https = (
        forwarded_proto == "https"
        or (request and request.is_secure())
        or (not settings.DEBUG and not is_local_host)
        or (not request and get_public_media_base_url().startswith("https://"))
    )

    if should_force_https and url.startswith("http://"):
        return "https://" + url[len("http://") :]
    return url


def build_public_media_url(request, media_path: str | None) -> str | None:
    """URL absoluta HTTPS para un archivo en MEDIA_URL."""
    return build_public_absolute_url(request, media_path)


def public_file_url(request, file_field) -> str | None:
    if not file_field:
        return None
    try:
        url = file_field.url
    except (ValueError, AttributeError, OSError):
        return None
    return build_public_media_url(request, url)


def recipe_image_display_url(recipe, request=None) -> str:
    """Imagen de receta: URL externa (image_url) o archivo público (image)."""
    if recipe is None:
        return ""
    external = (getattr(recipe, "image_url", None) or "").strip()
    if external:
        return build_public_media_url(request, external) or external
    return public_file_url(request, getattr(recipe, "image", None)) or ""


class PublicMediaImageField(serializers.ImageField):
    """ImageField that absolutizes with PUBLIC_MEDIA_BASE_URL, not request.host."""

    def to_representation(self, value):
        if not value:
            return None
        try:
            url = value.url
        except ValueError:
            return None
        request = self.context.get("request") if getattr(self, "context", None) else None
        return build_public_media_url(request, url)
