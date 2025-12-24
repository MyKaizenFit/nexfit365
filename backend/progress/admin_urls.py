from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .admin_views import AdminWeightEntryViewSet, AdminDailyWellnessViewSet

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

urlpatterns = [
    path("", include(router.urls)),
]


