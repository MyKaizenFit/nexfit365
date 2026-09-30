from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from legal.models import EventType, LegalDocument, UserLegalEvent, legal_content_hash
from legal.services import (
    build_status,
    get_pending_required_documents,
    has_current_acceptance,
    record_event,
)

User = get_user_model()
pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


def _user(email):
    return User.objects.create_user(email=email, password="testpass123")


def _document(**overrides):
    payload = {
        "code": "privacy",
        "version": "test-1",
        "locale": "es-ES",
        "title": "Test Privacy Notice",
        "body": "Synthetic notice for tests.",
        "is_active": True,
        "requires_acceptance": True,
        "published_at": timezone.now(),
    }
    payload.update(overrides)
    return LegalDocument.objects.create(**payload)


def _event_payload(**overrides):
    payload = {
        "code": "privacy",
        "version": "test-1",
        "locale": "es-ES",
        "purpose": "account",
        "event_type": "acceptance",
        "source": "settings",
    }
    payload.update(overrides)
    return payload


def test_content_hash_is_deterministic_and_ignores_timestamps():
    first = legal_content_hash("Test Privacy Notice", "Line\r\nTwo")
    second = legal_content_hash("Test Privacy Notice", "Line\nTwo")
    assert first == second
    assert len(first) == 64
    document = _document(body="Line\r\nTwo")
    assert document.content_hash == first
    document.published_at = document.published_at + timedelta(days=1)
    with pytest.raises(ValidationError):
        document.save()


def test_version_is_unique_and_only_one_active():
    first = _document()
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            _document()
    second = _document(version="test-2", requires_reacceptance=True)
    first.refresh_from_db()
    assert first.is_active is False
    assert second.is_active is True
    assert LegalDocument.objects.filter(code="privacy", locale="es-ES").count() == 2


def test_published_document_rejects_silent_edits_and_deletion():
    document = _document()
    document.body = "Changed notice"
    with pytest.raises(ValidationError):
        document.save()
    with pytest.raises(ValidationError):
        document.delete()
    with pytest.raises(ValidationError):
        LegalDocument.objects.filter(pk=document.pk).update(title="Other")


def test_accept_v1_then_publish_v2_keeps_history_and_marks_pending():
    user = _user("legal-v1@example.invalid")
    v1 = _document(requires_reacceptance=False)
    record_event(user=user, **_event_payload())
    assert has_current_acceptance(user, v1) is True
    v2 = _document(version="test-2", requires_reacceptance=True, body="Synthetic notice v2")
    pending = get_pending_required_documents(user, "es-ES")
    assert [item.version for item in pending] == ["test-2"]
    assert LegalDocument.objects.filter(pk=v1.pk).exists()
    assert UserLegalEvent.objects.filter(user=user, document=v1).count() == 1
    assert v2.requires_reacceptance is True


def test_events_are_append_only_and_duplicate_acceptance_is_idempotent():
    user = _user("legal-once@example.invalid")
    _document()
    first, created = record_event(user=user, **_event_payload())
    second, again = record_event(user=user, **_event_payload(source="api"))
    assert created is True
    assert again is False
    assert first.pk == second.pk
    assert UserLegalEvent.objects.count() == 1
    first.purpose = "marketing"
    with pytest.raises(ValidationError):
        first.save()
    with pytest.raises(ValidationError):
        UserLegalEvent.objects.filter(pk=first.pk).update(purpose="marketing")
    with pytest.raises(ValidationError):
        UserLegalEvent.objects.filter(pk=first.pk).delete()


