# accounts/services.py
# Servicios de asignación de planes - Versión mejorada
#
# Sistema de asignación automática basado en el perfil del usuario

from typing import Optional
from django.contrib.auth import get_user_model
import logging
import random

User = get_user_model()
logger = logging.getLogger(__name__)

NO_COMPATIBLE_NUTRITION_MESSAGE = (
    "No se encontró un plan nutricional compatible con tu perfil. "
    "Tu entrenador revisará tu caso y te asignará uno manualmente."
)
NO_COMPATIBLE_WORKOUT_MESSAGE = (
    "No se encontró un plan de entrenamiento compatible con tu perfil. "
    "Tu entrenador revisará tu caso y te asignará uno manualmente."
)
INVALID_TEMPLATE_NUTRITION_MESSAGE = (
    "La configuración encontrada no tiene una plantilla nutricional válida "
    "(debe ser una plantilla activa, no un plan de otro usuario ni del sistema)."
)
INVALID_TEMPLATE_WORKOUT_MESSAGE = (
    "La configuración encontrada no tiene una plantilla de entrenamiento válida "
    "(debe ser una plantilla activa, no un plan de otro usuario ni del sistema)."
)


def is_assignable_nutrition_template(plan) -> bool:
    """Plantilla nutricional válida como origen de asignación automática."""
    if plan is None or not plan.is_active:
        return False
    if plan.user_id is not None:
        return False
    if plan.is_system:
        return False
    return bool(plan.is_template)


def is_assignable_workout_template(program) -> bool:
    """Plantilla de entrenamiento válida como origen de asignación automática."""
    if program is None or not program.is_active:
        return False
    if program.user_id is not None:
        return False
    if program.is_system:
        return False
    return bool(program.is_template)

DAY_NUMBER_TO_WEEKDAY = {
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
    7: 'sunday',
}

DAY_NUMBER_TO_SPANISH = {
    1: 'Lunes',
    2: 'Martes',
    3: 'Miércoles',
    4: 'Jueves',
    5: 'Viernes',
    6: 'Sábado',
    7: 'Domingo',
}


def get_default_workout_program_for_user(user):
    """
    Obtiene una plantilla de entrenamiento por defecto para el usuario.
    Solo considera plantillas activas (no planes de sistema ni de otros usuarios).
    """
    from workouts.models import WorkoutProgram
    
    base_qs = WorkoutProgram.objects.filter(
        is_template=True,
        is_active=True,
        user__isnull=True,
        is_system=False,
    )
    
    filters = {}
    if user.main_goal:
        goal_map = {
            'lose_weight': 'weight_loss',
            'gain_muscle': 'muscle_gain',
            'body_recomposition': 'body_recomposition',
        }
        filters['goal'] = goal_map.get(user.main_goal, 'general_fitness')
    
    if user.training_days_per_week:
        filters['days_per_week'] = user.training_days_per_week
    
    program = base_qs.filter(**filters).first()
    if program:
        return program
    
    if filters:
        program = base_qs.filter(goal=filters.get('goal')).first()
        if program:
            return program
    
    return None


def get_default_nutrition_plan_for_user(user):
    """
    Obtiene una plantilla nutricional por defecto para el usuario.
    Solo considera plantillas activas (no planes de sistema ni de otros usuarios).
    """
    from nutrition.models import NutritionPlan
    
    base_qs = NutritionPlan.objects.filter(
        is_template=True,
        is_active=True,
        user__isnull=True,
        is_system=False,
    )
    
    filters = {}
    if user.main_goal:
        goal_map = {
            'lose_weight': 'lose_weight',
            'gain_muscle': 'gain_muscle',
            'body_recomposition': 'body_recomposition',
            'maintain': 'maintain',
        }
        filters['goal'] = goal_map.get(user.main_goal, 'maintain')
    
    if user.dietary_restrictions:
        if 'vegetarian' in user.dietary_restrictions:
            filters['diet_type'] = 'vegetarian'
        elif 'vegan' in user.dietary_restrictions:
            filters['diet_type'] = 'vegan'
    
    plan = base_qs.filter(**filters).first() if filters else None
    if plan:
        return plan
    
    if filters.get('goal'):
        plan = base_qs.filter(goal=filters['goal']).first()
        if plan:
            return plan
    
    return None


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


