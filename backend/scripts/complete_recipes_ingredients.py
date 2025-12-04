#!/usr/bin/env python
"""
Script para completar ingredientes de recetas incompletas
"""
import os
import sys
import django

# Configurar Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from nutrition.models import Recipe

# Definiciones de ingredientes comunes con valores nutricionales aproximados
INGREDIENTS_DB = {
    # Proteínas
    'pollo_pechuga': {'name': 'Pechuga de pollo', 'quantity': '150', 'unit': 'g', 'calories': 165, 'protein': 31, 'carbs': 0, 'fat': 3.6},
    'salmon': {'name': 'Salmón', 'quantity': '150', 'unit': 'g', 'calories': 206, 'protein': 22, 'carbs': 0, 'fat': 13},
    'atun': {'name': 'Atún al natural', 'quantity': '120', 'unit': 'g', 'calories': 120, 'protein': 26, 'carbs': 0, 'fat': 1},
    'pavo': {'name': 'Pavo', 'quantity': '150', 'unit': 'g', 'calories': 135, 'protein': 30, 'carbs': 0, 'fat': 1},
    'caballa': {'name': 'Caballa', 'quantity': '120', 'unit': 'g', 'calories': 205, 'protein': 19, 'carbs': 0, 'fat': 14},
    'sardinas': {'name': 'Sardinas', 'quantity': '100', 'unit': 'g', 'calories': 208, 'protein': 25, 'carbs': 0, 'fat': 11},
    'ternera': {'name': 'Ternera magra', 'quantity': '150', 'unit': 'g', 'calories': 180, 'protein': 26, 'carbs': 0, 'fat': 8},
    'tofu': {'name': 'Tofu firme', 'quantity': '150', 'unit': 'g', 'calories': 144, 'protein': 15, 'carbs': 3, 'fat': 9},
    
    # Carbohidratos
    'arroz': {'name': 'Arroz blanco cocido', 'quantity': '150', 'unit': 'g', 'calories': 195, 'protein': 4, 'carbs': 43, 'fat': 0.4},
    'arroz_jazmin': {'name': 'Arroz jazmín cocido', 'quantity': '150', 'unit': 'g', 'calories': 205, 'protein': 4, 'carbs': 45, 'fat': 0.4},
    'patata': {'name': 'Patata cocida', 'quantity': '200', 'unit': 'g', 'calories': 154, 'protein': 3.6, 'carbs': 36, 'fat': 0.2},
    'boniato': {'name': 'Boniato asado', 'quantity': '150', 'unit': 'g', 'calories': 130, 'protein': 2, 'carbs': 30, 'fat': 0.2},
    'quinoa': {'name': 'Quinoa cocida', 'quantity': '150', 'unit': 'g', 'calories': 180, 'protein': 6, 'carbs': 32, 'fat': 3},
    'lentejas': {'name': 'Lentejas cocidas', 'quantity': '150', 'unit': 'g', 'calories': 165, 'protein': 12, 'carbs': 28, 'fat': 0.5},
    
    # Vegetales
    'brocoli': {'name': 'Brócoli al vapor', 'quantity': '100', 'unit': 'g', 'calories': 35, 'protein': 2.8, 'carbs': 7, 'fat': 0.4},
    'esparragos': {'name': 'Espárragos', 'quantity': '100', 'unit': 'g', 'calories': 20, 'protein': 2.2, 'carbs': 3.9, 'fat': 0.1},
    'tomate': {'name': 'Tomate cherry', 'quantity': '80', 'unit': 'g', 'calories': 14, 'protein': 0.7, 'carbs': 3, 'fat': 0.2},
    'pimiento': {'name': 'Pimiento rojo', 'quantity': '80', 'unit': 'g', 'calories': 26, 'protein': 0.8, 'carbs': 6, 'fat': 0.2},
    'cebolla': {'name': 'Cebolla morada', 'quantity': '50', 'unit': 'g', 'calories': 20, 'protein': 0.6, 'carbs': 4.7, 'fat': 0.1},
    'aguacate': {'name': 'Aguacate', 'quantity': '60', 'unit': 'g', 'calories': 96, 'protein': 1.2, 'carbs': 5, 'fat': 8.8},
    'espinacas': {'name': 'Espinacas frescas', 'quantity': '50', 'unit': 'g', 'calories': 12, 'protein': 1.4, 'carbs': 1.8, 'fat': 0.2},
    'lechuga': {'name': 'Lechuga/Salad mix', 'quantity': '50', 'unit': 'g', 'calories': 8, 'protein': 0.6, 'carbs': 1.5, 'fat': 0.1},
    
    # Grasas saludables
    'aove': {'name': 'Aceite de oliva virgen extra', 'quantity': '10', 'unit': 'ml', 'calories': 90, 'protein': 0, 'carbs': 0, 'fat': 10},
    'hummus': {'name': 'Hummus', 'quantity': '60', 'unit': 'g', 'calories': 100, 'protein': 4, 'carbs': 9, 'fat': 5},
    
    # Lácteos y quesos
    'queso_fresco': {'name': 'Queso fresco batido', 'quantity': '60', 'unit': 'g', 'calories': 60, 'protein': 8, 'carbs': 3, 'fat': 1.5},
    'yogur': {'name': 'Yogur griego natural', 'quantity': '100', 'unit': 'g', 'calories': 59, 'protein': 10, 'carbs': 3.6, 'fat': 0.4},
    
    # Otros
    'limon': {'name': 'Zumo de limón', 'quantity': '10', 'unit': 'ml', 'calories': 3, 'protein': 0, 'carbs': 0.8, 'fat': 0},
    'sal': {'name': 'Sal', 'quantity': '2', 'unit': 'g', 'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0},
    'pimienta': {'name': 'Pimienta negra', 'quantity': '1', 'unit': 'g', 'calories': 3, 'protein': 0.1, 'carbs': 0.6, 'fat': 0},
}

# Recetas definidas con sus ingredientes
RECIPE_INGREDIENTS = {
    'BOWL 10 - Bowl Post-Workout de Salmón  Patata': [
        'salmon', 'patata', 'brocoli', 'tomate', 'aove', 'limon', 'sal', 'pimienta'
    ],
    'BOWL 11 - Bowl de Pavo  Arroz Jazmín': [
        'pavo', 'arroz_jazmin', 'pimiento', 'cebolla', 'esparragos', 'aove', 'sal', 'pimienta'
    ],
    'BOWL 12 - Bowl Omega de Caballa  Aguacate': [
        'caballa', 'aguacate', 'tomate', 'cebolla', 'espinacas', 'aove', 'limon', 'sal'
    ],
    'BOWL 13 - Bowl de Sardinas  Patata  Salad Mix': [
        'sardinas', 'patata', 'lechuga', 'tomate', 'cebolla', 'aove', 'limon', 'sal'
    ],
    'BOWL 14 - Bowl Vegetariano Proteico de Hummus': [
        'hummus', 'quinoa', 'tomate', 'pimiento', 'cebolla', 'espinacas', 'aove', 'sal'
    ],
    'BOWL 15 - Bowl Vegetariano de Arroz  Queso': [
        'arroz', 'queso_fresco', 'brocoli', 'tomate', 'pimiento', 'cebolla', 'aove', 'sal'
    ],
    'BOWL 16 - Bowl Vegano de Lentejas  Verduras': [
        'lentejas', 'brocoli', 'pimiento', 'cebolla', 'tomate', 'aove', 'sal', 'pimienta'
    ],
    'BOWL 17 - Bowl Vegano de Quinoa  Tofu': [
        'tofu', 'quinoa', 'brocoli', 'pimiento', 'aguacate', 'aove', 'sal', 'pimienta'
    ],
    'BOWL 9 - Bowl Proteico de Ternera arroz y': [
        'ternera', 'arroz', 'brocoli', 'tomate', 'pimiento', 'aove', 'sal', 'pimienta'
    ],
}

def complete_recipe(recipe):
    """Completar una receta con ingredientes"""
    
    if recipe.name not in RECIPE_INGREDIENTS:
        print(f"⚠️  No hay definición para: {recipe.name}")
        return False
    
    ingredient_keys = RECIPE_INGREDIENTS[recipe.name]
    ingredients_list = []
    
    total_calories = 0
    total_protein = 0
    total_carbs = 0
    total_fat = 0
    
    for key in ingredient_keys:
        if key in INGREDIENTS_DB:
            ingredient = INGREDIENTS_DB[key].copy()
            ingredients_list.append(ingredient)
            total_calories += ingredient['calories']
            total_protein += ingredient['protein']
            total_carbs += ingredient['carbs']
            total_fat += ingredient['fat']
    
    # Actualizar receta
    recipe.ingredients = ingredients_list
    recipe.calories = int(total_calories)
    recipe.protein = round(total_protein, 2)
    recipe.carbs = round(total_carbs, 2)
    recipe.fat = round(total_fat, 2)
    recipe.fiber = round(total_carbs * 0.1, 2)  # Estimación
    recipe.sugar = round(total_carbs * 0.15, 2)  # Estimación
    recipe.sodium = 400  # Estimación
    
    # Actualizar instrucciones si están vacías
    if not recipe.instructions or recipe.instructions == '':
        recipe.instructions = f"1. Cocinar los ingredientes principales.\n2. Mezclar todos los ingredientes en un bowl.\n3. Aliñar con aceite, sal y pimienta.\n4. Servir y disfrutar."
    
    recipe.save()
    
    print(f"✅ {recipe.name}")
    print(f"   Ingredientes: {len(ingredients_list)} | Calorías: {total_calories} kcal")
    
    return True

def main():
    print("=" * 70)
    print("🍽️  COMPLETANDO RECETAS CON INGREDIENTES")
    print("=" * 70 + "\n")
    
    # Obtener recetas sin ingredientes (BOWL 10-17 principalmente)
    recipes_to_complete = Recipe.objects.filter(
        name__in=list(RECIPE_INGREDIENTS.keys())
    )
    
    print(f"📋 Recetas a completar: {recipes_to_complete.count()}\n")
    
    completed = 0
    for recipe in recipes_to_complete:
        if complete_recipe(recipe):
            completed += 1
    
    print(f"\n{'='*70}")
    print(f"✅ Proceso completado: {completed} recetas actualizadas")
    print(f"{'='*70}\n")
    
    # Mostrar resumen
    total_recipes = Recipe.objects.filter(name__startswith='BOWL').count()
    recipes_with_ingredients = Recipe.objects.filter(name__startswith='BOWL').exclude(ingredients=[]).count()
    
    print("📊 Resumen de Bowls:")
    print(f"   Total recetas: {total_recipes}")
    print(f"   Con ingredientes: {recipes_with_ingredients}")
    print(f"   Sin ingredientes: {total_recipes - recipes_with_ingredients}\n")

if __name__ == '__main__':
    main()

