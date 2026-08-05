from io import BytesIO

import pytest
from django.test import override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIRequestFactory
from rest_framework.exceptions import ValidationError

from progress.serializers import ProgressPhotoSerializer


@pytest.mark.django_db
def test_progress_photo_rejects_invalid_octet_stream():
    upload = SimpleUploadedFile(
        "evil.bin",
        b"\x00\x01\x02not-an-image",
        content_type="application/octet-stream",
    )
    serializer = ProgressPhotoSerializer()
    with pytest.raises(ValidationError):
        serializer.validate_photo(upload)


@pytest.mark.django_db
def test_progress_photo_accepts_real_image_with_octet_stream_content_type():
    from PIL import Image

    buffer = BytesIO()
    Image.new("RGB", (1, 1), color=(255, 0, 0)).save(buffer, format="PNG")
    upload = SimpleUploadedFile(
        "ios-upload.bin",
        buffer.getvalue(),
        content_type="application/octet-stream",
    )
    serializer = ProgressPhotoSerializer()
    assert serializer.validate_photo(upload) is upload


@pytest.mark.django_db
def test_progress_photo_accepts_png():
    # Minimal 1x1 PNG
    png = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0bIDATx\x9cc``\x00\x00\x00\x03\x00\x01"
        b"h&Y\r\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    upload = SimpleUploadedFile("ok.png", png, content_type="image/png")
    serializer = ProgressPhotoSerializer()
    assert serializer.validate_photo(upload) is upload


@pytest.mark.django_db
def test_progress_photo_accepts_real_image_with_wrong_mime_label():
    from PIL import Image

    buffer = BytesIO()
    Image.new("RGB", (1, 1), color=(0, 128, 255)).save(buffer, format="JPEG")
    upload = SimpleUploadedFile(
        "camera.jpg",
        buffer.getvalue(),
        content_type="text/plain",
    )
    serializer = ProgressPhotoSerializer()
    assert serializer.validate_photo(upload) is upload


@pytest.mark.django_db
@override_settings(PILLOW_HEIF_ENABLED=False)
def test_progress_photo_rejects_heic_when_codec_is_not_available():
    upload = SimpleUploadedFile(
        "ios-camera.heic",
        b"\x00\x00\x00\x18ftypheicnot-a-real-photo",
        content_type="image/heic",
    )
    serializer = ProgressPhotoSerializer()

    with pytest.raises(ValidationError) as exc:
        serializer.validate_photo(upload)

    assert "HEIC/HEIF no están disponibles" in str(exc.value)


@pytest.mark.django_db
@override_settings(PILLOW_HEIF_ENABLED=False)
def test_progress_photo_serializer_surfaces_clear_heic_error(django_user_model):
    user = django_user_model.objects.create_user(
        email="member@example.com",
        password="MemberPass123!",
        role="MEMBER",
    )
    request = APIRequestFactory().post("/api/progress-photos/")
    request.user = user
    upload = SimpleUploadedFile(
        "ios-camera.heic",
        b"\x00\x00\x00\x18ftypheicnot-a-real-photo",
        content_type="image/heic",
    )
    serializer = ProgressPhotoSerializer(
        data={"photo": upload, "photo_type": "front", "date": "2026-08-05"},
        context={"request": request},
    )

    assert not serializer.is_valid()
    assert "HEIC/HEIF no están disponibles" in str(serializer.errors["photo"])


@pytest.mark.django_db
def test_progress_photo_accepts_webp():
    from PIL import Image

    buffer = BytesIO()
    Image.new("RGB", (1, 1), color=(0, 255, 0)).save(buffer, format="WEBP")
    upload = SimpleUploadedFile(
        "ok.webp",
        buffer.getvalue(),
        content_type="image/webp",
    )
    serializer = ProgressPhotoSerializer()
    assert serializer.validate_photo(upload) is upload


@pytest.mark.django_db
@override_settings(MAX_PROGRESS_PHOTO_SIZE=8)
def test_progress_photo_rejects_oversized_file():
    upload = SimpleUploadedFile("big.jpg", b"x" * 9, content_type="image/jpeg")
    serializer = ProgressPhotoSerializer()

    with pytest.raises(ValidationError) as exc:
        serializer.validate_photo(upload)

    assert "demasiado grande" in str(exc.value)
