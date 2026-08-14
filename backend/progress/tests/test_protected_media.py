"""Tests for signed progress media (Plan 014)."""

from io import BytesIO

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APIClient

from progress.media_views import (
    build_signed_profile_media_url,
    build_signed_progress_media_url,
    sign_progress_media_path,
)
from progress.models import ProgressPhoto
from accounts.serializers import UserProfileSerializer

User = get_user_model()


def _png(name="front.png"):
    buf = BytesIO()
    Image.new("RGB", (2, 2), color=(255, 0, 0)).save(buf, format="PNG")
    buf.seek(0)
    return SimpleUploadedFile(name, buf.read(), content_type="image/png")


@pytest.fixture
def user(db):
    return User.objects.create_user(email="media@test.com", password="testpass123")


@pytest.mark.django_db
class TestProtectedProgressMedia:
    def test_raw_media_path_forbidden(self, user):
        photo = ProgressPhoto.objects.create(
            user=user,
            photo=_png(),
            photo_type="front",
            date="2026-06-01",
        )

        client = APIClient()
        response = client.get(f"/media/{photo.photo.name}")
        assert response.status_code == 403

    def test_signed_url_serves_file(self, user):
        photo = ProgressPhoto.objects.create(
            user=user,
            photo=_png("signed.png"),
            photo_type="front",
            date="2026-06-01",
        )

        token = sign_progress_media_path(photo.photo.name)
        client = APIClient()
        response = client.get(f"/api/progress/protected-media/?token={token}")
        assert response.status_code == 200
        body = b"".join(response.streaming_content)
        assert len(body) > 0

    def test_missing_token_forbidden(self):
        client = APIClient()
        response = client.get("/api/progress/protected-media/")
        assert response.status_code == 403

    def test_serializer_returns_signed_url(self, user, rf):
        photo = ProgressPhoto.objects.create(
            user=user,
            photo=_png("ser.png"),
            photo_type="front",
            date="2026-06-01",
        )
        request = rf.get("/")
        url = build_signed_progress_media_url(request, photo.photo)
        assert url is not None
        assert "/api/progress/protected-media/?token=" in url


@pytest.mark.django_db
class TestProtectedProfileMedia:
    def test_raw_profile_path_forbidden(self, user):
        user.profile_picture = _png("avatar.png")
        user.save(update_fields=["profile_picture"])

        client = APIClient()
        response = client.get(f"/media/{user.profile_picture.name}")
        assert response.status_code == 403

    def test_signed_profile_url_serves_file(self, user):
        user.profile_picture = _png("avatar2.png")
        user.save(update_fields=["profile_picture"])

        token = sign_progress_media_path(user.profile_picture.name)
        client = APIClient()
        response = client.get(f"/api/progress/protected-media/?token={token}")
        assert response.status_code == 200

    def test_profile_serializer_returns_signed_url(self, user, rf):
        user.profile_picture = _png("avatar3.png")
        user.save(update_fields=["profile_picture"])
        request = rf.get("/")
        data = UserProfileSerializer(user, context={"request": request}).data
        assert data["profile_picture_url"]
        assert "/api/progress/protected-media/?token=" in data["profile_picture_url"]

    def test_signed_urls_use_future_public_media_base(self, user, rf, monkeypatch):
        monkeypatch.setenv("PUBLIC_MEDIA_BASE_URL", "https://metodosk.com/nexfit")
        photo = ProgressPhoto.objects.create(
            user=user,
            photo=_png("future.png"),
            photo_type="front",
            date="2026-06-01",
        )
        user.profile_picture = _png("future-avatar.png")
        user.save(update_fields=["profile_picture"])
        request = rf.get("/")
        progress_url = build_signed_progress_media_url(request, photo.photo)
        profile_url = build_signed_profile_media_url(request, user.profile_picture)
        assert progress_url.startswith(
            "https://metodosk.com/nexfit/api/progress/protected-media/?token="
        )
        assert profile_url.startswith(
            "https://metodosk.com/nexfit/api/progress/protected-media/?token="
        )
        assert "/nexfit/" in progress_url
        assert "origin-nexfit" not in progress_url

        from progress.serializers import ProgressPhotoSerializer

        data = ProgressPhotoSerializer(photo, context={"request": request}).data
        assert data["photo"].startswith(
            "https://metodosk.com/nexfit/api/progress/protected-media/?token="
        )
        assert "/media/progress_photos/" not in (data["photo"] or "")
        assert data["photo_url"].startswith(
            "https://metodosk.com/nexfit/api/progress/protected-media/?token="
        )

        profile_data = UserProfileSerializer(user, context={"request": request}).data
        assert profile_data["profile_picture"].startswith(
            "https://metodosk.com/nexfit/api/progress/protected-media/?token="
        )
        assert "/media/profile_pictures/" not in (profile_data["profile_picture"] or "")
