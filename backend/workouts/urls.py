# workouts/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ExerciseViewSet, WorkoutProgramViewSet, 
    WorkoutDayViewSet, WorkoutLogViewSet
)

router = DefaultRouter()
router.register(r'exercises', ExerciseViewSet, basename='exercises')
router.register(r'programs', WorkoutProgramViewSet, basename='programs')
router.register(r'logs', WorkoutLogViewSet, basename='workout-logs')

urlpatterns = [
    path('', include(router.urls)),
]
