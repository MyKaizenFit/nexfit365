"""
Provisionado automático de configuraciones por defecto según el perfil del usuario.

Cada perfil nuevo que no tenga una regla exacta genera una entrada en
DefaultPlanConfiguration con plantillas [AUTO-DEFECTO] (copias separadas).
Con el tiempo el listado crece solo, sin depender del comando seed.
"""

from __future__ import annotations

import logging
from typing import Callable, Optional

from django.db import transaction

from accounts.default_plan_templates import (
    AUTO_DEFAULT_PREFIX,
    copy_nutrition_plan_template,
    copy_workout_program_template,
    find_nutrition_source_any,
    find_workout_source_any,
    _is_valid_nutrition_source,
    _is_valid_workout_source,
)
from dashboard.models import DefaultPlanConfiguration, canonical_dietary_restrictions

logger = logging.getLogger(__name__)

GOAL_LABELS = {
    "lose_weight": "Perder peso",
    "gain_muscle": "Ganar músculo",
    "body_recomposition": "Recomposición",
    "maintain": "Mantener",
    "performance": "Rendimiento",
}

LOCATION_LABELS = {
    "home": "Casa",
    "gym": "Gimnasio",
    "outdoor": "Exterior",
}

ACTIVITY_LABELS = {
    "sedentary": "Sedentario",
    "light": "Ligero",
    "moderate": "Moderado",
    "active": "Activo",
    "very_active": "Muy activo",
}

GENDER_LABELS = {
    "female": "Mujer",
    "male": "Hombre",
    "other": "Otro",
}

# Nutrición por restricción alimentaria
NUTRITION_DIETARY_CANDIDATES = {
    "dairy_free": [
        "MENÚ SIN LACTOSA I",
        "MENÚ SIN LACTOSA",
    ],
    "gluten_free": [
        "MENÚ APTO PARA CELÍACOS",
        "MENÚ SIN GLUTEN",
    ],
}

# Nutrición por objetivo (plantillas reales del catálogo)
NUTRITION_GOAL_CANDIDATES = {
    "lose_weight": [
        "Dieta Flexible Personalizada",
        "MENÚ DE 3 COMIDAS ADAPTADO",
    ],
    "gain_muscle": [
        "Segundo Menú Personalizado!",
        "Dieta Flexible Personalizada",
    ],
    "body_recomposition": [
        "Dieta Flexible Personalizada",
        "Segundo Menú Personalizado!",
    ],
    "maintain": [
        "Dieta Flexible Personalizada",
    ],
    "performance": [
        "Segundo Menú Personalizado!",
        "Dieta Flexible Personalizada",
    ],
}

NUTRITION_GENERAL_FALLBACK = [
    "Dieta Flexible Personalizada",
    "PLANTILLA EN BLANCO 100%",
]

# Reglas de entrenamiento: las más específicas primero
WorkoutRule = tuple[Callable, list[str]]

