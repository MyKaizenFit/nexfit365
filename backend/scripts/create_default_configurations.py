#!/usr/bin/env python
"""
Script para crear configuraciones por defecto de planes
"""
import os
import sys
import django

# Configurar Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from dashboard.models import DefaultPlanConfiguration
from nutrition.models import NutritionPlan
from workouts.models import WorkoutProgram

def create_default_configurations():
    """Crear configuraciones por defecto para todas las combinaciones principales"""
    print("🔄 Creando configuraciones por defecto...\n")
    
    # Obtener planes disponibles
    nutrition_plans = {
        'lose_weight': NutritionPlan.objects.filter(name__icontains='Pérdida', is_template=True).first(),
        'gain_muscle': NutritionPlan.objects.filter(name__icontains='Ganancia', is_template=True).first(),
        'body_recomposition': NutritionPlan.objects.filter(name__icontains='Recomposición', is_template=True).first(),
        'maintain': NutritionPlan.objects.filter(name__icontains='Mantenimiento', is_template=True).first(),
    }
    
    # Programas de entrenamiento por ubicación y objetivo
    workout_programs = {}
    
    # Para gym y home
    workout_programs_default = {
        'lose_weight': WorkoutProgram.objects.filter(name__icontains='Definición').first() or WorkoutProgram.objects.filter(name__icontains='Pérdida').first(),
        'gain_muscle': WorkoutProgram.objects.filter(name__icontains='Full Body').first() or WorkoutProgram.objects.filter(name__icontains='Ganancia').first(),
        'body_recomposition': WorkoutProgram.objects.filter(name__icontains='Glúteos').first() or WorkoutProgram.objects.filter(name__icontains='Recomposición').first(),
        'maintain': WorkoutProgram.objects.filter(name__icontains='Principiante').first(),
    }
    
    # Para outdoor
    workout_programs_outdoor = {
        'lose_weight': WorkoutProgram.objects.filter(name__icontains='Outdoor - Pérdida').first(),
        'gain_muscle': WorkoutProgram.objects.filter(name__icontains='Outdoor - Calistenia').first(),
        'body_recomposition': WorkoutProgram.objects.filter(name__icontains='Outdoor - Recomposición').first(),
        'maintain': WorkoutProgram.objects.filter(name__icontains='Outdoor - Mantenimiento').first(),
    }
    
    print("📋 Planes disponibles:")
    print(f"  Nutrición: {len([p for p in nutrition_plans.values() if p])} planes encontrados")
    print(f"  Entrenamiento: {len([p for p in workout_programs.values() if p])} programas encontrados\n")
    
    # Definir configuraciones
    configurations_data = []
    priority = 10
    
    # Combinaciones principales: Objetivo + Ubicación + Nivel de actividad
    # IMPORTANTE: El orden debe coincidir con el orden en que el frontend genera las combinaciones
    goals = ['lose_weight', 'gain_muscle', 'body_recomposition', 'maintain']
    locations = ['home', 'gym', 'outdoor']
    activity_levels = ['sedentary', 'light', 'moderate', 'active', 'very_active']
    
    goal_names = {
        'lose_weight': 'Pérdida de Peso',
        'gain_muscle': 'Ganancia Muscular',
        'body_recomposition': 'Recomposición Corporal',
        'maintain': 'Mantenimiento'
    }
    
    location_names = {
        'home': 'Casa',
        'gym': 'Gimnasio',
        'outdoor': 'Aire Libre'
    }
    
    activity_names = {
        'sedentary': 'Sedentario',
        'light': 'Ligero',
        'moderate': 'Moderado',
        'active': 'Activo',
        'very_active': 'Muy Activo'
    }
    
    # Mapeo de días de entrenamiento según nivel de actividad
    training_days_map = {
        'sedentary': (1, 3),
        'light': (2, 4),
        'moderate': (3, 5),
        'active': (4, 6),
        'very_active': (5, 7),
    }
    
    for goal in goals:
        for location in locations:
            for activity in activity_levels:
                min_days, max_days = training_days_map[activity]
                
                # Seleccionar programa de entrenamiento según ubicación
                if location == 'outdoor':
                    workout_program = workout_programs_outdoor.get(goal)
                else:
                    workout_program = workout_programs_default.get(goal)
                
                config_data = {
                    'name': f"{goal_names[goal]} - {location_names[location]} - {activity_names[activity]}",
                    'description': f"Configuración automática para usuarios con objetivo de {goal_names[goal].lower()}, entrenando en {location_names[location].lower()} con nivel de actividad {activity_names[activity].lower()}",
                    'priority': priority,
                    'is_active': True,
                    'main_goal': goal,
                    'training_location': location,
                    'activity_level': activity,
                    'min_training_days_per_week': min_days,
                    'max_training_days_per_week': max_days,
                    'nutrition_plan': nutrition_plans.get(goal),
                    'workout_program': workout_program,
                }
                
                configurations_data.append(config_data)
                priority += 1
    
    # Crear configuraciones
    created_count = 0
    skipped_count = 0
    
    for config_data in configurations_data:
        # Verificar si ya existe
        existing = DefaultPlanConfiguration.objects.filter(
            main_goal=config_data['main_goal'],
            training_location=config_data['training_location'],
            activity_level=config_data['activity_level']
        ).first()
        
        if existing:
            print(f"⏭️  Ya existe: {config_data['name']}")
            skipped_count += 1
            continue
        
        # Extraer plan nutricional y programa
        nutrition_plan = config_data.pop('nutrition_plan')
        workout_program = config_data.pop('workout_program')
        
        # Crear configuración
        config = DefaultPlanConfiguration.objects.create(**config_data)
        
        if nutrition_plan:
            config.default_nutrition_plan = nutrition_plan
        if workout_program:
            config.default_workout_program = workout_program
        
        config.save()
        
        print(f"✅ Creado: {config.name}")
        if nutrition_plan:
            print(f"   📋 Plan nutricional: {nutrition_plan.name}")
        if workout_program:
            print(f"   💪 Programa: {workout_program.name}")
        
        created_count += 1
    
    print(f"\n{'='*60}")
    print(f"✅ Proceso completado")
    print(f"   Configuraciones creadas: {created_count}")
    print(f"   Configuraciones existentes: {skipped_count}")
    print(f"   Total configuraciones: {DefaultPlanConfiguration.objects.count()}")
    print(f"{'='*60}\n")
    
    # Mostrar resumen por objetivo
    print("📊 Resumen por objetivo:")
    for goal, name in goal_names.items():
        count = DefaultPlanConfiguration.objects.filter(main_goal=goal).count()
        print(f"   {name}: {count} configuraciones")

if __name__ == '__main__':
    create_default_configurations()

