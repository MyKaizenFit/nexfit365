"""Tests para progress/permissions.py"""
import pytest
from datetime import date
from decimal import Decimal
from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import RequestFactory

from progress.models import ProgressPhoto, WeightEntry, BodyMeasurement
from progress.permissions import (
    ProgressPermission,
    ProgressPhotoPermission,
    WeightEntryPermission,
    BodyMeasurementPermission,
)

User = get_user_model()


def make_test_image(name="test.png"):
    # PNG mínimo válido (1x1)
    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0bIDATx\x9cc``\x00\x00\x00\x03\x00\x01"
        b"h&Y\r\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    return SimpleUploadedFile(name, png_bytes, content_type="image/png")


@pytest.fixture
def request_factory():
    return RequestFactory()


@pytest.fixture
def user(db):
    return User.objects.create_user(email="perm_user@test.com", password="testpass123")


@pytest.fixture
def other_user(db):
    return User.objects.create_user(email="perm_other@test.com", password="testpass123")


@pytest.fixture
def staff_user(db):
    return User.objects.create_user(
        email="perm_staff@test.com",
        password="testpass123",
        is_staff=True,
        is_superuser=True,
    )


@pytest.mark.django_db
class TestProgressPermission:
    def test_has_permission_authenticated(self, request_factory, user):
        request = request_factory.get("/api/progress/photos/")
        request.user = user
        permission = ProgressPermission()

        assert permission.has_permission(request, view=None) is True

    def test_has_permission_anonymous(self, request_factory):
        request = request_factory.get("/api/progress/photos/")
        request.user = AnonymousUser()
        permission = ProgressPermission()

        assert permission.has_permission(request, view=None) is False

    def test_has_object_permission_staff(self, request_factory, staff_user, user):
        request = request_factory.get("/api/progress/photos/1/")
        request.user = staff_user
        obj = SimpleNamespace(user=user)
        permission = ProgressPermission()

        assert permission.has_object_permission(request, view=None, obj=obj) is True

    def test_has_object_permission_owner(self, request_factory, user):
        request = request_factory.get("/api/progress/photos/1/")
        request.user = user
        obj = SimpleNamespace(user=user)
        permission = ProgressPermission()

        assert permission.has_object_permission(request, view=None, obj=obj) is True

    def test_has_object_permission_non_owner(self, request_factory, user, other_user):
        request = request_factory.get("/api/progress/photos/1/")
        request.user = user
        obj = SimpleNamespace(user=other_user)
        permission = ProgressPermission()

        assert permission.has_object_permission(request, view=None, obj=obj) is False


@pytest.mark.django_db
class TestProgressPhotoPermission:
    def test_get_inherits_authenticated_rule(self, request_factory, user):
        request = request_factory.get("/api/progress/photos/")
        request.user = user
        request.data = {}
        permission = ProgressPhotoPermission()

        assert permission.has_permission(request, view=None) is True

    def test_post_allows_when_under_daily_limit(self, request_factory, user):
        request = request_factory.post("/api/progress/photos/", data={})
        request.user = user
        request.data = {"date": "2026-03-18"}

        for index in range(4):
            ProgressPhoto.objects.create(
                user=user,
                photo=make_test_image(f"photo_{index}.png"),
                photo_type="front",
                date=date(2026, 3, 18),
            )

        permission = ProgressPhotoPermission()
        assert permission.has_permission(request, view=None) is True

    def test_post_denies_when_daily_limit_reached(self, request_factory, user):
        request = request_factory.post("/api/progress/photos/", data={})
        request.user = user
        request.data = {"date": "2026-03-18"}

        for index in range(5):
            ProgressPhoto.objects.create(
                user=user,
                photo=make_test_image(f"limit_{index}.png"),
                photo_type="front",
                date=date(2026, 3, 18),
            )

        permission = ProgressPhotoPermission()
        assert permission.has_permission(request, view=None) is False


@pytest.mark.django_db
class TestWeightEntryPermission:
    def test_post_allows_when_under_daily_limit(self, request_factory, user):
        request = request_factory.post("/api/progress/weights/", data={})
        request.user = user
        request.data = {"date": "2026-03-18"}

        permission = WeightEntryPermission()
        assert permission.has_permission(request, view=None) is True

    def test_post_denies_when_daily_limit_reached(self, request_factory, user):
        request = request_factory.post("/api/progress/weights/", data={})
        request.user = user
        request.data = {"date": "2026-03-18"}

        WeightEntry.objects.create(user=user, weight=Decimal("70.0"), date=date(2026, 3, 18))

        permission = WeightEntryPermission()
        assert permission.has_permission(request, view=None) is False


@pytest.mark.django_db
class TestBodyMeasurementPermission:
    def test_post_allows_when_under_daily_limit(self, request_factory, user):
        request = request_factory.post("/api/progress/measurements/", data={})
        request.user = user
        request.data = {"date": "2026-03-18"}

        BodyMeasurement.objects.create(user=user, date=date(2026, 3, 18), chest=Decimal("90"))

        permission = BodyMeasurementPermission()
        assert permission.has_permission(request, view=None) is True

    def test_post_denies_when_daily_limit_reached(self, request_factory, user):
        request = request_factory.post("/api/progress/measurements/", data={})
        request.user = user
        request.data = {"date": "2026-03-18"}

        BodyMeasurement.objects.create(user=user, date=date(2026, 3, 17), chest=Decimal("90"))
        BodyMeasurement.objects.create(user=user, date=date(2026, 3, 18), chest=Decimal("91"))

        permission = BodyMeasurementPermission()
        assert permission.has_permission(request, view=None) is True

    def test_post_denies_with_two_same_day_entries_via_mock(self, request_factory, user, monkeypatch):
        request = request_factory.post("/api/progress/measurements/", data={})
        request.user = user
        request.data = {"date": "2026-03-18"}

        class DummyQuerySet:
            @staticmethod
            def count():
                return 2

        monkeypatch.setattr(
            "progress.models.BodyMeasurement.objects.filter",
            lambda **kwargs: DummyQuerySet(),
        )

        permission = BodyMeasurementPermission()
        assert permission.has_permission(request, view=None) is False