def get_admin_training_days_for_user(user):
    """
    Devuelve los días que deben mandar para un usuario.
    La configuración del perfil administrado tiene preferencia sobre la plantilla.
    """
    user_training_days = normalize_training_days(getattr(user, 'training_days', None))
    if user_training_days:
        return user_training_days

    days_per_week = getattr(user, 'training_days_per_week', None)
    if days_per_week:
        return list(DAY_NUMBER_TO_WEEKDAY.keys())[:int(days_per_week)]

    return []


def get_admin_days_per_week_for_user(user, fallback=3):
    admin_training_days = get_admin_training_days_for_user(user)
    if admin_training_days:
        return len(admin_training_days)

    days_per_week = getattr(user, 'training_days_per_week', None)
    if days_per_week:
        return int(days_per_week)

    return fallback or 3


def weekday_for_day_number(day_number):
    return DAY_NUMBER_TO_WEEKDAY.get(((int(day_number) - 1) % 7) + 1, 'monday')


def get_template_training_days_with_exercises(template_program):
    """Return template days that can safely become user training days."""
    from django.db.models import Count
    from workouts.models import WorkoutDay

    return list(
        WorkoutDay.objects.filter(
            program=template_program,
            is_rest_day=False,
        )
        .annotate(exercise_count=Count('exercises'))
        .filter(exercise_count__gt=0)
        .order_by('order_index', 'day_number')
    )


