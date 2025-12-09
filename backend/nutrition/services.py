# nutrition/services.py
from typing import Dict, List, Optional, Tuple
from django.db.models import Q
from django.utils import timezone
from accounts.models import CustomUser
from .models import NutritionPlan, PlanMeal, NutritionPlanHistory, Recipe
import math

class PersonalizedNutritionService:
    """Servicio para generar planes nutricionales personalizados basados en el perfil del usuario"""
    
    def __init__(self, user: CustomUser):
        self.user = user
    
    def calculate_daily_calories(self) -> int:
        """Calcula las calorías diarias basadas en el perfil del usuario"""
        if not all([self.user.age, self.user.gender, self.user.height, self.user.weight]):
            return 2000  # Valor por defecto
        
        # Fórmula de Harris-Benedict
        if self.user.gender == 'male':
            bmr = 88.362 + (13.397 * self.user.weight) + (4.799 * self.user.height) - (5.677 * self.user.age)
        else:  # female
            bmr = 447.593 + (9.247 * self.user.weight) + (3.098 * self.user.height) - (4.330 * self.user.age)
        
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
        
        # Ajustar según objetivo
        if self.user.main_goal == 'lose_weight':
            return int(tdee * 0.8)  # Déficit del 20%
        elif self.user.main_goal == 'gain_muscle':
            return int(tdee * 1.1)  # Superávit del 10%
        else:  # body_recomposition
            return int(tdee)  # Mantenimiento
    
    def calculate_macros(self, daily_calories: int) -> Dict[str, float]:
        """Calcula la distribución de macronutrientes basada en el perfil del usuario"""
        
        # Ajustar porcentajes según objetivo y perfil
        if self.user.main_goal == 'lose_weight':
            protein_pct = 30
            carbs_pct = 40
            fat_pct = 30
        elif self.user.main_goal == 'gain_muscle':
            protein_pct = 25
            carbs_pct = 50
            fat_pct = 25
        else:  # body_recomposition
            protein_pct = 30
            carbs_pct = 45
            fat_pct = 25
        
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
                notes=notes,
                is_admin_change=is_admin_change
            )
        except Exception as e:
            # No fallar la operación principal si falla el registro del historial
            print(f'Error registrando cambio de plan en historial: {str(e)}')
    
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
            target_macros=macros,
            start_date=timezone.now().date(),
            is_active=True
        )
        
        # Crear las comidas del plan
        self._create_plan_meals(plan, daily_calories, macros)
        
        return plan
    
    def _create_plan_meals(self, plan: NutritionPlan, daily_calories: int, macros: Dict[str, float]):
        """Crea las comidas del plan nutricional"""
        from datetime import time
        
        # Distribución de calorías por comida
        meal_distribution = {
            'Desayuno': 0.25,
            'Snack Mañana': 0.10,
            'Almuerzo': 0.30,
            'Snack Tarde': 0.10,
            'Cena': 0.25
        }
        
        # Horarios de las comidas
        meal_times = {
            'Desayuno': time(8, 0),
            'Snack Mañana': time(11, 0),
            'Almuerzo': time(14, 0),
            'Snack Tarde': time(17, 0),
            'Cena': time(20, 0)
        }
        
        for meal_name, percentage in meal_distribution.items():
            meal_calories = int(daily_calories * percentage)
            meal_protein = macros['protein'] * percentage
            meal_carbs = macros['carbs'] * percentage
            meal_fat = macros['fat'] * percentage
            
            Meal.objects.create(
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
        # Calcular calorías objetivo para esta comida específica
        daily_calories = self.calculate_daily_calories()
        
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
        
        # Obtener porcentaje para este tipo de comida
        meal_percentage = meal_calorie_distribution.get(meal_type, 0.25)
        target_calories = daily_calories * meal_percentage
        
        # Calcular factor de escala basado en calorías objetivo vs receta base
        if recipe.calories and recipe.calories > 0:
            scale_factor = target_calories / recipe.calories
        else:
            # Si la receta no tiene calorías, usar un factor por defecto
            scale_factor = 1.0
        
        # Ajustar según objetivo del usuario
        if self.user.main_goal == 'lose_weight':
            scale_factor *= 0.9  # Reducir un 10% para déficit
        elif self.user.main_goal == 'gain_muscle':
            scale_factor *= 1.1  # Aumentar un 10% para superávit
        
        # Limitar el factor de escala a un rango razonable (0.5x a 2x)
        scale_factor = max(0.5, min(2.0, scale_factor))
        
        # Calcular ingredientes escalados
        scaled_ingredients = []
        if recipe.ingredients and isinstance(recipe.ingredients, list):
            for ingredient in recipe.ingredients:
                if isinstance(ingredient, dict):
                    original_amount = float(ingredient.get('amount', 0))
                    scaled_amount = original_amount * scale_factor
                    scaled_ingredients.append({
                        'name': ingredient.get('name', 'Ingrediente'),
                        'amount': round(scaled_amount, 1),
                        'unit': ingredient.get('unit', 'g')
                    })
                elif isinstance(ingredient, str):
                    # Si es solo un string, mantenerlo pero agregar nota
                    scaled_ingredients.append({
                        'name': ingredient,
                        'amount': None,
                        'unit': None,
                        'note': 'Cantidad a ajustar según tu perfil'
                    })
        
        # Calcular macros escalados
        scaled_macros = {
            'calories': round(recipe.calories * scale_factor) if recipe.calories else 0,
            'protein': round(float(recipe.protein) * scale_factor, 1) if recipe.protein else 0,
            'carbs': round(float(recipe.carbs) * scale_factor, 1) if recipe.carbs else 0,
            'fat': round(float(recipe.fat) * scale_factor, 1) if recipe.fat else 0,
            'fiber': round(float(recipe.fiber) * scale_factor, 1) if recipe.fiber else 0
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
            PlanMeal.objects.create(
                plan=user_plan,
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
            # Copiar recetas sugeridas si existen
            if default_meal.suggested_recipes.exists():
                new_meal = user_plan.meals.filter(name=default_meal.name).first()
                if new_meal:
                    new_meal.suggested_recipes.set(default_meal.suggested_recipes.all())

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
            target_macros={
                'protein': macros['protein'],
                'carbs': macros['carbs'],
                'fat': macros['fat'],
                'protein_percentage': macros['protein_percentage'],
                'carbs_percentage': macros['carbs_percentage'],
                'fat_percentage': macros['fat_percentage']
            },
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

def get_personalized_nutrition_plan(user: CustomUser) -> Dict[str, any]:
    """Función helper para obtener un plan nutricional personalizado"""
    service = PersonalizedNutritionService(user)
    return service.get_recommendations()

def assign_nutrition_plan_to_user(user: CustomUser) -> Optional[NutritionPlan]:
    """Función helper para asignar automáticamente un plan nutricional a un usuario"""
    service = PersonalizedNutritionService(user)
    return service.assign_best_plan()





