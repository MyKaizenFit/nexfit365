from django.db import migrations

import accounts.fields


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0005_alter_customuser_allergies_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="customuser",
            name="additional_info_for_admin",
            field=accounts.fields.EncryptedTextField(blank=True, help_text="Información adicional que el usuario quiere comunicar al equipo/admin", null=True),
        ),
    ]
