# achievements/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AchievementViewSet, UserAchievementViewSet, complete_day

# Crear router para las vistas
router = DefaultRouter()
router.register(r'achievements', AchievementViewSet)
router.register(r'user-achievements', UserAchievementViewSet)

urlpatterns = [
    path('achievements/complete-day/', complete_day, name='achievements-complete-day'),
    path('', include(router.urls)),
]
