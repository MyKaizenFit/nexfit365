# Generated manually for photo_type choices expansion (do not auto-apply until confirmed).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("progress", "0003_rest_wellness_assessment"),
    ]

    operations = [
        migrations.AlterField(
            model_name="progressphoto",
            name="photo_type",
            field=models.CharField(
                choices=[
                    ("front", "Frontal"),
                    ("back", "Espalda"),
                    ("left_side", "Lateral izquierdo"),
                    ("right_side", "Lateral derecho"),
                    ("side", "Sin clasificar"),
                    ("other", "Sin clasificar"),
                ],
                default="front",
                max_length=20,
            ),
        ),
    ]
