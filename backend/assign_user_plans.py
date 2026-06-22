#!/usr/bin/env python3
"""
Script para asignar planes de entrenamiento y nutrición a un usuario
"""

import os
import sys
import django
from datetime import date, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from accounts.models import CustomUser
from workouts.models import WorkoutProgram, WorkoutDay, WorkoutDayExercise, Exercise
from nutrition.models import NutritionPlan, PlanMeal, Recipe, MealLog

def main():
    
    # Obtener usuario
    try:
        user = CustomUser.objects.get(email='member@example.invalid')
    except CustomUser.DoesNotExist:
        return
    
    # =========================================================================
    # 1. CREAR PROGRAMA DE ENTRENAMIENTO
    # =========================================================================
    
    # Eliminar programas anteriores del usuario
    WorkoutProgram.objects.filter(user=user).delete()
    
    # Obtener ejercicios por grupo muscular
    exercises_pecho = list(Exercise.objects.filter(name__icontains='press').order_by('name')[:3])
    exercises_espalda = list(Exercise.objects.filter(name__icontains='jalón').order_by('name')[:2])
    exercises_espalda += list(Exercise.objects.filter(name__icontains='remo').order_by('name')[:2])
    exercises_piernas = list(Exercise.objects.filter(name__icontains='prensa').order_by('name')[:2])
    exercises_piernas += list(Exercise.objects.filter(name__icontains='curl femoral').order_by('name')[:1])
    exercises_piernas += list(Exercise.objects.filter(name__icontains='extensión de cuádriceps').order_by('name')[:1])
    exercises_gluteos = list(Exercise.objects.filter(name__icontains='hip thrust').order_by('name')[:1])
    exercises_gluteos += list(Exercise.objects.filter(name__icontains='patada').order_by('name')[:2])
    exercises_brazos = list(Exercise.objects.filter(name__icontains='curl de bíceps').order_by('name')[:2])
    exercises_brazos += list(Exercise.objects.filter(name__icontains='extensión de tríceps').order_by('name')[:2])
    
    # Crear programa
    program = WorkoutProgram.objects.create(
        name="Plan Full Body - 4 días",
        description="Programa de entrenamiento full body diseñado para desarrollar fuerza y masa muscular. Combina ejercicios compuestos y de aislamiento para un desarrollo equilibrado.",
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
    
    # Día 1: Pecho + Tríceps
    day1 = WorkoutDay.objects.create(
        program=program,
        name="Día 1: Pecho + Tríceps",
        day_number=1,
        day_of_week="monday",
        is_rest_day=False,
        duration_minutes=55,
        focus="Pecho y tríceps",
        notes="Comenzar con buen calentamiento. Descanso 60-90 seg entre series.",
        order_index=0
    )
    
    order = 0
    for ex in exercises_pecho:
        WorkoutDayExercise.objects.create(
            workout_day=day1,
            exercise=ex,
            sets=4,
            reps="10-12",
            weight=0,  # 0 = a determinar según capacidad
            rest_seconds=90,
            order_index=order
        )
        order += 1
    
    for ex in exercises_brazos[:2]:  # Tríceps
        if 'tríceps' in ex.name.lower():
            WorkoutDayExercise.objects.create(
                workout_day=day1,
                exercise=ex,
                sets=3,
                reps="12-15",
                weight=0,
                rest_seconds=60,
                order_index=order
            )
            order += 1
    
    
    # Día 2: Espalda + Bíceps
    day2 = WorkoutDay.objects.create(
        program=program,
        name="Día 2: Espalda + Bíceps",
        day_number=2,
        day_of_week="tuesday",
        is_rest_day=False,
        duration_minutes=55,
        focus="Espalda y bíceps",
        notes="Enfocarse en la conexión mente-músculo en los jalones.",
        order_index=1
    )
    
    order = 0
    for ex in exercises_espalda:
        WorkoutDayExercise.objects.create(
            workout_day=day2,
            exercise=ex,
            sets=4,
            reps="10-12",
            weight=0,
            rest_seconds=90,
            order_index=order
        )
        order += 1
    
    for ex in exercises_brazos:
        if 'bíceps' in ex.name.lower():
            WorkoutDayExercise.objects.create(
                workout_day=day2,
                exercise=ex,
                sets=3,
                reps="10-12",
                weight=0,
                rest_seconds=60,
                order_index=order
            )
            order += 1
    
    
    # Día 3: Descanso
    day3 = WorkoutDay.objects.create(
        program=program,
        name="Día 3: Descanso Activo",
        day_number=3,
        day_of_week="wednesday",
        is_rest_day=True,
        duration_minutes=0,
        focus="Recuperación",
        notes="Caminar 20-30 min o estiramientos suaves.",
        order_index=2
    )
    
    # Día 4: Piernas + Glúteos
    day4 = WorkoutDay.objects.create(
        program=program,
        name="Día 4: Piernas + Glúteos",
        day_number=4,
        day_of_week="thursday",
        is_rest_day=False,
        duration_minutes=60,
        focus="Cuádriceps, isquios y glúteos",
        notes="Día intenso. Asegurar buena hidratación.",
        order_index=3
    )
    
    order = 0
    for ex in exercises_piernas:
        WorkoutDayExercise.objects.create(
            workout_day=day4,
            exercise=ex,
            sets=4,
            reps="10-12",
            weight=0,
            rest_seconds=90,
            order_index=order
        )
        order += 1
    
    for ex in exercises_gluteos:
        WorkoutDayExercise.objects.create(
            workout_day=day4,
            exercise=ex,
            sets=4,
            reps="12-15",
            weight=0,
            rest_seconds=60,
            order_index=order
        )
        order += 1
    
    
    # Día 5: Full Body
    day5 = WorkoutDay.objects.create(
        program=program,
        name="Día 5: Full Body",
        day_number=5,
        day_of_week="friday",
        is_rest_day=False,
        duration_minutes=50,
        focus="Cuerpo completo",
        notes="Sesión ligera para cerrar la semana.",
        order_index=4
    )
    
    order = 0
    # Un ejercicio de cada grupo
    all_exercises = [exercises_pecho[0] if exercises_pecho else None,
                     exercises_espalda[0] if exercises_espalda else None,
                     exercises_piernas[0] if exercises_piernas else None,
                     exercises_gluteos[0] if exercises_gluteos else None]
    
    for ex in all_exercises:
        if ex:
            WorkoutDayExercise.objects.create(
                workout_day=day5,
                exercise=ex,
                sets=3,
                reps="12-15",
                weight=0,
                rest_seconds=60,
                order_index=order
            )
            order += 1
    
    
    # Días 6-7: Descanso
    day6 = WorkoutDay.objects.create(
        program=program,
        name="Día 6: Descanso",
        day_number=6,
        day_of_week="saturday",
        is_rest_day=True,
        order_index=5
    )
    day7 = WorkoutDay.objects.create(
        program=program,
        name="Día 7: Descanso",
        day_number=7,
        day_of_week="sunday",
        is_rest_day=True,
        order_index=6
    )
    
    # =========================================================================
    # 2. CREAR PLAN DE NUTRICIÓN
    # =========================================================================
    
    # Eliminar planes anteriores del usuario
    NutritionPlan.objects.filter(user=user).delete()
    
    # Obtener o crear recetas
    recipes = list(Recipe.objects.filter(is_active=True)[:10])
    
    if len(recipes) < 5:
        
        # Crear recetas de ejemplo
        recipe_data = [
            {
                "name": "Avena con frutas y proteína",
                "description": "Desayuno energético y nutritivo para empezar el día.",
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
                "ingredients": ["80g avena", "1 scoop proteína", "1 plátano", "50g frutos rojos", "200ml leche"],
                "instructions": "1. Cocinar la avena con la leche.\n2. Añadir la proteína y mezclar.\n3. Decorar con frutas.",
                "is_active": True,
                "is_system": True
            },
            {
                "name": "Pechuga de pollo a la plancha con arroz y verduras",
                "description": "Comida completa y equilibrada alta en proteínas.",
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
                "ingredients": ["200g pechuga de pollo", "100g arroz", "150g brócoli", "1 cdta aceite oliva"],
                "instructions": "1. Cocinar el arroz.\n2. Hacer la pechuga a la plancha.\n3. Saltear el brócoli.",
                "is_active": True,
                "is_system": True
            },
            {
                "name": "Ensalada de atún con quinoa",
                "description": "Almuerzo ligero pero nutritivo y saciante.",
                "meal_types": ["lunch"],
                "calories": 420,
                "protein": 35,
                "carbs": 35,
                "fat": 16,
                "fiber": 7,
                "prep_time_minutes": 15,
                "cook_time_minutes": 15,
                "servings": 1,
                "difficulty": "easy",
                "ingredients": ["1 lata atún", "80g quinoa", "tomate", "pepino", "aguacate", "limón"],
                "instructions": "1. Cocinar la quinoa.\n2. Mezclar con el atún y verduras.\n3. Aliñar con limón.",
                "is_active": True,
                "is_system": True
            },
            {
                "name": "Batido de proteínas post-entreno",
                "description": "Recuperación rápida después del entrenamiento.",
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
                "ingredients": ["1 scoop proteína", "1 plátano", "250ml leche desnatada", "1 cdta miel"],
                "instructions": "1. Batir todos los ingredientes.\n2. Servir frío.",
                "is_active": True,
                "is_system": True
            },
            {
                "name": "Salmón al horno con patatas",
                "description": "Cena rica en omega-3 y proteínas de alta calidad.",
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
                "ingredients": ["180g salmón", "200g patatas", "espárragos", "limón", "eneldo"],
                "instructions": "1. Hornear patatas 15min.\n2. Añadir salmón y hornear 10min más.\n3. Servir con espárragos.",
                "is_active": True,
                "is_system": True
            },
            {
                "name": "Tortilla de claras con espinacas",
                "description": "Desayuno proteico bajo en grasas.",
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
                "ingredients": ["5 claras de huevo", "1 huevo entero", "espinacas frescas", "sal", "pimienta"],
                "instructions": "1. Batir claras y huevo.\n2. Añadir espinacas.\n3. Cocinar en sartén.",
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
            recipes.append(recipe)
    
    recipes = list(Recipe.objects.filter(is_active=True)[:10])
    
    # Crear plan de nutrición
    plan = NutritionPlan.objects.create(
        name="Plan Definición - Déficit moderado",
        description="Plan de nutrición diseñado para perder grasa manteniendo masa muscular. Déficit calórico moderado con alta proteína.",
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
    
    # Asignar comidas al plan
    meal_types = ['breakfast', 'snack', 'lunch', 'snack', 'dinner']
    meal_names = ['Desayuno', 'Media mañana', 'Almuerzo', 'Merienda', 'Cena']
    meal_times = ['08:00', '11:00', '14:00', '17:00', '20:30']
    
    for i, (meal_type, meal_name, meal_time) in enumerate(zip(meal_types, meal_names, meal_times)):
        # Buscar receta apropiada
        matching_recipes = [r for r in recipes if meal_type in (r.meal_types or [])]
        if not matching_recipes:
            matching_recipes = recipes
        
        if matching_recipes:
            recipe = matching_recipes[i % len(matching_recipes)]
            
            plan_meal = PlanMeal.objects.create(
                plan=plan,  # Correcto: plan, no nutrition_plan
                name=meal_name,
                meal_type=meal_type,
                time=meal_time,
                description=f"Sugerencia: {recipe.name}",
                calories=recipe.calories or 350,
                protein=recipe.protein or 25,
                carbs=recipe.carbs or 40,
                fat=recipe.fat or 12,
                order_index=i  # Correcto: order_index, no order
            )
            # Añadir receta sugerida
            plan_meal.suggested_recipes.add(recipe)
    
    # =========================================================================
    # 3. RESUMEN
    # =========================================================================
    total_exercises = sum(day.exercises.count() for day in program.days.all())

if __name__ == "__main__":
    main()

