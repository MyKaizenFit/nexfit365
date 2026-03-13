from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.decorators import action, api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Avg, Sum, Max, Min
from django.utils import timezone
from django.core.cache import cache
from datetime import timedelta, datetime
import calendar

from .models import DashboardData, UserStats, WellnessTip, DefaultPlanConfiguration, HelpSettings, ProblemReport
from .serializers import (
    DashboardDataSerializer, DashboardTodaySerializer, 
    DashboardWeeklySerializer, DashboardMonthlySerializer,
    DashboardStatsSerializer, WellnessTipSerializer,
    DefaultPlanConfigurationSerializer, DefaultPlanConfigurationCreateUpdateSerializer,
    HelpSettingsSerializer, ProblemReportSerializer, ProblemReportCreateSerializer
)
from .permissions import DashboardPermission, DashboardDataPermission
from accounts.models import CustomUser


class DashboardViewSet(viewsets.ModelViewSet):
    """
    ViewSet para dashboard del usuario
    """
    serializer_class = DashboardDataSerializer
    permission_classes = [DashboardPermission]
    
    def get_queryset(self):
        user_id = self.kwargs.get("user_id")
        if user_id:
            return DashboardData.objects.filter(user_id=user_id)
        return DashboardData.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=["get"])
    def today(self, request, user_id=None):
        """Obtener dashboard del día actual"""
        user_id = user_id or request.user.id
        user = get_object_or_404(CustomUser, id=user_id)
        
        # Verificar cache
        cache_key = f"dashboard_today_{user_id}_{timezone.now().date()}"
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)
        
        today = timezone.now().date()
        
        # Datos de nutrición del día
        from nutrition.models import MealLog, NutritionPlan
        active_plan = NutritionPlan.objects.filter(
            user=user, is_active=True
        ).select_related('user').prefetch_related('meals').first()
        
        if active_plan:
            meals_planned = active_plan.meals.count()
            meals_completed = MealLog.objects.filter(
                user=user, date=today, completed=True
            ).select_related('user', 'recipe').count()
            
            # Calorías consumidas (de logs del día)
            calories_consumed = MealLog.objects.filter(
                user=user, date=today
            ).select_related('user', 'recipe').aggregate(
                total_calories=Sum("calories")
            )["total_calories"] or 0
            
            calories_target = active_plan.daily_calories or 0
            nutrition_adherence = (meals_completed / meals_planned * 100) if meals_planned > 0 else 0
        else:
            meals_planned = meals_completed = calories_consumed = calories_target = 0
            nutrition_adherence = 0
        
        # Datos de entrenamiento del día
        from workouts.models import WorkoutLog, WorkoutProgram
        active_program = WorkoutProgram.objects.filter(user=user, is_active=True).first()
        
        if active_program:
            # Encontrar el día de entrenamiento para hoy
            today_name = today.strftime("%A").lower()
            workout_day = active_program.days.filter(
                Q(day__iexact=today_name) | Q(day__iexact=f"day {today.weekday() + 1}")
            ).first()
            
            workout_planned = workout_day is not None and not workout_day.is_rest_day
            workout_log = WorkoutLog.objects.select_related(
                'user', 'workout_program'
            ).filter(
                user=user, date=today, workout_day=workout_day
            ).first() if workout_day else None
            
            workout_completed = workout_log.completed if workout_log else False
            workout_duration = workout_log.duration_minutes if workout_log else None
            workout_rating = workout_log.rating if workout_log else None
        else:
            workout_planned = workout_completed = False
            workout_duration = workout_rating = None
        
        # Datos de progreso del día
        from progress.models import WeightEntry
        current_weight = WeightEntry.objects.filter(
            user=user
        ).order_by("-date").values_list("weight", flat=True).first()
        
        # Cambio de peso desde ayer
        yesterday_weight = WeightEntry.objects.select_related('user').filter(
            user=user, date=today - timedelta(days=1)
        ).values_list("weight", flat=True).first()
        
        weight_change_today = None
        if current_weight and yesterday_weight:
            weight_change_today = current_weight - yesterday_weight
        
        # Logros del día
        from achievements.models import UserAchievement
        achievements_unlocked_today = UserAchievement.objects.filter(
            user=user, unlocked_at__date=today
        ).count()
        
        points_earned_today = UserAchievement.objects.filter(
            user=user, unlocked_at__date=today
        ).aggregate(
            total_points=Sum("achievement__points")
        )["total_points"] or 0
        
        data = {
            "date": today,
            "meals_planned": meals_planned,
            "meals_completed": meals_completed,
            "calories_consumed": calories_consumed,
            "calories_target": calories_target,
            "nutrition_adherence": round(nutrition_adherence, 2),
            "workout_planned": workout_planned,
            "workout_completed": workout_completed,
            "workout_duration": workout_duration,
            "workout_rating": workout_rating,
            "current_weight": current_weight,
            "weight_change_today": weight_change_today,
            "achievements_unlocked_today": achievements_unlocked_today,
            "points_earned_today": points_earned_today,
        }
        
        # Cache por 5 minutos
        cache.set(cache_key, data, 300)
        
        serializer = DashboardTodaySerializer(data)
        return Response(serializer.data)
    
    @action(detail=False, methods=["get"])
    def weekly(self, request, user_id=None):
        """Obtener dashboard semanal"""
        user_id = user_id or request.user.id
        user = get_object_or_404(CustomUser, id=user_id)
        
        # Verificar cache
        cache_key = f"dashboard_weekly_{user_id}_{timezone.now().date()}"
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)
        
        today = timezone.now().date()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        
        # Datos de nutrición semanal
        from nutrition.models import MealLog, NutritionPlan
        active_plan = NutritionPlan.objects.filter(
            user=user, is_active=True
        ).select_related('user').prefetch_related('meals').first()
        
        if active_plan:
            meals_planned_week = active_plan.meals.count() * 7
            meals_completed_week = MealLog.objects.filter(
                user=user, date__range=[week_start, week_end], completed=True
            ).count()
            
            total_calories_week = MealLog.objects.filter(
                user=user, date__range=[week_start, week_end]
            ).aggregate(
                total_calories=Sum("meal__calories")
            )["total_calories"] or 0
            
            average_calories_day = total_calories_week / 7 if total_calories_week > 0 else 0
            nutrition_adherence_week = (meals_completed_week / meals_planned_week * 100) if meals_planned_week > 0 else 0
        else:
            meals_planned_week = meals_completed_week = total_calories_week = 0
            average_calories_day = nutrition_adherence_week = 0
        
        # Datos de entrenamiento semanal
        from workouts.models import WorkoutLog, WorkoutProgram
        active_program = WorkoutProgram.objects.filter(user=user, is_active=True).first()
        
        if active_program:
            workouts_planned_week = active_program.days.filter(is_rest_day=False).count()
            workouts_completed_week = WorkoutLog.objects.filter(
                user=user, date__range=[week_start, week_end], completed=True
            ).count()
            
            total_workout_time = WorkoutLog.objects.filter(
                user=user, date__range=[week_start, week_end]
            ).aggregate(
                total_time=Sum("duration_minutes")
            )["total_time"] or 0
            
            average_workout_rating = WorkoutLog.objects.filter(
                user=user, date__range=[week_start, week_end], rating__isnull=False
            ).aggregate(
                avg_rating=Avg("rating")
            )["avg_rating"] or 0
        else:
            workouts_planned_week = workouts_completed_week = total_workout_time = 0
            average_workout_rating = 0
        
        # Datos de progreso semanal
        from progress.models import WeightEntry, ProgressPhoto
        weight_change_week = None
        weight_change_percentage = None
        
        start_weight = WeightEntry.objects.filter(
            user=user, date__range=[week_start, week_end]
        ).order_by("date").values_list("weight", flat=True).first()
        
        end_weight = WeightEntry.objects.filter(
            user=user, date__range=[week_start, week_end]
        ).order_by("-date").values_list("weight", flat=True).first()
        
        if start_weight and end_weight:
            weight_change_week = end_weight - start_weight
            weight_change_percentage = (weight_change_week / start_weight) * 100
        
        progress_photos_week = ProgressPhoto.objects.filter(
            user=user, date__range=[week_start, week_end]
        ).count()
        
        # Logros semanales
        from achievements.models import UserAchievement
        achievements_unlocked_week = UserAchievement.objects.filter(
            user=user, unlocked_at__date__range=[week_start, week_end]
        ).count()
        
        points_earned_week = UserAchievement.objects.filter(
            user=user, unlocked_at__date__range=[week_start, week_end]
        ).aggregate(
            total_points=Sum("achievement__points")
        )["total_points"] or 0
        
        # Tendencias (simplificado)
        trend_nutrition = "stable"
        if nutrition_adherence_week > 80:
            trend_nutrition = "improving"
        elif nutrition_adherence_week < 50:
            trend_nutrition = "declining"
        
        trend_workouts = "stable"
        if workouts_completed_week > workouts_planned_week * 0.8:
            trend_workouts = "improving"
        elif workouts_completed_week < workouts_planned_week * 0.5:
            trend_workouts = "declining"
        
        trend_progress = "stable"
        if weight_change_week and weight_change_week < 0:  # Pérdida de peso
            trend_progress = "improving"
        elif weight_change_week and weight_change_week > 0:  # Ganancia de peso
            trend_progress = "declining"
        
        data = {
            "week_start": week_start,
            "week_end": week_end,
            "nutrition_adherence_week": round(nutrition_adherence_week, 2),
            "total_calories_week": total_calories_week,
            "average_calories_day": round(average_calories_day, 2),
            "meals_completed_week": meals_completed_week,
            "meals_planned_week": meals_planned_week,
            "workouts_completed_week": workouts_completed_week,
            "workouts_planned_week": workouts_planned_week,
            "total_workout_time": total_workout_time,
            "average_workout_rating": round(average_workout_rating, 2),
            "weight_change_week": weight_change_week,
            "weight_change_percentage": round(weight_change_percentage, 2) if weight_change_percentage else None,
            "progress_photos_week": progress_photos_week,
            "achievements_unlocked_week": achievements_unlocked_week,
            "points_earned_week": points_earned_week,
            "trend_nutrition": trend_nutrition,
            "trend_workouts": trend_workouts,
            "trend_progress": trend_progress,
        }
        
        # Cache por 15 minutos
        cache.set(cache_key, data, 900)
        
        serializer = DashboardWeeklySerializer(data)
        return Response(serializer.data)
    
    @action(detail=False, methods=["get"])
    def monthly(self, request, user_id=None):
        """Obtener dashboard mensual"""
        user_id = user_id or request.user.id
        user = get_object_or_404(CustomUser, id=user_id)
        
        # Verificar cache
        cache_key = f"dashboard_monthly_{user_id}_{timezone.now().strftime('%Y-%m')}"
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)
        
        today = timezone.now().date()
        month_start = today.replace(day=1)
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        
        # Resumen mensual
        from workouts.models import WorkoutLog
        from nutrition.models import MealLog
        from progress.models import ProgressPhoto
        from achievements.models import UserAchievement
        
        total_workouts = WorkoutLog.objects.filter(
            user=user, date__range=[month_start, month_end]
        ).count()
        
        total_meals_logged = MealLog.objects.filter(
            user=user, date__range=[month_start, month_end]
        ).count()
        
        total_progress_photos = ProgressPhoto.objects.filter(
            user=user, date__range=[month_start, month_end]
        ).count()
        
        total_achievements = UserAchievement.objects.filter(
            user=user, unlocked_at__date__range=[month_start, month_end]
        ).count()
        
        # Promedios mensuales
        average_workout_rating = WorkoutLog.objects.filter(
            user=user, date__range=[month_start, month_end], rating__isnull=False
        ).aggregate(
            avg_rating=Avg("rating")
        )["avg_rating"] or 0
        
        # Adherencia nutricional mensual
        active_plan = user.nutrition_plans.filter(is_active=True).first()
        if active_plan:
            meals_planned_month = active_plan.meals.count() * month_end.day
            meals_completed_month = MealLog.objects.filter(
                user=user, date__range=[month_start, month_end], completed=True
            ).count()
            average_nutrition_adherence = (meals_completed_month / meals_planned_month * 100) if meals_planned_month > 0 else 0
        else:
            average_nutrition_adherence = 0
        
        # Calorías promedio diarias
        total_calories_month = MealLog.objects.filter(
            user=user, date__range=[month_start, month_end]
        ).aggregate(
            total_calories=Sum("meal__calories")
        )["total_calories"] or 0
        
        average_calories_day = total_calories_month / month_end.day if total_calories_month > 0 else 0
        
        # Objetivos mensuales (simplificado)
        goals_achieved = 0
        goals_total = 3  # Ejemplo: 3 objetivos básicos
        
        if total_workouts >= 20:  # Objetivo: 20 entrenamientos
            goals_achieved += 1
        if average_nutrition_adherence >= 70:  # Objetivo: 70% adherencia
            goals_achieved += 1
        if total_progress_photos >= 4:  # Objetivo: 4 fotos de progreso
            goals_achieved += 1
        
        goals_completion_rate = (goals_achieved / goals_total) * 100
        
        data = {
            "month": today.strftime("%Y-%m"),
            "year": today.year,
            "total_workouts": total_workouts,
            "total_meals_logged": total_meals_logged,
            "total_progress_photos": total_progress_photos,
            "total_achievements": total_achievements,
            "average_workout_rating": round(average_workout_rating, 2),
            "average_nutrition_adherence": round(average_nutrition_adherence, 2),
            "average_calories_day": round(average_calories_day, 2),
            "goals_achieved": goals_achieved,
            "goals_total": goals_total,
            "goals_completion_rate": round(goals_completion_rate, 2),
        }
        
        # Cache por 1 hora
        cache.set(cache_key, data, 3600)
        
        serializer = DashboardMonthlySerializer(data)
        return Response(serializer.data)


    @action(detail=False, methods=["get"])
    def stats(self, request, user_id=None):
        """Obtener estadísticas generales del dashboard"""
        user_id = user_id or request.user.id
        user = get_object_or_404(CustomUser, id=user_id)
        
        # Verificar cache
        cache_key = f"dashboard_stats_{user_id}"
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)
        
        # Días activos (días con al menos un log)
        from workouts.models import WorkoutLog
        from nutrition.models import MealLog
        from progress.models import WeightEntry
        
        active_dates = set()
        
        # Fechas con entrenamientos
        workout_dates = WorkoutLog.objects.filter(user=user).values_list("date", flat=True)
        active_dates.update(workout_dates)
        
        # Fechas con comidas
        meal_dates = MealLog.objects.filter(user=user).values_list("date", flat=True)
        active_dates.update(meal_dates)
        
        # Fechas con peso
        weight_dates = WeightEntry.objects.filter(user=user).values_list("date", flat=True)
        active_dates.update(weight_dates)
        
        total_days_active = len(active_dates)
        
        # Racha actual (días consecutivos)
        current_streak = 0
        longest_streak = 0
        current_streak_temp = 0
        
        if active_dates:
            sorted_dates = sorted(active_dates, reverse=True)
            today = timezone.now().date()
            
            for i, date in enumerate(sorted_dates):
                if i == 0 and date == today:
                    current_streak_temp = 1
                elif i > 0 and (sorted_dates[i-1] - date).days == 1:
                    current_streak_temp += 1
                else:
                    if current_streak_temp > longest_streak:
                        longest_streak = current_streak_temp
                    current_streak_temp = 1
            
            if current_streak_temp > longest_streak:
                longest_streak = current_streak_temp
            
            current_streak = current_streak_temp
        
        # Puntos totales
        from achievements.models import UserAchievement
        total_points = UserAchievement.objects.filter(user=user).aggregate(
            total_points=Sum("achievement__points")
        )["total_points"] or 0
        
        # Nivel basado en puntos (ejemplo: cada 100 puntos = 1 nivel)
        level = (total_points // 100) + 1
        next_level_points = level * 100
        progress_to_next_level = (total_points % 100) / 100 * 100
        
        data = {
            "user_id": user_id,
            "total_days_active": total_days_active,
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "total_points": total_points,
            "level": level,
            "next_level_points": next_level_points,
            "progress_to_next_level": round(progress_to_next_level, 2),
        }
        
        # Cache por 2 horas
        cache.set(cache_key, data, 7200)
        
        serializer = DashboardStatsSerializer(data)
        return Response(serializer.data)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_stats(request):
    """
    Obtener o actualizar estadísticas del usuario
    """
    user = request.user
    
    if request.method == 'GET':
        # Obtener o crear estadísticas del usuario
        stats, created = UserStats.objects.get_or_create(
            user=user,
            defaults={
                'calories_goal': 2000,
                'workouts_goal': 5,
                'transformation_start_date': timezone.now().date(),
                'next_review_date': timezone.now().date() + timedelta(days=30),
            }
        )
        
        # Calcular datos en tiempo real
        today = timezone.now().date()
        
        # Calorías del día
        from nutrition.models import MealLog
        calories_today = MealLog.objects.filter(
            user=user, date=today
        ).aggregate(
            total_calories=Sum("calories")
        )["total_calories"] or 0
        
        # Entrenamientos de la semana
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        
        from workouts.models import WorkoutLog
        workouts_this_week = WorkoutLog.objects.filter(
            user=user, date__range=[week_start, week_end], completed=True
        ).count()
        
        # Peso actual
        from progress.models import WeightEntry
        current_weight = WeightEntry.objects.filter(
            user=user
        ).order_by("-date").values_list("weight", flat=True).first()
        
        if current_weight and not stats.current_weight:
            stats.current_weight = current_weight
            stats.save()
        
        # Calcular días en transformación
        days_in_transformation = stats.days_in_transformation
        
        # Calcular cambio de peso
        weight_change = stats.weight_change
        
        # Próxima revisión
        next_review = "Próximamente"
        if stats.next_review_date:
            days_until_review = (stats.next_review_date - today).days
            if days_until_review > 0:
                next_review = f"{days_until_review} días"
            elif days_until_review == 0:
                next_review = "Hoy"
            else:
                next_review = "Vencida"
        
        response_data = {
            "caloriesToday": calories_today,
            "caloriesGoal": stats.calories_goal,
            "currentWeight": float(stats.current_weight) if stats.current_weight else None,
            "targetWeight": float(stats.weight_goal) if stats.weight_goal else None,
            "weightChange": weight_change,
            "workoutsThisWeek": workouts_this_week,
            "workoutsGoal": stats.workouts_goal,
            "nextReview": next_review,
            "daysInTransformation": days_in_transformation,
        }
        
        return Response(response_data)
    
    elif request.method == 'PUT':
        # Actualizar estadísticas del usuario
        data = request.data
        
        stats, created = UserStats.objects.get_or_create(
            user=user,
            defaults={
                'calories_goal': 2000,
                'workouts_goal': 5,
                'transformation_start_date': timezone.now().date(),
                'next_review_date': timezone.now().date() + timedelta(days=30),
            }
        )
        
        # Actualizar campos permitidos
        if 'calories_goal' in data:
            stats.calories_goal = data['calories_goal']
        if 'workouts_goal' in data:
            stats.workouts_goal = data['workouts_goal']
        if 'current_weight' in data:
            stats.current_weight = data['current_weight']
        if 'starting_weight' in data:
            stats.starting_weight = data['starting_weight']
        if 'weight_goal' in data:
            stats.weight_goal = data['weight_goal']
        if 'transformation_start_date' in data:
            stats.transformation_start_date = data['transformation_start_date']
        if 'next_review_date' in data:
            stats.next_review_date = data['next_review_date']
        
        stats.save()
        
        return Response({
            "message": "Estadísticas actualizadas correctamente",
            "stats": {
                "calories_goal": stats.calories_goal,
                "workouts_goal": stats.workouts_goal,
                "current_weight": float(stats.current_weight) if stats.current_weight else None,
                "starting_weight": float(stats.starting_weight) if stats.starting_weight else None,
                "weight_goal": float(stats.weight_goal) if stats.weight_goal else None,
                "transformation_start_date": stats.transformation_start_date.isoformat() if stats.transformation_start_date else None,
                "next_review_date": stats.next_review_date.isoformat() if stats.next_review_date else None,
            }
        })


class WellnessTipViewSet(viewsets.ModelViewSet):
    """
    CRUD de consejos publicados por administradores.
    Usuarios autenticados pueden consultar los consejos activos,
    mientras que solo staff/admin pueden crear o modificarlos.
    """

    serializer_class = WellnessTipSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = WellnessTip.objects.all()
        user = self.request.user
        if not user.is_staff and not user.is_superuser:
            queryset = queryset.filter(is_active=True)

        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category=category)

        audience = self.request.query_params.get("audience")
        if audience:
            queryset = queryset.filter(audience__iexact=audience)

        highlighted = self.request.query_params.get("highlighted")
        if highlighted == "true":
            queryset = queryset.filter(is_highlighted=True)

        search_query = self.request.query_params.get("q")
        if search_query:
            queryset = queryset.filter(title__icontains=search_query)

        return queryset.order_by("-is_highlighted", "-created_at")

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        limit = request.query_params.get("limit")
        if limit and limit.isdigit():
            queryset = queryset[: int(limit)]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class DefaultPlanConfigurationViewSet(viewsets.ModelViewSet):
    """
    ViewSet para configuraciones de planes por defecto.
    Solo accesible para administradores.
    """
    queryset = DefaultPlanConfiguration.objects.all()
    permission_classes = [IsAdminUser]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return DefaultPlanConfigurationCreateUpdateSerializer
        return DefaultPlanConfigurationSerializer
    
    def get_queryset(self):
        queryset = DefaultPlanConfiguration.objects.select_related(
            'default_nutrition_plan',
            'default_workout_program'
        ).all()
        
        # Filtros opcionales
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        main_goal = self.request.query_params.get('main_goal')
        if main_goal:
            queryset = queryset.filter(main_goal=main_goal)
        
        return queryset.order_by('priority', 'created_at')
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        
        # Devolver con el serializer de lectura
        read_serializer = DefaultPlanConfigurationSerializer(instance)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        
        # Devolver con el serializer de lectura
        read_serializer = DefaultPlanConfigurationSerializer(instance)
        return Response(read_serializer.data)
    
    @action(detail=False, methods=['get'])
    def match_user(self, request):
        """
        Endpoint para obtener la mejor configuración para un perfil de usuario dado.
        """
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response(
                {'error': 'user_id es requerido'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Buscar configuración que coincida, ordenada por prioridad
        configurations = DefaultPlanConfiguration.objects.filter(
            is_active=True
        ).order_by('priority')
        
        for config in configurations:
            if config.matches_user_profile(user):
                serializer = DefaultPlanConfigurationSerializer(config)
                return Response(serializer.data)
        
        return Response(
            {'message': 'No se encontró configuración que coincida'}, 
            status=status.HTTP_404_NOT_FOUND
        )

    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
        """Exporta todas las configuraciones en formato CSV"""
        import csv
        from django.http import HttpResponse

        configs = self.get_queryset()
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="default_plan_configurations.csv"'

        fieldnames = [
            'nombre', 'descripcion', 'prioridad', 'activo',
            'objetivo_principal', 'lugar_entrenamiento', 'nivel_actividad', 'genero',
            'dias_min_entrenamiento', 'dias_max_entrenamiento',
            'edad_min', 'edad_max',
            'restricciones_alimentarias', 'equipamiento',
            'plan_nutricion', 'programa_entrenamiento',
        ]
        writer = csv.DictWriter(response, fieldnames=fieldnames)
        writer.writeheader()

        for config in configs:
            writer.writerow({
                'nombre': config.name,
                'descripcion': config.description or '',
                'prioridad': config.priority,
                'activo': 'Sí' if config.is_active else 'No',
                'objetivo_principal': config.main_goal or '',
                'lugar_entrenamiento': config.training_location or '',
                'nivel_actividad': config.activity_level or '',
                'genero': config.gender or '',
                'dias_min_entrenamiento': config.min_training_days_per_week if config.min_training_days_per_week is not None else '',
                'dias_max_entrenamiento': config.max_training_days_per_week if config.max_training_days_per_week is not None else '',
                'edad_min': config.age_min if config.age_min is not None else '',
                'edad_max': config.age_max if config.age_max is not None else '',
                'restricciones_alimentarias': ','.join(config.dietary_restrictions or []),
                'equipamiento': ','.join(config.equipment_keywords or []),
                'plan_nutricion': config.default_nutrition_plan.name if config.default_nutrition_plan else '',
                'programa_entrenamiento': config.default_workout_program.name if config.default_workout_program else '',
            })
        return response

    @action(detail=False, methods=['get'], url_path='export-excel')
    def export_excel(self, request):
        """Exporta configuraciones en Excel con dos hojas: Datos y Referencias"""
        import io
        import xlsxwriter
        from django.http import HttpResponse

        configs = self.get_queryset()
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})

        # ========== HOJA 1: DATOS ==========
        worksheet = workbook.add_worksheet('Configuraciones')
        header_format = workbook.add_format({'bold': True, 'bg_color': '#D3D3D3'})

        headers = [
            'nombre', 'descripcion', 'prioridad', 'activo',
            'objetivo_principal', 'lugar_entrenamiento', 'nivel_actividad', 'genero',
            'dias_min_entrenamiento', 'dias_max_entrenamiento',
            'edad_min', 'edad_max',
            'restricciones_alimentarias', 'equipamiento',
            'plan_nutricion', 'programa_entrenamiento',
        ]
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)

        for row_idx, config in enumerate(configs, start=1):
            worksheet.write(row_idx, 0, config.name)
            worksheet.write(row_idx, 1, config.description or '')
            worksheet.write(row_idx, 2, config.priority)
            worksheet.write(row_idx, 3, 'Sí' if config.is_active else 'No')
            worksheet.write(row_idx, 4, config.main_goal or '')
            worksheet.write(row_idx, 5, config.training_location or '')
            worksheet.write(row_idx, 6, config.activity_level or '')
            worksheet.write(row_idx, 7, config.gender or '')
            worksheet.write(row_idx, 8, config.min_training_days_per_week if config.min_training_days_per_week is not None else '')
            worksheet.write(row_idx, 9, config.max_training_days_per_week if config.max_training_days_per_week is not None else '')
            worksheet.write(row_idx, 10, config.age_min if config.age_min is not None else '')
            worksheet.write(row_idx, 11, config.age_max if config.age_max is not None else '')
            worksheet.write(row_idx, 12, ','.join(config.dietary_restrictions or []))
            worksheet.write(row_idx, 13, ','.join(config.equipment_keywords or []))
            worksheet.write(row_idx, 14, config.default_nutrition_plan.name if config.default_nutrition_plan else '')
            worksheet.write(row_idx, 15, config.default_workout_program.name if config.default_workout_program else '')

        worksheet.set_column('A:A', 30)
        worksheet.set_column('B:B', 40)
        worksheet.set_column('C:P', 20)

        # ========== HOJA 2: REFERENCIAS ==========
        ref_ws = workbook.add_worksheet('Referencias')
        ref_ws.write(0, 0, 'OBJETIVO_PRINCIPAL', header_format)
        for i, val in enumerate(['weight_loss', 'muscle_gain', 'maintenance', 'performance'], 1):
            ref_ws.write(i, 0, val)
        ref_ws.write(0, 2, 'LUGAR_ENTRENAMIENTO', header_format)
        for i, val in enumerate(['home', 'gym', 'outdoor'], 1):
            ref_ws.write(i, 2, val)
        ref_ws.write(0, 4, 'NIVEL_ACTIVIDAD', header_format)
        for i, val in enumerate(['beginner', 'intermediate', 'advanced'], 1):
            ref_ws.write(i, 4, val)
        ref_ws.write(0, 6, 'GENERO', header_format)
        for i, val in enumerate(['male', 'female', 'other'], 1):
            ref_ws.write(i, 6, val)
        ref_ws.set_column('A:G', 25)

        workbook.close()
        output.seek(0)
        response = HttpResponse(output.read(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="default_plan_configurations.xlsx"'
        return response

    @action(detail=False, methods=['post'], url_path='import-csv', parser_classes=[MultiPartParser, FormParser])
    def import_csv(self, request):
        """Importa configuraciones desde un CSV. Actualiza existentes (por nombre), crea nuevas."""
        import csv
        from django.core.files.uploadedfile import UploadedFile
        from nutrition.models import NutritionPlan
        from workouts.models import WorkoutProgram

        file = request.FILES.get('file')
        if not file or not isinstance(file, UploadedFile):
            return Response({'error': 'Archivo CSV no proporcionado'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded = file.read().decode('utf-8')
        except UnicodeDecodeError:
            return Response({'error': 'El archivo debe estar en formato UTF-8'}, status=status.HTTP_400_BAD_REQUEST)

        reader = csv.DictReader(decoded.splitlines())
        created, updated, skipped = 0, 0, 0
        errors = []

        header_aliases = {
            'nombre': 'nombre', 'name': 'nombre',
            'descripcion': 'descripcion', 'descripción': 'descripcion', 'description': 'descripcion',
            'prioridad': 'prioridad', 'priority': 'prioridad',
            'activo': 'activo', 'is_active': 'activo',
            'objetivo_principal': 'objetivo_principal', 'main_goal': 'objetivo_principal',
            'lugar_entrenamiento': 'lugar_entrenamiento', 'training_location': 'lugar_entrenamiento',
            'nivel_actividad': 'nivel_actividad', 'activity_level': 'nivel_actividad',
            'genero': 'genero', 'género': 'genero', 'gender': 'genero',
            'dias_min_entrenamiento': 'dias_min', 'min_training_days_per_week': 'dias_min',
            'dias_max_entrenamiento': 'dias_max', 'max_training_days_per_week': 'dias_max',
            'edad_min': 'edad_min', 'age_min': 'edad_min',
            'edad_max': 'edad_max', 'age_max': 'edad_max',
            'restricciones_alimentarias': 'restricciones', 'dietary_restrictions': 'restricciones',
            'equipamiento': 'equipamiento', 'equipment_keywords': 'equipamiento',
            'plan_nutricion': 'plan_nutricion', 'default_nutrition_plan': 'plan_nutricion',
            'programa_entrenamiento': 'programa_entrenamiento', 'default_workout_program': 'programa_entrenamiento',
        }

        def get_val(row_data, canonical):
            for raw_key, raw_val in row_data.items():
                mapped = header_aliases.get(str(raw_key).strip().lower())
                if mapped == canonical:
                    return raw_val
            return ''

        def to_bool(val, default=True):
            if val is None or str(val).strip() == '':
                return default
            return str(val).strip().lower() in ['true', '1', 'yes', 'sí', 'si', 's']

        def to_int_or_none(val):
            try:
                return int(str(val).strip()) if str(val).strip() else None
            except (ValueError, TypeError):
                return None

        def to_list(val):
            return [x.strip() for x in str(val).split(',') if x.strip()] if val else []

        for row_num, row in enumerate(reader, start=2):
            try:
                name = str(get_val(row, 'nombre') or '').strip()
                if not name:
                    errors.append(f"Fila {row_num}: 'nombre' es requerido")
                    skipped += 1
                    continue

                nutrition_plan_name = str(get_val(row, 'plan_nutricion') or '').strip()
                workout_program_name = str(get_val(row, 'programa_entrenamiento') or '').strip()

                nutrition_plan = NutritionPlan.objects.filter(name=nutrition_plan_name).first() if nutrition_plan_name else None
                workout_program = WorkoutProgram.objects.filter(name=workout_program_name).first() if workout_program_name else None

                fields = {
                    'description': str(get_val(row, 'descripcion') or '').strip(),
                    'priority': to_int_or_none(get_val(row, 'prioridad')) or 100,
                    'is_active': to_bool(get_val(row, 'activo')),
                    'main_goal': str(get_val(row, 'objetivo_principal') or '').strip() or None,
                    'training_location': str(get_val(row, 'lugar_entrenamiento') or '').strip() or None,
                    'activity_level': str(get_val(row, 'nivel_actividad') or '').strip() or None,
                    'gender': str(get_val(row, 'genero') or '').strip() or None,
                    'min_training_days_per_week': to_int_or_none(get_val(row, 'dias_min')),
                    'max_training_days_per_week': to_int_or_none(get_val(row, 'dias_max')),
                    'age_min': to_int_or_none(get_val(row, 'edad_min')),
                    'age_max': to_int_or_none(get_val(row, 'edad_max')),
                    'dietary_restrictions': to_list(get_val(row, 'restricciones')),
                    'equipment_keywords': to_list(get_val(row, 'equipamiento')),
                    'default_nutrition_plan': nutrition_plan,
                    'default_workout_program': workout_program,
                }

                config = DefaultPlanConfiguration.objects.filter(name=name).first()
                if config:
                    for k, v in fields.items():
                        setattr(config, k, v)
                    config.save()
                    updated += 1
                else:
                    DefaultPlanConfiguration.objects.create(name=name, **fields)
                    created += 1
            except Exception as e:
                errors.append(f"Fila {row_num}: {str(e)}")
                skipped += 1

        message = f"Importación completada. {created} creadas, {updated} actualizadas"
        if skipped:
            message += f", {skipped} omitidas"
        if errors:
            message += f". {len(errors)} error(es)"

        return Response({
            'created': created,
            'updated': updated,
            'skipped': skipped,
            'message': message,
            'errors': errors[:10] if errors else [],
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='import-excel', parser_classes=[MultiPartParser, FormParser])
    def import_excel(self, request):
        """Importa configuraciones desde un Excel. Actualiza existentes (por nombre), crea nuevas."""
        import openpyxl
        from django.core.files.uploadedfile import UploadedFile
        from nutrition.models import NutritionPlan
        from workouts.models import WorkoutProgram

        file = request.FILES.get('file')
        if not file or not isinstance(file, UploadedFile):
            return Response({'error': 'Archivo Excel no proporcionado'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            wb = openpyxl.load_workbook(file)
            ws = wb.active
        except Exception as e:
            return Response({'error': f'Error al leer el archivo Excel: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        raw_headers = [str(cell.value).strip().lower() if cell.value is not None else '' for cell in ws[1]]
        created, updated, skipped = 0, 0, 0
        errors = []

        header_aliases = {
            'nombre': 'nombre', 'name': 'nombre',
            'descripcion': 'descripcion', 'descripción': 'descripcion', 'description': 'descripcion',
            'prioridad': 'prioridad', 'priority': 'prioridad',
            'activo': 'activo', 'is_active': 'activo',
            'objetivo_principal': 'objetivo_principal', 'main_goal': 'objetivo_principal',
            'lugar_entrenamiento': 'lugar_entrenamiento', 'training_location': 'lugar_entrenamiento',
            'nivel_actividad': 'nivel_actividad', 'activity_level': 'nivel_actividad',
            'genero': 'genero', 'género': 'genero', 'gender': 'genero',
            'dias_min_entrenamiento': 'dias_min', 'min_training_days_per_week': 'dias_min',
            'dias_max_entrenamiento': 'dias_max', 'max_training_days_per_week': 'dias_max',
            'edad_min': 'edad_min', 'age_min': 'edad_min',
            'edad_max': 'edad_max', 'age_max': 'edad_max',
            'restricciones_alimentarias': 'restricciones', 'dietary_restrictions': 'restricciones',
            'equipamiento': 'equipamiento', 'equipment_keywords': 'equipamiento',
            'plan_nutricion': 'plan_nutricion', 'default_nutrition_plan': 'plan_nutricion',
            'programa_entrenamiento': 'programa_entrenamiento', 'default_workout_program': 'programa_entrenamiento',
        }
        canonical_headers = [header_aliases.get(h, h) for h in raw_headers]

        def to_bool(val, default=True):
            if val is None or str(val).strip() == '':
                return default
            return str(val).strip().lower() in ['true', '1', 'yes', 'sí', 'si', 's']

        def to_int_or_none(val):
            try:
                return int(str(val).strip()) if val is not None and str(val).strip() else None
            except (ValueError, TypeError):
                return None

        def to_list(val):
            return [x.strip() for x in str(val).split(',') if x.strip()] if val else []

        def clean(val):
            return str(val).strip() if val is not None else ''

        for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            try:
                row_dict = dict(zip(canonical_headers, row))
                name = clean(row_dict.get('nombre', ''))
                if not name:
                    errors.append(f"Fila {row_num}: 'nombre' es requerido")
                    skipped += 1
                    continue

                nutrition_plan_name = clean(row_dict.get('plan_nutricion', ''))
                workout_program_name = clean(row_dict.get('programa_entrenamiento', ''))

                nutrition_plan = NutritionPlan.objects.filter(name=nutrition_plan_name).first() if nutrition_plan_name else None
                workout_program = WorkoutProgram.objects.filter(name=workout_program_name).first() if workout_program_name else None

                fields = {
                    'description': clean(row_dict.get('descripcion', '')),
                    'priority': to_int_or_none(row_dict.get('prioridad')) or 100,
                    'is_active': to_bool(row_dict.get('activo')),
                    'main_goal': clean(row_dict.get('objetivo_principal', '')) or None,
                    'training_location': clean(row_dict.get('lugar_entrenamiento', '')) or None,
                    'activity_level': clean(row_dict.get('nivel_actividad', '')) or None,
                    'gender': clean(row_dict.get('genero', '')) or None,
                    'min_training_days_per_week': to_int_or_none(row_dict.get('dias_min')),
                    'max_training_days_per_week': to_int_or_none(row_dict.get('dias_max')),
                    'age_min': to_int_or_none(row_dict.get('edad_min')),
                    'age_max': to_int_or_none(row_dict.get('edad_max')),
                    'dietary_restrictions': to_list(row_dict.get('restricciones', '')),
                    'equipment_keywords': to_list(row_dict.get('equipamiento', '')),
                    'default_nutrition_plan': nutrition_plan,
                    'default_workout_program': workout_program,
                }

                config = DefaultPlanConfiguration.objects.filter(name=name).first()
                if config:
                    for k, v in fields.items():
                        setattr(config, k, v)
                    config.save()
                    updated += 1
                else:
                    DefaultPlanConfiguration.objects.create(name=name, **fields)
                    created += 1
            except Exception as e:
                errors.append(f"Fila {row_num}: {str(e)}")
                skipped += 1

        message = f"Importación completada. {created} creadas, {updated} actualizadas"
        if skipped:
            message += f", {skipped} omitidas"
        if errors:
            message += f". {len(errors)} error(es)"

        return Response({
            'created': created,
            'updated': updated,
            'skipped': skipped,
            'message': message,
            'errors': errors[:10] if errors else [],
        }, status=status.HTTP_200_OK)


class HelpSettingsViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar configuración de ayuda
    """
    serializer_class = HelpSettingsSerializer
    permission_classes = [IsAdminUser]
    queryset = HelpSettings.objects.all()
    
    def get_permissions(self):
        # El endpoint 'active' es público
        if self.action == 'active':
            return []
        return [IsAdminUser()]
    
    @action(detail=False, methods=['get'], permission_classes=[], url_path='active', url_name='active')
    def active(self, request):
        """Obtener configuración activa (público)"""
        try:
            settings = HelpSettings.get_active()
            serializer = self.get_serializer(settings)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': f'Error obteniendo configuración: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ProblemReportViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar reportes de problemas
    """
    queryset = ProblemReport.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ProblemReportCreateSerializer
        return ProblemReportSerializer
    
    def get_permissions(self):
        if self.action == 'create':
            # Permitir crear reportes sin autenticación
            return []
        # Solo admin puede ver/editar reportes
        return [IsAdminUser()]
    
    def perform_create(self, serializer):
        # Asignar usuario si está autenticado
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            serializer.save()
        
        # Enviar email de notificación (opcional)
        instance = serializer.instance
        help_settings = HelpSettings.get_active()
        if help_settings.report_enabled and help_settings.report_email:
            try:
                from django.core.mail import send_mail
                from django.conf import settings
                
                subject = f"[NexFit365] Nuevo Reporte: {instance.subject}"
                message = f"""
Se ha recibido un nuevo reporte de problema:

Tipo: {instance.get_problem_type_display()}
Asunto: {instance.subject}
Descripción: {instance.description}

Usuario: {instance.user.email if instance.user else instance.contact_email or 'Anónimo'}
Estado: {instance.get_status_display()}

Ver detalles: {settings.FRONTEND_URL}/admin/problem-reports/{instance.id}/
"""
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [help_settings.report_email],
                    fail_silently=True,
                )
            except Exception as e:
                # No fallar si el email no se puede enviar
                pass
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def resolve(self, request, pk=None):
        """Marcar un reporte como resuelto"""
        report = self.get_object()
        report.status = ProblemReport.Status.RESOLVED
        report.resolved_by = request.user
        report.resolved_at = timezone.now()
        report.save()
        
        serializer = self.get_serializer(report)
        return Response(serializer.data)
