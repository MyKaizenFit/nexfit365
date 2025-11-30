# achievements/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AchievementViewSet, UserAchievementViewSet

# Crear router para las vistas
router = DefaultRouter()
router.register(r'achievements', AchievementViewSet)
router.register(r'user-achievements', UserAchievementViewSet)

urlpatterns = [
    path('', include(router.urls)),
]