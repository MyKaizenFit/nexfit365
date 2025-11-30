# nutrition/admin_urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import admin_views

router = DefaultRouter()
router.register(r'recipes', admin_views.AdminRecipeViewSet, basename='admin-recipes')
router.register(r'plans', admin_views.AdminNutritionPlanViewSet, basename='admin-nutrition-plans')
router.register(r'meals', admin_views.AdminPlanMealViewSet, basename='admin-plan-meals')
router.register(r'foods', admin_views.AdminFoodViewSet, basename='admin-foods')

urlpatterns = [
    path('', include(router.urls)),
]
