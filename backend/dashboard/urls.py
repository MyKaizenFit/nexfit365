from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DashboardViewSet, user_stats

router = DefaultRouter()
router.register(r"dashboard", DashboardViewSet, basename="dashboard")

urlpatterns = [
    path("user-stats/", user_stats, name="user-stats"),
    path("dashboard/", include(router.urls)),
] 