WORKOUT_SELECTION_RULES: list[WorkoutRule] = [
    # Exterior
    (
        lambda user, days, goal: user.training_location == "outdoor" and goal == "gain_muscle" and user.gender == "male",
        [
            "FUERZA MARC! (Copia)",
            "Fuerte y Definido en 12 semanas",
            "PROGRESIÓN DE 4 SEMANAS!",
            "¡AUMENTA TU POMPOSO IV!",
        ],
    ),
    (
        lambda user, days, goal: user.training_location == "outdoor" and goal == "gain_muscle",
        [
            "Fuerte y Definido en 12 semanas",
            "PROGRESIÓN DE 4 SEMANAS!",
            "¡AUMENTA TU POMPOSO III!",
            "¡AUMENTA TU POMPOSO II!",
        ],
    ),
    (
        lambda user, days, goal: user.training_location == "outdoor" and goal == "lose_weight",
        [
            "PROGRESIÓN DE 4 SEMANAS!",
            "BAJA DE PESO DESDE CASA!!!",
            "Laura Power",
            "¡AUMENTA TU POMPOSO I!",
        ],
    ),
    (
        lambda user, days, goal: user.training_location == "outdoor",
        [
            "PROGRESIÓN DE 4 SEMANAS!",
            "BAJA DE PESO DESDE CASA!!!",
            "Laura Power",
            "Fuerte y Definido en 12 semanas",
        ],
    ),
    # Casa
    (
        lambda user, days, goal: user.training_location == "home" and goal == "lose_weight",
        [
            "BAJA DE PESO DESDE CASA!!!",
            "SEMANA EN CASA- Ainara Ocaña Lopez",
            "PROGRESIÓN DE 4 SEMANAS!",
        ],
    ),
    (
        lambda user, days, goal: user.training_location == "home" and goal == "body_recomposition",
        [
            "BAJA DE PESO DESDE CASA!!!",
            "PROGRESIÓN DE 4 SEMANAS!",
            "Laura Power",
        ],
    ),
    (
        lambda user, days, goal: user.training_location == "home",
        [
            "BAJA DE PESO DESDE CASA!!!",
            "SEMANA EN CASA- Ainara Ocaña Lopez",
            "PROGRESIÓN DE 4 SEMANAS!",
            "Laura Power",
        ],
    ),
    # Recomposición en gimnasio
    (
        lambda user, days, goal: user.training_location == "gym" and goal == "body_recomposition" and user.gender == "female",
        [
            "MUJER3DÍASGYMRECOMPOSICION",
            "Ponte en forma Irene!",
            "PONTE EN FORMA CON 4 DÍAS!",
        ],
    ),
    (
        lambda user, days, goal: user.training_location == "gym" and goal == "body_recomposition" and user.gender == "male",
        [
            "Fuerte y Definido en 12 semanas",
            "FUERZA MARC! (Copia)",
            "PROGRESIÓN DE 4 SEMANAS!",
            "¡AUMENTA TU POMPOSO II!",
        ],
    ),
    (
        lambda user, days, goal: user.training_location == "gym" and goal == "body_recomposition",
        [
            "MUJER3DÍASGYMRECOMPOSICION",
            "Fuerte y Definido en 12 semanas",
            "PONTE EN FORMA CON 4 DÍAS!",
        ],
    ),
    # Ganar músculo en gimnasio
    (
        lambda user, days, goal: user.training_location == "gym" and goal == "gain_muscle" and user.gender == "male" and days is not None and days >= 5,
        [
            "FUERZA MARC! (Copia)",
            "¡AUMENTA TU POMPOSO IV!",
            "¡AUMENTA TU POMPOSO III!",
        ],
    ),
    (
        lambda user, days, goal: user.training_location == "gym" and goal == "gain_muscle" and user.gender == "male",
        [
            "FUERZA MARC! (Copia)",
            "Fuerte y Definido en 12 semanas",
            "¡AUMENTA TU POMPOSO II!",
            "¡AUMENTA TU POMPOSO III!",
        ],
    ),
    (
        lambda user, days, goal: user.training_location == "gym" and goal == "gain_muscle" and days is not None and days >= 5,
        [
            "¡AUMENTA TU POMPOSO IV!",
            "¡AUMENTA TU POMPOSO III!",
            "PONTE EN FORMA CON 4 DÍAS!",
        ],
    ),
    (
        lambda user, days, goal: user.training_location == "gym" and goal == "gain_muscle",
        [
            "¡AUMENTA TU POMPOSO II!",
            "¡AUMENTA TU POMPOSO III!",
            "FUERZA MARC! (Copia)",
            "Fuerte y Definido en 12 semanas",
        ],
    ),
    # Perder peso en gimnasio por frecuencia
    (
        lambda user, days, goal: user.training_location == "gym" and goal == "lose_weight" and days is not None and days >= 5,
        [
            "¡AUMENTA TU POMPOSO IV!",
            "¡AUMENTA TU POMPOSO III!",
            "PONTE EN FORMA CON 4 DÍAS!",
        ],
    ),
    (
        lambda user, days, goal: user.training_location == "gym" and goal == "lose_weight" and days == 4,
        [
            "¡AUMENTA TU POMPOSO II!",
            "PONTE EN FORMA CON 4 DÍAS!",
            "Patricia a por todas!!!",
        ],
    ),
    (
        lambda user, days, goal: user.training_location == "gym" and goal == "lose_weight",
        [
            "¡AUMENTA TU POMPOSO I!",
            "Laura Power",
            "Vamos Miriam!!!",
        ],
    ),
    # Gimnasio por días (sin objetivo concreto)
    (
        lambda user, days, goal: user.training_location == "gym" and days is not None and days >= 5,
        [
            "¡AUMENTA TU POMPOSO IV!",
            "¡AUMENTA TU POMPOSO III!",
        ],
    ),
    (
        lambda user, days, goal: user.training_location == "gym" and days == 4,
        [
            "¡AUMENTA TU POMPOSO II!",
            "PONTE EN FORMA CON 4 DÍAS!",
        ],
    ),
    (
        lambda user, days, goal: user.training_location == "gym",
        [
            "¡AUMENTA TU POMPOSO I!",
            "Laura Power",
            "PROGRESIÓN DE 4 SEMANAS!",
        ],
    ),
    # Rendimiento / mantenimiento
    (
        lambda user, days, goal: goal == "performance",
        [
            "Fuerte y Definido en 12 semanas",
            "PROGRESIÓN DE 4 SEMANAS!",
            "¡AUMENTA TU POMPOSO II!",
        ],
    ),
    (
        lambda user, days, goal: goal == "maintain",
        [
            "PROGRESIÓN DE 4 SEMANAS!",
            "Laura Power",
            "¡AUMENTA TU POMPOSO I!",
        ],
    ),
    # Fallback global por días
    (
        lambda user, days, goal: days is not None and days >= 5,
        ["¡AUMENTA TU POMPOSO IV!", "¡AUMENTA TU POMPOSO III!"],
    ),
    (
        lambda user, days, goal: days == 4,
        ["¡AUMENTA TU POMPOSO II!", "PONTE EN FORMA CON 4 DÍAS!"],
    ),
    (
        lambda user, days, goal: True,
        ["¡AUMENTA TU POMPOSO I!", "BAJA DE PESO DESDE CASA!!!", "PROGRESIÓN DE 4 SEMANAS!"],
    ),
]

