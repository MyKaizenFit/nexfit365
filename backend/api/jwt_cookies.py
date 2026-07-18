"""HttpOnly JWT cookie helpers for browser auth (Plan 020)."""

from __future__ import annotations

import os
import secrets
from typing import Optional

from django.conf import settings

ACCESS_COOKIE = "accessToken"
REFRESH_COOKIE = "refreshToken"
CSRF_COOKIE = "csrfToken"


def _cookie_domain() -> Optional[str]:
    domain = (os.getenv("JWT_COOKIE_DOMAIN") or "").strip()
    return domain or None


def _cookie_secure() -> bool:
    if os.getenv("JWT_COOKIE_SECURE", "").lower() in {"1", "true", "yes"}:
        return True
    if os.getenv("JWT_COOKIE_SECURE", "").lower() in {"0", "false", "no"}:
        return False
    return not settings.DEBUG


def _access_max_age() -> int:
    lifetime = settings.SIMPLE_JWT.get("ACCESS_TOKEN_LIFETIME")
    if lifetime is None:
        return 60 * 60 * 2
    return int(lifetime.total_seconds())


def _refresh_max_age(*, remember: bool) -> int:
    if not remember:
        return _access_max_age()
    lifetime = settings.SIMPLE_JWT.get("REFRESH_TOKEN_LIFETIME")
    if lifetime is None:
        return 60 * 60 * 24 * 30
    return int(lifetime.total_seconds())


def new_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def set_jwt_cookies(response, *, access: str, refresh: str, remember: bool = True, csrf: str | None = None):
    """Attach HttpOnly access/refresh cookies and a readable CSRF cookie."""
    secure = _cookie_secure()
    domain = _cookie_domain()
    csrf_value = csrf or new_csrf_token()
    common = {
        "domain": domain,
        "secure": secure,
        "samesite": "Lax",
        "path": "/",
    }

    response.set_cookie(
        ACCESS_COOKIE,
        access,
        max_age=_access_max_age(),
        httponly=True,
        **common,
    )
    response.set_cookie(
        REFRESH_COOKIE,
        refresh,
        max_age=_refresh_max_age(remember=remember),
        httponly=True,
        **common,
    )
    response.set_cookie(
        CSRF_COOKIE,
        csrf_value,
        max_age=_refresh_max_age(remember=remember),
        httponly=False,
        **common,
    )
    return csrf_value


def clear_jwt_cookies(response):
    domain = _cookie_domain()
    secure = _cookie_secure()
    for name in (ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE):
        response.delete_cookie(
            name,
            path="/",
            domain=domain,
            samesite="Lax",
        )
        # Also clear host-only variants from older deploys / local DEBUG.
        if domain:
            response.delete_cookie(name, path="/", samesite="Lax")
        response.set_cookie(
            name,
            "",
            max_age=0,
            expires=0,
            path="/",
            domain=domain,
            secure=secure,
            httponly=(name != CSRF_COOKIE),
            samesite="Lax",
        )
    return response
