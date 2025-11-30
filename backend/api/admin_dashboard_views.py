# api/admin_dashboard_views.py
from rest_framework.decorators import api_view, permission_classes
from accounts.permissions import IsAdminOrStaff
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from django.contrib.auth import get_user_model
from workouts.models import WorkoutLog, WorkoutProgram
from notifications.models import Notification
from progress.models import ProgressPhoto, WeightEntry

User = get_user_model()

@api_view(['GET'])
@permission_classes([IsAdminOrStaff])
def admin_dashboard_stats(request):
    """Estadísticas generales para el dashboard de administrador"""
    
    # Estadísticas de usuarios
    total_users = User.objects.count()
    active_users = User.objects.filter(is_active=True).count()
    new_users_30_days = User.objects.filter(
        created_at__gte=timezone.now() - timedelta(days=30)
    ).count()
    recently_active_users = User.objects.filter(
        last_login__gte=timezone.now() - timedelta(days=7)
    ).count()
    
    # Distribución por roles
    role_distribution = list(
        User.objects.values('role').annotate(count=Count('role'))
    )
    
    # Estadísticas de entrenamientos
    total_workout_logs = WorkoutLog.objects.count()
    recent_workout_logs = WorkoutLog.objects.filter(
        date__gte=timezone.now() - timedelta(days=30)
    ).count()
    total_programs = WorkoutProgram.objects.count()
    active_programs = WorkoutProgram.objects.filter(is_active=True).count()
    
    # Estadísticas de progreso
    total_progress_photos = ProgressPhoto.objects.count()
    total_weight_entries = WeightEntry.objects.count()
    recent_progress_photos = ProgressPhoto.objects.filter(
        created_at__gte=timezone.now() - timedelta(days=30)
    ).count()
    
    # Estadísticas de notificaciones
    total_notifications = Notification.objects.count()
    unread_notifications = Notification.objects.filter(read_at__isnull=True).count()
    recent_notifications = Notification.objects.filter(
        created_at__gte=timezone.now() - timedelta(days=30)
    ).count()
    
    # Usuarios más activos (más logs de entrenamiento)
    most_active_users = list(
        WorkoutLog.objects.values('user__email', 'user__first_name', 'user__last_name')
        .annotate(workout_count=Count('id'))
        .order_by('-workout_count')[:5]
    )
    
    # Programas más populares
    popular_programs = list(
        WorkoutLog.objects.values('workout_day__program__name')
        .annotate(usage_count=Count('id'))
        .order_by('-usage_count')[:5]
    )
    
    return Response({
        'users': {
            'total': total_users,
            'active': active_users,
            'new_last_30_days': new_users_30_days,
            'recently_active': recently_active_users,
            'role_distribution': role_distribution,
        },
        'workouts': {
            'total_logs': total_workout_logs,
            'recent_logs_30_days': recent_workout_logs,
            'total_programs': total_programs,
            'active_programs': active_programs,
            'most_active_users': most_active_users,
            'popular_programs': popular_programs,
        },
        'progress': {
            'total_photos': total_progress_photos,
            'total_weight_entries': total_weight_entries,
            'recent_photos_30_days': recent_progress_photos,
        },
        'notifications': {
            'total': total_notifications,
            'unread': unread_notifications,
            'recent_30_days': recent_notifications,
        },
        'generated_at': timezone.now().isoformat(),
    })

@api_view(['GET'])
@permission_classes([IsAdminOrStaff])
def admin_recent_activity(request):
    """Actividad reciente para el dashboard de administrador"""
    
    # Usuarios recién registrados (últimos 7 días)
    recent_users = list(
        User.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=7)
        ).values(
            'id', 'email', 'first_name', 'last_name', 'role', 'created_at'
        ).order_by('-created_at')[:10]
    )
    
    # Entrenamientos recientes (últimos 7 días)
    recent_workouts = list(
        WorkoutLog.objects.filter(
            date__gte=timezone.now() - timedelta(days=7)
        ).select_related('user', 'workout_day__program').values(
            'id', 'user__email', 'user__first_name', 'user__last_name',
            'workout_day__program__name', 'date', 'created_at'
        ).order_by('-created_at')[:10]
    )
    
    # Progreso reciente (últimos 7 días)
    recent_progress = list(
        ProgressPhoto.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=7)
        ).select_related('user').values(
            'id', 'user__email', 'user__first_name', 'user__last_name',
            'created_at'
        ).order_by('-created_at')[:10]
    )
    
    # Notificaciones recientes (últimos 7 días)
    recent_notifications = list(
        Notification.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=7)
        ).select_related('user').values(
            'id', 'user__email', 'user__first_name', 'user__last_name',
            'title', 'type', 'created_at'
        ).order_by('-created_at')[:10]
    )
    
    return Response({
        'recent_users': recent_users,
        'recent_workouts': recent_workouts,
        'recent_progress': recent_progress,
        'recent_notifications': recent_notifications,
        'generated_at': timezone.now().isoformat(),
    })
