# nutrition/admin_views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes as perm_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.db.models import Count, Avg, Sum
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import datetime, timedelta

from .models import Recipe, NutritionPlan, PlanMeal, Food, MealLog
from .admin_serializers import (
    AdminRecipeSerializer, AdminNutritionPlanSerializer,
    AdminPlanMealSerializer, AdminFoodSerializer
)
from .serializers import MealLogSerializer, NutritionPlanHistorySerializer

User = get_user_model()


class AdminRecipeViewSet(viewsets.ModelViewSet):
    queryset = Recipe.objects.all()
    serializer_class = AdminRecipeSerializer
    permission_classes = [IsAdminUser]
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Estadísticas de recetas"""
        total_recipes = Recipe.objects.count()
        
        # Estadísticas por categoría
        by_category = Recipe.objects.values('category').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Promedios nutricionales
        avg_nutrition = Recipe.objects.aggregate(
            avg_calories=Avg('calories'),
            avg_protein=Avg('protein'),
            avg_carbs=Avg('carbs'),
            avg_fat=Avg('fat'),
        )
        
        # Recetas más usadas (en planes)
        popular_recipes = Recipe.objects.annotate(
            usage_count=Count('suggested_in_meals')
        ).order_by('-usage_count')[:10]
        
        # Conteo por dificultad
        by_difficulty = Recipe.objects.values('difficulty').annotate(
            count=Count('id')
        ).order_by('-count')
        
        return Response({
            'total_recipes': total_recipes,
            'by_category': list(by_category),
            'by_difficulty': list(by_difficulty),
            'average_nutrition': {
                'calories': round(avg_nutrition['avg_calories'] or 0, 1),
                'protein': round(avg_nutrition['avg_protein'] or 0, 1),
                'carbs': round(avg_nutrition['avg_carbs'] or 0, 1),
                'fat': round(avg_nutrition['avg_fat'] or 0, 1),
            },
            'popular_recipes': [
                {
                    'id': str(r.id),
                    'name': r.name,
                    'usage_count': r.usage_count
                } for r in popular_recipes
            ]
        })


class AdminNutritionPlanViewSet(viewsets.ModelViewSet):
    queryset = NutritionPlan.objects.all().prefetch_related('meals')
    serializer_class = AdminNutritionPlanSerializer
    permission_classes = [IsAdminUser]


class AdminPlanMealViewSet(viewsets.ModelViewSet):
    queryset = PlanMeal.objects.all()
    serializer_class = AdminPlanMealSerializer
    permission_classes = [IsAdminUser]


class AdminFoodViewSet(viewsets.ModelViewSet):
    queryset = Food.objects.all()
    serializer_class = AdminFoodSerializer
    permission_classes = [IsAdminUser]


@api_view(['GET'])
@perm_classes([IsAdminUser])
def admin_default_plans(request):
    """
    Lista de planes de nutrición predeterminados/plantillas
    """
    # Planes que son plantillas del sistema (sin usuario asignado o marcados como template)
    plans = NutritionPlan.objects.filter(
        user__isnull=True
    ).prefetch_related('meals__suggested_recipes') | NutritionPlan.objects.filter(
        is_template=True
    ).prefetch_related('meals__suggested_recipes')
    
    plans = plans.distinct()
    
    # Paginación
    page = int(request.query_params.get('page', 1))
    page_size = int(request.query_params.get('page_size', 50))
    
    total = plans.count()
    start = (page - 1) * page_size
    end = start + page_size
    
    plans_list = plans[start:end]
    
    results = []
    for plan in plans_list:
        # Calcular porcentajes de macros
        protein_pct = 30  # valor por defecto
        carbs_pct = 40
        fat_pct = 30
        
        if plan.daily_calories and plan.protein_grams:
            protein_pct = round((plan.protein_grams * 4) / plan.daily_calories * 100, 1)
        if plan.daily_calories and plan.carbs_grams:
            carbs_pct = round((plan.carbs_grams * 4) / plan.daily_calories * 100, 1)
        if plan.daily_calories and plan.fat_grams:
            fat_pct = round((plan.fat_grams * 9) / plan.daily_calories * 100, 1)
        
        results.append({
            'id': str(plan.id),
            'name': plan.name,
            'description': plan.description,
            'goal': plan.goal,
            'diet_type': plan.diet_type,
            'daily_calories': plan.daily_calories,
            'protein_grams': float(plan.protein_grams) if plan.protein_grams else 0,
            'carbs_grams': float(plan.carbs_grams) if plan.carbs_grams else 0,
            'fat_grams': float(plan.fat_grams) if plan.fat_grams else 0,
            'protein_percentage': protein_pct,
            'carbs_percentage': carbs_pct,
            'fat_percentage': fat_pct,
            'meals_per_day': plan.meals_per_day,
            'duration_weeks': plan.duration_weeks,
            'is_active': plan.is_active,
            'is_template': plan.is_template,
            'is_system': plan.is_system,
            'is_default': getattr(plan, 'is_default', False),
            'meals_count': plan.meals.count(),
            'created_at': plan.created_at.isoformat() if plan.created_at else None,
            'updated_at': plan.updated_at.isoformat() if plan.updated_at else None,
        })
    
    return Response({
        'results': results,
        'count': total,
        'page': page,
        'page_size': page_size,
        'total_pages': (total + page_size - 1) // page_size if total > 0 else 0,
    })


@api_view(['GET'])
@perm_classes([IsAdminUser])
def admin_user_plan(request, user_id: int):
    """
    Resumen del plan activo del usuario y consumo reciente de macros.
    Query params opcionales:
      - days: ventana en días para sumar macros (por defecto 7)
      - end_date: fecha fin YYYY-MM-DD (por defecto hoy)
    """
    user = get_object_or_404(User, pk=user_id)

    plan = NutritionPlan.objects.filter(user=user).prefetch_related('meals__suggested_recipes').order_by('-is_active', '-created_at').first()
    plan_data = AdminNutritionPlanSerializer(plan).data if plan else None

    days = max(int(request.query_params.get('days', 7)), 1)
    end_date_param = request.query_params.get('end_date')
    if end_date_param:
        try:
            end_date = datetime.strptime(end_date_param, '%Y-%m-%d').date()
        except ValueError:
            end_date = timezone.localdate()
    else:
        end_date = timezone.localdate()
    start_date = end_date - timedelta(days=days - 1)

    meal_logs = MealLog.objects.filter(user=user, date__range=(start_date, end_date))

    aggregates = meal_logs.aggregate(
        calories=Sum('calories'),
        protein=Sum('protein'),
        carbs=Sum('carbs'),
        fat=Sum('fat'),
    )

    per_day = list(
        meal_logs.values('date').annotate(
            calories=Sum('calories'),
            protein=Sum('protein'),
            carbs=Sum('carbs'),
            fat=Sum('fat'),
        ).order_by('-date')
    )

    target_calories = None
    if plan and plan.daily_calories:
        target_calories = plan.daily_calories
    elif hasattr(user, 'daily_calories_target'):
        target_calories = user.daily_calories_target

    macros_target = {
        'calories': target_calories,
        'protein': float(plan.protein_grams) if plan and plan.protein_grams else None,
        'carbs': float(plan.carbs_grams) if plan and plan.carbs_grams else None,
        'fat': float(plan.fat_grams) if plan and plan.fat_grams else None,
    }

    return Response({
        'plan': plan_data,
        'user_id': user.id,
        'period': {
            'start_date': start_date,
            'end_date': end_date,
            'days': days,
        },
        'macros_target': macros_target,
        'macro_intake': {
            'totals': {k: (float(v) if v is not None else 0) for k, v in aggregates.items()},
            'per_day': per_day,
        },
        'logs_count': meal_logs.count(),
    })


@api_view(['GET'])
@perm_classes([IsAdminUser])
def admin_user_plan_history(request, user_id: int):
    """
    Historial de cambios de planes nutricionales de un usuario (hasta 100 registros más recientes).
    """
    user = get_object_or_404(User, pk=user_id)
    history_qs = user.nutrition_plan_history.select_related('changed_by').order_by('-created_at')[:100]
    serializer = NutritionPlanHistorySerializer(history_qs, many=True)
    return Response({
        'user_id': user.id,
        'count': len(serializer.data),
        'history': serializer.data,
    })


@api_view(['GET'])
@perm_classes([IsAdminUser])
def admin_user_meal_logs(request, user_id: int):
    """
    Logs de comidas de un usuario para revisión/admin.
    Query params:
      - start_date / end_date (YYYY-MM-DD) para filtrar rango
      - limit (por defecto 50, máx 200)
    """
    user = get_object_or_404(User, pk=user_id)

    start_param = request.query_params.get('start_date')
    end_param = request.query_params.get('end_date')

    start_date = None
    end_date = None
    if start_param:
        try:
            start_date = datetime.strptime(start_param, '%Y-%m-%d').date()
        except ValueError:
            start_date = None
    if end_param:
        try:
            end_date = datetime.strptime(end_param, '%Y-%m-%d').date()
        except ValueError:
            end_date = None

    logs_qs = MealLog.objects.filter(user=user)
    if start_date:
        logs_qs = logs_qs.filter(date__gte=start_date)
    if end_date:
        logs_qs = logs_qs.filter(date__lte=end_date)

    logs_qs = logs_qs.order_by('-date', '-created_at')
    limit = min(int(request.query_params.get('limit', 50)), 200)
    logs_qs = logs_qs[:limit]

    serializer = MealLogSerializer(logs_qs, many=True)

    aggregates = logs_qs.aggregate(
        calories=Sum('calories'),
        protein=Sum('protein'),
        carbs=Sum('carbs'),
        fat=Sum('fat'),
    )

    return Response({
        'user_id': user.id,
        'count': len(serializer.data),
        'totals': {k: (float(v) if v is not None else 0) for k, v in aggregates.items()},
        'logs': serializer.data,
    })


@api_view(['PATCH', 'DELETE'])
@perm_classes([IsAdminUser])
def admin_user_meal_log_detail(request, user_id: int, log_id):
    """
    Editar o eliminar un log de comida del usuario (uso admin/staff).
    """
    user = get_object_or_404(User, pk=user_id)
    log = get_object_or_404(MealLog, pk=log_id, user=user)

    if request.method == 'DELETE':
        log.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = MealLogSerializer(log, data=request.data, partial=True, context={'request': request})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)
