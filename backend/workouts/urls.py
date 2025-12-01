# workouts/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ExerciseViewSet, WorkoutProgramViewSet, 
    WorkoutDayViewSet, WorkoutLogViewSet,
    WorkoutPlanTemplateViewSet
)

router = DefaultRouter()
router.register(r'exercises', ExerciseViewSet, basename='exercises')
router.register(r'programs', WorkoutProgramViewSet, basename='programs')
router.register(r'workout-programs', WorkoutProgramViewSet, basename='workout-programs')
router.register(r'workout-logs', WorkoutLogViewSet, basename='workout-logs')
router.register(r'logs', WorkoutLogViewSet, basename='logs')
router.register(r'workout-plan-templates', WorkoutPlanTemplateViewSet, basename='workout-plan-templates')

urlpatterns = [
    path('', include(router.urls)),
]
