"""EXIF removal and physical deletion for private progress and profile images."""

from io import BytesIO
from pathlib import Path

import pytest
from django.core.files.storage import default_storage, storages
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils.functional import empty
from PIL import Image
from unittest.mock import patch

from accounts.models import CustomUser
from progress.models import ProgressPhoto

pytestmark = pytest.mark.django_db


def _use_temp_media(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    storages._storages.pop("default", None)
    default_storage._wrapped = empty
    return tmp_path


def _jpeg(name="photo.jpg", *, orientation=1, with_gps=True):
    image = Image.new("RGB", (64, 32), (255, 0, 0))
    for x in range(32, 64):
        for y in range(32):
            image.putpixel((x, y), (0, 0, 255))
    exif = Image.Exif()
    exif[0x0112] = orientation
    exif[0x010F] = "TestMake"
    exif[0x0110] = "TestModel"
    exif[0x9003] = "2020:01:02 03:04:05"
    if with_gps:
        gps = exif.get_ifd(0x8825)
        gps[1] = "N"
        gps[2] = (1, 1)
        gps[3] = "E"
        gps[4] = (2, 1)
    buffer = BytesIO()
    image.save(buffer, format="JPEG", exif=exif.tobytes(), quality=95)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/jpeg")


def _png(name="avatar.png"):
    image = Image.new("RGB", (8, 8), (0, 255, 0))
    exif = Image.Exif()
    exif[0x010F] = "TestMake"
    exif[0x0110] = "TestModel"
    buffer = BytesIO()
    image.save(buffer, format="PNG", exif=exif.tobytes())
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


def _stored_image(field_file):
    with field_file.open("rb") as handle:
        image = Image.open(handle)
        image.load()
    return image


def _assert_metadata_gone(image):
    exif = image.getexif()
    assert not exif.get(0x010F)
    assert not exif.get(0x0110)
    assert not exif.get(0x9003)
    assert not exif.get(0x0112)
    assert not dict(exif.get_ifd(0x8825))


def _user(email="media-life@example.invalid"):
    return CustomUser.objects.create_user(email=email, password="testpass123")


def _photo(user, **kwargs):
    payload = {
        "user": user,
        "photo": kwargs.pop("photo", _jpeg()),
        "photo_type": "front",
        "date": "2026-09-01",
    }
    payload.update(kwargs)
    return ProgressPhoto.objects.create(**payload)


def test_progress_photo_strips_exif_and_keeps_orientation(settings, tmp_path):
    _use_temp_media(settings, tmp_path)
    photo = _photo(_user(), photo=_jpeg(orientation=2))
    image = _stored_image(photo.photo)
    _assert_metadata_gone(image)
    # Orientation 2 mirrors the JPEG: the left side was red and becomes blue.
    assert image.getpixel((4, 16))[2] > 200
    assert image.getpixel((60, 16))[0] > 200
    assert image.size == (64, 32)


def test_thumbnail_upload_is_sanitized(settings, tmp_path):
    _use_temp_media(settings, tmp_path)
    photo = _photo(_user(), thumbnail=_jpeg(name="thumb.jpg", orientation=1))
    _assert_metadata_gone(_stored_image(photo.thumbnail))


def test_profile_picture_strips_exif(settings, tmp_path):
    _use_temp_media(settings, tmp_path)
    user = _user()
    user.profile_picture = _png()
    user.save()
    _assert_metadata_gone(_stored_image(user.profile_picture))


def test_progress_photo_delete_removes_files(settings, tmp_path, django_capture_on_commit_callbacks):
    _use_temp_media(settings, tmp_path)
    photo = _photo(_user(), thumbnail=_jpeg(name="thumb.jpg"))
    original = photo.photo.path
    thumb = photo.thumbnail.path
    assert Path(original).is_file()
    assert Path(thumb).is_file()
    with django_capture_on_commit_callbacks(execute=True):
        photo.delete()
    assert not ProgressPhoto.objects.filter(pk=photo.pk).exists()
    assert not Path(original).exists()
    assert not Path(thumb).exists()


def test_queryset_delete_removes_files(settings, tmp_path, django_capture_on_commit_callbacks):
    _use_temp_media(settings, tmp_path)
    photo = _photo(_user())
    original = photo.photo.path
    with django_capture_on_commit_callbacks(execute=True):
        ProgressPhoto.objects.filter(pk=photo.pk).delete()
    assert not Path(original).exists()


def test_user_cascade_removes_progress_and_profile_files(
    settings, tmp_path, django_capture_on_commit_callbacks
):
    _use_temp_media(settings, tmp_path)
    user = _user()
    user.profile_picture = _png()
    user.save()
    photo = _photo(user, thumbnail=_jpeg(name="thumb.jpg"))
    paths = [user.profile_picture.path, photo.photo.path, photo.thumbnail.path]
    with django_capture_on_commit_callbacks(execute=True):
        user.delete()
    assert not CustomUser.objects.filter(email="media-life@example.invalid").exists()
    assert not ProgressPhoto.objects.exists()
    assert all(not Path(path).exists() for path in paths)


def test_shared_file_is_kept_while_referenced(settings, tmp_path, django_capture_on_commit_callbacks):
    _use_temp_media(settings, tmp_path)
    user = _user()
    photo = _photo(user)
    other = ProgressPhoto.objects.create(
        user=user,
        photo=photo.photo.name,
        photo_type="back",
        date="2026-09-02",
    )
    original = photo.photo.path
    with django_capture_on_commit_callbacks(execute=True):
        photo.delete()
    assert Path(original).is_file()
    with django_capture_on_commit_callbacks(execute=True):
        other.delete()
    assert not Path(original).exists()


def test_profile_replacement_deletes_old_file(settings, tmp_path, django_capture_on_commit_callbacks):
    _use_temp_media(settings, tmp_path)
    user = _user()
    user.profile_picture = _png("old.png")
    user.save()
    old_path = user.profile_picture.path
    user.profile_picture = _png("new.png")
    with django_capture_on_commit_callbacks(execute=True):
        user.save()
    user.refresh_from_db()
    assert Path(user.profile_picture.path).is_file()
    assert not Path(old_path).exists()
    assert user.profile_picture.path != old_path


def test_profile_clear_deletes_file(settings, tmp_path, django_capture_on_commit_callbacks):
    _use_temp_media(settings, tmp_path)
    user = _user()
    user.profile_picture = _png()
    user.save()
    old_path = user.profile_picture.path
    user.profile_picture = None
    with django_capture_on_commit_callbacks(execute=True):
        user.save()
    user.refresh_from_db()
    assert not user.profile_picture
    assert not Path(old_path).exists()


def test_replacing_progress_photo_deletes_old_file(settings, tmp_path, django_capture_on_commit_callbacks):
    _use_temp_media(settings, tmp_path)
    photo = _photo(_user())
    old_path = photo.photo.path
    photo.photo = _jpeg(name="replacement.jpg", with_gps=True)
    with django_capture_on_commit_callbacks(execute=True):
        photo.save()
    photo.refresh_from_db()
    assert Path(photo.photo.path).is_file()
    assert not Path(old_path).exists()
    _assert_metadata_gone(_stored_image(photo.photo))


def test_storage_delete_failure_keeps_database_delete(settings, tmp_path, django_capture_on_commit_callbacks, caplog):
    _use_temp_media(settings, tmp_path)
    photo = _photo(_user("failure@example.invalid"))
    with patch("progress.private_media.default_storage.delete", side_effect=OSError("disk")):
        with django_capture_on_commit_callbacks(execute=True):
            photo.delete()
    assert not ProgressPhoto.objects.filter(pk=photo.pk).exists()
    messages = [record.getMessage() for record in caplog.records if record.name == "progress.private_media"]
    assert messages
    assert all("failure@example.invalid" not in message for message in messages)
    assert all("TestMake" not in message for message in messages)


def test_unsafe_names_are_not_deleted(settings, tmp_path, django_capture_on_commit_callbacks):
    _use_temp_media(settings, tmp_path)
    from progress.private_media import schedule_private_file_delete

    with patch("progress.private_media.default_storage.delete") as delete:
        with django_capture_on_commit_callbacks(execute=True):
            schedule_private_file_delete("../etc/passwd")
            schedule_private_file_delete("/etc/passwd")
            schedule_private_file_delete("exercises/public.mp4")
        assert delete.call_count == 0
