from datetime import date

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.age import completed_years, product_age_message
from legal.models import EventType, LegalDocument, UserLegalEvent
from legal.services import get_pending_required_documents

User = get_user_model()
pytestmark = pytest.mark.django_db


def _register(api, **overrides):
    cache.clear()
    payload = {
        "email": "new-user@example.invalid",
        "password": "TestPass123!",
        "password_confirm": "TestPass123!",
        "first_name": "Nueva",
        "last_name": "Cuenta",
        "birth_date": "2000-01-15",
    }
    payload.update(overrides)
    return api.post(reverse("auth-register"), payload, format="json")


def _published(**overrides):
    payload = {
        "code": "privacy",
        "version": "v1",
        "locale": "es-ES",
        "title": "Aviso sintetico",
        "body": "Texto sintetico sin marcadores.",
        "is_active": True,
        "requires_acceptance": True,
        "published_at": timezone.now(),
    }
    payload.update(overrides)
    return LegalDocument.objects.create(**payload)


def test_placeholder_document_cannot_be_published():
    with pytest.raises(ValidationError):
        LegalDocument.objects.create(
            code="privacy",
            version="draft-placeholder",
            locale="es-ES",
            title="Aviso",
            body="Responsable: [RESPONSABLE_LEGAL]",
            is_active=True,
            published_at=timezone.now(),
        )
    draft = LegalDocument.objects.create(
        code="privacy",
        version="draft-placeholder",
        locale="es-ES",
        title="Aviso",
        body="Responsable: [EMAIL_PRIVACIDAD]",
        is_active=False,
        published_at=None,
    )
    draft.is_active = True
    draft.published_at = timezone.now()
    with pytest.raises(ValidationError):
        draft.save()
    assert LegalDocument.objects.filter(is_active=True).count() == 0


def test_age_boundaries_include_birthday_leap_years_and_future_dates():
    assert product_age_message(date(2008, 9, 30), date(2026, 9, 30)) is None
    assert product_age_message(date(2008, 10, 1), date(2026, 9, 30)) is not None
    assert product_age_message(date(2008, 2, 29), date(2026, 2, 28)) is not None
    assert product_age_message(date(2008, 2, 29), date(2026, 3, 1)) is None
    assert completed_years(date(2008, 2, 29), date(2026, 3, 1)) == 18
    assert "futuro" in product_age_message(date(2027, 1, 1), date(2026, 9, 30))


def test_registration_rejects_under_18_future_and_invalid_dates():
    api = APIClient()
    under = _register(api, email="under@example.invalid", birth_date="2015-01-01")
    future = _register(api, email="future@example.invalid", birth_date="2999-01-01")
    invalid = _register(api, email="bad@example.invalid", birth_date="no-es-fecha")
    assert under.status_code == 400
    assert future.status_code == 400
    assert invalid.status_code == 400
    assert User.objects.filter(email__in=[
        "under@example.invalid",
        "future@example.invalid",
        "bad@example.invalid",
    ]).count() == 0
    assert "2015" not in str(under.data)


def test_registration_records_privacy_ack_and_terms_in_one_transaction():
    privacy = _published(code="privacy", version="p1", requires_acceptance=True)
    terms = _published(code="terms", version="t1", title="Terminos sinteticos", body="Condiciones sinteticas.")
    api = APIClient()
    missing = _register(api, email="missing-legal@example.invalid")
    assert missing.status_code == 400
    assert User.objects.filter(email="missing-legal@example.invalid").count() == 0

    created = _register(
        api,
        email="with-legal@example.invalid",
        legal={
            "privacy": {"version": privacy.version, "user_id": 999},
            "terms": {"version": terms.version},
        },
    )
    assert created.status_code == 201
    user = User.objects.get(email="with-legal@example.invalid")
    events = UserLegalEvent.objects.filter(user=user).order_by("document__code")
    assert [(event.document.code, event.event_type, event.source) for event in events] == [
        ("privacy", EventType.ACKNOWLEDGEMENT, "registration"),
        ("terms", EventType.ACCEPTANCE, "registration"),
    ]
    assert events.get(document=privacy).purpose == "account"


def test_registration_rolls_back_when_legal_event_fails(monkeypatch):
    _published()

    def boom(*args, **kwargs):
        raise RuntimeError("event failed")

    monkeypatch.setattr("legal.services.record_registration_acknowledgements", boom)
    api = APIClient()
    response = _register(
        api,
        email="rollback@example.invalid",
        legal={"privacy": {"version": "v1"}},
    )
    assert response.status_code == 500
    assert User.objects.filter(email="rollback@example.invalid").count() == 0


def test_existing_user_pending_terms_keeps_rights_and_blocks_ordinary_api():
    user = User.objects.create_user(email="pending@example.invalid", password="TestPass123!")
    _published(code="terms", version="t1", title="Terminos", body="Texto.")
    api = APIClient()
    api.force_authenticate(user=user)
    blocked = api.get("/api/notifications/")
    assert blocked.status_code == 403
    assert blocked.data["code"] == "legal_pending"
    assert api.get("/api/profile/").status_code == 200
    assert api.get("/api/gdpr/export/").status_code == 200
    accepted = api.post(
        reverse("legal-events"),
        {
            "code": "terms",
            "version": "t1",
            "locale": "es-ES",
            "purpose": "account",
            "event_type": "acceptance",
            "source": "reacceptance",
        },
        format="json",
    )
    assert accepted.status_code == 201
    assert get_pending_required_documents(user) == []
    assert api.get("/api/notifications/").status_code != 403


def test_reacceptance_keeps_history_and_reopens_the_app():
    user = User.objects.create_user(email="reaccept@example.invalid", password="TestPass123!")
    v1 = _published(version="v1", requires_reacceptance=False)
    api = APIClient()
    api.force_authenticate(user=user)
    first = api.post(
        reverse("legal-events"),
        {
            "code": "privacy",
            "version": "v1",
            "purpose": "account",
            "event_type": "acknowledgement",
            "source": "settings",
        },
        format="json",
    )
    assert first.status_code == 201
    v2 = _published(version="v2", requires_reacceptance=True, body="Texto v2 sintetico.")
    assert api.get("/api/notifications/").status_code == 403
    assert api.get("/api/gdpr/export/").status_code == 200
    second = api.post(
        reverse("legal-events"),
        {
            "code": "privacy",
            "version": "v2",
            "purpose": "account",
            "event_type": "acknowledgement",
            "source": "reacceptance",
        },
        format="json",
    )
    assert second.status_code == 201
    assert UserLegalEvent.objects.filter(user=user, document=v1).exists()
    assert UserLegalEvent.objects.filter(user=user, document=v2).exists()
    assert api.get("/api/notifications/").status_code != 403


def test_anonymous_active_documents_do_not_error_when_empty():
    response = APIClient().get(reverse("legal-documents-active"))
    assert response.status_code == 200
    assert response.data == []


def test_staff_is_not_gated():
    staff = User.objects.create_user(
        email="staff@example.invalid",
        password="TestPass123!",
        is_staff=True,
    )
    _published()
    api = APIClient()
    api.force_authenticate(user=staff)
    assert api.get("/api/notifications/").status_code != 403
