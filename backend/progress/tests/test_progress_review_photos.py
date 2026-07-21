"""Tests for quinzenal status, photo types, idempotency, timeline and comparison."""
from datetime import date, timedelta
from decimal import Decimal
from io import BytesIO

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from progress.models import ProgressPhoto, WeightEntry, BodyMeasurement
from progress.timeline import build_progress_timeline, first_last_by_type

User = get_user_model()


def make_test_image(name="test.png"):
    from PIL import Image

    file_obj = BytesIO()
    image = Image.new("RGB", (2, 2), color=(255, 0, 0))
    image.save(file_obj, format="PNG")
    file_obj.seek(0)
    return SimpleUploadedFile(name, file_obj.read(), content_type="image/png")


@pytest.fixture
def user(db):
    return User.objects.create_user(email="review_photos@test.com", password="testpass123")


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestQuinzenalPhotoStatus:
    def test_needs_photos_when_empty(self, auth_client):
        response = auth_client.get(reverse("progress-stats-quinzenal-review"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["needs_photos"] is True

    def test_photos_with_old_date_but_recent_upload_clear_pending(self, auth_client, user):
        today = timezone.localdate()
        photo = ProgressPhoto.objects.create(
            user=user,
            photo=make_test_image("recent.png"),
            photo_type="front",
            date=today - timedelta(days=40),
            weight=Decimal("70.0"),
        )
        # created_at is auto_now_add; force recent created_at via update
        ProgressPhoto.objects.filter(pk=photo.pk).update(
            created_at=timezone.now() - timedelta(hours=1)
        )

        response = auth_client.get(reverse("progress-stats-quinzenal-review"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["needs_photos"] is False
        assert response.data["photos_last_15_days"] >= 1

    def test_photos_and_weight_without_measurements_still_needs_measurements(self, auth_client, user):
        today = timezone.localdate()
        ProgressPhoto.objects.create(
            user=user,
            photo=make_test_image("front.png"),
            photo_type="front",
            date=today,
        )
        WeightEntry.objects.create(user=user, weight=Decimal("72.0"), date=today)

        response = auth_client.get(reverse("progress-stats-quinzenal-review"))
        assert response.data["needs_photos"] is False
        assert response.data["needs_measurements"] is True
        assert response.data["can_send"] is False


@pytest.mark.django_db
class TestPhotoIdempotencyAndTypes:
    def test_left_right_side_accepted(self, auth_client):
        today = timezone.localdate().isoformat()
        response = auth_client.post(
            reverse("progress-photos-list"),
            {
                "photo": make_test_image("left.png"),
                "photo_type": "left_side",
                "date": today,
                "weight": "71.5",
            },
            format="multipart",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["photo_type"] == "left_side"

    def test_idempotency_key_returns_same_photo(self, auth_client, user):
        today = timezone.localdate().isoformat()
        payload = {
            "photo": make_test_image("dup.png"),
            "photo_type": "back",
            "date": today,
            "weight": "70.0",
        }
        headers = {"HTTP_IDEMPOTENCY_KEY": "test-key-abc-123"}

        first = auth_client.post(
            reverse("progress-photos-list"), payload, format="multipart", **headers
        )
        assert first.status_code == status.HTTP_201_CREATED
        photo_id = first.data["id"]

        # Second POST with same key must not create another row
        payload2 = {
            "photo": make_test_image("dup2.png"),
            "photo_type": "back",
            "date": today,
            "weight": "70.0",
        }
        second = auth_client.post(
            reverse("progress-photos-list"), payload2, format="multipart", **headers
        )
        assert second.status_code == status.HTTP_200_OK
        assert second.data["id"] == photo_id
        assert ProgressPhoto.objects.filter(user=user, photo_type="back").count() == 1

    def test_legacy_side_still_valid(self, auth_client):
        today = timezone.localdate().isoformat()
        response = auth_client.post(
            reverse("progress-photos-list"),
            {
                "photo": make_test_image("side.png"),
                "photo_type": "side",
                "date": today,
            },
            format="multipart",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["photo_type"] == "side"


@pytest.mark.django_db
class TestTimelineAndComparison:
    def test_timeline_groups_weight_and_typed_photos(self, user):
        d1 = date(2026, 1, 1)
        d2 = date(2026, 1, 15)
        WeightEntry.objects.create(user=user, weight=Decimal("80.0"), date=d1)
        WeightEntry.objects.create(user=user, weight=Decimal("78.0"), date=d2)
        ProgressPhoto.objects.create(
            user=user, photo=make_test_image("f1.png"), photo_type="front", date=d1
        )
        ProgressPhoto.objects.create(
            user=user, photo=make_test_image("b1.png"), photo_type="back", date=d1
        )
        ProgressPhoto.objects.create(
            user=user, photo=make_test_image("f2.png"), photo_type="front", date=d2
        )
        ProgressPhoto.objects.create(
            user=user, photo=make_test_image("side-old.png"), photo_type="side", date=d2
        )

        timeline = build_progress_timeline(user)
        assert len(timeline) == 2
        assert timeline[0]["date"] == d1.isoformat()
        assert timeline[0]["weight"] == 80.0
        assert len(timeline[0]["photos_by_type"]["front"]) == 1
        assert len(timeline[0]["photos_by_type"]["back"]) == 1
        assert timeline[1]["unclassified_photos"]
        assert timeline[1]["photos_by_type"]["left_side"] == []

        comparison = first_last_by_type(user)
        assert comparison["front"]["first"]["date"] == d1.isoformat()
        assert comparison["front"]["last"]["date"] == d2.isoformat()
        assert comparison["back"]["last"]["date"] == d1.isoformat()
        assert comparison["left_side"]["first"] is None

    def test_progress_timeline_endpoint(self, auth_client, user):
        today = timezone.localdate()
        WeightEntry.objects.create(user=user, weight=Decimal("75.0"), date=today)
        ProgressPhoto.objects.create(
            user=user,
            photo=make_test_image("t.png"),
            photo_type="front",
            date=today,
        )
        response = auth_client.get(reverse("progress-stats-progress-timeline"))
        assert response.status_code == status.HTTP_200_OK
        assert "timeline" in response.data
        assert "comparison_by_type" in response.data
        assert "weight_history" in response.data
        assert len(response.data["weight_history"]) == 1


@pytest.mark.django_db
class TestCompleteReviewFlow:
    def test_four_photos_and_measurements_can_send(self, auth_client, user):
        today = timezone.localdate()
        for photo_type in ("front", "back", "left_side", "right_side"):
            ProgressPhoto.objects.create(
                user=user,
                photo=make_test_image(f"{photo_type}.png"),
                photo_type=photo_type,
                date=today,
                weight=Decimal("70.0"),
            )
        BodyMeasurement.objects.create(user=user, date=today, waist=Decimal("70.0"))

        status_resp = auth_client.get(reverse("progress-stats-quinzenal-review"))
        assert status_resp.data["needs_photos"] is False
        assert status_resp.data["needs_measurements"] is False
        assert status_resp.data["can_send"] is True
