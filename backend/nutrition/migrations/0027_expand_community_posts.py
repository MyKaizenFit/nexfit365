from django.db import migrations, models
import nutrition.models


class Migration(migrations.Migration):

    dependencies = [
        ('nutrition', '0026_meallog_substitution_details'),
    ]

    operations = [
        migrations.AddField(
            model_name='communityrecipepost',
            name='post_type',
            field=models.CharField(
                choices=[
                    ('general', 'Publicación libre'),
                    ('recipe', 'Receta'),
                    ('exercise', 'Ejercicio'),
                    ('workout', 'Entrenamiento'),
                    ('progress', 'Progreso'),
                    ('tip', 'Consejo'),
                    ('question', 'Pregunta'),
                ],
                db_index=True,
                default='recipe',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='communityrecipepost',
            name='tags',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='communityrecipepost',
            name='template_data',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AlterField(
            model_name='communityrecipepost',
            name='photo',
            field=models.ImageField(blank=True, null=True, upload_to=nutrition.models.community_recipe_image_path),
        ),
        migrations.AddIndex(
            model_name='communityrecipepost',
            index=models.Index(fields=['post_type', 'created_at'], name='nutrition_c_post_ty_29961a_idx'),
        ),
        migrations.AlterModelOptions(
            name='communityrecipepost',
            options={
                'ordering': ['-created_at'],
                'verbose_name': 'Publicación de Team SK',
                'verbose_name_plural': 'Publicaciones de Team SK',
            },
        ),
    ]
