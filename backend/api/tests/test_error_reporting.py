import json

import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from django.test import RequestFactory, override_settings
from rest_framework.exceptions import APIException, NotFound, PermissionDenied, ValidationError

from api.error_reporting import (
    capture_error_report,
    is_expected_auth_failure,
    should_capture_error_report,
)
from api.utils import custom_exception_handler
from legal.gate import LegalPending
from legal.health import HealthCleanupPending, HealthConsentRequired


User = get_user_model()


@pytest.mark.django_db
@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    ERROR_REPORT_EMAILS=["errors@example.invalid"],
)
def test_capture_error_report_writes_file_sends_email_and_redacts_sensitive_data(tmp_path, settings):
    settings.ERROR_REPORT_LOG_DIR = str(tmp_path)
    user = User.objects.create_user(email="cliente@example.com", password="testpass123")
    request = RequestFactory().post(
        "/api/test-action/?next=/dashboard",
        data=json.dumps({"password": "secret", "notes": "fallo al guardar"}),
        content_type="application/json",
        HTTP_AUTHORIZATION="Bearer super-secret-token",
        HTTP_X_CLIENT_PATH="/dashboard?tab=team-sk",
        HTTP_X_CLIENT_URL="https://nexfit365.dpdns.org/dashboard?tab=team-sk",
    )
    request.user = user

    report = capture_error_report(
        request=request,
        exc=ValueError("Algo fallo"),
        response_status=500,
        source="test",
    )

    log_path = tmp_path / f"{report['log_path'].split('/')[-1]}"
    payload = json.loads(log_path.read_text(encoding="utf-8"))

    stored = log_path.read_text(encoding="utf-8")
    assert "email" not in payload["user"]
    assert payload["user"]["id"] == user.id
    assert "data" not in payload["request"]
    assert "Authorization" not in payload["request"]["headers"]
    assert "secret" not in stored
    assert "fallo al guardar" not in stored
    assert "cliente@example.com" not in stored
    assert payload["request"]["path"] == "/api/test-action/"
    assert "next=" not in stored
    assert payload["client"]["path"] == "/dashboard"
    assert payload["error"] == "Algo fallo"
    assert payload["status_code"] == 500
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["errors@example.invalid"]
    assert "cliente@example.com" not in mail.outbox[0].body
    assert "Pantalla frontend: /dashboard" in mail.outbox[0].body


def test_is_expected_auth_failure_for_expired_token():
    response_data = {
        "detail": "Given token not valid for any token type",
        "code": "token_not_valid",
        "messages": [{"token_type": "access", "message": "Token is expired"}],
    }

    assert is_expected_auth_failure(response_status=401, response_data=response_data) is True
    assert is_expected_auth_failure(response_status=500, response_data=response_data) is False


def test_should_capture_error_report_skips_duplicate_auth_failures():
    request = RequestFactory().get(
        "/api/me/",
        HTTP_CF_CONNECTING_IP="1.2.3.4",
    )
    response_data = {"code": "token_not_valid", "detail": "Token is expired"}

    assert should_capture_error_report(
        request=request,
        response_status=401,
        response_data=response_data,
    ) is False

    assert should_capture_error_report(
        request=request,
        response_status=500,
        response_data={"detail": "server error"},
    ) is True

    assert should_capture_error_report(
        request=request,
        response_status=500,
        response_data={"detail": "server error"},
    ) is False


class _View:
    pass


class _SyntheticFailure(APIException):
    status_code = 500
    default_detail = "fallo sintetico"
    default_code = "synthetic_failure"


def _json_request(method, path, payload, user=None):
    factory = RequestFactory()
    extra = {
        "content_type": "application/json",
        "HTTP_AUTHORIZATION": "Bearer qa-token-1ea2",
        "HTTP_COOKIE": "accessToken=qa-cookie-1ea2",
        "HTTP_X_CLIENT_PATH": "/perfil?email=persona@example.invalid",
    }
    if method == "get":
        request = factory.get(path, **extra)
    else:
        request = getattr(factory, method)(path, data=json.dumps(payload), **extra)
    if user is not None:
        request.user = user
    return request


