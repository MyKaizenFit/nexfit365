#!/usr/bin/env python
"""
Script para crear planes de nutrición/menú coherentes
Ejecutar dentro del contenedor Docker:
    docker exec nexfit-pro-backend-1 python create_nutrition_plans.py
"""

import os
import sys
from datetime import time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
django.setup()

from nutrition.models import Recipe, NutritionPlan, PlanMeal


def get_recipes_by_category(category, limit=10):
    """Obtiene recetas de una categoría específica"""
    return list(Recipe.objects.filter(category=category, is_active=True)[:limit])


def create_nutrition_plans():
    """Crear múltiples planes de nutrición variados"""
    
    print("🥗 Creando planes de nutrición...")
    
    # Obtener recetas por categoría
    breakfast_recipes = get_recipes_by_category('breakfast', 8)
    lunch_recipes = get_recipes_by_category('lunch', 20)
    dinner_recipes = get_recipes_by_category('dinner', 20)
    snack_recipes = get_recipes_by_category('snack', 4)
    
    print(f"📦 Recetas encontradas:")
    print(f"   - Desayunos: {len(breakfast_recipes)}")
    print(f"   - Almuerzos: {len(lunch_recipes)}")
    print(f"   - Cenas: {len(dinner_recipes)}")
    print(f"   - Snacks: {len(snack_recipes)}")
    
    plans_created = []
    
    # =========================================================================
    # PLAN 1: Pérdida de Peso - 1500 kcal
    # =========================================================================
    plan1, created = NutritionPlan.objects.update_or_create(
        name="Plan Pérdida de Peso - Déficit Calórico",
        is_system=True,
        defaults={
            'description': 'Plan diseñado para pérdida de peso con un déficit calórico moderado. '
                          'Rico en proteínas para preservar masa muscular y alto en fibra para saciedad.',
            'daily_calories': 1500,
            'protein_grams': 120,  # 32% de calorías
            'carbs_grams': 130,    # 35% de calorías
            'fat_grams': 55,       # 33% de calorías
            'fiber_grams': 30,
            'goal': 'lose_weight',
            'diet_type': 'high_protein',
            'meals_per_day': 5,
            'duration_weeks': 8,
            'is_template': True,
            'is_active': True,
            'tags': ['pérdida de peso', 'déficit', 'alto en proteínas'],
        }
    )
    
    if created or plan1.meals.count() == 0:
        plan1.meals.all().delete()
        
        # Desayuno - 300 kcal
        meal1 = PlanMeal.objects.create(
            plan=plan1,
            name="Desayuno Ligero",
            meal_type='breakfast',
            time=time(7, 30),
            calories=300,
            protein=25,
            carbs=30,
            fat=10,
            description="Desayuno rico en proteínas para empezar el día con energía",
            order_index=1
        )
        meal1.suggested_recipes.set(breakfast_recipes[:3])
        
        # Snack Mañana - 150 kcal
        meal2 = PlanMeal.objects.create(
            plan=plan1,
            name="Snack de Media Mañana",
            meal_type='morning_snack',
            time=time(10, 30),
            calories=150,
            protein=10,
            carbs=15,
            fat=6,
            description="Un pequeño snack para mantener el metabolismo activo",
            order_index=2
        )
        if snack_recipes:
            meal2.suggested_recipes.set(snack_recipes[:2])
        
        # Almuerzo - 450 kcal
        meal3 = PlanMeal.objects.create(
            plan=plan1,
            name="Almuerzo Equilibrado",
            meal_type='lunch',
            time=time(13, 30),
            calories=450,
            protein=40,
            carbs=40,
            fat=15,
            description="Comida principal del día con balance de macros",
            order_index=3
        )
        meal3.suggested_recipes.set(lunch_recipes[:5])
        
        # Snack Tarde - 150 kcal
        meal4 = PlanMeal.objects.create(
            plan=plan1,
            name="Snack de Tarde",
            meal_type='afternoon_snack',
            time=time(17, 0),
            calories=150,
            protein=10,
            carbs=15,
            fat=6,
            description="Snack para evitar llegar con mucha hambre a la cena",
            order_index=4
        )
        if snack_recipes:
            meal4.suggested_recipes.set(snack_recipes[:2])
        
        # Cena - 450 kcal
        meal5 = PlanMeal.objects.create(
            plan=plan1,
            name="Cena Ligera",
            meal_type='dinner',
            time=time(20, 30),
            calories=450,
            protein=35,
            carbs=30,
            fat=18,
            description="Cena ligera pero nutritiva para un buen descanso",
            order_index=5
        )
        meal5.suggested_recipes.set(dinner_recipes[:5])
        
        print(f"  ✅ Creado: {plan1.name}")
    plans_created.append(plan1)
    
    # =========================================================================
    # PLAN 2: Ganancia Muscular - 2500 kcal
    # =========================================================================
    plan2, created = NutritionPlan.objects.update_or_create(
        name="Plan Ganancia Muscular - Superávit",
        is_system=True,
        defaults={
            'description': 'Plan diseñado para ganancia de masa muscular con superávit calórico. '
                          'Alto contenido proteico distribuido a lo largo del día.',
            'daily_calories': 2500,
            'protein_grams': 180,  # 29% de calorías
            'carbs_grams': 280,    # 45% de calorías
            'fat_grams': 75,       # 27% de calorías
            'fiber_grams': 35,
            'goal': 'gain_muscle',
            'diet_type': 'high_protein',
            'meals_per_day': 5,
            'duration_weeks': 12,
            'is_template': True,
            'is_active': True,
            'tags': ['ganancia muscular', 'volumen', 'alto en proteínas', 'superávit'],
        }
    )
    
    if created or plan2.meals.count() == 0:
        plan2.meals.all().delete()
        
        # Desayuno - 500 kcal
        meal1 = PlanMeal.objects.create(
            plan=plan2,
            name="Desayuno Energético",
            meal_type='breakfast',
            time=time(7, 0),
            calories=500,
            protein=35,
            carbs=55,
            fat=15,
            description="Desayuno completo para comenzar con energía",
            order_index=1
        )
        meal1.suggested_recipes.set(breakfast_recipes[:4])
        
        # Snack Mañana - 300 kcal
        meal2 = PlanMeal.objects.create(
            plan=plan2,
            name="Snack Pre-Entreno",
            meal_type='morning_snack',
            time=time(10, 30),
            calories=300,
            protein=20,
            carbs=35,
            fat=10,
            description="Snack energético antes del entrenamiento",
            order_index=2
        )
        if snack_recipes:
            meal2.suggested_recipes.set(snack_recipes)
        
        # Almuerzo - 650 kcal
        meal3 = PlanMeal.objects.create(
            plan=plan2,
            name="Almuerzo Completo",
            meal_type='lunch',
            time=time(13, 30),
            calories=650,
            protein=50,
            carbs=70,
            fat=18,
            description="Comida principal rica en proteínas y carbohidratos",
            order_index=3
        )
        meal3.suggested_recipes.set(lunch_recipes[:7])
        
        # Post-Entreno - 400 kcal
        meal4 = PlanMeal.objects.create(
            plan=plan2,
            name="Snack Post-Entreno",
            meal_type='post_workout',
            time=time(17, 30),
            calories=400,
            protein=35,
            carbs=50,
            fat=10,
            description="Recuperación muscular después del entrenamiento",
            order_index=4
        )
        meal4.suggested_recipes.set(lunch_recipes[7:12])
        
        # Cena - 650 kcal
        meal5 = PlanMeal.objects.create(
            plan=plan2,
            name="Cena Nutritiva",
            meal_type='dinner',
            time=time(21, 0),
            calories=650,
            protein=40,
            carbs=70,
            fat=22,
            description="Cena abundante para completar las proteínas del día",
            order_index=5
        )
        meal5.suggested_recipes.set(dinner_recipes[:7])
        
        print(f"  ✅ Creado: {plan2.name}")
    plans_created.append(plan2)
    
    # =========================================================================
    # PLAN 3: Mantenimiento - 2000 kcal
    # =========================================================================
    plan3, created = NutritionPlan.objects.update_or_create(
        name="Plan Mantenimiento - Equilibrado",
        is_system=True,
        defaults={
            'description': 'Plan equilibrado para mantener el peso actual. '
                          'Distribución balanceada de macronutrientes para una vida saludable.',
            'daily_calories': 2000,
            'protein_grams': 130,  # 26% de calorías
            'carbs_grams': 230,    # 46% de calorías
            'fat_grams': 65,       # 29% de calorías
            'fiber_grams': 30,
            'goal': 'maintain',
            'diet_type': 'normal',
            'meals_per_day': 5,
            'duration_weeks': 12,
            'is_template': True,
            'is_active': True,
            'tags': ['mantenimiento', 'equilibrado', 'salud'],
        }
    )
    
    if created or plan3.meals.count() == 0:
        plan3.meals.all().delete()
        
        # Desayuno - 400 kcal
        meal1 = PlanMeal.objects.create(
            plan=plan3,
            name="Desayuno Completo",
            meal_type='breakfast',
            time=time(8, 0),
            calories=400,
            protein=25,
            carbs=45,
            fat=14,
            description="Desayuno equilibrado para empezar bien el día",
            order_index=1
        )
        meal1.suggested_recipes.set(breakfast_recipes[:4])
        
        # Snack Mañana - 200 kcal
        meal2 = PlanMeal.objects.create(
            plan=plan3,
            name="Snack Mañana",
            meal_type='morning_snack',
            time=time(11, 0),
            calories=200,
            protein=12,
            carbs=22,
            fat=7,
            description="Snack saludable a media mañana",
            order_index=2
        )
        if snack_recipes:
            meal2.suggested_recipes.set(snack_recipes[:2])
        
        # Almuerzo - 550 kcal
        meal3 = PlanMeal.objects.create(
            plan=plan3,
            name="Almuerzo Balanceado",
            meal_type='lunch',
            time=time(14, 0),
            calories=550,
            protein=40,
            carbs=60,
            fat=18,
            description="Comida principal del día",
            order_index=3
        )
        meal3.suggested_recipes.set(lunch_recipes[:6])
        
        # Snack Tarde - 200 kcal
        meal4 = PlanMeal.objects.create(
            plan=plan3,
            name="Merienda",
            meal_type='afternoon_snack',
            time=time(17, 30),
            calories=200,
            protein=13,
            carbs=23,
            fat=6,
            description="Merienda para mantener la energía",
            order_index=4
        )
        if snack_recipes:
            meal4.suggested_recipes.set(snack_recipes)
        
        # Cena - 650 kcal
        meal5 = PlanMeal.objects.create(
            plan=plan3,
            name="Cena Equilibrada",
            meal_type='dinner',
            time=time(20, 30),
            calories=650,
            protein=40,
            carbs=80,
            fat=20,
            description="Cena completa y nutritiva",
            order_index=5
        )
        meal5.suggested_recipes.set(dinner_recipes[:6])
        
        print(f"  ✅ Creado: {plan3.name}")
    plans_created.append(plan3)
    
    # =========================================================================
    # PLAN 4: Recomposición Corporal - 1800 kcal
    # =========================================================================
    plan4, created = NutritionPlan.objects.update_or_create(
        name="Plan Recomposición Corporal",
        is_system=True,
        defaults={
            'description': 'Plan para perder grasa y ganar músculo simultáneamente. '
                          'Muy alto en proteínas con déficit calórico moderado.',
            'daily_calories': 1800,
            'protein_grams': 160,  # 36% de calorías - muy alto
            'carbs_grams': 160,    # 36% de calorías
            'fat_grams': 55,       # 28% de calorías
            'fiber_grams': 30,
            'goal': 'body_recomposition',
            'diet_type': 'high_protein',
            'meals_per_day': 5,
            'duration_weeks': 12,
            'is_template': True,
            'is_active': True,
            'tags': ['recomposición', 'definición', 'muy alto en proteínas'],
        }
    )
    
    if created or plan4.meals.count() == 0:
        plan4.meals.all().delete()
        
        # Desayuno - 350 kcal
        meal1 = PlanMeal.objects.create(
            plan=plan4,
            name="Desayuno Proteico",
            meal_type='breakfast',
            time=time(7, 30),
            calories=350,
            protein=35,
            carbs=30,
            fat=10,
            description="Desayuno muy rico en proteínas",
            order_index=1
        )
        meal1.suggested_recipes.set(breakfast_recipes[:4])
        
        # Snack Mañana - 200 kcal
        meal2 = PlanMeal.objects.create(
            plan=plan4,
            name="Snack Proteico",
            meal_type='morning_snack',
            time=time(10, 30),
            calories=200,
            protein=20,
            carbs=15,
            fat=7,
            description="Snack alto en proteínas",
            order_index=2
        )
        if snack_recipes:
            meal2.suggested_recipes.set(snack_recipes[:2])
        
        # Almuerzo - 500 kcal
        meal3 = PlanMeal.objects.create(
            plan=plan4,
            name="Almuerzo Rico en Proteínas",
            meal_type='lunch',
            time=time(13, 30),
            calories=500,
            protein=45,
            carbs=45,
            fat=15,
            description="Almuerzo con énfasis en proteína magra",
            order_index=3
        )
        meal3.suggested_recipes.set(lunch_recipes[:6])
        
        # Post-Entreno - 250 kcal
        meal4 = PlanMeal.objects.create(
            plan=plan4,
            name="Post-Entreno",
            meal_type='post_workout',
            time=time(17, 30),
            calories=250,
            protein=30,
            carbs=25,
            fat=5,
            description="Recuperación con proteína rápida",
            order_index=4
        )
        meal4.suggested_recipes.set(lunch_recipes[6:10])
        
        # Cena - 500 kcal
        meal5 = PlanMeal.objects.create(
            plan=plan4,
            name="Cena Alta en Proteína",
            meal_type='dinner',
            time=time(20, 30),
            calories=500,
            protein=40,
            carbs=45,
            fat=18,
            description="Cena proteica para la recuperación nocturna",
            order_index=5
        )
        meal5.suggested_recipes.set(dinner_recipes[:6])
        
        print(f"  ✅ Creado: {plan4.name}")
    plans_created.append(plan4)
    
    # =========================================================================
    # PLAN 5: Mediterráneo - 1800 kcal
    # =========================================================================
    plan5, created = NutritionPlan.objects.update_or_create(
        name="Plan Mediterráneo - Saludable",
        is_system=True,
        defaults={
            'description': 'Plan basado en la dieta mediterránea, rica en grasas saludables, '
                          'vegetales, pescado y aceite de oliva. Ideal para salud cardiovascular.',
            'daily_calories': 1800,
            'protein_grams': 100,  # 22% de calorías
            'carbs_grams': 200,    # 44% de calorías
            'fat_grams': 70,       # 35% de calorías (grasas saludables)
            'fiber_grams': 35,
            'goal': 'maintain',
            'diet_type': 'mediterranean',
            'meals_per_day': 5,
            'duration_weeks': 12,
            'is_template': True,
            'is_active': True,
            'tags': ['mediterráneo', 'salud cardiovascular', 'omega-3', 'grasas saludables'],
        }
    )
    
    if created or plan5.meals.count() == 0:
        plan5.meals.all().delete()
        
        # Desayuno - 350 kcal
        meal1 = PlanMeal.objects.create(
            plan=plan5,
            name="Desayuno Mediterráneo",
            meal_type='breakfast',
            time=time(8, 0),
            calories=350,
            protein=18,
            carbs=40,
            fat=14,
            description="Tostadas con aceite de oliva, tomate y proteína",
            order_index=1
        )
        meal1.suggested_recipes.set(breakfast_recipes[:4])
        
        # Snack Mañana - 150 kcal
        meal2 = PlanMeal.objects.create(
            plan=plan5,
            name="Snack de Fruta y Frutos Secos",
            meal_type='morning_snack',
            time=time(11, 0),
            calories=150,
            protein=5,
            carbs=18,
            fat=8,
            description="Fruta fresca con un puñado de almendras",
            order_index=2
        )
        if snack_recipes:
            meal2.suggested_recipes.set(snack_recipes[:2])
        
        # Almuerzo - 550 kcal
        meal3 = PlanMeal.objects.create(
            plan=plan5,
            name="Almuerzo Mediterráneo",
            meal_type='lunch',
            time=time(14, 0),
            calories=550,
            protein=35,
            carbs=55,
            fat=22,
            description="Pescado o legumbres con verduras y aceite de oliva",
            order_index=3
        )
        meal3.suggested_recipes.set(lunch_recipes[:7])
        
        # Merienda - 150 kcal
        meal4 = PlanMeal.objects.create(
            plan=plan5,
            name="Merienda Ligera",
            meal_type='afternoon_snack',
            time=time(17, 30),
            calories=150,
            protein=8,
            carbs=17,
            fat=6,
            description="Yogur griego con frutas o hummus con verduras",
            order_index=4
        )
        if snack_recipes:
            meal4.suggested_recipes.set(snack_recipes)
        
        # Cena - 600 kcal
        meal5 = PlanMeal.objects.create(
            plan=plan5,
            name="Cena Mediterránea",
            meal_type='dinner',
            time=time(20, 30),
            calories=600,
            protein=34,
            carbs=70,
            fat=20,
            description="Pescado azul o marisco con verduras asadas",
            order_index=5
        )
        meal5.suggested_recipes.set(dinner_recipes[:7])
        
        print(f"  ✅ Creado: {plan5.name}")
    plans_created.append(plan5)
    
    # =========================================================================
    # PLAN 6: Bajo en Carbohidratos - 1600 kcal
    # =========================================================================
    plan6, created = NutritionPlan.objects.update_or_create(
        name="Plan Bajo en Carbohidratos",
        is_system=True,
        defaults={
            'description': 'Plan con restricción de carbohidratos para acelerar la pérdida de grasa. '
                          'Enfocado en proteínas y grasas saludables.',
            'daily_calories': 1600,
            'protein_grams': 140,  # 35% de calorías
            'carbs_grams': 80,     # 20% de calorías
            'fat_grams': 80,       # 45% de calorías
            'fiber_grams': 25,
            'goal': 'lose_weight',
            'diet_type': 'low_carb',
            'meals_per_day': 4,
            'duration_weeks': 8,
            'is_template': True,
            'is_active': True,
            'tags': ['low carb', 'cetogénico suave', 'pérdida de grasa'],
        }
    )
    
    if created or plan6.meals.count() == 0:
        plan6.meals.all().delete()
        
        # Desayuno - 400 kcal
        meal1 = PlanMeal.objects.create(
            plan=plan6,
            name="Desayuno Proteico",
            meal_type='breakfast',
            time=time(8, 0),
            calories=400,
            protein=35,
            carbs=15,
            fat=25,
            description="Huevos, aguacate y proteína - bajo en carbohidratos",
            order_index=1
        )
        meal1.suggested_recipes.set(breakfast_recipes[:4])
        
        # Almuerzo - 500 kcal
        meal2 = PlanMeal.objects.create(
            plan=plan6,
            name="Almuerzo Low Carb",
            meal_type='lunch',
            time=time(13, 0),
            calories=500,
            protein=45,
            carbs=25,
            fat=25,
            description="Proteína con verduras verdes y grasas saludables",
            order_index=2
        )
        meal2.suggested_recipes.set(lunch_recipes[:6])
        
        # Merienda - 200 kcal
        meal3 = PlanMeal.objects.create(
            plan=plan6,
            name="Snack Graso",
            meal_type='afternoon_snack',
            time=time(17, 0),
            calories=200,
            protein=15,
            carbs=10,
            fat=12,
            description="Frutos secos, queso o aguacate",
            order_index=3
        )
        if snack_recipes:
            meal3.suggested_recipes.set(snack_recipes)
        
        # Cena - 500 kcal
        meal4 = PlanMeal.objects.create(
            plan=plan6,
            name="Cena Keto-friendly",
            meal_type='dinner',
            time=time(20, 0),
            calories=500,
            protein=45,
            carbs=30,
            fat=18,
            description="Pescado o carne con verduras bajas en carbohidratos",
            order_index=4
        )
        meal4.suggested_recipes.set(dinner_recipes[:6])
        
        print(f"  ✅ Creado: {plan6.name}")
    plans_created.append(plan6)
    
    print(f"\n🎉 ¡Completado! Se crearon/actualizaron {len(plans_created)} planes de nutrición.")
    
    # Resumen
    print("\n📋 RESUMEN DE PLANES DE MENÚ:")
    for plan in plans_created:
        meals_count = plan.meals.count()
        print(f"  • {plan.name}")
        print(f"    Calorías: {plan.daily_calories} kcal | P:{plan.protein_grams}g C:{plan.carbs_grams}g G:{plan.fat_grams}g")
        print(f"    Objetivo: {plan.get_goal_display()} | Tipo: {plan.get_diet_type_display()}")
        print(f"    {meals_count} comidas por día | {plan.duration_weeks} semanas")
        print()


if __name__ == '__main__':
    create_nutrition_plans()


