#!/usr/bin/env python
"""
Script para cargar recetas completas desde los datos del PDF RECETAS GENERALES-2
"""
import os
import sys
import django

# Configurar Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from nutrition.models import Recipe
from accounts.models import CustomUser

# Recetas extraídas del PDF con toda su información
RECIPES_DATA = [
    {
        'name': 'BOWL 1 - Bowl Mediterráneo de Pollo y Patata',
        'category': 'lunch',
        'meal_types': ['lunch', 'dinner'],
        'difficulty': 'easy',
        'prep_time_minutes': 10,
        'cook_time_minutes': 5,
        'servings': 1,
        'calories': 550,
        'protein': 35,
        'carbs': 50,
        'fat': 18,
        'fiber': 6,
        'sugar': 5,
        'sodium': 450,
        'ingredients': [
            {'name': 'Pechuga de pollo', 'quantity': '180', 'unit': 'g'},
            {'name': 'Patata cocida', 'quantity': '200', 'unit': 'g'},
            {'name': 'Pimiento rojo', 'quantity': '60', 'unit': 'g'},
            {'name': 'Pepino', 'quantity': '50', 'unit': 'g'},
            {'name': 'Aceitunas', 'quantity': '30', 'unit': 'g'},
            {'name': 'Cebolla morada', 'quantity': '20', 'unit': 'g'},
            {'name': 'AOVE', 'quantity': '15', 'unit': 'g'},
            {'name': 'Sal marina, orégano, pimienta', 'quantity': '1', 'unit': 'pizca'},
            {'name': 'Zumo de 1/2 limón', 'quantity': '15', 'unit': 'ml'},
        ],
        'instructions': "1. Corta la patata cocida en cubos y saltéala 2 minutos con una pizca de sal y orégano.\n2. Cocina el pollo en una sartén con 10 g de AOVE, sal y pimienta (4-5 min).\n3. Corta el pimiento, pepino y cebolla en dados pequeños.\n4. Monta el bowl: patata de base → pollo → verduras → aceitunas.\n5. Aliña con el resto del AOVE y zumo de limón.",
        'tags': ['mediterraneo', 'proteico', 'completo'],
        'diet_types': ['normal', 'high_protein'],
    },
    {
        'name': 'BOWL 2 - Bowl Proteico de Salmón y Boniato',
        'category': 'dinner',
        'meal_types': ['dinner', 'post_workout'],
        'difficulty': 'easy',
        'prep_time_minutes': 10,
        'cook_time_minutes': 5,
        'servings': 1,
        'calories': 520,
        'protein': 32,
        'carbs': 45,
        'fat': 20,
        'fiber': 7,
        'sugar': 8,
        'sodium': 400,
        'ingredients': [
            {'name': 'Salmón fresco', 'quantity': '180', 'unit': 'g'},
            {'name': 'Boniato', 'quantity': '200', 'unit': 'g'},
            {'name': 'Espinaca', 'quantity': '60', 'unit': 'g'},
            {'name': 'Pimiento verde', 'quantity': '40', 'unit': 'g'},
            {'name': 'AOVE', 'quantity': '10', 'unit': 'g'},
            {'name': 'Cúrcuma, pimienta, ajo en polvo', 'quantity': '1', 'unit': 'pizca'},
            {'name': 'Sal marina', 'quantity': '1', 'unit': 'pizca'},
            {'name': 'Zumo de 1/4 limón', 'quantity': '10', 'unit': 'ml'},
        ],
        'instructions': "1. Corta el boniato en cubos y cocínalo al vapor o microondas hasta que esté tierno (5-7 min).\n2. En una sartén, cocina el salmón con sal y especias (3-4 min por lado).\n3. Saltea las espinacas y el pimiento 2-3 minutos.\n4. Monta el bowl: boniato de base → espinacas → pimiento → salmón encima.\n5. Termina con AOVE y limón.",
        'tags': ['proteico', 'omega3', 'post_workout'],
        'diet_types': ['normal', 'high_protein'],
    },
    {
        'name': 'BOWL 3 - Bowl Energy de Ternera y Arroz',
        'category': 'lunch',
        'meal_types': ['lunch'],
        'difficulty': 'medium',
        'prep_time_minutes': 15,
        'cook_time_minutes': 5,
        'servings': 1,
        'calories': 580,
        'protein': 38,
        'carbs': 55,
        'fat': 18,
        'fiber': 5,
        'sugar': 4,
        'sodium': 450,
        'ingredients': [
            {'name': 'Carne picada de ternera 90-95% magra', 'quantity': '150', 'unit': 'g'},
            {'name': 'Arroz cocido', 'quantity': '150', 'unit': 'g'},
            {'name': 'Calabacín', 'quantity': '70', 'unit': 'g'},
            {'name': 'Zanahoria', 'quantity': '50', 'unit': 'g'},
            {'name': 'Cebolla', 'quantity': '20', 'unit': 'g'},
            {'name': 'AOVE', 'quantity': '10', 'unit': 'g'},
            {'name': 'Zumo de 1/2 limón', 'quantity': '15', 'unit': 'ml'},
            {'name': 'Orégano o hierbas provenzales', 'quantity': '1', 'unit': 'pizca'},
            {'name': 'Sal y pimienta', 'quantity': '1', 'unit': 'pizca'},
        ],
        'instructions': "1. Cocina la ternera en sartén con sal, pimienta y orégano.\n2. En la misma sartén, añade el calabacín, cebolla y zanahoria en cubos y saltea 3-4 min.\n3. Añade el arroz cocido y mezcla todo a fuego medio 1 minuto.\n4. Monta el bowl: mezcla caliente → chorrito de limón → AOVE al final.",
        'tags': ['energy', 'proteico', 'completo'],
        'diet_types': ['normal', 'high_protein'],
    },
    {
        'name': 'BOWL 4 - Ensalada Mediterránea con Sardinas',
        'category': 'lunch',
        'meal_types': ['lunch', 'dinner'],
        'difficulty': 'easy',
        'prep_time_minutes': 10,
        'cook_time_minutes': 0,
        'servings': 1,
        'calories': 480,
        'protein': 28,
        'carbs': 22,
        'fat': 30,
        'fiber': 8,
        'sugar': 6,
        'sodium': 500,
        'ingredients': [
            {'name': 'Sardinas en aceite de oliva (escurridas)', 'quantity': '120', 'unit': 'g'},
            {'name': 'Aguacate', 'quantity': '100', 'unit': 'g'},
            {'name': 'Tomate cherry o rama', 'quantity': '150', 'unit': 'g'},
            {'name': 'Lechuga o mezcla verde', 'quantity': '80', 'unit': 'g'},
            {'name': 'Pepino', 'quantity': '60', 'unit': 'g'},
            {'name': 'AOVE', 'quantity': '15', 'unit': 'g'},
            {'name': 'Zumo de 1/2 limón', 'quantity': '15', 'unit': 'ml'},
            {'name': 'Yogur griego (opcional para salsa)', 'quantity': '50', 'unit': 'g'},
            {'name': 'Sal marina y pimienta negra', 'quantity': '1', 'unit': 'pizca'},
        ],
        'instructions': "1. Lava y corta la lechuga, tomates y pepino.\n2. Corta el aguacate en cubos grandes.\n3. Escurre las sardinas y colócalas encima de las verduras.\n4. Mezcla AOVE + limón + salsa + sal + pimienta y vierte por encima.\n5. Remueve ligeramente para no deshacer el pescado y sirve.",
        'tags': ['mediterraneo', 'omega3', 'rapida'],
        'diet_types': ['mediterranean', 'high_protein'],
    },
    {
        'name': 'BOWL 5 - Ensalada Fresca de Atún y Aguacate',
        'category': 'lunch',
        'meal_types': ['lunch', 'dinner'],
        'difficulty': 'easy',
        'prep_time_minutes': 5,
        'cook_time_minutes': 0,
        'servings': 1,
        'calories': 460,
        'protein': 32,
        'carbs': 25,
        'fat': 26,
        'fiber': 7,
        'sugar': 5,
        'sodium': 450,
        'ingredients': [
            {'name': 'Atún en agua o AOVE (escurrido)', 'quantity': '160', 'unit': 'g'},
            {'name': 'Aguacate', 'quantity': '100', 'unit': 'g'},
            {'name': 'Tomate', 'quantity': '150', 'unit': 'g'},
            {'name': 'Cebolla morada', 'quantity': '70', 'unit': 'g'},
            {'name': 'Aceitunas', 'quantity': '20', 'unit': 'g'},
            {'name': 'AOVE', 'quantity': '15', 'unit': 'g'},
            {'name': 'Zumo de 1/4 limón', 'quantity': '10', 'unit': 'ml'},
            {'name': 'Sal y pimienta negra', 'quantity': '1', 'unit': 'pizca'},
        ],
        'instructions': "1. Mezcla en un bol el tomate cortado, la cebolla y las aceitunas.\n2. Añade el atún escurrido.\n3. Incorpora el aguacate en cubos grandes.\n4. Aliña con AOVE + salsa + sal + pimienta.\n5. Mezcla suavemente y disfruta.",
        'tags': ['rapida', 'proteico', 'omega3'],
        'diet_types': ['normal', 'high_protein'],
    },
    {
        'name': 'BOWL 6 - Ensalada Mediterránea de Caballa y Aguacate',
        'category': 'lunch',
        'meal_types': ['lunch', 'dinner'],
        'difficulty': 'easy',
        'prep_time_minutes': 10,
        'cook_time_minutes': 0,
        'servings': 1,
        'calories': 510,
        'protein': 26,
        'carbs': 28,
        'fat': 32,
        'fiber': 9,
        'sugar': 7,
        'sodium': 500,
        'ingredients': [
            {'name': 'Caballa en AOVE', 'quantity': '140', 'unit': 'g'},
            {'name': 'Aguacate', 'quantity': '100', 'unit': 'g'},
            {'name': 'Tomate cherry', 'quantity': '120', 'unit': 'g'},
            {'name': 'Mezcla verde o lechuga', 'quantity': '80', 'unit': 'g'},
            {'name': 'Pepino', 'quantity': '60', 'unit': 'g'},
            {'name': 'Cebolla morada', 'quantity': '30', 'unit': 'g'},
            {'name': 'AOVE extra', 'quantity': '10', 'unit': 'g'},
            {'name': 'Zumo de 1/2 limón', 'quantity': '15', 'unit': 'ml'},
            {'name': 'Sal y pimienta', 'quantity': '1', 'unit': 'pizca'},
        ],
        'instructions': "1. Lava y corta la lechuga, tomates y pepino.\n2. Corta el aguacate en cubos grandes.\n3. Escurre la caballa y colócala encima de las verduras.\n4. Mezcla AOVE + limón + sal + pimienta y vierte por encima.\n5. Remueve ligeramente para no deshacer el pescado y sirve.",
        'tags': ['mediterraneo', 'omega3', 'rapida'],
        'diet_types': ['mediterranean', 'high_protein'],
    },
]

