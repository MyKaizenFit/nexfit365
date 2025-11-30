# accounts/services.py
# Servicios de asignación de planes - Versión simplificada
#
# El sistema de DefaultPlanConfiguration fue eliminado.
# Ahora la asignación de planes se hace directamente desde WorkoutProgram y NutritionPlan
# usando los flags is_template e is_system.

from typing import Optional
from django.contrib.auth import get_user_model

User = get_user_model()


def get_default_workout_program_for_user(user):
    """
    Obtiene un programa de entrenamiento por defecto para el usuario
    basado en sus preferencias (goal, days_per_week, location).
    """
    from workouts.models import WorkoutProgram
    
    # Buscar un programa que coincida con las preferencias del usuario
    filters = {'is_system': True, 'is_active': True}
    
    if user.main_goal:
        goal_map = {
            'lose_weight': 'weight_loss',
            'gain_muscle': 'muscle_gain',
            'body_recomposition': 'body_recomposition',
        }
        filters['goal'] = goal_map.get(user.main_goal, 'general_fitness')
    
    if user.training_days_per_week:
        filters['days_per_week'] = user.training_days_per_week
    
    program = WorkoutProgram.objects.filter(**filters).first()
    
    # Si no hay coincidencia, buscar cualquier programa del sistema
    if not program:
        program = WorkoutProgram.objects.filter(
            is_system=True, is_active=True
        ).first()
    
    return program


def get_default_nutrition_plan_for_user(user):
    """
    Obtiene un plan de nutrición por defecto para el usuario
    basado en sus preferencias (goal, diet_type, daily_calories).
    """
    from nutrition.models import NutritionPlan
    
    filters = {'is_system': True, 'is_active': True}
    
    if user.main_goal:
        goal_map = {
            'lose_weight': 'lose_weight',
            'gain_muscle': 'gain_muscle',
            'body_recomposition': 'body_recomposition',
            'maintain': 'maintain',
        }
        filters['goal'] = goal_map.get(user.main_goal, 'maintain')
    
    # Buscar por restricciones dietéticas
    if user.dietary_restrictions:
        if 'vegetarian' in user.dietary_restrictions:
            filters['diet_type'] = 'vegetarian'
        elif 'vegan' in user.dietary_restrictions:
            filters['diet_type'] = 'vegan'
    
    plan = NutritionPlan.objects.filter(**filters).first()
    
    # Si no hay coincidencia, buscar cualquier plan del sistema
    if not plan:
        plan = NutritionPlan.objects.filter(
            is_system=True, is_active=True
        ).first()
    
    return plan


def assign_default_plans_to_user(user):
    """
    Asigna planes por defecto a un usuario nuevo.
    """
    from workouts.models import WorkoutProgram
    from nutrition.models import NutritionPlan
    from django.utils import timezone
    
    results = {'workout_program': None, 'nutrition_plan': None}
    
    # Asignar programa de entrenamiento
    template = get_default_workout_program_for_user(user)
    if template:
        # Crear una copia del programa para el usuario
        program = WorkoutProgram.objects.create(
            user=user,
            name=f"{template.name} - {user.first_name}",
            description=template.description,
            difficulty=template.difficulty,
            goal=template.goal,
            location=template.location,
            duration_weeks=template.duration_weeks,
            days_per_week=template.days_per_week,
            equipment_needed=template.equipment_needed,
            is_system=False,
            is_template=False,
            is_active=True,
            start_date=timezone.localdate(),
            created_by=None,
        )
        results['workout_program'] = program
    
    # Asignar plan de nutrición
    template = get_default_nutrition_plan_for_user(user)
    if template:
        plan = NutritionPlan.objects.create(
            user=user,
            name=f"{template.name} - {user.first_name}",
            description=template.description,
            daily_calories=template.daily_calories,
            protein_grams=template.protein_grams,
            carbs_grams=template.carbs_grams,
            fat_grams=template.fat_grams,
            goal=template.goal,
            diet_type=template.diet_type,
            meals_per_day=template.meals_per_day,
            is_system=False,
            is_template=False,
            is_active=True,
            start_date=timezone.localdate(),
            created_by=None,
        )
        results['nutrition_plan'] = plan
    
    return results
