from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DashboardViewSet, WellnessTipViewSet, DefaultPlanConfigurationViewSet,
    HelpSettingsViewSet, ProblemReportViewSet, user_stats
)

router = DefaultRouter()
router.register(r"dashboard", DashboardViewSet, basename="dashboard")
router.register(r"tips", WellnessTipViewSet, basename="tips")
router.register(r"default-plan-configurations", DefaultPlanConfigurationViewSet, basename="default-plan-configurations")
router.register(r"help-settings", HelpSettingsViewSet, basename="help-settings")
router.register(r"problem-reports", ProblemReportViewSet, basename="problem-reports")

urlpatterns = [
    path("user-stats/", user_stats, name="user-stats"),
    path("", include(router.urls)),
] 