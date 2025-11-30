# workouts/admin_exercise_urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import admin_exercise_views

router = DefaultRouter()
router.register(r'exercises', admin_exercise_views.AdminExerciseViewSet, basename='admin-exercises')

urlpatterns = [
    path('', include(router.urls)),
]
