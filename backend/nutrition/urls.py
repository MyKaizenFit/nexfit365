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
    # Endpoint explícito para listar recetas (tiene prioridad sobre el router)
    path('recipes/', list_recipes, name='recipes-list'),
    # Endpoint para obtener una receta específica (usando el ViewSet)
    path('recipes/<uuid:pk>/', RecipeViewSet.as_view({'get': 'retrieve'}), name='recipe-detail'),
    path('recipes/<uuid:pk>/personalized/', RecipeViewSet.as_view({'get': 'personalized'}), name='recipe-personalized'),
    path('', include(router.urls)),
]
