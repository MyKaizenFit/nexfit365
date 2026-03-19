# notifications/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, PushSubscriptionViewSet
from .views import AdminMessageViewSet

# Crear router para las vistas
router = DefaultRouter()
router.register(r'notifications', NotificationViewSet)
router.register(r'push-subscriptions', PushSubscriptionViewSet, basename='push-subscriptions')
router.register(r'admin-messages', AdminMessageViewSet, basename='admin-messages')

urlpatterns = [
    path('', include(router.urls)),
]