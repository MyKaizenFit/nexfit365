# nutrition/views.py
# Views para la nueva estructura simplificada

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models
from django.db import DatabaseError
from django.db.models import Q
from django.utils import timezone

from .models import Recipe, NutritionPlan, PlanMeal, MealLog, Food, NutritionPlanHistory, RecipeIngredient, NutritionPlanAssignment, MealRecipeExclusion, MealIngredientExclusion
from .serializers import (
    RecipeSerializer, RecipeMinimalSerializer,
    NutritionPlanSerializer, NutritionPlanMinimalSerializer,
    PlanMealSerializer, MealLogSerializer, FoodSerializer,
    NutritionPlanHistorySerializer, RecipeIngredientSerializer
)
from .services import PersonalizedNutritionService, recipe_is_compatible_for_user
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
import logging
import re
from rest_framework_simplejwt.authentication import JWTAuthentication
from notifications.utils import notify_admins_user_change
from collections import defaultdict
from drf_spectacular.utils import extend_schema, OpenApiExample, inline_serializer
from rest_framework import serializers

logger = logging.getLogger(__name__)

RECIPE_EXCLUSION_TOKEN_PATTERN = re.compile(r'\[recipe:([0-9a-fA-F-]{36})\]')


def _safe_recipe_payload(recipe: Recipe):
    """Serializa receta con fallback cuando hay relaciones inconsistentes."""
    try:
        return RecipeSerializer(recipe).data
    except Exception as exc:
        logger.warning("Fallback de serialización para receta %s: %s", recipe.id, exc)
        return {
            'id': str(recipe.id),
            'name': recipe.name,
            'description': recipe.description or '',
            'category': recipe.category or '',
            'difficulty': recipe.difficulty or '',
            'prep_time_minutes': recipe.prep_time_minutes or 0,
            'cook_time_minutes': recipe.cook_time_minutes or 0,
            'servings': recipe.servings or 1,
            'calories': recipe.calories or 0,
            'protein': float(recipe.protein or 0),
            'carbs': float(recipe.carbs or 0),
            'fat': float(recipe.fat or 0),
            'fiber': float(recipe.fiber or 0),
            'ingredients': recipe.ingredients or [],
            'instructions': recipe.instructions or '',
            'image_url': recipe.image_url or (recipe.image.url if recipe.image else ''),
            'meal_types': recipe.meal_types or [],
            'diet_types': recipe.diet_types or [],
            'allergens': recipe.allergens or [],
            'tags': recipe.tags or [],
            'is_active': bool(recipe.is_active),
        }


def _extract_fallback_excluded_recipe_ids(user) -> set[str]:
    disliked_foods = str(getattr(user, 'disliked_foods', '') or '')
    return {match.group(1).lower() for match in RECIPE_EXCLUSION_TOKEN_PATTERN.finditer(disliked_foods)}


def _persist_fallback_excluded_recipe(user, recipe_id) -> None:
    token = f"[recipe:{str(recipe_id).lower()}]"
    disliked_foods = str(getattr(user, 'disliked_foods', '') or '')
    if token in disliked_foods:
        return

    updated = f"{disliked_foods}\n{token}".strip() if disliked_foods else token
    user.disliked_foods = updated
    user.save(update_fields=['disliked_foods'])


def _remove_fallback_excluded_recipe(user, recipe_id) -> None:
    token = f"[recipe:{str(recipe_id).lower()}]"
    disliked_foods = str(getattr(user, 'disliked_foods', '') or '')
    if token not in disliked_foods:
        return

    lines = [line.strip() for line in disliked_foods.splitlines() if line.strip()]
    filtered = [line for line in lines if line != token]
    user.disliked_foods = '\n'.join(filtered)
    user.save(update_fields=['disliked_foods'])


def _get_excluded_recipe_ids(user) -> set[str]:
    excluded_ids = set(_extract_fallback_excluded_recipe_ids(user))
    try:
        db_ids = MealRecipeExclusion.objects.filter(user=user, is_active=True).values_list('recipe_id', flat=True)
        excluded_ids.update(str(recipe_id).lower() for recipe_id in db_ids)
    except DatabaseError as exc:
        logger.warning("No se pudo leer MealRecipeExclusion para usuario %s: %s", user.id, exc)
    return excluded_ids


def get_active_plan_for_user(user):
    assignment = NutritionPlanAssignment.objects.filter(
        user=user,
        is_active=True,
        plan__is_active=True,
    ).select_related('plan').order_by('-assigned_at').first()
    if assignment:
        return assignment.plan
    return NutritionPlan.objects.filter(user=user, is_active=True).order_by('-created_at').first()