# Recetas de CREMAS del PDF
CREMAS_DATA = [
    {
        'name': 'CREMA 1 - Crema de Calabaza y Zanahoria Suave',
        'category': 'dinner',
        'meal_types': ['dinner'],
        'difficulty': 'easy',
        'prep_time_minutes': 10,
        'cook_time_minutes': 10,
        'servings': 1,
        'calories': 180,
        'protein': 4,
        'carbs': 25,
        'fat': 8,
        'fiber': 6,
        'sugar': 8,
        'sodium': 350,
        'ingredients': [
            {'name': 'Calabaza', 'quantity': '300', 'unit': 'g'},
            {'name': 'Zanahoria', 'quantity': '100', 'unit': 'g'},
            {'name': 'Cebolla', 'quantity': '50', 'unit': 'g'},
            {'name': 'Ajo', 'quantity': '1', 'unit': 'diente'},
            {'name': 'AOVE', 'quantity': '10', 'unit': 'g'},
            {'name': 'Sal y pimienta', 'quantity': '1', 'unit': 'pizca'},
        ],
        'instructions': "1. Cocina calabaza, zanahoria, cebolla y ajo hasta que estén tiernos.\n2. Tritura con AOVE hasta obtener textura cremosa.\n3. Ajusta sal y pimienta al gusto.",
        'tags': ['crema', 'vegetariano', 'suave'],
        'diet_types': ['vegetarian', 'vegan'],
    },
    {
        'name': 'CREMA 2 - Crema de Calabacín con Queso',
        'category': 'dinner',
        'meal_types': ['dinner'],
        'difficulty': 'easy',
        'prep_time_minutes': 10,
        'cook_time_minutes': 5,
        'servings': 1,
        'calories': 220,
        'protein': 12,
        'carbs': 18,
        'fat': 11,
        'fiber': 4,
        'sugar': 6,
        'sodium': 380,
        'ingredients': [
            {'name': 'Calabacines', 'quantity': '200', 'unit': 'g'},
            {'name': 'Cebolla', 'quantity': '50', 'unit': 'g'},
            {'name': 'Queso fresco o de cabra', 'quantity': '60', 'unit': 'g'},
            {'name': 'AOVE', 'quantity': '5', 'unit': 'g'},
            {'name': 'Sal y pimienta', 'quantity': '1', 'unit': 'pizca'},
        ],
        'instructions': "1. Cocina calabacín y cebolla hasta que estén tiernos.\n2. Tritura con queso fresco/cabra y AOVE hasta obtener crema suave.\n3. Añade pimienta al gusto.",
        'tags': ['crema', 'vegetariano', 'cremosa'],
        'diet_types': ['vegetarian'],
    },
    {
        'name': 'CREMA 3 - Puré de Patata y Zanahoria con Huevo Picado',
        'category': 'lunch',
        'meal_types': ['lunch'],
        'difficulty': 'easy',
        'prep_time_minutes': 10,
        'cook_time_minutes': 10,
        'servings': 1,
        'calories': 350,
        'protein': 15,
        'carbs': 48,
        'fat': 12,
        'fiber': 6,
        'sugar': 7,
        'sodium': 400,
        'ingredients': [
            {'name': 'Patata', 'quantity': '200', 'unit': 'g'},
            {'name': 'Zanahoria', 'quantity': '150', 'unit': 'g'},
            {'name': 'Huevo duro', 'quantity': '1', 'unit': 'unidad'},
            {'name': 'AOVE', 'quantity': '10', 'unit': 'g'},
            {'name': 'Sal', 'quantity': '1', 'unit': 'pizca'},
        ],
        'instructions': "1. Cocina patata y zanahoria hasta que estén muy blandas.\n2. Tritura con AOVE hasta que quede puré suave.\n3. Añade huevo picado encima al servir.",
        'tags': ['pure', 'proteico', 'comfort'],
        'diet_types': ['vegetarian'],
    },
    {
        'name': 'PURÉ DE PATATA CREMOSO',
        'category': 'dinner',
        'meal_types': ['dinner', 'lunch'],
        'difficulty': 'easy',
        'prep_time_minutes': 10,
        'cook_time_minutes': 10,
        'servings': 1,
        'calories': 380,
        'protein': 10,
        'carbs': 52,
        'fat': 14,
        'fiber': 5,
        'sugar': 4,
        'sodium': 400,
        'ingredients': [
            {'name': 'Patata', 'quantity': '300', 'unit': 'g'},
            {'name': 'Queso fresco batido', 'quantity': '40', 'unit': 'g'},
            {'name': 'AOVE', 'quantity': '5', 'unit': 'g'},
            {'name': 'Agua caliente o caldo', 'quantity': '50', 'unit': 'ml'},
            {'name': 'Sal', 'quantity': '1', 'unit': 'pizca'},
            {'name': 'Pimienta blanca', 'quantity': '1', 'unit': 'pizca'},
        ],
        'instructions': "1. Cocina las patatas en agua con sal hasta que estén muy blandas.\n2. Escúrrelas bien y tritúralas con un tenedor o batidora.\n3. Añade el queso fresco batido y mezcla hasta integrar totalmente.\n4. Agrega AOVE y mezcla de nuevo.\n5. Ajusta la textura con agua caliente o caldo (más líquido = más cremoso).\n6. Termina con sal y pimienta blanca al gusto.",
        'tags': ['pure', 'comfort', 'cremoso'],
        'diet_types': ['vegetarian'],
    },
]

