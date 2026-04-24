from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("dashboard", "0005_coaching_models"),
    ]

    operations = [
        migrations.AddField(
            model_name="helpsettings",
            name="coaching_booking_enabled",
            field=models.BooleanField(default=True, help_text="Activar agendado de llamadas para coaching 1:1"),
        ),
        migrations.AddField(
            model_name="helpsettings",
            name="coaching_booking_url",
            field=models.URLField(blank=True, help_text="URL de Calendly, Meet u otra herramienta para agendar llamadas", null=True),
        ),
    ]
