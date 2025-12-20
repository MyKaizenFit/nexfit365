# accounts/services.py
# Servicios de asignación de planes - Versión mejorada
#
# Sistema de asignación automática basado en el perfil del usuario

from typing import Optional
from django.contrib.auth import get_user_model
import random

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


def normalize_training_days(training_days):
    """
    Normaliza los días de entrenamiento a formato numérico [1-7].
    Acepta tanto números como strings ('monday', 'tuesday', etc.)
    """
    if not training_days:
        return []
    
    day_map = {
        'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
        'friday': 5, 'saturday': 6, 'sunday': 7,
        'lunes': 1, 'martes': 2, 'miercoles': 3, 'miércoles': 3,
        'jueves': 4, 'viernes': 5, 'sabado': 6, 'sábado': 6, 'domingo': 7
    }
    
    normalized = []
    for day in training_days:
        if isinstance(day, int):
            if 1 <= day <= 7:
                normalized.append(day)
        elif isinstance(day, str):
            day_lower = day.lower()
            if day_lower in day_map:
                normalized.append(day_map[day_lower])
            elif day.isdigit():
                num = int(day)
                if 1 <= num <= 7:
                    normalized.append(num)
    
    return sorted(set(normalized))


def assign_default_plans_to_user(user):
    """
    Asigna planes por defecto a un usuario nuevo.
    - Plan nutricional: cada comida con exactamente 3 recetas sugeridas
    - Plan de entrenamiento: ajustado a los días que el usuario marcó
    """
    from workouts.models import WorkoutProgram, WorkoutDay, WorkoutDayExercise
    from nutrition.models import NutritionPlan, PlanMeal, Recipe
    from django.utils import timezone
    
    results = {'workout_program': None, 'nutrition_plan': None}
    
    # =========================================================================
    # ASIGNAR PLAN NUTRICIONAL
    # =========================================================================
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
        
        # Copiar comidas con exactamente 3 recetas cada una
        for meal_template in template.meals.all():
            new_meal = PlanMeal.objects.create(
                plan=plan,
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
            
            # Seleccionar exactamente 3 recetas de las sugeridas
            suggested_recipes = list(meal_template.suggested_recipes.filter(is_active=True))
            
            if len(suggested_recipes) >= 3:
                # Si hay 3 o más, seleccionar 3 aleatorias
                selected_recipes = random.sample(suggested_recipes, 3)
            elif len(suggested_recipes) > 0:
                # Si hay menos de 3, usar las que hay y completar con otras recetas del mismo tipo
                selected_recipes = suggested_recipes.copy()
                
                # Buscar recetas adicionales del mismo tipo de comida
                additional_recipes = Recipe.objects.filter(
                    is_active=True,
                    meal_type=meal_template.meal_type
                ).exclude(
                    id__in=[r.id for r in selected_recipes]
                ).order_by('?')[:3 - len(selected_recipes)]
                
                selected_recipes.extend(list(additional_recipes))
            else:
                # Si no hay recetas sugeridas, buscar por tipo de comida
                selected_recipes = list(Recipe.objects.filter(
                    is_active=True,
                    meal_type=meal_template.meal_type
                ).order_by('?')[:3])
            
            new_meal.suggested_recipes.set(selected_recipes)
        
        results['nutrition_plan'] = plan
    
    # =========================================================================
    # ASIGNAR PROGRAMA DE ENTRENAMIENTO
    # =========================================================================
    template = get_default_workout_program_for_user(user)
    if template:
        # Obtener días de entrenamiento del usuario (normalizados a números)
        user_training_days = normalize_training_days(user.training_days)
        days_per_week = len(user_training_days) if user_training_days else (user.training_days_per_week or 3)
        
        # Crear programa personalizado
        program = WorkoutProgram.objects.create(
            user=user,
            name=f"{template.name} - {user.first_name}",
            description=template.description,
            difficulty=template.difficulty,
            goal=template.goal,
            location=getattr(template, 'location', None),
            duration_weeks=template.duration_weeks,
            days_per_week=days_per_week,
            equipment_needed=template.equipment_needed,
            is_system=False,
            is_template=False,
            is_active=True,
            start_date=timezone.localdate(),
            created_by=None,
        )
        
        # Obtener días del template
        template_days = list(WorkoutDay.objects.filter(
            program=template
        ).order_by('day_number'))
        
        if template_days:
            # Mapeo de número de día a nombre
            day_names = {
                1: 'Lunes', 2: 'Martes', 3: 'Miércoles',
                4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo'
            }
            
            # Si el usuario tiene días específicos, asignar a esos días
            if user_training_days:
                for i, user_day in enumerate(sorted(user_training_days)):
                    # Ciclar a través de los días del template
                    template_day = template_days[i % len(template_days)]
                    
                    # Crear día de entrenamiento
                    day_name = f"{day_names.get(user_day, f'Día {user_day}')} - {template_day.name}"
                    
                    new_day = WorkoutDay.objects.create(
                        program=program,
                        name=day_name,
                        day_number=user_day,
                        is_rest_day=False,
                        notes=template_day.notes,
                        duration_minutes=template_day.duration_minutes,
                        focus=template_day.focus,
                        order_index=i + 1
                    )
                    
                    # Copiar ejercicios
                    for template_exercise in WorkoutDayExercise.objects.filter(
                        workout_day=template_day
                    ).order_by('order_index'):
                        WorkoutDayExercise.objects.create(
                            workout_day=new_day,
                            exercise=template_exercise.exercise,
                            sets=template_exercise.sets,
                            reps=template_exercise.reps,
                            weight=template_exercise.weight,
                            duration_seconds=template_exercise.duration_seconds,
                            rest_seconds=template_exercise.rest_seconds,
                            notes=template_exercise.notes,
                            order_index=template_exercise.order_index,
                            superset_group=template_exercise.superset_group
                        )
            else:
                # Si no hay días específicos, copiar del template directamente
                for template_day in template_days:
                    new_day = WorkoutDay.objects.create(
                        program=program,
                        name=template_day.name,
                        day_number=template_day.day_number,
                        is_rest_day=template_day.is_rest_day,
                        notes=template_day.notes,
                        duration_minutes=template_day.duration_minutes,
                        focus=template_day.focus,
                        order_index=template_day.order_index
                    )
                    
                    for template_exercise in WorkoutDayExercise.objects.filter(
                        workout_day=template_day
                    ).order_by('order_index'):
                        WorkoutDayExercise.objects.create(
                            workout_day=new_day,
                            exercise=template_exercise.exercise,
                            sets=template_exercise.sets,
                            reps=template_exercise.reps,
                            weight=template_exercise.weight,
                            duration_seconds=template_exercise.duration_seconds,
                            rest_seconds=template_exercise.rest_seconds,
                            notes=template_exercise.notes,
                            order_index=template_exercise.order_index,
                            superset_group=template_exercise.superset_group
                        )
        
        results['workout_program'] = program
    
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
        from workouts.models import WorkoutProgram, WorkoutDay, WorkoutDayExercise
        from nutrition.models import NutritionPlan, PlanMeal, Recipe
        from django.utils import timezone
        from datetime import timedelta
        import random
        
        # Encontrar la mejor configuración
        configuration = self.find_best_configuration()
        
        if not configuration:
            # Si no hay configuración, usar el método legacy
            results = assign_default_plans_to_user(self.user)
            return AssignmentResult(
                nutrition_plan=results.get('nutrition_plan'),
                workout_program=results.get('workout_program')
            )
        
        nutrition_plan = None
        workout_program = None
        
        # =====================================================================
        # ASIGNAR PLAN NUTRICIONAL
        # =====================================================================
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
                fiber_grams=getattr(template, 'fiber_grams', None),
                goal=template.goal,
                diet_type=template.diet_type,
                meals_per_day=template.meals_per_day,
                duration_weeks=template.duration_weeks,
                is_template=False,
                is_system=False,
                is_active=True,
                start_date=timezone.now().date(),
                end_date=timezone.now().date() + timedelta(weeks=template.duration_weeks) if template.duration_weeks else None,
                tags=template.tags if hasattr(template, 'tags') else [],
                created_by=self.user
            )
            
            # Copiar comidas del template con exactamente 3 recetas cada una
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
                
                # Seleccionar exactamente 3 recetas
                suggested_recipes = list(meal_template.suggested_recipes.filter(is_active=True))
                
                if len(suggested_recipes) >= 3:
                    selected_recipes = random.sample(suggested_recipes, 3)
                elif len(suggested_recipes) > 0:
                    selected_recipes = suggested_recipes.copy()
                    additional = Recipe.objects.filter(
                        is_active=True,
                        meal_type=meal_template.meal_type
                    ).exclude(
                        id__in=[r.id for r in selected_recipes]
                    ).order_by('?')[:3 - len(selected_recipes)]
                    selected_recipes.extend(list(additional))
                else:
                    selected_recipes = list(Recipe.objects.filter(
                        is_active=True,
                        meal_type=meal_template.meal_type
                    ).order_by('?')[:3])
                
                meal.suggested_recipes.set(selected_recipes)
        
        # =====================================================================
        # ASIGNAR PROGRAMA DE ENTRENAMIENTO
        # =====================================================================
        if configuration.default_workout_program:
            template_program = configuration.default_workout_program
            
            # Obtener días de entrenamiento del usuario (normalizados a números)
            user_training_days = normalize_training_days(self.user.training_days)
            days_per_week = len(user_training_days) if user_training_days else (self.user.training_days_per_week or template_program.days_per_week)
            
            # Crear programa personalizado
            workout_program = WorkoutProgram.objects.create(
                user=self.user,
                name=f"{template_program.name} - {self.user.first_name}",
                description=template_program.description,
                difficulty=template_program.difficulty,
                goal=template_program.goal,
                duration_weeks=template_program.duration_weeks,
                days_per_week=days_per_week,
                equipment_needed=template_program.equipment_needed,
                tags=template_program.tags if hasattr(template_program, 'tags') else [],
                is_template=False,
                is_active=True,
                start_date=timezone.now().date(),
                created_by=None
            )
            
            # Copiar días de entrenamiento ajustados a los días del usuario
            template_days = list(WorkoutDay.objects.filter(
                program=template_program
            ).order_by('day_number'))
            
            if template_days:
                day_names = {
                    1: 'Lunes', 2: 'Martes', 3: 'Miércoles',
                    4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo'
                }
                
                if user_training_days:
                    # Ajustar a los días específicos del usuario
                    for i, user_day in enumerate(sorted(user_training_days)):
                        template_day = template_days[i % len(template_days)]
                        
                        day_name = f"{day_names.get(user_day, f'Día {user_day}')} - {template_day.name}"
                        
                        new_day = WorkoutDay.objects.create(
                            program=workout_program,
                            name=day_name,
                            day_number=user_day,
                            is_rest_day=False,
                            notes=template_day.notes,
                            duration_minutes=template_day.duration_minutes,
                            focus=template_day.focus,
                            order_index=i + 1
                        )
                        
                        for template_exercise in WorkoutDayExercise.objects.filter(
                            workout_day=template_day
                        ).order_by('order_index'):
                            WorkoutDayExercise.objects.create(
                                workout_day=new_day,
                                exercise=template_exercise.exercise,
                                sets=template_exercise.sets,
                                reps=template_exercise.reps,
                                weight=template_exercise.weight,
                                duration_seconds=template_exercise.duration_seconds,
                                rest_seconds=template_exercise.rest_seconds,
                                notes=template_exercise.notes,
                                order_index=template_exercise.order_index,
                                superset_group=template_exercise.superset_group
                            )
                else:
                    # Copiar directamente del template
                    for template_day in template_days:
                        new_day = WorkoutDay.objects.create(
                            program=workout_program,
                            name=template_day.name,
                            day_number=template_day.day_number,
                            is_rest_day=template_day.is_rest_day,
                            notes=template_day.notes,
                            duration_minutes=template_day.duration_minutes,
                            focus=template_day.focus,
                            order_index=template_day.order_index
                        )
                        
                        for template_exercise in WorkoutDayExercise.objects.filter(
                            workout_day=template_day
                        ).order_by('order_index'):
                            WorkoutDayExercise.objects.create(
                                workout_day=new_day,
                                exercise=template_exercise.exercise,
                                sets=template_exercise.sets,
                                reps=template_exercise.reps,
                                weight=template_exercise.weight,
                                duration_seconds=template_exercise.duration_seconds,
                                rest_seconds=template_exercise.rest_seconds,
                                notes=template_exercise.notes,
                                order_index=template_exercise.order_index,
                                superset_group=template_exercise.superset_group
                            )
        
        return AssignmentResult(
            configuration=configuration,
            nutrition_plan=nutrition_plan,
            workout_program=workout_program
        )
