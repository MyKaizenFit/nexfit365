from io import BytesIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
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