GENERIC_FALLBACK_PRIORITY = 900


def get_user_training_days_per_week(user) -> Optional[int]:
    if user.training_days_per_week:
        return int(user.training_days_per_week)
    training_days = getattr(user, "training_days", None) or []
    if training_days:
        return len(training_days)
    return None


def get_user_dietary_terms(user) -> list[str]:
    return sorted(DefaultPlanConfiguration.user_dietary_restriction_terms(user))


def normalize_user_main_goal(user) -> Optional[str]:
    if not user.main_goal:
        return None
    return DefaultPlanConfiguration.normalize_main_goal(user.main_goal)


def _pick_first_available(names: list[str], finder) -> Optional[str]:
    for name in names:
        if finder(name):
            return name
    return None


def pick_nutrition_source_name(user) -> Optional[str]:
    terms = set(get_user_dietary_terms(user))
    if terms & {"dairy_free"}:
        picked = _pick_first_available(NUTRITION_DIETARY_CANDIDATES["dairy_free"], find_nutrition_source_any)
        if picked:
            return picked
    if terms & {"gluten_free"}:
        picked = _pick_first_available(NUTRITION_DIETARY_CANDIDATES["gluten_free"], find_nutrition_source_any)
        if picked:
            return picked

    goal = normalize_user_main_goal(user)
    if goal and goal in NUTRITION_GOAL_CANDIDATES:
        picked = _pick_first_available(NUTRITION_GOAL_CANDIDATES[goal], find_nutrition_source_any)
        if picked:
            return picked

    picked = _pick_first_available(NUTRITION_GENERAL_FALLBACK, find_nutrition_source_any)
    if picked:
        return picked

    return _find_best_nutrition_fallback(user)


def pick_workout_source_name(user) -> Optional[str]:
    days = get_user_training_days_per_week(user)
    goal = normalize_user_main_goal(user)

    for predicate, candidates in WORKOUT_SELECTION_RULES:
        if predicate(user, days, goal):
            picked = _pick_first_available(candidates, find_workout_source_any)
            if picked:
                return picked

    return _find_best_workout_fallback(user)


