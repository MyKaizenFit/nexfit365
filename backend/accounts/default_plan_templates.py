"""
Utilidades para copiar plantillas reales en plantillas separadas de asignación automática.

Las copias usan el prefijo [AUTO-DEFECTO] y quedan desvinculadas de los planes originales
para que el administrador pueda editarlas o borrarlas sin afectar plantillas de trabajo.

También admite copiar planes activos de usuarios y convertirlos en plantillas sin dueño.
"""

from __future__ import annotations

from typing import Optional

from django.db import transaction

AUTO_DEFAULT_PREFIX = "[AUTO-DEFECTO]"


def _auto_default_name(label: str) -> str:
    clean = (label or "").strip()
    if clean.startswith(AUTO_DEFAULT_PREFIX):
        return clean
    return f"{AUTO_DEFAULT_PREFIX} {clean}"


def find_source_nutrition_plan(name: str):
    from nutrition.models import NutritionPlan

    return (
        NutritionPlan.objects.filter(
            name=name,
            is_template=True,
            is_active=True,
            user__isnull=True,
            is_system=False,
        )
        .exclude(name__startswith=AUTO_DEFAULT_PREFIX)
        .order_by("-updated_at")
        .first()
    )


def find_source_workout_program(name: str):
    from workouts.models import WorkoutProgram

    return (
        WorkoutProgram.objects.filter(
            name=name,
            is_template=True,
            is_active=True,
            user__isnull=True,
            is_system=False,
        )
        .exclude(name__startswith=AUTO_DEFAULT_PREFIX)
        .order_by("-updated_at")
        .first()
    )


def find_nutrition_source_any(name: str):
    """Busca plantilla por nombre; si no existe, intenta un plan activo de usuario."""
    source = find_source_nutrition_plan(name)
    if source:
        return source

    from nutrition.models import NutritionPlan

    return (
        NutritionPlan.objects.filter(
            name=name,
            is_active=True,
            is_system=False,
            is_template=False,
            user__isnull=False,
        )
        .exclude(name__startswith=AUTO_DEFAULT_PREFIX)
        .order_by("-updated_at")
        .first()
    )


def find_workout_source_any(name: str):
    """Busca plantilla por nombre; si no existe, intenta un programa activo de usuario."""
    source = find_source_workout_program(name)
    if source:
        return source

    from workouts.models import WorkoutProgram

    return (
        WorkoutProgram.objects.filter(
            name=name,
            is_active=True,
            is_system=False,
            is_template=False,
            user__isnull=False,
        )
        .exclude(name__startswith=AUTO_DEFAULT_PREFIX)
        .order_by("-updated_at")
        .first()
    )


def _is_valid_nutrition_source(plan) -> bool:
    if not plan or not plan.is_active or plan.is_system:
        return False
    if (plan.name or "").startswith(AUTO_DEFAULT_PREFIX):
        return False
    return plan.meals.exists()


def _is_valid_workout_source(program) -> bool:
    if not program or not program.is_active or program.is_system:
        return False
    if (program.name or "").startswith(AUTO_DEFAULT_PREFIX):
        return False
    return any(
        not day.is_rest_day and day.exercises.exists()
        for day in program.days.all()
    )


