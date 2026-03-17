# nutrition/serializers.py
# Serializers para la nueva estructura simplificada

from rest_framework import serializers
from .models import Recipe, NutritionPlan, PlanMeal, MealLog, Food, NutritionPlanHistory, RecipeIngredient


class FoodMinimalSerializer(serializers.ModelSerializer):
    """Serializer minimal para alimentos en ingredientes"""
    class Meta:
        model = Food
        fields = ['id', 'name', 'brand', 'calories', 'protein', 'carbs', 'fat', 'category']


class RecipeIngredientSerializer(serializers.ModelSerializer):
    """Serializer para ingredientes de recetas"""
    food_detail = FoodMinimalSerializer(source='food', read_only=True)
    calculated_macros = serializers.DictField(read_only=True)
    food_id = serializers.UUIDField(write_only=True, required=False)
    
    class Meta:
        model = RecipeIngredient
        fields = [
            'id', 'recipe', 'food', 'food_id', 'food_detail',
            'quantity', 'unit', 'notes', 'order',
            'calculated_macros', 'created_at'
        ]
        read_only_fields = ['id', 'calculated_macros', 'created_at']
        extra_kwargs = {
            'food': {'required': False},
            'recipe': {'required': False}
        }
    
    def create(self, validated_data):
        food_id = validated_data.pop('food_id', None)
        if food_id:
            validated_data['food'] = Food.objects.get(id=food_id)
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        food_id = validated_data.pop('food_id', None)
        if food_id:
            validated_data['food'] = Food.objects.get(id=food_id)
        return super().update(instance, validated_data)


class RecipeSerializer(serializers.ModelSerializer):
    """Serializer para recetas"""
    total_time_minutes = serializers.IntegerField(read_only=True)
    macros_summary = serializers.DictField(read_only=True)
    recipe_ingredients = RecipeIngredientSerializer(many=True, read_only=True)
    ingredients_count = serializers.SerializerMethodField()
    adjusted_macros = serializers.SerializerMethodField()
    
    class Meta:
        model = Recipe
        fields = [
            "id", "name", "description", "category",
            "difficulty", "prep_time_minutes", "cook_time_minutes",
            "servings", "total_time_minutes",
            "calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium",
            "macros_summary", "adjusted_macros",
            "ingredients", "recipe_ingredients", "ingredients_count", "instructions",
            "diet_types", "meal_types", "allergens", "tags", "goal_category",
            "image", "image_url", "video_url",
            "is_system", "is_active", "is_featured",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "total_time_minutes", "macros_summary", "adjusted_macros", "recipe_ingredients", "ingredients_count", "created_at", "updated_at"]
    
    def get_ingredients_count(self, obj):
        return obj.recipe_ingredients.count()
    
    def get_adjusted_macros(self, obj):
        """
        Devuelve macros ajustados según el multiplicador del contexto.
        Se puede pasar 'portion_multiplier' en el contexto del serializer.
        """
        multiplier = self.context.get('portion_multiplier', 1.0)
        return obj.get_adjusted_macros(multiplier)


class RecipeMinimalSerializer(serializers.ModelSerializer):
    """Serializer minimal para listas"""
    class Meta:
        model = Recipe
        fields = [
            "id", "name", "category", "description",
            "calories", "protein", "carbs", "fat",
            "prep_time_minutes", "cook_time_minutes", "difficulty",
            "servings", "image", "image_url", "goal_category"
        ]


class PlanMealSerializer(serializers.ModelSerializer):
    """Serializer para comidas en un plan"""
    suggested_recipes = RecipeMinimalSerializer(many=True, read_only=True)
    
    class Meta:
        model = PlanMeal
        fields = [
            "id", "day_of_week", "name", "meal_type", "time",
            "calories", "protein", "carbs", "fat",
            "suggested_recipes", "description", "order_index"
        ]


class NutritionPlanSerializer(serializers.ModelSerializer):
    """Serializer para planes de nutrición"""
    meals = PlanMealSerializer(many=True, read_only=True)
    macro_percentages = serializers.DictField(read_only=True)
    recommended_multiplier = serializers.SerializerMethodField()
    
    class Meta:
        model = NutritionPlan
        fields = [
            "id", "name", "description",
            "daily_calories", "protein_grams", "carbs_grams", "fat_grams", "fiber_grams",
            "protein_percentage", "carbs_percentage", "fat_percentage",
            "macro_percentages",
            "goal", "diet_type", "meals_per_day", "duration_weeks",
            "portion_multiplier", "recommended_multiplier",
            "is_template", "is_system", "is_active",
            "start_date", "end_date",
            "tags", "image_url",
            "meals",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "macro_percentages", "recommended_multiplier", "created_at", "updated_at"]
    
    def get_recommended_multiplier(self, obj):
        """Retorna el multiplicador recomendado según el objetivo"""
        return obj.get_portion_multiplier_for_goal()
    
    def update(self, instance, validated_data):
        """
        Actualizar plan con validación reforzada: solo un plan activo por usuario.
        Si se marca is_active=True, desactiva automáticamente otros planes activos del usuario.
        """
        is_activating = validated_data.get('is_active', False)
        
        # Si se está activando este plan y pertenece a un usuario, desactivar otros
        if is_activating and instance.user:
            NutritionPlan.objects.filter(
                user=instance.user,
                is_active=True
            ).exclude(pk=instance.pk).update(is_active=False)
        
        return super().update(instance, validated_data)


