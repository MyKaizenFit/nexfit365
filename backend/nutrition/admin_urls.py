# nutrition/admin_urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import admin_views

router = DefaultRouter()
router.register(r'recipes', admin_views.AdminRecipeViewSet, basename='admin-recipes')
router.register(r'plans', admin_views.AdminNutritionPlanViewSet, basename='admin-nutrition-plans')
router.register(r'meals', admin_views.AdminPlanMealViewSet, basename='admin-plan-meals')
router.register(r'meal-recipes', admin_views.AdminPlanMealRecipeViewSet, basename='admin-plan-meal-recipes')
router.register(r'foods', admin_views.AdminFoodViewSet, basename='admin-foods')
router.register(r'community-recipes', admin_views.AdminCommunityRecipePostViewSet, basename='admin-community-recipes')
router.register(r'equivalence-categories', admin_views.AdminEquivalenceCategoryViewSet, basename='admin-equivalence-categories')

urlpatterns = [
    path('', include(router.urls)),
    path('default-plans/', admin_views.admin_default_plans, name='admin-default-plans'),
    path('change-user-plan/', admin_views.admin_change_user_plan, name='admin-change-user-plan'),
    path('bulk-change-plans/', admin_views.admin_bulk_change_plans, name='admin-bulk-change-plans'),
    # Gestión directa de planes y logs de usuarios
    path('users/<int:user_id>/plan/', admin_views.admin_user_plan, name='admin-user-plan'),
    path('users/<int:user_id>/plan-history/', admin_views.admin_user_plan_history, name='admin-user-plan-history'),
    path('users/<int:user_id>/meal-logs/', admin_views.admin_user_meal_logs, name='admin-user-meal-logs'),
    path('users/<int:user_id>/meal-logs/<uuid:log_id>/', admin_views.admin_user_meal_log_detail, name='admin-user-meal-log-detail'),
    # Estadísticas y historial general de planes de usuarios
    path('user-plans/stats/', admin_views.admin_user_plans_stats, name='admin-user-plans-stats'),
    path('user-plans/usage_stats/', admin_views.admin_user_plans_usage_stats, name='admin-user-plans-usage-stats'),
    path('user-plans/history/', admin_views.admin_user_plans_history, name='admin-user-plans-history'),
]
