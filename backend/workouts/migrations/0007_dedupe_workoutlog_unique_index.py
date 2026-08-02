# Generated manually for duplicate WorkoutLog cleanup + missing unique index.

from django.db import migrations
from django.db.models import Count


def dedupe_workout_logs(apps, schema_editor):
    WorkoutLog = apps.get_model("workouts", "WorkoutLog")
    dup_keys = (
        WorkoutLog.objects.values("user_id", "date", "workout_day_id")
        .annotate(c=Count("id"))
        .filter(c__gt=1)
    )
    for key in dup_keys:
        rows = list(
            WorkoutLog.objects.filter(
                user_id=key["user_id"],
                date=key["date"],
                workout_day_id=key["workout_day_id"],
            ).order_by("-completed", "-duration_minutes", "-updated_at", "-created_at")
        )
        WorkoutLog.objects.filter(pk__in=[r.pk for r in rows[1:]]).delete()


class Migration(migrations.Migration):

    # Postgres cannot CREATE INDEX in the same transaction as the deletes above
    # ("pending trigger events").
    atomic = False

    dependencies = [
        ("workouts", "0006_exercise_category_open"),
    ]

    operations = [
        migrations.RunPython(dedupe_workout_logs, migrations.RunPython.noop),
        # Model Meta already declares this constraint (0001), but prod DB lost the
        # index — recreate it without changing migration state.
        migrations.RunSQL(
            sql="""
            CREATE UNIQUE INDEX IF NOT EXISTS unique_workout_log_per_user_day
            ON workouts_workoutlog (user_id, date, workout_day_id);
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS unique_workout_log_per_user_day;
            """,
            state_operations=[],
        ),
    ]
