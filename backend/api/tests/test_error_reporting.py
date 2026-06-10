import json

import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from django.test import RequestFactory, override_settings

from api.error_reporting import (
    capture_error_report,
    is_expected_auth_failure,
    should_capture_error_report,
)


User = get_user_model()


@pytest.mark.django_db
@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    ERROR_REPORT_EMAILS=["maintainer@example.invalid"],
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

    assert payload["user"]["email"] == "cliente@example.com"
    assert payload["request"]["data"]["password"] == "[redacted]"
    assert payload["request"]["headers"]["Authorization"] == "[redacted]"
    assert payload["request"]["data"]["notes"] == "fallo al guardar"
    assert payload["client"]["path"] == "/dashboard?tab=team-sk"
    assert payload["client"]["url"] == "https://nexfit365.dpdns.org/dashboard?tab=team-sk"
    assert payload["error"] == "Algo fallo"
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["maintainer@example.invalid"]
    assert "cliente@example.com" in mail.outbox[0].body
    assert "Pantalla frontend: /dashboard?tab=team-sk" in mail.outbox[0].body


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
