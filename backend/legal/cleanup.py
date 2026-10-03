"""Borra datos de una finalidad de salud ya retirada.

El job indica usuario, finalidad y generación. No recibe ni guarda valores
de salud. Una tarea antigua solo puede tocar filas anteriores a su cutoff.
"""

from datetime import timedelta

from django.core.files.storage import default_storage
from django.utils import timezone

from legal.models import HealthCleanupStatus, HealthDataDeletionJob, PrivacySuppressionRecord

CLEANUP_TARGET = timedelta(hours=24)
OPEN_STATUSES = (
    HealthCleanupStatus.PENDING,
    HealthCleanupStatus.PROCESSING,
    HealthCleanupStatus.FAILED,
)


class CleanupRetry(Exception):
    def __init__(self, code: str):
        self.code = code[:64]
        super().__init__(self.code)


def cleanup_blocks_grant(user, purpose: str) -> bool:
    return HealthDataDeletionJob.objects.filter(
        user=user,
        purpose=purpose,
        status__in=OPEN_STATUSES,
    ).exists()


def reapply_privacy_suppressions():
    """Vuelve a aplicar borrados ya completados. No crea trabajos ni toca otra generación."""
    done = 0
    for record in PrivacySuppressionRecord.objects.all().iterator():
        job = (
            HealthDataDeletionJob.objects.filter(
                user_id=record.user_id,
                purpose=record.purpose,
                generation=record.generation,
                status=HealthCleanupStatus.COMPLETED,
            )
            .select_related("user")
            .first()
        )
        if job is None or job.user_id is None:
            continue
        HealthDataCleanupService._purge(job)
        done += 1
    return done


def overdue_cleanup_jobs():
    limit = timezone.now() - CLEANUP_TARGET
    return HealthDataDeletionJob.objects.filter(
        status__in=(HealthCleanupStatus.PENDING, HealthCleanupStatus.FAILED),
        created_at__lt=limit,
    )


def _safe_progress_name(name: str) -> bool:
    if not name or name.startswith(("/", "\\")) or ".." in name.replace("\\", "/"):
        return False
    return name.replace("\\", "/").startswith("progress_photos/")


def _rows_before(queryset, job):
    if job.cutoff_at is not None:
        return queryset.filter(created_at__lte=job.cutoff_at)
    return queryset


