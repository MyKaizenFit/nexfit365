from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workouts', '0005_exercise_name_unique_ci'),
    ]

    operations = [
        migrations.AlterField(
            model_name='exercise',
            name='category',
            field=models.CharField(
                default='strength',
                help_text='Categoría principal',
                max_length=100,
            ),
        ),
    ]