@extend_schema(
    tags=['Nutrition'],
    summary='Plan nutricional activo',
    responses=inline_serializer(
        name='CurrentNutritionPlanResponse',
        fields={
            'plan': NutritionPlanSerializer(allow_null=True),
        },
    ),
    examples=[
        OpenApiExample(
            'Current nutrition plan response',
            value={
                'plan': {
                    'id': 'd664ff4a-c306-4a1b-bb1e-67b8adf95452',
                    'name': 'Plan recomposición 8 semanas',
                    'is_active': True,
                    'meals': [
                        {'id': 'aafb5001-e63e-4e54-ac9c-2916f89ce3f1', 'meal_type': 'breakfast', 'day_of_week': 1}
                    ],
                }
            },
            response_only=True,
        )
    ],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_plan(request):
    """
    Obtener el plan de nutrición actual del usuario.
    Devuelve el plan más reciente asignado al usuario o null si no tiene ninguno.
    """
    plan = get_active_plan_for_user(request.user)
    if plan:
        plan = NutritionPlan.objects.filter(pk=plan.pk).select_related('user').prefetch_related(
            'meals',
            'meals__suggested_recipes'
        ).first()
    
    if plan:
        serializer = NutritionPlanSerializer(plan)
        return Response({'plan': serializer.data})
    
    # Si no tiene plan, devolver null (no es un error)
    return Response({'plan': None})


@extend_schema(
    tags=['Nutrition'],
    summary='Lista de compra agregada del plan activo',
    responses=inline_serializer(
        name='ShoppingListResponse',
        fields={
            'plan_name': serializers.CharField(allow_null=True),
            'days': serializers.IntegerField(),
            'items': inline_serializer(
                name='ShoppingListItem',
                many=True,
                fields={
                    'name': serializers.CharField(),
                    'quantity': serializers.FloatField(),
                    'unit': serializers.CharField(),
                    'recipes': serializers.ListField(child=serializers.CharField()),
                },
            ),
            'total_items': serializers.IntegerField(),
            'message': serializers.CharField(required=False),
            'generated_at': serializers.CharField(required=False),
        },
    ),
    examples=[
        OpenApiExample(
            'Shopping list response',
            value={
                'plan_name': 'Plan recomposición 8 semanas',
                'days': 7,
                'items': [
                    {
                        'name': 'Avena',
                        'quantity': 560.0,
                        'unit': 'g',
                        'recipes': ['Porridge proteico'],
                    },
                    {
                        'name': 'Pechuga de pollo',
                        'quantity': 1200.0,
                        'unit': 'g',
                        'recipes': ['Bowl pollo y arroz'],
                    },
                ],
                'total_items': 2,
                'generated_at': '2026-03-18T09:00:00Z',
            },
            response_only=True,
        )
    ],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def shopping_list(request):
    """
    Genera una lista de compra agregada desde el plan activo del usuario.

    Query params:
    - days: int (1..31), por defecto 7
    """
    user = request.user
    raw_days = request.query_params.get('days', '7')
    try:
        days = int(raw_days)
    except (TypeError, ValueError):
        days = 7
    days = max(1, min(days, 31))

    plan = get_active_plan_for_user(user)
    if not plan:
        return Response({
            'plan_name': None,
            'days': days,
            'items': [],
            'total_items': 0,
            'message': 'Sin plan activo',
        })

    plan = NutritionPlan.objects.filter(pk=plan.pk).prefetch_related(
        'meals',
        'meals__meal_recipes__recipe__recipe_ingredients__food',
        'meals__suggested_recipes__recipe_ingredients__food',
    ).first()
    if not plan:
        return Response({
            'plan_name': None,
            'days': days,
            'items': [],
            'total_items': 0,
            'message': 'Sin plan activo',
        })

    today = timezone.localdate()
    day_numbers = [((today.isoweekday() - 1 + idx) % 7) + 1 for idx in range(days)]
    meals_qs = plan.meals.filter(Q(day_of_week__isnull=True) | Q(day_of_week__in=day_numbers))

    def parse_qty(value, default=0.0):
        if isinstance(value, (int, float)):
            return float(value)
        if value is None:
            return float(default)
        text = str(value).strip()
        if not text:
            return float(default)
        match = re.search(r"[-+]?\d*\.?\d+", text)
        if not match:
            return float(default)
        try:
            return float(match.group(0))
        except ValueError:
            return float(default)

    aggregated = defaultdict(lambda: {
        'name': '',
        'unit': 'g',
        'quantity': 0.0,
        'recipes': set(),
    })

    def add_item(name: str, unit: str, quantity: float, recipe_name: str):
        normalized_name = (name or '').strip()
        if not normalized_name or quantity <= 0:
            return
        normalized_unit = (unit or 'g').strip() or 'g'
        key = f"{normalized_name.lower()}::{normalized_unit.lower()}"
        entry = aggregated[key]
        entry['name'] = normalized_name
        entry['unit'] = normalized_unit
        entry['quantity'] += quantity
        if recipe_name:
            entry['recipes'].add(recipe_name)

    for meal in meals_qs:
        meal_recipes = [mr.recipe for mr in meal.meal_recipes.all() if mr.recipe_id]
        if meal_recipes:
            candidate_recipes = meal_recipes
        else:
            candidate_recipes = list(meal.suggested_recipes.all())

        for recipe in candidate_recipes:
            recipe_name = recipe.name
            ingredients_qs = recipe.recipe_ingredients.all()
            if ingredients_qs.exists():
                for ingredient in ingredients_qs:
                    add_item(
                        name=ingredient.food.name,
                        unit=ingredient.unit or 'g',
                        quantity=parse_qty(ingredient.quantity, 0),
                        recipe_name=recipe_name,
                    )
                continue

            # Fallback para recetas sin RecipeIngredient vinculados (campo JSON ingredients)
            if isinstance(recipe.ingredients, list):
                for raw_item in recipe.ingredients:
                    if isinstance(raw_item, dict):
                        item_name = str(raw_item.get('name') or '').strip()
                        item_unit = str(raw_item.get('unit') or 'g').strip() or 'g'
                        item_qty = parse_qty(raw_item.get('amount') or raw_item.get('quantity'), 0)
                        add_item(item_name, item_unit, item_qty, recipe_name)

    items = []
    for value in aggregated.values():
        items.append({
            'name': value['name'],
            'quantity': round(value['quantity'], 2),
            'unit': value['unit'],
            'recipes': sorted(value['recipes']),
        })

    items.sort(key=lambda item: item['name'].lower())

    return Response({
        'plan_name': plan.name,
        'days': days,
        'items': items,
        'total_items': len(items),
        'generated_at': timezone.now().isoformat(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def plan_meals_for_selection(request):
    """
    Obtener comidas disponibles para selección.
    Devuelve las comidas del plan actual del usuario organizadas por tipo con recetas sugeridas.
    Las cantidades se personalizan según el perfil del usuario (peso, altura, objetivo, etc.)
    """
    import logging
    from datetime import datetime
    from django.utils import timezone
    logger = logging.getLogger(__name__)
    
    user = request.user
    logger.info(f"🍽️ Personalizando comidas para usuario: {user.email} (ID: {user.id})")
    logger.info(f"📊 Perfil del usuario: peso={user.weight}kg, altura={user.height}cm, edad={user.age}, género={user.gender}, objetivo={user.main_goal}, actividad={user.activity_level}")
    service = PersonalizedNutritionService(user)
    
    # Calcular calorías y macros diarios personalizados
    daily_calories = service.calculate_daily_calories()
    daily_macros = service.calculate_macros(daily_calories)
    
    logger.info(f"🔥 Calorías diarias calculadas: {daily_calories} kcal")
    logger.info(f"📈 Macros diarios: P={daily_macros['protein']:.1f}g, C={daily_macros['carbs']:.1f}g, G={daily_macros['fat']:.1f}g")

    excluded_recipe_ids = _get_excluded_recipe_ids(user)

    def recipe_allowed_for_user(recipe: Recipe) -> bool:
        if str(recipe.id).lower() in excluded_recipe_ids:
            return False
        return recipe_is_compatible_for_user(recipe, user)

    def build_recipe_option(recipe: Recipe, meal_type: str, meal_base=None, meal_id=None):
        personalized = personalize_recipe(recipe, meal_type, meal_base)
        return {
            'id': f"meal-{meal_id}-recipe-{recipe.id}" if meal_id else f"recipe-{recipe.id}",
            'name': recipe.name,
            'calories': personalized['calories'],
            'protein': personalized['protein'],
            'carbs': personalized['carbs'],
            'fat': personalized['fat'],
            'category': 'balanced',
            'icon': '🍽️',
            'description': recipe.description or (meal_base.description if meal_base else ''),
            'cookTime': f"{recipe.prep_time_minutes + recipe.cook_time_minutes} min",
            'recipeId': recipe.id,
            'imageUrl': recipe.image_url or (recipe.image.url if recipe.image else ''),
        }

    def replacement_candidates(meal_type: str, used_ids=None):
        used_ids = used_ids or set()
        candidates = []
        for candidate in Recipe.objects.filter(is_active=True).exclude(id__in=excluded_recipe_ids):
            if candidate.id in used_ids:
                continue
            candidate_meal_types = [str(item).lower() for item in (candidate.meal_types or [])]
            candidate_category = str(candidate.category or '').lower()
            if meal_type.lower() not in candidate_meal_types and candidate_category != meal_type.lower():
                continue
            if not recipe_allowed_for_user(candidate):
                continue
            candidates.append(candidate)
        return candidates

    def macro_distance(recipe: Recipe, target_calories: float, target_protein: float, target_carbs: float, target_fat: float):
        recipe_calories = float(recipe.calories or 0)
        recipe_protein = float(recipe.protein or 0)
        recipe_carbs = float(recipe.carbs or 0)
        recipe_fat = float(recipe.fat or 0)
        return (
            abs(recipe_calories - target_calories)
            + abs(recipe_protein - target_protein) * 10
            + abs(recipe_carbs - target_carbs) * 4
            + abs(recipe_fat - target_fat) * 9
        )

    def find_macro_similar_recipe(meal_type: str, target_recipe: Recipe = None, meal_base=None, used_ids=None):
        used_ids = used_ids or set()
        candidates = replacement_candidates(meal_type, used_ids=used_ids)
        if not candidates:
            return None

        target_calories = float(target_recipe.calories if target_recipe else (meal_base.calories if meal_base else 0) or 0)
        target_protein = float(target_recipe.protein if target_recipe else (meal_base.protein if meal_base else 0) or 0)
        target_carbs = float(target_recipe.carbs if target_recipe else (meal_base.carbs if meal_base else 0) or 0)
        target_fat = float(target_recipe.fat if target_recipe else (meal_base.fat if meal_base else 0) or 0)

        candidates.sort(key=lambda candidate: macro_distance(candidate, target_calories, target_protein, target_carbs, target_fat))
        return candidates[0]
    
    # Distribución de calorías por comida (porcentajes del total diario)
    meal_calorie_distribution = {
        'breakfast': 0.25,      # 25% del día
        'morning_snack': 0.10,  # 10% del día
        'lunch': 0.35,          # 35% del día
        'afternoon_snack': 0.10, # 10% del día
        'dinner': 0.25,          # 25% del día
        'evening_snack': 0.10,   # 10% del día
        'snack': 0.15            # 15% del día (genérico)
    }
    
    # Función helper para personalizar una receta
    def personalize_recipe(recipe, meal_type, meal_base=None):
        """Personaliza una receta según el perfil del usuario"""
        # Calcular porcentaje de calorías para este tipo de comida
        meal_percentage = meal_calorie_distribution.get(meal_type, 0.25)
        target_calories = daily_calories * meal_percentage
        
        # Calcular factor de escala basado en calorías objetivo vs receta base (convertir Decimal a float)
        recipe_calories_float = float(recipe.calories) if recipe.calories else None
        if recipe_calories_float and recipe_calories_float > 0:
            scale_factor = target_calories / recipe_calories_float
        elif meal_base and meal_base.calories:
            scale_factor = target_calories / float(meal_base.calories)
        else:
            scale_factor = 1.0
        
        # Ajustar según objetivo del usuario
        if user.main_goal == 'lose_weight':
            scale_factor *= 0.9  # Reducir un 10% para déficit
        elif user.main_goal == 'gain_muscle':
            scale_factor *= 1.1  # Aumentar un 10% para superávit
        
        # Limitar el factor de escala a un rango razonable (0.5x a 2x)
        scale_factor = max(0.5, min(2.0, scale_factor))
        
        logger.debug(f"🔧 Personalizando receta '{recipe.name}' para {meal_type}: "
                    f"calorías_originales={recipe_calories_float}, "
                    f"target={target_calories:.0f}, "
                    f"factor_escala={scale_factor:.2f}, "
                    f"porcentaje_comida={meal_percentage*100:.0f}%")
        
        # Calcular macros personalizados (convertir Decimal a float antes de multiplicar)
        recipe_calories = float(recipe.calories) if recipe.calories else None
        recipe_protein = float(recipe.protein) if recipe.protein else None
        recipe_carbs = float(recipe.carbs) if recipe.carbs else None
        recipe_fat = float(recipe.fat) if recipe.fat else None
        
        personalized_calories = int(recipe_calories * scale_factor) if recipe_calories else (int(float(meal_base.calories) * scale_factor) if meal_base and meal_base.calories else int(target_calories))
        personalized_protein = float(recipe_protein * scale_factor) if recipe_protein else (float(meal_base.protein * scale_factor) if meal_base and meal_base.protein else float(daily_macros['protein'] * meal_percentage))
        personalized_carbs = float(recipe_carbs * scale_factor) if recipe_carbs else (float(meal_base.carbs * scale_factor) if meal_base and meal_base.carbs else float(daily_macros['carbs'] * meal_percentage))
        personalized_fat = float(recipe_fat * scale_factor) if recipe_fat else (float(meal_base.fat * scale_factor) if meal_base and meal_base.fat else float(daily_macros['fat'] * meal_percentage))
        
        return {
            'calories': personalized_calories,
            'protein': round(personalized_protein, 1),
            'carbs': round(personalized_carbs, 1),
            'fat': round(personalized_fat, 1),
            'scale_factor': round(scale_factor, 2)
        }
    
    # Función helper para personalizar una comida sin receta
    def personalize_meal(meal, meal_type):
        """Personaliza una comida genérica según el perfil del usuario"""
        meal_percentage = meal_calorie_distribution.get(meal_type, 0.25)
        target_calories = daily_calories * meal_percentage
        
        # Calcular factor de escala (convertir Decimal a float)
        meal_calories_float = float(meal.calories) if meal.calories else None
        if meal_calories_float and meal_calories_float > 0:
            scale_factor = target_calories / meal_calories_float
        else:
            scale_factor = 1.0
        
        # Ajustar según objetivo
        if user.main_goal == 'lose_weight':
            scale_factor *= 0.9
        elif user.main_goal == 'gain_muscle':
            scale_factor *= 1.1
        
        scale_factor = max(0.5, min(2.0, scale_factor))
        
        # Convertir Decimal a float antes de multiplicar
        meal_calories_float = float(meal.calories) if meal.calories else None
        meal_protein_float = float(meal.protein) if meal.protein else None
        meal_carbs_float = float(meal.carbs) if meal.carbs else None
        meal_fat_float = float(meal.fat) if meal.fat else None
        
        return {
            'calories': int(meal_calories_float * scale_factor) if meal_calories_float else int(target_calories),
            'protein': round(float(meal_protein_float * scale_factor), 1) if meal_protein_float else round(float(daily_macros['protein'] * meal_percentage), 1),
            'carbs': round(float(meal_carbs_float * scale_factor), 1) if meal_carbs_float else round(float(daily_macros['carbs'] * meal_percentage), 1),
            'fat': round(float(meal_fat_float * scale_factor), 1) if meal_fat_float else round(float(daily_macros['fat'] * meal_percentage), 1),
            'scale_factor': round(scale_factor, 2)
        }
    
    # Permitir seleccionar el día (para vistas semanales/mensuales)
    date_param = request.query_params.get('date')
    if date_param:
        try:
            date_for_slots = datetime.strptime(date_param, '%Y-%m-%d').date()
        except ValueError:
            date_for_slots = timezone.localdate()
    else:
        date_for_slots = timezone.localdate()

    # Si piden explícitamente un tipo de comida (p.ej. vista mensual), filtrar por ese tipo
    requested_meal_type = request.query_params.get('meal_type')

    def build_standard_slots(meal_types: list[str]):
        """Construye una lista estable de slots (sin IDs) para el frontend."""
        fallback_time = {
            'breakfast': '08:00:00',
            'morning_snack': '10:30:00',
            'lunch': '13:00:00',
            'afternoon_snack': '16:00:00',
            'dinner': '20:00:00',
        }
        fallback_name = {
            'breakfast': 'Desayuno',
            'morning_snack': 'Snack Mañana',
            'lunch': 'Almuerzo',
            'afternoon_snack': 'Snack Tarde',
            'dinner': 'Cena',
        }
        slots = []
        for idx, mt in enumerate(meal_types):
            slots.append({
                'id': None,
                'day_of_week': None,
                'name': fallback_name.get(mt, mt),
                'meal_type': mt,
                'time': fallback_time.get(mt),
                'description': '',
                'order_index': idx + 1,
            })
        return slots

    # Primero intentar obtener comidas del plan actual del usuario
    user_plan = get_active_plan_for_user(user)
    if user_plan:
        user_plan = NutritionPlan.objects.filter(pk=user_plan.pk).prefetch_related(
            'meals__suggested_recipes',
            'meals__meal_recipes',
            'meals__meal_recipes__recipe',
        ).first()
    
    meals_by_type = {}
    # Nuevo: devolver slots (comidas del día) y opciones por slot
    meal_slots = []
    options_by_meal_id = {}
    
    if user_plan:
        # Si el plan tiene comidas por día, mostrar las del día actual.
        # day_of_week: 1=Lunes..7=Domingo. Null = aplica a cualquier día (compatibilidad).
        today_dow = date_for_slots.isoweekday()
        meals = user_plan.meals.filter(Q(day_of_week=today_dow) | Q(day_of_week__isnull=True)).order_by('order_index', 'id')
        for meal in meals:
            meal_type = meal.meal_type
            if meal_type not in meals_by_type:
                meals_by_type[meal_type] = []

            # Slot base (para que el frontend pueda renderizar nº variable de comidas)
            meal_slots.append({
                'id': str(meal.id),
                'day_of_week': meal.day_of_week,
                'name': meal.name,
                'meal_type': meal.meal_type,
                'time': meal.time.isoformat() if meal.time else None,
                'description': meal.description or '',
                'order_index': meal.order_index,
            })
            
            # Crear opciones basadas en la comida y sus recetas sugeridas
            meal_options = []

            # Si hay recetas configuradas (PlanMealRecipe), crear una opción por receta
            if meal.meal_recipes.exists():
                used_recipe_ids = set()
                for meal_recipe in meal.meal_recipes.all().order_by('display_order', 'id'):
                    recipe = meal_recipe.recipe
                    replacement = None
                    if not recipe_allowed_for_user(recipe):
                        replacement = find_macro_similar_recipe(
                            meal_type=meal_type,
                            target_recipe=recipe,
                            meal_base=meal,
                            used_ids=used_recipe_ids,
                        )
                        if not replacement:
                            continue
                    selected_recipe = replacement or recipe
                    used_recipe_ids.add(selected_recipe.id)
                    calories = meal_recipe.get_display_calories()
                    protein = meal_recipe.get_display_protein()
                    carbs = meal_recipe.get_display_carbs()
                    fat = meal_recipe.get_display_fat()
                    meal_options.append({
                        'id': f"meal-{meal.id}-recipe-{selected_recipe.id}",
                        'name': selected_recipe.name,
                        'calories': int(calories) if not replacement else build_recipe_option(selected_recipe, meal_type, meal, meal.id)['calories'],
                        'protein': round(float(protein), 1) if not replacement else build_recipe_option(selected_recipe, meal_type, meal, meal.id)['protein'],
                        'carbs': round(float(carbs), 1) if not replacement else build_recipe_option(selected_recipe, meal_type, meal, meal.id)['carbs'],
                        'fat': round(float(fat), 1) if not replacement else build_recipe_option(selected_recipe, meal_type, meal, meal.id)['fat'],
                        'category': 'balanced',
                        'icon': '🍽️',
                        'description': selected_recipe.description or meal.description,
                        'cookTime': f"{selected_recipe.prep_time_minutes + selected_recipe.cook_time_minutes} min",
                        'recipeId': selected_recipe.id,
                        'imageUrl': selected_recipe.image_url or (selected_recipe.image.url if selected_recipe.image else ''),
                    })
            # Si hay recetas sugeridas, crear una opción por cada receta (sin límite)
            elif meal.suggested_recipes.exists():
                used_recipe_ids = set()
                for recipe in meal.suggested_recipes.all():
                    replacement = None
                    if not recipe_allowed_for_user(recipe):
                        replacement = find_macro_similar_recipe(
                            meal_type=meal_type,
                            target_recipe=recipe,
                            meal_base=meal,
                            used_ids=used_recipe_ids,
                        )
                        if not replacement:
                            continue
                    selected_recipe = replacement or recipe
                    if selected_recipe.id in used_recipe_ids:
                        continue
                    used_recipe_ids.add(selected_recipe.id)
                    meal_options.append(build_recipe_option(selected_recipe, meal_type, meal, meal.id))
            else:
                # Si no hay recetas, crear una opción genérica basada en la comida
                personalized = personalize_meal(meal, meal_type)
                meal_options.append({
                    'id': f"meal-{meal.id}",
                    'name': meal.name,
                    'calories': personalized['calories'],
                    'protein': personalized['protein'],
                    'carbs': personalized['carbs'],
                    'fat': personalized['fat'],
                    'category': 'balanced',
                    'icon': '🍽️',
                    'description': meal.description,
                    'cookTime': '15 min'
                })

            if not meal_options:
                fallback_candidates = []
                for candidate in Recipe.objects.filter(is_active=True).exclude(id__in=excluded_recipe_ids):
                    if not recipe_allowed_for_user(candidate):
                        continue
                    candidate_meal_types = [str(item).lower() for item in (candidate.meal_types or [])]
                    candidate_category = str(candidate.category or '').lower()
                    if meal_type.lower() in candidate_meal_types or candidate_category == meal_type.lower():
                        fallback_candidates.append(candidate)
                    if len(fallback_candidates) >= 5:
                        break
                for recipe in fallback_candidates:
                    meal_options.append(build_recipe_option(recipe, meal_type, meal, meal.id))
            
            meals_by_type[meal_type].extend(meal_options)
            options_by_meal_id[str(meal.id)] = meal_options
        
        # Si el usuario tiene plan pero no hay comidas configuradas para ese día,
        # NO devolver vacío: continuar con plantillas del sistema / fallback por recetas.
        if meal_slots:
            return Response({
                'meals_by_type': meals_by_type,
                'meal_slots': meal_slots,
                'options_by_meal_id': options_by_meal_id,
                'plan_name': user_plan.name,
                'source': 'user_plan',
                'date': date_for_slots.isoformat(),
                'daily_calories_target': daily_calories,
                'daily_macros': daily_macros
            })
    
    # Si no tiene plan (o no hay comidas configuradas), devolver opciones desde plantillas del sistema
    system_plans = NutritionPlan.objects.filter(
        is_system=True,
        is_active=True
    ).prefetch_related(
        'meals__suggested_recipes',
        'meals__meal_recipes',
        'meals__meal_recipes__recipe',
    )
    
    for plan in system_plans:
        for meal in plan.meals.all().order_by('order_index', 'id'):
            meal_type = meal.meal_type
            if requested_meal_type and meal_type != requested_meal_type:
                continue
            if meal_type not in meals_by_type:
                meals_by_type[meal_type] = []
            
            # Crear opciones basadas en la comida y sus recetas sugeridas (sin límite)
            meal_options = []
            if meal.meal_recipes.exists():
                for meal_recipe in meal.meal_recipes.all().order_by('display_order', 'id'):
                    recipe = meal_recipe.recipe
                    if not recipe_allowed_for_user(recipe):
                        continue
                    calories = meal_recipe.get_display_calories()
                    protein = meal_recipe.get_display_protein()
                    carbs = meal_recipe.get_display_carbs()
                    fat = meal_recipe.get_display_fat()
                    meal_options.append({
                        'id': f"meal-{meal.id}-recipe-{recipe.id}",
                        'name': recipe.name,
                        'calories': int(calories),
                        'protein': round(float(protein), 1),
                        'carbs': round(float(carbs), 1),
                        'fat': round(float(fat), 1),
                        'category': 'balanced',
                        'icon': '🍽️',
                        'description': recipe.description or meal.description,
                        'cookTime': f"{recipe.prep_time_minutes + recipe.cook_time_minutes} min",
                        'recipeId': recipe.id,
                        'imageUrl': recipe.image_url or (recipe.image.url if recipe.image else ''),
                    })
            elif meal.suggested_recipes.exists():
                for recipe in meal.suggested_recipes.all():
                    if not recipe_allowed_for_user(recipe):
                        continue
                    personalized = personalize_recipe(recipe, meal_type, meal)
                    meal_options.append({
                        'id': f"meal-{meal.id}-recipe-{recipe.id}",
                        'name': recipe.name,
                        'calories': personalized['calories'],
                        'protein': personalized['protein'],
                        'carbs': personalized['carbs'],
                        'fat': personalized['fat'],
                        'category': 'balanced',
                        'icon': '🍽️',
                        'description': recipe.description or meal.description,
                        'cookTime': f"{recipe.prep_time_minutes + recipe.cook_time_minutes} min",
                        'recipeId': recipe.id,
                        'imageUrl': recipe.image_url or (recipe.image.url if recipe.image else ''),
                    })
            else:
                personalized = personalize_meal(meal, meal_type)
                meal_options.append({
                    'id': f"meal-{meal.id}",
                    'name': meal.name,
                    'calories': personalized['calories'],
                    'protein': personalized['protein'],
                    'carbs': personalized['carbs'],
                    'fat': personalized['fat'],
                    'category': 'balanced',
                    'icon': '🍽️',
                    'description': meal.description,
                    'cookTime': '15 min'
                })

            meals_by_type[meal_type].extend(meal_options)

    # Si hay comidas en las plantillas del sistema, devolverlas
    if meals_by_type:
        return Response({
            'meals_by_type': meals_by_type,
            'date': date_for_slots.isoformat(),
            'daily_calories_target': daily_calories,
            'daily_macros': daily_macros
        })

    # Si tampoco hay comidas en las plantillas del sistema, hacer fallback usando recetas activas.
    fallback_types = [requested_meal_type] if requested_meal_type else [
        'breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner'
    ]
    fallback_icon = {
        'breakfast': '🌅',
        'morning_snack': '☕',
        'lunch': '🍽️',
        'afternoon_snack': '🍎',
        'dinner': '🌙',
    }

    recipes_qs = Recipe.objects.filter(is_active=True)
    if excluded_recipe_ids:
        recipes_qs = recipes_qs.exclude(id__in=excluded_recipe_ids)
    for meal_type in fallback_types:
        meal_options = []
        candidates = []
        for candidate in recipes_qs:
            if not recipe_allowed_for_user(candidate):
                continue
            candidate_meal_types = [str(item).lower() for item in (candidate.meal_types or [])]
            candidate_category = str(candidate.category or '').lower()
            if meal_type and (meal_type.lower() in candidate_meal_types or candidate_category == meal_type.lower()):
                candidates.append(candidate)

        for recipe in candidates:
            personalized = personalize_recipe(recipe, meal_type)
            meal_options.append({
                'id': f"recipe-{recipe.id}",
                'name': recipe.name,
                'calories': personalized['calories'],
                'protein': personalized['protein'],
                'carbs': personalized['carbs'],
                'fat': personalized['fat'],
                'category': 'balanced',
                'icon': fallback_icon.get(meal_type, '🍽️'),
                'description': recipe.description or '',
                'cookTime': f"{recipe.prep_time_minutes + recipe.cook_time_minutes} min",
                'recipeId': recipe.id,
                'imageUrl': recipe.image_url or (recipe.image.url if recipe.image else ''),
            })

        meals_by_type[meal_type] = meal_options

    return Response({
        'meals_by_type': meals_by_type,
        'meal_slots': build_standard_slots(fallback_types),
        'date': date_for_slots.isoformat(),
        'daily_calories_target': daily_calories,
        'daily_macros': daily_macros
    })


@extend_schema(
    tags=['Nutrition'],
    summary='Selecciones de comidas de hoy',
    responses=inline_serializer(
        name='DailyMealSelectionsTodayResponse',
        fields={
            'date': serializers.CharField(),
            'selections': MealLogSerializer(many=True),
            'plan_meals': PlanMealSerializer(many=True),
            'has_plan': serializers.BooleanField(),
        },
    ),
    examples=[
        OpenApiExample(
            'Today selections response',
            value={
                'date': '2026-04-29',
                'selections': [],
                'plan_meals': [],
                'has_plan': True,
            },
            response_only=True,
        )
    ],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def daily_meal_selections_today(request):
    """
    Obtener las selecciones de comidas de hoy.
    GET /api/nutrition/daily-meal-selections/today/
    """
    from django.utils import timezone
    date = timezone.localdate()
    user = request.user
    
    # Obtener los logs de comidas del día
    meal_logs = MealLog.objects.filter(user=user, date=date)
    serializer = MealLogSerializer(meal_logs, many=True)
    
    # También obtener las comidas del plan si existe
    user_plan = NutritionPlan.objects.filter(
        user=user, is_active=True
    ).prefetch_related('meals__suggested_recipes').first()
    
    plan_meals = []
    if user_plan:
        plan_meals = PlanMealSerializer(user_plan.meals.all(), many=True).data
    
    return Response({
        'date': date.isoformat(),
        'selections': serializer.data,
        'plan_meals': plan_meals,
        'has_plan': user_plan is not None
    })


@extend_schema(
    tags=['Nutrition'],
    summary='Consultar o guardar selecciones diarias de comidas',
    request=inline_serializer(
        name='DailyMealSelectionRequest',
        fields={
            'date': serializers.CharField(required=False),
            'meal_type': serializers.CharField(required=False),
            'recipe_id': serializers.CharField(required=False),
            'plan_meal_id': serializers.CharField(required=False),
            'completed': serializers.BooleanField(required=False),
            'skip_meal': serializers.BooleanField(required=False),
            'skip_reason': serializers.CharField(required=False),
            'exclude_from_recommendations': serializers.BooleanField(required=False),
            'custom_description': serializers.CharField(required=False),
            'calories': serializers.IntegerField(required=False),
            'protein': serializers.FloatField(required=False),
            'carbs': serializers.FloatField(required=False),
            'fat': serializers.FloatField(required=False),
        },
    ),
    responses={
        200: inline_serializer(
            name='DailyMealSelectionsGetResponse',
            fields={
                'date': serializers.CharField(),
                'selections': MealLogSerializer(many=True),
                'plan_meals': PlanMealSerializer(many=True),
                'has_plan': serializers.BooleanField(),
            },
        ),
        201: MealLogSerializer,
    },
    examples=[
        OpenApiExample(
            'Daily selections get response',
            value={
                'date': '2026-04-29',
                'selections': [],
                'plan_meals': [],
                'has_plan': True,
            },
            response_only=True,
        ),
        OpenApiExample(
            'Daily selection post request',
            value={
                'date': '2026-04-29',
                'meal_type': 'breakfast',
                'recipe_id': 'd664ff4a-c306-4a1b-bb1e-67b8adf95452',
                'completed': True,
            },
            request_only=True,
        ),
    ],
)
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def daily_meal_selections(request):
    """
    Obtener o crear selecciones de comidas para un día específico.
    GET: Obtener las selecciones de comidas del día
    POST: Guardar/actualizar las selecciones de comidas del día
    """
    from django.utils import timezone
    
    date_str = request.query_params.get('date') or request.data.get('date')
    if date_str:
        try:
            from datetime import datetime
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            date = timezone.localdate()
    else:
        date = timezone.localdate()
    
    user = request.user
    
    if request.method == 'GET':
        # Obtener los logs de comidas del día
        meal_logs = MealLog.objects.filter(user=user, date=date)
        serializer = MealLogSerializer(meal_logs, many=True)

        # También obtener las comidas del plan si existe
        user_plan = get_active_plan_for_user(user)
        if user_plan:
            user_plan = NutritionPlan.objects.filter(pk=user_plan.pk).prefetch_related('meals__suggested_recipes').first()

        plan_meals = []
        if user_plan:
            plan_meals = PlanMealSerializer(user_plan.meals.all(), many=True).data

        # Siempre devolver 200 y un array vacío si no hay selecciones
        return Response({
            'date': date.isoformat(),
            'selections': serializer.data if serializer.data else [],
            'plan_meals': plan_meals,
            'has_plan': user_plan is not None
        }, status=200)
    
    elif request.method == 'POST':
        # Guardar selección de comida
        data = request.data
        photo_file = request.FILES.get('photo') if hasattr(request, 'FILES') else None
        meal_type = data.get('meal_type')
        recipe_id = data.get('recipe_id')
        plan_meal_id = data.get('plan_meal_id')
        skip_meal = data.get('skip_meal', False)
        skip_reason = str(data.get('skip_reason', '') or '').strip()
        exclude_from_recommendations = data.get('exclude_from_recommendations', False)
        
        # Resolver plan_meal (slot) si se proporciona, y permitir inferir meal_type desde el slot
        plan_meal = None
        if plan_meal_id:
            try:
                active_plan = get_active_plan_for_user(user)
                if active_plan:
                    active_plan = NutritionPlan.objects.filter(pk=active_plan.pk).prefetch_related('meals').first()
                if active_plan:
                    plan_meal = active_plan.meals.filter(id=plan_meal_id).first()
            except Exception:
                plan_meal = None

        if not meal_type and plan_meal:
            meal_type = plan_meal.meal_type

        if not meal_type:
            return Response({'error': 'meal_type es requerido'}, status=status.HTTP_400_BAD_REQUEST)

        if isinstance(skip_meal, str):
            skip_meal = skip_meal.lower() in ('true', '1', 'yes', 'si', 'sí')
        if isinstance(exclude_from_recommendations, str):
            exclude_from_recommendations = exclude_from_recommendations.lower() in ('true', '1', 'yes', 'si', 'sí')
        
        # Obtener receta si se proporciona recipe_id
        recipe = None
        if recipe_id:
            try:
                # Intentar convertir a UUID si es necesario
                from uuid import UUID
                try:
                    # Si es un UUID válido, usarlo directamente
                    recipe_uuid = UUID(str(recipe_id))
                    recipe = Recipe.objects.get(id=recipe_uuid, is_active=True)
                except (ValueError, TypeError):
                    # Si no es UUID, intentar como string o número
                    recipe = Recipe.objects.get(id=recipe_id, is_active=True)
            except Recipe.DoesNotExist:
                # Si no se encuentra la receta, no es un error fatal - usar custom_description
                logger.warning(f'Receta con id {recipe_id} no encontrada, usando custom_description')
                recipe = None
            except Exception as e:
                logger.warning(f'Error obteniendo receta {recipe_id}: {e}, usando custom_description')
                recipe = None

        # Bloquear si la receta contiene alérgenos del usuario (no aplica a admins)
        if recipe and not (request.user.is_staff or getattr(request.user, 'role', None) == 'admin'):
            user_allergens = getattr(request.user, 'allergies', None) or []
            recipe_allergens = getattr(recipe, 'allergens', None) or []
            conflicts = [a for a in recipe_allergens if a in user_allergens]
            if conflicts:
                ALLERGEN_LABELS = {
                    'gluten': 'Gluten', 'dairy': 'Lácteos', 'eggs': 'Huevo',
                    'nuts': 'Frutos secos', 'soy': 'Soja', 'fish': 'Pescado',
                    'shellfish': 'Marisco', 'sesame': 'Sésamo',
                }
                conflict_names = [ALLERGEN_LABELS.get(a, a) for a in conflicts]
                return Response(
                    {
                        'error': 'allergen_conflict',
                        'detail': (
                            f'No puedes añadir "{recipe.name}" porque contiene alérgenos a los que eres '
                            f'sensible: {", ".join(conflict_names)}.'
                        ),
                        'allergens': conflicts,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Crear o actualizar el log de comida
        # Si es una selección (no completada), guardar con completed=False
        # Si es una comida consumida, guardar con completed=True
        is_completed = data.get('completed', False)
        if isinstance(is_completed, str):
            is_completed = is_completed.lower() in ('true', '1', 'yes')

        if skip_meal:
            is_completed = False
        
        # Si hay receta, usar sus valores nutricionales; si no, usar los proporcionados
        calories = data.get('calories', 0)
        protein = data.get('protein', 0)
        carbs = data.get('carbs', 0)
        fat = data.get('fat', 0)
        
        # Si hay receta y no se proporcionaron valores, usar los de la receta
        if recipe and not calories:
            calories = recipe.calories or 0
            protein = float(recipe.protein) if recipe.protein else 0
            carbs = float(recipe.carbs) if recipe.carbs else 0
            fat = float(recipe.fat) if recipe.fat else 0
        
        # Solo contar calorías si está completada
        # Si está completada, usar los valores proporcionados o de la receta
        # Si no está completada, poner a 0 para que no cuente en los macros
        if not is_completed:
            calories = 0
            protein = 0
            carbs = 0
            fat = 0
        # Si está completada pero no hay valores, intentar obtenerlos de la receta
        elif is_completed and not calories and recipe:
            calories = recipe.calories or 0
            protein = float(recipe.protein) if recipe.protein else 0
            carbs = float(recipe.carbs) if recipe.carbs else 0
            fat = float(recipe.fat) if recipe.fat else 0
        
        # Obtener custom_description o usar el nombre de la receta
        custom_description = data.get('custom_description', '')
        if not custom_description and recipe:
            custom_description = recipe.name
        
        # Si hay slot, se guarda por (user, date, plan_meal) para permitir múltiples del mismo tipo
        lookup = {'user': user, 'date': date}
        if plan_meal:
            lookup['plan_meal'] = plan_meal
            lookup['meal_type'] = meal_type
        else:
            lookup['meal_type'] = meal_type

        defaults = {
            'plan_meal': plan_meal,
            'recipe': recipe,
            'completed': is_completed,
            'is_skipped': bool(skip_meal),
            'skip_reason': skip_reason if skip_meal else '',
            'calories': int(calories) if calories else 0,
            'protein': float(protein) if protein else 0,
            'carbs': float(carbs) if carbs else 0,
            'fat': float(fat) if fat else 0,
            'custom_description': custom_description,
        }
        if photo_file:
            defaults['photo'] = photo_file

        meal_log, created = MealLog.objects.update_or_create(
            **lookup,
            defaults=defaults,
        )

        if skip_meal and recipe and exclude_from_recommendations:
            try:
                exclusion, _ = MealRecipeExclusion.objects.get_or_create(
                    user=user,
                    recipe=recipe,
                    defaults={
                        'reason': skip_reason,
                        'is_active': True,
                    },
                )
                if exclusion and not exclusion.is_active:
                    exclusion.is_active = True
                    exclusion.reason = skip_reason or exclusion.reason
                    exclusion.save(update_fields=['is_active', 'reason', 'updated_at'])
            except DatabaseError as exc:
                logger.warning(
                    "No se pudo guardar MealRecipeExclusion para usuario %s y receta %s: %s",
                    user.id,
                    recipe.id,
                    exc,
                )
                _persist_fallback_excluded_recipe(user, recipe.id)
        
        serializer = MealLogSerializer(meal_log)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@extend_schema(
    methods=['GET'],
    tags=['Nutrition'],
    summary='Listar exclusiones de recetas del usuario',
    responses={200: inline_serializer(
        name='MealExclusionsListResponse',
        fields={
            'exclusions': serializers.ListField(
                child=inline_serializer(
                    name='MealExclusionItem',
                    fields={
                        'id': serializers.CharField(),
                        'recipe_id': serializers.CharField(),
                        'recipe_name': serializers.CharField(),
                        'image_url': serializers.CharField(),
                        'reason': serializers.CharField(),
                    },
                )
            )
        },
    )},
)
@extend_schema(
    methods=['POST'],
    tags=['Nutrition'],
    summary='Añadir exclusión de receta',
    request=inline_serializer(
        name='MealExclusionCreateRequest',
        fields={
            'recipe_id': serializers.UUIDField(),
            'reason': serializers.CharField(required=False),
        },
    ),
    responses={201: inline_serializer(
        name='MealExclusionCreateResponse',
        fields={
            'id': serializers.CharField(),
            'recipe_id': serializers.CharField(),
            'recipe_name': serializers.CharField(),
            'image_url': serializers.CharField(),
            'reason': serializers.CharField(),
        },
    )},
)
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def meal_exclusions(request):
    user = request.user

    if request.method == 'GET':
        data = []
        try:
            exclusions = MealRecipeExclusion.objects.filter(
                user=user,
                is_active=True,
            ).select_related('recipe').order_by('-updated_at')
            data = [
                {
                    'id': str(exclusion.id),
                    'recipe_id': str(exclusion.recipe_id),
                    'recipe_name': exclusion.recipe.name,
                    'image_url': exclusion.recipe.image_url or (exclusion.recipe.image.url if exclusion.recipe.image else ''),
                    'reason': exclusion.reason,
                }
                for exclusion in exclusions
            ]
        except DatabaseError as exc:
            logger.warning("Fallback GET meal_exclusions para usuario %s: %s", user.id, exc)
            fallback_ids = list(_extract_fallback_excluded_recipe_ids(user))
            if fallback_ids:
                recipe_map = {
                    str(recipe.id).lower(): recipe
                    for recipe in Recipe.objects.filter(id__in=fallback_ids, is_active=True)
                }
                data = [
                    {
                        'id': f"fallback-{recipe_id}",
                        'recipe_id': recipe_id,
                        'recipe_name': recipe_map[recipe_id].name if recipe_id in recipe_map else 'Receta excluida',
                        'image_url': (
                            recipe_map[recipe_id].image_url
                            or (recipe_map[recipe_id].image.url if recipe_id in recipe_map and recipe_map[recipe_id].image else '')
                        ) if recipe_id in recipe_map else '',
                        'reason': 'No me gusta esta comida',
                    }
                    for recipe_id in fallback_ids
                ]
        return Response({'exclusions': data}, status=status.HTTP_200_OK)

    recipe_id = request.data.get('recipe_id')
    reason = str(request.data.get('reason', '') or '').strip()
    if not recipe_id:
        return Response({'error': 'recipe_id es requerido'}, status=status.HTTP_400_BAD_REQUEST)

    recipe = get_object_or_404(Recipe, id=recipe_id)
    exclusion_payload = None
    try:
        exclusion, _ = MealRecipeExclusion.objects.get_or_create(
            user=user,
            recipe=recipe,
            defaults={'reason': reason, 'is_active': True},
        )
        if not exclusion.is_active or reason:
            exclusion.is_active = True
            if reason:
                exclusion.reason = reason
            exclusion.save(update_fields=['is_active', 'reason', 'updated_at'])

        exclusion_payload = {
            'id': str(exclusion.id),
            'recipe_id': str(exclusion.recipe_id),
            'recipe_name': exclusion.recipe.name,
            'image_url': exclusion.recipe.image_url or (exclusion.recipe.image.url if exclusion.recipe.image else ''),
            'reason': exclusion.reason,
        }
    except DatabaseError as exc:
        logger.warning("Fallback POST meal_exclusions para usuario %s y receta %s: %s", user.id, recipe.id, exc)
        _persist_fallback_excluded_recipe(user, recipe.id)
        exclusion_payload = {
            'id': f"fallback-{recipe.id}",
            'recipe_id': str(recipe.id),
            'recipe_name': recipe.name,
            'image_url': recipe.image_url or (recipe.image.url if recipe.image else ''),
            'reason': reason or 'No me gusta esta comida',
        }

    notify_admins_user_change(
        user=user,
        title='🥗 Cambios en preferencias de nutrición',
        message=f"{user.email} marcó receta como no consumida: {recipe.name}",
        data={
            'category': 'nutrition_exclusion_change',
            'change_type': 'recipe_exclusion_added',
            'recipe_name': recipe.name,
        },
    )

    notify_admins_user_change(
        user=user,
        title='🗂️ Cambios en exclusiones de recetas',
        message=f"{user.email} marcó como no consumida la receta: {recipe.name}",
        data={
            'category': 'nutrition_exclusion_change',
            'change_type': 'recipe_exclusion_added',
            'recipe_name': recipe.name,
        },
    )

    return Response(exclusion_payload, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=['Nutrition'],
    summary='Eliminar exclusión de receta',
    responses={204: None},
)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def meal_exclusion_detail(request, exclusion_id):
    if str(exclusion_id).startswith('fallback-'):
        recipe_id = str(exclusion_id).replace('fallback-', '', 1)
        _remove_fallback_excluded_recipe(request.user, recipe_id)
        return Response(status=status.HTTP_204_NO_CONTENT)

    exclusion = get_object_or_404(MealRecipeExclusion, id=exclusion_id, user=request.user)
    recipe_name = exclusion.recipe.name
    if exclusion.is_active:
        exclusion.is_active = False
        exclusion.save(update_fields=['is_active', 'updated_at'])
        notify_admins_user_change(
            user=request.user,
            title='🗂️ Cambios en exclusiones de recetas',
            message=f"{request.user.email} quitó exclusión de receta: {recipe_name}",
            data={
                'category': 'nutrition_exclusion_change',
                'change_type': 'recipe_exclusion_removed',
                'recipe_name': recipe_name,
            },
        )
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    methods=['GET'],
    tags=['Nutrition'],
    summary='Listar exclusiones de ingredientes del usuario',
    responses={200: inline_serializer(
        name='IngredientExclusionsListResponse',
        fields={
            'exclusions': serializers.ListField(
                child=inline_serializer(
                    name='IngredientExclusionItem',
                    fields={
                        'id': serializers.CharField(),
                        'term': serializers.CharField(),
                        'reason': serializers.CharField(),
                    },
                )
            )
        },
    )},
)
@extend_schema(
    methods=['POST'],
    tags=['Nutrition'],
    summary='Añadir exclusión de ingrediente',
    request=inline_serializer(
        name='IngredientExclusionCreateRequest',
        fields={
            'term': serializers.CharField(),
            'reason': serializers.CharField(required=False),
        },
    ),
    responses={201: inline_serializer(
        name='IngredientExclusionCreateResponse',
        fields={
            'id': serializers.CharField(),
            'term': serializers.CharField(),
            'reason': serializers.CharField(),
        },
    )},
)
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def ingredient_exclusions(request):
    user = request.user

    if request.method == 'GET':
        exclusions = MealIngredientExclusion.objects.filter(
            user=user,
            is_active=True,
        ).order_by('term')
        data = [
            {
                'id': str(exclusion.id),
                'term': exclusion.term,
                'reason': exclusion.reason,
            }
            for exclusion in exclusions
        ]
        return Response({'exclusions': data}, status=status.HTTP_200_OK)

    term = str(request.data.get('term', '') or '').strip().lower()
    reason = str(request.data.get('reason', '') or '').strip()
    if not term:
        return Response({'error': 'term es requerido'}, status=status.HTTP_400_BAD_REQUEST)

    exclusion, _ = MealIngredientExclusion.objects.get_or_create(
        user=user,
        term=term,
        defaults={'reason': reason, 'is_active': True},
    )
    if not exclusion.is_active or reason:
        exclusion.is_active = True
        if reason:
            exclusion.reason = reason
        exclusion.save(update_fields=['is_active', 'reason', 'updated_at'])

    return Response(
        {
            'id': str(exclusion.id),
            'term': exclusion.term,
            'reason': exclusion.reason,
        },
        status=status.HTTP_201_CREATED,
    )


@extend_schema(
    tags=['Nutrition'],
    summary='Eliminar exclusión de ingrediente',
    responses={204: None},
)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def ingredient_exclusion_detail(request, exclusion_id):
    exclusion = get_object_or_404(MealIngredientExclusion, id=exclusion_id, user=request.user)
    removed_term = exclusion.term
    if exclusion.is_active:
        exclusion.is_active = False
        exclusion.save(update_fields=['is_active', 'updated_at'])
        notify_admins_user_change(
            user=request.user,
            title='🥗 Cambios en preferencias de nutrición',
            message=f"{request.user.email} quitó ingrediente excluido: {removed_term}",
            data={
                'category': 'nutrition_exclusion_change',
                'change_type': 'ingredient_exclusion_removed',
                'ingredient_term': removed_term,
            },
        )
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    tags=['Nutrition'],
    summary='Ajustar calorías del plan nutricional activo',
    request=inline_serializer(
        name='AdjustPlanRequest',
        fields={
            'calorie_adjustment': serializers.IntegerField(help_text='Ajuste en kcal (-1000 a +1000)'),
            'reason': serializers.CharField(required=False),
            'notes': serializers.CharField(required=False),
        },
    ),
    responses={200: inline_serializer(
        name='AdjustPlanResponse',
        fields={
            'plan': NutritionPlanSerializer(),
            'message': serializers.CharField(),
            'old_calories': serializers.IntegerField(),
            'new_calories': serializers.IntegerField(),
            'adjustment': serializers.IntegerField(),
        },
    )},
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def adjust_plan(request):
    """
    Ajustar el plan nutricional actual del usuario con un ajuste de calorías específico.
    POST /api/nutrition/adjust-plan/
    
    Body:
    {
        "calorie_adjustment": 200,  # Ajuste en calorías (positivo = aumentar, negativo = reducir)
        "reason": "stalled_progress",  # Razón del ajuste (opcional)
        "notes": "Ajuste basado en análisis de progreso"  # Notas adicionales (opcional)
    }
    """
    user = request.user
    
    # Obtener plan activo del usuario
    active_plan = NutritionPlan.objects.filter(
        user=user, is_active=True
    ).select_related('user').prefetch_related('meals').first()
    if not active_plan:
        return Response(
            {'error': 'No tienes un plan nutricional activo'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Validar datos
    calorie_adjustment = request.data.get('calorie_adjustment')
    if calorie_adjustment is None:
        return Response(
            {'error': 'calorie_adjustment es requerido'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        calorie_adjustment = int(calorie_adjustment)
    except (ValueError, TypeError):
        return Response(
            {'error': 'calorie_adjustment debe ser un número entero'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validar rango razonable (-1000 a +1000 calorías)
    if abs(calorie_adjustment) > 1000:
        return Response(
            {'error': 'El ajuste de calorías debe estar entre -1000 y +1000'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Aplicar ajuste
        nutrition_service = PersonalizedNutritionService(user)
        reason = request.data.get('reason', 'manual_adjustment')
        notes = request.data.get('notes', f'Ajuste manual de {calorie_adjustment:+d} calorías basado en análisis de progreso')
        
        updated_plan = nutrition_service.adjust_plan_calories(
            plan=active_plan,
            calorie_adjustment=calorie_adjustment,
            reason=reason,
            notes=notes
        )
        
        # Serializar plan actualizado
        serializer = NutritionPlanSerializer(updated_plan)
        
        return Response({
            'plan': serializer.data,
            'message': f'Plan ajustado exitosamente. Nuevas calorías: {updated_plan.daily_calories} kcal ({calorie_adjustment:+d} kcal)',
            'old_calories': active_plan.daily_calories,
            'new_calories': updated_plan.daily_calories,
            'adjustment': calorie_adjustment
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f'Error ajustando plan para usuario {user.email}: {str(e)}')
        import traceback
        logger.error(traceback.format_exc())
        return Response(
            {'error': f'Error al ajustar el plan: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@extend_schema(
    tags=['Nutrition'],
    summary='Historial de cambios de plan nutricional',
    responses={200: inline_serializer(
        name='PlanHistoryResponse',
        fields={
            'history': NutritionPlanHistorySerializer(many=True),
            'count': serializers.IntegerField(),
        },
    )},
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def plan_history(request):
    """
    Obtener historial de cambios de planes nutricionales del usuario.
    GET /api/nutrition/plan-history/
    """
    user = request.user
    
    # Obtener historial del usuario ordenado por fecha más reciente
    history = NutritionPlanHistory.objects.filter(
        user=user
    ).select_related('changed_by').order_by('-created_at')[:50]  # Últimos 50 cambios
    
    serializer = NutritionPlanHistorySerializer(history, many=True)
    
    return Response({
        'history': serializer.data,
        'count': len(serializer.data)
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def monthly_meal_selections(request):
    """
    Obtener o crear selecciones de comidas para un mes.
    GET: Obtener selecciones del mes
    POST: Guardar selecciones para múltiples días del mes
    
    GET params:
        year: Año (por defecto año actual)
        month: Mes (1-12, por defecto mes actual)
    
    POST body:
    {
        "year": 2025,
        "month": 12,
        "selections": [
            {
                "date": "2025-12-23",
                "meal_type": "breakfast",
                "recipe_id": "...",
                "calories": 500,
                "protein": 30,
                "carbs": 50,
                "fat": 20
            },
            ...
        ]
    }
    """
    from django.utils import timezone
    from datetime import timedelta
    import calendar
    
    user = request.user
    
    if request.method == 'GET':
        # Obtener año y mes (por defecto mes actual)
        today = timezone.localdate()
        year = int(request.query_params.get('year', today.year))
        month = int(request.query_params.get('month', today.month))
        
        # Validar mes
        if month < 1 or month > 12:
            return Response(
                {'error': 'month debe estar entre 1 y 12'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calcular primer y último día del mes
        first_day = today.replace(year=year, month=month, day=1)
        last_day_num = calendar.monthrange(year, month)[1]
        last_day = first_day.replace(day=last_day_num)
        
        # Obtener selecciones del mes
        meal_logs = MealLog.objects.filter(
            user=user,
            date__gte=first_day,
            date__lte=last_day
        ).order_by('date', 'meal_type')
        
        # Organizar por día
        monthly_selections = {}
        for log in meal_logs:
            date_str = log.date.isoformat()
            if date_str not in monthly_selections:
                monthly_selections[date_str] = []
            monthly_selections[date_str].append(MealLogSerializer(log).data)
        
        return Response({
            'year': year,
            'month': month,
            'start_date': first_day.isoformat(),
            'end_date': last_day.isoformat(),
            'selections': monthly_selections
        })
    
    elif request.method == 'POST':
        # Guardar selecciones para múltiples días del mes
        data = request.data
        selections = data.get('selections', [])
        
        if not selections:
            return Response(
                {'error': 'selections es requerido y debe ser una lista'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created_count = 0
        updated_count = 0
        errors = []
        
        for selection_data in selections:
            try:
                date_str = selection_data.get('date')
                if not date_str:
                    errors.append({'selection': selection_data, 'error': 'date es requerido'})
                    continue
                
                try:
                    from datetime import datetime
                    selection_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                except ValueError:
                    errors.append({'selection': selection_data, 'error': 'date inválido'})
                    continue
                
                meal_type = selection_data.get('meal_type')
                if not meal_type:
                    errors.append({'selection': selection_data, 'error': 'meal_type es requerido'})
                    continue
                
                # Crear o actualizar selección
                # Por defecto, las selecciones se guardan como no completadas (solo planificación)
                is_completed = selection_data.get('completed', False)
                if isinstance(is_completed, str):
                    is_completed = is_completed.lower() in ('true', '1', 'yes')
                
                meal_log, created = MealLog.objects.update_or_create(
                    user=user,
                    date=selection_date,
                    meal_type=meal_type,
                    defaults={
                        'recipe_id': selection_data.get('recipe_id'),
                        'completed': is_completed,
                        # Solo contar calorías si está completada
                        'calories': selection_data.get('calories', 0) if is_completed else 0,
                        'protein': selection_data.get('protein', 0) if is_completed else 0,
                        'carbs': selection_data.get('carbs', 0) if is_completed else 0,
                        'fat': selection_data.get('fat', 0) if is_completed else 0,
                        'custom_description': selection_data.get('custom_description', ''),
                    }
                )
                
                if created:
                    created_count += 1
                else:
                    updated_count += 1
                    
            except Exception as e:
                errors.append({
                    'selection': selection_data,
                    'error': str(e)
                })
        
        return Response({
            'created': created_count,
            'updated': updated_count,
            'errors': errors,
            'message': f'Se procesaron {created_count + updated_count} selecciones ({created_count} nuevas, {updated_count} actualizadas)'
        }, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def weekly_meal_selections(request):
    """
    Obtener o crear selecciones de comidas para una semana.
    GET: Obtener selecciones de la semana
    POST: Guardar selecciones para múltiples días
    
    POST body:
    {
        "start_date": "2025-12-23",
        "selections": [
            {
                "date": "2025-12-23",
                "meal_type": "breakfast",
                "recipe_id": "...",
                "calories": 500,
                "protein": 30,
                "carbs": 50,
                "fat": 20
            },
            ...
        ]
    }
    """
    from django.utils import timezone
    from datetime import timedelta
    
    user = request.user
    
    if request.method == 'GET':
        # Obtener fecha de inicio de semana (por defecto semana actual)
        start_date_str = request.query_params.get('start_date')
        if start_date_str:
            try:
                from datetime import datetime
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            except ValueError:
                start_date = timezone.localdate()
        else:
            # Semana actual (lunes)
            today = timezone.localdate()
            start_date = today - timedelta(days=today.weekday())
        
        end_date = start_date + timedelta(days=6)  # Domingo
        
        # Obtener selecciones de la semana con optimización de consultas
        meal_logs = MealLog.objects.filter(
            user=user,
            date__gte=start_date,
            date__lte=end_date
        ).select_related('recipe').order_by('date', 'meal_type')
        
        # Organizar por día
        weekly_selections = {}
        for log in meal_logs:
            date_str = log.date.isoformat()
            if date_str not in weekly_selections:
                weekly_selections[date_str] = []
            weekly_selections[date_str].append(MealLogSerializer(log).data)
        
        return Response({
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'selections': weekly_selections
        })
    
    elif request.method == 'POST':
        # Guardar selecciones para múltiples días
        data = request.data
        selections = data.get('selections', [])
        
        if not selections:
            return Response(
                {'error': 'selections es requerido y debe ser una lista'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created_count = 0
        updated_count = 0
        errors = []
        
        for selection_data in selections:
            try:
                date_str = selection_data.get('date')
                if not date_str:
                    errors.append({'selection': selection_data, 'error': 'date es requerido'})
                    continue
                
                try:
                    from datetime import datetime
                    selection_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                except ValueError:
                    errors.append({'selection': selection_data, 'error': 'date inválido'})
                    continue
                
                meal_type = selection_data.get('meal_type')
                if not meal_type:
                    errors.append({'selection': selection_data, 'error': 'meal_type es requerido'})
                    continue

                plan_meal_id = selection_data.get('plan_meal_id')
                plan_meal = None
                if plan_meal_id:
                    try:
                        active_plan = get_active_plan_for_user(user)
                        if active_plan:
                            active_plan = NutritionPlan.objects.filter(pk=active_plan.pk).prefetch_related('meals').first()
                        if active_plan:
                            plan_meal = active_plan.meals.filter(id=plan_meal_id).first()
                    except Exception:
                        plan_meal = None
                
                # Crear o actualizar selección
                # Por defecto, las selecciones se guardan como no completadas (solo planificación)
                is_completed = selection_data.get('completed', False)
                if isinstance(is_completed, str):
                    is_completed = is_completed.lower() in ('true', '1', 'yes')
                
                lookup = {'user': user, 'date': selection_date, 'meal_type': meal_type}
                if plan_meal:
                    lookup['plan_meal'] = plan_meal

                meal_log, created = MealLog.objects.update_or_create(
                    **lookup,
                    defaults={
                        'plan_meal': plan_meal,
                        'recipe_id': selection_data.get('recipe_id'),
                        'completed': is_completed,
                        # Solo contar calorías si está completada
                        'calories': selection_data.get('calories', 0) if is_completed else 0,
                        'protein': selection_data.get('protein', 0) if is_completed else 0,
                        'carbs': selection_data.get('carbs', 0) if is_completed else 0,
                        'fat': selection_data.get('fat', 0) if is_completed else 0,
                        'custom_description': selection_data.get('custom_description', ''),
                    }
                )
                
                if created:
                    created_count += 1
                else:
                    updated_count += 1
                    
            except Exception as e:
                errors.append({
                    'selection': selection_data,
                    'error': str(e)
                })
        
        return Response({
            'message': f'Se procesaron {len(selections)} selecciones',
            'created': created_count,
            'updated': updated_count,
            'errors': errors if errors else None
        }, status=status.HTTP_200_OK)


class RecipeViewSet(viewsets.ModelViewSet):
    """ViewSet para recetas"""
    queryset = Recipe.objects.filter(is_active=True)
    serializer_class = RecipeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'ingredients']
    filterset_fields = ['category', 'difficulty', 'is_system', 'is_featured']
    ordering_fields = ['name', 'calories', 'prep_time_minutes', 'created_at']
    ordering = ['name']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return RecipeMinimalSerializer
        return RecipeSerializer
    
    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Lista de categorías"""
        return Response([
            {'value': 'breakfast', 'label': 'Desayuno'},
            {'value': 'lunch', 'label': 'Almuerzo'},
            {'value': 'dinner', 'label': 'Cena'},
            {'value': 'snack', 'label': 'Snack'},
            {'value': 'dessert', 'label': 'Postre'},
            {'value': 'drink', 'label': 'Bebida'},
        ])
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Recetas destacadas"""
        recipes = Recipe.objects.filter(is_featured=True, is_active=True)[:10]
        return Response(RecipeMinimalSerializer(recipes, many=True).data)

    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
        """Exporta recetas activas en formato CSV."""
        import csv
        from django.http import HttpResponse

        recipes = self.get_queryset().prefetch_related('recipe_ingredients__food')
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="recetas_exportacion.csv"'

        fieldnames = [
            'nombre',
            'descripción',
            'categoría',
            'dificultad',
            'porciones',
            'tiempo_preparacion_minutos',
            'ingredientes',
            'instrucciones',
            'imagen_url',
            'calorias_ref',
            'proteinas_ref',
            'carbos_ref',
            'grasas_ref',
        ]
        writer = csv.DictWriter(response, fieldnames=fieldnames)
        writer.writeheader()

        for recipe in recipes:
            ingredient_parts = []
            for ingredient in recipe.recipe_ingredients.all():
                ingredient_parts.append(
                    f"{ingredient.food.name}|{ingredient.quantity}|{ingredient.unit}|{ingredient.notes or ''}"
                )

            writer.writerow({
                'nombre': recipe.name,
                'descripción': recipe.description or '',
                'categoría': recipe.category or '',
                'dificultad': recipe.difficulty or '',
                'porciones': recipe.servings or 1,
                'tiempo_preparacion_minutos': recipe.prep_time_minutes or 0,
                'ingredientes': '; '.join(ingredient_parts),
                'instrucciones': recipe.instructions or '',
                'imagen_url': recipe.image_url or '',
                'calorias_ref': recipe.calories or 0,
                'proteinas_ref': recipe.protein or 0,
                'carbos_ref': recipe.carbs or 0,
                'grasas_ref': recipe.fat or 0,
            })

        return response

    @action(detail=False, methods=['get'], url_path='export-excel')
    def export_excel(self, request):
        """Exporta recetas activas en formato Excel."""
        import io
        import xlsxwriter
        from django.http import HttpResponse

        recipes = self.get_queryset().prefetch_related('recipe_ingredients__food')
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True, 'strings_to_urls': False})
        worksheet = workbook.add_worksheet('Recetas')

        headers = [
            'Nombre',
            'Descripcion',
            'Categoria',
            'Dificultad',
            'Porciones',
            'Tiempo preparacion minutos',
            'Ingredientes',
            'Instrucciones',
            'Imagen URL',
            'Calorias ref',
            'Proteinas ref',
            'Carbos ref',
            'Grasas ref',
        ]
        for column, header in enumerate(headers):
            worksheet.write(0, column, header)

        for row, recipe in enumerate(recipes, start=1):
            ingredients_value = '; '.join(
                f"{ingredient.food.name}|{ingredient.quantity}|{ingredient.unit}|{ingredient.notes or ''}"
                for ingredient in recipe.recipe_ingredients.all()
            )
            values = [
                recipe.name,
                recipe.description or '',
                recipe.category or '',
                recipe.difficulty or '',
                recipe.servings or 1,
                recipe.prep_time_minutes or 0,
                ingredients_value,
                recipe.instructions or '',
                recipe.image_url or '',
                recipe.calories or 0,
                float(recipe.protein or 0),
                float(recipe.carbs or 0),
                float(recipe.fat or 0),
            ]
            for column, value in enumerate(values):
                worksheet.write(row, column, value)

        workbook.close()
        output.seek(0)

        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="recetas_exportacion.xlsx"'
        return response
    
    @action(detail=True, methods=['get'])
    def personalized(self, request, pk=None):
        """
        Obtiene cantidades personalizadas de una receta según el perfil del usuario.
        GET /api/nutrition/recipes/{id}/personalized/?meal_type=breakfast
        """
        import logging
        logger = logging.getLogger(__name__)
        
        recipe = get_object_or_404(Recipe, pk=pk, is_active=True)
        meal_type = request.query_params.get('meal_type', 'lunch')
        
        # Validar meal_type
        valid_meal_types = ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'evening_snack', 'snack']
        if meal_type not in valid_meal_types:
            meal_type = 'lunch'
        
        user = request.user
        logger.info(f"🍽️ Personalizando receta '{recipe.name}' (ID: {pk}) para usuario: {user.email} (ID: {user.id})")
        logger.info(f"📊 Perfil: peso={user.weight}kg, altura={user.height}cm, objetivo={user.main_goal}, tipo_comida={meal_type}")
        
        # Calcular cantidades personalizadas
        service = PersonalizedNutritionService(user)
        personalized = service.calculate_personalized_recipe_quantities(recipe, meal_type)
        
        daily_calories = service.calculate_daily_calories()
        logger.info(f"🔥 Calorías diarias: {daily_calories} kcal, Factor escala: {personalized['scale_factor']:.2f}, "
                   f"Calorías personalizadas: {personalized['macros']['calories']} kcal")
        
        # Serializar la receta (con fallback para evitar 500 por datos relacionales inconsistentes)
        recipe_data = _safe_recipe_payload(recipe)
        
        return Response({
            'recipe': recipe_data,
            'personalized_quantities': personalized,
            'user_profile': {
                'weight': user.weight,
                'height': user.height,
                'age': user.age,
                'gender': user.gender,
                'main_goal': user.main_goal,
                'activity_level': user.activity_level,
                'daily_calories_target': daily_calories
            }
        })
    
    @action(detail=True, methods=['get', 'post'])
    def ingredients(self, request, pk=None):
        """
        GET: Lista ingredientes de una receta
        POST: Añade un ingrediente a la receta
        """
        recipe = self.get_object()
        
        if request.method == 'GET':
            ingredients = recipe.recipe_ingredients.all()
            serializer = RecipeIngredientSerializer(ingredients, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            # Solo admin puede modificar
            if not request.user.is_staff:
                return Response(
                    {'error': 'Solo administradores pueden añadir ingredientes'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            serializer = RecipeIngredientSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(recipe=recipe)
                # Recalcular macros
                recipe.calculate_macros_from_ingredients()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['put', 'delete'], url_path='ingredients/(?P<ingredient_id>[^/.]+)')
    def ingredient_detail(self, request, pk=None, ingredient_id=None):
        """
        PUT: Actualiza un ingrediente
        DELETE: Elimina un ingrediente
        """
        recipe = self.get_object()
        
        # Solo admin puede modificar
        if not request.user.is_staff:
            return Response(
                {'error': 'Solo administradores pueden modificar ingredientes'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            ingredient = recipe.recipe_ingredients.get(id=ingredient_id)
        except RecipeIngredient.DoesNotExist:
            return Response(
                {'error': 'Ingrediente no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if request.method == 'PUT':
            serializer = RecipeIngredientSerializer(ingredient, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.method == 'DELETE':
            ingredient.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['post'])
    def recalculate_macros(self, request, pk=None):
        """Recalcula los macros de la receta basándose en los ingredientes"""
        recipe = self.get_object()
        
        if not request.user.is_staff:
            return Response(
                {'error': 'Solo administradores pueden recalcular macros'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        success = recipe.calculate_macros_from_ingredients()
        
        if success:
            return Response({
                'message': 'Macros recalculados correctamente',
                'calories': recipe.calories,
                'protein': float(recipe.protein),
                'carbs': float(recipe.carbs),
                'fat': float(recipe.fat),
                'fiber': float(recipe.fiber),
                'sugar': float(recipe.sugar),
                'sodium': float(recipe.sodium),
            })
        else:
            return Response({
                'message': 'No hay ingredientes para calcular macros'
            }, status=status.HTTP_400_BAD_REQUEST)


class NutritionPlanViewSet(viewsets.ModelViewSet):
    """ViewSet para planes de nutrición"""
    serializer_class = NutritionPlanSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    filterset_fields = ['goal', 'diet_type', 'is_system', 'is_template', 'is_active']
    ordering_fields = ['name', 'daily_calories', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return NutritionPlan.objects.none()
        user = self.request.user
        role = str(getattr(user, "role", "") or "").lower()
        if user.is_staff or user.is_superuser or role in {"admin", "trainer", "pro"}:
            base_queryset = NutritionPlan.objects.all()
        else:
            base_queryset = NutritionPlan.objects.filter(
                models.Q(is_system=True) | models.Q(user=user) | models.Q(assignments__user=user)
            )

        return base_queryset.distinct().select_related('user').prefetch_related(
            'meals',
            'meals__suggested_recipes',
            'assignments__user'
        )
    
    def get_serializer_class(self):
        if self.action == 'list':
            return NutritionPlanMinimalSerializer
        return NutritionPlanSerializer
    
    @action(detail=False, methods=['get'])
    def my_plans(self, request):
        """Planes del usuario"""
        plans = NutritionPlan.objects.filter(
            Q(user=request.user) | Q(assignments__user=request.user),
            is_active=True
        ).distinct()
        return Response(NutritionPlanMinimalSerializer(plans, many=True).data)
    
    @action(detail=False, methods=['get'])
    def templates(self, request):
        """Plantillas disponibles"""
        templates = NutritionPlan.objects.filter(is_template=True, is_active=True)
        return Response(NutritionPlanMinimalSerializer(templates, many=True).data)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """
        Activar un plan nutricional para el usuario actual.
        Desactiva automáticamente cualquier otro plan activo del usuario.
        POST /api/nutrition/plans/{id}/activate/
        """
        plan = get_object_or_404(NutritionPlan, pk=pk)
        user = request.user
        assignment = NutritionPlanAssignment.objects.filter(plan=plan, user=user).first()
        
        # Validar que el plan pertenece al usuario o es una plantilla del sistema
        if plan.user and plan.user != user and not assignment:
            return Response(
                {'error': 'No tienes permiso para activar este plan.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Solo se pueden activar planes de usuarios (no plantillas directamente)
        # Si es una plantilla, el admin debe crear una copia para el usuario primero
        if plan.is_template or (plan.is_system and not assignment and not plan.user):
            return Response(
                {'error': 'No puedes activar directamente una plantilla. Un administrador debe asignártela primero.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # IMPORTANTE: Desactivar TODOS los otros planes activos del usuario
        # Esto garantiza que solo un plan esté activo a la vez
        NutritionPlanAssignment.objects.filter(
            user=user,
            is_active=True
        ).exclude(plan=plan).update(is_active=False)

        if assignment:
            assignment.is_active = True
            assignment.save(update_fields=['is_active'])
        elif plan.user == user:
            NutritionPlan.objects.filter(
                user=user,
                is_active=True
            ).exclude(pk=pk).update(is_active=False)
            plan.is_active = True
            plan.save(update_fields=['is_active'])
        
        # Registrar en el historial si existe el servicio
        try:
            from .services import PersonalizedNutritionService
            nutrition_service = PersonalizedNutritionService(user)
            # El servicio puede registrar el cambio en el historial si es necesario
        except Exception as e:
            logger.warning(f'No se pudo registrar el cambio en historial: {e}')
        
        serializer = NutritionPlanSerializer(plan)
        return Response({
            'message': 'Plan activado correctamente. Otros planes activos han sido desactivados.',
            'plan': serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def update_macros(self, request, pk=None):
        """
        Actualiza los macros del plan por porcentaje o por gramos.
        POST /api/nutrition/plans/{id}/update_macros/
        
        Body (por porcentaje):
        {
            "mode": "percentage",
            "protein": 30,
            "carbs": 40,
            "fat": 30
        }
        
        Body (por gramos):
        {
            "mode": "grams",
            "protein": 150,
            "carbs": 200,
            "fat": 65
        }
        """
        plan = self.get_object()
        
        # Verificar permisos (solo admin o dueño del plan)
        if not request.user.is_staff and plan.user != request.user and not plan.assignments.filter(user=request.user).exists():
            return Response(
                {'error': 'No tienes permiso para modificar este plan'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        mode = request.data.get('mode', 'percentage')
        protein = request.data.get('protein')
        carbs = request.data.get('carbs')
        fat = request.data.get('fat')
        calories = request.data.get('calories')
        
        if protein is None or carbs is None or fat is None:
            return Response(
                {'error': 'Debes proporcionar protein, carbs y fat'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            protein = int(protein)
            carbs = int(carbs)
            fat = int(fat)
            
            # Actualizar calorías si se proporcionan
            if calories:
                plan.daily_calories = int(calories)
            
            if mode == 'percentage':
                # Validar que sumen ~100%
                total = protein + carbs + fat
                if total < 95 or total > 105:
                    return Response(
                        {'error': f'Los porcentajes deben sumar ~100% (actual: {total}%)'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                plan.set_macros_from_percentages(protein, carbs, fat)
            else:  # mode == 'grams'
                plan.set_macros_from_grams(protein, carbs, fat)
            
            return Response({
                'message': 'Macros actualizados correctamente',
                'daily_calories': plan.daily_calories,
                'protein_grams': plan.protein_grams,
                'carbs_grams': plan.carbs_grams,
                'fat_grams': plan.fat_grams,
                'protein_percentage': plan.protein_percentage,
                'carbs_percentage': plan.carbs_percentage,
                'fat_percentage': plan.fat_percentage,
                'macro_percentages': plan.macro_percentages,
            })
            
        except ValueError as e:
            return Response(
                {'error': f'Valores inválidos: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class MealLogViewSet(viewsets.ModelViewSet):
    """ViewSet para logs de comidas"""
    serializer_class = MealLogSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['date', 'meal_type', 'completed']
    ordering_fields = ['date', 'time', 'created_at']
    ordering = ['-date', '-time']
    
    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return MealLog.objects.none()
        queryset = MealLog.objects.filter(
            user=self.request.user
        ).select_related('user', 'recipe')

        date_gte = self.request.query_params.get('date__gte')
        if date_gte:
            queryset = queryset.filter(date__gte=date_gte)

        date_lte = self.request.query_params.get('date__lte')
        if date_lte:
            queryset = queryset.filter(date__lte=date_lte)

        return queryset
    
    def create(self, request, *args, **kwargs):
        # Bloquear si la receta contiene alérgenos del usuario (no aplica a admins)
        if not (request.user.is_staff or getattr(request.user, 'role', None) == 'admin'):
            recipe_id = request.data.get('recipe') or request.data.get('recipe_id')
            if recipe_id:
                try:
                    recipe = Recipe.objects.get(id=recipe_id)
                    user_allergens = getattr(request.user, 'allergies', None) or []
                    recipe_allergens = getattr(recipe, 'allergens', None) or []
                    conflicts = [a for a in recipe_allergens if a in user_allergens]
                    if conflicts:
                        ALLERGEN_LABELS = {
                            'gluten': 'Gluten', 'dairy': 'Lácteos', 'eggs': 'Huevo',
                            'nuts': 'Frutos secos', 'soy': 'Soja', 'fish': 'Pescado',
                            'shellfish': 'Marisco', 'sesame': 'Sésamo',
                        }
                        conflict_names = [ALLERGEN_LABELS.get(a, a) for a in conflicts]
                        return Response(
                            {
                                'error': 'allergen_conflict',
                                'detail': (
                                    f'No puedes añadir "{recipe.name}" porque contiene alérgenos a los que eres '
                                    f'sensible: {", ".join(conflict_names)}.'
                                ),
                                'allergens': conflicts,
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                except Recipe.DoesNotExist:
                    pass
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def today(self, request):
        """Logs de hoy"""
        from django.utils import timezone
        today = timezone.localdate()
        logs = MealLog.objects.filter(
            user=request.user, date=today
        ).select_related('user', 'recipe')
        return Response(MealLogSerializer(logs, many=True).data)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Resumen nutricional de hoy"""
        from django.utils import timezone
        from django.db.models import Sum
        
        today = timezone.localdate()
        totals = MealLog.objects.filter(
            user=request.user, date=today
        ).aggregate(
            total_calories=Sum('calories'),
            total_protein=Sum('protein'),
            total_carbs=Sum('carbs'),
            total_fat=Sum('fat')
        )
        return Response({
            'date': today,
            'calories': totals['total_calories'] or 0,
            'protein': float(totals['total_protein'] or 0),
            'carbs': float(totals['total_carbs'] or 0),
            'fat': float(totals['total_fat'] or 0),
        })


class FoodViewSet(viewsets.ModelViewSet):
    """ViewSet para alimentos"""
    queryset = Food.objects.all()
    serializer_class = FoodSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = {
        'protein': ['gte', 'lte', 'exact'],
        'calories': ['gte', 'lte', 'exact'],
        'carbs': ['gte', 'lte', 'exact'],
        'fat': ['gte', 'lte', 'exact'],
    }
    search_fields = ['name', 'brand', 'category']

    def get_permissions(self):
        if getattr(self, 'swagger_fake_view', False):
            return super().get_permissions()

        if self.request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            user = self.request.user
            role = str(getattr(user, 'role', '') or '').lower()
            if not (user.is_staff or user.is_superuser or role == 'admin'):
                self.permission_denied(
                    self.request,
                    message='Solo administradores pueden modificar alimentos.',
                )
        return super().get_permissions()
    
    @action(detail=False, methods=['post'], url_path='search_api')
    def search_api(self, request):
        """Buscar alimentos en OpenFoodFacts sin importar (solo preview)"""
        from .fatsecret_client import OpenFoodFactsClient
        
        search_term = request.data.get('search_term', '')
        page = max(int(request.data.get('page', 1)), 1)
        page_size = min(int(request.data.get('page_size', 20)), 50)
        store_filter = (request.data.get('store') or '').strip().lower()
        category_filter = (request.data.get('category') or '').strip().lower()
        
        if not search_term:
            return Response({'detail': 'search_term es requerido'}, status=400)
        
        client = OpenFoodFactsClient()
        store_labels = dict(Food.STORE_CHOICES)
        allowed_store_values = [value for value, _label in Food.STORE_CHOICES if value != 'otro']
        allowed_store_labels = [store_labels[value].lower() for value in allowed_store_values]
        store_label = store_labels.get(store_filter, store_filter).lower() if store_filter else ''
        
        try:
            foods_preview = []
            seen_codes = set()
            total_count = None
            max_pages = 5
            current_page = page

            while len(foods_preview) < page_size and current_page < page + max_pages:
                response = client.search_foods(search_term, page=current_page, page_size=page_size)
                products = response.get('products', []) if isinstance(response, dict) else response
                if total_count is None and isinstance(response, dict):
                    total_count = response.get('count', 0)
                if not products:
                    break

                for product in products:
                    name = client.get_food_name(product)
                    if not name:
                        continue

                    stores_text = (product.get('stores') or '').lower()
                    stores_tags = product.get('stores_tags') or []
                    stores_tags = [s.lower() for s in stores_tags if isinstance(s, str)]

                    if store_filter:
                        stores_text = (product.get('stores') or '').lower()
                        matches_store = (
                            store_filter in stores_text
                            or store_label in stores_text
                            or store_filter in stores_tags
                            or store_label in stores_tags
                        )
                        if not matches_store:
                            continue
                    else:
                        matches_allowed = any(value in stores_text for value in allowed_store_values)
                        matches_allowed = matches_allowed or any(label in stores_text for label in allowed_store_labels)
                        matches_allowed = matches_allowed or any(value in stores_tags for value in allowed_store_values)
                        matches_allowed = matches_allowed or any(label in stores_tags for label in allowed_store_labels)
                        if not matches_allowed:
                            continue

                    if category_filter:
                        categories_text = (product.get('categories') or '').lower()
                        categories_tags = product.get('categories_tags') or []
                        categories_tags = [c.lower() for c in categories_tags if isinstance(c, str)]
                        matches_category = (
                            category_filter in categories_text
                            or any(category_filter in tag for tag in categories_tags)
                        )
                        if not matches_category:
                            continue

                    nutrients = client.parse_nutrients(product)

                    categories_tags = product.get('categories_tags') or []
                    categories_tags = [c for c in categories_tags if isinstance(c, str)]
                    category_value = ''
                    if categories_tags:
                        category_tag = categories_tags[0]
                        category_value = category_tag.split(':', 1)[1] if ':' in category_tag else category_tag
                    elif product.get('categories'):
                        category_value = (product.get('categories') or '').split(',')[0].strip()

                    # Solo mostrar si tiene al menos calorías
                    if nutrients['calories'] > 0:
                        barcode = product.get('code', product.get('_id', ''))
                        if barcode and barcode in seen_codes:
                            continue
                        # Verificar si ya existe en BD
                        if Food.objects.filter(name=name).exists():
                            continue

                        if barcode:
                            seen_codes.add(barcode)

                        foods_preview.append({
                            'barcode': barcode,
                            'name': name,
                            'brand': product.get('brands', '')[:100] if product.get('brands') else '',
                            'stores': product.get('stores', ''),
                            'stores_tags': product.get('stores_tags', []),
                            'category': category_value.title() if category_value else '',
                            'calories': nutrients['calories'],
                            'protein': nutrients['protein'],
                            'carbs': nutrients['carbs'],
                            'fat': nutrients['fat'],
                            'fiber': nutrients['fiber'],
                            'sugar': nutrients['sugar'],
                            'sodium': nutrients['sodium'],
                            'image_url': product.get('image_small_url', '') or product.get('image_url', ''),
                            'already_exists': False
                        })
                        if len(foods_preview) >= page_size:
                            break

                if isinstance(response, dict):
                    response_page_size = response.get('page_size', page_size)
                    if total_count and current_page * response_page_size >= total_count:
                        break
                current_page += 1
            
            return Response({
                'count': total_count if total_count is not None else len(foods_preview),
                'page': page,
                'page_size': page_size,
                'results': foods_preview
            })
            
        except Exception as e:
            return Response({'detail': str(e)}, status=500)
    
    @action(detail=False, methods=['post'], url_path='import_selected')
    def import_selected(self, request):
        """Importar alimentos seleccionados desde la preview"""
        foods_to_import = request.data.get('foods', [])
        category = request.data.get('category', 'General')
        store = request.data.get('store', '')
        
        if not foods_to_import:
            return Response({'detail': 'foods es requerido'}, status=400)
        
        imported = 0
        skipped = 0
        
        for food_data in foods_to_import:
            name = food_data.get('name', '')
            if not name:
                skipped += 1
                continue
            
            # Verificar si ya existe
            if Food.objects.filter(name=name).exists():
                skipped += 1
                continue
            
            try:
                Food.objects.create(
                    name=name,
                    brand=food_data.get('brand', '')[:100],
                    calories=food_data.get('calories', 0),
                    protein=food_data.get('protein', 0),
                    carbs=food_data.get('carbs', 0),
                    fat=food_data.get('fat', 0),
                    fiber=food_data.get('fiber', 0),
                    sugar=food_data.get('sugar', 0),
                    sodium=food_data.get('sodium', 0),
                    serving_size=100,
                    serving_unit='g',
                    category=category.strip().title(),
                    store=store,
                    is_verified=False,
                    created_by=request.user
                )
                imported += 1
            except Exception:
                skipped += 1
        
        return Response({
            'imported': imported,
            'skipped': skipped
        })
    
    @action(detail=False, methods=['post'], url_path='import')
    def import_foods(self, request):
        """Importar alimentos desde OpenFoodFacts"""
        from .fatsecret_client import OpenFoodFactsClient
        
        search_term = request.data.get('search_term', '')
        max_results = min(int(request.data.get('max_results', 50)), 100)
        
        if not search_term:
            return Response({'detail': 'search_term es requerido'}, status=400)
        
        client = OpenFoodFactsClient()
        
        try:
            response = client.search_foods(search_term, page_size=max_results)
            products = response.get('products', []) if isinstance(response, dict) else response
            
            imported = 0
            skipped = 0
            
            for product in products:
                name = client.get_food_name(product)
                if not name:
                    continue
                
                # Verificar si ya existe
                if Food.objects.filter(name=name).exists():
                    skipped += 1
                    continue
                
                nutrients = client.parse_nutrients(product)
                
                # Solo importar si tiene al menos calorías
                if nutrients['calories'] > 0:
                    Food.objects.create(
                        name=name,
                        brand=product.get('brands', '')[:100] if product.get('brands') else '',
                        calories=nutrients['calories'],
                        protein=nutrients['protein'],
                        carbs=nutrients['carbs'],
                        fat=nutrients['fat'],
                        fiber=nutrients['fiber'],
                        sugar=nutrients['sugar'],
                        sodium=nutrients['sodium'],
                        serving_size=100,
                        serving_unit='g',
                        category=search_term.capitalize(),
                        is_verified=False,
                        created_by=request.user
                    )
                    imported += 1
            
            return Response({
                'imported': imported,
                'skipped': skipped
            })
            
        except Exception as e:
            return Response({'detail': str(e)}, status=500)
    
    @action(detail=False, methods=['post'], url_path='import_from_api')
    def import_from_api(self, request):
        """Alias para import_foods - usado por el frontend"""
        return self.import_foods(request)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Obtener estadísticas de alimentos"""
        total = Food.objects.count()
        verified = Food.objects.filter(is_verified=True).count()
        
        # Normalizar categorías: strip, lowercase para comparar, pero mantener original
        raw_categories = Food.objects.exclude(category='').exclude(category__isnull=True).values_list('category', flat=True)
        # Usar dict para deduplicar manteniendo la versión con capitalización correcta
        seen = {}
        for cat in raw_categories:
            normalized = cat.strip().lower()
            if normalized not in seen:
                # Capitalizar primera letra de cada palabra
                seen[normalized] = cat.strip().title() if cat.strip() else cat.strip()
        categories = sorted(seen.values())
        
        # Mostrar todos los supermercados disponibles en el sistema
        stores = list(Food.STORE_CHOICES)
        
        return Response({
            'total': total,
            'verified': verified,
            'categories': categories,
            'stores': stores
        })
    
    @action(detail=False, methods=['post'])
    def bulk_verify(self, request):
        """Verificar/desverificar alimentos en lote"""
        food_ids = request.data.get('food_ids', [])
        is_verified = request.data.get('is_verified', True)
        
        if not food_ids:
            return Response({'detail': 'food_ids es requerido'}, status=400)
        
        updated = Food.objects.filter(id__in=food_ids).update(is_verified=is_verified)
        
        return Response({
            'updated': updated
        })
    
    def get_queryset(self):
        """Filtrar por categoría, verificación y supermercado"""
        if getattr(self, "swagger_fake_view", False):
            return Food.objects.none()
        queryset = Food.objects.all()
        
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__iexact=category)
        
        is_verified = self.request.query_params.get('is_verified')
        if is_verified is not None:
            queryset = queryset.filter(is_verified=is_verified.lower() == 'true')
        
        store = self.request.query_params.get('store')
        if store:
            queryset = queryset.filter(store__iexact=store)
        
        return queryset.order_by('name')


def list_recipes(request):
    """
    Lista todas las recetas disponibles.
    GET /api/nutrition/recipes/
    
    Parámetros de consulta:
    - search: Buscar por nombre, descripción o ingredientes
    - category: Filtrar por categoría
    - difficulty: Filtrar por dificultad
    - meal_type: Filtrar por tipo de comida
    - page: Número de página (default: 1)
    - page_size: Tamaño de página (default: 100)
    """
    auth_request = getattr(request, '_request', request)
    auth = JWTAuthentication()
    try:
        auth_result = auth.authenticate(auth_request)
    except Exception:
        auth_result = None

    if auth_result is None:
        return JsonResponse(
            {'detail': 'Authentication credentials were not provided.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    request.user = auth_result[0]

    params = getattr(request, 'query_params', request.GET)
    queryset = Recipe.objects.filter(is_active=True)
    
    # Búsqueda
    search_query = params.get('search', '')
    if search_query:
        queryset = queryset.filter(
            models.Q(name__icontains=search_query) |
            models.Q(description__icontains=search_query) |
            models.Q(ingredients__icontains=search_query)
        )
    
    # Filtros
    category = params.get('category')
    if category:
        queryset = queryset.filter(category=category)
    
    difficulty = params.get('difficulty')
    if difficulty:
        queryset = queryset.filter(difficulty=difficulty)
    
    meal_type = params.get('meal_type')
    if meal_type:
        queryset = queryset.filter(meal_types__contains=[meal_type])
    
    # Ordenamiento
    ordering = params.get('ordering', 'name')
    if ordering.lstrip('-') in ['name', 'calories', 'prep_time_minutes', 'created_at']:
        queryset = queryset.order_by(ordering)
    else:
        queryset = queryset.order_by('name')
    
    # Paginación
    try:
        page = max(int(params.get('page', 1)), 1)
    except (TypeError, ValueError):
        page = 1

    requested_page_size = params.get('page_size', params.get('limit', 100))
    try:
        page_size = max(1, min(int(requested_page_size), 200))
    except (TypeError, ValueError):
        page_size = 100
    
    total = queryset.count()
    start = (page - 1) * page_size
    end = start + page_size
    
    recipes_list = queryset[start:end]
    
    # Serializar
    serializer = RecipeMinimalSerializer(recipes_list, many=True)
    
    return JsonResponse({
        'results': serializer.data,
        'count': total,
        'page': page,
        'page_size': page_size,
        'total_pages': (total + page_size - 1) // page_size if total > 0 else 0,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def default_nutrition_plans(request):
    """
    Planes de nutrición predeterminados/plantillas.
    Devuelve planes que pueden ser usados como plantillas o para asignación.
    Los admins ven todos los planes activos; el resto solo ve templates.
    """
    if request.user.is_staff or request.user.is_superuser:
        # Admins pueden asignar cualquier plan activo
        plans = NutritionPlan.objects.filter(is_active=True).distinct()
    else:
        # Usuarios normales solo ven plantillas/planes del sistema
        plans = NutritionPlan.objects.filter(
            models.Q(is_template=True) | models.Q(user__isnull=True)
        ).distinct()
    plans = plans.prefetch_related('meals__suggested_recipes')
    
    # Paginación
    page = int(request.query_params.get('page', 1))
    page_size = int(request.query_params.get('page_size', 100))
    
    total = plans.count()
    start = (page - 1) * page_size
    end = start + page_size
    
    plans_list = plans[start:end]
    
    results = []
    for plan in plans_list:
        results.append({
            'id': str(plan.id),
            'name': plan.name,
            'description': plan.description,
            'goal': plan.goal,
            'daily_calories': plan.daily_calories,
            'is_active': plan.is_active,
            'is_template': plan.is_template,
            'meals_count': plan.meals.count(),
            'created_at': plan.created_at.isoformat() if plan.created_at else None,
        })
    
    return Response({
        'results': results,
        'count': total,
        'page': page,
        'page_size': page_size,
        'total_pages': (total + page_size - 1) // page_size if total > 0 else 0,
    })
