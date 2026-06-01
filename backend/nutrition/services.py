# nutrition/services.py
from typing import Dict, List, Optional, Tuple
from django.db.models import Q
from django.db import DatabaseError
from django.utils import timezone
from decimal import Decimal, ROUND_HALF_UP
from accounts.models import CustomUser
from .models import (
    NutritionPlan,
    PlanMeal,
    NutritionPlanHistory,
    Recipe,
    RecipeIngredient,
    MealIngredientExclusion,
)
import math
import logging
import random
import unicodedata

logger = logging.getLogger(__name__)


def _normalize_preference_terms(value) -> List[str]:
    if not value:
        return []

    if isinstance(value, str):
        raw_items = [item.strip() for item in value.replace(';', ',').replace('\n', ',').split(',')]
    elif isinstance(value, list):
        raw_items = []
        for item in value:
            if isinstance(item, str):
                raw_items.extend(part.strip() for part in item.replace(';', ',').replace('\n', ',').split(','))
            elif item is not None:
                raw_items.append(str(item).strip())
    else:
        raw_items = [str(value).strip()]

    normalized = []
    seen = set()
    for item in raw_items:
        if not item:
            continue
        normalized_item = unicodedata.normalize('NFKD', item).encode('ascii', 'ignore').decode('ascii').lower().strip()
        normalized_item = normalized_item.replace('-', ' ')
        normalized_item = ' '.join(normalized_item.split())
        if normalized_item and normalized_item not in seen:
            seen.add(normalized_item)
            normalized.append(normalized_item)

    return normalized


def _get_user_blocked_terms(user: CustomUser) -> List[str]:
    blocked_terms = []
    blocked_terms.extend(_normalize_preference_terms(getattr(user, 'allergies', None)))
    blocked_terms.extend(_normalize_preference_terms(getattr(user, 'disliked_foods', None)))
    try:
        blocked_terms.extend(_normalize_preference_terms(
            MealIngredientExclusion.objects.filter(
                user=user,
                is_active=True,
            ).values_list('term', flat=True)
        ))
    except DatabaseError as exc:
        logger.warning("No se pudo leer MealIngredientExclusion para usuario %s: %s", user.id, exc)

    unique_terms = []
    seen = set()
    for term in blocked_terms:
        if term not in seen:
            seen.add(term)
            unique_terms.append(term)

    return unique_terms


def _get_user_dietary_restrictions(user: CustomUser) -> List[str]:
    return _normalize_preference_terms(getattr(user, 'dietary_restrictions', None))


def _recipe_supports_user_restrictions(recipe: Recipe, restrictions: List[str]) -> bool:
    if not restrictions:
        return True

    recipe_diet_types = set(_normalize_preference_terms(getattr(recipe, 'diet_types', [])))
    if not recipe_diet_types:
        return True

    restriction_aliases = {
        'vegetarian': {'vegetarian', 'vegetariano'},
        'vegan': {'vegan', 'vegano'},
        'gluten free': {'gluten free', 'gluten-free', 'sin gluten'},
        'dairy free': {'dairy free', 'dairy-free', 'sin lactosa', 'lactose free'},
        'keto': {'keto', 'ketogenic', 'cetogenica', 'cetogenico'},
        'low carb': {'low carb', 'bajo en carbohidratos'},
    }

    for restriction in restrictions:
        aliases = restriction_aliases.get(restriction)
        if not aliases:
            continue
        if recipe_diet_types.isdisjoint(aliases):
            return False

    return True


def _recipe_matches_blocked_terms(recipe: Recipe, blocked_terms: List[str]) -> bool:
    if not blocked_terms:
        return False

    recipe_allergens = _normalize_preference_terms(getattr(recipe, 'allergens', []))
    for allergen in recipe_allergens:
        for term in blocked_terms:
            if term == allergen or term in allergen or allergen in term:
                return True

    recipe_ingredients = getattr(recipe, 'ingredients', []) or []
    for ingredient in recipe_ingredients:
        ingredient_name = ''
        if isinstance(ingredient, dict):
            ingredient_name = ingredient.get('name', '')
        elif isinstance(ingredient, str):
            ingredient_name = ingredient

        normalized_name = ' '.join(_normalize_preference_terms(ingredient_name))
        if not normalized_name:
            continue

        for term in blocked_terms:
            if term in normalized_name or normalized_name in term:
                return True

    return False


def recipe_is_compatible_for_user(recipe: Recipe, user: CustomUser) -> bool:
    restrictions = _get_user_dietary_restrictions(user)
    blocked_terms = _get_user_blocked_terms(user)

    if not _recipe_supports_user_restrictions(recipe, restrictions):
        return False

    if _recipe_matches_blocked_terms(recipe, blocked_terms):
        return False

    return True


def recipe_matches_meal_type(recipe: Recipe, meal_type: str) -> bool:
    recipe_meal_types = set(_normalize_preference_terms(getattr(recipe, 'meal_types', [])))
    if recipe_meal_types and meal_type in recipe_meal_types:
        return True

    category_map = {
        'breakfast': 'desayuno',
        'lunch': 'almuerzo',
        'dinner': 'cena',
        'snack': 'snack',
    }
    recipe_category = _normalize_preference_terms(getattr(recipe, 'category', ''))
    expected_category = category_map.get(meal_type)
    return bool(expected_category and expected_category in recipe_category)


