# nutrition/admin_serializers.py
from rest_framework import serializers
from .models import Recipe, NutritionPlan, PlanMeal, Food


class AdminRecipeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recipe
        fields = '__all__'


class AdminPlanMealSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanMeal
        fields = '__all__'


class AdminNutritionPlanSerializer(serializers.ModelSerializer):
    meals = AdminPlanMealSerializer(many=True, read_only=True)
    
    class Meta:
        model = NutritionPlan
        fields = '__all__'


class AdminFoodSerializer(serializers.ModelSerializer):
    class Meta:
        model = Food
        fields = '__all__'