def copy_workout_day_exercises(source_day, target_day):
    from workouts.models import WorkoutDayExercise

    copied_count = 0
    for template_exercise in WorkoutDayExercise.objects.filter(
        workout_day=source_day
    ).order_by('order_index'):
        WorkoutDayExercise.objects.create(
            workout_day=target_day,
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
        copied_count += 1
    return copied_count


def assign_default_plans_to_user(user):
    """
    Asigna planes por defecto a un usuario nuevo.
    - Plan nutricional: cada comida con exactamente 3 recetas sugeridas
    - Plan de entrenamiento: ajustado a los días que el usuario marcó
    """
    from workouts.models import WorkoutProgram, WorkoutDay, WorkoutDayExercise
    from workouts.services import build_assigned_program_tags
    from nutrition.models import NutritionPlan, PlanMeal, Recipe
    from nutrition.services import select_compatible_recipes_for_meal
    from accounts.default_plan_display_names import (
        build_user_nutrition_plan_name,
        build_user_workout_plan_name,
        sanitize_plan_description,
        sanitize_workout_day_name,
    )
    from django.utils import timezone
    
    results = {'workout_program': None, 'nutrition_plan': None}
    
    # =========================================================================
    # ASIGNAR PLAN NUTRICIONAL
    # =========================================================================
    template = get_default_nutrition_plan_for_user(user)
    if template and is_assignable_nutrition_template(template):
        NutritionPlan.objects.filter(user=user, is_active=True).update(
            is_active=False,
            end_date=timezone.localdate(),
        )

        plan = NutritionPlan.objects.create(
            user=user,
            name=build_user_nutrition_plan_name(template, user),
            description=sanitize_plan_description(
                template.description,
                fallback="Menú semanal personalizado según tu perfil.",
            ),
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
                day_of_week=meal_template.day_of_week,
                week_number=getattr(meal_template, 'week_number', 1) or 1,
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

            selected_recipes = select_compatible_recipes_for_meal(user, meal_template)
            new_meal.suggested_recipes.set(selected_recipes)
        
        results['nutrition_plan'] = plan
    
    # =========================================================================
    # ASIGNAR PROGRAMA DE ENTRENAMIENTO
    # =========================================================================
    template = get_default_workout_program_for_user(user)
    if template and is_assignable_workout_template(template):
        WorkoutProgram.objects.filter(user=user, is_active=True).update(
            is_active=False,
            end_date=timezone.localdate(),
        )

        # La configuración del perfil administrado manda sobre los días de la plantilla.
        user_training_days = get_admin_training_days_for_user(user)
        days_per_week = get_admin_days_per_week_for_user(user, fallback=3)
        
        # Crear programa personalizado
        program = WorkoutProgram.objects.create(
            user=user,
            name=build_user_workout_plan_name(template, user),
            description=sanitize_plan_description(
                template.description,
                fallback="Programa de entrenamiento personalizado según tu perfil.",
            ),
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
            tags=build_assigned_program_tags(template),
        )
        
        # Obtener días del template
        template_days = list(WorkoutDay.objects.filter(
            program=template
        ).order_by('day_number'))
        template_training_days = get_template_training_days_with_exercises(template)
        
        if template_days:
            # Si el usuario tiene días específicos, asignar a esos días
            if user_training_days:
                source_days = template_training_days or template_days
                for i, user_day in enumerate(sorted(user_training_days)):
                    # Ciclar a través de los días del template
                    template_day = source_days[i % len(source_days)]
                    
                    # Crear día de entrenamiento
                    day_name = f"{DAY_NUMBER_TO_SPANISH.get(user_day, f'Día {user_day}')} · {sanitize_workout_day_name(template_day.name)}"
                    
                    new_day = WorkoutDay.objects.create(
                        program=program,
                        name=day_name,
                        day_number=user_day,
                        day_of_week=weekday_for_day_number(user_day),
                        is_rest_day=False,
                        notes=template_day.notes,
                        duration_minutes=template_day.duration_minutes,
                        focus=template_day.focus,
                        order_index=i + 1
                    )
                    
                    # Copiar ejercicios
                    copy_workout_day_exercises(template_day, new_day)
            else:
                # Si no hay días específicos, copiar del template directamente
                for template_day in template_days:
                    if not template_day.is_rest_day and template_day.exercises.count() == 0:
                        logger.warning(
                            "default_plan_assignment.skip_empty_template_day user_id=%s template_id=%s template_day_id=%s day_number=%s",
                            user.id,
                            template.id,
                            template_day.id,
                            template_day.day_number,
                        )
                        continue
                    new_day = WorkoutDay.objects.create(
                        program=program,
                        name=sanitize_workout_day_name(template_day.name),
                        day_number=template_day.day_number,
                        day_of_week=template_day.day_of_week or weekday_for_day_number(template_day.day_number),
                        is_rest_day=template_day.is_rest_day,
                        notes=template_day.notes,
                        duration_minutes=template_day.duration_minutes,
                        focus=template_day.focus,
                        order_index=template_day.order_index
                    )
                    
                    copy_workout_day_exercises(template_day, new_day)
        
        results['workout_program'] = program
    
    return results


class AssignmentResult:
    """Resultado de la asignación automática de planes"""
    def __init__(
        self,
        configuration=None,
        nutrition_plan=None,
        workout_program=None,
        nutrition_message=None,
        workout_message=None,
    ):
        self.configuration = configuration
        self.nutrition_plan = nutrition_plan
        self.workout_program = workout_program
        self.nutrition_message = nutrition_message
        self.workout_message = workout_message


class DefaultPlanAssignmentService:
    """
    Servicio para asignar planes automáticamente usando DefaultPlanConfiguration
    """
    def __init__(self, user):
        self.user = user

    def _is_auto_assigned_workout(self, program, template_program):
        if not program:
            return True
        if program.is_template or program.is_system:
            return True
        if template_program and program.name.startswith(f"{template_program.name} - "):
            return True
        if not program.created_by_id and " - " in program.name:
            return True
        return False
    
    def _iter_matching_configurations(self):
        """Generador de configuraciones que coinciden con el perfil, en orden de prioridad."""
        from dashboard.models import DefaultPlanConfiguration

        configurations = list(
            DefaultPlanConfiguration.objects.filter(is_active=True)
            .select_related('default_nutrition_plan', 'default_workout_program')
            .order_by('priority')
        )
        user_has_dietary_restrictions = bool(
            DefaultPlanConfiguration.user_dietary_restriction_terms(self.user)
        )
        seen_ids = set()

        def yield_unique(config):
            if config.id in seen_ids:
                return
            seen_ids.add(config.id)
            yield config

        if user_has_dietary_restrictions:
            for config in configurations:
                if config.dietary_restriction_terms() and config.matches_user_profile(self.user):
                    yield from yield_unique(config)

        for config in configurations:
            if config.matches_user_profile(self.user):
                yield from yield_unique(config)

        if self.user.main_goal:
            fallback_configurations = DefaultPlanConfiguration.objects.filter(
                is_active=True,
                main_goal=self.user.main_goal,
                gender__isnull=True,
                age_min__isnull=True,
            ).select_related(
                'default_nutrition_plan',
                'default_workout_program',
            ).order_by('priority')

            for config in fallback_configurations:
                if config.matches_user_profile(self.user):
                    yield from yield_unique(config)

        # Fallback final: configuraciones genéricas sin criterios estrictos de actividad/sexo/edad
        for config in configurations:
            if (
                not config.gender
                and not config.age_min
                and not config.age_max
                and (
                    not config.activity_level
                    or config.activity_level in DefaultPlanConfiguration.LEGACY_DIFFICULTY_ACTIVITY_LEVELS
                )
                and config.matches_user_profile(self.user)
            ):
                yield from yield_unique(config)

    def _configuration_specificity(self, configuration):
        """Mayor puntuación = configuración más específica (preferida en empates de prioridad)."""
        from dashboard.models import DefaultPlanConfiguration

        score = 0
        if configuration.main_goal:
            score += 1
        if configuration.training_location:
            score += 1
        if configuration.gender:
            score += 1
        if configuration.activity_level and configuration.activity_level not in DefaultPlanConfiguration.LEGACY_DIFFICULTY_ACTIVITY_LEVELS:
            score += 1
        if configuration.min_training_days_per_week or configuration.max_training_days_per_week:
            score += 1
        if configuration.age_min or configuration.age_max:
            score += 1
        if configuration.dietary_restriction_terms():
            score += 2
        return score

    def find_best_configuration(self):
        """Encontrar la mejor configuración con plantillas válidas para el usuario."""
        from accounts.default_plan_auto_provision import (
            ensure_configuration_for_user,
            ensure_fallback_configuration,
            find_exact_configuration,
            is_generic_configuration,
        )

        ensure_fallback_configuration()
        exact_configuration = find_exact_configuration(self.user)
        if not exact_configuration:
            ensure_configuration_for_user(self.user)

        best = None
        best_nutrition = None
        best_workout = None
        best_key = None

        for configuration in self._iter_matching_configurations():
            nutrition_template, workout_template = self._resolve_configuration_templates(configuration)
            if not (nutrition_template or workout_template):
                continue
            key = (
                configuration.priority,
                -self._configuration_specificity(configuration),
            )
            if best_key is None or key < best_key:
                best_key = key
                best = configuration
                best_nutrition = nutrition_template
                best_workout = workout_template

        if best and not is_generic_configuration(best):
            return best, best_nutrition, best_workout

        exact_configuration = find_exact_configuration(self.user)
        if exact_configuration:
            return self._resolve_configuration_templates_pair(exact_configuration)

        if best:
            return best, best_nutrition, best_workout
        return None, None, None

    def _resolve_configuration_templates_pair(self, configuration):
        nutrition_template, workout_template = self._resolve_configuration_templates(configuration)
        if nutrition_template or workout_template:
            return configuration, nutrition_template, workout_template
        return None, None, None

    def _resolve_configuration_templates(self, configuration):
        """Devuelve plantillas válidas de una configuración (ignora referencias inválidas)."""
        nutrition_template = None
        workout_template = None

        if configuration.default_nutrition_plan_id:
            if is_assignable_nutrition_template(configuration.default_nutrition_plan):
                nutrition_template = configuration.default_nutrition_plan
            else:
                logger.warning(
                    "default_plan_assignment.invalid_nutrition_template config_id=%s plan_id=%s user_id=%s is_template=%s is_system=%s owner_id=%s",
                    configuration.id,
                    configuration.default_nutrition_plan_id,
                    self.user.id,
                    getattr(configuration.default_nutrition_plan, 'is_template', None),
                    getattr(configuration.default_nutrition_plan, 'is_system', None),
                    getattr(configuration.default_nutrition_plan, 'user_id', None),
                )

        if configuration.default_workout_program_id:
            if is_assignable_workout_template(configuration.default_workout_program):
                workout_template = configuration.default_workout_program
            else:
                logger.warning(
                    "default_plan_assignment.invalid_workout_template config_id=%s program_id=%s user_id=%s is_template=%s is_system=%s owner_id=%s",
                    configuration.id,
                    configuration.default_workout_program_id,
                    self.user.id,
                    getattr(configuration.default_workout_program, 'is_template', None),
                    getattr(configuration.default_workout_program, 'is_system', None),
                    getattr(configuration.default_workout_program, 'user_id', None),
                )

        return nutrition_template, workout_template
    
    def assign(self):
        """Asignar planes al usuario basado en configuración"""
        from workouts.models import WorkoutProgram, WorkoutDay, WorkoutDayExercise
        from workouts.services import build_assigned_program_tags
        from nutrition.models import NutritionPlan, NutritionPlanAssignment, PlanMeal
        from nutrition.services import select_compatible_recipes_for_meal
        from django.utils import timezone
        from datetime import timedelta
        
        configuration, nutrition_template, workout_template = self.find_best_configuration()
        
        if not configuration:
            logger.info(
                "default_plan_assignment.no_compatible_configuration user_id=%s main_goal=%s training_days=%s",
                self.user.id,
                self.user.main_goal,
                self.user.training_days_per_week,
            )
            return AssignmentResult(
                nutrition_message=NO_COMPATIBLE_NUTRITION_MESSAGE,
                workout_message=NO_COMPATIBLE_WORKOUT_MESSAGE,
            )

        logger.info(
            "default_plan_assignment.start user_id=%s configuration_id=%s default_nutrition_plan_id=%s default_workout_program_id=%s",
            self.user.id,
            configuration.id,
            getattr(configuration.default_nutrition_plan, 'id', None),
            getattr(configuration.default_workout_program, 'id', None),
        )
        
        nutrition_plan = None
        workout_program = None
        nutrition_message = None
        workout_message = None

        if configuration.default_nutrition_plan_id and not nutrition_template:
            nutrition_message = INVALID_TEMPLATE_NUTRITION_MESSAGE
        if configuration.default_workout_program_id and not workout_template:
            workout_message = INVALID_TEMPLATE_WORKOUT_MESSAGE
        
        # =====================================================================
        # ASIGNAR PLAN NUTRICIONAL
        # =====================================================================
        if nutrition_template:
            template = nutrition_template
            from accounts.default_plan_display_names import (
                build_user_nutrition_plan_name,
                sanitize_plan_description,
            )

            deactivated_count = NutritionPlan.objects.filter(user=self.user, is_active=True).update(
                is_active=False,
                end_date=timezone.now().date(),
            )
            
            # Crear plan personalizado para el usuario
            nutrition_plan = NutritionPlan.objects.create(
                user=self.user,
                name=build_user_nutrition_plan_name(template, self.user),
                description=sanitize_plan_description(
                    template.description,
                    fallback="Menú semanal personalizado según tu perfil.",
                ),
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
            NutritionPlanAssignment.objects.update_or_create(
                plan=nutrition_plan,
                user=self.user,
                defaults={'is_active': True},
            )
            copied_meals_count = 0
            selected_recipes_count = 0
            
            # Copiar comidas del template con exactamente 3 recetas cada una
            for meal_template in template.meals.all():
                meal = PlanMeal.objects.create(
                    plan=nutrition_plan,
                    day_of_week=meal_template.day_of_week,
                    week_number=getattr(meal_template, 'week_number', 1) or 1,
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
                selected_recipes = select_compatible_recipes_for_meal(self.user, meal_template)
                meal.suggested_recipes.set(selected_recipes)
                copied_meals_count += 1
                selected_recipes_count += len(selected_recipes)

            logger.info(
                "default_plan_assignment.nutrition_created user_id=%s template_id=%s plan_id=%s deactivated_previous=%s meals_copied=%s recipes_selected=%s",
                self.user.id,
                template.id,
                nutrition_plan.id,
                deactivated_count,
                copied_meals_count,
                selected_recipes_count,
            )
            nutrition_message = f"Plan nutricional '{template.name}' asignado automáticamente"
        elif not nutrition_message:
            nutrition_message = NO_COMPATIBLE_NUTRITION_MESSAGE
        
        # =====================================================================
        # ASIGNAR PROGRAMA DE ENTRENAMIENTO
        # =====================================================================
        if workout_template:
            template_program = workout_template
            from accounts.default_plan_display_names import (
                build_user_workout_plan_name,
                sanitize_plan_description,
                sanitize_workout_day_name,
            )
            existing_active_workout = WorkoutProgram.objects.filter(
                user=self.user,
                is_active=True,
            ).order_by('-created_at').first()

            if existing_active_workout and not self._is_auto_assigned_workout(existing_active_workout, template_program):
                logger.info(
                    "default_plan_assignment.workout_preserved user_id=%s workout_program_id=%s template_id=%s",
                    self.user.id,
                    existing_active_workout.id,
                    template_program.id,
                )
                workout_program = existing_active_workout
                return AssignmentResult(
                    configuration=configuration,
                    nutrition_plan=nutrition_plan,
                    workout_program=workout_program,
                    nutrition_message=nutrition_message,
                    workout_message=workout_message or "Se conservó tu plan de entrenamiento personalizado",
                )

            deactivated_count = WorkoutProgram.objects.filter(user=self.user, is_active=True).update(
                is_active=False,
                end_date=timezone.now().date(),
            )
            
            # La configuración del perfil administrado manda sobre los días de la plantilla.
            user_training_days = get_admin_training_days_for_user(self.user)
            days_per_week = get_admin_days_per_week_for_user(self.user, fallback=template_program.days_per_week)
            
            # Crear programa personalizado
            workout_program = WorkoutProgram.objects.create(
                user=self.user,
                name=build_user_workout_plan_name(template_program, self.user),
                description=sanitize_plan_description(
                    template_program.description,
                    fallback="Programa de entrenamiento personalizado según tu perfil.",
                ),
                difficulty=template_program.difficulty,
                goal=template_program.goal,
                duration_weeks=template_program.duration_weeks,
                days_per_week=days_per_week,
                equipment_needed=template_program.equipment_needed,
                tags=build_assigned_program_tags(template_program),
                is_template=False,
                is_system=False,
                is_active=True,
                start_date=timezone.now().date(),
                created_by=None
            )
            
            # Copiar días de entrenamiento ajustados a los días del usuario
            template_days = list(WorkoutDay.objects.filter(
                program=template_program
            ).order_by('day_number'))
            template_training_days = get_template_training_days_with_exercises(template_program)
            
            if template_days:
                copied_days_count = 0
                copied_exercises_count = 0
                if user_training_days:
                    source_days = template_training_days or template_days
                    # Ajustar a los días específicos del usuario
                    for i, user_day in enumerate(sorted(user_training_days)):
                        template_day = source_days[i % len(source_days)]
                        
                        day_name = f"{DAY_NUMBER_TO_SPANISH.get(user_day, f'Día {user_day}')} · {sanitize_workout_day_name(template_day.name)}"
                        
                        new_day = WorkoutDay.objects.create(
                            program=workout_program,
                            name=day_name,
                            day_number=user_day,
                            day_of_week=weekday_for_day_number(user_day),
                            is_rest_day=False,
                            notes=template_day.notes,
                            duration_minutes=template_day.duration_minutes,
                            focus=template_day.focus,
                            order_index=i + 1
                        )
                        copied_days_count += 1
                        
                        copied_exercises_count += copy_workout_day_exercises(template_day, new_day)
                else:
                    # Copiar directamente del template
                    for template_day in template_days:
                        if not template_day.is_rest_day and template_day.exercises.count() == 0:
                            logger.warning(
                                "default_plan_assignment.skip_empty_template_day user_id=%s template_id=%s template_day_id=%s day_number=%s",
                                self.user.id,
                                template_program.id,
                                template_day.id,
                                template_day.day_number,
                            )
                            continue
                        new_day = WorkoutDay.objects.create(
                            program=workout_program,
                            name=sanitize_workout_day_name(template_day.name),
                            day_number=template_day.day_number,
                            day_of_week=template_day.day_of_week or weekday_for_day_number(template_day.day_number),
                            is_rest_day=template_day.is_rest_day,
                            notes=template_day.notes,
                            duration_minutes=template_day.duration_minutes,
                            focus=template_day.focus,
                            order_index=template_day.order_index
                        )
                        copied_days_count += 1
                        
                        copied_exercises_count += copy_workout_day_exercises(template_day, new_day)

                logger.info(
                    "default_plan_assignment.workout_created user_id=%s template_id=%s workout_program_id=%s deactivated_previous=%s days_copied=%s exercises_copied=%s",
                    self.user.id,
                    template_program.id,
                    workout_program.id,
                    deactivated_count,
                    copied_days_count,
                    copied_exercises_count,
                )
            workout_message = f"Plan de entrenamiento asignado automáticamente"
        elif not workout_message:
            workout_message = NO_COMPATIBLE_WORKOUT_MESSAGE
        
        return AssignmentResult(
            configuration=configuration,
            nutrition_plan=nutrition_plan,
            workout_program=workout_program,
            nutrition_message=nutrition_message,
            workout_message=workout_message,
        )
