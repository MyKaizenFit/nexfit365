#!/usr/bin/env python3
"""
Script para asignar planes de entrenamiento y nutrición al usuario test2@test.com
"""

import os
import sys
import django
from datetime import date, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from accounts.models import CustomUser
from workouts.models import WorkoutProgram, WorkoutDay, WorkoutDayExercise, Exercise
from nutrition.models import NutritionPlan, PlanMeal, Recipe

def main():
    print("=" * 80)
    print("📋 ASIGNANDO PLANES A USUARIO TEST2")
    print("=" * 80)
    print()
    
    # Obtener usuario
    try:
        user = CustomUser.objects.get(email='test2@test.com')
        print(f"✅ Usuario: {user.email} (ID: {user.id})")
    except CustomUser.DoesNotExist:
        print("❌ Usuario no encontrado")
        return
    
    # =========================================================================
    # 1. CREAR PROGRAMA DE ENTRENAMIENTO
    # =========================================================================
    print()
    print("🏋️ CREANDO PROGRAMA DE ENTRENAMIENTO...")
    
    # Eliminar programas anteriores del usuario
    WorkoutProgram.objects.filter(user=user).delete()
    
    # Obtener ejercicios disponibles
    all_exercises = list(Exercise.objects.filter(is_active=True).order_by('name')[:20])
    
    if not all_exercises:
        print("❌ No hay ejercicios disponibles")
        return
    
    # Crear programa
    program = WorkoutProgram.objects.create(
        name="Plan Full Body - 4 días",
        description="Programa de entrenamiento full body diseñado para desarrollar fuerza y masa muscular.",
        user=user,
        difficulty="intermediate",
        goal="muscle_gain",
        location="gym",
        duration_weeks=8,
        days_per_week=4,
        estimated_duration_minutes=60,
        equipment_needed=["multipower", "polea", "máquinas", "banco"],
        is_template=False,
        is_system=False,
        is_active=True,
        start_date=date.today(),
        end_date=date.today() + timedelta(weeks=8)
    )
    print(f"  ✅ Programa creado: {program.name}")
    
    # Día 1: Pecho + Tríceps (Lunes)
    day1 = WorkoutDay.objects.create(
        program=program,
        name="Día 1: Pecho + Tríceps",
        day_number=1,
        day_of_week="monday",
        is_rest_day=False,
        duration_minutes=55,
        focus="Pecho y tríceps",
        notes="Comenzar con buen calentamiento.",
        order_index=0
    )
    
    # Asignar ejercicios al día 1
    exercises_day1 = all_exercises[:3]  # Primeros 3 ejercicios
    for idx, ex in enumerate(exercises_day1):
        WorkoutDayExercise.objects.create(
            workout_day=day1,
            exercise=ex,
            sets=4,
            reps="10-12",
            weight="",
            rest_seconds=90,
            order_index=idx
        )
    
    print(f"  ✅ {day1.name} - {len(exercises_day1)} ejercicios")
    
    # Día 2: Espalda + Bíceps (Martes)
    day2 = WorkoutDay.objects.create(
        program=program,
        name="Día 2: Espalda + Bíceps",
        day_number=2,
        day_of_week="tuesday",
        is_rest_day=False,
        duration_minutes=55,
        focus="Espalda y bíceps",
        notes="Enfocarse en la conexión mente-músculo.",
        order_index=1
    )
    
    exercises_day2 = all_exercises[3:6] if len(all_exercises) > 3 else all_exercises[:3]
    for idx, ex in enumerate(exercises_day2):
        WorkoutDayExercise.objects.create(
            workout_day=day2,
            exercise=ex,
            sets=4,
            reps="10-12",
            weight="",
            rest_seconds=90,
            order_index=idx
        )
    
    print(f"  ✅ {day2.name} - {len(exercises_day2)} ejercicios")
    
    # Día 3: Descanso (Miércoles)
    day3 = WorkoutDay.objects.create(
        program=program,
        name="Día 3: Descanso",
        day_number=3,
        day_of_week="wednesday",
        is_rest_day=True,
        duration_minutes=0,
        focus="Recuperación",
        notes="Descanso activo o estiramientos.",
        order_index=2
    )
    print(f"  ✅ {day3.name} - Descanso")
    
    # Día 4: Piernas (Jueves)
    day4 = WorkoutDay.objects.create(
        program=program,
        name="Día 4: Piernas",
        day_number=4,
        day_of_week="thursday",
        is_rest_day=False,
        duration_minutes=60,
        focus="Piernas completas",
        notes="Día intenso. Buena hidratación.",
        order_index=3
    )
    
    exercises_day4 = all_exercises[6:9] if len(all_exercises) > 6 else all_exercises[:3]
    for idx, ex in enumerate(exercises_day4):
        WorkoutDayExercise.objects.create(
            workout_day=day4,
            exercise=ex,
            sets=4,
            reps="10-12",
            weight="",
            rest_seconds=90,
            order_index=idx
        )
    
    print(f"  ✅ {day4.name} - {len(exercises_day4)} ejercicios")
    
    # Días 5-7: Descanso
    for day_num, day_name, day_week in [(5, "Viernes", "friday"), (6, "Sábado", "saturday"), (7, "Domingo", "sunday")]:
        WorkoutDay.objects.create(
            program=program,
            name=f"Día {day_num}: Descanso",
            day_number=day_num,
            day_of_week=day_week,
            is_rest_day=True,
            order_index=day_num - 1
        )
    
    print(f"  ✅ Días 5-7: Descanso")
    
    # =========================================================================
    # 2. CREAR PLAN DE NUTRICIÓN
    # =========================================================================
    print()
    print("🥗 CREANDO PLAN DE NUTRICIÓN...")
    
    # Eliminar planes anteriores del usuario
    NutritionPlan.objects.filter(user=user).delete()
    
    # Obtener o crear recetas
    recipes = list(Recipe.objects.filter(is_active=True)[:10])
    
    if len(recipes) < 5:
        print("  ⚠️ No hay suficientes recetas, creando algunas...")
        
        recipe_data = [
            {
                "name": "Avena con frutas y proteína",
                "description": "Desayuno energético y nutritivo.",
                "meal_types": ["breakfast"],
                "calories": 450,
                "protein": 30,
                "carbs": 55,
                "fat": 12,
                "fiber": 8,
                "prep_time_minutes": 10,
                "cook_time_minutes": 5,
                "servings": 1,
                "difficulty": "easy",
                "ingredients": ["80g avena", "1 scoop proteína", "1 plátano", "50g frutos rojos"],
                "instructions": "Cocinar avena, añadir proteína y frutas.",
                "is_active": True,
                "is_system": True
            },
            {
                "name": "Pechuga de pollo con arroz",
                "description": "Comida completa alta en proteínas.",
                "meal_types": ["lunch", "dinner"],
                "calories": 550,
                "protein": 45,
                "carbs": 50,
                "fat": 15,
                "fiber": 6,
                "prep_time_minutes": 15,
                "cook_time_minutes": 20,
                "servings": 1,
                "difficulty": "easy",
                "ingredients": ["200g pechuga pollo", "100g arroz", "150g brócoli"],
                "instructions": "Cocinar arroz, hacer pollo a la plancha, saltear brócoli.",
                "is_active": True,
                "is_system": True
            },
            {
                "name": "Batido de proteínas",
                "description": "Recuperación post-entreno.",
                "meal_types": ["snack"],
                "calories": 280,
                "protein": 30,
                "carbs": 30,
                "fat": 5,
                "fiber": 3,
                "prep_time_minutes": 5,
                "cook_time_minutes": 0,
                "servings": 1,
                "difficulty": "easy",
                "ingredients": ["1 scoop proteína", "1 plátano", "250ml leche"],
                "instructions": "Batir todos los ingredientes.",
                "is_active": True,
                "is_system": True
            },
            {
                "name": "Salmón al horno",
                "description": "Cena rica en omega-3.",
                "meal_types": ["dinner"],
                "calories": 580,
                "protein": 40,
                "carbs": 40,
                "fat": 25,
                "fiber": 4,
                "prep_time_minutes": 10,
                "cook_time_minutes": 25,
                "servings": 1,
                "difficulty": "medium",
                "ingredients": ["180g salmón", "200g patatas", "espárragos"],
                "instructions": "Hornear salmón y patatas.",
                "is_active": True,
                "is_system": True
            },
            {
                "name": "Tortilla de claras",
                "description": "Desayuno proteico.",
                "meal_types": ["breakfast"],
                "calories": 220,
                "protein": 28,
                "carbs": 5,
                "fat": 8,
                "fiber": 2,
                "prep_time_minutes": 5,
                "cook_time_minutes": 8,
                "servings": 1,
                "difficulty": "easy",
                "ingredients": ["5 claras", "1 huevo", "espinacas"],
                "instructions": "Batir y cocinar en sartén.",
                "is_active": True,
                "is_system": True
            }
        ]
        
        for data in recipe_data:
            recipe, created = Recipe.objects.get_or_create(
                name=data["name"],
                defaults=data
            )
            if created:
                print(f"    ✅ Receta creada: {recipe.name}")
            recipes.append(recipe)
    
    recipes = list(Recipe.objects.filter(is_active=True)[:10])
    
    # Crear plan de nutrición
    plan = NutritionPlan.objects.create(
        name="Plan Definición - Déficit moderado",
        description="Plan de nutrición para perder grasa manteniendo masa muscular.",
        user=user,
        goal="weight_loss",
        daily_calories=1800,
        protein_grams=150,
        carbs_grams=180,
        fat_grams=60,
        fiber_grams=30,
        meals_per_day=5,
        is_active=True,
        is_template=False,
        is_system=False,
        start_date=date.today(),
        end_date=date.today() + timedelta(weeks=8)
    )
    print(f"  ✅ Plan creado: {plan.name}")
    
    # Asignar comidas al plan
    meal_types = ['breakfast', 'snack', 'lunch', 'snack', 'dinner']
    meal_names = ['Desayuno', 'Media mañana', 'Almuerzo', 'Merienda', 'Cena']
    meal_times = ['08:00', '11:00', '14:00', '17:00', '20:30']
    
    for i, (meal_type, meal_name, meal_time) in enumerate(zip(meal_types, meal_names, meal_times)):
        matching_recipes = [r for r in recipes if meal_type in (r.meal_types or [])]
        if not matching_recipes:
            matching_recipes = recipes
        
        if matching_recipes:
            recipe = matching_recipes[i % len(matching_recipes)]
            
            plan_meal = PlanMeal.objects.create(
                plan=plan,
                name=meal_name,
                meal_type=meal_type,
                time=meal_time,
                description=f"Sugerencia: {recipe.name}",
                calories=recipe.calories or 350,
                protein=recipe.protein or 25,
                carbs=recipe.carbs or 40,
                fat=recipe.fat or 12,
                order_index=i
            )
            plan_meal.suggested_recipes.add(recipe)
            print(f"    ✅ {meal_name} ({meal_time}): {recipe.name}")
    
    # =========================================================================
    # 3. RESUMEN
    # =========================================================================
    print()
    print("=" * 80)
    print("📊 RESUMEN")
    print("=" * 80)
    print(f"Usuario: {user.email}")
    print(f"Password: Test123!")
    print()
    print("🏋️ Programa de entrenamiento:")
    print(f"   - Nombre: {program.name}")
    print(f"   - Duración: {program.duration_weeks} semanas")
    print(f"   - Días/semana: {program.days_per_week}")
    total_exercises = sum(day.exercises.count() for day in program.days.all())
    print(f"   - Total ejercicios: {total_exercises}")
    print()
    print("🥗 Plan de nutrición:")
    print(f"   - Nombre: {plan.name}")
    print(f"   - Calorías diarias: {plan.daily_calories} kcal")
    print(f"   - Comidas/día: {plan.meals_per_day}")
    print()
    print("✅ ¡Listo! El usuario puede iniciar sesión y ver sus planes.")

if __name__ == "__main__":
    main()

