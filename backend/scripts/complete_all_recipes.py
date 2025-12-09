#!/usr/bin/env python
"""
Script para completar TODAS las recetas incompletas con ingredientes
"""
import os
import sys
import django
import re

# Configurar Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from nutrition.models import Recipe

# Base de datos de ingredientes comunes
INGREDIENTS = {
    # Proteínas
    'pollo': {'name': 'Pechuga de pollo', 'quantity': '150', 'unit': 'g', 'calories': 165, 'protein': 31, 'carbs': 0, 'fat': 3.6},
    'salmon': {'name': 'Salmón fresco', 'quantity': '150', 'unit': 'g', 'calories': 206, 'protein': 22, 'carbs': 0, 'fat': 13},
    'atun': {'name': 'Atún al natural', 'quantity': '120', 'unit': 'g', 'calories': 120, 'protein': 26, 'carbs': 0, 'fat': 1},
    'pavo': {'name': 'Pavo', 'quantity': '150', 'unit': 'g', 'calories': 135, 'protein': 30, 'carbs': 0, 'fat': 1},
    'ternera': {'name': 'Ternera magra', 'quantity': '150', 'unit': 'g', 'calories': 180, 'protein': 26, 'carbs': 0, 'fat': 8},
    'carne': {'name': 'Carne de res', 'quantity': '150', 'unit': 'g', 'calories': 180, 'protein': 26, 'carbs': 0, 'fat': 8},
    'caballa': {'name': 'Caballa', 'quantity': '120', 'unit': 'g', 'calories': 205, 'protein': 19, 'carbs': 0, 'fat': 14},
    'sardinas': {'name': 'Sardinas', 'quantity': '100', 'unit': 'g', 'calories': 208, 'protein': 25, 'carbs': 0, 'fat': 11},
    'pulpo': {'name': 'Pulpo cocido', 'quantity': '120', 'unit': 'g', 'calories': 92, 'protein': 19, 'carbs': 2, 'fat': 1},
    'dorada': {'name': 'Dorada', 'quantity': '150', 'unit': 'g', 'calories': 115, 'protein': 20, 'carbs': 0, 'fat': 3.8},
    'huevo': {'name': 'Huevo', 'quantity': '2', 'unit': 'unidades', 'calories': 140, 'protein': 12, 'carbs': 1, 'fat': 10},
    'jamon': {'name': 'Jamón serrano', 'quantity': '40', 'unit': 'g', 'calories': 60, 'protein': 10, 'carbs': 0, 'fat': 2},
    'tofu': {'name': 'Tofu firme', 'quantity': '150', 'unit': 'g', 'calories': 144, 'protein': 15, 'carbs': 3, 'fat': 9},
    
    # Carbohidratos
    'arroz': {'name': 'Arroz blanco', 'quantity': '150', 'unit': 'g', 'calories': 195, 'protein': 4, 'carbs': 43, 'fat': 0.4},
    'patata': {'name': 'Patata', 'quantity': '200', 'unit': 'g', 'calories': 154, 'protein': 3.6, 'carbs': 36, 'fat': 0.2},
    'boniato': {'name': 'Boniato', 'quantity': '150', 'unit': 'g', 'calories': 130, 'protein': 2, 'carbs': 30, 'fat': 0.2},
    'quinoa': {'name': 'Quinoa', 'quantity': '150', 'unit': 'g', 'calories': 180, 'protein': 6, 'carbs': 32, 'fat': 3},
    'lentejas': {'name': 'Lentejas', 'quantity': '150', 'unit': 'g', 'calories': 165, 'protein': 12, 'carbs': 28, 'fat': 0.5},
    'pan': {'name': 'Pan integral', 'quantity': '60', 'unit': 'g', 'calories': 150, 'protein': 6, 'carbs': 28, 'fat': 2},
    'tortilla': {'name': 'Tortilla integral', 'quantity': '1', 'unit': 'unidad', 'calories': 120, 'protein': 4, 'carbs': 20, 'fat': 2.5},
    
    # Vegetales
    'brocoli': {'name': 'Brócoli', 'quantity': '100', 'unit': 'g', 'calories': 35, 'protein': 2.8, 'carbs': 7, 'fat': 0.4},
    'tomate': {'name': 'Tomate', 'quantity': '80', 'unit': 'g', 'calories': 14, 'protein': 0.7, 'carbs': 3, 'fat': 0.2},
    'pimiento': {'name': 'Pimiento', 'quantity': '80', 'unit': 'g', 'calories': 26, 'protein': 0.8, 'carbs': 6, 'fat': 0.2},
    'cebolla': {'name': 'Cebolla', 'quantity': '50', 'unit': 'g', 'calories': 20, 'protein': 0.6, 'carbs': 4.7, 'fat': 0.1},
    'aguacate': {'name': 'Aguacate', 'quantity': '60', 'unit': 'g', 'calories': 96, 'protein': 1.2, 'carbs': 5, 'fat': 8.8},
    'lechuga': {'name': 'Lechuga', 'quantity': '50', 'unit': 'g', 'calories': 8, 'protein': 0.6, 'carbs': 1.5, 'fat': 0.1},
    'zanahoria': {'name': 'Zanahoria', 'quantity': '60', 'unit': 'g', 'calories': 25, 'protein': 0.6, 'carbs': 6, 'fat': 0.1},
    'berenjena': {'name': 'Berenjena', 'quantity': '100', 'unit': 'g', 'calories': 25, 'protein': 1, 'carbs': 6, 'fat': 0.2},
    'esparragos': {'name': 'Espárragos', 'quantity': '80', 'unit': 'g', 'calories': 16, 'protein': 1.8, 'carbs': 3, 'fat': 0.1},
    'espinacas': {'name': 'Espinacas', 'quantity': '50', 'unit': 'g', 'calories': 12, 'protein': 1.4, 'carbs': 1.8, 'fat': 0.2},
    
    # Lácteos y quesos
    'queso': {'name': 'Queso fresco', 'quantity': '40', 'unit': 'g', 'calories': 50, 'protein': 6, 'carbs': 2, 'fat': 2},
    'yogur': {'name': 'Yogur griego', 'quantity': '100', 'unit': 'g', 'calories': 59, 'protein': 10, 'carbs': 3.6, 'fat': 0.4},
    'ricotta': {'name': 'Queso ricotta', 'quantity': '60', 'unit': 'g', 'calories': 100, 'protein': 7, 'carbs': 4, 'fat': 6},
    
    # Grasas y condimentos
    'aove': {'name': 'Aceite de oliva', 'quantity': '10', 'unit': 'ml', 'calories': 90, 'protein': 0, 'carbs': 0, 'fat': 10},
    'hummus': {'name': 'Hummus', 'quantity': '60', 'unit': 'g', 'calories': 100, 'protein': 4, 'carbs': 9, 'fat': 5},
    'limon': {'name': 'Limón', 'quantity': '10', 'unit': 'ml', 'calories': 3, 'protein': 0, 'carbs': 0.8, 'fat': 0},
    'sal': {'name': 'Sal', 'quantity': '2', 'unit': 'g', 'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0},
    'pimienta': {'name': 'Pimienta', 'quantity': '1', 'unit': 'g', 'calories': 3, 'protein': 0.1, 'carbs': 0.6, 'fat': 0},
    'pimenton': {'name': 'Pimentón', 'quantity': '2', 'unit': 'g', 'calories': 6, 'protein': 0.3, 'carbs': 1.2, 'fat': 0.3},
    
    # Frutas
    'fresas': {'name': 'Fresas', 'quantity': '80', 'unit': 'g', 'calories': 26, 'protein': 0.5, 'carbs': 6, 'fat': 0.2},
    'uvas': {'name': 'Uvas', 'quantity': '60', 'unit': 'g', 'calories': 41, 'protein': 0.4, 'carbs': 11, 'fat': 0.1},
    'miel': {'name': 'Miel', 'quantity': '10', 'unit': 'g', 'calories': 30, 'protein': 0, 'carbs': 8, 'fat': 0},
    'datiles': {'name': 'Dátiles', 'quantity': '30', 'unit': 'g', 'calories': 85, 'protein': 0.6, 'carbs': 23, 'fat': 0.1},
}

def generate_ingredients_from_name(recipe_name):
    """Generar lista de ingredientes basado en el nombre de la receta"""
    name_lower = recipe_name.lower()
    ingredients = []
    
    # Detectar proteína principal
    if 'pollo' in name_lower:
        ingredients.append(INGREDIENTS['pollo'])
    elif 'salmón' in name_lower or 'salmon' in name_lower:
        ingredients.append(INGREDIENTS['salmon'])
    elif 'atún' in name_lower or 'atun' in name_lower:
        ingredients.append(INGREDIENTS['atun'])
    elif 'pavo' in name_lower:
        ingredients.append(INGREDIENTS['pavo'])
    elif 'ternera' in name_lower:
        ingredients.append(INGREDIENTS['ternera'])
    elif 'carne' in name_lower:
        ingredients.append(INGREDIENTS['carne'])
    elif 'caballa' in name_lower:
        ingredients.append(INGREDIENTS['caballa'])
    elif 'sardinas' in name_lower:
        ingredients.append(INGREDIENTS['sardinas'])
    elif 'pulpo' in name_lower:
        ingredients.append(INGREDIENTS['pulpo'])
    elif 'dorada' in name_lower:
        ingredients.append(INGREDIENTS['dorada'])
    elif 'huevo' in name_lower:
        ingredients.append(INGREDIENTS['huevo'])
    elif 'jamón' in name_lower or 'jamon' in name_lower:
        ingredients.append(INGREDIENTS['jamon'])
    elif 'tofu' in name_lower:
        ingredients.append(INGREDIENTS['tofu'])
    
    # Detectar carbohidrato
    if 'arroz' in name_lower:
        ingredients.append(INGREDIENTS['arroz'])
    elif 'patata' in name_lower:
        ingredients.append(INGREDIENTS['patata'])
    elif 'boniato' in name_lower:
        ingredients.append(INGREDIENTS['boniato'])
    elif 'quinoa' in name_lower:
        ingredients.append(INGREDIENTS['quinoa'])
    elif 'lentejas' in name_lower:
        ingredients.append(INGREDIENTS['lentejas'])
    elif 'tostada' in name_lower or 'pan' in name_lower:
        ingredients.append(INGREDIENTS['pan'])
    elif 'fajita' in name_lower or 'tortilla' in name_lower:
        ingredients.append(INGREDIENTS['tortilla'])
    
    # Detectar vegetales
    if 'brócoli' in name_lower or 'brocoli' in name_lower:
        ingredients.append(INGREDIENTS['brocoli'])
    if 'tomate' in name_lower:
        ingredients.append(INGREDIENTS['tomate'])
    if 'pimiento' in name_lower:
        ingredients.append(INGREDIENTS['pimiento'])
    if 'cebolla' in name_lower:
        ingredients.append(INGREDIENTS['cebolla'])
    if 'aguacate' in name_lower:
        ingredients.append(INGREDIENTS['aguacate'])
    if 'lechuga' in name_lower or 'salad' in name_lower:
        ingredients.append(INGREDIENTS['lechuga'])
    if 'zanahoria' in name_lower:
        ingredients.append(INGREDIENTS['zanahoria'])
    if 'berenjena' in name_lower:
        ingredients.append(INGREDIENTS['berenjena'])
    if 'espárrago' in name_lower or 'esparrago' in name_lower:
        ingredients.append(INGREDIENTS['esparragos'])
    if 'espinacas' in name_lower:
        ingredients.append(INGREDIENTS['espinacas'])
    
    # Detectar lácteos
    if 'queso' in name_lower and 'ricotta' not in name_lower:
        ingredients.append(INGREDIENTS['queso'])
    if 'ricotta' in name_lower:
        ingredients.append(INGREDIENTS['ricotta'])
    if 'yogur' in name_lower:
        ingredients.append(INGREDIENTS['yogur'])
    if 'hummus' in name_lower:
        ingredients.append(INGREDIENTS['hummus'])
    
    # Detectar frutas
    if 'fresas' in name_lower:
        ingredients.append(INGREDIENTS['fresas'])
    if 'uvas' in name_lower:
        ingredients.append(INGREDIENTS['uvas'])
    if 'miel' in name_lower:
        ingredients.append(INGREDIENTS['miel'])
    if 'dátil' in name_lower or 'datil' in name_lower:
        ingredients.append(INGREDIENTS['datiles'])
    
    # Detectar condimentos
    if 'limón' in name_lower or 'limon' in name_lower:
        ingredients.append(INGREDIENTS['limon'])
    if 'pimentón' in name_lower or 'pimenton' in name_lower:
        ingredients.append(INGREDIENTS['pimenton'])
    
    # Siempre agregar aceite de oliva
    if not any('oliva' in ing.get('name', '').lower() for ing in ingredients):
        ingredients.append(INGREDIENTS['aove'])
    
    # Siempre agregar sal y pimienta
    ingredients.append(INGREDIENTS['sal'])
    ingredients.append(INGREDIENTS['pimienta'])
    
    # Si no hay suficientes ingredientes, agregar algunos vegetales básicos
    if len(ingredients) < 5:
        if not any('tomate' in ing.get('name', '').lower() for ing in ingredients):
            ingredients.append(INGREDIENTS['tomate'])
        if not any('pimiento' in ing.get('name', '').lower() for ing in ingredients):
            ingredients.append(INGREDIENTS['pimiento'])
        if not any('cebolla' in ing.get('name', '').lower() for ing in ingredients):
            ingredients.append(INGREDIENTS['cebolla'])
    
    return ingredients

def complete_recipe(recipe):
    """Completar una receta con ingredientes"""
    
    # Generar ingredientes basados en el nombre
    ingredients_list = generate_ingredients_from_name(recipe.name)
    
    if not ingredients_list:
        print(f"⚠️  No se pudieron generar ingredientes para: {recipe.name}")
        return False
    
    # Calcular totales nutricionales
    total_calories = sum(ing['calories'] for ing in ingredients_list)
    total_protein = sum(ing['protein'] for ing in ingredients_list)
    total_carbs = sum(ing['carbs'] for ing in ingredients_list)
    total_fat = sum(ing['fat'] for ing in ingredients_list)
    
    # Actualizar receta
    recipe.ingredients = ingredients_list
    recipe.calories = int(total_calories)
    recipe.protein = round(total_protein, 2)
    recipe.carbs = round(total_carbs, 2)
    recipe.fat = round(total_fat, 2)
    recipe.fiber = round(total_carbs * 0.12, 2)
    recipe.sugar = round(total_carbs * 0.1, 2)
    recipe.sodium = 400
    
    # Actualizar instrucciones si están vacías
    if not recipe.instructions or recipe.instructions.strip() == '':
        if 'BOWL' in recipe.name:
            recipe.instructions = "1. Cocinar los ingredientes principales.\n2. Mezclar todos los ingredientes en un bowl.\n3. Aliñar con aceite, limón, sal y pimienta.\n4. Servir inmediatamente."
        elif 'FAJITA' in recipe.name:
            recipe.instructions = "1. Saltear los ingredientes en una sartén.\n2. Calentar la tortilla.\n3. Rellenar con los ingredientes salteados.\n4. Enrollar y servir."
        elif 'TABLA' in recipe.name:
            recipe.instructions = "1. Preparar todos los ingredientes.\n2. Disponer en una tabla o plato.\n3. Servir frío o a temperatura ambiente.\n4. Disfrutar."
        elif 'TOSTADA' in recipe.name:
            recipe.instructions = "1. Tostar el pan.\n2. Colocar los ingredientes encima.\n3. Aliñar al gusto.\n4. Servir caliente."
    
    recipe.save()
    
    print(f"✅ {recipe.name}")
    print(f"   {len(ingredients_list)} ingredientes | {total_calories} kcal | P:{total_protein}g C:{total_carbs}g F:{total_fat}g")
    
    return True

def main():
    print("=" * 70)
    print("🍽️  COMPLETANDO TODAS LAS RECETAS SIN INGREDIENTES")
    print("=" * 70 + "\n")
    
    # Obtener todas las recetas sin ingredientes
    recipes_incomplete = Recipe.objects.filter(ingredients=[])
    
    print(f"📋 Recetas sin ingredientes: {recipes_incomplete.count()}\n")
    
    completed = 0
    failed = 0
    
    for recipe in recipes_incomplete:
        if complete_recipe(recipe):
            completed += 1
        else:
            failed += 1
    
    print(f"\n{'='*70}")
    print(f"✅ Proceso completado")
    print(f"   Completadas: {completed}")
    print(f"   Fallidas: {failed}")
    print(f"{'='*70}\n")
    
    # Mostrar resumen final
    total_recipes = Recipe.objects.count()
    recipes_complete = Recipe.objects.exclude(ingredients=[]).count()
    recipes_incomplete_final = Recipe.objects.filter(ingredients=[]).count()
    
    print("📊 Resumen Final:")
    print(f"   Total recetas: {total_recipes}")
    print(f"   Completas: {recipes_complete}")
    print(f"   Incompletas: {recipes_incomplete_final}\n")

if __name__ == '__main__':
    main()


