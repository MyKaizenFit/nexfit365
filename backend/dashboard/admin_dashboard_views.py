"""
Vistas para el panel de administración
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.db import DatabaseError
from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from datetime import timedelta

from accounts.models import CustomUser
from workouts.models import WorkoutLog, WorkoutProgram
from nutrition.models import MealLog, NutritionPlan
from progress.models import WeightEntry, ProgressPhoto
from achievements.models import UserAchievement
from notifications.models import Notification


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_dashboard_stats(request):
    """
    Estadísticas generales del panel de administración
    """
    today = timezone.now().date()
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)
    
    def safe_count(qs):
        try:
            return qs.count()
        except DatabaseError:
            return 0

    # Estadísticas de usuarios
    total_users = safe_count(CustomUser.objects.all())
    active_users = safe_count(CustomUser.objects.filter(is_active=True))
    admins = safe_count(CustomUser.objects.filter(
        Q(is_superuser=True) | Q(is_staff=True) | Q(role='admin') | Q(role='trainer')
    ))
    new_users_today = safe_count(CustomUser.objects.filter(date_joined__date=today))
    new_users_week = safe_count(CustomUser.objects.filter(date_joined__date__gte=week_start))
    new_users_month = safe_count(CustomUser.objects.filter(date_joined__date__gte=month_start))
    
    # Estadísticas de entrenamientos
    total_workout_logs = safe_count(WorkoutLog.objects.all())
    workouts_today = safe_count(WorkoutLog.objects.filter(date=today))
    workouts_week = safe_count(WorkoutLog.objects.filter(date__gte=week_start))
    total_programs = safe_count(WorkoutProgram.objects.all())  # Total: activos + inactivos
    active_programs = safe_count(WorkoutProgram.objects.filter(is_active=True))
    
    # Estadísticas de nutrición
    total_meal_logs = safe_count(MealLog.objects.all())
    meals_today = safe_count(MealLog.objects.filter(date=today))
    meals_week = safe_count(MealLog.objects.filter(date__gte=week_start))
    total_nutrition_plans = safe_count(NutritionPlan.objects.all())  # Total: activos + inactivos
    active_nutrition_plans = safe_count(NutritionPlan.objects.filter(is_active=True))
    
    # Estadísticas de notificaciones
    total_notifications = safe_count(Notification.objects.all())
    unread_notifications = safe_count(Notification.objects.filter(read_at__isnull=True))
    
    # Estadísticas de progreso
    total_weight_entries = safe_count(WeightEntry.objects.all())
    weight_entries_today = safe_count(WeightEntry.objects.filter(date=today))
    total_progress_photos = safe_count(ProgressPhoto.objects.all())
    
    # Estadísticas de logros
    total_achievements_unlocked = safe_count(UserAchievement.objects.all())
    achievements_today = safe_count(UserAchievement.objects.filter(unlocked_at__date=today))
    try:
        total_points_awarded = UserAchievement.objects.aggregate(
            total=Sum('achievement__points')
        )['total'] or 0
    except DatabaseError:
        total_points_awarded = 0
    
    # Métricas de engagement
    # Usuarios activos en los últimos 7 días (con al menos 1 log)
    try:
        active_last_7_days = CustomUser.objects.filter(
            workout_logs__date__gte=today - timedelta(days=7)
        ).distinct().count()
    except DatabaseError:
        active_last_7_days = 0
    
    # Usuarios activos en los últimos 30 días
    try:
        active_last_30_days = CustomUser.objects.filter(
            workout_logs__date__gte=today - timedelta(days=30)
        ).distinct().count()
    except DatabaseError:
        active_last_30_days = 0
    
    return Response({
        "users": {
            "total": total_users,
            "active": active_users,
            "admins": admins,
            "new_today": new_users_today,
            "new_week": new_users_week,
            "new_month": new_users_month,
            "active_last_7_days": active_last_7_days,
            "active_last_30_days": active_last_30_days,
        },
        "workouts": {
            "total_logs": total_workout_logs,
            "today": workouts_today,
            "week": workouts_week,
            "total_programs": total_programs,  # Total: activos + inactivos
            "active_programs": active_programs,
        },
        "nutrition": {
            "total_logs": total_meal_logs,
            "today": meals_today,
            "week": meals_week,
            "total_plans": total_nutrition_plans,  # Total: activos + inactivos
            "active_plans": active_nutrition_plans,
            "total_meal_logs": total_meal_logs,  # Para compatibilidad con frontend
        },
        "progress": {
            "total_weight_entries": total_weight_entries,
            "weight_entries_today": weight_entries_today,
            "total_photos": total_progress_photos,
        },
        "notifications": {
            "total": total_notifications,
            "unread": unread_notifications,
        },
        "achievements": {
            "total_unlocked": total_achievements_unlocked,
            "unlocked_today": achievements_today,
            "total_points_awarded": total_points_awarded,
        },
        "summary": {
            "total_users": total_users,
            "active_users": active_users,
            "total_workouts": total_workout_logs,
            "total_meals": total_meal_logs,
        }
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_dashboard_activity(request):
    """
    Actividad reciente del sistema
    """
    limit = int(request.query_params.get('limit', 20))
    today = timezone.now()
    
    # Obtener actividad reciente de diferentes fuentes
    activities = []
    
    recent_users_data = []
    recent_workout_logs_data = []
    recent_meal_logs_data = []

    # Nuevos usuarios (últimos 10)
    new_users = CustomUser.objects.order_by('-date_joined')[:10]
    for user in new_users:
        recent_users_data.append({
            "id": str(user.id),
            "email": user.email,
            "joined": user.date_joined.isoformat(),
        })
        activities.append({
            "type": "new_user",
            "icon": "user-plus",
            "message": f"Nuevo usuario registrado: {user.email}",
            "user_id": str(user.id),
            "user_email": user.email,
            "timestamp": user.date_joined.isoformat(),
            "time_ago": get_time_ago(user.date_joined),
        })
    
    # Entrenamientos recientes (últimos 10)
    recent_workouts = WorkoutLog.objects.select_related(
        'user',
        'workout_day',
        'workout_day__program',
    ).order_by('-created_at')[:10]
    for workout in recent_workouts:
        status = "completado" if workout.completed else "registrado"
        program_name = ""
        workout_day_name = ""
        if workout.workout_day:
            workout_day_name = workout.workout_day.name or ""
            if workout.workout_day.program:
                program_name = workout.workout_day.program.name or ""

        workout_data = {
            "id": str(workout.id),
            "user_id": str(workout.user.id),
            "user_email": workout.user.email,
            "program_name": program_name or workout_day_name or "Entrenamiento",
            "workout_day_name": workout_day_name,
            "date": workout.created_at.isoformat(),
            "workout_date": workout.date.isoformat() if workout.date else None,
            "completed": workout.completed,
            "rating": workout.rating,
            "notes": (workout.notes or "").strip(),
        }
        recent_workout_logs_data.append(workout_data)
        activities.append({
            "type": "workout",
            "icon": "dumbbell",
            "message": f"{workout.user.email} ha {status} un entrenamiento",
            "user_id": str(workout.user.id),
            "user_email": workout.user.email,
            "program_name": workout_data["program_name"],
            "workout_day_name": workout_day_name,
            "notes": workout_data["notes"],
            "rating": workout.rating,
            "timestamp": workout.created_at.isoformat(),
            "time_ago": get_time_ago(workout.created_at),
        })
    
    # Comidas registradas recientes (últimos 10)
    recent_meals = MealLog.objects.select_related('user').order_by('-created_at')[:10]
    for meal in recent_meals:
        recent_meal_logs_data.append({
            "id": str(meal.id),
            "user_id": str(meal.user.id),
            "user_email": meal.user.email,
            "meal_name": getattr(meal, "meal_name", "") or getattr(meal, "meal_type", "") or "Comida",
            "date": meal.created_at.isoformat(),
        })
        activities.append({
            "type": "meal",
            "icon": "utensils",
            "message": f"{meal.user.email} ha registrado una comida",
            "user_id": str(meal.user.id),
            "user_email": meal.user.email,
            "timestamp": meal.created_at.isoformat(),
            "time_ago": get_time_ago(meal.created_at),
        })
    
    # Logros desbloqueados recientes (últimos 10)
    recent_achievements = UserAchievement.objects.select_related(
        'user', 'achievement'
    ).order_by('-unlocked_at')[:10]
    for ua in recent_achievements:
        activities.append({
            "type": "achievement",
            "icon": "trophy",
            "message": f"{ua.user.email} ha desbloqueado '{ua.achievement.name}'",
            "user_id": str(ua.user.id),
            "user_email": ua.user.email,
            "achievement_name": ua.achievement.name,
            "timestamp": ua.unlocked_at.isoformat(),
            "time_ago": get_time_ago(ua.unlocked_at),
        })
    
    # Fotos de progreso recientes (últimos 5)
    recent_photos = ProgressPhoto.objects.select_related('user').order_by('-created_at')[:5]
    for photo in recent_photos:
        activities.append({
            "type": "progress_photo",
            "icon": "camera",
            "message": f"{photo.user.email} ha subido una foto de progreso",
            "user_id": str(photo.user.id),
            "user_email": photo.user.email,
            "timestamp": photo.created_at.isoformat(),
            "time_ago": get_time_ago(photo.created_at),
        })
    
    # Ordenar por timestamp (más reciente primero)
    activities.sort(key=lambda x: x['timestamp'], reverse=True)
    
    # Limitar resultados
    activities = activities[:limit]
    
    return Response({
        "activities": activities,
        "recent_users": recent_users_data,
        "recent_workout_logs": recent_workout_logs_data,
        "recent_meal_logs": recent_meal_logs_data,
        "total": len(activities),
    })


def get_time_ago(dt):
    """
    Devuelve una descripción legible del tiempo transcurrido
    """
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt)
    
    now = timezone.now()
    diff = now - dt
    
    seconds = diff.total_seconds()
    
    if seconds < 60:
        return "Hace un momento"
    elif seconds < 3600:
        minutes = int(seconds // 60)
        return f"Hace {minutes} minuto{'s' if minutes != 1 else ''}"
    elif seconds < 86400:
        hours = int(seconds // 3600)
        return f"Hace {hours} hora{'s' if hours != 1 else ''}"
    elif seconds < 604800:
        days = int(seconds // 86400)
        return f"Hace {days} día{'s' if days != 1 else ''}"
    else:
        weeks = int(seconds // 604800)
        return f"Hace {weeks} semana{'s' if weeks != 1 else ''}"


