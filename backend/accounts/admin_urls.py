# accounts/admin_urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import admin_views

router = DefaultRouter()
router.register(r'', admin_views.AdminUserViewSet, basename='admin-users')

urlpatterns = [
    path('', include(router.urls)),
]
