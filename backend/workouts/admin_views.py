# workouts/admin_views.py
# Views de admin simplificados

from rest_framework import viewsets, filters, status
from rest_framework.decorators import api_view, permission_classes as perm_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from datetime import datetime, timedelta, date
from django.db.models import Sum, Count, Avg, Q
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend

from .models import Exercise, WorkoutProgram, WorkoutDay, WorkoutLog, ExerciseSubstitution
from .admin_serializers import (
    AdminExerciseSerializer,
    AdminWorkoutProgramSerializer,
    AdminWorkoutDaySerializer,
    AdminWorkoutProgramMinimalSerializer,
)
from .serializers import WorkoutLogSerializer
from rest_framework.decorators import action

User = get_user_model()


class AdminExerciseViewSet(viewsets.ModelViewSet):
    """Admin ViewSet para ejercicios"""
    queryset = Exercise.objects.all()
    serializer_class = AdminExerciseSerializer
    permission_classes = [IsAdminUser]
    
    @action(detail=True, methods=['post'], url_path='add_substitute')
    def add_substitute(self, request, pk=None):
        """Añadir un ejercicio sustituto"""
        exercise = self.get_object()
        substitute_id = request.data.get('substitute_id')
        priority = request.data.get('priority', 1)
        notes = request.data.get('notes', '')
        
        if not substitute_id:
            return Response({'error': 'substitute_id es requerido'}, status=status.HTTP_400_BAD_REQUEST)
        
        substitute = get_object_or_404(Exercise, id=substitute_id)
        
        if substitute.id == exercise.id:
            return Response({'error': 'Un ejercicio no puede ser sustituto de sí mismo'}, status=status.HTTP_400_BAD_REQUEST)
        
        sub, created = ExerciseSubstitution.objects.get_or_create(
            exercise=exercise,
            substitute=substitute,
            defaults={'priority': priority, 'notes': notes}
        )
        
        if not created:
            sub.priority = priority
            sub.notes = notes
            sub.save()
        
        return Response({
            'id': sub.id,
            'substitute_id': str(substitute.id),
            'substitute_name': substitute.name,
            'priority': sub.priority,
            'notes': sub.notes,
            'created': created
        })
    
    @action(detail=True, methods=['post'], url_path='remove_substitute')
    def remove_substitute(self, request, pk=None):
        """Eliminar un ejercicio sustituto"""
        exercise = self.get_object()
        substitute_id = request.data.get('substitute_id')
        
        if not substitute_id:
            return Response({'error': 'substitute_id es requerido'}, status=status.HTTP_400_BAD_REQUEST)
        
        deleted, _ = ExerciseSubstitution.objects.filter(
            exercise=exercise,
            substitute_id=substitute_id
        ).delete()
        
        return Response({'removed': deleted > 0})
    
    @action(detail=True, methods=['get'], url_path='substitutes')
    def list_substitutes(self, request, pk=None):
        """Listar sustitutos de un ejercicio"""
        exercise = self.get_object()
        subs = exercise.substitutions.all().select_related('substitute').order_by('priority')
        
        return Response([{
            'id': s.id,
            'substitute_id': str(s.substitute.id),
            'substitute_name': s.substitute.name,
            'category': s.substitute.category,
            'priority': s.priority,
            'notes': s.notes
        } for s in subs])


