from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DashboardViewSet, WellnessTipViewSet, DefaultPlanConfigurationViewSet, user_stats

router = DefaultRouter()
router.register(r"dashboard", DashboardViewSet, basename="dashboard")
router.register(r"tips", WellnessTipViewSet, basename="tips")
router.register(r"default-plan-configurations", DefaultPlanConfigurationViewSet, basename="default-plan-configurations")

urlpatterns = [
    path("user-stats/", user_stats, name="user-stats"),
    path("", include(router.urls)),
] 