def select_compatible_recipes_for_meal(user: CustomUser, meal_template: PlanMeal, desired_count: int = 3) -> List[Recipe]:
    suggested_recipes = [
        recipe
        for recipe in meal_template.suggested_recipes.filter(is_active=True)
        if recipe_is_compatible_for_user(recipe, user)
    ]

    if len(suggested_recipes) > desired_count:
        return random.sample(suggested_recipes, desired_count)

    selected_recipes = suggested_recipes.copy()
    remaining = desired_count - len(selected_recipes)
    if remaining <= 0:
        return selected_recipes

    fallback_recipes = []
    for recipe in Recipe.objects.filter(is_active=True):
        if recipe.id in {item.id for item in selected_recipes}:
            continue
        if not recipe_matches_meal_type(recipe, meal_template.meal_type):
            continue
        if not recipe_is_compatible_for_user(recipe, user):
            continue
        fallback_recipes.append(recipe)

    if len(fallback_recipes) > remaining:
        fallback_recipes = random.sample(fallback_recipes, remaining)
    else:
        fallback_recipes = fallback_recipes[:remaining]

    selected_recipes.extend(fallback_recipes)
    return selected_recipes

class PersonalizedNutritionService:
    """Servicio para generar planes nutricionales personalizados basados en el perfil del usuario"""

    GOAL_CALORIE_ADJUSTMENTS = {
        'lose_weight': -500,
        'gain_muscle': 300,
        'maintain': 0,
        'body_recomposition': 0,
        'performance': 0,
    }

    MEAL_CALORIE_DISTRIBUTION = {
        'breakfast': 0.25,
        'lunch': 0.35,
        'snack': 0.15,
        'dinner': 0.25,
    }

    MEAL_TYPE_ALIASES = {
        'desayuno': 'breakfast',
        'comida': 'lunch',
        'almuerzo': 'lunch',
        'merienda': 'snack',
        'cena': 'dinner',
        'morning_snack': 'snack',
        'afternoon_snack': 'snack',
        'evening_snack': 'snack',
    }
    
    def __init__(self, user: CustomUser):
        self.user = user
    
    def calculate_daily_calories(self, previous_calories: Optional[int] = None) -> int:
        """
        Calcula las calorías diarias basadas en el perfil del usuario y objetivo.
        Respetando siempre el objetivo del usuario y haciendo transiciones graduales.
        
        Args:
            previous_calories: Calorías anteriores del plan para transición gradual (opcional)
        """
        logger.info(f"📊 Calculando calorías para usuario ID: {self.user.id}, email: {self.user.email}")
        logger.info(f"   Datos: peso={self.user.weight}, altura={self.user.height}, edad={self.user.age}, género={self.user.gender}, objetivo={self.user.main_goal}")

        # Prioridad máxima: override manual del administrador
        admin_override = getattr(self.user, 'admin_calories_override', None)
        if admin_override:
            logger.info(f"   ⚙️ Usando override del administrador: {admin_override} kcal")
            return int(admin_override)

        if not all([self.user.age, self.user.gender, self.user.height, self.user.weight]):
            if getattr(self.user, 'daily_calories_target', None):
                target = int(self.user.daily_calories_target)
                logger.warning(f"⚠️ Datos incompletos del usuario, usando daily_calories_target={target} kcal")
                return target

            if self.user.weight:
                # Estimación basada en peso para evitar un fijo 2000 sin contexto.
                maintain_factor = 30
                if self.user.activity_level == 'sedentary':
                    maintain_factor = 27
                elif self.user.activity_level in ('active', 'very_active'):
                    maintain_factor = 33

                estimated = int(float(self.user.weight) * maintain_factor)
                if self.user.main_goal == 'lose_weight':
                    estimated = int(estimated * 0.85)
                elif self.user.main_goal == 'gain_muscle':
                    estimated = int(estimated * 1.10)

                estimated = max(1200, min(4500, estimated))
                logger.warning(f"⚠️ Datos incompletos del usuario, usando estimación por peso={estimated} kcal")
                return estimated

            logger.warning("⚠️ Datos incompletos del usuario sin peso/target, usando fallback 2000 kcal")
            return 2000
        
        # Fórmula de Harris-Benedict
        if self.user.gender == 'male':
            bmr = 88.362 + (13.397 * self.user.weight) + (4.799 * self.user.height) - (5.677 * self.user.age)
        else:  # female
            bmr = 447.593 + (9.247 * self.user.weight) + (3.098 * self.user.height) - (4.330 * self.user.age)
        
        logger.info(f"   BMR calculado: {bmr:.0f} kcal")
        
        # Factor de actividad
        activity_factors = {
            'sedentary': 1.2,
            'light': 1.375,
            'moderate': 1.55,
            'active': 1.725,
            'very_active': 1.9
        }
        
        activity_factor = activity_factors.get(self.user.activity_level, 1.55)
        tdee = bmr * activity_factor
        logger.info(f"   TDEE (con actividad {self.user.activity_level}): {tdee:.0f} kcal")
        
        # Ajustar según objetivo usando el mismo criterio que daily_calories_target
        goal_adjustment = self.GOAL_CALORIE_ADJUSTMENTS.get(self.user.main_goal, 0)
        result = int(round(tdee + goal_adjustment))
        logger.info(
            "   Objetivo: %s → %s kcal (ajuste fijo %+d kcal)",
            self.user.main_goal,
            result,
            goal_adjustment,
        )
        
        # Si hay calorías anteriores, hacer transición gradual (máximo ±300 kcal por ajuste)
        if previous_calories:
            difference = result - previous_calories
            if abs(difference) > 300:
                # Limitar el cambio a máximo 300 kcal por ajuste
                if difference > 0:
                    result = previous_calories + 300
                    logger.info(f"   Transición gradual: limitando aumento a +300 kcal → {result} kcal")
                else:
                    result = max(1200, previous_calories - 300)  # Mínimo 1200 kcal
                    logger.info(f"   Transición gradual: limitando disminución a -300 kcal → {result} kcal")
        
        return result
    
    def calculate_macros(self, daily_calories: int) -> Dict[str, float]:
        """Calcula la distribución de macronutrientes basada en el perfil del usuario"""

        goal_macro_distribution = {
            'lose_weight': (30, 40, 30),
            'gain_muscle': (25, 50, 25),
            'maintain': (30, 45, 25),
            'body_recomposition': (30, 45, 25),
            'performance': (30, 45, 25),
        }
        protein_pct, carbs_pct, fat_pct = goal_macro_distribution.get(
            self.user.main_goal,
            goal_macro_distribution['body_recomposition'],
        )
        
        # Ajustar según restricciones dietéticas
        if 'keto' in (self.user.dietary_restrictions or []):
            protein_pct = 20
            carbs_pct = 5
            fat_pct = 75
        elif 'low_carb' in (self.user.dietary_restrictions or []):
            protein_pct = 30
            carbs_pct = 20
            fat_pct = 50
        
        protein_grams = (daily_calories * protein_pct / 100) / 4
        carbs_grams = (daily_calories * carbs_pct / 100) / 4
        fat_grams = (daily_calories * fat_pct / 100) / 9
        
        return {
            'protein': round(protein_grams, 1),
            'carbs': round(carbs_grams, 1),
            'fat': round(fat_grams, 1),
            'protein_percentage': protein_pct,
            'carbs_percentage': carbs_pct,
            'fat_percentage': fat_pct
        }
    
    def get_suitable_plans(self):
        """Obtiene planes nutricionales adecuados para el usuario"""
        # Usar planes del sistema o plantillas en lugar de DefaultNutritionPlan
        plans = NutritionPlan.objects.filter(
            Q(is_system=True) | Q(is_template=True),
            is_active=True
        )
        
        # Filtrar por objetivo del usuario si está disponible
        if self.user.main_goal:
            goal_mapping = {
                'lose_weight': 'lose_weight',
                'gain_muscle': 'gain_muscle',
                'body_recomposition': 'body_recomposition',
                'maintain': 'maintain',
                'performance': 'performance'
            }
            user_goal = goal_mapping.get(self.user.main_goal)
            if user_goal:
                plans = plans.filter(goal=user_goal)
        
        # Filtrar por objetivo principal usando mapeo más flexible
        if self.user.main_goal:
            goal_mapping = {
                'lose_weight': ['Pérdida de peso', 'perdida de peso', 'weight loss', 'pérdida'],
                'gain_muscle': ['Ganancia muscular', 'ganancia muscular', 'muscle gain', 'muscular'],
                'body_recomposition': ['Mantenimiento', 'mantenimiento', 'maintenance', 'recomposición']
            }
            
            goal_keywords = goal_mapping.get(self.user.main_goal, [])
            matching_plans = []
            
            for plan in plans:
                # Buscar en nombre
                if any(keyword.lower() in plan.name.lower() for keyword in goal_keywords):
                    matching_plans.append(plan.id)
                # Buscar en tags
                elif plan.tags and isinstance(plan.tags, list):
                    if any(keyword.lower() in str(tag).lower() for keyword in goal_keywords for tag in plan.tags):
                        matching_plans.append(plan.id)
            
            if matching_plans:
                plans = plans.filter(id__in=matching_plans)
        
        # Filtrar por restricciones dietéticas
        if self.user.dietary_restrictions:
            restrictions = self.user.dietary_restrictions
            if isinstance(restrictions, str):
                restrictions = [restrictions]
            
            restriction_matching_plans = []
            for plan in plans:
                # Buscar en nombre
                if any(restriction.lower() in plan.name.lower() for restriction in restrictions):
                    restriction_matching_plans.append(plan.id)
                # Buscar en tags
                elif plan.tags and isinstance(plan.tags, list):
                    if any(restriction.lower() in str(tag).lower() for restriction in restrictions for tag in plan.tags):
                        restriction_matching_plans.append(plan.id)
            
            # Si hay restricciones, usar solo planes que coincidan
            if restriction_matching_plans:
                plans = plans.filter(id__in=restriction_matching_plans)
        
        return plans.order_by('-is_system', '-is_template', 'name')
    
    @staticmethod
    def record_plan_change(user, old_plan, new_plan, changed_by=None, reason='other', notes='', is_admin_change=False):
        """Registra un cambio de plan en el historial"""
        try:
            old_plan_name = old_plan.name if old_plan else 'Sin plan anterior'
            new_plan_name = new_plan.name if new_plan else 'Sin plan nuevo'
            
            NutritionPlanHistory.objects.create(
                user=user,
                old_plan=old_plan,
                new_plan=new_plan,
                old_plan_name=old_plan_name,
                new_plan_name=new_plan_name,
                changed_by=changed_by or user,
                reason=reason,
                notes=notes
            )
        except Exception as e:
            # No fallar la operación principal si falla el registro del historial
            logger.error(f'Error registrando cambio de plan en historial: {str(e)}')
    
    def create_personalized_plan(self) -> NutritionPlan:
        """Crea un plan nutricional personalizado para el usuario"""
        daily_calories = self.calculate_daily_calories()
        macros = self.calculate_macros(daily_calories)
        
        # Crear el plan
        plan = NutritionPlan.objects.create(
            user=self.user,
            name=f"Plan Personalizado - {self.user.get_full_name()}",
            description=f"Plan nutricional personalizado basado en tu perfil: {self.user.main_goal}",
            daily_calories=daily_calories,
            protein_grams=int(macros['protein']),
            carbs_grams=int(macros['carbs']),
            fat_grams=int(macros['fat']),
            protein_percentage=macros['protein_percentage'],
            carbs_percentage=macros['carbs_percentage'],
            fat_percentage=macros['fat_percentage'],
            goal=self.user.main_goal or 'maintain',
            start_date=timezone.now().date(),
            is_active=True
        )
        
        # Crear las comidas del plan
        self._create_plan_meals(plan, daily_calories, macros)
        
        return plan
    
    def _create_plan_meals(self, plan: NutritionPlan, daily_calories: int, macros: Dict[str, float]):
        """Crea las comidas del plan nutricional"""
        from datetime import time

        # Distribución de calorías por comida (4 comidas)
        meal_distribution = {
            'Desayuno': 0.25,
            'Comida': 0.35,
            'Merienda': 0.15,
            'Cena': 0.25
        }
        
        # Horarios de las comidas
        meal_times = {
            'Desayuno': time(8, 0),
            'Comida': time(14, 0),
            'Merienda': time(17, 30),
            'Cena': time(21, 0)
        }
        
        created_calories = 0
        meal_names = list(meal_distribution.keys())
        for index, meal_name in enumerate(meal_names):
            percentage = meal_distribution[meal_name]
            if index < len(meal_names) - 1:
                meal_calories = int(round(daily_calories * percentage))
                created_calories += meal_calories
            else:
                # La ultima comida absorbe el remanente para evitar descuadres por truncado.
                meal_calories = max(0, daily_calories - created_calories)

            meal_protein = macros['protein'] * percentage
            meal_carbs = macros['carbs'] * percentage
            meal_fat = macros['fat'] * percentage
            
            PlanMeal.objects.create(
                plan=plan,
                name=meal_name,
                time=meal_times[meal_name],
                calories=meal_calories,
                protein=round(meal_protein, 1),
                carbs=round(meal_carbs, 1),
                fat=round(meal_fat, 1),
                description=f"{meal_name} personalizado para tu objetivo de {self.user.main_goal}",
                order_index=list(meal_distribution.keys()).index(meal_name) + 1
            )
    
    def get_recommendations(self) -> Dict[str, any]:
        """Obtiene recomendaciones nutricionales basadas en el perfil del usuario"""
        recommendations = {
            'daily_calories': self.calculate_daily_calories(),
            'macros': self.calculate_macros(self.calculate_daily_calories()),
            'suitable_plans': self.get_suitable_plans()[:3],  # Top 3 planes
            'tips': []
        }
        
        # Agregar consejos personalizados
        if self.user.main_goal == 'lose_weight':
            recommendations['tips'].append("Mantén un déficit calórico moderado para una pérdida de peso sostenible")
            recommendations['tips'].append("Incluye proteínas en cada comida para mantener la masa muscular")
        
        elif self.user.main_goal == 'gain_muscle':
            recommendations['tips'].append("Consume suficientes calorías para apoyar el crecimiento muscular")
            recommendations['tips'].append("Prioriza las proteínas y carbohidratos complejos")
        
        else:  # body_recomposition
            recommendations['tips'].append("Mantén las calorías en mantenimiento y enfócate en la calidad de los alimentos")
            recommendations['tips'].append("Combina entrenamiento de fuerza con cardio moderado")
        
        # Consejos basados en restricciones dietéticas
        if 'vegetarian' in (self.user.dietary_restrictions or []):
            recommendations['tips'].append("Incluye fuentes vegetales de proteína como legumbres y quinoa")
        
        if 'keto' in (self.user.dietary_restrictions or []):
            recommendations['tips'].append("Mantén los carbohidratos por debajo de 20g por día")
            recommendations['tips'].append("Incluye grasas saludables como aguacate y aceite de oliva")
        
        # Consejos basados en alergias
        if self.user.allergies:
            recommendations['tips'].append(f"Evita los alérgenos: {self.user.allergies}")
        
        return recommendations
    
    def calculate_personalized_recipe_quantities(self, recipe: Recipe, meal_type: str) -> Dict:
        """
        Calcula las cantidades personalizadas de una receta según:
        - Peso y altura del usuario
        - Objetivo (perder peso, ganar músculo, etc.)
        - Tipo de comida (desayuno, almuerzo, cena)
        - Calorías objetivo del día
        
        Args:
            recipe: Receta a personalizar
            meal_type: Tipo de comida ('breakfast', 'lunch', 'dinner', 'snack')
        
        Returns:
            Dict con ingredientes escalados, macros y factor de escala
        """
        logger.info(f"🔧 Calculando cantidades personalizadas para receta '{recipe.name}' (ID: {recipe.id})")
        logger.info(f"   Usuario ID: {self.user.id}, email: {self.user.email}, Tipo comida: {meal_type}")
        
        # Calcular calorías objetivo para esta comida específica
        daily_calories = self.calculate_daily_calories()
        
        # Usar la misma distribución base utilizada al crear el plan diario.
        normalized_meal_type = self.MEAL_TYPE_ALIASES.get((meal_type or '').lower(), (meal_type or '').lower())
        meal_percentage = self.MEAL_CALORIE_DISTRIBUTION.get(normalized_meal_type, 0.25)
        target_calories = daily_calories * meal_percentage
        
        # Calcular factor de escala basado en calorías objetivo vs receta base
        if recipe.calories and recipe.calories > 0:
            scale_factor = target_calories / recipe.calories
        else:
            # Si la receta no tiene calorías, usar un factor por defecto
            scale_factor = 1.0
        
        # Limitar el factor de escala a un rango razonable (0.5x a 2x)
        scale_factor = max(0.5, min(2.0, scale_factor))
        
        logger.info(f"   Receta original: {recipe.calories} kcal")
        logger.info(f"   Target calorías ({meal_type}): {target_calories:.0f} kcal ({meal_percentage*100:.0f}% del día)")
        logger.info(f"   Factor de escala: {scale_factor:.2f}x")
        
        def _is_oil_like(food_name: str, food_category: str) -> bool:
            normalized_name = (food_name or '').strip().lower()
            normalized_category = (food_category or '').strip().lower()
            oil_terms = ('aceite', 'oil')
            return any(term in normalized_name for term in oil_terms) or any(term in normalized_category for term in oil_terms)

        # Calcular ingredientes escalados
        scaled_ingredients = []
        ingredient_based_macros = {
            'calories': 0.0,
            'protein': 0.0,
            'carbs': 0.0,
            'fat': 0.0,
            'fiber': 0.0,
        }
        recipe_ingredients = list(recipe.recipe_ingredients.select_related('food').all())
        if recipe_ingredients:
            for ingredient in recipe_ingredients:
                original_amount = float(ingredient.quantity or 0)
                scaled_amount = original_amount * scale_factor

                # Límite defensivo para aceites: evita que una receta escalada dispare grasas de forma irreal.
                if _is_oil_like(getattr(ingredient.food, 'name', ''), getattr(ingredient.food, 'category', '')):
                    scaled_amount = min(scaled_amount, 15.0)

                ratio = RecipeIngredient.compute_nutrition_ratio(
                    quantity=scaled_amount,
                    unit=ingredient.unit,
                    food=ingredient.food,
                )
                ingredient_based_macros['calories'] += float(ingredient.food.calories) * ratio
                ingredient_based_macros['protein'] += float(ingredient.food.protein) * ratio
                ingredient_based_macros['carbs'] += float(ingredient.food.carbs) * ratio
                ingredient_based_macros['fat'] += float(ingredient.food.fat) * ratio
                ingredient_based_macros['fiber'] += float(ingredient.food.fiber) * ratio

                scaled_ingredients.append({
                    'name': ingredient.food.name,
                    'amount': round(scaled_amount, 1),
                    'unit': ingredient.unit or ingredient.food.serving_unit or 'g',
                    'note': ingredient.notes
                })
                logger.debug(
                    f"      Ingrediente: {ingredient.food.name} - {original_amount} → "
                    f"{round(scaled_amount, 1)} {ingredient.unit or 'g'}"
                )
        elif recipe.ingredients and isinstance(recipe.ingredients, list):
            for ingredient in recipe.ingredients:
                if isinstance(ingredient, dict):
                    original_amount = float(ingredient.get('amount', 0))
                    scaled_amount = original_amount * scale_factor
                    scaled_ingredients.append({
                        'name': ingredient.get('name', 'Ingrediente'),
                        'amount': round(scaled_amount, 1),
                        'unit': ingredient.get('unit', 'g')
                    })
                    logger.debug(f"      Ingrediente: {ingredient.get('name')} - {original_amount} → {round(scaled_amount, 1)} {ingredient.get('unit', 'g')}")
                elif isinstance(ingredient, str):
                    # Si es solo un string, mantenerlo pero agregar nota
                    scaled_ingredients.append({
                        'name': ingredient,
                        'amount': None,
                        'unit': None,
                        'note': 'Cantidad a ajustar según tu perfil'
                    })
        
        if recipe_ingredients:
            scaled_macros = {
                'calories': round(ingredient_based_macros['calories']),
                'protein': round(ingredient_based_macros['protein'], 1),
                'carbs': round(ingredient_based_macros['carbs'], 1),
                'fat': round(ingredient_based_macros['fat'], 1),
                'fiber': round(ingredient_based_macros['fiber'], 1),
            }
        else:
            scaled_macros = {
                'calories': round(recipe.calories * scale_factor) if recipe.calories else 0,
                'protein': round(float(recipe.protein) * scale_factor, 1) if recipe.protein else 0,
                'carbs': round(float(recipe.carbs) * scale_factor, 1) if recipe.carbs else 0,
                'fat': round(float(recipe.fat) * scale_factor, 1) if recipe.fat else 0,
                'fiber': round(float(recipe.fiber) * scale_factor, 1) if recipe.fiber else 0,
            }
        
        # Calcular porciones ajustadas
        servings = max(1, round(recipe.servings * scale_factor)) if recipe.servings else 1
        
        return {
            'scale_factor': round(scale_factor, 2),
            'ingredients': scaled_ingredients,
            'macros': scaled_macros,
            'servings': servings,
            'target_calories': round(target_calories),
            'original_calories': recipe.calories,
            'meal_type': meal_type,
            'meal_percentage': round(meal_percentage * 100, 1)
        }
    
    def assign_best_plan(self) -> Optional[NutritionPlan]:
        """
        Asigna automáticamente el mejor plan nutricional según el perfil del usuario.
        Retorna el plan asignado o None si no se pudo asignar.
        """
        # Obtener planes adecuados
        suitable_plans = self.get_suitable_plans()
        
        if not suitable_plans.exists():
            # Si no hay planes adecuados, usar el plan del sistema por defecto
            default_plan = NutritionPlan.objects.filter(
                is_system=True,
                is_active=True
            ).first()
            
            if not default_plan:
                # Si no hay plan del sistema, usar cualquier plantilla activa
                default_plan = NutritionPlan.objects.filter(
                    is_template=True,
                    is_active=True
                ).first()
            
            if not default_plan:
                return None
            
            suitable_plans = NutritionPlan.objects.filter(id=default_plan.id)
        
        # Convertir QuerySet a lista para el método de selección
        plans_list = list(suitable_plans)
        
        # Seleccionar el mejor plan basado en prioridades
        best_plan = self._select_best_plan(plans_list)
        
        if not best_plan:
            return None
        
        return self._assign_plan_from_default(best_plan, changed_by=self.user)
    
    def assign_plan_from_default(
        self,
        default_plan: NutritionPlan,
        changed_by: Optional[CustomUser] = None,
        reason: str = "auto_assigned",
        notes: Optional[str] = None,
    ) -> Optional[NutritionPlan]:
        """Asigna un plan específico basado en un NutritionPlan (sistema o plantilla)."""
        if not default_plan:
            return None
        return self._assign_plan_from_default(default_plan, changed_by=changed_by, reason=reason, notes=notes)
    
    def _select_best_plan(self, plans: List[NutritionPlan]) -> Optional[NutritionPlan]:
        """
        Selecciona el mejor plan de una lista de planes adecuados.
        Prioridades:
        1. Plan por defecto
        2. Match con objetivo principal
        3. Match con restricciones dietéticas
        4. Plan básico si no hay otro
        """
        if not plans:
            return None
        
        # Prioridad 1: Plan del sistema
        system_plan = next((p for p in plans if p.is_system), None)
        if system_plan:
            return system_plan
        
        # Prioridad 2: Match exacto con objetivo principal
        if self.user.main_goal:
            goal_mapping = {
                'lose_weight': 'lose_weight',
                'gain_muscle': 'gain_muscle',
                'body_recomposition': 'body_recomposition',
                'maintain': 'maintain',
                'performance': 'performance'
            }
            
            user_goal = goal_mapping.get(self.user.main_goal)
            if user_goal:
                for plan in plans:
                    if plan.goal == user_goal:
                        return plan
        
        # Prioridad 3: Match con restricciones dietéticas
        if self.user.dietary_restrictions:
            restrictions = self.user.dietary_restrictions
            if isinstance(restrictions, str):
                restrictions = [restrictions]
            
            for plan in plans:
                plan_tags = plan.tags if isinstance(plan.tags, list) else []
                if any(restriction.lower() in str(tag).lower() for restriction in restrictions for tag in plan_tags):
                    return plan
                if 'vegetariano' in restrictions and 'vegetariano' in plan.name.lower():
                    return plan
        
        # Prioridad 4: Plan para nivel de actividad muy alto
        if self.user.activity_level == 'very_active' and self.user.training_days_per_week >= 5:
            for plan in plans:
                if plan.goal == 'performance' or 'deportivo' in plan.name.lower():
                    return plan
        
        # Prioridad 5: Retornar el primer plan disponible
        if plans:
            return plans[0]
        
        # Última opción: retornar el primero
        return plans[0]
    
    def _copy_meals_from_default_plan(self, user_plan: NutritionPlan, default_plan: NutritionPlan):
        """Copia las comidas del plan por defecto al plan del usuario"""
        default_meals = default_plan.meals.all().order_by('order_index')
        
        for default_meal in default_meals:
            new_meal = PlanMeal.objects.create(
                plan=user_plan,
                day_of_week=default_meal.day_of_week,
                name=default_meal.name,
                meal_type=default_meal.meal_type,
                time=default_meal.time,
                calories=default_meal.calories,
                protein=default_meal.protein,
                carbs=default_meal.carbs,
                fat=default_meal.fat,
                description=default_meal.description,
                order_index=default_meal.order_index
            )

            selected_recipes = select_compatible_recipes_for_meal(self.user, default_meal)
            if selected_recipes:
                new_meal.suggested_recipes.set(selected_recipes)

    def _assign_plan_from_default(
        self,
        best_plan: NutritionPlan,
        changed_by: Optional[CustomUser] = None,
        reason: str = "auto_assigned",
        notes: Optional[str] = None,
    ) -> Optional[NutritionPlan]:
        if not best_plan or not best_plan.is_active:
            return None

        existing_active_plan = NutritionPlan.objects.filter(user=self.user, is_active=True).first()
        if existing_active_plan:
            existing_active_plan.is_active = False
            existing_active_plan.end_date = timezone.now().date()
            existing_active_plan.save()

        daily_calories = self.calculate_daily_calories()
        macros = self.calculate_macros(daily_calories)

        plan_calories = best_plan.daily_calories
        if abs(plan_calories - daily_calories) > 300:
            plan_calories = daily_calories

        user_plan = NutritionPlan.objects.create(
            user=self.user,
            name=f"{best_plan.name} - {self.user.get_full_name()}",
            description=f"Plan nutricional asignado automáticamente basado en: {best_plan.description}",
            daily_calories=plan_calories,
            protein_grams=int(macros['protein']),
            carbs_grams=int(macros['carbs']),
            fat_grams=int(macros['fat']),
            goal=best_plan.goal,
            diet_type=best_plan.diet_type,
            meals_per_day=best_plan.meals_per_day,
            duration_weeks=best_plan.duration_weeks,
            start_date=timezone.now().date(),
            is_active=True
        )

        self._copy_meals_from_default_plan(user_plan, best_plan)

        self.record_plan_change(
            user=self.user,
            old_plan=existing_active_plan,
            new_plan=user_plan,
            changed_by=changed_by or self.user,
            reason=reason,
            notes=notes or f'Plan asignado automáticamente basado en perfil del usuario: {best_plan.name}',
        )

        return user_plan

    def update_existing_plan(self, plan: NutritionPlan, reason: str = "auto_updated", notes: Optional[str] = None, 
                            old_weight: Optional[float] = None) -> NutritionPlan:
        """
        Actualiza un plan nutricional existente con transición gradual.
        Respeta el objetivo del usuario y hace ajustes graduales.
        
        Args:
            plan: Plan nutricional a actualizar
            reason: Razón del cambio
            notes: Notas adicionales
            old_weight: Peso anterior para incluir en las notas (opcional)
        
        Returns:
            Plan actualizado
        """
        if not plan or plan.user != self.user:
            logger.warning(f"Intento de actualizar plan que no pertenece al usuario {self.user.email}")
            return plan
        
        # Calcular nuevos valores considerando calorías actuales para transición gradual
        old_calories = plan.daily_calories or 2000
        new_daily_calories = self.calculate_daily_calories(previous_calories=old_calories)
        new_macros = self.calculate_macros(new_daily_calories)
        
        # Calcular diferencia porcentual
        calorie_change_pct = abs((new_daily_calories - old_calories) / old_calories * 100) if old_calories > 0 else 0
        
        # Solo actualizar si el cambio es significativo (>3% o >50 calorías)
        if calorie_change_pct < 3 and abs(new_daily_calories - old_calories) < 50:
            logger.info(f"Cambio de calorías muy pequeño ({calorie_change_pct:.1f}%), no se actualiza el plan")
            return plan
        
        # Guardar valores antiguos para el historial
        old_protein = plan.protein_grams
        old_carbs = plan.carbs_grams
        old_fat = plan.fat_grams
        
        # Actualizar valores del plan
        plan.daily_calories = new_daily_calories
        plan.protein_grams = int(new_macros['protein'])
        plan.carbs_grams = int(new_macros['carbs'])
        plan.fat_grams = int(new_macros['fat'])
        plan.updated_at = timezone.now()
        plan.save()
        
        # Actualizar calorías de las comidas proporcionalmente
        if plan.meals.exists():
            total_old_calories = sum(meal.calories or 0 for meal in plan.meals.all())
            if total_old_calories > 0:
                calorie_ratio = Decimal(str(new_daily_calories)) / Decimal(str(total_old_calories))
                
                for meal in plan.meals.all():
                    if meal.calories:
                        meal.calories = int(Decimal(meal.calories) * calorie_ratio)
                        if meal.protein is not None:
                            meal.protein = (Decimal(meal.protein) * calorie_ratio).quantize(Decimal('0.1'), rounding=ROUND_HALF_UP)
                        if meal.carbs is not None:
                            meal.carbs = (Decimal(meal.carbs) * calorie_ratio).quantize(Decimal('0.1'), rounding=ROUND_HALF_UP)
                        if meal.fat is not None:
                            meal.fat = (Decimal(meal.fat) * calorie_ratio).quantize(Decimal('0.1'), rounding=ROUND_HALF_UP)
                        meal.save()
        
        # Crear nota descriptiva
        weight_note = ""
        if old_weight and self.user.weight:
            weight_change = self.user.weight - old_weight
            if abs(weight_change) > 0.1:
                weight_note = f" Peso: {old_weight:.1f} → {self.user.weight:.1f} kg ({weight_change:+.1f} kg)."
        
        goal_display = dict(self.user.MAIN_GOAL_CHOICES).get(self.user.main_goal, self.user.main_goal) if hasattr(self.user, 'MAIN_GOAL_CHOICES') else self.user.main_goal
        
        notes_text = notes or f'Plan actualizado automáticamente.{weight_note} Calorías: {old_calories} → {new_daily_calories} kcal ({calorie_change_pct:.1f}% cambio). Objetivo: {goal_display}.'
        
        # Registrar cambio en historial
        self.record_plan_change(
            user=self.user,
            old_plan=plan,
            new_plan=plan,
            changed_by=self.user,
            reason=reason,
            notes=notes_text,
        )
        
        logger.info(f"Plan {plan.id} actualizado para usuario {self.user.email}: {old_calories} → {new_daily_calories} kcal")
        
        return plan
    
    def adjust_plan_calories(self, plan: NutritionPlan, calorie_adjustment: int, reason: str = "manual_adjustment", notes: Optional[str] = None) -> NutritionPlan:
        """
        Ajusta las calorías de un plan nutricional existente sumando/restando un valor específico.
        Recalcula macros proporcionalmente y actualiza las comidas.
        
        Args:
            plan: Plan nutricional a ajustar
            calorie_adjustment: Ajuste de calorías (positivo = aumentar, negativo = reducir)
            reason: Razón del ajuste
            notes: Notas adicionales
        
        Returns:
            Plan ajustado
        """
        if not plan or plan.user != self.user:
            logger.warning(f"Intento de ajustar plan que no pertenece al usuario {self.user.email}")
            return plan
        
        # Calcular nuevas calorías
        old_calories = plan.daily_calories or 2000
        new_daily_calories = max(1200, min(5000, old_calories + calorie_adjustment))  # Limitar entre 1200 y 5000 kcal
        
        # Calcular nuevos macros manteniendo la misma distribución porcentual
        old_total_macros_calories = (plan.protein_grams or 0) * 4 + (plan.carbs_grams or 0) * 4 + (plan.fat_grams or 0) * 9
        
        if old_total_macros_calories > 0:
            # Calcular porcentajes actuales
            protein_pct = ((plan.protein_grams or 0) * 4) / old_total_macros_calories
            carbs_pct = ((plan.carbs_grams or 0) * 4) / old_total_macros_calories
            fat_pct = ((plan.fat_grams or 0) * 9) / old_total_macros_calories
            
            # Aplicar porcentajes a nuevas calorías
            new_protein = int((new_daily_calories * protein_pct) / 4)
            new_carbs = int((new_daily_calories * carbs_pct) / 4)
            new_fat = int((new_daily_calories * fat_pct) / 9)
        else:
            # Si no hay macros previos, calcular desde cero
            new_macros = self.calculate_macros(new_daily_calories)
            new_protein = int(new_macros['protein'])
            new_carbs = int(new_macros['carbs'])
            new_fat = int(new_macros['fat'])
        
        # Guardar valores antiguos para el historial
        old_protein = plan.protein_grams
        old_carbs = plan.carbs_grams
        old_fat = plan.fat_grams
        
        # Actualizar valores del plan
        plan.daily_calories = new_daily_calories
        plan.protein_grams = new_protein
        plan.carbs_grams = new_carbs
        plan.fat_grams = new_fat
        plan.updated_at = timezone.now()
        plan.save()
        
        # Actualizar calorías de las comidas y recetas proporcionalmente
        if plan.meals.exists():
            calorie_ratio = new_daily_calories / old_calories if old_calories > 0 else 1
            
            for meal in plan.meals.all():
                # Escalar primero cantidades/macros a nivel de receta para mantener coherencia visual
                meal_recipes = list(meal.meal_recipes.select_related('recipe').all())
                for meal_recipe in meal_recipes:
                    update_fields = []

                    if meal_recipe.custom_calories is not None:
                        meal_recipe.custom_calories = max(1, int(round(meal_recipe.custom_calories * calorie_ratio)))
                        update_fields.append('custom_calories')
                    if meal_recipe.custom_protein is not None:
                        meal_recipe.custom_protein = round(float(meal_recipe.custom_protein) * calorie_ratio, 2)
                        update_fields.append('custom_protein')
                    if meal_recipe.custom_carbs is not None:
                        meal_recipe.custom_carbs = round(float(meal_recipe.custom_carbs) * calorie_ratio, 2)
                        update_fields.append('custom_carbs')
                    if meal_recipe.custom_fat is not None:
                        meal_recipe.custom_fat = round(float(meal_recipe.custom_fat) * calorie_ratio, 2)
                        update_fields.append('custom_fat')

                    meal_recipe.servings = Decimal(str(max(0.10, round(float(meal_recipe.servings) * calorie_ratio, 2))))
                    update_fields.append('servings')

                    if update_fields:
                        meal_recipe.save(update_fields=update_fields)

                if meal.calories:
                    meal.calories = int(meal.calories * calorie_ratio)
                    meal.protein = round(float(meal.protein) * calorie_ratio, 1) if meal.protein else None
                    meal.carbs = round(float(meal.carbs) * calorie_ratio, 1) if meal.carbs else None
                    meal.fat = round(float(meal.fat) * calorie_ratio, 1) if meal.fat else None

                # Si la comida tiene recetas, recalcular macros usando promedio de opciones
                if meal_recipes:
                    display_calories = [mr.get_display_calories() for mr in meal_recipes]
                    display_protein = [mr.get_display_protein() for mr in meal_recipes]
                    display_carbs = [mr.get_display_carbs() for mr in meal_recipes]
                    display_fat = [mr.get_display_fat() for mr in meal_recipes]

                    meal.calories = int(round(sum(display_calories) / len(display_calories))) if display_calories else meal.calories
                    meal.protein = round(sum(display_protein) / len(display_protein), 1) if display_protein else meal.protein
                    meal.carbs = round(sum(display_carbs) / len(display_carbs), 1) if display_carbs else meal.carbs
                    meal.fat = round(sum(display_fat) / len(display_fat), 1) if display_fat else meal.fat

                    meal.save()
        
        # Registrar cambio en historial
        adjustment_text = f"{calorie_adjustment:+d}" if calorie_adjustment != 0 else "0"
        self.record_plan_change(
            user=self.user,
            old_plan=plan,
            new_plan=plan,
            changed_by=self.user,
            reason=reason,
            notes=notes or f'Ajuste manual de calorías: {old_calories} → {new_daily_calories} kcal ({adjustment_text} kcal). Proteína: {old_protein} → {new_protein}g, Carbohidratos: {old_carbs} → {new_carbs}g, Grasas: {old_fat} → {new_fat}g',
        )
        
        logger.info(f"Plan {plan.id} ajustado para usuario {self.user.email}: {old_calories} → {new_daily_calories} kcal ({adjustment_text} kcal)")
        
        return plan


