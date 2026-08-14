"""
Recomendación de alternativas de comida según presupuesto nutricional restante.

Servicio puro y determinista (opción 3). La función de puntuación
(`score_alternative` / `SCORE_WEIGHTS`) está pensada para reutilizarse en el
motor de optimización de la opción 4.

No depende de Django ORM: recibe dicts/dataclasses ya materializados.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterable, Mapping, Optional, Sequence

# Pesos configurables del coste normalizado (suma = 1.0).
# Calorías dominan; macros influyen de forma real. Reutilizar en opción 4.
SCORE_WEIGHTS: dict[str, float] = {
    'calories': 0.40,
    'protein': 0.25,
    'carbs': 0.20,
    'fat': 0.15,
}

# Si la alternativa supera el presupuesto del slot en este factor relativo,
# se aplica OVERAGE_PENALTY_MULTIPLIER sobre ese nutriente.
OVERAGE_THRESHOLD = 1.15
OVERAGE_PENALTY_MULTIPLIER = 2.5

# Coste adicional si el tipo de comida no encaja con el slot.
MEAL_TYPE_MISMATCH_PENALTY = 0.35

# Umbrales de coste total → nivel de recomendación (menor coste = mejor).
LEVEL_COST_THRESHOLDS: dict[str, float] = {
    'ideal': 0.20,
    'good': 0.45,
    'acceptable': 0.80,
}

RECOMMENDATION_LEVELS = ('ideal', 'good', 'acceptable', 'outside_target')


@dataclass(frozen=True)
class NutrientVector:
    calories: float = 0.0
    protein: float = 0.0
    carbs: float = 0.0
    fat: float = 0.0

    def __add__(self, other: 'NutrientVector') -> 'NutrientVector':
        return NutrientVector(
            calories=self.calories + other.calories,
            protein=self.protein + other.protein,
            carbs=self.carbs + other.carbs,
            fat=self.fat + other.fat,
        )

    def __sub__(self, other: 'NutrientVector') -> 'NutrientVector':
        return NutrientVector(
            calories=self.calories - other.calories,
            protein=self.protein - other.protein,
            carbs=self.carbs - other.carbs,
            fat=self.fat - other.fat,
        )

    def scale(self, factor: float) -> 'NutrientVector':
        return NutrientVector(
            calories=self.calories * factor,
            protein=self.protein * factor,
            carbs=self.carbs * factor,
            fat=self.fat * factor,
        )

    def clamped_non_negative(self) -> 'NutrientVector':
        return NutrientVector(
            calories=max(0.0, self.calories),
            protein=max(0.0, self.protein),
            carbs=max(0.0, self.carbs),
            fat=max(0.0, self.fat),
        )

    def as_dict(self) -> dict[str, float]:
        return {
            'calories': round(self.calories, 1),
            'protein': round(self.protein, 1),
            'carbs': round(self.carbs, 1),
            'fat': round(self.fat, 1),
        }

    @classmethod
    def from_mapping(cls, data: Optional[Mapping[str, Any]]) -> 'NutrientVector':
        if not data:
            return cls()
        return cls(
            calories=_safe_float(data.get('calories')),
            protein=_safe_float(data.get('protein')),
            carbs=_safe_float(data.get('carbs')),
            fat=_safe_float(data.get('fat')),
        )


@dataclass(frozen=True)
class SlotInfo:
    id: str
    meal_type: str
    order_index: int = 0
    calories: float = 0.0
    protein: float = 0.0
    carbs: float = 0.0
    fat: float = 0.0
    weight: float = 0.0  # fracción del día (0..1), opcional precalculada


@dataclass(frozen=True)
class MealLogSnapshot:
    plan_meal_id: Optional[str]
    meal_type: str
    completed: bool
    is_skipped: bool
    calories: float = 0.0
    protein: float = 0.0
    carbs: float = 0.0
    fat: float = 0.0
    recipe_id: Optional[str] = None

    def nutrients(self) -> NutrientVector:
        return NutrientVector(self.calories, self.protein, self.carbs, self.fat)


@dataclass
class RankedAlternative:
    option: dict[str, Any]
    recommendation_score: float
    recommendation_level: str
    is_recommended: bool
    projected_daily_calories: float
    projected_daily_macros: dict[str, float]
    calorie_difference: float
    macro_differences: dict[str, float]
    recommendation_reason: str
    is_current_selection: bool = False
    cost: float = 0.0

    def to_option_dict(self) -> dict[str, Any]:
        payload = dict(self.option)
        payload.update({
            'recommendation_score': round(self.recommendation_score, 4),
            'recommendation_level': self.recommendation_level,
            'is_recommended': self.is_recommended,
            'projected_daily_calories': int(round(self.projected_daily_calories)),
            'projected_daily_macros': self.projected_daily_macros,
            'calorie_difference': round(self.calorie_difference, 1),
            'macro_differences': self.macro_differences,
            'recommendation_reason': self.recommendation_reason,
            'is_current_selection': self.is_current_selection,
        })
        return payload


@dataclass
class RecommendationContext:
    daily_goals: NutrientVector
    consumed: NutrientVector
    remaining: NutrientVector
    slot_budget: NutrientVector
    pending_meals_count: int
    goals_exceeded: dict[str, bool]
    current_slot_id: str
    date: str

    def as_dict(self) -> dict[str, Any]:
        return {
            'daily_goals': self.daily_goals.as_dict(),
            'consumed': self.consumed.as_dict(),
            'remaining': self.remaining.as_dict(),
            'slot_budget': self.slot_budget.as_dict(),
            'pending_meals_count': self.pending_meals_count,
            'goals_exceeded': self.goals_exceeded,
            'current_slot_id': self.current_slot_id,
            'date': self.date,
        }


@dataclass
class RecommendationResult:
    context: RecommendationContext
    alternatives: list[RankedAlternative] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            'context': self.context.as_dict(),
            'alternatives': [alt.to_option_dict() for alt in self.alternatives],
        }


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def compute_slot_weights(slots: Sequence[SlotInfo]) -> dict[str, float]:
    """Peso de cada slot: macros del slot si existen; si no, reparto equitativo."""
    if not slots:
        return {}
    calorie_sum = sum(max(0.0, s.calories) for s in slots)
    if calorie_sum > 0:
        return {s.id: max(0.0, s.calories) / calorie_sum for s in slots}
    equal = 1.0 / len(slots)
    return {s.id: equal for s in slots}


def sum_completed_intake(
    logs: Iterable[MealLogSnapshot],
    *,
    exclude_plan_meal_id: Optional[str] = None,
) -> NutrientVector:
    """Suma solo comidas realmente completadas (no omitidas)."""
    total = NutrientVector()
    exclude = str(exclude_plan_meal_id).lower() if exclude_plan_meal_id else None
    for log in logs:
        if not log.completed or log.is_skipped:
            continue
        if exclude and log.plan_meal_id and str(log.plan_meal_id).lower() == exclude:
            continue
        total = total + log.nutrients()
    return total


def compute_remaining(goals: NutrientVector, consumed: NutrientVector) -> NutrientVector:
    """Restante real (puede ser negativo si hay exceso)."""
    return goals - consumed


def goals_exceeded_flags(remaining: NutrientVector) -> dict[str, bool]:
    return {
        'calories': remaining.calories < 0,
        'protein': remaining.protein < 0,
        'carbs': remaining.carbs < 0,
        'fat': remaining.fat < 0,
    }


def is_slot_pending(
    slot: SlotInfo,
    logs_by_slot: Mapping[str, MealLogSnapshot],
    *,
    current_slot_id: str,
) -> bool:
    """Pendiente = no completada y no omitida. El slot actual cuenta como objetivo, no como 'otro pendiente'."""
    if slot.id == current_slot_id:
        return False
    log = logs_by_slot.get(slot.id)
    if not log:
        return True
    if log.is_skipped:
        return False
    if log.completed:
        return False
    return True


def compute_slot_budget(
    remaining: NutrientVector,
    *,
    current_slot_id: str,
    slots: Sequence[SlotInfo],
    logs_by_slot: Mapping[str, MealLogSnapshot],
    weights: Optional[Mapping[str, float]] = None,
) -> tuple[NutrientVector, int]:
    """
    Presupuesto del slot actual: reparte el restante entre el slot actual y
    los demás pendientes según pesos del plan. No asigna todo el restante a
    la primera comida que se cambie.
    """
    slot_weights = dict(weights or compute_slot_weights(slots))
    current_weight = max(slot_weights.get(current_slot_id, 0.0), 1e-6)

    pending_others = [
        s for s in slots
        if is_slot_pending(s, logs_by_slot, current_slot_id=current_slot_id)
    ]
    other_weight = sum(max(slot_weights.get(s.id, 0.0), 0.0) for s in pending_others)
    total_weight = current_weight + other_weight
    share = current_weight / total_weight if total_weight > 0 else 1.0

    budget = remaining.scale(share)
    return budget, len(pending_others)


def _nutrient_cost(actual: float, target: float) -> float:
    """Coste relativo de un nutriente; penaliza superar el presupuesto."""
    if target <= 0:
        # Sin presupuesto (o ya excedido): preferir aportes bajos.
        reference = 100.0 if abs(actual) > 50 else 25.0
        return (max(0.0, actual) / reference) * OVERAGE_PENALTY_MULTIPLIER

    relative = abs(actual - target) / target
    if actual > target * OVERAGE_THRESHOLD:
        relative *= OVERAGE_PENALTY_MULTIPLIER
    return relative


def score_alternative(
    option_macros: NutrientVector,
    slot_budget: NutrientVector,
    *,
    meal_type_compatible: bool = True,
    weights: Optional[Mapping[str, float]] = None,
) -> tuple[float, float]:
    """
    Devuelve (score, cost). score ∈ (0, 1], mayor = mejor. Determinista.
    Reutilizable por el motor de optimización (opción 4).
    """
    w = weights or SCORE_WEIGHTS
    cost = 0.0
    cost += w.get('calories', 0.4) * _nutrient_cost(option_macros.calories, slot_budget.calories)
    cost += w.get('protein', 0.25) * _nutrient_cost(option_macros.protein, slot_budget.protein)
    cost += w.get('carbs', 0.2) * _nutrient_cost(option_macros.carbs, slot_budget.carbs)
    cost += w.get('fat', 0.15) * _nutrient_cost(option_macros.fat, slot_budget.fat)
    if not meal_type_compatible:
        cost += MEAL_TYPE_MISMATCH_PENALTY
    score = 1.0 / (1.0 + cost)
    return score, cost


def level_from_cost(cost: float) -> str:
    if cost <= LEVEL_COST_THRESHOLDS['ideal']:
        return 'ideal'
    if cost <= LEVEL_COST_THRESHOLDS['good']:
        return 'good'
    if cost <= LEVEL_COST_THRESHOLDS['acceptable']:
        return 'acceptable'
    return 'outside_target'


def build_recommendation_reason(
    level: str,
    calorie_difference: float,
    *,
    goals_exceeded: bool,
) -> str:
    if goals_exceeded and level == 'outside_target':
        return 'Ya has superado algún objetivo del día; esta es la opción que menos lo agrava.'
    if level == 'ideal':
        return 'Encaja muy bien con el presupuesto de esta comida.'
    if level == 'good':
        return 'Buena aproximación al presupuesto de calorías y macros.'
    if level == 'acceptable':
        delta = int(round(calorie_difference))
        if delta > 0:
            return f'Se aproxima al objetivo (+{delta} kcal respecto al presupuesto del slot).'
        return f'Se aproxima al objetivo ({delta} kcal respecto al presupuesto del slot).'
    delta = int(round(calorie_difference))
    if delta > 0:
        return f'Fuera del margen ideal (+{delta} kcal respecto al presupuesto del slot).'
    return f'Fuera del margen ideal ({delta} kcal respecto al presupuesto del slot).'


def meal_type_is_compatible(option_meal_types: Optional[Sequence[str]], slot_meal_type: str) -> bool:
    if not option_meal_types:
        return True
    normalized = {str(t).lower() for t in option_meal_types}
    return str(slot_meal_type).lower() in normalized


def rank_alternatives(
    *,
    date: str,
    current_slot: SlotInfo,
    day_slots: Sequence[SlotInfo],
    logs: Sequence[MealLogSnapshot],
    daily_goals: NutrientVector,
    alternatives: Sequence[Mapping[str, Any]],
    current_recipe_id: Optional[str] = None,
    current_option_id: Optional[str] = None,
    replacing_completed_slot: bool = False,
) -> RecommendationResult:
    """
    Clasifica alternativas del slot por encaje con el presupuesto restante.

    Si se reemplaza una comida ya completada, excluye primero su aportación
    para no contarla dos veces al proyectar.
    """
    exclude_id = current_slot.id if replacing_completed_slot else None
    consumed = sum_completed_intake(logs, exclude_plan_meal_id=exclude_id)
    remaining = compute_remaining(daily_goals, consumed)
    exceeded = goals_exceeded_flags(remaining)

    logs_by_slot: dict[str, MealLogSnapshot] = {}
    for log in logs:
        if log.plan_meal_id:
            logs_by_slot[str(log.plan_meal_id)] = log

    weights = compute_slot_weights(day_slots)
    slot_budget, pending_others = compute_slot_budget(
        remaining,
        current_slot_id=current_slot.id,
        slots=day_slots,
        logs_by_slot=logs_by_slot,
        weights=weights,
    )

    context = RecommendationContext(
        daily_goals=daily_goals,
        consumed=consumed,
        remaining=remaining,
        slot_budget=slot_budget,
        pending_meals_count=pending_others,
        goals_exceeded=exceeded,
        current_slot_id=current_slot.id,
        date=date,
    )

    ranked: list[RankedAlternative] = []
    for raw in alternatives:
        option = dict(raw)
        macros = NutrientVector.from_mapping(option)
        option_types = option.get('meal_types') or option.get('mealTypes')
        compatible = meal_type_is_compatible(option_types, current_slot.meal_type)
        score, cost = score_alternative(macros, slot_budget, meal_type_compatible=compatible)
        level = level_from_cost(cost)

        projected = consumed + macros
        calorie_diff = macros.calories - slot_budget.calories
        macro_diffs = {
            'protein': round(macros.protein - slot_budget.protein, 1),
            'carbs': round(macros.carbs - slot_budget.carbs, 1),
            'fat': round(macros.fat - slot_budget.fat, 1),
        }
        recipe_id = option.get('recipeId') or option.get('recipe_id')
        option_id = option.get('id')
        is_current = False
        if current_recipe_id and recipe_id is not None and str(recipe_id) == str(current_recipe_id):
            is_current = True
        elif current_option_id and option_id is not None and str(option_id) == str(current_option_id):
            is_current = True

        ranked.append(RankedAlternative(
            option=option,
            recommendation_score=score,
            recommendation_level=level,
            is_recommended=False,
            projected_daily_calories=projected.calories,
            projected_daily_macros=projected.as_dict(),
            calorie_difference=calorie_diff,
            macro_differences=macro_diffs,
            recommendation_reason=build_recommendation_reason(
                level,
                calorie_diff,
                goals_exceeded=any(exceeded.values()),
            ),
            is_current_selection=is_current,
            cost=cost,
        ))

    # Orden determinista: mejor score, luego nombre, luego id.
    ranked.sort(
        key=lambda alt: (
            -alt.recommendation_score,
            str(alt.option.get('name') or ''),
            str(alt.option.get('recipeId') or alt.option.get('id') or ''),
        )
    )
    if ranked:
        ranked[0].is_recommended = True
        if ranked[0].recommendation_level == 'outside_target':
            ranked[0].recommendation_reason = (
                'Ninguna alternativa entra en el margen ideal; esta es la de mejor encaje disponible.'
            )

    return RecommendationResult(context=context, alternatives=ranked)


def rank_slot_option_lists(
    *,
    date: str,
    slots: Sequence[SlotInfo],
    logs: Sequence[MealLogSnapshot],
    daily_goals: NutrientVector,
    options_by_slot_id: Mapping[str, Sequence[Mapping[str, Any]]],
    current_recipe_by_slot: Optional[Mapping[str, Optional[str]]] = None,
    replacing_completed_by_slot: Optional[Mapping[str, bool]] = None,
    skip_recipe_ids: Optional[set[str]] = None,
) -> dict[str, list[dict[str, Any]]]:
    """
    Ordena las alternativas de cada slot con el mismo motor que Cambiar.

    Las recetas en skip_recipe_ids se aplazan al final (siguen visibles si el
    coach las asignó) para que la opción inicial coincida con Mejor encaje.
    """
    skip = {str(rid).lower() for rid in (skip_recipe_ids or set())}
    current_recipes = current_recipe_by_slot or {}
    replacing = replacing_completed_by_slot or {}
    ranked_out: dict[str, list[dict[str, Any]]] = {}

    for slot in slots:
        options = [dict(opt) for opt in (options_by_slot_id.get(slot.id) or [])]
        current_rid = current_recipes.get(slot.id)
        current_rid_str = str(current_rid) if current_rid else None
        rankable: list[dict[str, Any]] = []
        deferred: list[dict[str, Any]] = []
        for opt in options:
            rid = str(opt.get('recipeId') or opt.get('recipe_id') or '').lower()
            is_current = bool(current_rid_str and rid == str(current_rid_str).lower())
            if rid and rid in skip and not is_current:
                deferred.append(opt)
            else:
                rankable.append(opt)
        if not rankable:
            ranked_out[slot.id] = options
            continue
        result = rank_alternatives(
            date=date,
            current_slot=slot,
            day_slots=slots,
            logs=logs,
            daily_goals=daily_goals,
            alternatives=rankable,
            current_recipe_id=current_rid_str,
            replacing_completed_slot=bool(replacing.get(slot.id)),
        )
        ranked_out[slot.id] = [alt.to_option_dict() for alt in result.alternatives] + deferred
    return ranked_out
