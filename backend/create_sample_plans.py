#!/usr/bin/env python3
"""
Script para crear planes de ejemplo para entrenamiento y nutrición
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from workouts.models import DefaultWorkoutProgram, DefaultWorkoutDay, DefaultWorkoutDayExercise, Exercise
from nutrition.models import DefaultNutritionPlan, Food
from django.utils import timezone

def create_sample_exercises():
    """Crear ejercicios de ejemplo"""
    exercises_data = [
        {
            'name': 'Flexiones',
            'category': 'strength',
            'muscle_groups': ['chest', 'triceps', 'shoulders'],
            'instructions': 'Posición de plancha, bajar el pecho al suelo y empujar hacia arriba',
            'video_url': '',
            'image_url': ''
        },
        {
            'name': 'Sentadillas',
            'category': 'strength',
            'muscle_groups': ['quadriceps', 'glutes', 'hamstrings'],
            'instructions': 'Pies separados al ancho de los hombros, bajar como si te sentaras en una silla',
            'video_url': '',
            'image_url': ''
        },
        {
            'name': 'Plancha',
            'category': 'strength',
            'muscle_groups': ['core', 'shoulders'],
            'instructions': 'Posición de flexión pero apoyado en antebrazos, mantener el cuerpo recto',
            'video_url': '',
            'image_url': ''
        },
        {
            'name': 'Burpees',
            'category': 'cardio',
            'muscle_groups': ['full_body'],
            'instructions': 'Flexión, salto hacia los pies, salto vertical con brazos arriba',
            'video_url': '',
            'image_url': ''
        },
        {
            'name': 'Mountain Climbers',
            'category': 'cardio',
            'muscle_groups': ['core', 'shoulders', 'legs'],
            'instructions': 'Posición de plancha, alternar llevar rodillas al pecho rápidamente',
            'video_url': '',
            'image_url': ''
        }
    ]
    
    exercises = []
    for exercise_data in exercises_data:
        exercise, created = Exercise.objects.get_or_create(
            name=exercise_data['name'],
            defaults=exercise_data
        )
        exercises.append(exercise)
        if created:
        else:
    
    return exercises

def create_sample_foods():
    """Crear alimentos de ejemplo"""
    foods_data = [
        {
            'name': 'Pechuga de pollo',
            'unit': '100g',
            'calories': 165,
            'protein': 31.0,
            'carbs': 0.0,
            'fat': 3.6
        },
        {
            'name': 'Arroz blanco',
            'unit': '100g',
            'calories': 130,
            'protein': 2.7,
            'carbs': 28.0,
            'fat': 0.3
        },
        {
            'name': 'Aguacate',
            'unit': '100g',
            'calories': 160,
            'protein': 2.0,
            'carbs': 8.5,
            'fat': 14.7
        },
        {
            'name': 'Plátano',
            'unit': '100g',
            'calories': 89,
            'protein': 1.1,
            'carbs': 22.8,
            'fat': 0.3
        },
        {
            'name': 'Almendras',
            'unit': '100g',
            'calories': 579,
            'protein': 21.2,
            'carbs': 21.6,
            'fat': 49.9
        }
    ]
    
    foods = []
    for food_data in foods_data:
        food, created = Food.objects.get_or_create(
            name=food_data['name'],
            defaults=food_data
        )
        foods.append(food)
        if created:
        else:
    
    return foods

def create_sample_workout_plans(exercises):
    """Crear planes de entrenamiento de ejemplo"""
    
    # Plan básico para usuarios básicos
    basic_plan, created = DefaultWorkoutProgram.objects.get_or_create(
        name="Entrenamiento Básico en Casa",
        defaults={
            'description': 'Plan básico de entrenamiento sin equipamiento para principiantes',
            'difficulty': 'beginner',
            'duration_weeks': 4,
            'min_role_required': 'basic',
            'tags': ['casa', 'principiante', 'sin_equipamiento'],
            'estimated_duration_minutes': 30,
            'equipment_needed': [],
            'is_default': True
        }
    )
    
    if created:
        
        # Crear días del plan básico
        days_data = [
            {'day_name': 'Lunes', 'day_number': 1, 'is_rest_day': False, 'notes': 'Día de fuerza superior'},
            {'day_name': 'Martes', 'day_number': 2, 'is_rest_day': True, 'notes': 'Día de descanso'},
            {'day_name': 'Miércoles', 'day_number': 3, 'is_rest_day': False, 'notes': 'Día de fuerza inferior'},
            {'day_name': 'Jueves', 'day_number': 4, 'is_rest_day': True, 'notes': 'Día de descanso'},
            {'day_name': 'Viernes', 'day_number': 5, 'is_rest_day': False, 'notes': 'Día de cardio'},
            {'day_name': 'Sábado', 'day_number': 6, 'is_rest_day': True, 'notes': 'Día de descanso'},
            {'day_name': 'Domingo', 'day_number': 7, 'is_rest_day': True, 'notes': 'Día de descanso'}
        ]
        
        for day_data in days_data:
            day, day_created = DefaultWorkoutDay.objects.get_or_create(
                program=basic_plan,
                day_name=day_data['day_name'],
                defaults=day_data
            )
            
            if day_created and not day_data['is_rest_day']:
                # Agregar ejercicios según el día
                if day_data['day_name'] == 'Lunes':  # Fuerza superior
                    exercises_for_day = [
                        {'exercise': exercises[0], 'sets': 3, 'reps': '10-15', 'rest_seconds': 60},
                        {'exercise': exercises[2], 'sets': 3, 'reps': '30-45 segundos', 'rest_seconds': 60}
                    ]
                elif day_data['day_name'] == 'Miércoles':  # Fuerza inferior
                    exercises_for_day = [
                        {'exercise': exercises[1], 'sets': 3, 'reps': '15-20', 'rest_seconds': 60},
                        {'exercise': exercises[2], 'sets': 3, 'reps': '30-45 segundos', 'rest_seconds': 60}
                    ]
                elif day_data['day_name'] == 'Viernes':  # Cardio
                    exercises_for_day = [
                        {'exercise': exercises[3], 'sets': 3, 'reps': '8-12', 'rest_seconds': 90},
                        {'exercise': exercises[4], 'sets': 3, 'reps': '20-30 segundos', 'rest_seconds': 60}
                    ]
                else:
                    exercises_for_day = []
                
                for i, ex_data in enumerate(exercises_for_day):
                    DefaultWorkoutDayExercise.objects.get_or_create(
                        day=day,
                        exercise=ex_data['exercise'],
                        defaults={
                            'sets': ex_data['sets'],
                            'reps': ex_data['reps'],
                            'rest_seconds': ex_data['rest_seconds'],
                            'order_index': i + 1
                        }
                    )
    else:
    
    # Plan Pro para usuarios Pro
    pro_plan, created = DefaultWorkoutProgram.objects.get_or_create(
        name="Entrenamiento Pro Avanzado",
        defaults={
            'description': 'Plan avanzado de entrenamiento para usuarios Pro con mayor intensidad',
            'difficulty': 'intermediate',
            'duration_weeks': 6,
            'min_role_required': 'pro',
            'tags': ['avanzado', 'pro', 'alta_intensidad'],
            'estimated_duration_minutes': 45,
            'equipment_needed': ['mancuernas', 'barra'],
            'is_default': False
        }
    )
    
    if created:
    else:
    
    # Plan Premium para usuarios Premium
    premium_plan, created = DefaultWorkoutProgram.objects.get_or_create(
        name="Entrenamiento Premium Personalizado",
        defaults={
            'description': 'Plan premium con entrenamientos personalizados y seguimiento avanzado',
            'difficulty': 'advanced',
            'duration_weeks': 8,
            'min_role_required': 'premium',
            'tags': ['premium', 'personalizado', 'avanzado'],
            'estimated_duration_minutes': 60,
            'equipment_needed': ['gimnasio_completo', 'entrenador_personal'],
            'is_default': False
        }
    )
    
    if created:
    else:

def create_sample_nutrition_plans():
    """Crear planes de nutrición de ejemplo"""
    
    # Plan básico para usuarios básicos
    basic_plan, created = DefaultNutritionPlan.objects.get_or_create(
        name="Plan Nutricional Básico",
        defaults={
            'description': 'Plan nutricional básico para mantener un peso saludable',
            'min_role_required': 'basic',
            'daily_calories': 2000,
            'protein_percentage': 20.0,
            'carbs_percentage': 50.0,
            'fat_percentage': 30.0,
            'duration_weeks': 4,
            'tags': ['básico', 'mantenimiento'],
            'target_audience': 'mantenimiento de peso',
            'is_default': True
        }
    )
    
    if created:
    else:
    
    # Plan Pro para usuarios Pro
    pro_plan, created = DefaultNutritionPlan.objects.get_or_create(
        name="Plan Nutricional Pro - Ganancia Muscular",
        defaults={
            'description': 'Plan nutricional optimizado para ganancia de masa muscular',
            'min_role_required': 'pro',
            'daily_calories': 2500,
            'protein_percentage': 30.0,
            'carbs_percentage': 45.0,
            'fat_percentage': 25.0,
            'duration_weeks': 8,
            'tags': ['pro', 'ganancia_muscular', 'alta_proteína'],
            'target_audience': 'ganancia de masa muscular'
        }
    )
    
    if created:
    else:
    
    # Plan Premium para usuarios Premium
    premium_plan, created = DefaultNutritionPlan.objects.get_or_create(
        name="Plan Nutricional Premium - Definición",
        defaults={
            'description': 'Plan nutricional premium para definición muscular con seguimiento personalizado',
            'min_role_required': 'premium',
            'daily_calories': 1800,
            'protein_percentage': 35.0,
            'carbs_percentage': 40.0,
            'fat_percentage': 25.0,
            'duration_weeks': 12,
            'tags': ['premium', 'definición', 'personalizado'],
            'target_audience': 'definición muscular'
        }
    )
    
    if created:
    else:

def main():
    
    # Crear ejercicios
    exercises = create_sample_exercises()
    
    # Crear alimentos
    foods = create_sample_foods()
    
    # Crear planes de entrenamiento
    create_sample_workout_plans(exercises)
    
    # Crear planes de nutrición
    create_sample_nutrition_plans()
    

if __name__ == "__main__":
    main()





















