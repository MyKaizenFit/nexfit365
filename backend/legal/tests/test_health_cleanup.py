import io
from datetime import date
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management import call_command
from django.db import transaction
from PIL import Image
from rest_framework.test import APIClient

from legal.cleanup import HealthDataCleanupService, _safe_progress_name
from legal.health import has_active_health_consent, record_health_consents
from legal.models import HealthDataDeletionJob, LegalDocument, PrivacySuppressionRecord, UserLegalEvent
from legal.tests.test_health_consent import _client, _grant, _notice, _user
from nutrition.models import MealIngredientExclusion, MealLog, NutritionPlan, NutritionPlanAssignment
from progress.models import (
    BodyMeasurement,
    DailyWellness,
    MoodEntry,
    ProgressPhoto,
    RestWellnessAssessment,
    WeightEntry,
)
from workouts.models import WorkoutProgram

User = get_user_model()
pytestmark = pytest.mark.django_db


def _png():
    buffer = io.BytesIO()
    Image.new("RGB", (8, 8), color=(10, 20, 30)).save(buffer, format="PNG")
    return ContentFile(buffer.getvalue())


def _photo(user, day=date(2026, 9, 1)):
    photo = ProgressPhoto(user=user, date=day, photo_type="front", weight=70, notes="nota")
    photo.photo.save("origen.png", _png(), save=False)
    photo.thumbnail.save("mini.png", _png(), save=False)
    photo.save()
    return photo


def _fill(user):
    user.gender = "male"
    user.height = 180
    user.weight = 80
    user.target_weight = 75
    user.activity_level = "active"
    user.allergies = ["polen"]
    user.dietary_restrictions = ["lactosa"]
    user.medical_conditions = ["asma"]
    user.injuries_or_medical_issues = "rodilla"
    user.additional_info_for_admin = "nota"
    user.admin_calories_override = 1900
    user.disliked_foods = "brocoli"
    user.main_goal = "strength"
    user.save()
    WeightEntry.objects.create(user=user, date=date(2026, 9, 1), weight=80)
    BodyMeasurement.objects.create(user=user, date=date(2026, 9, 1), waist=80)
    DailyWellness.objects.create(user=user, date=date(2026, 9, 1), sleep_hours=7, motivation_score=3)
    MoodEntry.objects.create(user=user, date=date(2026, 9, 2), mood_score=3, energy_level=3, stress_level=2)
    RestWellnessAssessment.objects.create(
        user=user,
        answers=[True],
        scores={"sleep": 1},
        script="guion",
        top_categories=["sleep"],
    )
    MealLog.objects.create(user=user, date=date(2026, 9, 1), meal_type="lunch")
    MealIngredientExclusion.objects.create(user=user, term="gluten")
    catalog = NutritionPlan.objects.create(name="Catalogo", is_system=True)
    own = NutritionPlan.objects.create(name="Mio", user=user, daily_calories=1800)
    NutritionPlanAssignment.objects.create(plan=catalog, user=user)
    WorkoutProgram.objects.create(name="Basico", user=user)
    return catalog, own


def _withdraw(user, purposes):
    record_health_consents(
        user=user,
        purposes=purposes,
        event_type="consent_granted",
        source="settings",
        version="h1",
    )
    return record_health_consents(
        user=user,
        purposes=purposes,
        event_type="consent_withdrawn",
        source="settings",
        version="h1",
    )


def test_unsafe_progress_names_are_ignored():
    assert _safe_progress_name("progress_photos/2026/09/01/a.png") is True
    assert _safe_progress_name("progress_photos/../../etc/passwd") is False
    assert _safe_progress_name("/etc/passwd") is False
    assert _safe_progress_name("profile_pictures/a.png") is False


def test_core_cleanup_removes_health_data_and_keeps_the_account():
    _notice()
    user = _user()
    catalog, own = _fill(user)
    program_id = WorkoutProgram.objects.get(user=user).id
    _withdraw(user, ["health_profile", "nutrition", "workouts"])
    assert HealthDataDeletionJob.objects.filter(user=user).count() == 3
    for job in HealthDataDeletionJob.objects.filter(user=user):
        assert HealthDataCleanupService.run_job(job.id) == "completed"
        assert HealthDataCleanupService.run_job(job.id) == "completed"
    user.refresh_from_db()
    assert user.email
    assert user.birth_date == date(1990, 1, 15)
    assert user.check_password("TestPass123!")
    assert user.disliked_foods == "brocoli"
    assert user.main_goal == "strength"
    assert user.gender is None
    assert user.weight is None
    assert user.admin_calories_override is None
    assert user.injuries_or_medical_issues == ""
    assert WeightEntry.objects.filter(user=user).count() == 0
    assert MealLog.objects.filter(user=user).count() == 0
    assert MealIngredientExclusion.objects.filter(user=user).count() == 0
    assert NutritionPlan.objects.filter(pk=own.pk).count() == 0
    assert NutritionPlan.objects.filter(pk=catalog.pk).count() == 1
    assert NutritionPlanAssignment.objects.filter(user=user).count() == 0
    assert WorkoutProgram.objects.filter(pk=program_id).count() == 1
    assert PrivacySuppressionRecord.objects.filter(user=user).count() == 3


