import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("legal", "0002_health_data_deletion_job"),
    ]

    operations = [
        migrations.AddField(
            model_name="healthdatadeletionjob",
            name="attempts",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="healthdatadeletionjob",
            name="completed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="healthdatadeletionjob",
            name="cutoff_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="healthdatadeletionjob",
            name="error_code",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
        migrations.AddField(
            model_name="healthdatadeletionjob",
            name="generation",
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="healthdatadeletionjob",
            name="started_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="healthdatadeletionjob",
            name="withdrawal_event",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="health_cleanup_jobs",
                to="legal.userlegalevent",
            ),
        ),
        migrations.RemoveConstraint(
            model_name="healthdatadeletionjob",
            name="legal_one_open_health_cleanup_per_purpose",
        ),
        migrations.AddConstraint(
            model_name="healthdatadeletionjob",
            constraint=models.UniqueConstraint(
                condition=models.Q(("status__in", ["pending", "processing", "failed"])),
                fields=("user", "purpose"),
                name="legal_one_open_health_cleanup_per_purpose",
            ),
        ),
        migrations.CreateModel(
            name="PrivacySuppressionRecord",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("purpose", models.CharField(choices=[("account", "Cuenta"), ("health_profile", "Perfil de salud"), ("progress_photos", "Fotos de progreso"), ("nutrition", "Nutrición"), ("workouts", "Entrenamiento"), ("wellness", "Bienestar"), ("marketing", "Marketing")], max_length=32)),
                ("generation", models.PositiveIntegerField()),
                ("deleted_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="privacy_suppressions", to=settings.AUTH_USER_MODEL)),
                ("withdrawal_event", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="privacy_suppressions", to="legal.userlegalevent")),
            ],
        ),
        migrations.AddConstraint(
            model_name="privacysuppressionrecord",
            constraint=models.UniqueConstraint(fields=("user", "purpose", "generation"), name="legal_one_suppression_per_generation"),
        ),
    ]
