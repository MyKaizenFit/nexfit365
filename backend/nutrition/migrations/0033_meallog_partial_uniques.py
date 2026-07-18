# Deduplicate MealLog rows, then add partial unique constraints.

from django.db import migrations, models
from django.db.models import Count, Q


def dedupe_meal_logs(apps, schema_editor):
    MealLog = apps.get_model("nutrition", "MealLog")

    # Slots with plan_meal: unique (user, date, plan_meal)
    dup_slots = (
        MealLog.objects.filter(plan_meal_id__isnull=False)
        .values("user_id", "date", "plan_meal_id")
        .annotate(n=Count("id"))
        .filter(n__gt=1)
    )
    for group in dup_slots:
        qs = MealLog.objects.filter(
            user_id=group["user_id"],
            date=group["date"],
            plan_meal_id=group["plan_meal_id"],
        ).order_by("-updated_at", "-created_at", "-id")
        keep = qs.first()
        qs.exclude(pk=keep.pk).delete()

    # Free logs without plan_meal: unique (user, date, meal_type)
    dup_free = (
        MealLog.objects.filter(plan_meal_id__isnull=True)
        .values("user_id", "date", "meal_type")
        .annotate(n=Count("id"))
        .filter(n__gt=1)
    )
    for group in dup_free:
        qs = MealLog.objects.filter(
            user_id=group["user_id"],
            date=group["date"],
            meal_type=group["meal_type"],
            plan_meal_id__isnull=True,
        ).order_by("-updated_at", "-created_at", "-id")
        keep = qs.first()
        qs.exclude(pk=keep.pk).delete()


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("nutrition", "0032_planmeal_week_number"),
    ]

    operations = [
        migrations.RunPython(dedupe_meal_logs, noop_reverse),
        migrations.AddConstraint(
            model_name="meallog",
            constraint=models.UniqueConstraint(
                fields=("user", "date", "plan_meal"),
                condition=Q(plan_meal__isnull=False),
                name="unique_meallog_user_date_plan_meal",
            ),
        ),
        migrations.AddConstraint(
            model_name="meallog",
            constraint=models.UniqueConstraint(
                fields=("user", "date", "meal_type"),
                condition=Q(plan_meal__isnull=True),
                name="unique_meallog_user_date_meal_type",
            ),
        ),
    ]