def _handled(exc, request):
    return custom_exception_handler(exc, {"request": request, "view": _View()})


@pytest.mark.django_db
def test_expected_health_and_legal_responses_do_not_create_reports(tmp_path, settings, caplog):
    settings.ERROR_REPORT_LOG_DIR = str(tmp_path)
    user = User.objects.create_user(email="persona@example.invalid", password="testpass123")
    body = {"weight": 81.25, "allergies": "qa-alergia-1ea2", "medical_conditions": "qa-condicion-1ea2"}
    cases = (
        ("patch", "/api/profile/?token=qa-token-1ea2", HealthConsentRequired()),
        ("post", "/api/legal/events/?token=qa-token-1ea2", HealthCleanupPending()),
        ("get", "/api/programs/?token=qa-token-1ea2", LegalPending()),
        ("patch", "/api/profile/", ValidationError({"allergies": "qa-alergia-1ea2"})),
        ("get", "/api/progress-photos/1/", NotFound()),
    )
    for method, path, exc in cases:
        request = _json_request(method, path, body, user)
        response = _handled(exc, request)
        assert response is not None
        assert list(tmp_path.glob("*.json")) == []
    assert "qa-alergia-1ea2" not in caplog.text
    assert "qa-condicion-1ea2" not in caplog.text
    assert "persona@example.invalid" not in caplog.text


@pytest.mark.django_db
@override_settings(ERROR_REPORT_EMAILS=["errors@example.invalid"])
def test_health_500_report_keeps_metadata_without_payload(tmp_path, settings, caplog):
    settings.ERROR_REPORT_LOG_DIR = str(tmp_path)
    user = User.objects.create_user(email="persona@example.invalid", password="testpass123")
    request = _json_request(
        "patch",
        "/api/profile/?token=qa-token-1ea2",
        {"weight": 81.25, "allergies": "qa-alergia-1ea2", "medical_conditions": "qa-condicion-1ea2"},
        user,
    )
    response = _handled(_SyntheticFailure(), request)
    assert response.status_code == 500
    files = list(tmp_path.glob("*.json"))
    assert len(files) == 1
    stored = files[0].read_text(encoding="utf-8")
    payload = json.loads(stored)
    assert payload["status_code"] == 500
    assert payload["error_code"] == "INTERNAL_ERROR"
    assert payload["error_type"] == "_SyntheticFailure"
    assert payload["request"]["method"] == "PATCH"
    assert payload["request"]["path"] == "/api/profile/"
    assert payload["user"]["id"] == user.id
    assert "email" not in payload["user"]
    assert "data" not in payload["request"]
    for secret in (
        "qa-alergia-1ea2",
        "qa-condicion-1ea2",
        "81.25",
        "persona@example.invalid",
        "qa-token-1ea2",
        "qa-cookie-1ea2",
        "Bearer",
    ):
        assert secret not in stored
        assert secret not in caplog.text
        assert secret not in mail.outbox[0].body


@pytest.mark.django_db
def test_unexpected_permission_403_still_creates_a_report(tmp_path, settings):
    settings.ERROR_REPORT_LOG_DIR = str(tmp_path)
    user = User.objects.create_user(email="persona@example.invalid", password="testpass123")
    request = _json_request(
        "post",
        "/api/programs/?token=qa-token-1ea2",
        {"weight": 81.25, "allergies": "qa-alergia-1ea2"},
        user,
    )
    response = _handled(PermissionDenied(), request)
    assert response.status_code == 403
    files = list(tmp_path.glob("*.json"))
    assert len(files) == 1
    stored = files[0].read_text(encoding="utf-8")
    payload = json.loads(stored)
    assert payload["status_code"] == 403
    assert payload["request"]["path"] == "/api/programs/"
    assert payload["user"]["id"] == user.id
    assert "qa-alergia-1ea2" not in stored
    assert "81.25" not in stored
    assert "persona@example.invalid" not in stored
    assert "qa-token-1ea2" not in stored
