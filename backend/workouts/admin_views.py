# workouts/admin_views.py
# Views de admin simplificados

from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser

from .models import Exercise, WorkoutProgram, WorkoutDay
from .admin_serializers import (
    AdminExerciseSerializer,
    AdminWorkoutProgramSerializer,
    AdminWorkoutDaySerializer
)


class AdminExerciseViewSet(viewsets.ModelViewSet):
    """Admin ViewSet para ejercicios"""
    queryset = Exercise.objects.all()
    serializer_class = AdminExerciseSerializer
    permission_classes = [IsAdminUser]


class AdminWorkoutProgramViewSet(viewsets.ModelViewSet):
    """Admin ViewSet para programas"""
    queryset = WorkoutProgram.objects.all().prefetch_related('days__exercises')
    serializer_class = AdminWorkoutProgramSerializer
    permission_classes = [IsAdminUser]


class AdminWorkoutDayViewSet(viewsets.ModelViewSet):
    """Admin ViewSet para días"""
    queryset = WorkoutDay.objects.all()
    serializer_class = AdminWorkoutDaySerializer
    permission_classes = [IsAdminUser]
