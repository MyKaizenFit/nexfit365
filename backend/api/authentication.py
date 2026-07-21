"""JWT authentication from HttpOnly cookies (Bearer still supported)."""

from __future__ import annotations

from typing import Optional, Tuple

from django.contrib.auth.models import AbstractBaseUser
from rest_framework.request import Request
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken, TokenError

from .jwt_cookies import ACCESS_COOKIE


class JWTCookieAuthentication(JWTAuthentication):
    """
    Prefer accessToken cookie, then Authorization: Bearer.
    Cookie-first avoids empty/stale Bearer headers blocking cookie sessions.
    """

    def authenticate(self, request: Request) -> Optional[Tuple[AbstractBaseUser, object]]:
        raw_token = request.COOKIES.get(ACCESS_COOKIE)
        if raw_token:
            try:
                validated_token = self.get_validated_token(raw_token)
                return self.get_user(validated_token), validated_token
            except (InvalidToken, TokenError, AuthenticationFailed):
                pass

        header = self.get_header(request)
        if header is not None:
            return super().authenticate(request)

        return None
