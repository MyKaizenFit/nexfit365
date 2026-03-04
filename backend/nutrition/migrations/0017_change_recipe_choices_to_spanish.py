# Generated migration to change Recipe difficulty and category choices to Spanish

from django.db import migrations

def change_choices_forward(apps, schema_editor):
    """Change difficulty and category choices from English to Spanish"""
    Recipe = apps.get_model('nutrition', 'Recipe')
    
    # Difficulty changes
    Recipe.objects.filter(difficulty='easy').update(difficulty='fácil')
    Recipe.objects.filter(difficulty='medium').update(difficulty='medio')
    Recipe.objects.filter(difficulty='hard').update(difficulty='difícil')
    
    # Category changes
    Recipe.objects.filter(category='breakfast').update(category='desayuno')
    Recipe.objects.filter(category='lunch').update(category='almuerzo')
    Recipe.objects.filter(category='dinner').update(category='cena')
    Recipe.objects.filter(category='dessert').update(category='postre')
    Recipe.objects.filter(category='drink').update(category='bebida')

def change_choices_backward(apps, schema_editor):
    """Revert changes back to English"""
    Recipe = apps.get_model('nutrition', 'Recipe')
    
    # Difficulty changes
    Recipe.objects.filter(difficulty='fácil').update(difficulty='easy')
    Recipe.objects.filter(difficulty='medio').update(difficulty='medium')
    Recipe.objects.filter(difficulty='difícil').update(difficulty='hard')
    
    # Category changes
    Recipe.objects.filter(category='desayuno').update(category='breakfast')
    Recipe.objects.filter(category='almuerzo').update(category='lunch')
    Recipe.objects.filter(category='cena').update(category='dinner')
    Recipe.objects.filter(category='postre').update(category='dessert')
    Recipe.objects.filter(category='bebida').update(category='drink')

class Migration(migrations.Migration):

    dependencies = [
        ('nutrition', '0016_add_nutrition_plan_assignments'),
    ]

    operations = [
        migrations.RunPython(change_choices_forward, change_choices_backward),
    ]
