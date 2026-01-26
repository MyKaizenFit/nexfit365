import os
import sys
import json
import uuid

sys.path.insert(0, '/srv/mykaizenfit/pro/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
django.setup()

from nutrition.models import Recipe

RECIPES_JSON = '/srv/mykaizenfit/pro/backend/recipes_export_final.json'

def main():
    with open(RECIPES_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)
    recipes = data['recipes'] if 'recipes' in data else data
    print(f"Encontradas {len(recipes)} recetas en el JSON.")
    existentes = set(Recipe.objects.values_list('name', flat=True))
    nuevas = [r for r in recipes if r['name'] not in existentes]
    print(f"Recetas nuevas a importar: {len(nuevas)}")

    for r in nuevas:
        Recipe.objects.create(
            id=r.get('id', uuid.uuid4()),
            name=r.get('name', ''),
            description=r.get('description', ''),
            category=r.get('category', ''),
            difficulty=r.get('difficulty', ''),
            prep_time_minutes=r.get('prep_time_minutes', 0),
            cook_time_minutes=r.get('cook_time_minutes', 0),
            servings=r.get('servings', 1),
            calories=r.get('calories', 0),
            protein=r.get('protein', 0),
            carbs=r.get('carbs', 0),
            fat=r.get('fat', 0),
            fiber=r.get('fiber', 0),
            sugar=r.get('sugar', 0),
            sodium=r.get('sodium', 0),
            ingredients=r.get('ingredients', []),
            instructions=r.get('instructions', ''),
            diet_types=r.get('diet_types', []),
            meal_types=r.get('meal_types', []),
            allergens=r.get('allergens', []),
            tags=r.get('tags', []),
            image_url=r.get('image_url', ''),
            video_url=r.get('video_url', ''),
            is_system=r.get('is_system', True),
            is_active=r.get('is_active', True),
            is_featured=r.get('is_featured', False),
        )
        print(f"✅ Importada: {r.get('name')}")
    print(f"Importación completada. Total importadas: {len(nuevas)}")

if __name__ == '__main__':
    main()
