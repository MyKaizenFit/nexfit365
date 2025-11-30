# nutrition/serializers.py
# Serializers para la nueva estructura simplificada

from rest_framework import serializers
from .models import Recipe, NutritionPlan, PlanMeal, MealLog, Food


class RecipeSerializer(serializers.ModelSerializer):
    """Serializer para recetas"""
    total_time_minutes = serializers.IntegerField(read_only=True)
    macros_summary = serializers.DictField(read_only=True)
    
    class Meta:
        model = Recipe
        fields = [
            "id", "name", "description", "category",
            "difficulty", "prep_time_minutes", "cook_time_minutes",
            "servings", "total_time_minutes",
            "calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium",
            "macros_summary",
            "ingredients", "instructions",
            "diet_types", "meal_types", "allergens", "tags",
            "image_url", "video_url",
            "is_system", "is_active", "is_featured",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "total_time_minutes", "macros_summary", "created_at", "updated_at"]


class RecipeMinimalSerializer(serializers.ModelSerializer):
    """Serializer minimal para listas"""
    class Meta:
        model = Recipe
        fields = ["id", "name", "category", "calories", "prep_time_minutes", "difficulty"]


class PlanMealSerializer(serializers.ModelSerializer):
    """Serializer para comidas en un plan"""
    suggested_recipes = RecipeMinimalSerializer(many=True, read_only=True)
    
    class Meta:
        model = PlanMeal
        fields = [
            "id", "name", "meal_type", "time",
            "calories", "protein", "carbs", "fat",
            "suggested_recipes", "description", "order_index"
        ]


class NutritionPlanSerializer(serializers.ModelSerializer):
    """Serializer para planes de nutrición"""
    meals = PlanMealSerializer(many=True, read_only=True)
    macro_percentages = serializers.DictField(read_only=True)
    
    class Meta:
        model = NutritionPlan
        fields = [
            "id", "name", "description",
            "daily_calories", "protein_grams", "carbs_grams", "fat_grams", "fiber_grams",
            "macro_percentages",
            "goal", "diet_type", "meals_per_day", "duration_weeks",
            "is_template", "is_system", "is_active",
            "start_date", "end_date",
            "tags", "image_url",
            "meals",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "macro_percentages", "created_at", "updated_at"]


class NutritionPlanMinimalSerializer(serializers.ModelSerializer):
    """Serializer minimal para listas"""
    class Meta:
        model = NutritionPlan
        fields = ["id", "name", "daily_calories", "goal", "diet_type", "is_system"]


class MealLogSerializer(serializers.ModelSerializer):
    """Serializer para logs de comidas"""
    recipe_name = serializers.CharField(source='recipe.name', read_only=True, allow_null=True)
    
    class Meta:
        model = MealLog
        fields = [
            "id", "user", "date", "meal_type", "time",
            "recipe", "recipe_name", "custom_description",
            "calories", "protein", "carbs", "fat", "servings",
            "completed", "rating", "notes", "photo",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "user", "recipe_name", "created_at", "updated_at"]


class FoodSerializer(serializers.ModelSerializer):
    """Serializer para alimentos"""
    class Meta:
        model = Food
        fields = '__all__'