def _nutrition_goal_score(plan, user) -> int:
    goal = normalize_user_main_goal(user)
    score = 0
    if plan.meals.exists():
        score += plan.meals.count()
    with_recipes = sum(1 for meal in plan.meals.all() if meal.suggested_recipes.exists())
    score += with_recipes * 3
    if goal and plan.goal == goal:
        score += 40
    elif goal == "lose_weight" and plan.goal in {"lose_weight", "maintain"}:
        score += 20
    elif goal == "gain_muscle" and plan.goal in {"gain_muscle", "maintain"}:
        score += 20
    return score


def _workout_profile_score(program, user, days: Optional[int]) -> int:
    name = (program.name or "").lower()
    description = (program.description or "").lower()
    text = f"{name} {description}"
    goal = normalize_user_main_goal(user)
    score = 0

    training_days = [
        day for day in program.days.all()
        if not day.is_rest_day and day.exercises.exists()
    ]
    training_day_count = len(training_days)
    if training_day_count:
        score += min(training_day_count, 7) * 4

    if days is not None:
        if training_day_count >= days:
            score += 25
        elif abs(training_day_count - days) <= 1:
            score += 12

    location = user.training_location
    if location == "home" and any(token in text for token in ("casa", "home")):
        score += 35
    elif location == "outdoor" and any(token in text for token in ("casa", "exterior", "outdoor", "aire libre", "progresion")):
        score += 30
    elif location == "gym" and any(token in text for token in ("pomposo", "gym", "gimnasio", "fuerza", "forma")):
        score += 25

    if goal == "lose_weight" and any(token in text for token in ("peso", "pomposo", "forma")):
        score += 25
    elif goal == "gain_muscle" and any(token in text for token in ("fuerza", "pomposo", "fuerte", "muscul")):
        score += 25
    elif goal == "body_recomposition" and any(token in text for token in ("recomp", "mujer", "fuerte", "definido")):
        score += 25

    if user.gender == "male" and "mujer" in text:
        score -= 20
    elif user.gender == "female" and "mujer" in text:
        score += 10

    if any(token in name for token in ("pomposo", "baja de peso", "progresion", "fuerza marc", "mujer3dias")):
        score += 15

    return score


def _find_best_nutrition_fallback(user):
    from django.db.models import Q
    from nutrition.models import NutritionPlan

    candidates = (
        NutritionPlan.objects.filter(
            is_active=True,
            is_system=False,
        )
        .exclude(name__startswith=AUTO_DEFAULT_PREFIX)
        .filter(
            Q(user__isnull=True, is_template=True)
            | Q(user__isnull=False, is_template=False)
        )
        .order_by("-updated_at")
    )
    best = None
    best_score = -1
    for plan in candidates:
        if not _is_valid_nutrition_source(plan):
            continue
        score = _nutrition_goal_score(plan, user)
        if score > best_score:
            best_score = score
            best = plan
    return best.name if best else None


def _find_best_workout_fallback(user):
    from django.db.models import Q
    from workouts.models import WorkoutProgram

    days = get_user_training_days_per_week(user)
    candidates = (
        WorkoutProgram.objects.filter(
            is_active=True,
            is_system=False,
        )
        .exclude(name__startswith=AUTO_DEFAULT_PREFIX)
        .filter(
            Q(user__isnull=True, is_template=True)
            | Q(user__isnull=False, is_template=False)
        )
        .prefetch_related("days__exercises")
        .order_by("-updated_at")
    )
    best = None
    best_score = -1
    for program in candidates:
        if not _is_valid_workout_source(program):
            continue
        score = _workout_profile_score(program, user, days)
        if score > best_score:
            best_score = score
            best = program
    return best.name if best else None


