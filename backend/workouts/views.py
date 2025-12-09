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
    def my_active_program(self, request):
        """Programa activo del usuario actual"""
        program = WorkoutProgram.objects.filter(
            user=request.user, is_active=True
        ).prefetch_related('days__exercises__exercise').order_by('-created_at').first()
        
        if program:
            serializer = WorkoutProgramSerializer(program)
            return Response({'program': serializer.data})
        return Response({'program': None})
    
    @action(detail=False, methods=['get'])
    def templates(self, request):
        """Plantillas disponibles"""
        templates = WorkoutProgram.objects.filter(
            is_template=True, is_active=True
        )
        serializer = WorkoutProgramMinimalSerializer(templates, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def available_templates(self, request):
        """Plantillas disponibles para asignar (alias de templates)"""
        templates = WorkoutProgram.objects.filter(
            is_template=True, is_active=True
        ).prefetch_related('days__exercises__exercise')
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
    
    def create(self, request, *args, **kwargs):
        """Sobrescribir create para manejar mejor los errores"""
        from django.utils import timezone
        from django.db import IntegrityError
        from rest_framework.exceptions import ValidationError
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Verificar si ya existe un log completado para este día y workout_day
        workout_day = serializer.validated_data.get('workout_day')
        date = serializer.validated_data.get('date', timezone.localdate())
        
        if workout_day:
            existing_log = WorkoutLog.objects.filter(
                user=request.user,
                workout_day=workout_day,
                date=date,
                completed=True
            ).first()
            
            if existing_log:
                return Response(
                    {'detail': 'Ya has completado este entrenamiento hoy. No puedes realizarlo de nuevo el mismo día.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        try:
            self.perform_create(serializer)
            # Asegurar que serializer.data sea serializable
            response_data = serializer.data
            headers = self.get_success_headers(response_data)
            return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)
        except IntegrityError as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f'IntegrityError al crear workout log: {str(e)}')
            return Response(
                {'detail': 'Ya existe un registro de entrenamiento para este día.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            import logging
            import traceback
            logger = logging.getLogger(__name__)
            logger.error(f'Error al crear workout log: {str(e)}')
            logger.error(f'Traceback: {traceback.format_exc()}')
            return Response(
                {'detail': f'Error al crear el log de entrenamiento: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def check_today(self, request):
        """Verificar si ya existe un log completado para un workout_day hoy"""
        from django.utils import timezone
        from django.shortcuts import get_object_or_404
        
        workout_day_id = request.query_params.get('workout_day')
        if not workout_day_id:
            return Response({'error': 'workout_day es requerido'}, status=400)
        
        try:
            workout_day = WorkoutDay.objects.get(id=workout_day_id)
        except WorkoutDay.DoesNotExist:
            return Response({'error': 'WorkoutDay no encontrado'}, status=404)
        
        today = timezone.localdate()
        existing_log = WorkoutLog.objects.filter(
            user=request.user,
            workout_day=workout_day,
            date=today,
            completed=True
        ).first()
        
        is_completed = existing_log is not None
        
        # Log para debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f'check_today - User: {request.user.email}, WorkoutDay: {workout_day.id}, Today: {today}, Completed: {is_completed}')
        
        return Response({
            'is_completed': is_completed,
            'workout_day_id': str(workout_day.id),
            'date': str(today),
            'log': WorkoutLogSerializer(existing_log).data if existing_log else None
        })
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Log de hoy"""
        from django.utils import timezone
        today = timezone.localdate()
        log = WorkoutLog.objects.filter(user=request.user, date=today).first()
        if log:
            return Response({'log': WorkoutLogSerializer(log).data})
        return Response({'log': None})
    
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
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Estadísticas reales de entrenamientos del usuario"""
        from django.utils import timezone
        from datetime import timedelta
        from django.db.models import Count, Sum, Avg, Q
        from django.db.models.functions import TruncWeek
        
        user = request.user
        today = timezone.localdate()
        
        # Calcular inicio de semana (lunes)
        week_start = today - timedelta(days=today.weekday())
        
        # Todos los logs del usuario
        all_logs = WorkoutLog.objects.filter(user=user)
        
        # Logs de esta semana
        week_logs = all_logs.filter(
            date__gte=week_start,
            date__lte=today
        )
        
        # Logs completados de esta semana
        completed_week_logs = week_logs.filter(completed=True)
        
        # Calcular estadísticas
        total_workouts = all_logs.count()
        completed_this_week = completed_week_logs.count()
        
        # Total de minutos esta semana (solo logs completados)
        total_minutes_week = completed_week_logs.aggregate(
            total=Sum('duration_minutes')
        )['total'] or 0
        
        # Total de minutos de todos los entrenamientos completados
        total_minutes_all = all_logs.filter(completed=True).aggregate(
            total=Sum('duration_minutes')
        )['total'] or 0
        
        # Duración promedio de entrenamientos completados
        avg_duration = all_logs.filter(
            completed=True,
            duration_minutes__isnull=False
        ).aggregate(
            avg=Avg('duration_minutes')
        )['avg']
        avg_duration = round(avg_duration) if avg_duration else 0
        
        # Calcular racha actual (días consecutivos con entrenamientos completados)
        current_streak = 0
        check_date = today
        while True:
            day_logs = all_logs.filter(date=check_date, completed=True)
            if day_logs.exists():
                current_streak += 1
                check_date -= timedelta(days=1)
            else:
                break
        
        # Calcular mejor racha (simplificado - busca la racha más larga en los últimos 90 días)
        longest_streak = 0
        streak_start = today - timedelta(days=90)
        recent_logs = all_logs.filter(
            date__gte=streak_start,
            completed=True
        ).order_by('date').values_list('date', flat=True).distinct()
        
        if recent_logs:
            current_streak_count = 0
            prev_date = None
            for log_date in recent_logs:
                if prev_date is None:
                    current_streak_count = 1
                elif (log_date - prev_date).days == 1:
                    current_streak_count += 1
                else:
                    longest_streak = max(longest_streak, current_streak_count)
                    current_streak_count = 1
                prev_date = log_date
            longest_streak = max(longest_streak, current_streak_count)
        
        # Objetivo semanal (puede venir del perfil del usuario o ser un valor por defecto)
        # Por ahora usamos 5 como valor por defecto
        weekly_goal = 5
        
        # Calcular progreso semanal
        progress_percentage = round((completed_this_week / weekly_goal * 100)) if weekly_goal > 0 else 0
        progress_percentage = min(progress_percentage, 100)
        
        return Response({
            'total_workouts': total_workouts,
            'completed_this_week': completed_this_week,
            'weekly_goal': weekly_goal,
            'total_minutes_week': total_minutes_week,
            'total_minutes_all': total_minutes_all,
            'average_duration': avg_duration,
            'current_streak': current_streak,
            'longest_streak': longest_streak,
            'progress_percentage': progress_percentage
        })


# Importar models para el Q en get_queryset
from django.db import models


class WorkoutPlanTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para plantillas de planes de entrenamiento (admin)
    Usado por el panel de administración
    """
    serializer_class = WorkoutProgramSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    filterset_fields = ['difficulty', 'goal', 'location', 'is_active']
    ordering_fields = ['name', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        # Devolver plantillas y programas del sistema
        return WorkoutProgram.objects.filter(
            models.Q(is_template=True) | models.Q(is_system=True)
        ).prefetch_related('days__exercises__exercise')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return WorkoutProgramMinimalSerializer
        return WorkoutProgramSerializer
    
    def list(self, request, *args, **kwargs):
        """Lista con paginación compatible con el frontend"""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Paginación manual compatible con el frontend
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 50))
        
        total = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        
        queryset = queryset[start:end]
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'results': serializer.data,
            'count': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
        })
