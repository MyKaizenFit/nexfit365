from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('nutrition', '0026_meallog_substitution_details'),
    ]

    operations = [
        migrations.AddField(
            model_name='food',
            name='equivalence_category',
            field=models.CharField(blank=True, db_index=True, help_text='Grupo usado para intercambios equivalentes: carnes, pescados, legumbres, fruta, verduras, etc.', max_length=50),
        ),
    ]
