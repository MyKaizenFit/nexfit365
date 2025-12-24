# workouts/admin_urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import admin_views

router = DefaultRouter()
router.register(r'exercises', admin_views.AdminExerciseViewSet, basename='admin-exercises')
router.register(r'programs', admin_views.AdminWorkoutProgramViewSet, basename='admin-programs')
router.register(r'days', admin_views.AdminWorkoutDayViewSet, basename='admin-days')

urlpatterns = [
    path('', include(router.urls)),
    # Endpoints específicos por usuario (solo admin/staff)
    path('users/<int:user_id>/program/', admin_views.admin_user_program, name='admin-user-program'),
    path('users/<int:user_id>/workout-logs/', admin_views.admin_user_workout_logs, name='admin-user-workout-logs'),
    path('users/<int:user_id>/workout-logs/<uuid:log_id>/', admin_views.admin_user_workout_log_detail, name='admin-user-workout-log-detail'),
    path('users/<int:user_id>/workout-stats/', admin_views.admin_user_workout_stats, name='admin-user-workout-stats'),
]
