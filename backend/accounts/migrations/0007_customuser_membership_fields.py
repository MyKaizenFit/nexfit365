from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0006_customuser_additional_info_for_admin"),
    ]

    operations = [
        migrations.AddField(
            model_name="customuser",
            name="subscription_ends_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="customuser",
            name="subscription_plan",
            field=models.CharField(
                choices=[
                    ("none", "Sin plan"),
                    ("trial", "Prueba 7 días"),
                    ("monthly", "Mensual"),
                    ("yearly", "Anual"),
                    ("coaching", "Coaching 1:1"),
                ],
                default="none",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="customuser",
            name="subscription_started_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="customuser",
            name="subscription_status",
            field=models.CharField(
                choices=[
                    ("none", "Sin suscripción"),
                    ("trial", "Prueba gratuita"),
                    ("active", "Suscripción activa"),
                    ("expired", "Suscripción expirada"),
                    ("cancelled", "Suscripción cancelada"),
                ],
                default="none",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="customuser",
            name="trial_ends_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="customuser",
            name="trial_started_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