def update_or_create_recipe(recipe_data):
    """Actualizar o crear una receta con los datos del PDF"""
    
    name = recipe_data['name']
    
    # Buscar si la receta ya existe
    recipe, created = Recipe.objects.update_or_create(
        name=name,
        defaults={
            'description': f"Receta {recipe_data['category']} deliciosa y nutritiva",
            'category': recipe_data['category'],
            'difficulty': recipe_data['difficulty'],
            'prep_time_minutes': recipe_data['prep_time_minutes'],
            'cook_time_minutes': recipe_data['cook_time_minutes'],
            'servings': recipe_data['servings'],
            'calories': recipe_data['calories'],
            'protein': recipe_data['protein'],
            'carbs': recipe_data['carbs'],
            'fat': recipe_data['fat'],
            'fiber': recipe_data['fiber'],
            'sugar': recipe_data['sugar'],
            'sodium': recipe_data['sodium'],
            'ingredients': recipe_data['ingredients'],
            'instructions': recipe_data['instructions'],
            'diet_types': recipe_data['diet_types'],
            'meal_types': recipe_data['meal_types'],
            'allergens': [],
            'tags': recipe_data['tags'],
            'image_url': '',
            'video_url': '',
            'is_system': True,
            'is_active': True,
        }
    )
    
    action = "✅ Creada" if created else "🔄 Actualizada"
    print(f"{action}: {name}")
    print(f"   {len(recipe_data['ingredients'])} ingredientes | {recipe_data['calories']} kcal")
    
    return recipe

def main():
    print("=" * 70)
    print("📚 CARGANDO RECETAS DEL PDF")
    print("=" * 70 + "\n")
    
    all_recipes = RECIPES_DATA + CREMAS_DATA
    
    print(f"📋 Total recetas en el PDF: {len(all_recipes)}\n")
    
    created_count = 0
    updated_count = 0
    
    for recipe_data in all_recipes:
        recipe = update_or_create_recipe(recipe_data)
        if recipe:
            # Verificar si fue creada o actualizada
            if Recipe.objects.filter(name=recipe_data['name']).count() == 1:
                updated_count += 1
    
    print(f"\n{'='*70}")
    print(f"✅ Proceso completado")
    print(f"   Total recetas procesadas: {len(all_recipes)}")
    print(f"{'='*70}\n")
    
    # Resumen
    total = Recipe.objects.count()
    complete = Recipe.objects.exclude(ingredients=[]).count()
    
    print(f"📊 Estado de la base de datos:")
    print(f"   Total recetas: {total}")
    print(f"   Completas: {complete}")
    print(f"   Incompletas: {total - complete}\n")

if __name__ == '__main__':
    main()


