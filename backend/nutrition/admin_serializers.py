# nutrition/admin_serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Recipe, NutritionPlan, PlanMeal, Food, PlanMealRecipe, RecipeIngredient, EquivalenceCategory
from .serializers import RecipeIngredientSerializer, FoodMinimalSerializer

User = get_user_model()


class AdminUserLiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email']


class EquivalenceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = EquivalenceCategory
        fields = ['id', 'slug', 'name', 'description', 'color', 'icon', 'is_system', 'order', 'created_at']
        read_only_fields = ['id', 'created_at', 'is_system']


class AdminRecipeIngredientSerializer(serializers.ModelSerializer):
    """Serializer writable para ingredientes de recetas en el admin"""
    food = FoodMinimalSerializer(read_only=True)
    calculated_macros = serializers.DictField(read_only=True)
    food_id = serializers.PrimaryKeyRelatedField(
        queryset=Food.objects.all(),
        source='food',
        write_only=True,
        required=True
    )

    class Meta:
        model = RecipeIngredient
        fields = [
            'id', 'food_id', 'food',
            'quantity', 'unit', 'notes', 'order',
            'calculated_macros'
        ]
        read_only_fields = ['id', 'calculated_macros', 'food']


class AdminRecipeSerializer(serializers.ModelSerializer):
    recipe_ingredients = AdminRecipeIngredientSerializer(many=True, required=False)

    class Meta:
        model = Recipe
        fields = '__all__'

    def create(self, validated_data):
        ingredients_data = validated_data.pop('recipe_ingredients', [])
        recipe = Recipe.objects.create(**validated_data)
        
        for ingredient_data in ingredients_data:
            RecipeIngredient.objects.create(recipe=recipe, **ingredient_data)
        
        return recipe

    def update(self, instance, validated_data):
        ingredients_data = validated_data.pop('recipe_ingredients', None)
        
        # Actualizar campos de la receta
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Actualizar ingredientes si se proporcionan
        if ingredients_data is not None:
            instance.recipe_ingredients.all().delete()
            for ingredient_data in ingredients_data:
                RecipeIngredient.objects.create(recipe=instance, **ingredient_data)
        
        return instance


class RecipeMinimalForMealSerializer(serializers.ModelSerializer):
    """Serializer minimal de recetas para mostrar en comidas"""
    class Meta:
        model = Recipe
        fields = [
            'id', 'name', 'category', 
            'calories', 'protein', 'carbs', 'fat',
            'prep_time_minutes', 'difficulty', 'image', 'image_url'
        ]


class PlanMealRecipeSerializer(serializers.ModelSerializer):
    """Serializer para recetas sugeridas con cantidades personalizadas"""
    recipe = RecipeMinimalForMealSerializer(read_only=True)
    recipe_id = serializers.PrimaryKeyRelatedField(
        queryset=Recipe.objects.all(),
        source='recipe',
        write_only=True
    )
    meal_id = serializers.PrimaryKeyRelatedField(
        queryset=PlanMeal.objects.all(),
        source='meal',
        write_only=True
    )
    
    class Meta:
        model = PlanMealRecipe
        fields = [
            'id', 'meal_id', 'recipe', 'recipe_id', 'servings',
            'custom_calories', 'custom_protein', 'custom_carbs', 'custom_fat',
            'display_order'
        ]


class AdminPlanMealSerializer(serializers.ModelSerializer):
    """Serializer de comidas con recetas detalladas y cantidades personalizadas"""
    suggested_recipes = RecipeMinimalForMealSerializer(many=True, read_only=True)
    meal_recipes = serializers.SerializerMethodField()
    plan_id = serializers.PrimaryKeyRelatedField(
        queryset=NutritionPlan.objects.all(),
        source='plan',
        write_only=True,
        required=False
    )
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
            'id', 'plan_id', 'day_of_week', 'name', 'meal_type', 'time',
            'calories', 'protein', 'carbs', 'fat',
            'description', 'order_index', 'suggested_recipes', 'suggested_recipes_ids', 'meal_recipes'
        ]
    
    def get_meal_recipes(self, obj) -> list:
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
    assigned_users = AdminUserLiteSerializer(many=True, read_only=True)
    assigned_user_ids = serializers.SerializerMethodField()
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='user',
        write_only=True,
        required=False,
        allow_null=True
    )
    user_email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = NutritionPlan
        fields = [
            'id', 'name', 'description',
            'daily_calories', 'protein_grams', 'carbs_grams', 'fat_grams', 'fiber_grams',
            'protein_percentage', 'carbs_percentage', 'fat_percentage',
            'goal', 'diet_type', 'meals_per_day', 'duration_weeks',
            'portion_multiplier', 'is_template', 'is_system', 'is_active',
            'user_id', 'user_email', 'assigned_users', 'assigned_user_ids',
            'start_date', 'end_date', 'tags', 'image_url',
            'meals', 'created_at', 'updated_at'
        ]
    
    def get_protein_percentage(self, obj) -> float:
        if obj.daily_calories and obj.protein_grams:
            return round((obj.protein_grams * 4) / obj.daily_calories * 100, 1)
        return 30  # valor por defecto
    
    def get_carbs_percentage(self, obj) -> float:
        if obj.daily_calories and obj.carbs_grams:
            return round((obj.carbs_grams * 4) / obj.daily_calories * 100, 1)
        return 40  # valor por defecto
    
    def get_fat_percentage(self, obj) -> float:
        if obj.daily_calories and obj.fat_grams:
            return round((obj.fat_grams * 9) / obj.daily_calories * 100, 1)
        return 30  # valor por defecto

    def get_assigned_user_ids(self, obj) -> list:
        return list(obj.assigned_users.values_list('id', flat=True))


class AdminNutritionPlanMinimalSerializer(serializers.ModelSerializer):
    """Serializer minimal para listados en admin (incluye información de usuario y conteos)"""
    protein_percentage = serializers.SerializerMethodField()
    carbs_percentage = serializers.SerializerMethodField()
    fat_percentage = serializers.SerializerMethodField()
    meals_count = serializers.SerializerMethodField()
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    assigned_users = AdminUserLiteSerializer(many=True, read_only=True)
    assigned_user_ids = serializers.SerializerMethodField()

    class Meta:
        model = NutritionPlan
        fields = [
            'id', 'name', 'description',
            'daily_calories',
            'protein_percentage', 'carbs_percentage', 'fat_percentage',
            'goal', 'diet_type', 'meals_per_day', 'duration_weeks',
            'portion_multiplier', 'is_template', 'is_system', 'is_active',
            'user_id', 'user_email', 'assigned_users', 'assigned_user_ids',
            'meals_count',
            'created_at', 'updated_at'
        ]

    def get_meals_count(self, obj) -> int:
        try:
            return obj.meals.count()
        except Exception:
            return 0

    def get_protein_percentage(self, obj) -> float:
        if obj.daily_calories and obj.protein_grams:
            return round((obj.protein_grams * 4) / obj.daily_calories * 100, 1)
        return 30

    def get_carbs_percentage(self, obj) -> float:
        if obj.daily_calories and obj.carbs_grams:
            return round((obj.carbs_grams * 4) / obj.daily_calories * 100, 1)
        return 40

    def get_fat_percentage(self, obj) -> float:
        if obj.daily_calories and obj.fat_grams:
            return round((obj.fat_grams * 9) / obj.daily_calories * 100, 1)
        return 30

    def get_assigned_user_ids(self, obj) -> list:
        return list(obj.assigned_users.values_list('id', flat=True))


class AdminFoodSerializer(serializers.ModelSerializer):
    class Meta:
        model = Food
        fields = '__all__'
