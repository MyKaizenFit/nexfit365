from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


def forwards_create_assignments(apps, schema_editor):
    NutritionPlan = apps.get_model('nutrition', 'NutritionPlan')
    NutritionPlanAssignment = apps.get_model('nutrition', 'NutritionPlanAssignment')
    db_alias = schema_editor.connection.alias

    for plan in NutritionPlan.objects.using(db_alias).exclude(user__isnull=True):
        NutritionPlanAssignment.objects.using(db_alias).get_or_create(
            plan_id=plan.id,
            user_id=plan.user_id,
            defaults={'is_active': plan.is_active},
        )


class Migration(migrations.Migration):

    dependencies = [
        ('nutrition', '0015_remove_recipe_goal_variant'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='NutritionPlanAssignment',
            fields=[
                ('id', models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True, help_text='Plan activo para este usuario')),
                ('assigned_at', models.DateTimeField(auto_now_add=True)),
                ('plan', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assignments', to='nutrition.nutritionplan')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='nutrition_plan_assignments', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Asignacion de Plan',
                'verbose_name_plural': 'Asignaciones de Plan',
                'ordering': ['-assigned_at'],
                'unique_together': {('plan', 'user')},
            },
        ),
        migrations.AddField(
            model_name='nutritionplan',
            name='assigned_users',
            field=models.ManyToManyField(blank=True, help_text='Usuarios asignados al plan (multiusuario)', related_name='assigned_nutrition_plans', through='nutrition.NutritionPlanAssignment', to=settings.AUTH_USER_MODEL),
        ),
        migrations.RunPython(
            code=forwards_create_assignments,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
