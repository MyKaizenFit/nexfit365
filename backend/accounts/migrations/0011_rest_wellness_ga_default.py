from django.db import migrations, models


def enable_rest_wellness_for_all(apps, schema_editor):
    User = apps.get_model("accounts", "CustomUser")
    User.objects.filter(rest_wellness_enabled=False).update(rest_wellness_enabled=True)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0010_add_rest_wellness_enabled"),
    ]

    operations = [
        migrations.RunPython(enable_rest_wellness_for_all, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="customuser",
            name="rest_wellness_enabled",
            field=models.BooleanField(
                default=True,
                help_text=(
                    "Si está activo, el usuario ve el cuestionario de descanso en el dashboard. "
                    "Desactivar para ocultarlo (opt-out)."
                ),
            ),
        ),
    ]
