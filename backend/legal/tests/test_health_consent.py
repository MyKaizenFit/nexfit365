from datetime import date

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework.test import APIClient

from legal.health import (
    HealthConsentRequired,
    has_active_health_consent,
    health_consent_enforcement_active,
    record_health_consents,
)
from legal.models import HealthDataDeletionJob, LegalDocument, UserLegalEvent
from nutrition.services import PersonalizedNutritionService
from progress.models import DailyWellness
from workouts.services import PersonalizedWorkoutService

User = get_user_model()
pytestmark = pytest.mark.django_db


def _user(email="health@example.invalid", **extra):
    return User.objects.create_user(
        email=email,
        password="TestPass123!",
        birth_date=date(1990, 1, 15),
        **extra,
    )


def _notice(**overrides):
    payload = {
        "code": "health_notice",
        "version": "h1",
        "locale": "es-ES",
        "title": "Aviso sintetico de salud",
        "body": "Texto sintetico sin marcadores.",
        "is_active": True,
        "requires_acceptance": True,
        "withdrawable": True,
        "published_at": timezone.now(),
    }
    payload.update(overrides)
    return LegalDocument.objects.create(**payload)


def _client(user):
    api = APIClient()
    api.force_authenticate(user=user)
    return api


def _grant(api, purposes, version="h1", event_type="consent_granted"):
    return api.post(
        "/api/legal/events/",
        {
            "code": "health_notice",
            "version": version,
            "purposes": purposes,
            "event_type": event_type,
            "source": "settings",
        },
        format="json",
    )


def test_absent_health_notice_keeps_current_behavior():
    user = _user()
    api = _client(user)
    assert health_consent_enforcement_active() is False
    assert has_active_health_consent(user, "nutrition") is True
    assert api.patch("/api/profile/", {"weight": 80}, format="json").status_code == 200
    assert api.post(
        "/api/daily-wellness/",
        {"date": "2026-09-01", "sleep_hours": 7, "motivation_score": 3},
        format="json",
    ).status_code in (200, 201)
    assert api.get("/api/programs/").status_code != 403


def test_active_notice_requires_consent_for_each_purpose():
    _notice()
    user = _user()
    api = _client(user)
    assert health_consent_enforcement_active() is True
    assert api.patch("/api/profile/", {"weight": 80}, format="json").status_code == 403
    assert api.patch("/api/profile/", {"weight": 80}, format="json").data["code"] == "health_consent_required"
    for purpose in ("health_profile", "nutrition", "progress_photos", "wellness"):
        assert _grant(api, [purpose]).status_code == 201
        assert has_active_health_consent(user, purpose) is True
        assert _grant(api, [purpose], event_type="consent_withdrawn").status_code == 201
        assert has_active_health_consent(user, purpose) is False


def test_multi_purpose_grant_and_withdraw_are_atomic(monkeypatch):
    _notice()
    user = _user()
    calls = {"n": 0}
    real_create = UserLegalEvent.objects.create

    def fail_second(*args, **kwargs):
        calls["n"] += 1
        if calls["n"] == 2:
            raise RuntimeError("forced")
        return real_create(*args, **kwargs)

    monkeypatch.setattr(UserLegalEvent.objects, "create", fail_second)
    with pytest.raises(RuntimeError):
        record_health_consents(
            user=user,
            purposes=["health_profile", "nutrition", "workouts"],
            event_type="consent_granted",
            source="settings",
            version="h1",
        )
    assert UserLegalEvent.objects.filter(user=user).count() == 0

    monkeypatch.setattr(UserLegalEvent.objects, "create", real_create)
    record_health_consents(
        user=user,
        purposes=["health_profile", "nutrition", "workouts"],
        event_type="consent_granted",
        source="settings",
        version="h1",
    )
    assert UserLegalEvent.objects.filter(user=user, event_type="consent_granted").count() == 3

    calls["n"] = 0
    monkeypatch.setattr(UserLegalEvent.objects, "create", fail_second)
    with pytest.raises(RuntimeError):
        record_health_consents(
            user=user,
            purposes=["health_profile", "nutrition"],
            event_type="consent_withdrawn",
            source="settings",
            version="h1",
        )
    assert UserLegalEvent.objects.filter(user=user, event_type="consent_withdrawn").count() == 0
    assert HealthDataDeletionJob.objects.count() == 0


