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
]
