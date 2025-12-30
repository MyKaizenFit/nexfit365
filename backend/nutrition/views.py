# nutrition/views.py
# Views para la nueva estructura simplificada

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models

from .models import Recipe, NutritionPlan, PlanMeal, MealLog, Food, NutritionPlanHistory
from .serializers import (
    RecipeSerializer, RecipeMinimalSerializer,
    NutritionPlanSerializer, NutritionPlanMinimalSerializer,
    PlanMealSerializer, MealLogSerializer, FoodSerializer,
    NutritionPlanHistorySerializer
)
from .services import PersonalizedNutritionService
from django.shortcuts import get_object_or_404
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_plan(request):
    """
    Obtener el plan de nutrición actual del usuario.
    Devuelve el plan más reciente asignado al usuario o null si no tiene ninguno.
    """
    plan = NutritionPlan.objects.filter(
        user=request.user,
        is_active=True
    ).select_related('user').prefetch_related(
        'meals',
        'meals__suggested_recipes'
    ).order_by('-created_at').first()
    
    if plan:
        serializer = NutritionPlanSerializer(plan)
        return Response({'plan': serializer.data})
    
    # Si no tiene plan, devolver null (no es un error)
    return Response({'plan': None})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def plan_meals_for_selection(request):
    """
    Obtener comidas disponibles para selección.
    Devuelve las comidas del plan actual del usuario organizadas por tipo con recetas sugeridas.
    Las cantidades se personalizan según el perfil del usuario (peso, altura, objetivo, etc.)
    """
    import logging
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
    
    # Primero intentar obtener comidas del plan actual del usuario
    user_plan = NutritionPlan.objects.filter(
        user=user,
        is_active=True
    ).prefetch_related('meals__suggested_recipes').first()
    
    meals_by_type = {}
    
    if user_plan:
        meals = user_plan.meals.all()
        for meal in meals:
            meal_type = meal.meal_type
            if meal_type not in meals_by_type:
                meals_by_type[meal_type] = []
            
            # Crear opciones basadas en la comida y sus recetas sugeridas
            meal_options = []
            
            # Si hay recetas sugeridas, crear una opción por cada receta (máximo 3)
            if meal.suggested_recipes.exists():
                for recipe in meal.suggested_recipes.all()[:3]:
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
                        'recipeId': recipe.id
                    })
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
            
            meals_by_type[meal_type].extend(meal_options)
        
        return Response({
            'meals_by_type': meals_by_type,
            'plan_name': user_plan.name,
            'source': 'user_plan',
            'daily_calories_target': daily_calories,
            'daily_macros': daily_macros
        })
    
    # Si no tiene plan, devolver comidas de plantillas del sistema
    system_plans = NutritionPlan.objects.filter(
        is_system=True,
        is_active=True
    ).prefetch_related('meals__suggested_recipes')[:3]
    
    for plan in system_plans:
        for meal in plan.meals.all():
            meal_type = meal.meal_type
            if meal_type not in meals_by_type:
                meals_by_type[meal_type] = []
            
            # Crear opciones basadas en la comida y sus recetas sugeridas (máximo 3)
            if meal.suggested_recipes.exists():
                for recipe in meal.suggested_recipes.all()[:3]:
                    personalized = personalize_recipe(recipe, meal_type, meal)
                    meals_by_type[meal_type].append({
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
                        'recipeId': recipe.id
                    })
            else:
                personalized = personalize_meal(meal, meal_type)
                meals_by_type[meal_type].append({
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
    
    return Response({
        'meals_by_type': meals_by_type,
        'plan_name': None,
        'source': 'system_templates',
        'daily_calories_target': daily_calories,
        'daily_macros': daily_macros
    })


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
    
    elif request.method == 'POST':
        # Guardar selección de comida
        data = request.data
        meal_type = data.get('meal_type')
        recipe_id = data.get('recipe_id')
        
        if not meal_type:
            return Response({'error': 'meal_type es requerido'}, status=status.HTTP_400_BAD_REQUEST)
        
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
        
        # Crear o actualizar el log de comida
        # Si es una selección (no completada), guardar con completed=False
        # Si es una comida consumida, guardar con completed=True
        is_completed = data.get('completed', False)
        if isinstance(is_completed, str):
            is_completed = is_completed.lower() in ('true', '1', 'yes')
        
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
        
        meal_log, created = MealLog.objects.update_or_create(
            user=user,
            date=date,
            meal_type=meal_type,
            defaults={
                'recipe': recipe,
                'completed': is_completed,
                'calories': int(calories) if calories else 0,
                'protein': float(protein) if protein else 0,
                'carbs': float(carbs) if carbs else 0,
                'fat': float(fat) if fat else 0,
                'custom_description': custom_description,
            }
        )
        
        serializer = MealLogSerializer(meal_log)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


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
        
        # Serializar la receta
        recipe_data = RecipeSerializer(recipe).data
        
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
        user = self.request.user
        return NutritionPlan.objects.filter(
            is_active=True
        ).filter(
            models.Q(is_system=True) | models.Q(user=user)
        ).select_related('user').prefetch_related(
            'meals',
            'meals__suggested_recipes'
        )
    
    def get_serializer_class(self):
        if self.action == 'list':
            return NutritionPlanMinimalSerializer
        return NutritionPlanSerializer
    
    @action(detail=False, methods=['get'])
    def my_plans(self, request):
        """Planes del usuario"""
        plans = NutritionPlan.objects.filter(user=request.user, is_active=True)
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
        
        # Validar que el plan pertenece al usuario o es una plantilla del sistema
        if plan.user and plan.user != user:
            return Response(
                {'error': 'No tienes permiso para activar este plan.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Solo se pueden activar planes de usuarios (no plantillas directamente)
        # Si es una plantilla, el admin debe crear una copia para el usuario primero
        if plan.is_template or (plan.is_system and not plan.user):
            return Response(
                {'error': 'No puedes activar directamente una plantilla. Un administrador debe asignártela primero.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # IMPORTANTE: Desactivar TODOS los otros planes activos del usuario
        # Esto garantiza que solo un plan esté activo a la vez
        NutritionPlan.objects.filter(
            user=user,
            is_active=True
        ).exclude(pk=pk).update(is_active=False)
        
        # Activar el plan solicitado
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


class MealLogViewSet(viewsets.ModelViewSet):
    """ViewSet para logs de comidas"""
    serializer_class = MealLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['date', 'meal_type', 'completed']
    ordering_fields = ['date', 'time', 'created_at']
    ordering = ['-date', '-time']
    
    def get_queryset(self):
        return MealLog.objects.filter(
            user=self.request.user
        ).select_related('user', 'recipe')
    
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
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'brand']


@api_view(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
@permission_classes([IsAuthenticated])
@api_view(['GET'])
@permission_classes([IsAuthenticated])
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
    queryset = Recipe.objects.filter(is_active=True)
    
    # Búsqueda
    search_query = request.query_params.get('search', '')
    if search_query:
        queryset = queryset.filter(
            models.Q(name__icontains=search_query) |
            models.Q(description__icontains=search_query) |
            models.Q(ingredients__icontains=search_query)
        )
    
    # Filtros
    category = request.query_params.get('category')
    if category:
        queryset = queryset.filter(category=category)
    
    difficulty = request.query_params.get('difficulty')
    if difficulty:
        queryset = queryset.filter(difficulty=difficulty)
    
    meal_type = request.query_params.get('meal_type')
    if meal_type:
        queryset = queryset.filter(meal_types__contains=[meal_type])
    
    # Ordenamiento
    ordering = request.query_params.get('ordering', 'name')
    if ordering.lstrip('-') in ['name', 'calories', 'prep_time_minutes', 'created_at']:
        queryset = queryset.order_by(ordering)
    else:
        queryset = queryset.order_by('name')
    
    # Paginación
    page = int(request.query_params.get('page', 1))
    page_size = int(request.query_params.get('page_size', 100))
    
    total = queryset.count()
    start = (page - 1) * page_size
    end = start + page_size
    
    recipes_list = queryset[start:end]
    
    # Serializar
    serializer = RecipeMinimalSerializer(recipes_list, many=True)
    
    return Response({
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
    Devuelve planes que pueden ser usados como plantillas.
    """
    # Buscar planes que son plantillas (is_template=True) o del sistema (user=None)
    plans = NutritionPlan.objects.filter(
        models.Q(is_template=True) | models.Q(user__isnull=True)
    ).distinct().prefetch_related('meals__suggested_recipes')
    
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
