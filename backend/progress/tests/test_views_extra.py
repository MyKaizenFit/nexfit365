"""Cobertura adicional para progress/views.py"""
import pytest
import sys
import types
from datetime import date
from decimal import Decimal
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from progress.models import ProgressPhoto, WeightEntry, BodyMeasurement, DailyWellness

User = get_user_model()


def make_test_image(name="test.png"):
    file_obj = BytesIO()
    file_obj.write(
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0bIDATx\x9cc``\x00\x00\x00\x03\x00\x01"
        b"h&Y\r\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    file_obj.seek(0)
    return SimpleUploadedFile(name, file_obj.read(), content_type="image/png")


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="progress_extra@test.com",
        password="testpass123",
    )


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestProgressPhotoExtraActions:
    def test_test_upload_action(self, auth_client):
        response = auth_client.get(reverse("progress-photos-test-upload"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "ok"

    def test_summary_without_data(self, auth_client):
        response = auth_client.get(reverse("progress-photos-summary"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["total_photos"] == 0
        assert response.data["total_weight_entries"] == 0
        assert response.data["total_measurements"] == 0

    def test_summary_with_weight_change(self, auth_client, user):
        ProgressPhoto.objects.create(
            user=user,
            photo=make_test_image("first.png"),
            photo_type="front",
            date=date(2026, 3, 1),
            weight=Decimal("80.0"),
        )
        ProgressPhoto.objects.create(
            user=user,
            photo=make_test_image("last.png"),
            photo_type="front",
            date=date(2026, 3, 18),
            weight=Decimal("78.0"),
        )

        response = auth_client.get(reverse("progress-photos-summary"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["total_photos"] == 2
        assert response.data["weight_change"] is not None


@pytest.mark.django_db
class TestWeightAndMeasurementSummary:
    def test_weight_summary(self, auth_client, user):
        WeightEntry.objects.create(user=user, weight=Decimal("82.0"), date=date(2026, 3, 1))
        WeightEntry.objects.create(user=user, weight=Decimal("80.0"), date=date(2026, 3, 10))

        response = auth_client.get(reverse("weight-history-summary"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["total_entries"] == 2

    def test_measurement_summary(self, auth_client, user):
        BodyMeasurement.objects.create(user=user, date=date(2026, 3, 1), chest=Decimal("95.0"))

        response = auth_client.get(reverse("measurements-summary"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["total_measurements"] == 1


@pytest.mark.django_db
class TestProgressStatsViewSet:
    def test_dashboard_requires_auth(self):
        client = APIClient()
        response = client.get(reverse("progress-stats-dashboard"))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_dashboard_success_no_data(self, auth_client):
        response = auth_client.get(reverse("progress-stats-dashboard"))
        assert response.status_code == status.HTTP_200_OK
        assert "overall_progress" in response.data

    def test_analysis_success(self, auth_client, monkeypatch):
        fake_module = types.ModuleType("progress.services")

        class FakeService:
            def __init__(self, user):
                self.user = user

            def get_comprehensive_analysis(self, weeks):
                return {"weeks": weeks, "ok": True}

            def should_suggest_plan_adjustment(self):
                return True, {"reason": "plateau"}

        fake_module.ProgressAnalysisService = FakeService
        monkeypatch.setitem(sys.modules, "progress.services", fake_module)

        response = auth_client.get(reverse("progress-stats-analysis"), {"weeks": 4})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["ok"] is True
        assert "plan_adjustment_suggestion" in response.data

    def test_analysis_error_path(self, auth_client, monkeypatch):
        fake_module = types.ModuleType("progress.services")

        class BrokenService:
            def __init__(self, user):
                raise RuntimeError("boom")

        fake_module.ProgressAnalysisService = BrokenService
        monkeypatch.setitem(sys.modules, "progress.services", fake_module)

        response = auth_client.get(reverse("progress-stats-analysis"), {"weeks": 4})
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "error" in response.data


@pytest.mark.django_db
class TestDailyWellnessExtra:
    def test_today_without_entry(self, auth_client):
        response = auth_client.get(reverse("daily-wellness-today"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["exists"] is False

    def test_today_with_entry(self, auth_client, user):
        DailyWellness.objects.create(
            user=user,
            date=date.today(),
            sleep_hours=Decimal("7.5"),
            motivation_score=4,
            notes="bien",
        )
        response = auth_client.get(reverse("daily-wellness-today"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["date"] == date.today().isoformat()

    def test_create_daily_wellness(self, auth_client):
        response = auth_client.post(
            reverse("daily-wellness-list"),
            {
                "date": "2026-03-18",
                "sleep_hours": "8.0",
                "motivation_score": 5,
                "notes": "ok",
            },
            format="json",
        )
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST]
