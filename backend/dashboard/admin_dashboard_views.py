"""
Vistas para el panel de administración
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
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
    
    # Estadísticas de usuarios
    total_users = CustomUser.objects.count()
    active_users = CustomUser.objects.filter(is_active=True).count()
    admins = CustomUser.objects.filter(
        Q(is_superuser=True) | Q(is_staff=True) | Q(role='admin') | Q(role='trainer')
    ).count()
    new_users_today = CustomUser.objects.filter(date_joined__date=today).count()
    new_users_week = CustomUser.objects.filter(date_joined__date__gte=week_start).count()
    new_users_month = CustomUser.objects.filter(date_joined__date__gte=month_start).count()
    
    # Estadísticas de entrenamientos
    total_workout_logs = WorkoutLog.objects.count()
    workouts_today = WorkoutLog.objects.filter(date=today).count()
    workouts_week = WorkoutLog.objects.filter(date__gte=week_start).count()
    total_programs = WorkoutProgram.objects.count()  # Total: activos + inactivos
    active_programs = WorkoutProgram.objects.filter(is_active=True).count()
    
    # Estadísticas de nutrición
    total_meal_logs = MealLog.objects.count()
    meals_today = MealLog.objects.filter(date=today).count()
    meals_week = MealLog.objects.filter(date__gte=week_start).count()
    total_nutrition_plans = NutritionPlan.objects.count()  # Total: activos + inactivos
    active_nutrition_plans = NutritionPlan.objects.filter(is_active=True).count()
    
    # Estadísticas de notificaciones
    total_notifications = Notification.objects.count()
    unread_notifications = Notification.objects.filter(read_at__isnull=True).count()
    
    # Estadísticas de progreso
    total_weight_entries = WeightEntry.objects.count()
    weight_entries_today = WeightEntry.objects.filter(date=today).count()
    total_progress_photos = ProgressPhoto.objects.count()
    
    # Estadísticas de logros
    total_achievements_unlocked = UserAchievement.objects.count()
    achievements_today = UserAchievement.objects.filter(unlocked_at__date=today).count()
    total_points_awarded = UserAchievement.objects.aggregate(
        total=Sum('achievement__points')
    )['total'] or 0
    
    # Métricas de engagement
    # Usuarios activos en los últimos 7 días (con al menos 1 log)
    active_last_7_days = CustomUser.objects.filter(
        workout_logs__date__gte=today - timedelta(days=7)
    ).distinct().count()
    
    # Usuarios activos en los últimos 30 días
    active_last_30_days = CustomUser.objects.filter(
        workout_logs__date__gte=today - timedelta(days=30)
    ).distinct().count()
    
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
    
    # Nuevos usuarios (últimos 10)
    new_users = CustomUser.objects.order_by('-date_joined')[:10]
    for user in new_users:
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
    recent_workouts = WorkoutLog.objects.select_related('user').order_by('-created_at')[:10]
    for workout in recent_workouts:
        status = "completado" if workout.completed else "registrado"
        activities.append({
            "type": "workout",
            "icon": "dumbbell",
            "message": f"{workout.user.email} ha {status} un entrenamiento",
            "user_id": str(workout.user.id),
            "user_email": workout.user.email,
            "timestamp": workout.created_at.isoformat(),
            "time_ago": get_time_ago(workout.created_at),
        })
    
    # Comidas registradas recientes (últimos 10)
    recent_meals = MealLog.objects.select_related('user').order_by('-created_at')[:10]
    for meal in recent_meals:
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