@transaction.atomic
def copy_nutrition_plan_template(source, *, label: str):
    """Crea o reutiliza una plantilla nutricional separada para configuraciones por defecto."""
    from accounts.default_plan_display_names import sanitize_plan_description
    from nutrition.models import NutritionPlan, PlanMeal, PlanMealRecipe

    if not _is_valid_nutrition_source(source):
        raise ValueError("Plan nutricional origen inválido o sin comidas")

    copy_name = _auto_default_name(label)
    existing = NutritionPlan.objects.filter(
        name=copy_name,
        is_template=True,
        user__isnull=True,
        is_system=False,
    ).first()
    if existing:
        return existing, False

    description = sanitize_plan_description(
        source.description,
        fallback="Menú semanal personalizado asignado automáticamente.",
    )

    copied = NutritionPlan.objects.create(
        name=copy_name,
        description=description,
        daily_calories=source.daily_calories,
        protein_grams=source.protein_grams,
        carbs_grams=source.carbs_grams,
        fat_grams=source.fat_grams,
        fiber_grams=source.fiber_grams,
        protein_percentage=source.protein_percentage,
        carbs_percentage=source.carbs_percentage,
        fat_percentage=source.fat_percentage,
        goal=source.goal,
        diet_type=source.diet_type,
        meals_per_day=source.meals_per_day,
        duration_weeks=source.duration_weeks,
        portion_multiplier=source.portion_multiplier,
        is_template=True,
        is_system=False,
        is_active=True,
        tags=list(set((source.tags or []) + ["auto_default", "auto_default_nutrition"])),
        image_url=source.image_url,
        created_by=None,
    )

    for source_meal in source.meals.prefetch_related(
        "suggested_recipes",
        "meal_recipes__recipe",
    ).order_by("day_of_week", "order_index", "created_at"):
        copied_meal = PlanMeal.objects.create(
            plan=copied,
            day_of_week=source_meal.day_of_week,
            week_number=max(1, int(getattr(source_meal, "week_number", 1) or 1)),
            name=source_meal.name,
            meal_type=source_meal.meal_type,
            time=source_meal.time,
            calories=source_meal.calories,
            protein=source_meal.protein,
            carbs=source_meal.carbs,
            fat=source_meal.fat,
            description=source_meal.description,
            order_index=source_meal.order_index,
        )
        copied_meal.suggested_recipes.set(source_meal.suggested_recipes.all())
        for meal_recipe in source_meal.meal_recipes.all():
            PlanMealRecipe.objects.create(
                meal=copied_meal,
                recipe=meal_recipe.recipe,
                servings=meal_recipe.servings,
                custom_calories=meal_recipe.custom_calories,
                custom_protein=meal_recipe.custom_protein,
                custom_carbs=meal_recipe.custom_carbs,
                custom_fat=meal_recipe.custom_fat,
                display_order=meal_recipe.display_order,
            )

    return copied, True


@transaction.atomic
def copy_workout_program_template(source, *, label: str):
    """Crea o reutiliza una plantilla de entrenamiento separada para configuraciones por defecto."""
    from accounts.default_plan_display_names import sanitize_plan_description, sanitize_workout_day_name
    from accounts.services import copy_workout_day_exercises
    from workouts.models import WorkoutDay, WorkoutProgram

    if not _is_valid_workout_source(source):
        raise ValueError("Programa de entrenamiento origen inválido o sin ejercicios")

    copy_name = _auto_default_name(label)
    existing = WorkoutProgram.objects.filter(
        name=copy_name,
        is_template=True,
        user__isnull=True,
        is_system=False,
    ).first()
    if existing:
        return existing, False

    description = sanitize_plan_description(
        source.description,
        fallback="Programa de entrenamiento personalizado asignado automáticamente.",
    )

    copied = WorkoutProgram.objects.create(
        name=copy_name,
        description=description,
        difficulty=source.difficulty,
        goal=source.goal,
        location=source.location,
        duration_weeks=source.duration_weeks,
        days_per_week=source.days_per_week,
        estimated_duration_minutes=source.estimated_duration_minutes,
        equipment_needed=source.equipment_needed or [],
        is_template=True,
        is_system=False,
        is_active=True,
        tags=list(set((source.tags or []) + ["auto_default", "auto_default_workout"])),
        created_by=None,
    )

    for source_day in source.days.prefetch_related("exercises").order_by("day_number", "order_index"):
        copied_day = WorkoutDay.objects.create(
            program=copied,
            name=sanitize_workout_day_name(source_day.name),
            day_number=source_day.day_number,
            day_of_week=source_day.day_of_week,
            is_rest_day=source_day.is_rest_day,
            notes=source_day.notes,
            duration_minutes=source_day.duration_minutes,
            focus=source_day.focus,
            order_index=source_day.order_index,
        )
        copy_workout_day_exercises(source_day, copied_day)

    return copied, True


def get_or_copy_nutrition_template(source_name: str, label: str):
    source = find_nutrition_source_any(source_name)
    if not source:
        return None, None
    copied, created = copy_nutrition_plan_template(source, label=label)
    return copied, created


def get_or_copy_workout_template(source_name: str, label: str):
    source = find_workout_source_any(source_name)
    if not source:
        return None, None
    copied, created = copy_workout_program_template(source, label=label)
    return copied, created
