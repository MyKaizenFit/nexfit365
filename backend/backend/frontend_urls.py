"""Helpers to build public frontend URLs from FRONTEND_URL."""

from __future__ import annotations

from django.conf import settings


def build_frontend_url(path: str = "/") -> str:
    """Join settings.FRONTEND_URL with an app-relative path.

    FRONTEND_URL may include a subpath (https://metodosk.com/nexfit).
    Absolute http(s) URLs are returned unchanged so historical links keep working.
    """
    base = (getattr(settings, "FRONTEND_URL", None) or "").rstrip("/")
    if not path:
        return base or "/"
    if path.startswith(("http://", "https://")):
        return path
    normalized = path if path.startswith("/") else f"/{path}"
    if not base:
        return normalized
    return f"{base}{normalized}"