def build_configuration_name(user) -> str:
    parts = [AUTO_DEFAULT_PREFIX]
    main_goal = normalize_user_main_goal(user)
    if main_goal:
        parts.append(GOAL_LABELS.get(main_goal, main_goal))

    if user.training_location:
        parts.append(LOCATION_LABELS.get(user.training_location, user.training_location))

    days = get_user_training_days_per_week(user)
    if days:
        parts.append(f"{days} días/sem")

    if user.gender:
        parts.append(GENDER_LABELS.get(user.gender, user.gender))

    if user.activity_level:
        parts.append(ACTIVITY_LABELS.get(user.activity_level, user.activity_level))

    terms = get_user_dietary_terms(user)
    if "dairy_free" in terms:
        parts.append("sin lactosa")
    if "gluten_free" in terms:
        parts.append("sin gluten")

    return " · ".join(parts)


def build_configuration_priority(user) -> int:
    """Menor número = mayor prioridad. Auto-generadas quedan entre 20 y 180."""
    priority = 180
    if normalize_user_main_goal(user):
        priority -= 20
    if user.training_location:
        priority -= 20
    days = get_user_training_days_per_week(user)
    if days:
        priority -= 15
    if user.gender:
        priority -= 10
    if user.activity_level:
        priority -= 10
    if get_user_dietary_terms(user):
        priority -= 25
    return max(20, priority)


def build_template_labels(user) -> tuple[str, str]:
    terms = set(get_user_dietary_terms(user))
    if "dairy_free" in terms:
        nutrition_label = "Nutrición sin lactosa"
    elif "gluten_free" in terms:
        nutrition_label = "Nutrición sin gluten"
    else:
        goal = normalize_user_main_goal(user)
        nutrition_label = {
            "lose_weight": "Nutrición pérdida de peso",
            "gain_muscle": "Nutrición ganancia muscular",
            "body_recomposition": "Nutrición recomposición",
            "performance": "Nutrición rendimiento",
        }.get(goal or "", "Nutrición general")

    days = get_user_training_days_per_week(user) or 3
    location = user.training_location or "gym"
    location_label = LOCATION_LABELS.get(location, location)
    goal = normalize_user_main_goal(user)
    goal_short = {
        "lose_weight": "pérdida",
        "gain_muscle": "músculo",
        "body_recomposition": "recomp",
        "performance": "rendimiento",
    }.get(goal or "", "general")
    workout_label = f"Entreno {days}d {location_label.lower()} {goal_short}"
    return nutrition_label, workout_label


def configuration_matches_exact_profile(configuration, user) -> bool:
    if not configuration.is_active:
        return False
    if not configuration.name.startswith(AUTO_DEFAULT_PREFIX):
        return False
    if not configuration.matches_user_profile(user):
        return False

    days = get_user_training_days_per_week(user)
    user_terms = get_user_dietary_terms(user)
    config_terms = sorted(canonical_dietary_restrictions(configuration.dietary_restrictions))

    return (
        configuration.main_goal == normalize_user_main_goal(user)
        and configuration.training_location == user.training_location
        and configuration.activity_level == user.activity_level
        and configuration.gender == user.gender
        and configuration.min_training_days_per_week == days
        and configuration.max_training_days_per_week == days
        and config_terms == user_terms
    )


def find_exact_configuration(user):
    candidates = (
        DefaultPlanConfiguration.objects.filter(
            is_active=True,
            name__startswith=AUTO_DEFAULT_PREFIX,
        )
        .select_related("default_nutrition_plan", "default_workout_program")
        .order_by("priority")
    )
    for configuration in candidates:
        if configuration_matches_exact_profile(configuration, user):
            return configuration
    return None


def is_generic_configuration(configuration) -> bool:
    if not configuration:
        return True
    if configuration.priority >= GENERIC_FALLBACK_PRIORITY:
        return True
    if "fallback" in (configuration.name or "").lower():
        return True
    specificity = sum(
        1 for value in [
            configuration.main_goal,
            configuration.training_location,
            configuration.gender,
            configuration.activity_level,
            configuration.min_training_days_per_week,
            configuration.max_training_days_per_week,
            configuration.dietary_restrictions,
        ]
        if value
    )
    return specificity <= 1


