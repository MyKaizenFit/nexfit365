from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('nutrition', '0027_food_equivalence_category'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # 1. Crear modelo EquivalenceCategory
        migrations.CreateModel(
            name='EquivalenceCategory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('slug', models.SlugField(max_length=60, unique=True, help_text="Identificador único (ej: 'arroz_cereales')")),
                ('name', models.CharField(max_length=100, help_text="Nombre legible (ej: 'Arroz / cereales / pasta')")),
                ('description', models.TextField(blank=True)),
                ('color', models.CharField(max_length=20, blank=True, default='', help_text="Color hex o nombre CSS (ej: '#4CAF50', 'emerald')")),
                ('icon', models.CharField(max_length=10, blank=True, default='', help_text='Emoji o código de icono')),
                ('is_system', models.BooleanField(default=False, help_text='True = categoría del sistema, no se puede eliminar')),
                ('order', models.PositiveSmallIntegerField(default=0, help_text='Orden de aparición en listas')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='equivalence_categories_created', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Categoría de equivalencia',
                'verbose_name_plural': 'Categorías de equivalencia',
                'ordering': ['order', 'name'],
            },
        ),

        # 2. Añadir campo equivalence_categories a Food
        migrations.AddField(
            model_name='food',
            name='equivalence_categories',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Grupos de equivalencia múltiples: ['arroz_cereales', 'panes']. Si está vacío se usa equivalence_category."
            ),
        ),

        # 3. Poblar las categorías del sistema
        migrations.RunPython(
            code=lambda apps, schema_editor: _seed_system_categories(apps, schema_editor),
            reverse_code=migrations.RunPython.noop,
        ),

        # 4. Migrar equivalence_category → equivalence_categories en alimentos existentes
        migrations.RunPython(
            code=lambda apps, schema_editor: _migrate_food_categories(apps, schema_editor),
            reverse_code=migrations.RunPython.noop,
        ),
    ]


SYSTEM_CATEGORIES = [
    ('carnes',        'Carnes',                    '🥩', '#ef4444', 0),
    ('pescados',      'Pescados',                  '🐟', '#3b82f6', 1),
    ('marisco',       'Marisco',                   '🦐', '#0ea5e9', 2),
    ('huevos',        'Huevos',                    '🥚', '#f59e0b', 3),
    ('arroz_cereales','Arroz / cereales / pasta',  '🍚', '#84cc16', 4),
    ('panes',         'Panes',                     '🍞', '#d97706', 5),
    ('legumbres',     'Legumbres',                 '🫘', '#78716c', 6),
    ('fruta',         'Fruta',                     '🍎', '#f97316', 7),
    ('verduras',      'Verduras',                  '🥦', '#22c55e', 8),
    ('lacteos',       'Lácteos',                   '🥛', '#6366f1', 9),
    ('frutos_secos',  'Frutos secos',              '🥜', '#a16207', 10),
    ('grasas',        'Grasas',                    '🫒', '#ca8a04', 11),
    ('otros',         'Otros',                     '🍽️', '#6b7280', 12),
]


def _seed_system_categories(apps, schema_editor):
    EquivalenceCategory = apps.get_model('nutrition', 'EquivalenceCategory')
    for slug, name, icon, color, order in SYSTEM_CATEGORIES:
        EquivalenceCategory.objects.get_or_create(
            slug=slug,
            defaults=dict(name=name, icon=icon, color=color, is_system=True, order=order)
        )


def _migrate_food_categories(apps, schema_editor):
    Food = apps.get_model('nutrition', 'Food')
    to_update = []
    for food in Food.objects.exclude(equivalence_category='').exclude(equivalence_category=None):
        if not food.equivalence_categories:
            food.equivalence_categories = [food.equivalence_category]
            to_update.append(food)
    if to_update:
        Food.objects.bulk_update(to_update, ['equivalence_categories'])
