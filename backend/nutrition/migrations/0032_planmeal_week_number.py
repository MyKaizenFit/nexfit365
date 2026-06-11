from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("nutrition", "0031_remove_team_sk_expiration"),
    ]

    operations = [
        migrations.AddField(
            model_name="planmeal",
            name="week_number",
            field=models.PositiveSmallIntegerField(
                default=1,
                help_text="Semana del plan (1-based). Permite menús distintos por semana del ciclo.",
            ),
        ),
        migrations.AlterModelOptions(
            name="planmeal",
            options={"ordering": ["week_number", "day_of_week", "order_index"]},
        ),
    ]
