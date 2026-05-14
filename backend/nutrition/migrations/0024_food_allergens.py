from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('nutrition', '0023_rename_nutrition_me_user_id_c83f0c_idx_nutrition_m_user_id_b4edf6_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='food',
            name='allergens',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Alérgenos estructurados del alimento: ['gluten', 'dairy', 'eggs', 'nuts', 'soy', 'fish', 'shellfish', 'sesame']",
            ),
        ),
    ]
