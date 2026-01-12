# nutrition/admin_serializers.py
from rest_framework import serializers
from .models import Recipe, NutritionPlan, PlanMeal, Food, PlanMealRecipe, PlanMealRecipe


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


class PlanMealRecipeSerializer(serializers.ModelSerializer):
    """Serializer para recetas sugeridas con cantidades personalizadas"""
    recipe = RecipeMinimalForMealSerializer(read_only=True)
    recipe_id = serializers.PrimaryKeyRelatedField(
        queryset=Recipe.objects.all(),
        source='recipe',
        write_only=True
    )
    
    class Meta:
        model = PlanMealRecipe
        fields = [
            'id', 'recipe', 'recipe_id', 'servings',
            'custom_calories', 'custom_protein', 'custom_carbs', 'custom_fat',
            'display_order'
        ]


class AdminPlanMealSerializer(serializers.ModelSerializer):
    """Serializer de comidas con recetas detalladas y cantidades personalizadas"""
    suggested_recipes = RecipeMinimalForMealSerializer(many=True, read_only=True)
    meal_recipes = serializers.SerializerMethodField()
    suggested_recipes_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Recipe.objects.all(),
        source='suggested_recipes',
        write_only=True,
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = PlanMeal
        fields = [
            'id', 'name', 'meal_type', 'time',
            'calories', 'protein', 'carbs', 'fat',
            'description', 'order_index', 'suggested_recipes', 'suggested_recipes_ids', 'meal_recipes'
        ]
    
    def get_meal_recipes(self, obj):
        """Obtener meal_recipes de forma segura"""
        try:
            # Intentar obtener meal_recipes si el modelo PlanMealRecipe existe
            from nutrition.models import PlanMealRecipe
            meal_recipes = PlanMealRecipe.objects.filter(meal=obj).select_related('recipe')
            return PlanMealRecipeSerializer(meal_recipes, many=True).data
        except Exception:
            # Si hay algún error (tabla no existe, etc.), retornar lista vacía
            return []


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