def test_progress_cleanup_deletes_rows_and_files_and_wellness_stays():
    _notice()
    user = _user()
    _fill(user)
    photo = _photo(user)
    original = photo.photo.name
    thumb = photo.thumbnail.name
    assert default_storage.exists(original)
    assert default_storage.exists(thumb)
    _withdraw(user, ["progress_photos"])
    job = HealthDataDeletionJob.objects.get(user=user, purpose="progress_photos")
    assert HealthDataCleanupService.run_job(job.id) == "completed"
    assert ProgressPhoto.objects.filter(pk=photo.pk).count() == 0
    assert BodyMeasurement.objects.filter(user=user).count() == 0
    assert not default_storage.exists(original)
    assert not default_storage.exists(thumb)
    assert DailyWellness.objects.filter(user=user).count() == 1
    assert user.email


def test_wellness_cleanup_leaves_progress_photos():
    _notice()
    user = _user()
    _fill(user)
    photo = _photo(user)
    _withdraw(user, ["wellness"])
    job = HealthDataDeletionJob.objects.get(user=user, purpose="wellness")
    assert HealthDataCleanupService.run_job(job.id) == "completed"
    assert MoodEntry.objects.filter(user=user).count() == 0
    assert DailyWellness.objects.filter(user=user).count() == 0
    assert RestWellnessAssessment.objects.filter(user=user).count() == 0
    assert ProgressPhoto.objects.filter(pk=photo.pk).count() == 1
    assert WorkoutProgram.objects.filter(user=user).count() == 1


def test_regrant_is_blocked_until_cleanup_finishes_and_a_stale_job_keeps_new_data():
    _notice()
    user = _user()
    api = _client(user)
    assert _grant(api, ["progress_photos"]).status_code == 201
    old = _photo(user)
    assert _grant(api, ["progress_photos"], event_type="consent_withdrawn").status_code == 201
    job = HealthDataDeletionJob.objects.get(user=user, purpose="progress_photos")
    blocked = _grant(api, ["progress_photos"])
    assert blocked.status_code == 409
    assert blocked.data["code"] == "health_cleanup_pending"
    assert HealthDataCleanupService.run_job(job.id) == "completed"
    assert ProgressPhoto.objects.filter(pk=old.pk).count() == 0
    assert _grant(api, ["progress_photos"]).status_code == 201
    fresh = _photo(user, day=date(2026, 9, 2))
    assert HealthDataCleanupService.run_job(job.id) == "completed"
    assert ProgressPhoto.objects.filter(pk=fresh.pk).count() == 1


def test_cutoff_keeps_rows_created_after_the_withdrawal():
    _notice()
    user = _user()
    record_health_consents(
        user=user,
        purposes=["progress_photos"],
        event_type="consent_granted",
        source="settings",
        version="h1",
    )
    old = _photo(user)
    _withdraw(user, ["progress_photos"])
    newer = _photo(user, day=date(2026, 9, 3))
    job = HealthDataDeletionJob.objects.get(user=user, purpose="progress_photos")
    assert HealthDataCleanupService.run_job(job.id) == "completed"
    assert ProgressPhoto.objects.filter(pk=old.pk).count() == 0
    assert ProgressPhoto.objects.filter(pk=newer.pk).count() == 1


def test_storage_failure_retries_without_a_second_withdrawal():
    _notice()
    user = _user()
    photo = _photo(user)
    _withdraw(user, ["progress_photos"])
    events = UserLegalEvent.objects.filter(user=user, event_type="consent_withdrawn").count()
    job = HealthDataDeletionJob.objects.get(user=user, purpose="progress_photos")
    with patch("legal.cleanup.default_storage.delete", side_effect=OSError("disk")):
        assert HealthDataCleanupService.execute(job.id, retries=3, max_retries=3) == "failed"
    job.refresh_from_db()
    assert job.status == "failed"
    assert job.error_code == "storage"
    assert ProgressPhoto.objects.filter(pk=photo.pk).count() == 1
    assert HealthDataCleanupService.run_job(job.id) == "completed"
    assert ProgressPhoto.objects.filter(pk=photo.pk).count() == 0
    assert UserLegalEvent.objects.filter(user=user, event_type="consent_withdrawn").count() == events