@transaction.atomic
def ensure_configuration_for_user(user) -> Optional[DefaultPlanConfiguration]:
    """
    Garantiza que exista una configuración exacta para el perfil del usuario.
    Si no existe, la crea con copias [AUTO-DEFECTO] de plantillas reales.
    """
    existing = find_exact_configuration(user)
    if existing:
        return existing

    nutrition_source_name = pick_nutrition_source_name(user)
    workout_source_name = pick_workout_source_name(user)
    if not nutrition_source_name or not workout_source_name:
        logger.warning(
            "default_plan_auto_provision.missing_sources user_id=%s nutrition=%s workout=%s",
            user.id,
            nutrition_source_name,
            workout_source_name,
        )
        return None

    nutrition_source = find_nutrition_source_any(nutrition_source_name)
    workout_source = find_workout_source_any(workout_source_name)
    if not nutrition_source or not workout_source:
        logger.warning(
            "default_plan_auto_provision.source_not_found user_id=%s nutrition=%s workout=%s",
            user.id,
            nutrition_source_name,
            workout_source_name,
        )
        return None

    nutrition_label, workout_label = build_template_labels(user)
    nutrition_template, _ = copy_nutrition_plan_template(nutrition_source, label=nutrition_label)
    workout_template, _ = copy_workout_program_template(workout_source, label=workout_label)

    days = get_user_training_days_per_week(user)
    user_terms = get_user_dietary_terms(user)
    config_name = build_configuration_name(user)

    configuration, created = DefaultPlanConfiguration.objects.get_or_create(
        name=config_name,
        defaults={
            "description": (
                "Configuración generada automáticamente según el perfil del usuario. "
                f"Nutrición base: {nutrition_source_name}. "
                f"Entreno base: {workout_source_name}. "
                "Puedes editarla o eliminarla desde el panel de administración."
            ),
            "priority": build_configuration_priority(user),
            "is_active": True,
            "main_goal": normalize_user_main_goal(user),
            "training_location": user.training_location,
            "activity_level": user.activity_level,
            "gender": user.gender,
            "min_training_days_per_week": days,
            "max_training_days_per_week": days,
            "dietary_restrictions": user_terms,
            "default_nutrition_plan": nutrition_template,
            "default_workout_program": workout_template,
        },
    )

    if not created:
        updated_fields = []
        if configuration.default_nutrition_plan_id != nutrition_template.id:
            configuration.default_nutrition_plan = nutrition_template
            updated_fields.append("default_nutrition_plan")
        if configuration.default_workout_program_id != workout_template.id:
            configuration.default_workout_program = workout_template
            updated_fields.append("default_workout_program")
        if not configuration.is_active:
            configuration.is_active = True
            updated_fields.append("is_active")
        if updated_fields:
            configuration.save(update_fields=updated_fields + ["updated_at"])

    logger.info(
        "default_plan_auto_provision.%s user_id=%s configuration_id=%s name=%s nutrition_source=%s workout_source=%s",
        "created" if created else "reused",
        user.id,
        configuration.id,
        configuration.name,
        nutrition_source_name,
        workout_source_name,
    )
    return configuration


def ensure_fallback_configuration() -> Optional[DefaultPlanConfiguration]:
    """Crea una configuración fallback mínima si no hay ninguna activa."""
    fallback_name = f"{AUTO_DEFAULT_PREFIX} Fallback general"
    existing = DefaultPlanConfiguration.objects.filter(name=fallback_name, is_active=True).first()
    if existing:
        return existing
    if DefaultPlanConfiguration.objects.filter(is_active=True).exists():
        return None

    nutrition_source_name = NUTRITION_GENERAL_FALLBACK[0]
    workout_source_name = WORKOUT_SELECTION_RULES[-1][1][0]

    nutrition_source = find_nutrition_source_any(nutrition_source_name)
    workout_source = find_workout_source_any(workout_source_name)
    if not nutrition_source or not workout_source:
        return None

    nutrition_template, _ = copy_nutrition_plan_template(nutrition_source, label="Nutrición general")
    workout_template, _ = copy_workout_program_template(workout_source, label="Entreno general")

    return DefaultPlanConfiguration.objects.create(
        name=fallback_name,
        description="Fallback automático cuando aún no hay reglas específicas.",
        priority=GENERIC_FALLBACK_PRIORITY,
        is_active=True,
        default_nutrition_plan=nutrition_template,
        default_workout_program=workout_template,
    )