class HealthDataCleanupService:
    @classmethod
    def run_job(cls, job_id: int):
        job = (
            HealthDataDeletionJob.objects.filter(pk=job_id)
            .select_related("user")
            .first()
        )
        if job is None or job.user_id is None:
            return "missing"
        if job.status == HealthCleanupStatus.COMPLETED:
            return "completed"
        newer = (
            HealthDataDeletionJob.objects.filter(user_id=job.user_id, purpose=job.purpose, generation__gt=job.generation)
            .exclude(pk=job.pk)
            .exists()
        )
        if newer:
            return "stale"
        job.status = HealthCleanupStatus.PROCESSING
        job.started_at = job.started_at or timezone.now()
        job.attempts += 1
        job.error_code = ""
        job.save(update_fields=["status", "started_at", "attempts", "error_code", "updated_at"])
        names = cls._collect_photo_names(job)
        cls._delete_files(names)
        cls._purge(job)
        cls._verify(job)
        job.status = HealthCleanupStatus.COMPLETED
        job.completed_at = timezone.now()
        job.error_code = ""
        job.save(update_fields=["status", "completed_at", "error_code", "updated_at"])
        PrivacySuppressionRecord.objects.get_or_create(
            user_id=job.user_id,
            purpose=job.purpose,
            generation=job.generation,
            defaults={"withdrawal_event_id": job.withdrawal_event_id},
        )
        return "completed"

    @classmethod
    def mark_failed(cls, job_id: int, code: str):
        HealthDataDeletionJob.objects.filter(pk=job_id).exclude(
            status=HealthCleanupStatus.COMPLETED
        ).update(status=HealthCleanupStatus.FAILED, error_code=(code or "retry")[:64])

    @classmethod
    def execute(cls, job_id: int, *, retries: int = 0, max_retries: int = 3):
        try:
            return cls.run_job(job_id)
        except CleanupRetry as exc:
            if retries >= max_retries:
                cls.mark_failed(job_id, exc.code)
                return "failed"
            raise

    @classmethod
    def _collect_photo_names(cls, job):
        if job.purpose != "progress_photos":
            return []
        from progress.models import ProgressPhoto

        names = []
        for photo, thumbnail in _rows_before(ProgressPhoto.objects.filter(user_id=job.user_id), job).values_list(
            "photo", "thumbnail"
        ):
            if photo:
                names.append(photo)
            if thumbnail:
                names.append(thumbnail)
        return names

    @classmethod
    def _purge(cls, job):
        user = job.user
        if job.purpose == "health_profile":
            cls._clear_profile(user, job)
            from progress.models import WeightEntry

            _rows_before(WeightEntry.objects.filter(user=user), job).delete()
        elif job.purpose == "nutrition":
            cls._clear_nutrition(user, job)
        elif job.purpose == "progress_photos":
            from progress.models import BodyMeasurement, ProgressPhoto

            _rows_before(ProgressPhoto.objects.filter(user=user), job).delete()
            _rows_before(BodyMeasurement.objects.filter(user=user), job).delete()
        elif job.purpose == "wellness":
            from progress.models import DailyWellness, MoodEntry, RestWellnessAssessment

            _rows_before(MoodEntry.objects.filter(user=user), job).delete()
            _rows_before(DailyWellness.objects.filter(user=user), job).delete()
            _rows_before(RestWellnessAssessment.objects.filter(user=user), job).delete()
        elif job.purpose == "workouts":
            return
        else:
            raise CleanupRetry("purpose")

    @classmethod
    def _clear_profile(cls, user, job):
        if cls._granted_after(job):
            return
        user.gender = None
        user.height = None
        user.weight = None
        user.target_weight = None
        user.activity_level = "moderate"
        user.allergies = []
        user.dietary_restrictions = []
        user.medical_conditions = []
        user.injuries_or_medical_issues = ""
        user.additional_info_for_admin = ""
        user.save(
            update_fields=[
                "gender",
                "height",
                "weight",
                "target_weight",
                "activity_level",
                "allergies",
                "dietary_restrictions",
                "medical_conditions",
                "injuries_or_medical_issues",
                "additional_info_for_admin",
            ]
        )

    @classmethod
    def _clear_nutrition(cls, user, job):
        from nutrition.models import (
            MealIngredientExclusion,
            MealLog,
            MealRecipeExclusion,
            NutritionPlan,
            NutritionPlanAssignment,
            NutritionPlanHistory,
        )

        if not cls._granted_after(job):
            user.admin_calories_override = None
            user.save(update_fields=["admin_calories_override"])
        _rows_before(MealLog.objects.filter(user=user), job).delete()
        _rows_before(MealRecipeExclusion.objects.filter(user=user), job).delete()
        _rows_before(MealIngredientExclusion.objects.filter(user=user), job).delete()
        _rows_before(NutritionPlanHistory.objects.filter(user=user), job).delete()
        _rows_before(NutritionPlanAssignment.objects.filter(user=user), job).delete()
        _rows_before(
            NutritionPlan.objects.filter(user=user, is_template=False, is_system=False),
            job,
        ).delete()

    @classmethod
    def _granted_after(cls, job) -> bool:
        from legal.models import DocumentCode, EventType, UserLegalEvent

        if job.cutoff_at is None:
            return False
        return UserLegalEvent.objects.filter(
            user_id=job.user_id,
            purpose=job.purpose,
            event_type=EventType.CONSENT_GRANTED,
            document__code=DocumentCode.HEALTH_NOTICE,
            created_at__gt=job.cutoff_at,
        ).exists()

    @classmethod
    def _delete_files(cls, names):
        for name in names:
            if not _safe_progress_name(name):
                continue
            try:
                default_storage.delete(name)
            except Exception as exc:
                raise CleanupRetry("storage") from exc
            if default_storage.exists(name):
                raise CleanupRetry("storage")

    @classmethod
    def _verify(cls, job):
        user = job.user
        user.refresh_from_db()
        if job.purpose == "health_profile":
            cls._verify_profile(user, job)
        elif job.purpose == "nutrition":
            cls._verify_nutrition(user, job)
        elif job.purpose == "progress_photos":
            from progress.models import BodyMeasurement, ProgressPhoto

            if _rows_before(ProgressPhoto.objects.filter(user=user), job).exists():
                raise CleanupRetry("residue")
            if _rows_before(BodyMeasurement.objects.filter(user=user), job).exists():
                raise CleanupRetry("residue")
        elif job.purpose == "wellness":
            from progress.models import DailyWellness, MoodEntry, RestWellnessAssessment

            if _rows_before(MoodEntry.objects.filter(user=user), job).exists():
                raise CleanupRetry("residue")
            if _rows_before(DailyWellness.objects.filter(user=user), job).exists():
                raise CleanupRetry("residue")
            if _rows_before(RestWellnessAssessment.objects.filter(user=user), job).exists():
                raise CleanupRetry("residue")

    @classmethod
    def _verify_profile(cls, user, job):
        from progress.models import WeightEntry

        if cls._granted_after(job):
            return
        if any(value not in (None, "", []) for value in (user.gender, user.height, user.weight, user.target_weight)):
            raise CleanupRetry("residue")
        if user.allergies or user.dietary_restrictions or user.medical_conditions:
            raise CleanupRetry("residue")
        if (user.injuries_or_medical_issues or "").strip() or (user.additional_info_for_admin or "").strip():
            raise CleanupRetry("residue")
        if _rows_before(WeightEntry.objects.filter(user=user), job).exists():
            raise CleanupRetry("residue")

    @classmethod
    def _verify_nutrition(cls, user, job):
        from nutrition.models import MealLog, NutritionPlan, NutritionPlanAssignment

        if user.admin_calories_override and not cls._granted_after(job):
            raise CleanupRetry("residue")
        if _rows_before(MealLog.objects.filter(user=user), job).exists():
            raise CleanupRetry("residue")
        if _rows_before(NutritionPlanAssignment.objects.filter(user=user), job).exists():
            raise CleanupRetry("residue")
        if _rows_before(NutritionPlan.objects.filter(user=user, is_template=False, is_system=False), job).exists():
            raise CleanupRetry("residue")
