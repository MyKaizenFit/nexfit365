# workouts/views.py
# Views para la nueva estructura simplificada

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from django.db import DatabaseError
import logging

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


logger = logging.getLogger(__name__)


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

    def get_queryset(self):
        return Exercise.objects.filter(is_active=True).prefetch_related(
            'substitutions__substitute'
        )
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ExerciseMinimalSerializer
        return ExerciseSerializer

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except DatabaseError as exc:
            logger.error("Fallback ExerciseViewSet.list por error de BD: %s", exc)
            try:
                fallback_qs = Exercise.objects.filter(is_active=True).order_by('name')[:100]
                serializer = ExerciseMinimalSerializer(fallback_qs, many=True)
                return Response(
                    {
                        'count': len(serializer.data),
                        'next': None,
                        'previous': None,
                        'results': serializer.data,
                        'fallback': True,
                    },
                    status=status.HTTP_200_OK,
                )
            except DatabaseError as fallback_exc:
                logger.error("Fallback ExerciseViewSet.list también falló: %s", fallback_exc)
                return Response(
                    {
                        'count': 0,
                        'next': None,
                        'previous': None,
                        'results': [],
                        'fallback': True,
                    },
                    status=status.HTTP_200_OK,
                )
    
    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Lista de categorías disponibles"""
        from .models import Exercise
        return Response([
            {'value': value, 'label': label}
            for value, label in Exercise.CATEGORY_CHOICES
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
        ).prefetch_related(
            'days__exercises__exercise',
            'days__exercises__exercise__substitutions__substitute',
        )
    
    def get_serializer_class(self):
        if self.action == 'list':
            return WorkoutProgramMinimalSerializer
        return WorkoutProgramSerializer

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except DatabaseError as exc:
            logger.error("Fallback WorkoutProgramViewSet.list por error de BD: %s", exc)
            try:
                fallback_qs = WorkoutProgram.objects.filter(is_active=True).filter(
                    models.Q(is_system=True) | models.Q(user=request.user)
                ).order_by('-created_at')[:100]
                serializer = WorkoutProgramMinimalSerializer(fallback_qs, many=True)
                return Response(
                    {
                        'count': len(serializer.data),
                        'next': None,
                        'previous': None,
                        'results': serializer.data,
                        'fallback': True,
                    },
                    status=status.HTTP_200_OK,
                )
            except DatabaseError as fallback_exc:
                logger.error("Fallback WorkoutProgramViewSet.list también falló: %s", fallback_exc)
                return Response(
                    {
                        'count': 0,
                        'next': None,
                        'previous': None,
                        'results': [],
                        'fallback': True,
                    },
                    status=status.HTTP_200_OK,
                )
    
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
        from .services import reset_weekly_workout_plan_if_needed

        try:
            program = WorkoutProgram.objects.filter(
                user=request.user, is_active=True
            ).prefetch_related(
                'days__exercises__exercise',
                'days__exercises__exercise__substitutions__substitute',
            ).order_by('-created_at').first()

            if program:
                # Inicializar start_date si falta, sin reinicios semanales automáticos.
                program = reset_weekly_workout_plan_if_needed(program)
                serializer = WorkoutProgramSerializer(program)
                return Response({'program': serializer.data})
            return Response({'program': None})
        except DatabaseError as exc:
            logger.error("Fallback WorkoutProgramViewSet.my_active_program por error de BD: %s", exc)
            try:
                fallback_program = WorkoutProgram.objects.filter(
                    user=request.user,
                    is_active=True,
                ).order_by('-created_at').first()
                if fallback_program:
                    serializer = WorkoutProgramMinimalSerializer(fallback_program)
                    return Response({'program': serializer.data, 'fallback': True}, status=status.HTTP_200_OK)
            except DatabaseError as fallback_exc:
                logger.error("Fallback mínimo my_active_program también falló: %s", fallback_exc)

            return Response({'program': None, 'fallback': True}, status=status.HTTP_200_OK)
    
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
        ).prefetch_related(
            'days__exercises__exercise',
            'days__exercises__exercise__substitutions__substitute',
        )
        serializer = WorkoutProgramMinimalSerializer(templates, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """
        Activar un programa de entrenamiento para el usuario actual.
        Desactiva automáticamente cualquier otro programa activo del usuario.
        POST /api/workouts/programs/{id}/activate/
        """
        import logging
        
        logger = logging.getLogger(__name__)
        program = get_object_or_404(WorkoutProgram, pk=pk)
        user = request.user
        
        # Validar que el programa pertenece al usuario o es una plantilla del sistema
        if program.user and program.user != user:
            return Response(
                {'error': 'No tienes permiso para activar este programa.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Solo se pueden activar programas de usuarios (no plantillas directamente)
        # Si es una plantilla, el admin debe crear una copia para el usuario primero
        if program.is_template or (program.is_system and not program.user):
            return Response(
                {'error': 'No puedes activar directamente una plantilla. Un administrador debe asignártela primero.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # IMPORTANTE: Desactivar TODOS los otros programas activos del usuario
        # Esto garantiza que solo un programa esté activo a la vez
        deactivated_count = WorkoutProgram.objects.filter(
            user=user,
            is_active=True
        ).exclude(pk=pk).update(is_active=False)
        
        logger.info(f'Usuario {user.email}: Desactivados {deactivated_count} programas al activar programa {pk}')
        
        # Activar el programa solicitado
        program.is_active = True
        program.save(update_fields=['is_active'])
        
        serializer = WorkoutProgramSerializer(program)
        return Response({
            'message': 'Programa activado correctamente. Otros programas activos han sido desactivados.',
            'program': serializer.data,
            'deactivated_count': deactivated_count
        }, status=status.HTTP_200_OK)


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
        """Crear log de entrenamiento para el usuario autenticado"""
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        """Upsert del log: si ya existe para user+date+workout_day, actualizar en vez de fallar."""
        user = request.user
        workout_day = request.data.get('workout_day')
        date = request.data.get('date')

        if workout_day and date:
            existing = WorkoutLog.objects.filter(
                user=user,
                workout_day_id=workout_day,
                date=date
            ).first()
            if existing:
                serializer = self.get_serializer(existing, data=request.data, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save(user=user)
                return Response(serializer.data, status=status.HTTP_200_OK)

        return super().create(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        """Crear log de entrenamiento"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=['get'], url_path='check_today')
    def check_today(self, request):
        """Verificar si un día de entrenamiento ya está completado hoy"""
        from django.utils import timezone
        workout_day_id = request.query_params.get('workout_day')
        if not workout_day_id:
            return Response({'error': 'workout_day es requerido'}, status=400)

        try:
            workout_day = WorkoutDay.objects.get(id=workout_day_id)
        except WorkoutDay.DoesNotExist:
            today = timezone.localdate()
            return Response({
                'is_completed': False,
                'workout_day_id': str(workout_day_id),
                'date': str(today),
                'log': None,
                'exists': False,
            })

        today = timezone.localdate()
        existing_log = WorkoutLog.objects.filter(
            user=request.user,
            workout_day=workout_day,
            date=today,
            completed=True
        ).first()

        is_completed = existing_log is not None

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
        
        # Objetivo semanal basado en los días de entrenamiento del usuario
        # Obtener los días de entrenamiento directamente del usuario (CustomUser)
        training_days = user.training_days if hasattr(user, 'training_days') and user.training_days else []
        
        # Calcular weekly_goal basándose en training_days
        if training_days and len(training_days) > 0:
            weekly_goal = len(training_days)
        else:
            # Si no hay training_days configurado, usar training_days_per_week o 5 por defecto
            weekly_goal = user.training_days_per_week if hasattr(user, 'training_days_per_week') and user.training_days_per_week else 5
        
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


class WorkoutPlanTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet para plantillas de planes de entrenamiento (admin)
    Usado por el panel de administración
    Permite crear, leer, actualizar y eliminar plantillas
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
        ).prefetch_related(
            'days__exercises__exercise',
            'days__exercises__exercise__substitutions__substitute',
        )
    
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
    
    def create(self, request, *args, **kwargs):
        """
        Crear una nueva plantilla de plan de entrenamiento con días y ejercicios anidados
        """
        # Convertir request.data a dict mutable
        if hasattr(request.data, 'dict'):
            data = request.data.dict()
        else:
            data = dict(request.data)
        
        # Extraer días antes de modificar data
        days_data = data.pop('days', []) or []
        
        # Asegurar que se crea como plantilla
        data['is_template'] = True
        data['is_system'] = False
        
        # Crear el programa base
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        program = serializer.save(created_by=request.user)
        
        # Asegurar que is_template se guardó correctamente
        program.refresh_from_db()
        if not program.is_template:
            program.is_template = True
            program.is_system = False
            program.save(update_fields=['is_template', 'is_system'])
        
        # Crear los días y ejercicios
        for day_index, day_data in enumerate(days_data):
            # Mapear day_name a name si es necesario
            day_name = day_data.get('day_name') or day_data.get('name', f'Día {day_data.get("day_number", day_index + 1)}')
            
            # Determinar day_of_week basado en day_number
            day_number = day_data.get('day_number', day_index + 1)
            day_of_week_map = {
                1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday',
                5: 'friday', 6: 'saturday', 7: 'sunday'
            }
            day_of_week = day_of_week_map.get(day_number, 'monday')
            
            workout_day = WorkoutDay.objects.create(
                program=program,
                name=day_name,
                day_number=day_number,
                day_of_week=day_of_week,
                is_rest_day=day_data.get('is_rest_day', False),
                duration_minutes=day_data.get('duration_minutes', program.estimated_duration_minutes or 60),
                notes=day_data.get('notes', ''),
                order_index=day_index
            )
            
            # Crear los ejercicios del día
            exercises_data = day_data.get('exercises', [])
            for ex_index, exercise_data in enumerate(exercises_data):
                # El frontend puede enviar exercise_id o exercise
                exercise_id = exercise_data.get('exercise_id') or exercise_data.get('exercise')
                
                if exercise_id:
                    try:
                        exercise = Exercise.objects.get(id=exercise_id, is_active=True)
                        
                        WorkoutDayExercise.objects.create(
                            workout_day=workout_day,
                            exercise=exercise,
                            sets=exercise_data.get('sets', 3),
                            reps=exercise_data.get('reps', '10-12'),
                            weight=exercise_data.get('weight') or 0,
                            rest_seconds=exercise_data.get('rest_time') or exercise_data.get('rest_seconds', 60),
                            duration_seconds=exercise_data.get('duration') or None,
                            notes=exercise_data.get('notes', ''),
                            order_index=ex_index
                        )
                    except Exercise.DoesNotExist:
                        # Si el ejercicio no existe, continuar sin agregarlo
                        continue
        
        # Retornar el programa creado con todos sus días y ejercicios
        response_serializer = self.get_serializer(program)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
