"""Tests for signed progress media (Plan 014)."""

from io import BytesIO

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APIClient

from progress.media_views import build_signed_progress_media_url, sign_progress_media_path
from progress.models import ProgressPhoto

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