def test_withdrawal_rollback_keeps_consent_and_does_not_enqueue():
    _notice()
    user = _user()
    record_health_consents(
        user=user,
        purposes=["wellness"],
        event_type="consent_granted",
        source="settings",
        version="h1",
    )
    with patch("legal.tasks.cleanup_health_data_task.delay") as delay:
        with pytest.raises(RuntimeError):
            with transaction.atomic():
                _withdraw(user, ["wellness"])
                raise RuntimeError("forced")
        assert delay.call_count == 0
    assert HealthDataDeletionJob.objects.filter(user=user).count() == 0
    assert has_active_health_consent(user, "wellness") is True


def test_missing_user_is_a_noop():
    _notice()
    user = _user()
    _withdraw(user, ["wellness"])
    job_id = HealthDataDeletionJob.objects.get(user=user).id
    user_id = user.id
    user.delete()
    assert HealthDataCleanupService.run_job(job_id) == "missing"
    assert User.objects.filter(pk=user_id).count() == 0


def test_cleanup_does_not_touch_another_user():
    _notice()
    owner = _user()
    other = _user(email="other@example.invalid")
    other.weight = 70
    other.save(update_fields=["weight"])
    WeightEntry.objects.create(user=other, date=date(2026, 9, 1), weight=70)
    _withdraw(owner, ["health_profile"])
    job = HealthDataDeletionJob.objects.get(user=owner)
    assert HealthDataCleanupService.run_job(job.id) == "completed"
    other.refresh_from_db()
    assert other.weight == 70
    assert WeightEntry.objects.filter(user=other).count() == 1


def test_account_endpoints_stay_available_after_cleanup():
    _notice()
    user = _user()
    _fill(user)
    _photo(user)
    _withdraw(user, ["health_profile", "nutrition", "workouts", "progress_photos", "wellness"])
    for job in HealthDataDeletionJob.objects.filter(user=user):
        HealthDataCleanupService.run_job(job.id)
    api = APIClient()
    assert api.post("/api/auth/login/", {"email": user.email, "password": "TestPass123!"}, format="json").status_code == 200
    session = _client(user)
    assert session.get("/api/gdpr/export/").status_code == 200
    assert session.post("/api/gdpr/delete/", {"reason": "prueba"}, format="json").status_code == 200
    assert session.get("/api/profile/").status_code == 200
    assert session.get("/api/legal/status/").status_code == 200
    user.refresh_from_db()
    assert user.birth_date == date(1990, 1, 15)


def test_reapply_uses_the_completed_cutoff():
    from legal.cleanup import reapply_privacy_suppressions

    _notice()
    user = _user()
    WeightEntry.objects.create(user=user, date=date(2026, 9, 1), weight=80)
    _withdraw(user, ["health_profile"])
    job = HealthDataDeletionJob.objects.get(user=user, purpose="health_profile")
    assert HealthDataCleanupService.run_job(job.id) == "completed"
    revived = WeightEntry.objects.create(user=user, date=date(2026, 9, 2), weight=81)
    WeightEntry.objects.filter(pk=revived.pk).update(created_at=job.cutoff_at)
    later = WeightEntry.objects.create(user=user, date=date(2026, 9, 3), weight=82)
    assert reapply_privacy_suppressions() == 1
    assert WeightEntry.objects.filter(pk=revived.pk).count() == 0
    assert WeightEntry.objects.filter(pk=later.pk).count() == 1


def test_workouts_cleanup_keeps_program_and_injury_text():
    _notice()
    user = _user(injuries_or_medical_issues="rodilla")
    program = WorkoutProgram.objects.create(name="Basico", user=user)
    _withdraw(user, ["workouts"])
    job = HealthDataDeletionJob.objects.get(user=user, purpose="workouts")
    assert HealthDataCleanupService.run_job(job.id) == "completed"
    user.refresh_from_db()
    assert user.injuries_or_medical_issues == "rodilla"
    assert WorkoutProgram.objects.filter(pk=program.pk).count() == 1


def test_command_lists_without_deleting_everyone():
    _notice()
    user = _user()
    DailyWellness.objects.create(user=user, date=date(2026, 9, 1), sleep_hours=7, motivation_score=3)
    _withdraw(user, ["wellness"])
    call_command("health_cleanup_jobs", "--status", "pending", "--dry-run")
    call_command("health_cleanup_jobs", "--overdue")
    assert DailyWellness.objects.filter(user=user).count() == 1
