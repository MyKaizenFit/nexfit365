# nutrition/admin_serializers.py
from rest_framework import serializers
from .models import Recipe, NutritionPlan, PlanMeal, Food


class AdminRecipeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recipe
        fields = '__all__'


class RecipeMinimalForMealSerializer(serializers.ModelSerializer):
    """Serializer minimal de recetas para mostrar en comidas"""
    class Meta:
        model = Recipe
        fields = [
            'id', 'name', 'category', 
            'calories', 'protein', 'carbs', 'fat',
            'prep_time_minutes', 'difficulty', 'image_url'
        ]


class AdminPlanMealSerializer(serializers.ModelSerializer):
    """Serializer de comidas con recetas detalladas"""
    suggested_recipes = RecipeMinimalForMealSerializer(many=True, read_only=True)
    
    class Meta:
        model = PlanMeal
        fields = [
            'id', 'name', 'meal_type', 'time',
            'calories', 'protein', 'carbs', 'fat',
            'description', 'order_index', 'suggested_recipes'
        ]


class AdminNutritionPlanSerializer(serializers.ModelSerializer):
    """Serializer completo de planes de nutrición"""
    meals = AdminPlanMealSerializer(many=True, read_only=True)
    protein_percentage = serializers.SerializerMethodField()
    carbs_percentage = serializers.SerializerMethodField()
    fat_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = NutritionPlan
        fields = [
            'id', 'name', 'description',
            'daily_calories', 'protein_grams', 'carbs_grams', 'fat_grams', 'fiber_grams',
            'protein_percentage', 'carbs_percentage', 'fat_percentage',
            'goal', 'diet_type', 'meals_per_day', 'duration_weeks',
            'is_template', 'is_system', 'is_active',
            'start_date', 'end_date', 'tags', 'image_url',
            'meals', 'created_at', 'updated_at'
        ]
    
    def get_protein_percentage(self, obj):
        if obj.daily_calories and obj.protein_grams:
            return round((obj.protein_grams * 4) / obj.daily_calories * 100, 1)
        return 30  # valor por defecto
    
    def get_carbs_percentage(self, obj):
        if obj.daily_calories and obj.carbs_grams:
            return round((obj.carbs_grams * 4) / obj.daily_calories * 100, 1)
        return 40  # valor por defecto
    
    def get_fat_percentage(self, obj):
        if obj.daily_calories and obj.fat_grams:
            return round((obj.fat_grams * 9) / obj.daily_calories * 100, 1)
        return 30  # valor por defecto


class AdminFoodSerializer(serializers.ModelSerializer):
    class Meta:
        model = Food
        fields = '__all__'