class AdminWorkoutProgramViewSet(viewsets.ModelViewSet):
    """Admin ViewSet para programas"""
    queryset = WorkoutProgram.objects.all().select_related("user", "created_by").prefetch_related(
        'days__exercises__exercise',
        'days__exercises__exercise__substitutions__substitute',
    )
    serializer_class = AdminWorkoutProgramSerializer
    permission_classes = [IsAdminUser]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    filterset_fields = ['difficulty', 'goal', 'location', 'is_system', 'is_template', 'is_active', 'user', 'created_by']
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return AdminWorkoutProgramMinimalSerializer
        return AdminWorkoutProgramSerializer

    def list(self, request, *args, **kwargs):
        """Lista con paginación compatible con el frontend"""
        queryset = self.filter_queryset(self.get_queryset())

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

    def _apply_days_payload(self, program: WorkoutProgram, days_data):
        """
        Reemplaza días+ejercicios del programa con la estructura enviada por el frontend.
        Implementación simple: borrar y recrear.
        """
        # Borrar días existentes (cascade borra WorkoutDayExercise)
        program.days.all().delete()

        for day_index, day_data in enumerate(days_data or []):
            day_name = day_data.get('day_name') or day_data.get('name', f'Día {day_data.get("day_number", day_index + 1)}')

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

            exercises_data = day_data.get('exercises', []) or []
            for ex_index, exercise_data in enumerate(exercises_data):
                exercise_id = exercise_data.get('exercise_id') or exercise_data.get('exercise')
                if not exercise_id:
                    continue
                try:
                    exercise = Exercise.objects.get(id=exercise_id, is_active=True)
                except Exercise.DoesNotExist:
                    continue

                from .models import WorkoutDayExercise
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

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Crear un programa (plantilla o plan de usuario) con días y ejercicios anidados.
        - Si viene `user`/`user_id` => plan de usuario (is_template=False, is_system=False)
        - Si no viene user => por defecto se crea como plantilla (is_template=True, is_system=False)
        """
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        days_data = data.pop('days', []) or []

        user_id = data.get('user_id') or data.get('user')
        if user_id:
            data['user'] = user_id
            data['is_template'] = False
            data['is_system'] = False
        else:
            # default admin behavior: create as template unless explicitly set
            data.setdefault('is_template', True)
            data.setdefault('is_system', False)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        program: WorkoutProgram = serializer.save(created_by=request.user)

        self._apply_days_payload(program, days_data)

        response_serializer = AdminWorkoutProgramSerializer(program)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """
        Actualizar un programa. Si se envía `days`, reemplaza días+ejercicios.
        """
        partial = kwargs.pop('partial', False)
        instance: WorkoutProgram = self.get_object()

        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        days_data = data.pop('days', None)  # None => no tocar días

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        program: WorkoutProgram = serializer.save()

        if days_data is not None:
            self._apply_days_payload(program, days_data)

        response_serializer = AdminWorkoutProgramSerializer(program)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)


class AdminWorkoutDayViewSet(viewsets.ModelViewSet):
    """Admin ViewSet para días"""
    queryset = WorkoutDay.objects.all()
    serializer_class = AdminWorkoutDaySerializer
    permission_classes = [IsAdminUser]


@api_view(['GET'])
@perm_classes([IsAdminUser])
def admin_user_program(request, user_id: int):
    """
    Programa activo o más reciente de un usuario, con días y ejercicios.
    """
    user = get_object_or_404(User, pk=user_id)
    program = WorkoutProgram.objects.filter(user=user).prefetch_related(
        'days__exercises__exercise',
        'days__exercises__exercise__substitutions__substitute',
    ).order_by('-is_active', '-created_at').first()

    if not program:
        return Response({
            'user_id': user.id,
            'program': None,
            'message': 'El usuario no tiene programas asignados'
        })

    serializer = AdminWorkoutProgramSerializer(program)
    return Response({
        'user_id': user.id,
        'program': serializer.data,
        'summary': {
            'days_per_week': program.days_per_week,
            'duration_weeks': program.duration_weeks,
            'total_days': program.total_days,
            'training_days': program.training_days,
            'is_active': program.is_active,
        }
    })


@api_view(['GET'])
@perm_classes([IsAdminUser])
def admin_user_workout_logs(request, user_id: int):
    """
    Logs de entrenamientos de un usuario para revisión/admin.
    Query params:
      - start_date / end_date (YYYY-MM-DD)
      - limit (por defecto 50, máx 200)
    """
    user = get_object_or_404(User, pk=user_id)

    start_param = request.query_params.get('start_date')
    end_param = request.query_params.get('end_date')

    start_date = None
    end_date = None
    if start_param:
        try:
            start_date = datetime.strptime(start_param, '%Y-%m-%d').date()
        except ValueError:
            start_date = None
    if end_param:
        try:
            end_date = datetime.strptime(end_param, '%Y-%m-%d').date()
        except ValueError:
            end_date = None

    logs_qs = WorkoutLog.objects.filter(user=user)
    if start_date:
        logs_qs = logs_qs.filter(date__gte=start_date)
    if end_date:
        logs_qs = logs_qs.filter(date__lte=end_date)

    logs_qs = logs_qs.order_by('-date', '-created_at')
    limit = min(int(request.query_params.get('limit', 50)), 200)
    logs_qs = logs_qs[:limit]

    serializer = WorkoutLogSerializer(logs_qs, many=True)

    aggregates = logs_qs.aggregate(
        total_duration=Sum('duration_minutes'),
        completed=Count('id', filter=Q(completed=True)),
        total_calories=Sum('calories_burned'),
        avg_duration=Avg('duration_minutes')
    )

    return Response({
        'user_id': user.id,
        'count': len(serializer.data),
        'totals': {
            'duration_minutes': aggregates['total_duration'] or 0,
            'calories_burned': aggregates['total_calories'] or 0,
            'completed_sessions': aggregates['completed'] or 0,
            'avg_duration': round(aggregates['avg_duration'] or 0) if aggregates['avg_duration'] else 0,
        },
        'logs': serializer.data,
    })


@api_view(['GET'])
@perm_classes([IsAdminUser])
def admin_user_workout_stats(request, user_id: int):
    """
    Estadísticas resumidas de entrenamientos para un usuario (admin/staff).
    Incluye totales, rachas básicas y tonelaje/PR aproximado.
    """
    user = get_object_or_404(User, pk=user_id)

    logs_qs = WorkoutLog.objects.filter(user=user)
    total_logs = logs_qs.count()
    recent_30 = logs_qs.filter(date__gte=datetime.today().date() - timedelta(days=30)).prefetch_related(
        "log_exercises__exercise",
        "log_exercises__sets",
    )

    aggregates = logs_qs.aggregate(
        total_duration=Sum('duration_minutes'),
        total_calories=Sum('calories_burned'),
        avg_duration=Avg('duration_minutes'),
        completed=Count('id', filter=Q(completed=True)),
    )

    # Calcular tonelaje aproximado desde exercises_data (si existe)
    def compute_tonnage_and_prs():
        ton = 0
        per_exercise = {}
        per_muscle = {}
        exercise_prs = {}
        for log in recent_30:
            for ex in log.exercises_data or []:
                name = ex.get('name') or ex.get('exercise_name') or 'Ejercicio'
                muscle_groups = ex.get('muscle_groups') or []
                sets = ex.get('sets', [])
                for s in sets:
                    reps = s.get('reps') or 0
                    weight = s.get('weight') or 0
                    ton += reps * weight
                    # Asegurar que el diccionario existe con ambas claves
                    if name not in per_exercise:
                        per_exercise[name] = {'tonnage': 0, 'pr': 0}
                    current_pr = per_exercise[name].get('pr', 0) or 0
                    if weight > current_pr:
                        per_exercise[name]['pr'] = float(weight)
                    per_exercise[name]['tonnage'] = per_exercise[name].get('tonnage', 0) + (reps * weight)
                    # 1RM estimado (Epley)
                    if reps and weight:
                        est_1rm = float(weight) * (1 + reps / 30)
                        prev_pr = exercise_prs.get(name, 0)
                        if est_1rm > prev_pr:
                            exercise_prs[name] = est_1rm
                    for mg in muscle_groups:
                        per_muscle.setdefault(mg, 0)
                        per_muscle[mg] += reps * weight
        return ton, per_exercise, per_muscle, exercise_prs

    tonnage_30d, per_exercise, per_muscle, exercise_prs = compute_tonnage_and_prs()

    # Top ejercicios por tonelaje
    top_exercises = sorted(
        [
          {"name": name, "tonnage": data["tonnage"], "pr": data.get("pr")}
          for name, data in per_exercise.items()
        ],
        key=lambda x: x["tonnage"],
        reverse=True
    )[:5]

    top_muscles = sorted(
        [{"muscle_group": k, "tonnage": v} for k, v in per_muscle.items()],
        key=lambda x: x["tonnage"],
        reverse=True
    )[:6]

    exercise_prs_list = sorted(
        [{"name": name, "pr_1rm": round(val, 2)} for name, val in exercise_prs.items()],
        key=lambda x: x["pr_1rm"],
        reverse=True
    )[:10]

    # Volumen semanal (últimas 8 semanas)
    weekly_volume = []
    today = date.today()
    for i in range(8):
        start = today - timedelta(days=today.weekday()) - timedelta(weeks=i)
        end = start + timedelta(days=6)
        week_logs = logs_qs.filter(date__gte=start, date__lte=end)
        ton = 0
        for log in week_logs:
            for ex in log.exercises_data or []:
                for s in ex.get('sets', []):
                    reps = s.get('reps') or 0
                    weight = s.get('weight') or 0
                    ton += reps * weight
        weekly_volume.append({
            "week_start": start.isoformat(),
            "week_end": end.isoformat(),
            "tonnage": ton,
            "sessions": week_logs.count(),
        })
    weekly_volume = list(reversed(weekly_volume))

    # Rachas con logs completados
    def compute_streaks():
        completed_dates = sorted({log.date for log in logs_qs.filter(completed=True)})
        longest = 0
        current = 0
        prev_day = None
        today = date.today()
        for d in completed_dates:
            if prev_day and (d - prev_day).days == 1:
                current += 1
            else:
                current = 1
            longest = max(longest, current)
            prev_day = d
        if completed_dates:
            last_day = completed_dates[-1]
            if (today - last_day).days > 1:
                current = 0
        return {"current": current, "longest": longest}

    streaks = compute_streaks()

    return Response({
        "user_id": user.id,
        "total_logs": total_logs,
        "last_30_days": {
            "logs": recent_30.count(),
            "tonnage": tonnage_30d,
            "avg_duration": round(recent_30.aggregate(Avg('duration_minutes'))['duration_minutes__avg'] or 0),
        },
        "totals": {
            "duration_minutes": aggregates['total_duration'] or 0,
            "calories_burned": aggregates['total_calories'] or 0,
            "completed_sessions": aggregates['completed'] or 0,
            "avg_duration": round(aggregates['avg_duration'] or 0) if aggregates['avg_duration'] else 0,
        },
        "top_exercises": top_exercises,
        "top_muscle_groups": top_muscles,
        "streaks": streaks,
        "exercise_prs": exercise_prs_list,
        "weekly_volume": weekly_volume,
    })

@api_view(['PATCH', 'DELETE'])
@perm_classes([IsAdminUser])
def admin_user_workout_log_detail(request, user_id: int, log_id):
    """
    Editar o eliminar un log de entrenamiento (admin/staff).
    """
    user = get_object_or_404(User, pk=user_id)
    log = get_object_or_404(WorkoutLog, pk=log_id, user=user)

    if request.method == 'DELETE':
        log.delete()
        return Response(status=204)

    serializer = WorkoutLogSerializer(log, data=request.data, partial=True, context={'request': request})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)
