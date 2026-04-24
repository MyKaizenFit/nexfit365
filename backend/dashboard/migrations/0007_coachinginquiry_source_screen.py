from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("dashboard", "0006_helpsettings_coaching_booking"),
    ]

    operations = [
        migrations.AddField(
            model_name="coachinginquiry",
            name="source_screen",
            field=models.CharField(
                blank=True,
                choices=[
                    ("dashboard-home", "Dashboard"),
                    ("workouts", "Entrenamientos"),
                    ("meals", "Nutrición"),
                    ("measurements", "Progreso"),
                    ("coaching-page", "Página de coaching"),
                    ("landing", "Landing"),
                    ("other", "Otro"),
                ],
                default="dashboard-home",
                help_text="Pantalla o entrada desde la que el usuario abrió el funnel 1:1",
                max_length=40,
            ),
        ),
    ]
