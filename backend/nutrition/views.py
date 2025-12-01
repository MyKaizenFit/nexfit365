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
    Devuelve las comidas del plan actual del usuario o las comidas de plantillas del sistema.
    """
    user = request.user
    
    # Primero intentar obtener comidas del plan actual del usuario
    user_plan = NutritionPlan.objects.filter(
        user=user,
        is_active=True
    ).prefetch_related('meals__suggested_recipes').first()
    
    if user_plan:
        meals = user_plan.meals.all()
        serializer = PlanMealSerializer(meals, many=True)
        return Response({
            'meals': serializer.data,
            'plan_name': user_plan.name,
            'source': 'user_plan'
        })
    
    # Si no tiene plan, devolver comidas de plantillas del sistema
    system_plans = NutritionPlan.objects.filter(
        is_system=True,
        is_active=True
    ).prefetch_related('meals__suggested_recipes')[:3]
    
    all_meals = []
    for plan in system_plans:
        for meal in plan.meals.all():
            meal_data = PlanMealSerializer(meal).data
            meal_data['plan_name'] = plan.name
            all_meals.append(meal_data)
    
    return Response({
        'meals': all_meals,
        'plan_name': None,
        'source': 'system_templates'
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
