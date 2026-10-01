from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("legal", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="HealthDataDeletionJob",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("purpose", models.CharField(choices=[("account", "Cuenta"), ("health_profile", "Perfil de salud"), ("progress_photos", "Fotos de progreso"), ("nutrition", "Nutrición"), ("workouts", "Entrenamiento"), ("wellness", "Bienestar"), ("marketing", "Marketing")], max_length=32)),
                ("status", models.CharField(choices=[("pending", "Pendiente"), ("processing", "En proceso"), ("completed", "Completado"), ("failed", "Fallido")], default="pending", max_length=16)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="health_data_deletion_jobs", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddConstraint(
            model_name="healthdatadeletionjob",
            constraint=models.UniqueConstraint(condition=models.Q(("status__in", ["pending", "processing"])), fields=("user", "purpose"), name="legal_one_open_health_cleanup_per_purpose"),
        ),
    ]
