from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('nutrition', '0025_communityrecipepost_communityrecipelike_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='meallog',
            name='substitution_details',
            field=models.JSONField(blank=True, default=list, help_text='Sustituciones aplicadas en la receta: ingrediente original, alimento equivalente y gramos calculados'),
        ),
    ]
