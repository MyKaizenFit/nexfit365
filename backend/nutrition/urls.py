# nutrition/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RecipeViewSet, NutritionPlanViewSet, MealLogViewSet, FoodViewSet

router = DefaultRouter()
router.register(r'recipes', RecipeViewSet, basename='recipes')
router.register(r'plans', NutritionPlanViewSet, basename='nutrition-plans')
router.register(r'meal-logs', MealLogViewSet, basename='meal-logs')
router.register(r'foods', FoodViewSet, basename='foods')

urlpatterns = [
    path('', include(router.urls)),
]
