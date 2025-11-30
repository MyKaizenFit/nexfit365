# nutrition/views.py
# Views para la nueva estructura simplificada

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
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
