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
    Asigna planes por defecto a un usuario nuevo (método legacy).
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


class AssignmentResult:
    """Resultado de la asignación automática de planes"""
    def __init__(self, configuration=None, nutrition_plan=None, workout_program=None):
        self.configuration = configuration
        self.nutrition_plan = nutrition_plan
        self.workout_program = workout_program


class DefaultPlanAssignmentService:
    """
    Servicio para asignar planes automáticamente usando DefaultPlanConfiguration
    """
    def __init__(self, user):
        self.user = user
    
    def find_best_configuration(self):
        """Encontrar la mejor configuración para el usuario"""
        from dashboard.models import DefaultPlanConfiguration
        
        # Buscar configuraciones activas ordenadas por prioridad
        configurations = DefaultPlanConfiguration.objects.filter(
            is_active=True
        ).order_by('priority')
        
        # Buscar la primera que coincida con el perfil del usuario
        for config in configurations:
            if config.matches_user_profile(self.user):
                return config
        
        # Si no hay coincidencia exacta, buscar solo por objetivo
        if self.user.main_goal:
            config = DefaultPlanConfiguration.objects.filter(
                is_active=True,
                main_goal=self.user.main_goal,
                gender__isnull=True,  # Configuración genérica
                age_min__isnull=True,  # Sin restricción de edad
            ).order_by('priority').first()
            
            if config:
                return config
        
        # Como último recurso, devolver la configuración de mayor prioridad (menor número)
        return DefaultPlanConfiguration.objects.filter(is_active=True).order_by('priority').first()
    
    def assign(self):
        """Asignar planes al usuario basado en configuración"""
        from workouts.models import WorkoutProgram
        from nutrition.models import NutritionPlan, PlanMeal
        from django.utils import timezone
        from datetime import timedelta
        
        # Encontrar la mejor configuración
        configuration = self.find_best_configuration()
        
        if not configuration:
            return AssignmentResult()
        
        nutrition_plan = None
        workout_program = None
        
        # Asignar plan nutricional
        if configuration.default_nutrition_plan:
            template = configuration.default_nutrition_plan
            
            # Crear plan personalizado para el usuario
            nutrition_plan = NutritionPlan.objects.create(
                user=self.user,
                name=f"{template.name} - {self.user.first_name}",
                description=template.description,
                daily_calories=template.daily_calories,
                protein_grams=template.protein_grams,
                carbs_grams=template.carbs_grams,
                fat_grams=template.fat_grams,
                fiber_grams=template.fiber_grams,
                goal=template.goal,
                diet_type=template.diet_type,
                meals_per_day=template.meals_per_day,
                duration_weeks=template.duration_weeks,
                is_template=False,
                is_system=False,
                is_active=True,
                start_date=timezone.now().date(),
                end_date=timezone.now().date() + timedelta(weeks=template.duration_weeks),
                tags=template.tags,
                created_by=self.user
            )
            
            # Copiar comidas del template
            for meal_template in template.meals.all():
                meal = PlanMeal.objects.create(
                    plan=nutrition_plan,
                    name=meal_template.name,
                    meal_type=meal_template.meal_type,
                    time=meal_template.time,
                    calories=meal_template.calories,
                    protein=meal_template.protein,
                    carbs=meal_template.carbs,
                    fat=meal_template.fat,
                    description=meal_template.description,
                    order_index=meal_template.order_index
                )
                # Copiar recetas sugeridas
                meal.suggested_recipes.set(meal_template.suggested_recipes.all())
        
        # Asignar programa de entrenamiento
        if configuration.default_workout_program:
            template_program = configuration.default_workout_program
            
            # Crear programa personalizado para el usuario
            workout_program = WorkoutProgram.objects.create(
                user=self.user,
                name=f"{template_program.name} - {self.user.first_name}",
                description=template_program.description,
                difficulty=template_program.difficulty,
                goal=template_program.goal,
                duration_weeks=template_program.duration_weeks,
                days_per_week=template_program.days_per_week,
                equipment_needed=template_program.equipment_needed,
                tags=template_program.tags,
                is_template=False,
                is_active=True,
                start_date=timezone.now().date(),
                created_by=None
            )
        
        return AssignmentResult(
            configuration=configuration,
            nutrition_plan=nutrition_plan,
            workout_program=workout_program
        )
