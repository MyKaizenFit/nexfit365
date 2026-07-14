from django.db import migrations, models

PILOT_EMAILS = (
    "raptoraitor32@gmail.com",
    "contacto.sarakhalaf@gmail.com",
)


def enable_pilot_rest_wellness(apps, schema_editor):
    User = apps.get_model("accounts", "CustomUser")
    for email in PILOT_EMAILS:
        User.objects.filter(email__iexact=email).update(rest_wellness_enabled=True)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0009_alter_customuser_target_weight_max_200"),
    ]

    operations = [
        migrations.AddField(
            model_name="customuser",
            name="rest_wellness_enabled",
            field=models.BooleanField(
                default=False,
                help_text="Permite acceder al cuestionario de descanso en el dashboard.",
            ),
        ),
        migrations.RunPython(enable_pilot_rest_wellness, migrations.RunPython.noop),
    ]
