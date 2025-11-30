from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProgressPhotoViewSet, WeightEntryViewSet, BodyMeasurementViewSet, ProgressStatsViewSet

router = DefaultRouter()
router.register(r"progress-photos", ProgressPhotoViewSet, basename="progress-photos")
router.register(r"weight-history", WeightEntryViewSet, basename="weight-history")
router.register(r"measurements", BodyMeasurementViewSet, basename="measurements")
router.register(r"progress-stats", ProgressStatsViewSet, basename="progress-stats")

urlpatterns = [
    path("", include(router.urls)),
] 