class NutritionPlanMinimalSerializer(serializers.ModelSerializer):
    """Serializer minimal para listas - incluye campos necesarios para admin"""
    meals_count = serializers.SerializerMethodField()
    
    class Meta:
        model = NutritionPlan
        fields = [
            "id", "name", "description", "daily_calories", 
            "protein_grams", "carbs_grams", "fat_grams",
            "goal", "diet_type", "meals_per_day", "duration_weeks",
            "portion_multiplier",
            "is_system", "is_template", "is_active",
            "meals_count"
        ]
    
    def get_meals_count(self, obj):
        return obj.meals.count()


class MealLogSerializer(serializers.ModelSerializer):
    """Serializer para logs de comidas"""
    recipe_name = serializers.CharField(source='recipe.name', read_only=True, allow_null=True)
    recipe = serializers.SerializerMethodField()
    plan_meal_id = serializers.UUIDField(source='plan_meal.id', read_only=True, allow_null=True)
    plan_meal_meta = serializers.SerializerMethodField()
    meal = serializers.PrimaryKeyRelatedField(
        source='plan_meal',
        queryset=PlanMeal.objects.all(),
        required=False,
        write_only=True
    )
    
    class Meta:
        model = MealLog
        fields = [
            "id", "user", "date", "meal_type", "time",
            "plan_meal_id", "plan_meal_meta",
            "recipe", "recipe_name", "custom_description",
            "calories", "protein", "carbs", "fat", "servings",
            "completed", "rating", "notes", "photo", "meal",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "user", "recipe_name", "created_at", "updated_at"]
    
    def get_recipe(self, obj):
        """Incluir información completa de la receta si existe"""
        if obj.recipe:
            return {
                'id': str(obj.recipe.id),
                'name': obj.recipe.name,
                'calories': obj.recipe.calories,
                'protein': float(obj.recipe.protein),
                'carbs': float(obj.recipe.carbs),
                'fat': float(obj.recipe.fat),
                'description': obj.recipe.description or '',
                'prep_time_minutes': obj.recipe.prep_time_minutes or 0,
                'cook_time_minutes': obj.recipe.cook_time_minutes or 0,
            }
        return None

    def get_plan_meal_meta(self, obj):
        if not obj.plan_meal:
            return None
        pm = obj.plan_meal
        return {
            'id': str(pm.id),
            'name': pm.name,
            'meal_type': pm.meal_type,
            'time': pm.time.isoformat() if pm.time else None,
            'order_index': pm.order_index,
            'day_of_week': pm.day_of_week,
        }

    def validate(self, attrs):
        attrs = super().validate(attrs)

        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not getattr(user, 'is_authenticated', False):
            return attrs

        plan_meal = attrs.get('plan_meal', getattr(self.instance, 'plan_meal', None))
        date_value = attrs.get('date', getattr(self.instance, 'date', None))

        if plan_meal and date_value:
            queryset = MealLog.objects.filter(
                user=user,
                plan_meal=plan_meal,
                date=date_value,
            )
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)

            if queryset.exists():
                raise serializers.ValidationError({
                    'meal': 'Ya existe un log para esta comida en la fecha indicada.'
                })

        return attrs


class FoodSerializer(serializers.ModelSerializer):
    """Serializer para alimentos"""
    class Meta:
        model = Food
        fields = '__all__'


class NutritionPlanHistorySerializer(serializers.ModelSerializer):
    """Serializer para historial de cambios de planes nutricionales"""
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    changed_by_email = serializers.EmailField(source='changed_by.email', read_only=True)
    is_admin_change = serializers.SerializerMethodField()
    
    class Meta:
        model = NutritionPlanHistory
        fields = [
            'id', 'user', 'old_plan_name', 'new_plan_name',
            'changed_by', 'changed_by_email', 'reason', 'reason_display',
            'is_admin_change', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']
    
    def get_is_admin_change(self, obj):
        """Determina si el cambio fue hecho por un administrador"""
        if obj.changed_by:
            return obj.changed_by.is_staff or obj.changed_by.is_superuser
        return False
