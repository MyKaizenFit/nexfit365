# Deduplicate WeightEntry rows, then restore UniqueConstraint(user, date).

from django.db import migrations, models
from django.db.models import Count


def dedupe_weight_entries(apps, schema_editor):
    WeightEntry = apps.get_model("progress", "WeightEntry")
    dup_groups = (
        WeightEntry.objects.values("user_id", "date")
        .annotate(n=Count("id"))
        .filter(n__gt=1)
    )
    for group in dup_groups:
        qs = WeightEntry.objects.filter(
            user_id=group["user_id"], date=group["date"]
        ).order_by("-created_at", "-id")
        keep = qs.first()
        qs.exclude(pk=keep.pk).delete()


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("progress", "0003_rest_wellness_assessment"),
    ]

    operations = [
        migrations.RunPython(dedupe_weight_entries, noop_reverse),
        migrations.AddConstraint(
            model_name="weightentry",
            constraint=models.UniqueConstraint(
                fields=("user", "date"),
                name="unique_weight_entry_per_user_date",
            ),
        ),
    ]
