"""Tests for signed progress media (Plan 014)."""

from io import BytesIO

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APIClient

from freezegun import freeze_time

from progress.media_views import (
    build_signed_profile_media_url,
    build_signed_progress_media_url,
    protected_progress_media,
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

    def test_valid_token_sets_private_cache_headers(self, user):
        photo = ProgressPhoto.objects.create(
            user=user,
            photo=_png("cache.png"),
            photo_type="front",
            date="2026-06-01",
        )
        token = sign_progress_media_path(photo.photo.name)
        response = APIClient().get(f"/api/progress/protected-media/?token={token}")
        assert response.status_code == 200
        cache_control = response["Cache-Control"]
        assert "private" in cache_control
        assert "no-store" in cache_control
        assert "public" not in cache_control
        assert response["Content-Disposition"] == "inline"
        assert "cache.png" not in response["Content-Disposition"]

    def test_tampered_token_forbidden(self, user):
        photo = ProgressPhoto.objects.create(
            user=user,
            photo=_png("tamper.png"),
            photo_type="front",
            date="2026-06-01",
        )
        token = sign_progress_media_path(photo.photo.name)
        flipped = ("a" if token[-1] != "a" else "b")
        response = APIClient().get(
            f"/api/progress/protected-media/?token={token[:-1]}{flipped}"
        )
        assert response.status_code == 403

    def test_token_within_ttl_still_serves(self, user):
        photo = ProgressPhoto.objects.create(
            user=user,
            photo=_png("fresh.png"),
            photo_type="front",
            date="2026-06-01",
        )
        with freeze_time("2026-09-29 12:00:00"):
            token = sign_progress_media_path(photo.photo.name)
        with freeze_time("2026-09-29 12:14:00"):
            response = APIClient().get(f"/api/progress/protected-media/?token={token}")
        assert response.status_code == 200

    def test_token_older_than_ttl_forbidden(self, user):
        photo = ProgressPhoto.objects.create(
            user=user,
            photo=_png("stale.png"),
            photo_type="front",
            date="2026-06-01",
        )
        with freeze_time("2026-09-29 12:00:00"):
            token = sign_progress_media_path(photo.photo.name)
        with freeze_time("2026-09-29 12:16:00"):
            response = APIClient().get(f"/api/progress/protected-media/?token={token}")
        assert response.status_code == 403

    def test_token_for_one_file_cannot_serve_another(self, user):
        photo_a = ProgressPhoto.objects.create(
            user=user,
            photo=_png("photo-a.png"),
            photo_type="front",
            date="2026-06-01",
        )
        photo_b = ProgressPhoto.objects.create(
            user=user,
            photo=_png("photo-b.png"),
            photo_type="back",
            date="2026-06-02",
        )
        token_a = sign_progress_media_path(photo_a.photo.name)
        token_b = sign_progress_media_path(photo_b.photo.name)
        value_b, _timestamp_b, _sig_b = token_b.split(":", 2)
        _value_a, timestamp_a, sig_a = token_a.split(":", 2)
        forged = f"{value_b}:{timestamp_a}:{sig_a}"

        client = APIClient()
        own = client.get(f"/api/progress/protected-media/?token={token_a}")
        swapped = client.get(f"/api/progress/protected-media/?token={forged}")
        assert own.status_code == 200
        assert b"".join(own.streaming_content) != b""
        assert swapped.status_code == 403

    def test_signed_traversal_and_absolute_paths_forbidden(self):
        client = APIClient()
        for relative in (
            "progress_photos/../../etc/passwd",
            "progress_photos/../../../etc/passwd",
            "/etc/passwd",
            "profile_pictures/../../etc/passwd",
        ):
            token = sign_progress_media_path(relative)
            response = client.get(f"/api/progress/protected-media/?token={token}")
            assert response.status_code == 403

    def test_token_redacted_from_access_log_fields(self, user, rf):
        photo = ProgressPhoto.objects.create(
            user=user,
            photo=_png("redact.png"),
            photo_type="front",
            date="2026-06-01",
        )
        token = sign_progress_media_path(photo.photo.name)
        request = rf.get("/api/progress/protected-media/", {"token": token})
        request.META["RAW_URI"] = f"/api/progress/protected-media/?token={token}"
        request.META["REQUEST_URI"] = request.META["RAW_URI"]
        request.META["HTTP_REFERER"] = f"https://example.test/?token={token}"
        response = protected_progress_media(request)
        assert response.status_code == 200
        for key in ("QUERY_STRING", "RAW_URI", "REQUEST_URI", "HTTP_REFERER"):
            logged = request.META[key]
            assert token not in logged
            assert "token=<REDACTED>" in logged

    def test_other_user_cannot_obtain_signed_url(self, user):
        owner = User.objects.create_user(email="photo-owner@test.com", password="testpass123")
        photo = ProgressPhoto.objects.create(
            user=owner,
            photo=_png("private.png"),
            photo_type="front",
            date="2026-06-01",
        )
        client = APIClient()
        client.force_authenticate(user=user)
        listed = client.get("/api/progress-photos/")
        assert listed.status_code == 200
        rows = listed.data["results"] if isinstance(listed.data, dict) else listed.data
        assert all(row["id"] != str(photo.id) for row in rows)
        detail = client.get(f"/api/progress-photos/{photo.id}/")
        assert detail.status_code == 404


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
