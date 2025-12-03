# nutrition/admin_views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes as perm_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.db.models import Count, Avg, Sum

from .models import Recipe, NutritionPlan, PlanMeal, Food, MealLog
from .admin_serializers import (
    AdminRecipeSerializer, AdminNutritionPlanSerializer,
    AdminPlanMealSerializer, AdminFoodSerializer
)


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
