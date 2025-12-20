# nutrition/views.py
# Views para la nueva estructura simplificada

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models

from .models import Recipe, NutritionPlan, PlanMeal, MealLog, Food
from .serializers import (
    RecipeSerializer, RecipeMinimalSerializer,
    NutritionPlanSerializer, NutritionPlanMinimalSerializer,
    PlanMealSerializer, MealLogSerializer, FoodSerializer
)
from .services import PersonalizedNutritionService
from django.shortcuts import get_object_or_404


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_plan(request):
    """
    Obtener el plan de nutrición actual del usuario.
    Devuelve el plan más reciente asignado al usuario o null si no tiene ninguno.
    """
    plan = NutritionPlan.objects.filter(
        user=request.user,
        is_active=True
    ).prefetch_related('meals__suggested_recipes').order_by('-created_at').first()
    
    if plan:
        serializer = NutritionPlanSerializer(plan)
        return Response({'plan': serializer.data})
    
    # Si no tiene plan, devolver null (no es un error)
    return Response({'plan': None})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def plan_meals_for_selection(request):
    """
    Obtener comidas disponibles para selección.
    Devuelve las comidas del plan actual del usuario organizadas por tipo con recetas sugeridas.
    Las cantidades se personalizan según el perfil del usuario (peso, altura, objetivo, etc.)
    """
    user = request.user
    service = PersonalizedNutritionService(user)
    
    # Calcular calorías y macros diarios personalizados
    daily_calories = service.calculate_daily_calories()
    daily_macros = service.calculate_macros(daily_calories)
    
    # Distribución de calorías por comida (porcentajes del total diario)
    meal_calorie_distribution = {
        'breakfast': 0.25,      # 25% del día
        'morning_snack': 0.10,  # 10% del día
        'lunch': 0.35,          # 35% del día
        'afternoon_snack': 0.10, # 10% del día
        'dinner': 0.25,          # 25% del día
        'evening_snack': 0.10,   # 10% del día
        'snack': 0.15            # 15% del día (genérico)
    }
    
    # Función helper para personalizar una receta
    def personalize_recipe(recipe, meal_type, meal_base=None):
        """Personaliza una receta según el perfil del usuario"""
        # Calcular porcentaje de calorías para este tipo de comida
        meal_percentage = meal_calorie_distribution.get(meal_type, 0.25)
        target_calories = daily_calories * meal_percentage
        
        # Calcular factor de escala basado en calorías objetivo vs receta base (convertir Decimal a float)
        recipe_calories_float = float(recipe.calories) if recipe.calories else None
        if recipe_calories_float and recipe_calories_float > 0:
            scale_factor = target_calories / recipe_calories_float
        elif meal_base and meal_base.calories:
            scale_factor = target_calories / float(meal_base.calories)
        else:
            scale_factor = 1.0
        
        # Ajustar según objetivo del usuario
        if user.main_goal == 'lose_weight':
            scale_factor *= 0.9  # Reducir un 10% para déficit
        elif user.main_goal == 'gain_muscle':
            scale_factor *= 1.1  # Aumentar un 10% para superávit
        
        # Limitar el factor de escala a un rango razonable (0.5x a 2x)
        scale_factor = max(0.5, min(2.0, scale_factor))
        
        # Calcular macros personalizados (convertir Decimal a float antes de multiplicar)
        recipe_calories = float(recipe.calories) if recipe.calories else None
        recipe_protein = float(recipe.protein) if recipe.protein else None
        recipe_carbs = float(recipe.carbs) if recipe.carbs else None
        recipe_fat = float(recipe.fat) if recipe.fat else None
        
        personalized_calories = int(recipe_calories * scale_factor) if recipe_calories else (int(float(meal_base.calories) * scale_factor) if meal_base and meal_base.calories else int(target_calories))
        personalized_protein = float(recipe_protein * scale_factor) if recipe_protein else (float(meal_base.protein * scale_factor) if meal_base and meal_base.protein else float(daily_macros['protein'] * meal_percentage))
        personalized_carbs = float(recipe_carbs * scale_factor) if recipe_carbs else (float(meal_base.carbs * scale_factor) if meal_base and meal_base.carbs else float(daily_macros['carbs'] * meal_percentage))
        personalized_fat = float(recipe_fat * scale_factor) if recipe_fat else (float(meal_base.fat * scale_factor) if meal_base and meal_base.fat else float(daily_macros['fat'] * meal_percentage))
        
        return {
            'calories': personalized_calories,
            'protein': round(personalized_protein, 1),
            'carbs': round(personalized_carbs, 1),
            'fat': round(personalized_fat, 1),
            'scale_factor': round(scale_factor, 2)
        }
    
    # Función helper para personalizar una comida sin receta
    def personalize_meal(meal, meal_type):
        """Personaliza una comida genérica según el perfil del usuario"""
        meal_percentage = meal_calorie_distribution.get(meal_type, 0.25)
        target_calories = daily_calories * meal_percentage
        
        # Calcular factor de escala (convertir Decimal a float)
        meal_calories_float = float(meal.calories) if meal.calories else None
        if meal_calories_float and meal_calories_float > 0:
            scale_factor = target_calories / meal_calories_float
        else:
            scale_factor = 1.0
        
        # Ajustar según objetivo
        if user.main_goal == 'lose_weight':
            scale_factor *= 0.9
        elif user.main_goal == 'gain_muscle':
            scale_factor *= 1.1
        
        scale_factor = max(0.5, min(2.0, scale_factor))
        
        # Convertir Decimal a float antes de multiplicar
        meal_calories_float = float(meal.calories) if meal.calories else None
        meal_protein_float = float(meal.protein) if meal.protein else None
        meal_carbs_float = float(meal.carbs) if meal.carbs else None
        meal_fat_float = float(meal.fat) if meal.fat else None
        
        return {
            'calories': int(meal_calories_float * scale_factor) if meal_calories_float else int(target_calories),
            'protein': round(float(meal_protein_float * scale_factor), 1) if meal_protein_float else round(float(daily_macros['protein'] * meal_percentage), 1),
            'carbs': round(float(meal_carbs_float * scale_factor), 1) if meal_carbs_float else round(float(daily_macros['carbs'] * meal_percentage), 1),
            'fat': round(float(meal_fat_float * scale_factor), 1) if meal_fat_float else round(float(daily_macros['fat'] * meal_percentage), 1),
            'scale_factor': round(scale_factor, 2)
        }
    
    # Primero intentar obtener comidas del plan actual del usuario
    user_plan = NutritionPlan.objects.filter(
        user=user,
        is_active=True
    ).prefetch_related('meals__suggested_recipes').first()
    
    meals_by_type = {}
    
    if user_plan:
        meals = user_plan.meals.all()
        for meal in meals:
            meal_type = meal.meal_type
            if meal_type not in meals_by_type:
                meals_by_type[meal_type] = []
            
            # Crear opciones basadas en la comida y sus recetas sugeridas
            meal_options = []
            
            # Si hay recetas sugeridas, crear una opción por cada receta (máximo 3)
            if meal.suggested_recipes.exists():
                for recipe in meal.suggested_recipes.all()[:3]:
                    personalized = personalize_recipe(recipe, meal_type, meal)
                    meal_options.append({
                        'id': f"meal-{meal.id}-recipe-{recipe.id}",
                        'name': recipe.name,
                        'calories': personalized['calories'],
                        'protein': personalized['protein'],
                        'carbs': personalized['carbs'],
                        'fat': personalized['fat'],
                        'category': 'balanced',
                        'icon': '🍽️',
                        'description': recipe.description or meal.description,
                        'cookTime': f"{recipe.prep_time_minutes + recipe.cook_time_minutes} min",
                        'recipeId': recipe.id
                    })
            else:
                # Si no hay recetas, crear una opción genérica basada en la comida
                personalized = personalize_meal(meal, meal_type)
                meal_options.append({
                    'id': f"meal-{meal.id}",
                    'name': meal.name,
                    'calories': personalized['calories'],
                    'protein': personalized['protein'],
                    'carbs': personalized['carbs'],
                    'fat': personalized['fat'],
                    'category': 'balanced',
                    'icon': '🍽️',
                    'description': meal.description,
                    'cookTime': '15 min'
                })
            
            meals_by_type[meal_type].extend(meal_options)
        
        return Response({
            'meals_by_type': meals_by_type,
            'plan_name': user_plan.name,
            'source': 'user_plan',
            'daily_calories_target': daily_calories,
            'daily_macros': daily_macros
        })
    
    # Si no tiene plan, devolver comidas de plantillas del sistema
    system_plans = NutritionPlan.objects.filter(
        is_system=True,
        is_active=True
    ).prefetch_related('meals__suggested_recipes')[:3]
    
    for plan in system_plans:
        for meal in plan.meals.all():
            meal_type = meal.meal_type
            if meal_type not in meals_by_type:
                meals_by_type[meal_type] = []
            
            # Crear opciones basadas en la comida y sus recetas sugeridas (máximo 3)
            if meal.suggested_recipes.exists():
                for recipe in meal.suggested_recipes.all()[:3]:
                    personalized = personalize_recipe(recipe, meal_type, meal)
                    meals_by_type[meal_type].append({
                        'id': f"meal-{meal.id}-recipe-{recipe.id}",
                        'name': recipe.name,
                        'calories': personalized['calories'],
                        'protein': personalized['protein'],
                        'carbs': personalized['carbs'],
                        'fat': personalized['fat'],
                        'category': 'balanced',
                        'icon': '🍽️',
                        'description': recipe.description or meal.description,
                        'cookTime': f"{recipe.prep_time_minutes + recipe.cook_time_minutes} min",
                        'recipeId': recipe.id
                    })
            else:
                personalized = personalize_meal(meal, meal_type)
                meals_by_type[meal_type].append({
                    'id': f"meal-{meal.id}",
                    'name': meal.name,
                    'calories': personalized['calories'],
                    'protein': personalized['protein'],
                    'carbs': personalized['carbs'],
                    'fat': personalized['fat'],
                    'category': 'balanced',
                    'icon': '🍽️',
                    'description': meal.description,
                    'cookTime': '15 min'
                })
    
    return Response({
        'meals_by_type': meals_by_type,
        'plan_name': None,
        'source': 'system_templates',
        'daily_calories_target': daily_calories,
        'daily_macros': daily_macros
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def daily_meal_selections_today(request):
    """
    Obtener las selecciones de comidas de hoy.
    GET /api/nutrition/daily-meal-selections/today/
    """
    from django.utils import timezone
    date = timezone.localdate()
    user = request.user
    
    # Obtener los logs de comidas del día
    meal_logs = MealLog.objects.filter(user=user, date=date)
    serializer = MealLogSerializer(meal_logs, many=True)
    
    # También obtener las comidas del plan si existe
    user_plan = NutritionPlan.objects.filter(
        user=user, is_active=True
    ).prefetch_related('meals__suggested_recipes').first()
    
    plan_meals = []
    if user_plan:
        plan_meals = PlanMealSerializer(user_plan.meals.all(), many=True).data
    
    return Response({
        'date': date.isoformat(),
        'selections': serializer.data,
        'plan_meals': plan_meals,
        'has_plan': user_plan is not None
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def daily_meal_selections(request):
    """
    Obtener o crear selecciones de comidas para un día específico.
    GET: Obtener las selecciones de comidas del día
    POST: Guardar/actualizar las selecciones de comidas del día
    """
    from django.utils import timezone
    
    date_str = request.query_params.get('date') or request.data.get('date')
    if date_str:
        try:
            from datetime import datetime
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            date = timezone.localdate()
    else:
        date = timezone.localdate()
    
    user = request.user
    
    if request.method == 'GET':
        # Obtener los logs de comidas del día
        meal_logs = MealLog.objects.filter(user=user, date=date)
        serializer = MealLogSerializer(meal_logs, many=True)
        
        # También obtener las comidas del plan si existe
        user_plan = NutritionPlan.objects.filter(
            user=user, is_active=True
        ).prefetch_related('meals__suggested_recipes').first()
        
        plan_meals = []
        if user_plan:
            plan_meals = PlanMealSerializer(user_plan.meals.all(), many=True).data
        
        return Response({
            'date': date.isoformat(),
            'selections': serializer.data,
            'plan_meals': plan_meals,
            'has_plan': user_plan is not None
        })
    
    elif request.method == 'POST':
        # Guardar selección de comida
        data = request.data
        meal_type = data.get('meal_type')
        recipe_id = data.get('recipe_id')
        
        if not meal_type:
            return Response({'error': 'meal_type es requerido'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Crear o actualizar el log de comida
        meal_log, created = MealLog.objects.update_or_create(
            user=user,
            date=date,
            meal_type=meal_type,
            defaults={
                'recipe_id': recipe_id,
                'completed': True,
                'calories': data.get('calories', 0),
                'protein': data.get('protein', 0),
                'carbs': data.get('carbs', 0),
                'fat': data.get('fat', 0),
            }
        )
        
        serializer = MealLogSerializer(meal_log)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class RecipeViewSet(viewsets.ModelViewSet):
    """ViewSet para recetas"""
    queryset = Recipe.objects.filter(is_active=True)
    serializer_class = RecipeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'ingredients']
    filterset_fields = ['category', 'difficulty', 'is_system', 'is_featured']
    ordering_fields = ['name', 'calories', 'prep_time_minutes', 'created_at']
    ordering = ['name']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return RecipeMinimalSerializer
        return RecipeSerializer
    
    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Lista de categorías"""
        return Response([
            {'value': 'breakfast', 'label': 'Desayuno'},
            {'value': 'lunch', 'label': 'Almuerzo'},
            {'value': 'dinner', 'label': 'Cena'},
            {'value': 'snack', 'label': 'Snack'},
            {'value': 'dessert', 'label': 'Postre'},
            {'value': 'drink', 'label': 'Bebida'},
        ])
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Recetas destacadas"""
        recipes = Recipe.objects.filter(is_featured=True, is_active=True)[:10]
        return Response(RecipeMinimalSerializer(recipes, many=True).data)
    
    @action(detail=True, methods=['get'])
    def personalized(self, request, pk=None):
        """
        Obtiene cantidades personalizadas de una receta según el perfil del usuario.
        GET /api/nutrition/recipes/{id}/personalized/?meal_type=breakfast
        """
        recipe = get_object_or_404(Recipe, pk=pk, is_active=True)
        meal_type = request.query_params.get('meal_type', 'lunch')
        
        # Validar meal_type
        valid_meal_types = ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'evening_snack', 'snack']
        if meal_type not in valid_meal_types:
            meal_type = 'lunch'
        
        # Calcular cantidades personalizadas
        service = PersonalizedNutritionService(request.user)
        personalized = service.calculate_personalized_recipe_quantities(recipe, meal_type)
        
        # Serializar la receta
        recipe_data = RecipeSerializer(recipe).data
        
        return Response({
            'recipe': recipe_data,
            'personalized_quantities': personalized,
            'user_profile': {
                'weight': request.user.weight,
                'height': request.user.height,
                'age': request.user.age,
                'gender': request.user.gender,
                'main_goal': request.user.main_goal,
                'activity_level': request.user.activity_level,
                'daily_calories_target': service.calculate_daily_calories()
            }
        })


class NutritionPlanViewSet(viewsets.ModelViewSet):
    """ViewSet para planes de nutrición"""
    serializer_class = NutritionPlanSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    filterset_fields = ['goal', 'diet_type', 'is_system', 'is_template', 'is_active']
    ordering_fields = ['name', 'daily_calories', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        user = self.request.user
        return NutritionPlan.objects.filter(
            is_active=True
        ).filter(
            models.Q(is_system=True) | models.Q(user=user)
        ).prefetch_related('meals__suggested_recipes')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return NutritionPlanMinimalSerializer
        return NutritionPlanSerializer
    
    @action(detail=False, methods=['get'])
    def my_plans(self, request):
        """Planes del usuario"""
        plans = NutritionPlan.objects.filter(user=request.user, is_active=True)
        return Response(NutritionPlanMinimalSerializer(plans, many=True).data)
    
    @action(detail=False, methods=['get'])
    def templates(self, request):
        """Plantillas disponibles"""
        templates = NutritionPlan.objects.filter(is_template=True, is_active=True)
        return Response(NutritionPlanMinimalSerializer(templates, many=True).data)


class MealLogViewSet(viewsets.ModelViewSet):
    """ViewSet para logs de comidas"""
    serializer_class = MealLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['date', 'meal_type', 'completed']
    ordering_fields = ['date', 'time', 'created_at']
    ordering = ['-date', '-time']
    
    def get_queryset(self):
        return MealLog.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Logs de hoy"""
        from django.utils import timezone
        today = timezone.localdate()
        logs = MealLog.objects.filter(user=request.user, date=today)
        return Response(MealLogSerializer(logs, many=True).data)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Resumen nutricional de hoy"""
        from django.utils import timezone
        from django.db.models import Sum
        
        today = timezone.localdate()
        totals = MealLog.objects.filter(
            user=request.user, date=today
        ).aggregate(
            total_calories=Sum('calories'),
            total_protein=Sum('protein'),
            total_carbs=Sum('carbs'),
            total_fat=Sum('fat')
        )
        return Response({
            'date': today,
            'calories': totals['total_calories'] or 0,
            'protein': float(totals['total_protein'] or 0),
            'carbs': float(totals['total_carbs'] or 0),
            'fat': float(totals['total_fat'] or 0),
        })


class FoodViewSet(viewsets.ModelViewSet):
    """ViewSet para alimentos"""
    queryset = Food.objects.all()
    serializer_class = FoodSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'brand']


@api_view(['GET', 'POST', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def default_plan_configurations(request):
    """
    Configuraciones de planes por defecto.
    Este endpoint gestiona las configuraciones que determinan qué planes
    de nutrición y entrenamiento se asignan por defecto según el perfil del usuario.
    """
    if request.method == 'GET':
        # Devolver configuraciones vacías por ahora
        # En el futuro esto puede expandirse para gestionar configuraciones reales
        return Response({
            'results': [],
            'count': 0,
            'page': 1,
            'page_size': 50,
            'total_pages': 0,
        })
    
    elif request.method == 'POST':
        # Crear nueva configuración (placeholder)
        return Response({
            'message': 'Configuración creada',
            'id': None
        }, status=status.HTTP_201_CREATED)
    
    elif request.method == 'PUT':
        # Actualizar configuración (placeholder)
        return Response({'message': 'Configuración actualizada'})
    
    elif request.method == 'DELETE':
        # Eliminar configuración (placeholder)
        return Response({'message': 'Configuración eliminada'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_recipes(request):
    """
    Lista todas las recetas disponibles.
    GET /api/nutrition/recipes/
    
    Parámetros de consulta:
    - search: Buscar por nombre, descripción o ingredientes
    - category: Filtrar por categoría
    - difficulty: Filtrar por dificultad
    - meal_type: Filtrar por tipo de comida
    - page: Número de página (default: 1)
    - page_size: Tamaño de página (default: 100)
    """
    queryset = Recipe.objects.filter(is_active=True)
    
    # Búsqueda
    search_query = request.query_params.get('search', '')
    if search_query:
        queryset = queryset.filter(
            models.Q(name__icontains=search_query) |
            models.Q(description__icontains=search_query) |
            models.Q(ingredients__icontains=search_query)
        )
    
    # Filtros
    category = request.query_params.get('category')
    if category:
        queryset = queryset.filter(category=category)
    
    difficulty = request.query_params.get('difficulty')
    if difficulty:
        queryset = queryset.filter(difficulty=difficulty)
    
    meal_type = request.query_params.get('meal_type')
    if meal_type:
        queryset = queryset.filter(meal_types__contains=[meal_type])
    
    # Ordenamiento
    ordering = request.query_params.get('ordering', 'name')
    if ordering.lstrip('-') in ['name', 'calories', 'prep_time_minutes', 'created_at']:
        queryset = queryset.order_by(ordering)
    else:
        queryset = queryset.order_by('name')
    
    # Paginación
    page = int(request.query_params.get('page', 1))
    page_size = int(request.query_params.get('page_size', 100))
    
    total = queryset.count()
    start = (page - 1) * page_size
    end = start + page_size
    
    recipes_list = queryset[start:end]
    
    # Serializar
    serializer = RecipeMinimalSerializer(recipes_list, many=True)
    
    return Response({
        'results': serializer.data,
        'count': total,
        'page': page,
        'page_size': page_size,
        'total_pages': (total + page_size - 1) // page_size if total > 0 else 0,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def default_nutrition_plans(request):
    """
    Planes de nutrición predeterminados/plantillas.
    Devuelve planes que pueden ser usados como plantillas.
    """
    # Buscar planes que son plantillas (is_template=True) o del sistema (user=None)
    plans = NutritionPlan.objects.filter(
        models.Q(is_template=True) | models.Q(user__isnull=True)
    ).distinct().prefetch_related('meals__suggested_recipes')
    
    # Paginación
    page = int(request.query_params.get('page', 1))
    page_size = int(request.query_params.get('page_size', 100))
    
    total = plans.count()
    start = (page - 1) * page_size
    end = start + page_size
    
    plans_list = plans[start:end]
    
    results = []
    for plan in plans_list:
        results.append({
            'id': str(plan.id),
            'name': plan.name,
            'description': plan.description,
            'goal': plan.goal,
            'daily_calories': plan.daily_calories,
            'is_active': plan.is_active,
            'is_template': plan.is_template,
            'meals_count': plan.meals.count(),
            'created_at': plan.created_at.isoformat() if plan.created_at else None,
        })
    
    return Response({
        'results': results,
        'count': total,
        'page': page,
        'page_size': page_size,
        'total_pages': (total + page_size - 1) // page_size if total > 0 else 0,
    })