class PlanAutoUpdateService:
    """
    Servicio para actualizar automáticamente planes nutricionales cuando cambian
    datos del usuario (peso, objetivos, nivel de actividad, etc.)
    """
    
    def __init__(self, user: CustomUser):
        self.user = user
        self.nutrition_service = PersonalizedNutritionService(user)
    
    def should_update_plan(self, old_weight: Optional[float] = None, old_goal: Optional[str] = None, 
                          old_activity_level: Optional[str] = None) -> Tuple[bool, str]:
        """
        Determina si se debe actualizar el plan basado en los cambios detectados.
        Umbrales más bajos para ajustes más frecuentes y graduales.
        
        Returns:
            Tuple (debe_actualizar: bool, razón: str)
        """
        # Verificar si el usuario tiene un plan activo
        active_plan = NutritionPlan.objects.filter(user=self.user, is_active=True).first()
        if not active_plan:
            return False, "Usuario no tiene plan activo"
        
        # Verificar cambios en peso (umbral más bajo: >1kg o >2% para ajustes más frecuentes)
        if old_weight is not None and self.user.weight:
            weight_change = abs(self.user.weight - old_weight)
            weight_change_pct = (weight_change / old_weight * 100) if old_weight > 0 else 0
            
            # Actualizar si cambio > 1kg o > 2% del peso (más sensible para ajustes graduales)
            if weight_change >= 1.0 or weight_change_pct >= 2:
                return True, f"Cambio de peso: {old_weight:.1f} → {self.user.weight:.1f} kg ({weight_change_pct:.1f}%)"
        
        # Verificar cambios en objetivo (siempre actualizar si cambia el objetivo)
        if old_goal and old_goal != self.user.main_goal:
            return True, f"Cambio de objetivo: {old_goal} → {self.user.main_goal}"
        
        # Verificar cambios en nivel de actividad (siempre actualizar si cambia)
        if old_activity_level and old_activity_level != self.user.activity_level:
            return True, f"Cambio de nivel de actividad: {old_activity_level} → {self.user.activity_level}"
        
        return False, "No hay cambios significativos"
    
    def update_plan_if_needed(self, old_weight: Optional[float] = None, old_goal: Optional[str] = None,
                             old_activity_level: Optional[str] = None, reason: str = "auto_updated") -> Optional[NutritionPlan]:
        """
        Actualiza el plan nutricional si es necesario basado en los cambios del usuario.
        
        Returns:
            Plan actualizado o None si no se actualizó
        """
        should_update, update_reason = self.should_update_plan(old_weight, old_goal, old_activity_level)
        
        if not should_update:
            logger.info(f"No se actualiza plan para {self.user.email}: {update_reason}")
            return None
        
        active_plan = NutritionPlan.objects.filter(user=self.user, is_active=True).first()
        if not active_plan:
            logger.warning(f"Usuario {self.user.email} no tiene plan activo para actualizar")
            return None
        
        # Actualizar el plan existente con transición gradual
        updated_plan = self.nutrition_service.update_existing_plan(
            plan=active_plan,
            reason=reason,
            notes=f"Actualización automática: {update_reason}",
            old_weight=old_weight
        )
        
        logger.info(f"Plan actualizado automáticamente para {self.user.email}: {update_reason}")
        
        return updated_plan


def get_personalized_nutrition_plan(user: CustomUser) -> Dict[str, any]:
    """Función helper para obtener un plan nutricional personalizado"""
    service = PersonalizedNutritionService(user)
    return service.get_recommendations()

def assign_nutrition_plan_to_user(user: CustomUser) -> Optional[NutritionPlan]:
    """Función helper para asignar automáticamente un plan nutricional a un usuario"""
    service = PersonalizedNutritionService(user)
    return service.assign_best_plan()
