from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DashboardViewSet, WellnessTipViewSet, CoachingPlanViewSet, CoachingInquiryViewSet,
    DefaultPlanConfigurationViewSet, HelpSettingsViewSet, ProblemReportViewSet,
    user_stats, subscription_status, start_free_trial
)

router = DefaultRouter()
router.register(r"dashboard", DashboardViewSet, basename="dashboard")
router.register(r"tips", WellnessTipViewSet, basename="tips")
router.register(r"coaching/plans", CoachingPlanViewSet, basename="coaching-plans")
router.register(r"coaching/inquiries", CoachingInquiryViewSet, basename="coaching-inquiries")
router.register(r"default-plan-configurations", DefaultPlanConfigurationViewSet, basename="default-plan-configurations")
router.register(r"help-settings", HelpSettingsViewSet, basename="help-settings")
router.register(r"problem-reports", ProblemReportViewSet, basename="problem-reports")

urlpatterns = [
    path("user-stats/", user_stats, name="user-stats"),
    path("subscription-status/", subscription_status, name="subscription-status"),
    path("start-free-trial/", start_free_trial, name="start-free-trial"),
    path("", include(router.urls)),
]