def test_optional_consent_can_be_withdrawn_and_required_acceptance_cannot():
    user = _user("legal-withdraw@example.invalid")
    required = _document(withdrawable=False)
    _document(
        code="marketing",
        version="test-1",
        title="Test Marketing Notice",
        body="Synthetic optional notice.",
        requires_acceptance=False,
        withdrawable=True,
    )
    record_event(
        user=user,
        code="marketing",
        version="test-1",
        locale="es-ES",
        purpose="marketing",
        event_type=EventType.CONSENT_GRANTED,
        source="settings",
    )
    withdrawn, created = record_event(
        user=user,
        code="marketing",
        version="test-1",
        locale="es-ES",
        purpose="marketing",
        event_type=EventType.CONSENT_WITHDRAWN,
        source="settings",
    )
    assert created is True
    assert withdrawn.event_type == EventType.CONSENT_WITHDRAWN
    status = build_status(user, "es-ES")
    assert status["optional_consents"] == []
    with pytest.raises(ValidationError):
        record_event(
            user=user,
            code="privacy",
            version="test-1",
            locale="es-ES",
            purpose="account",
            event_type=EventType.CONSENT_WITHDRAWN,
            source="settings",
        )
    assert UserLegalEvent.objects.filter(user=user, document=required).count() == 0


def test_active_documents_are_public_and_status_requires_auth(api_client):
    _document()
    active = api_client.get(reverse("legal-documents-active"))
    assert active.status_code == 200
    assert active.data[0]["title"] == "Test Privacy Notice"
    assert "id" not in active.data[0]
    assert api_client.get(reverse("legal-status")).status_code == 401
    assert api_client.post(reverse("legal-events"), _event_payload(), format="json").status_code == 401


def test_authenticated_user_records_only_their_own_event(api_client):
    owner = _user("legal-owner@example.invalid")
    other = _user("legal-other@example.invalid")
    _document()
    api_client.force_authenticate(user=other)
    rejected = api_client.post(
        reverse("legal-events"),
        {**_event_payload(), "user_id": owner.pk},
        format="json",
    )
    assert rejected.status_code == 400
    assert UserLegalEvent.objects.count() == 0

    created = api_client.post(reverse("legal-events"), _event_payload(), format="json")
    assert created.status_code == 201
    assert created.data["code"] == "privacy"
    assert UserLegalEvent.objects.get().user_id == other.pk

    repeated = api_client.post(reverse("legal-events"), _event_payload(), format="json")
    assert repeated.status_code == 200
    assert repeated.data["id"] == created.data["id"]

    api_client.force_authenticate(user=owner)
    owner_status = api_client.get(reverse("legal-status"))
    assert owner_status.status_code == 200
    assert owner_status.data["accepted"] == []
    assert owner_status.data["pending"][0]["version"] == "test-1"


def test_malformed_inactive_and_missing_documents_are_rejected(api_client):
    user = _user("legal-bad@example.invalid")
    api_client.force_authenticate(user=user)
    assert api_client.post(reverse("legal-events"), {"purpose": "account"}, format="json").status_code == 400

    _document(version="draft", is_active=False, published_at=None, requires_acceptance=False)
    inactive = api_client.post(reverse("legal-events"), _event_payload(version="draft"), format="json")
    missing = api_client.post(reverse("legal-events"), _event_payload(version="missing"), format="json")
    assert inactive.status_code == 400
    assert missing.status_code == 404
    assert UserLegalEvent.objects.count() == 0


def test_withdraw_endpoints():
    user = _user("legal-api-withdraw@example.invalid")
    client = APIClient()
    client.force_authenticate(user=user)
    _document(withdrawable=False)
    _document(
        code="marketing",
        version="test-1",
        title="Test Marketing Notice",
        body="Synthetic optional notice.",
        requires_acceptance=False,
        withdrawable=True,
    )
    granted = client.post(
        reverse("legal-events"),
        _event_payload(
            code="marketing",
            purpose="marketing",
            event_type="consent_granted",
        ),
        format="json",
    )
    withdrawn = client.post(
        reverse("legal-events"),
        _event_payload(
            code="marketing",
            purpose="marketing",
            event_type="consent_withdrawn",
        ),
        format="json",
    )
    blocked = client.post(
        reverse("legal-events"),
        _event_payload(event_type="consent_withdrawn"),
        format="json",
    )
    assert granted.status_code == 201
    assert withdrawn.status_code == 201
    assert blocked.status_code == 400
    status = client.get(reverse("legal-status"))
    assert status.data["optional_consents"] == []
