#!/usr/bin/env python
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from nutrition.models import Recipe

def create_sample_recipes():
    """Crear recetas de ejemplo para pruebas"""
    
    recipes_data = [
        # DESAYUNOS
        {
            'name': 'Avena con Frutas',
            'category': 'Desayuno',
            'difficulty': 'easy',
            'prep_time_minutes': 10,
            'servings': 1,
            'calories_per_serving': 320,
            'ingredients': [
                '1/2 taza de avena',
                '1 taza de leche',
                '1 plátano en rodajas',
                '1 cucharada de miel',
                '1 cucharada de nueces picadas'
            ],
            'instructions': '1. Calentar la leche en una olla. 2. Agregar la avena y cocinar por 5 minutos. 3. Servir en un bol con plátano, miel y nueces.',
            'tags': ['saludable', 'rápido', 'energético']
        },
        {
            'name': 'Tostadas con Aguacate',
            'category': 'Desayuno',
            'difficulty': 'easy',
            'prep_time_minutes': 5,
            'servings': 2,
            'calories_per_serving': 280,
            'ingredients': [
                '2 rebanadas de pan integral',
                '1 aguacate maduro',
                '1 tomate en rodajas',
                'Sal y pimienta al gusto',
                '1 cucharadita de aceite de oliva'
            ],
            'instructions': '1. Tostar el pan. 2. Machacar el aguacate con sal y pimienta. 3. Untar sobre el pan y agregar tomate. 4. Rociar con aceite de oliva.',
            'tags': ['vegetariano', 'grasas saludables', 'fibra']
        },
        {
            'name': 'Smoothie de Proteína',
            'category': 'Desayuno',
            'difficulty': 'easy',
            'prep_time_minutes': 5,
            'servings': 1,
            'calories_per_serving': 250,
            'ingredients': [
                '1 scoop de proteína en polvo',
                '1 taza de leche',
                '1/2 plátano',
                '1 cucharada de mantequilla de maní',
                '1 cucharadita de miel'
            ],
            'instructions': '1. Agregar todos los ingredientes a la licuadora. 2. Licuar hasta obtener una mezcla suave. 3. Servir inmediatamente.',
            'tags': ['proteína', 'post-entreno', 'energético']
        },

        # ALMUERZOS
        {
            'name': 'Ensalada César',
            'category': 'Almuerzo',
            'difficulty': 'medium',
            'prep_time_minutes': 15,
            'servings': 2,
            'calories_per_serving': 350,
            'ingredients': [
                '1 lechuga romana',
                '2 pechugas de pollo',
                '1/4 taza de queso parmesano',
                '1/4 taza de crutones',
                '3 cucharadas de aderezo césar'
            ],
            'instructions': '1. Cocinar el pollo y cortar en tiras. 2. Lavar y cortar la lechuga. 3. Mezclar con aderezo, queso y crutones. 4. Agregar el pollo encima.',
            'tags': ['proteína', 'clásico', 'completo']
        },
        {
            'name': 'Quinoa con Vegetales',
            'category': 'Almuerzo',
            'difficulty': 'easy',
            'prep_time_minutes': 20,
            'servings': 2,
            'calories_per_serving': 320,
            'ingredients': [
                '1 taza de quinoa',
                '2 tazas de caldo de vegetales',
                '1 pimiento rojo',
                '1 calabacín',
                '1/2 cebolla',
                '2 cucharadas de aceite de oliva'
            ],
            'instructions': '1. Cocinar la quinoa en caldo. 2. Saltear vegetales en aceite. 3. Mezclar quinoa con vegetales. 4. Sazonar al gusto.',
            'tags': ['vegetariano', 'completo', 'saludable']
        },
        {
            'name': 'Salmón a la Plancha',
            'category': 'Almuerzo',
            'difficulty': 'medium',
            'prep_time_minutes': 25,
            'servings': 2,
            'calories_per_serving': 400,
            'ingredients': [
                '2 filetes de salmón',
                '1 taza de arroz integral',
                '1 taza de brócoli',
                '2 cucharadas de aceite de oliva',
                'Limón y especias al gusto'
            ],
            'instructions': '1. Cocinar el arroz. 2. Cocinar el brócoli al vapor. 3. Cocinar el salmón a la plancha con especias. 4. Servir con limón.',
            'tags': ['omega-3', 'proteína', 'saludable']
        },

        # CENAS
        {
            'name': 'Pasta Integral con Pollo',
            'category': 'Cena',
            'difficulty': 'medium',
            'prep_time_minutes': 30,
            'servings': 2,
            'calories_per_serving': 450,
            'ingredients': [
                '200g de pasta integral',
                '2 pechugas de pollo',
                '1 lata de tomates',
                '1 cebolla',
                '2 dientes de ajo',
                'Albahaca fresca'
            ],
            'instructions': '1. Cocinar la pasta. 2. Cocinar el pollo y desmenuzar. 3. Hacer salsa de tomate con cebolla y ajo. 4. Mezclar todo y agregar albahaca.',
            'tags': ['carbohidratos', 'proteína', 'clásico']
        },
        {
            'name': 'Ensalada de Atún',
            'category': 'Cena',
            'difficulty': 'easy',
            'prep_time_minutes': 10,
            'servings': 2,
            'calories_per_serving': 300,
            'ingredients': [
                '1 lata de atún en agua',
                '2 huevos duros',
                '1 tomate',
                '1 pepino',
                'Lechuga',
                '2 cucharadas de aceite de oliva'
            ],
            'instructions': '1. Cortar todos los vegetales. 2. Mezclar con atún desmenuzado. 3. Agregar huevos cortados. 4. Aderezar con aceite y sal.',
            'tags': ['proteína', 'rápido', 'bajo en calorías']
        },
        {
            'name': 'Sopa de Verduras',
            'category': 'Cena',
            'difficulty': 'easy',
            'prep_time_minutes': 35,
            'servings': 4,
            'calories_per_serving': 180,
            'ingredients': [
                '2 zanahorias',
                '2 tallos de apio',
                '1 cebolla',
                '2 papas',
                '1 litro de caldo de vegetales',
                'Especias al gusto'
            ],
            'instructions': '1. Cortar todos los vegetales. 2. Cocinar en caldo hasta que estén tiernos. 3. Sazonar al gusto. 4. Servir caliente.',
            'tags': ['vegetariano', 'bajo en calorías', 'confortante']
        },

        # SNACKS
        {
            'name': 'Yogur con Frutos Secos',
            'category': 'Snack',
            'difficulty': 'easy',
            'prep_time_minutes': 2,
            'servings': 1,
            'calories_per_serving': 200,
            'ingredients': [
                '1 taza de yogur griego',
                '1 cucharada de almendras',
                '1 cucharada de arándanos',
                '1 cucharadita de miel'
            ],
            'instructions': '1. Mezclar el yogur con miel. 2. Agregar frutos secos y arándanos. 3. Servir inmediatamente.',
            'tags': ['proteína', 'antioxidantes', 'rápido']
        },
        {
            'name': 'Hummus con Vegetales',
            'category': 'Snack',
            'difficulty': 'medium',
            'prep_time_minutes': 15,
            'servings': 4,
            'calories_per_serving': 150,
            'ingredients': [
                '1 lata de garbanzos',
                '2 cucharadas de tahini',
                '2 dientes de ajo',
                '2 cucharadas de aceite de oliva',
                'Vegetales para dipear'
            ],
            'instructions': '1. Procesar garbanzos con tahini y ajo. 2. Agregar aceite gradualmente. 3. Sazonar al gusto. 4. Servir con vegetales.',
            'tags': ['vegetariano', 'fibra', 'grasas saludables']
        },
        {
            'name': 'Batido Verde',
            'category': 'Snack',
            'difficulty': 'easy',
            'prep_time_minutes': 5,
            'servings': 1,
            'calories_per_serving': 120,
            'ingredients': [
                '1 taza de espinacas',
                '1/2 plátano',
                '1 taza de leche de almendras',
                '1 cucharadita de miel',
                '1 cucharadita de jengibre'
            ],
            'instructions': '1. Agregar todos los ingredientes a la licuadora. 2. Licuar hasta obtener una mezcla suave. 3. Servir inmediatamente.',
            'tags': ['vegetales', 'energético', 'detox']
        },

        # POSTRES SALUDABLES
        {
            'name': 'Mousse de Chocolate con Aguacate',
            'category': 'Postre',
            'difficulty': 'easy',
            'prep_time_minutes': 10,
            'servings': 2,
            'calories_per_serving': 250,
            'ingredients': [
                '1 aguacate maduro',
                '2 cucharadas de cacao en polvo',
                '2 cucharadas de miel',
                '1 cucharadita de vainilla',
                '1 pizca de sal'
            ],
            'instructions': '1. Procesar el aguacate hasta que esté suave. 2. Agregar cacao, miel y vainilla. 3. Refrigerar por 30 minutos. 4. Servir frío.',
            'tags': ['saludable', 'grasas buenas', 'antioxidantes']
        },
        {
            'name': 'Ensalada de Frutas',
            'category': 'Postre',
            'difficulty': 'easy',
            'prep_time_minutes': 10,
            'servings': 2,
            'calories_per_serving': 150,
            'ingredients': [
                '1 manzana',
                '1 pera',
                '1 taza de fresas',
                '1 plátano',
                '1 cucharada de miel'
            ],
            'instructions': '1. Cortar todas las frutas en trozos. 2. Mezclar en un bol. 3. Rociar con miel. 4. Servir frío.',
            'tags': ['vitaminas', 'natural', 'refrescante']
        }
    ]

    print("🍳 Creando recetas de ejemplo...")
    
    created_count = 0
    for recipe_data in recipes_data:
        # Verificar si la receta ya existe
        if not Recipe.objects.filter(name=recipe_data['name']).exists():
            Recipe.objects.create(**recipe_data)
            created_count += 1
            print(f"✅ Creada: {recipe_data['name']}")
        else:
            print(f"⏭️  Ya existe: {recipe_data['name']}")
    
    print(f"\n🎉 ¡Proceso completado! Se crearon {created_count} nuevas recetas.")
    print(f"📊 Total de recetas en la base de datos: {Recipe.objects.count()}")

if __name__ == '__main__':
    create_sample_recipes()





















