from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0008_add_admin_calories_override'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customuser',
            name='target_weight',
            field=models.FloatField(
                blank=True,
                help_text='Peso objetivo en kg',
                null=True,
                validators=[
                    django.core.validators.MinValueValidator(50),
                    django.core.validators.MaxValueValidator(200),
                ],
            ),
        ),
    ]
