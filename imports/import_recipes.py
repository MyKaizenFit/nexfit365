#!/usr/bin/env python3
"""
Script para importar recetas del PDF con cálculo de macronutrientes
"""
import re
import os
import sys
import json

sys.path.insert(0, '/srv/mykaizenfit/pro/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
django.setup()

from nutrition.models import Recipe
import uuid

# Base de datos de macronutrientes por 100g
NUTRITION_DB = {
    # Proteínas
    'pechuga de pollo': {'cal': 165, 'prot': 31, 'carbs': 0, 'fat': 3.6},
    'pollo': {'cal': 165, 'prot': 31, 'carbs': 0, 'fat': 3.6},
    'salmón': {'cal': 208, 'prot': 20, 'carbs': 0, 'fat': 13},
    'atún': {'cal': 130, 'prot': 28, 'carbs': 0, 'fat': 1},
    'ternera': {'cal': 250, 'prot': 26, 'carbs': 0, 'fat': 15},
    'carne picada': {'cal': 250, 'prot': 26, 'carbs': 0, 'fat': 15},
    'pavo': {'cal': 135, 'prot': 30, 'carbs': 0, 'fat': 1},
    'huevo': {'cal': 155, 'prot': 13, 'carbs': 1.1, 'fat': 11},
    'huevos': {'cal': 155, 'prot': 13, 'carbs': 1.1, 'fat': 11},
    'clara': {'cal': 52, 'prot': 11, 'carbs': 0.7, 'fat': 0.2},
    'claras': {'cal': 52, 'prot': 11, 'carbs': 0.7, 'fat': 0.2},
    'sardinas': {'cal': 208, 'prot': 25, 'carbs': 0, 'fat': 11},
    'bacalao': {'cal': 82, 'prot': 18, 'carbs': 0, 'fat': 0.7},
    'merluza': {'cal': 89, 'prot': 17, 'carbs': 0, 'fat': 2},
    'gambas': {'cal': 85, 'prot': 18, 'carbs': 0.9, 'fat': 1},
    'langostinos': {'cal': 85, 'prot': 18, 'carbs': 0.9, 'fat': 1},
    'tofu': {'cal': 76, 'prot': 8, 'carbs': 1.9, 'fat': 4.8},
    'tempeh': {'cal': 192, 'prot': 20, 'carbs': 7.6, 'fat': 11},
    'seitan': {'cal': 370, 'prot': 75, 'carbs': 14, 'fat': 1.9},
    
    # Carbohidratos
    'arroz': {'cal': 130, 'prot': 2.7, 'carbs': 28, 'fat': 0.3},
    'arroz integral': {'cal': 111, 'prot': 2.6, 'carbs': 23, 'fat': 0.9},
    'patata': {'cal': 77, 'prot': 2, 'carbs': 17, 'fat': 0.1},
    'patatas': {'cal': 77, 'prot': 2, 'carbs': 17, 'fat': 0.1},
    'boniato': {'cal': 86, 'prot': 1.6, 'carbs': 20, 'fat': 0.1},
    'pasta': {'cal': 131, 'prot': 5, 'carbs': 25, 'fat': 1.1},
    'pasta integral': {'cal': 124, 'prot': 5, 'carbs': 25, 'fat': 0.9},
    'pan': {'cal': 265, 'prot': 9, 'carbs': 49, 'fat': 3.2},
    'pan integral': {'cal': 247, 'prot': 13, 'carbs': 41, 'fat': 4.2},
    'avena': {'cal': 389, 'prot': 17, 'carbs': 66, 'fat': 7},
    'quinoa': {'cal': 120, 'prot': 4.4, 'carbs': 21, 'fat': 1.9},
    'lentejas': {'cal': 116, 'prot': 9, 'carbs': 20, 'fat': 0.4},
    'garbanzos': {'cal': 164, 'prot': 9, 'carbs': 27, 'fat': 2.6},
    'judías': {'cal': 127, 'prot': 8.7, 'carbs': 22, 'fat': 0.5},
    'tortilla': {'cal': 237, 'prot': 6.4, 'carbs': 36, 'fat': 7.8},
    'wrap': {'cal': 237, 'prot': 6.4, 'carbs': 36, 'fat': 7.8},
    
    # Verduras
    'espinaca': {'cal': 23, 'prot': 2.9, 'carbs': 3.6, 'fat': 0.4},
    'espinacas': {'cal': 23, 'prot': 2.9, 'carbs': 3.6, 'fat': 0.4},
    'brócoli': {'cal': 34, 'prot': 2.8, 'carbs': 7, 'fat': 0.4},
    'calabacín': {'cal': 17, 'prot': 1.2, 'carbs': 3.1, 'fat': 0.3},
    'pimiento': {'cal': 31, 'prot': 1, 'carbs': 6, 'fat': 0.3},
    'tomate': {'cal': 18, 'prot': 0.9, 'carbs': 3.9, 'fat': 0.2},
    'tomates': {'cal': 18, 'prot': 0.9, 'carbs': 3.9, 'fat': 0.2},
    'pepino': {'cal': 16, 'prot': 0.7, 'carbs': 3.6, 'fat': 0.1},
    'zanahoria': {'cal': 41, 'prot': 0.9, 'carbs': 10, 'fat': 0.2},
    'cebolla': {'cal': 40, 'prot': 1.1, 'carbs': 9, 'fat': 0.1},
    'lechuga': {'cal': 15, 'prot': 1.4, 'carbs': 2.9, 'fat': 0.2},
    'rúcula': {'cal': 25, 'prot': 2.6, 'carbs': 3.7, 'fat': 0.7},
    'champiñones': {'cal': 22, 'prot': 3.1, 'carbs': 3.3, 'fat': 0.3},
    'setas': {'cal': 22, 'prot': 3.1, 'carbs': 3.3, 'fat': 0.3},
    'berenjena': {'cal': 25, 'prot': 1, 'carbs': 6, 'fat': 0.2},
    'aguacate': {'cal': 160, 'prot': 2, 'carbs': 9, 'fat': 15},
    'aceitunas': {'cal': 115, 'prot': 0.8, 'carbs': 6, 'fat': 11},
    
    # Grasas
    'aove': {'cal': 884, 'prot': 0, 'carbs': 0, 'fat': 100},
    'aceite': {'cal': 884, 'prot': 0, 'carbs': 0, 'fat': 100},
    'aceite de oliva': {'cal': 884, 'prot': 0, 'carbs': 0, 'fat': 100},
    'mantequilla': {'cal': 717, 'prot': 0.9, 'carbs': 0.1, 'fat': 81},
    'frutos secos': {'cal': 607, 'prot': 20, 'carbs': 21, 'fat': 54},
    'almendras': {'cal': 579, 'prot': 21, 'carbs': 22, 'fat': 50},
    'nueces': {'cal': 654, 'prot': 15, 'carbs': 14, 'fat': 65},
    
    # Lácteos
    'yogur': {'cal': 59, 'prot': 10, 'carbs': 4, 'fat': 0.7},
    'yogur griego': {'cal': 97, 'prot': 9, 'carbs': 3.6, 'fat': 5},
    'queso': {'cal': 402, 'prot': 25, 'carbs': 1.3, 'fat': 33},
    'queso fresco': {'cal': 98, 'prot': 11, 'carbs': 4, 'fat': 4},
    'leche': {'cal': 42, 'prot': 3.4, 'carbs': 5, 'fat': 1},
    
    # Frutas
    'plátano': {'cal': 89, 'prot': 1.1, 'carbs': 23, 'fat': 0.3},
    'manzana': {'cal': 52, 'prot': 0.3, 'carbs': 14, 'fat': 0.2},
    'naranja': {'cal': 47, 'prot': 0.9, 'carbs': 12, 'fat': 0.1},
    'fresas': {'cal': 32, 'prot': 0.7, 'carbs': 8, 'fat': 0.3},
    'arándanos': {'cal': 57, 'prot': 0.7, 'carbs': 14, 'fat': 0.3},
    
    # Otros
    'hummus': {'cal': 166, 'prot': 8, 'carbs': 14, 'fat': 10},
    'proteína': {'cal': 400, 'prot': 80, 'carbs': 8, 'fat': 3},
    'proteína en polvo': {'cal': 400, 'prot': 80, 'carbs': 8, 'fat': 3},
    'miel': {'cal': 304, 'prot': 0.3, 'carbs': 82, 'fat': 0},
}

CATEGORY_MAP = {
    'DESAYUNO': 'breakfast',
    'COMIDA': 'lunch',
    'CENA': 'dinner',
    'SNACK': 'snack',
    'PRE ENTRENAMIENTO': 'snack',
    'POST ENTRENAMIENTO': 'snack',
    'POSTRE': 'snack',
    'RÁPIDA': 'snack',
}

def extract_grams(text):
    """Extrae gramos de un texto como '180 g de pollo'"""
    match = re.search(r'(\d+)\s*g\b', text.lower())
    if match:
        return int(match.group(1))
    # Buscar otras unidades
    match = re.search(r'(\d+)\s*ml\b', text.lower())
    if match:
        return int(match.group(1))
    # Unidades como "2 huevos" = ~100g
    match = re.search(r'(\d+)\s*(huevos?|claras?)', text.lower())
    if match:
        return int(match.group(1)) * 50
    return 0

def find_ingredient(text):
    """Busca el ingrediente en la base de datos nutricional"""
    text_lower = text.lower()
    
    for ingredient, macros in NUTRITION_DB.items():
        if ingredient in text_lower:
            return ingredient, macros
    
    return None, None

def calculate_macros(ingredients_text):
    """Calcula macros totales de una lista de ingredientes"""
    total = {'cal': 0, 'prot': 0, 'carbs': 0, 'fat': 0}
    
    for line in ingredients_text:
        grams = extract_grams(line)
        ingredient, macros = find_ingredient(line)
        
        if ingredient and macros and grams > 0:
            factor = grams / 100
            total['cal'] += macros['cal'] * factor
            total['prot'] += macros['prot'] * factor
            total['carbs'] += macros['carbs'] * factor
            total['fat'] += macros['fat'] * factor
    
    return total

def parse_recipes(filepath):
    """Parsea recetas del archivo de texto"""
    recipes = []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Buscar todas las líneas que parecen títulos de receta
    lines = content.split('\n')
    recipe_starts = []
    
    for i, line in enumerate(lines):
        # Detectar línea de título de receta
        if re.search(r'(BOWL|FAJITA|TOSTADA|TABLA|POTAJE|CREMA)\s*\d+\s*[–-]', line, re.IGNORECASE):
            recipe_starts.append(i)
    
    # Extraer cada receta
    matches = []
    for idx, start in enumerate(recipe_starts):
        end = recipe_starts[idx + 1] if idx + 1 < len(recipe_starts) else len(lines)
        recipe_text = '\n'.join(lines[start:end])
        
        # Parsear título
        title_match = re.search(r'(BOWL|FAJITA|TOSTADA|TABLA|POTAJE|CREMA)\s*(\d+)\s*[–-]\s*(.+?)(?:\n|$)', recipe_text, re.IGNORECASE)
        if title_match:
            format_type = title_match.group(1).upper()
            number = title_match.group(2)
            name = title_match.group(3).strip()
            matches.append((format_type, number, name, recipe_text))
    
    for match in matches:
        format_type, number, name_line, rest = match
        
        # Buscar categoría (COMIDA, CENA, etc.)
        category = 'lunch'  # Default
        category_match = re.search(r'\(([^)]+)\)', rest)
        if category_match:
            cats = category_match.group(1).upper()
            for cat_key, cat_val in CATEGORY_MAP.items():
                if cat_key in cats:
                    category = cat_val
                    break
        
        # Buscar dificultad y tiempo
        difficulty = 'medium'
        prep_time = 20
        
        diff_match = re.search(r'Dificultad:\s*(\w+)', rest, re.IGNORECASE)
        if diff_match:
            diff_text = diff_match.group(1).lower()
            if 'fácil' in diff_text or 'facil' in diff_text:
                difficulty = 'easy'
            elif 'difícil' in diff_text or 'dificil' in diff_text:
                difficulty = 'hard'
        
        time_match = re.search(r'Tiempo:\s*(\d+)', rest, re.IGNORECASE)
        if time_match:
            prep_time = int(time_match.group(1))
        
        # Extraer ingredientes
        ingredients = []
        in_ingredients = False
        for line in rest.split('\n'):
            line = line.strip()
            if 'INGREDIENTES' in line.upper():
                in_ingredients = True
                continue
            if 'PREPARACIÓN' in line.upper() or 'PASO A PASO' in line.upper():
                in_ingredients = False
                continue
            if in_ingredients and line.startswith('●'):
                ingredients.append(line.replace('●', '').strip())
        
        # Extraer instrucciones
        instructions = []
        in_instructions = False
        for line in rest.split('\n'):
            line = line.strip()
            if 'PREPARACIÓN' in line.upper() or 'PASO A PASO' in line.upper():
                in_instructions = True
                continue
            if in_instructions and re.match(r'^\d+\.', line):
                instructions.append(re.sub(r'^\d+\.\s*', '', line).strip())
        
        # Calcular macros
        macros = calculate_macros(ingredients)
        
        # Construir nombre completo
        full_name = f"{format_type} {number} - {name_line}".strip()
        full_name = re.sub(r'\s+', ' ', full_name)
        # Limpiar caracteres especiales
        full_name = re.sub(r'[^\w\s\-áéíóúñÁÉÍÓÚÑ]', '', full_name).strip()
        
        if full_name and len(full_name) > 5:
            recipes.append({
                'name': full_name[:200],
                'category': category,
                'difficulty': difficulty,
                'prep_time': prep_time,
                'cook_time': 0,
                'servings': 1,
                'calories': int(macros['cal']),
                'protein': round(macros['prot'], 1),
                'carbs': round(macros['carbs'], 1),
                'fat': round(macros['fat'], 1),
                'ingredients': ingredients,
                'instructions': '\n'.join(instructions),
            })
    
    return recipes

def main():
    print("=" * 60)
    print("🍽️ IMPORTADOR DE RECETAS")
    print("=" * 60)
    print()
    
    print("📖 Parseando recetas...")
    recipes = parse_recipes('/srv/mykaizenfit/pro/imports/recetas_layout.txt')
    print(f"   Encontradas: {len(recipes)} recetas")
    print()
    
    # Estadísticas
    categories = {}
    for r in recipes:
        cat = r['category']
        categories[cat] = categories.get(cat, 0) + 1
    
    print("📊 Por categoría:")
    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        print(f"   {cat}: {count}")
    print()
    
    # Con macros calculados
    with_macros = sum(1 for r in recipes if r['calories'] > 0)
    print(f"🔢 Con macros calculados: {with_macros}/{len(recipes)}")
    print()
    
    # Ejemplos
    print("📋 Ejemplos de recetas:")
    for r in recipes[:5]:
        print(f"   {r['name']}")
        print(f"      Cal: {r['calories']} | P: {r['protein']}g | C: {r['carbs']}g | F: {r['fat']}g")
        print()
    
    # Importar a BD
    print("💾 Importando a la base de datos...")
    
    deleted = Recipe.objects.all().delete()[0]
    print(f"   🗑️ Eliminadas {deleted} recetas existentes")
    
    created = 0
    for r in recipes:
        Recipe.objects.create(
            id=uuid.uuid4(),
            name=r['name'],
            description=f"Receta {r['category']}",
            category=r['category'],
            difficulty=r['difficulty'],
            prep_time_minutes=r['prep_time'],
            cook_time_minutes=r['cook_time'],
            servings=r['servings'],
            calories=r['calories'] if r['calories'] > 0 else 300,
            protein=r['protein'] if r['protein'] > 0 else 20,
            carbs=r['carbs'] if r['carbs'] > 0 else 30,
            fat=r['fat'] if r['fat'] > 0 else 10,
            fiber=0,
            sugar=0,
            sodium=0,
            ingredients=r['ingredients'],
            instructions=r['instructions'] if r['instructions'] else 'Seguir preparación indicada.',
            diet_types=[],
            meal_types=[r['category']],
            allergens=[],
            tags=[],
            image_url='',
            video_url='',
            is_system=True,
            is_active=True,
            is_featured=False,
        )
        created += 1
    
    print(f"   ✅ Creadas {created} recetas")
    print()
    print("=" * 60)
    print("✅ IMPORTACIÓN COMPLETADA")
    print("=" * 60)

if __name__ == '__main__':
    main()

