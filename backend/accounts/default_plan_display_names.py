"""
Nombres genéricos y saneamiento de textos para planes auto-asignados.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Optional

from accounts.default_plan_templates import AUTO_DEFAULT_PREFIX

GOAL_NUTRITION_NAMES = {
    "lose_weight": "Menú semanal · Pérdida de peso",
    "gain_muscle": "Menú semanal · Ganancia muscular",
    "body_recomposition": "Menú semanal · Recomposición corporal",
    "maintain": "Menú semanal · Mantenimiento",
    "performance": "Menú semanal · Rendimiento deportivo",
}

GOAL_WORKOUT_NAMES = {
    "lose_weight": "Programa de entrenamiento · Pérdida de peso",
    "gain_muscle": "Programa de entrenamiento · Fuerza y volumen",
    "body_recomposition": "Programa de entrenamiento · Recomposición",
    "maintain": "Programa de entrenamiento · Mantenimiento",
    "performance": "Programa de entrenamiento · Rendimiento",
}

LOCATION_WORKOUT_SUFFIX = {
    "home": "en casa",
    "gym": "en gimnasio",
    "outdoor": "al aire libre",
}

_PERSONAL_GREETING_PATTERNS = [
    re.compile(r"^¡?\s*a por todas\b.*", re.IGNORECASE),
    re.compile(r"^¡?\s*vamos\b.*", re.IGNORECASE),
    re.compile(r"^¡?\s*a tope\b.*", re.IGNORECASE),
    re.compile(r"^¡?\s*ponos en forma\b.*", re.IGNORECASE),
    re.compile(r"^¡?\s*ponte en forma\b.*", re.IGNORECASE),
]

_COPY_SUFFIX_RE = re.compile(r"\s*\(copia(?:\s*\d+)?\)\s*$", re.IGNORECASE)
_AUTO_PREFIX_RE = re.compile(r"^\[AUTO-DEFECTO\]\s*", re.IGNORECASE)
_TRAILING_PERSON_RE = re.compile(
    r"\s*[-–—]\s*[A-ZÁÉÍÓÚÑ][\wáéíóúñÁÉÍÓÚÑ'.-]+(?:\s+[A-ZÁÉÍÓÚÑ][\wáéíóúñÁÉÍÓÚÑ'.-]+){0,3}\s*$"
)


def _normalize_goal(goal: Optional[str]) -> Optional[str]:
    if not goal:
        return None
    aliases = {
        "weight_loss": "lose_weight",
        "muscle_gain": "gain_muscle",
        "maintenance": "maintain",
    }
    return aliases.get(goal, goal)


def _normalize_text(value: str) -> str:
    text = unicodedata.normalize("NFKD", value or "")
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return " ".join(text.split())


def looks_like_personal_title(name: str) -> bool:
    clean = _normalize_text(name)
    if not clean:
        return True
    for pattern in _PERSONAL_GREETING_PATTERNS:
        if pattern.match(clean):
            return True
    if _TRAILING_PERSON_RE.search(clean):
        tail = _TRAILING_PERSON_RE.search(clean).group(0)
        fragment = tail.strip(" -–—")
        words = fragment.split()
        if 1 <= len(words) <= 4:
            return True
    return False


def sanitize_source_name(name: str) -> str:
    """Elimina rastros de copias, prefijos internos y nombres personales."""
    clean = _normalize_text(name)
    if not clean:
        return ""

    clean = _AUTO_PREFIX_RE.sub("", clean)
    clean = _COPY_SUFFIX_RE.sub("", clean).strip()
    clean = _TRAILING_PERSON_RE.sub("", clean).strip()

    for pattern in _PERSONAL_GREETING_PATTERNS:
        if pattern.match(clean):
            return ""

    return clean.strip(" ·-")


def is_auto_default_template(obj) -> bool:
    tags = getattr(obj, "tags", None) or []
    name = getattr(obj, "name", "") or ""
    return "auto_default" in tags or name.startswith(AUTO_DEFAULT_PREFIX)


def build_user_nutrition_plan_name(template, user) -> str:
    goal = _normalize_goal(getattr(user, "main_goal", None) or getattr(template, "goal", None))
    if is_auto_default_template(template) or looks_like_personal_title(getattr(template, "name", "")):
        return GOAL_NUTRITION_NAMES.get(goal or "", "Menú semanal personalizado")

    sanitized = sanitize_source_name(getattr(template, "name", ""))
    if sanitized and not looks_like_personal_title(sanitized):
        return sanitized
    return GOAL_NUTRITION_NAMES.get(goal or "", "Menú semanal personalizado")


def build_user_workout_plan_name(template, user) -> str:
    goal = _normalize_goal(getattr(user, "main_goal", None) or getattr(template, "goal", None))
    days = getattr(template, "days_per_week", None) or getattr(user, "training_days_per_week", None)
    location = getattr(user, "training_location", None)
    location_suffix = LOCATION_WORKOUT_SUFFIX.get(location or "", "")

    if is_auto_default_template(template) or looks_like_personal_title(getattr(template, "name", "")):
        base = GOAL_WORKOUT_NAMES.get(goal or "", "Programa de entrenamiento personalizado")
        parts = [base]
        if days:
            parts.append(f"{int(days)} días/semana")
        if location_suffix:
            parts.append(location_suffix)
        return " · ".join(parts)

    sanitized = sanitize_source_name(getattr(template, "name", ""))
    if sanitized and not looks_like_personal_title(sanitized):
        return sanitized

    base = GOAL_WORKOUT_NAMES.get(goal or "", "Programa de entrenamiento personalizado")
    if days:
        return f"{base} · {int(days)} días/semana"
    return base


def sanitize_workout_day_name(name: str) -> str:
    clean = sanitize_source_name(name or "")
    if not clean:
        return name or "Sesión de entrenamiento"
    return clean


def sanitize_plan_description(description: str, *, fallback: str) -> str:
    clean = _normalize_text(description or "")
    if not clean or looks_like_personal_title(clean):
        return fallback
    if len(clean) > 240:
        return clean[:237] + "..."
    return clean
