"""JWT authentication from HttpOnly cookies (Bearer still supported)."""

from __future__ import annotations

from typing import Optional, Tuple

from django.contrib.auth.models import AbstractBaseUser
from rest_framework.request import Request
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .jwt_cookies import ACCESS_COOKIE


class JWTCookieAuthentication(JWTAuthentication):
    """
    Authenticate via accessToken cookie first, then Authorization: Bearer.
    Cookie auth enables browser sessions without exposing JWTs to JS.
    """

    def authenticate(self, request: Request) -> Optional[Tuple[AbstractBaseUser, object]]:
        header = self.get_header(request)
        if header is not None:
            return super().authenticate(request)

        raw_token = request.COOKIES.get(ACCESS_COOKIE)
        if not raw_token:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token
        except (InvalidToken, TokenError):
            return None
