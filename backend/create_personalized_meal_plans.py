#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script para crear planes de nutrición personalizados con comidas específicas
basadas en las recetas existentes en la base de datos.
"""
import os
import sys
import django
import io

# Configurar encoding para Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from nutrition.models import DefaultNutritionPlan, DefaultMeal, Recipe
from datetime import time

def create_personalized_meal_plans():
    """Crear planes de nutrición con comidas específicas según las recetas disponibles"""
    
    # Obtener todas las recetas disponibles
    recipes = Recipe.objects.all()
    print(f"\nRecetas disponibles: {recipes.count()}")
    
    if recipes.count() == 0:
        print("ERROR: No hay recetas disponibles. Por favor, crea recetas primero.")
        return
    
    # Agrupar recetas por categoría
    recipes_by_category = {}
    for recipe in recipes:
        if recipe.category not in recipes_by_category:
            recipes_by_category[recipe.category] = []
        recipes_by_category[recipe.category].append(recipe)
    
    # Mostrar recetas por categoría
    for category, recs in recipes_by_category.items():
        print(f"  - {category}: {len(recs)} recetas")
    
    # Definir planes personalizados basados en objetivos del formulario
    plans_config = [
        {
            'plan': {
                'name': 'Plan Pérdida de Peso',
                'description': 'Plan nutricional diseñado para pérdida de peso con comidas balanceadas y control calórico.',
                'min_role_required': 'basic',
                'daily_calories': 1500,
                'protein_percentage': 30.0,
                'carbs_percentage': 40.0,
                'fat_percentage': 30.0,
                'duration_weeks': 8,
                'target_audience': 'Pérdida de peso',
                'tags': ['pérdida de peso', 'déficit calórico', 'bajo en calorías'],
                'is_active': True,
                'is_default': False
            },
            'meals': [
                {
                    'name': 'Desayuno Ligero',
                    'time': time(8, 0),
                    'calories': 300,
                    'protein': 20,
                    'carbs': 35,
                    'fat': 10,
                    'description': 'Desayuno energético y ligero para comenzar el día',
                    'order_index': 1
                },
                {
                    'name': 'Snack Mañana',
                    'time': time(11, 0),
                    'calories': 150,
                    'protein': 10,
                    'carbs': 15,
                    'fat': 5,
                    'description': 'Snack ligero para mantener la energía',
                    'order_index': 2,
                },
                {
                    'name': 'Almuerzo Balanceado',
                    'time': time(14, 0),
                    'calories': 450,
                    'protein': 30,
                    'carbs': 40,
                    'fat': 15,
                    'description': 'Comida principal del día con balance nutricional',
                    'order_index': 3
                },
                {
                    'name': 'Snack Tarde',
                    'time': time(17, 0),
                    'calories': 150,
                    'protein': 10,
                    'carbs': 15,
                    'fat': 5,
                    'description': 'Snack para control del apetito',
                    'order_index': 4
                },
                {
                    'name': 'Cena Ligera',
                    'time': time(20, 0),
                    'calories': 450,
                    'protein': 35,
                    'carbs': 35,
                    'fat': 20,
                    'description': 'Cena ligera y nutritiva',
                    'order_index': 5
                }
            ]
        },
        {
            'plan': {
                'name': 'Plan Ganancia Muscular',
                'description': 'Plan nutricional optimizado para ganancia de masa muscular con alto contenido proteico.',
                'min_role_required': 'pro',
                'daily_calories': 2800,
                'protein_percentage': 35.0,
                'carbs_percentage': 45.0,
                'fat_percentage': 20.0,
                'duration_weeks': 12,
                'target_audience': 'Ganancia muscular',
                'tags': ['ganancia muscular', 'alta proteína', 'volumen'],
                'is_active': True,
                'is_default': False
            },
            'meals': [
                {
                    'name': 'Desayuno Proteico',
                    'time': time(8, 0),
                    'calories': 550,
                    'protein': 40,
                    'carbs': 60,
                    'fat': 15,
                    'description': 'Desayuno rico en proteínas para desarrollar músculo',
                    'order_index': 1
                },
                {
                    'name': 'Snack Pre-Entreno',
                    'time': time(10, 30),
                    'calories': 250,
                    'protein': 15,
                    'carbs': 35,
                    'fat': 5,
                    'description': 'Snack energético antes del entrenamiento',
                    'order_index': 2
                },
                {
                    'name': 'Post-Entreno Recuperación',
                    'time': time(13, 0),
                    'calories': 600,
                    'protein': 50,
                    'carbs': 65,
                    'fat': 10,
                    'description': 'Comida de recuperación post-entrenamiento',
                    'order_index': 3
                },
                {
                    'name': 'Snack Tarde',
                    'time': time(16, 0),
                    'calories': 300,
                    'protein': 25,
                    'carbs': 30,
                    'fat': 10,
                    'description': 'Snack proteico para mantener la síntesis de proteínas',
                    'order_index': 4
                },
                {
                    'name': 'Cena Rica en Proteínas',
                    'time': time(20, 0),
                    'calories': 700,
                    'protein': 60,
                    'carbs': 55,
                    'fat': 25,
                    'description': 'Cena completa para reparación y crecimiento muscular',
                    'order_index': 5
                }
            ]
        },
        {
            'plan': {
                'name': 'Plan Mantenimiento',
                'description': 'Plan nutricional para mantenimiento del peso con comidas balanceadas y saludables.',
                'min_role_required': 'basic',
                'daily_calories': 2000,
                'protein_percentage': 25.0,
                'carbs_percentage': 50.0,
                'fat_percentage': 25.0,
                'duration_weeks': 6,
                'target_audience': 'Mantenimiento',
                'tags': ['mantenimiento', 'balanceado', 'saludable'],
                'is_active': True,
                'is_default': True
            },
            'meals': [
                {
                    'name': 'Desayuno Completo',
                    'time': time(8, 0),
                    'calories': 450,
                    'protein': 25,
                    'carbs': 55,
                    'fat': 15,
                    'description': 'Desayuno completo y nutritivo',
                    'order_index': 1,
                },
                {
                    'name': 'Snack Mañana',
                    'time': time(11, 0),
                    'calories': 200,
                    'protein': 10,
                    'carbs': 25,
                    'fat': 8,
                    'description': 'Snack saludable para mantener la energía',
                    'order_index': 2,
                },
                {
                    'name': 'Almuerzo Nutritivo',
                    'time': time(14, 0),
                    'calories': 600,
                    'protein': 30,
                    'carbs': 70,
                    'fat': 20,
                    'description': 'Comida principal balanceada',
                    'order_index': 3,
                },
                {
                    'name': 'Snack Tarde',
                    'time': time(17, 0),
                    'calories': 200,
                    'protein': 10,
                    'carbs': 25,
                    'fat': 8,
                    'description': 'Snack para mantener el metabolismo activo',
                    'order_index': 4,
                },
                {
                    'name': 'Cena Balanceada',
                    'time': time(20, 0),
                    'calories': 550,
                    'protein': 35,
                    'carbs': 50,
                    'fat': 20,
                    'description': 'Cena completa y balanceada',
                    'order_index': 5,
                }
            ]
        },
        {
            'plan': {
                'name': 'Plan Vegetariano',
                'description': 'Plan nutricional vegetariano con enfoque en proteínas vegetales y nutrientes esenciales.',
                'min_role_required': 'basic',
                'daily_calories': 1800,
                'protein_percentage': 20.0,
                'carbs_percentage': 55.0,
                'fat_percentage': 25.0,
                'duration_weeks': 8,
                'target_audience': 'Vegetarianos',
                'tags': ['vegetariano', 'plant-based', 'proteínas vegetales'],
                'is_active': True,
                'is_default': False
            },
            'meals': [
                {
                    'name': 'Desayuno Vegetariano',
                    'time': time(8, 0),
                    'calories': 400,
                    'protein': 15,
                    'carbs': 50,
                    'fat': 15,
                    'description': 'Desayuno nutritivo basado en plantas',
                    'order_index': 1,
                },
                {
                    'name': 'Snack Mañana',
                    'time': time(11, 0),
                    'calories': 180,
                    'protein': 8,
                    'carbs': 28,
                    'fat': 6,
                    'description': 'Snack vegetal saludable',
                    'order_index': 2,
                },
                {
                    'name': 'Almuerzo Vegetariano',
                    'time': time(14, 0),
                    'calories': 500,
                    'protein': 25,
                    'carbs': 65,
                    'fat': 18,
                    'description': 'Comida principal con proteínas vegetales completas',
                    'order_index': 3,
                },
                {
                    'name': 'Snack Tarde',
                    'time': time(17, 0),
                    'calories': 180,
                    'protein': 8,
                    'carbs': 28,
                    'fat': 6,
                    'description': 'Snack nutritivo de origen vegetal',
                    'order_index': 4,
                },
                {
                    'name': 'Cena Vegetariana',
                    'time': time(20, 0),
                    'calories': 540,
                    'protein': 28,
                    'carbs': 60,
                    'fat': 20,
                    'description': 'Cena completa vegetariana',
                    'order_index': 5,
                }
            ]
        },
        {
            'plan': {
                'name': 'Plan Deportivo',
                'description': 'Plan nutricional para deportistas con alta demanda energética y recuperación optimizada.',
                'min_role_required': 'premium',
                'daily_calories': 3200,
                'protein_percentage': 25.0,
                'carbs_percentage': 55.0,
                'fat_percentage': 20.0,
                'duration_weeks': 12,
                'target_audience': 'Deportistas',
                'tags': ['deportivo', 'alto rendimiento', 'recuperación'],
                'is_active': True,
                'is_default': False
            },
            'meals': [
                {
                    'name': 'Desayuno Energético',
                    'time': time(7, 30),
                    'calories': 650,
                    'protein': 35,
                    'carbs': 80,
                    'fat': 20,
                    'description': 'Desayuno cargado de energía para deportistas',
                    'order_index': 1,
                },
                {
                    'name': 'Snack Pre-Entreno',
                    'time': time(10, 0),
                    'calories': 300,
                    'protein': 15,
                    'carbs': 45,
                    'fat': 8,
                    'description': 'Combustible antes del entrenamiento',
                    'order_index': 2,
                },
                {
                    'name': 'Post-Entreno Recuperación',
                    'time': time(13, 30),
                    'calories': 750,
                    'protein': 55,
                    'carbs': 90,
                    'fat': 15,
                    'description': 'Recuperación completa post-entrenamiento',
                    'order_index': 3,
                },
                {
                    'name': 'Snack Tarde',
                    'time': time(16, 30),
                    'calories': 350,
                    'protein': 20,
                    'carbs': 45,
                    'fat': 10,
                    'description': 'Snack de mantenimiento energético',
                    'order_index': 4,
                },
                {
                    'name': 'Cena de Recuperación',
                    'time': time(20, 30),
                    'calories': 850,
                    'protein': 60,
                    'carbs': 80,
                    'fat': 30,
                    'description': 'Cena completa para recuperación nocturna',
                    'order_index': 5,
                }
            ]
        }
    ]
    
    print(f"\nCreando {len(plans_config)} planes de nutricion personalizados...\n")
    
    created_plans = 0
    created_meals = 0
    
    for plan_config in plans_config:
        plan_data = plan_config['plan']
        meals_data = plan_config['meals']
        
        # Crear o actualizar el plan
        plan, plan_created = DefaultNutritionPlan.objects.get_or_create(
            name=plan_data['name'],
            defaults=plan_data
        )
        
        if plan_created:
            print(f"[OK] Plan creado: {plan.name}")
            created_plans += 1
        else:
            # Actualizar datos del plan si ya existe
            for key, value in plan_data.items():
                setattr(plan, key, value)
            plan.save()
            print(f"[UPDATE] Plan actualizado: {plan.name}")
        
        # Crear comidas para este plan
        for meal_data in meals_data:
            meal, meal_created = DefaultMeal.objects.get_or_create(
                name=meal_data['name'],
                plan=plan,
                defaults=meal_data
            )
            
            if meal_created:
                print(f"   [OK] Comida creada: {meal.name}")
                created_meals += 1
            else:
                # Actualizar datos de la comida si ya existe
                for key, value in meal_data.items():
                    if key != 'plan':  # No actualizar el plan
                        setattr(meal, key, value)
                meal.save()
                print(f"   [UPDATE] Comida actualizada: {meal.name}")
    
    print(f"\n=== PROCESO COMPLETADO ===")
    print(f"RESUMEN:")
    print(f"   - Planes creados/actualizados: {len(plans_config)}")
    print(f"   - Total de planes en BD: {DefaultNutritionPlan.objects.count()}")
    print(f"   - Total de comidas en BD: {DefaultMeal.objects.count()}")
    print(f"\nLos planes estan listos para ser asignados a los usuarios.")

if __name__ == '__main__':
    create_personalized_meal_plans()

