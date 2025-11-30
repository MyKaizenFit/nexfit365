# nutrition/admin.py
from django.contrib import admin
from .models import Recipe, NutritionPlan, PlanMeal, MealLog, Food, NutritionPlanHistory


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'difficulty', 'calories', 'prep_time_minutes', 'is_system', 'is_featured']
    list_filter = ['category', 'difficulty', 'is_system', 'is_featured', 'is_active']
    search_fields = ['name', 'description']
    ordering = ['name']


class PlanMealInline(admin.TabularInline):
    model = PlanMeal
    extra = 0
    ordering = ['order_index']


@admin.register(NutritionPlan)
class NutritionPlanAdmin(admin.ModelAdmin):
    list_display = ['name', 'daily_calories', 'goal', 'diet_type', 'is_system', 'is_template']
    list_filter = ['goal', 'diet_type', 'is_system', 'is_template', 'is_active']
    search_fields = ['name', 'description']
    inlines = [PlanMealInline]


@admin.register(MealLog)
class MealLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'meal_type', 'calories', 'completed']
    list_filter = ['meal_type', 'completed', 'date']
    search_fields = ['user__email']
    ordering = ['-date']


@admin.register(Food)
class FoodAdmin(admin.ModelAdmin):
    list_display = ['name', 'brand', 'calories', 'protein', 'carbs', 'fat']
    search_fields = ['name', 'brand']
