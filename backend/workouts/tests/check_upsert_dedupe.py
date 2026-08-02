"""Runnable check: upsert consolidates duplicate WorkoutLog rows.

Run (from backend/, with Django configured):
  python manage.py shell < workouts/tests/check_upsert_dedupe.py
Or:
  python -c "exec(open('workouts/tests/check_upsert_dedupe.py').read())"
"""
from django.contrib.auth import get_user_model
from django.db import connection
from django.utils import timezone
from rest_framework.test import APIClient

from workouts.models import Exercise, WorkoutDay, WorkoutLog, WorkoutProgram

User = get_user_model()
email = "dedupe-check@example.com"
User.objects.filter(email=email).delete()
user = User.objects.create_user(email=email, password="x")
program = WorkoutProgram.objects.create(user=user, name="Check", is_active=True)
day = WorkoutDay.objects.create(program=program, day_number=1, name="A")
today = timezone.localdate()

constraint = next(
    c for c in WorkoutLog._meta.constraints
    if getattr(c, "name", None) == "unique_workout_log_per_user_day"
)
with connection.constraint_checks_disabled():
    with connection.schema_editor() as schema_editor:
        schema_editor.remove_constraint(WorkoutLog, constraint)

try:
    WorkoutLog.objects.create(user=user, workout_day=day, date=today, duration_minutes=5)
    WorkoutLog.objects.create(user=user, workout_day=day, date=today, duration_minutes=9)
    WorkoutLog.objects.create(user=user, workout_day=day, date=today, duration_minutes=1)
    assert WorkoutLog.objects.filter(user=user, workout_day=day, date=today).count() == 3

    client = APIClient()
    client.force_authenticate(user=user)
    resp = client.post(
        "/api/workout-logs/upsert_today/",
        {"workout_day": str(day.id), "completed": True, "duration_minutes": 30, "notes": "ok"},
        format="json",
    )
    assert resp.status_code == 200, resp.content
    assert WorkoutLog.objects.filter(user=user, workout_day=day, date=today).count() == 1
    log = WorkoutLog.objects.get(user=user, workout_day=day, date=today)
    assert log.completed and log.duration_minutes == 30 and log.notes == "ok"
    print("OK upsert consolidates duplicates")
finally:
    with connection.constraint_checks_disabled():
        with connection.schema_editor() as schema_editor:
            try:
                schema_editor.add_constraint(WorkoutLog, constraint)
            except Exception:
                pass
    User.objects.filter(email=email).delete()
