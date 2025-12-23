# notifications/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, PushSubscriptionViewSet

# Crear router para las vistas
router = DefaultRouter()
router.register(r'notifications', NotificationViewSet)
router.register(r'push-subscriptions', PushSubscriptionViewSet, basename='push-subscriptions')

urlpatterns = [
    path('', include(router.urls)),
]