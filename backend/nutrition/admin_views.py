# nutrition/admin_views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser

from .models import Recipe, NutritionPlan, PlanMeal, Food
from .admin_serializers import (
    AdminRecipeSerializer, AdminNutritionPlanSerializer,
    AdminPlanMealSerializer, AdminFoodSerializer
)


class AdminRecipeViewSet(viewsets.ModelViewSet):
    queryset = Recipe.objects.all()
    serializer_class = AdminRecipeSerializer
    permission_classes = [IsAdminUser]


class AdminNutritionPlanViewSet(viewsets.ModelViewSet):
    queryset = NutritionPlan.objects.all().prefetch_related('meals')
    serializer_class = AdminNutritionPlanSerializer
    permission_classes = [IsAdminUser]


class AdminPlanMealViewSet(viewsets.ModelViewSet):
    queryset = PlanMeal.objects.all()
    serializer_class = AdminPlanMealSerializer
    permission_classes = [IsAdminUser]


class AdminFoodViewSet(viewsets.ModelViewSet):
    queryset = Food.objects.all()
    serializer_class = AdminFoodSerializer
    permission_classes = [IsAdminUser]
