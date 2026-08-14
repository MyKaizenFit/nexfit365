"""JWT cookie Domain/Path helpers."""

from django.http import HttpResponse

from api.jwt_cookies import (
    ACCESS_COOKIE,
    CSRF_COOKIE,
    REFRESH_COOKIE,
    clear_jwt_cookies,
    set_jwt_cookies,
)

COOKIE_NAMES = (ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE)


def _set_env(monkeypatch, *, path=None, domain=None, secure=None):
    if path is None:
        monkeypatch.delenv("JWT_COOKIE_PATH", raising=False)
    else:
        monkeypatch.setenv("JWT_COOKIE_PATH", path)

    if domain is None:
        monkeypatch.delenv("JWT_COOKIE_DOMAIN", raising=False)
    else:
        monkeypatch.setenv("JWT_COOKIE_DOMAIN", domain)

    if secure is None:
        monkeypatch.delenv("JWT_COOKIE_SECURE", raising=False)
    else:
        monkeypatch.setenv("JWT_COOKIE_SECURE", secure)


def _assert_cookie_path(response, expected_path):
    for name in COOKIE_NAMES:
        assert name in response.cookies
        assert response.cookies[name]["path"] == expected_path


def test_default_cookie_path_is_root(monkeypatch):
    _set_env(monkeypatch)
    response = HttpResponse()
    set_jwt_cookies(response, access="access", refresh="refresh", csrf="csrf")
    _assert_cookie_path(response, "/")
    assert response.cookies[ACCESS_COOKIE]["httponly"] is True
    assert response.cookies[REFRESH_COOKIE]["httponly"] is True
    assert not response.cookies[CSRF_COOKIE]["httponly"]


def test_cookie_path_nexfit(monkeypatch):
    _set_env(monkeypatch, path="/nexfit")
    response = HttpResponse()
    set_jwt_cookies(response, access="access", refresh="refresh", csrf="csrf")
    _assert_cookie_path(response, "/nexfit")


def test_clear_jwt_cookies_uses_configured_path(monkeypatch):
    _set_env(monkeypatch, path="/nexfit")
    response = HttpResponse()
    clear_jwt_cookies(response)
    _assert_cookie_path(response, "/nexfit")
    for name in COOKIE_NAMES:
        assert response.cookies[name]["max-age"] == 0 or str(response.cookies[name]["max-age"]) == "0"


def test_cookie_domain_and_path_together(monkeypatch):
    _set_env(monkeypatch, path="/nexfit", domain=".metodosk.com", secure="true")
    response = HttpResponse()
    set_jwt_cookies(response, access="access", refresh="refresh", csrf="csrf")
    _assert_cookie_path(response, "/nexfit")
    for name in COOKIE_NAMES:
        assert response.cookies[name]["domain"] == ".metodosk.com"
        assert response.cookies[name]["secure"] is True
        assert response.cookies[name]["samesite"] == "None"

    cleared = HttpResponse()
    clear_jwt_cookies(cleared)
    _assert_cookie_path(cleared, "/nexfit")
    for name in COOKIE_NAMES:
        assert cleared.cookies[name]["domain"] == ".metodosk.com"
