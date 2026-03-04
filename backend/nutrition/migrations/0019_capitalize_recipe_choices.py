# Migration to capitalize recipe difficulty and category values

from django.db import migrations

def capitalize_forward(apps, schema_editor):
    """Change difficulty and category values to start with capital letter"""
    Recipe = apps.get_model('nutrition', 'Recipe')
    
    # Difficulty changes
    Recipe.objects.filter(difficulty='fácil').update(difficulty='Fácil')
    Recipe.objects.filter(difficulty='medio').update(difficulty='Medio')
    Recipe.objects.filter(difficulty='difícil').update(difficulty='Difícil')
    
    # Category changes
    Recipe.objects.filter(category='desayuno').update(category='Desayuno')
    Recipe.objects.filter(category='almuerzo').update(category='Almuerzo')
    Recipe.objects.filter(category='cena').update(category='Cena')
    Recipe.objects.filter(category='postre').update(category='Postre')
    Recipe.objects.filter(category='bebida').update(category='Bebida')
    # snack is already capitalized

def capitalize_backward(apps, schema_editor):
    """Revert changes back to lowercase"""
    Recipe = apps.get_model('nutrition', 'Recipe')
    
    # Difficulty changes
    Recipe.objects.filter(difficulty='Fácil').update(difficulty='fácil')
    Recipe.objects.filter(difficulty='Medio').update(difficulty='medio')
    Recipe.objects.filter(difficulty='Difícil').update(difficulty='difícil')
    
    # Category changes
    Recipe.objects.filter(category='Desayuno').update(category='desayuno')
    Recipe.objects.filter(category='Almuerzo').update(category='almuerzo')
    Recipe.objects.filter(category='Cena').update(category='cena')
    Recipe.objects.filter(category='Postre').update(category='postre')
    Recipe.objects.filter(category='Bebida').update(category='bebida')
    # snack stays lowercase

class Migration(migrations.Migration):

    dependencies = [
        ('nutrition', '0018_alter_recipe_category_alter_recipe_difficulty'),
    ]

    operations = [
        migrations.RunPython(capitalize_forward, capitalize_backward),
    ]
