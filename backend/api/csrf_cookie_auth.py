"""CSRF protection for cookie-authenticated mutating API requests."""

from __future__ import annotations

from django.http import JsonResponse

from .jwt_cookies import ACCESS_COOKIE, CSRF_COOKIE

_SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS", "TRACE"})
_CSRF_EXEMPT_PREFIXES = (
    "/api/auth/login",
    "/api/auth/register",
    "/api/register",
    "/api/auth/clear-session",
    "/api/auth/logout",
)


class CookieJWTCSRFMiddleware:
    """
    Double-submit CSRF when the client authenticates with the access cookie
    and does not send Authorization: Bearer (scripts/tests stay exempt).

    Login/register are exempt so leftover cookies cannot block a new session.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method not in _SAFE_METHODS and self._requires_csrf(request):
            cookie_csrf = request.COOKIES.get(CSRF_COOKIE)
            header_csrf = request.META.get("HTTP_X_CSRFTOKEN") or request.META.get(
                "HTTP_X_CSRF_TOKEN"
            )
            if not cookie_csrf or not header_csrf or cookie_csrf != header_csrf:
                return JsonResponse(
                    {"detail": "CSRF verification failed."},
                    status=403,
                )
        return self.get_response(request)

    @staticmethod
    def _requires_csrf(request) -> bool:
        path = request.path or ""
        if any(path.startswith(prefix) for prefix in _CSRF_EXEMPT_PREFIXES):
            return False
        auth = request.META.get("HTTP_AUTHORIZATION") or ""
        if auth.lower().startswith("bearer "):
            return False
        return ACCESS_COOKIE in request.COOKIES