def test_client_cannot_choose_the_user_and_inactive_or_placeholder_documents_fail():
    notice = _notice()
    user = _user()
    other = _user(email="other@example.invalid")
    api = _client(user)
    rejected = api.post(
        "/api/legal/events/",
        {
            "code": "health_notice",
            "version": "h1",
            "purpose": "nutrition",
            "event_type": "consent_granted",
            "source": "settings",
            "user_id": other.id,
        },
        format="json",
    )
    assert rejected.status_code == 400
    notice.is_active = False
    notice.save(update_fields=["is_active"])
    assert _grant(api, ["nutrition"]).status_code == 400
    with pytest.raises(ValidationError):
        LegalDocument.objects.create(
            code="health_notice",
            version="draft",
            locale="es-ES",
            title="Aviso",
            body="Contacto [EMAIL_PRIVACIDAD]",
            is_active=True,
            published_at=timezone.now(),
        )


def test_regrant_versioning_and_cleanup_job_does_not_delete_rows():
    first = _notice(version="h1")
    user = _user()
    api = _client(user)
    DailyWellness.objects.create(user=user, date=date(2026, 9, 1), sleep_hours=8, motivation_score=4)
    assert _grant(api, ["wellness"]).status_code == 201
    assert _grant(api, ["wellness"], event_type="consent_withdrawn").status_code == 201
    assert has_active_health_consent(user, "wellness") is False
    assert DailyWellness.objects.filter(user=user).count() == 1
    job = HealthDataDeletionJob.objects.get(user=user, purpose="wellness")
    assert job.status == "pending"
    blocked = _grant(api, ["wellness"])
    assert blocked.status_code == 409
    assert blocked.data["code"] == "health_cleanup_pending"
    from legal.cleanup import HealthDataCleanupService

    assert HealthDataCleanupService.run_job(job.id) == "completed"
    assert DailyWellness.objects.filter(user=user).count() == 0
    assert _grant(api, ["wellness"]).status_code == 201
    assert has_active_health_consent(user, "wellness") is True
    assert HealthDataDeletionJob.objects.get(pk=job.pk).status == "completed"

    first.is_active = False
    first.save(update_fields=["is_active"])
    _notice(version="h2", requires_reacceptance=False)
    assert has_active_health_consent(user, "wellness") is True
    assert UserLegalEvent.objects.filter(user=user, document=first).exists()

    LegalDocument.objects.filter(version="h2").update(is_active=False)
    _notice(version="h3", requires_reacceptance=True)
    assert has_active_health_consent(user, "wellness") is False
    assert UserLegalEvent.objects.filter(user=user, document=first, event_type="consent_granted").exists()


def test_gates_leave_login_export_delete_and_basic_workouts_open():
    _notice()
    _published_terms = LegalDocument.objects.create(
        code="terms",
        version="t1",
        locale="es-ES",
        title="Terminos sinteticos",
        body="Texto sintetico.",
        is_active=True,
        requires_acceptance=True,
        published_at=timezone.now(),
    )
    user = _user(injuries_or_medical_issues="rodilla")
    api = _client(user)
    login = APIClient()
    assert login.post("/api/auth/login/", {"email": user.email, "password": "TestPass123!"}, format="json").status_code == 200
    assert api.get("/api/gdpr/export/").status_code == 200
    assert api.post("/api/gdpr/delete/", {"reason": "prueba"}, format="json").status_code == 200
    pending = api.get("/api/notifications/")
    assert pending.status_code == 403
    assert pending.data["code"] == "legal_pending"
    accepted = api.post(
        "/api/legal/events/",
        {
            "code": "terms",
            "version": "t1",
            "purpose": "account",
            "event_type": "acceptance",
            "source": "settings",
        },
        format="json",
    )
    assert accepted.status_code == 201
    assert api.get("/api/programs/").status_code != 403
    blocked = api.post("/api/progress-photos/", {}, format="json")
    assert blocked.status_code == 403
    assert blocked.data["code"] == "health_consent_required"
    assert api.post("/api/daily-wellness/", {"sleep_hours": 7}, format="json").status_code == 403
    assert api.post("/api/measurements/", {"date": "2026-09-01", "waist": "80"}, format="json").status_code == 403
    with pytest.raises(HealthConsentRequired):
        PersonalizedNutritionService(user).calculate_daily_calories()
    with pytest.raises(HealthConsentRequired):
        PersonalizedWorkoutService(user).get_recommendations()


def test_admin_cannot_write_health_fields_without_subject_consent():
    _notice()
    subject = _user(email="subject@example.invalid")
    admin = _user(email="admin@example.invalid", is_staff=True)
    api = _client(admin)
    response = api.patch(f"/api/admin/users/{subject.id}/", {"weight": 81, "admin_calories_override": 2200}, format="json")
    assert response.status_code == 403
    assert response.data["code"] == "health_consent_required"
    subject.refresh_from_db()
    assert subject.weight != 81
