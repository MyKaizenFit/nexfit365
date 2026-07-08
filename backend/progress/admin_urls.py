from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .admin_views import (
    AdminWeightEntryViewSet,
    AdminDailyWellnessViewSet,
    AdminProgressPhotoViewSet,
    AdminRestWellnessAssessmentViewSet,
)

router = DefaultRouter()
router.register(
    r"users/(?P<user_id>[^/.]+)/weight-history",
    AdminWeightEntryViewSet,
    basename="admin-weight-history",
)
router.register(
    r"users/(?P<user_id>[^/.]+)/wellness",
    AdminDailyWellnessViewSet,
    basename="admin-wellness",
)
router.register(
    r"users/(?P<user_id>[^/.]+)/photos",
    AdminProgressPhotoViewSet,
    basename="admin-progress-photos",
)
router.register(
    r"users/(?P<user_id>[^/.]+)/rest-wellness",
    AdminRestWellnessAssessmentViewSet,
    basename="admin-rest-wellness",
)

urlpatterns = [
    path("", include(router.urls)),
]


