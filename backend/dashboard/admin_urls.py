"""
URLs para el panel de administración del dashboard
"""
from django.urls import path
from .admin_dashboard_views import admin_dashboard_stats, admin_dashboard_activity

urlpatterns = [
    path('stats/', admin_dashboard_stats, name='admin_dashboard_stats'),
    path('activity/', admin_dashboard_activity, name='admin_dashboard_activity'),
]



