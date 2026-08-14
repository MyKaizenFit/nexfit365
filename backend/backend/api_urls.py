"""Public API request URLs (pagination next/previous).

Distinct from PUBLIC_MEDIA_BASE_URL: this is the /api prefix the client uses.
"""

from __future__ import annotations

import os


def _configured_public_api_base_url() -> str:
    """PUBLIC_API_BASE_URL without trailing slash.

    Actual:   https://api.nexfit365.dpdns.org/api
    Futuro:   https://metodosk.com/nexfit/api
    """
    return os.getenv("PUBLIC_API_BASE_URL", "").strip().rstrip("/")


def public_api_request_url(request) -> str:
    """Absolute URL of the current API request as the public client should see it.

    After Nginx rewrites /nexfit/api → /api, request.build_absolute_uri() loses
    /nexfit. When PUBLIC_API_BASE_URL is set, rebuild from that prefix + the
    path after /api, keeping the query string.
    """
    configured = _configured_public_api_base_url()
    if not configured:
        return request.build_absolute_uri()

    full_path = request.get_full_path()
    if full_path.startswith("/api"):
        suffix = full_path[4:]
    else:
        return request.build_absolute_uri()

    if not suffix:
        suffix = "/"
    elif not suffix.startswith("/"):
        suffix = f"/{suffix}"
    return f"{configured}{suffix}"
