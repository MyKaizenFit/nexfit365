#!/usr/bin/env python
"""
Script para crear configuraciones comunes y fáciles de entender
Crea configuraciones para los perfiles más comunes de usuarios
"""
import os
import sys
import django

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from dashboard.models import DefaultPlanConfiguration
from nutrition.models import NutritionPlan
from workouts.models import WorkoutProgram

def create_common_configurations():
    """Crear configuraciones para perfiles comunes"""
    
    # Obtener planes nutricionales disponibles
    nutrition_plans = {
        'lose_weight': NutritionPlan.objects.filter(
            goal='lose_weight', is_template=True, is_active=True
        ).first() or NutritionPlan.objects.filter(
            name__icontains='Pérdida', is_template=True, is_active=True
        ).first(),
        'gain_muscle': NutritionPlan.objects.filter(
            goal='gain_muscle', is_template=True, is_active=True
        ).first() or NutritionPlan.objects.filter(
            name__icontains='Ganancia', is_template=True, is_active=True
        ).first(),
        'body_recomposition': NutritionPlan.objects.filter(
            goal='body_recomposition', is_template=True, is_active=True
        ).first() or NutritionPlan.objects.filter(
            name__icontains='Recomposición', is_template=True, is_active=True
        ).first(),
        'maintain': NutritionPlan.objects.filter(
            goal='maintain', is_template=True, is_active=True
        ).first() or NutritionPlan.objects.filter(
            name__icontains='Mantenimiento', is_template=True, is_active=True
        ).first(),
    }
    
    # Obtener programas de entrenamiento disponibles
    workout_programs = {
        'lose_weight_gym': WorkoutProgram.objects.filter(
            goal='weight_loss', is_template=True, is_active=True
        ).first() or WorkoutProgram.objects.filter(
            name__icontains='Definición', is_template=True, is_active=True
        ).first(),
        'gain_muscle_gym': WorkoutProgram.objects.filter(
            goal='muscle_gain', is_template=True, is_active=True
        ).first() or WorkoutProgram.objects.filter(
            name__icontains='Full Body', is_template=True, is_active=True
        ).first(),
        'body_recomposition_gym': WorkoutProgram.objects.filter(
            goal='body_recomposition', is_template=True, is_active=True
        ).first() or WorkoutProgram.objects.filter(
            name__icontains='Glúteos', is_template=True, is_active=True
        ).first(),
        'maintain_gym': WorkoutProgram.objects.filter(
            goal='general_fitness', is_template=True, is_active=True
        ).first() or WorkoutProgram.objects.filter(
            name__icontains='Principiante', is_template=True, is_active=True
        ).first(),
        'lose_weight_home': WorkoutProgram.objects.filter(
            goal='weight_loss', location='home', is_template=True, is_active=True
        ).first(),
        'gain_muscle_home': WorkoutProgram.objects.filter(
            goal='muscle_gain', location='home', is_template=True, is_active=True
        ).first(),
    }
    
    # Configuraciones comunes a crear
    # Ordenadas por "nivel de especificidad" (más específicas primero)
    configurations_to_create = [
        # ============================================
        # CONFIGURACIONES ESPECÍFICAS (Alta prioridad)
        # ============================================
        
        # PÉRDIDA DE PESO
        {
            'name': 'Pérdida de Peso - Gimnasio - Activo',
            'description': 'Para usuarios que quieren perder peso, entrenan en gimnasio y tienen nivel de actividad alto',
            'priority': 10,
            'main_goal': 'lose_weight',
            'training_location': 'gym',
            'activity_level': 'active',
            'gender': None,
            'min_training_days_per_week': 4,
            'max_training_days_per_week': 6,
            'age_min': None,
            'age_max': None,
            'nutrition_plan': nutrition_plans.get('lose_weight'),
            'workout_program': workout_programs.get('lose_weight_gym'),
        },
        {
            'name': 'Pérdida de Peso - Gimnasio - Moderado',
            'description': 'Para usuarios que quieren perder peso, entrenan en gimnasio y tienen nivel de actividad moderado',
            'priority': 11,
            'main_goal': 'lose_weight',
            'training_location': 'gym',
            'activity_level': 'moderate',
            'gender': None,
            'min_training_days_per_week': 3,
            'max_training_days_per_week': 5,
            'age_min': None,
            'age_max': None,
            'nutrition_plan': nutrition_plans.get('lose_weight'),
            'workout_program': workout_programs.get('lose_weight_gym'),
        },
        {
            'name': 'Pérdida de Peso - Casa - Activo',
            'description': 'Para usuarios que quieren perder peso, entrenan en casa y tienen nivel de actividad alto',
            'priority': 12,
            'main_goal': 'lose_weight',
            'training_location': 'home',
            'activity_level': 'active',
            'gender': None,
            'min_training_days_per_week': 4,
            'max_training_days_per_week': 6,
            'age_min': None,
            'age_max': None,
            'nutrition_plan': nutrition_plans.get('lose_weight'),
            'workout_program': workout_programs.get('lose_weight_home') or workout_programs.get('lose_weight_gym'),
        },
        
        # GANANCIA MUSCULAR
        {
            'name': 'Ganancia Muscular - Gimnasio - Activo',
            'description': 'Para usuarios que quieren ganar músculo, entrenan en gimnasio y tienen nivel de actividad alto',
            'priority': 20,
            'main_goal': 'gain_muscle',
            'training_location': 'gym',
            'activity_level': 'active',
            'gender': None,
            'min_training_days_per_week': 4,
            'max_training_days_per_week': 6,
            'age_min': None,
            'age_max': None,
            'nutrition_plan': nutrition_plans.get('gain_muscle'),
            'workout_program': workout_programs.get('gain_muscle_gym'),
        },
        {
            'name': 'Ganancia Muscular - Gimnasio - Moderado',
            'description': 'Para usuarios que quieren ganar músculo, entrenan en gimnasio y tienen nivel de actividad moderado',
            'priority': 21,
            'main_goal': 'gain_muscle',
            'training_location': 'gym',
            'activity_level': 'moderate',
            'gender': None,
            'min_training_days_per_week': 3,
            'max_training_days_per_week': 5,
            'age_min': None,
            'age_max': None,
            'nutrition_plan': nutrition_plans.get('gain_muscle'),
            'workout_program': workout_programs.get('gain_muscle_gym'),
        },
        {
            'name': 'Ganancia Muscular - Casa - Activo',
            'description': 'Para usuarios que quieren ganar músculo, entrenan en casa y tienen nivel de actividad alto',
            'priority': 22,
            'main_goal': 'gain_muscle',
            'training_location': 'home',
            'activity_level': 'active',
            'gender': None,
            'min_training_days_per_week': 4,
            'max_training_days_per_week': 6,
            'age_min': None,
            'age_max': None,
            'nutrition_plan': nutrition_plans.get('gain_muscle'),
            'workout_program': workout_programs.get('gain_muscle_home') or workout_programs.get('gain_muscle_gym'),
        },
        
        # RECOMPOSICIÓN CORPORAL
        {
            'name': 'Recomposición Corporal - Gimnasio - Activo',
            'description': 'Para usuarios que quieren recomposición corporal, entrenan en gimnasio y tienen nivel de actividad alto',
            'priority': 30,
            'main_goal': 'body_recomposition',
            'training_location': 'gym',
            'activity_level': 'active',
            'gender': None,
            'min_training_days_per_week': 4,
            'max_training_days_per_week': 6,
            'age_min': None,
            'age_max': None,
            'nutrition_plan': nutrition_plans.get('body_recomposition'),
            'workout_program': workout_programs.get('body_recomposition_gym'),
        },
        {
            'name': 'Recomposición Corporal - Gimnasio - Moderado',
            'description': 'Para usuarios que quieren recomposición corporal, entrenan en gimnasio y tienen nivel de actividad moderado',
            'priority': 31,
            'main_goal': 'body_recomposition',
            'training_location': 'gym',
            'activity_level': 'moderate',
            'gender': None,
            'min_training_days_per_week': 3,
            'max_training_days_per_week': 5,
            'age_min': None,
            'age_max': None,
            'nutrition_plan': nutrition_plans.get('body_recomposition'),
            'workout_program': workout_programs.get('body_recomposition_gym'),
        },
        
        # MANTENIMIENTO
        {
            'name': 'Mantenimiento - Gimnasio - Moderado',
            'description': 'Para usuarios que quieren mantener su peso, entrenan en gimnasio y tienen nivel de actividad moderado',
            'priority': 40,
            'main_goal': 'maintain',
            'training_location': 'gym',
            'activity_level': 'moderate',
            'gender': None,
            'min_training_days_per_week': 2,
            'max_training_days_per_week': 4,
            'age_min': None,
            'age_max': None,
            'nutrition_plan': nutrition_plans.get('maintain'),
            'workout_program': workout_programs.get('maintain_gym'),
        },
        
        # ============================================
        # CONFIGURACIONES GENÉRICAS (Baja prioridad - Fallback)
        # ============================================
        
        {
            'name': 'Pérdida de Peso - General',
            'description': 'Configuración general para usuarios que quieren perder peso (sin restricciones específicas)',
            'priority': 100,
            'main_goal': 'lose_weight',
            'training_location': None,
            'activity_level': None,
            'gender': None,
            'min_training_days_per_week': None,
            'max_training_days_per_week': None,
            'age_min': None,
            'age_max': None,
            'nutrition_plan': nutrition_plans.get('lose_weight'),
            'workout_program': workout_programs.get('lose_weight_gym'),
        },
        {
            'name': 'Ganancia Muscular - General',
            'description': 'Configuración general para usuarios que quieren ganar músculo (sin restricciones específicas)',
            'priority': 110,
            'main_goal': 'gain_muscle',
            'training_location': None,
            'activity_level': None,
            'gender': None,
            'min_training_days_per_week': None,
            'max_training_days_per_week': None,
            'age_min': None,
            'age_max': None,
            'nutrition_plan': nutrition_plans.get('gain_muscle'),
            'workout_program': workout_programs.get('gain_muscle_gym'),
        },
        {
            'name': 'Recomposición Corporal - General',
            'description': 'Configuración general para usuarios que quieren recomposición corporal (sin restricciones específicas)',
            'priority': 120,
            'main_goal': 'body_recomposition',
            'training_location': None,
            'activity_level': None,
            'gender': None,
            'min_training_days_per_week': None,
            'max_training_days_per_week': None,
            'age_min': None,
            'age_max': None,
            'nutrition_plan': nutrition_plans.get('body_recomposition'),
            'workout_program': workout_programs.get('body_recomposition_gym'),
        },
        {
            'name': 'Mantenimiento - General',
            'description': 'Configuración general para usuarios que quieren mantener su peso (sin restricciones específicas)',
            'priority': 130,
            'main_goal': 'maintain',
            'training_location': None,
            'activity_level': None,
            'gender': None,
            'min_training_days_per_week': None,
            'max_training_days_per_week': None,
            'age_min': None,
            'age_max': None,
            'nutrition_plan': nutrition_plans.get('maintain'),
            'workout_program': workout_programs.get('maintain_gym'),
        },
    ]
    
    created_count = 0
    skipped_count = 0
    errors = []
    
    
    for config_data in configurations_to_create:
        # Verificar si ya existe una configuración similar
        existing = DefaultPlanConfiguration.objects.filter(
            name=config_data['name']
        ).first()
        
        if existing:
            skipped_count += 1
            continue
        
        # Extraer planes
        nutrition_plan = config_data.pop('nutrition_plan')
        workout_program = config_data.pop('workout_program')
        
        # Crear configuración
        try:
            config = DefaultPlanConfiguration.objects.create(**config_data)
            
            if nutrition_plan:
                config.default_nutrition_plan = nutrition_plan
            if workout_program:
                config.default_workout_program = workout_program
            
            config.save()
            
            if nutrition_plan:
            if workout_program:
            
            created_count += 1
        except Exception as e:
            error_msg = f"Error creando {config_data['name']}: {str(e)}"
            errors.append(error_msg)
    
    if errors:
    
    # Mostrar resumen por objetivo
    for goal in ['lose_weight', 'gain_muscle', 'body_recomposition', 'maintain']:
        count = DefaultPlanConfiguration.objects.filter(main_goal=goal, is_active=True).count()
        goal_name = {
            'lose_weight': 'Pérdida de Peso',
            'gain_muscle': 'Ganancia Muscular',
            'body_recomposition': 'Recomposición Corporal',
            'maintain': 'Mantenimiento'
        }.get(goal, goal)

if __name__ == '__main__':
    create_common_configurations()


