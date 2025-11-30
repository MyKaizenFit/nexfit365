# workouts/views.py
# Views para la nueva estructura simplificada

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import (
    Exercise, WorkoutProgram, WorkoutDay, WorkoutDayExercise,
    WorkoutLog, WorkoutLogExercise, WorkoutLogSet
)
from .serializers import (
    ExerciseSerializer, ExerciseMinimalSerializer,
    WorkoutProgramSerializer, WorkoutProgramMinimalSerializer,
    WorkoutDaySerializer, WorkoutDayExerciseSerializer,
    WorkoutLogSerializer, WorkoutLogExerciseSerializer, WorkoutLogSetSerializer
)


class ExerciseViewSet(viewsets.ModelViewSet):
    """ViewSet para ejercicios"""
    queryset = Exercise.objects.filter(is_active=True)
    serializer_class = ExerciseSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'instructions']
    filterset_fields = ['category', 'difficulty', 'is_system']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ExerciseMinimalSerializer
        return ExerciseSerializer
    
    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Lista de categorías disponibles"""
        return Response([
            {'value': 'strength', 'label': 'Fuerza'},
            {'value': 'cardio', 'label': 'Cardio'},
            {'value': 'flexibility', 'label': 'Flexibilidad'},
            {'value': 'hiit', 'label': 'HIIT'},
            {'value': 'bodyweight', 'label': 'Peso corporal'},
            {'value': 'functional', 'label': 'Funcional'},
        ])
    
    @action(detail=False, methods=['get'])
    def muscle_groups(self, request):
        """Lista de grupos musculares"""
        return Response([
            'chest', 'back', 'shoulders', 'biceps', 'triceps',
            'forearms', 'core', 'abs', 'quadriceps', 'hamstrings',
            'glutes', 'calves', 'full_body'
        ])


class WorkoutProgramViewSet(viewsets.ModelViewSet):
    """ViewSet para programas de entrenamiento"""
    serializer_class = WorkoutProgramSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    filterset_fields = ['difficulty', 'goal', 'location', 'is_system', 'is_template', 'is_active']
    ordering_fields = ['name', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        user = self.request.user
        # Mostrar programas del sistema y los propios del usuario
        return WorkoutProgram.objects.filter(
            is_active=True
        ).filter(
            models.Q(is_system=True) | models.Q(user=user)
        ).prefetch_related('days__exercises__exercise')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return WorkoutProgramMinimalSerializer
        return WorkoutProgramSerializer
    
    @action(detail=False, methods=['get'])
    def my_programs(self, request):
        """Programas del usuario actual"""
        programs = WorkoutProgram.objects.filter(
            user=request.user, is_active=True
        )
        serializer = WorkoutProgramMinimalSerializer(programs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def templates(self, request):
        """Plantillas disponibles"""
        templates = WorkoutProgram.objects.filter(
            is_template=True, is_active=True
        )
        serializer = WorkoutProgramMinimalSerializer(templates, many=True)
        return Response(serializer.data)


class WorkoutDayViewSet(viewsets.ModelViewSet):
    """ViewSet para días de entrenamiento"""
    serializer_class = WorkoutDaySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        program_id = self.kwargs.get('program_pk')
        if program_id:
            return WorkoutDay.objects.filter(program_id=program_id)
        return WorkoutDay.objects.none()


class WorkoutLogViewSet(viewsets.ModelViewSet):
    """ViewSet para logs de entrenamiento"""
    serializer_class = WorkoutLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['date', 'completed']
    ordering_fields = ['date', 'created_at']
    ordering = ['-date']
    
    def get_queryset(self):
        return WorkoutLog.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Log de hoy"""
        from django.utils import timezone
        today = timezone.localdate()
        log = WorkoutLog.objects.filter(user=request.user, date=today).first()
        if log:
            return Response(WorkoutLogSerializer(log).data)
        return Response(None)
    
    @action(detail=False, methods=['get'])
    def week(self, request):
        """Logs de esta semana"""
        from django.utils import timezone
        from datetime import timedelta
        
        today = timezone.localdate()
        week_start = today - timedelta(days=today.weekday())
        
        logs = WorkoutLog.objects.filter(
            user=request.user,
            date__gte=week_start,
            date__lte=today
        )
        return Response(WorkoutLogSerializer(logs, many=True).data)


# Importar models para el Q en get_queryset
from django.db import models
