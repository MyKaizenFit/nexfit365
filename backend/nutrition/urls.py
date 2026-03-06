# nutrition/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RecipeViewSet, NutritionPlanViewSet, MealLogViewSet, FoodViewSet, 
    current_plan, plan_meals_for_selection, daily_meal_selections, daily_meal_selections_today,
    weekly_meal_selections, monthly_meal_selections, default_nutrition_plans, list_recipes,
    adjust_plan, plan_history
)

router = DefaultRouter()
# No registrar recipes en el router para evitar conflictos con el endpoint explícito
# router.register(r'recipes', RecipeViewSet, basename='recipes')
router.register(r'plans', NutritionPlanViewSet, basename='nutrition-plans')
router.register(r'meal-logs', MealLogViewSet, basename='meal-logs')
router.register(r'foods', FoodViewSet, basename='foods')

urlpatterns = [
    path('current-plan/', current_plan, name='current-plan'),
    path('adjust-plan/', adjust_plan, name='adjust-plan'),
    path('plan-history/', plan_history, name='plan-history'),
    path('plan-meals-for-selection/', plan_meals_for_selection, name='plan-meals-for-selection'),
    path('daily-meal-selections/today/', daily_meal_selections_today, name='daily-meal-selections-today'),
    path('daily-meal-selections/', daily_meal_selections, name='daily-meal-selections'),
    path('weekly-meal-selections/', weekly_meal_selections, name='weekly-meal-selections'),
    path('monthly-meal-selections/', monthly_meal_selections, name='monthly-meal-selections'),
    path('default-nutrition-plans/', default_nutrition_plans, name='default-nutrition-plans'),
    # Endpoints de exportación para recetas (ANTES de la ruta genérica)
    path('recipes/export-csv/', RecipeViewSet.as_view({'get': 'export_csv'}), name='recipe-export-csv'),
    path('recipes/export-excel/', RecipeViewSet.as_view({'get': 'export_excel'}), name='recipe-export-excel'),
    # Endpoint explícito para listar recetas (tiene prioridad sobre el router)
    path('recipes/', list_recipes, name='recipes-list'),
    # Endpoints para recetas específicas
    path('recipes/<uuid:pk>/', RecipeViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='recipe-detail'),
    path('recipes/<uuid:pk>/personalized/', RecipeViewSet.as_view({'get': 'personalized'}), name='recipe-personalized'),
    path('recipes/<uuid:pk>/ingredients/', RecipeViewSet.as_view({'get': 'ingredients', 'post': 'ingredients'}), name='recipe-ingredients'),
    path('recipes/<uuid:pk>/ingredients/<uuid:ingredient_id>/', RecipeViewSet.as_view({'put': 'ingredient_detail', 'delete': 'ingredient_detail'}), name='recipe-ingredient-detail'),
    path('recipes/<uuid:pk>/recalculate_macros/', RecipeViewSet.as_view({'post': 'recalculate_macros'}), name='recipe-recalculate-macros'),
    path('', include(router.urls)),
]
