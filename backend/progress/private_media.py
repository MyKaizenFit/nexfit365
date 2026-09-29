"""Sanitize new private images and delete stored files that nothing references."""

from __future__ import annotations

import logging
from io import BytesIO

from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from PIL import Image, ImageOps, UnidentifiedImageError

logger = logging.getLogger(__name__)

PRIVATE_MEDIA_PREFIXES = ("progress_photos/", "profile_pictures/")
JPEG_QUALITY = 90


def sanitize_uploaded_image(uploaded) -> ContentFile:
    """Apply EXIF orientation, then store a new file with no metadata."""
    raw = uploaded.read()
    if hasattr(uploaded, "seek"):
        uploaded.seek(0)
    try:
        with Image.open(BytesIO(raw)) as image:
            image.load()
            source_format = image.format
            oriented = ImageOps.exif_transpose(image) or image
            out_format, extension, mode, save_kwargs = _output_policy(source_format, oriented)
            converted = oriented if oriented.mode == mode else oriented.convert(mode)
            # frombytes drops info/exif/xmp; the pixels already include orientation.
            clean = Image.frombytes(converted.mode, converted.size, converted.tobytes())
            buffer = BytesIO()
            clean.save(buffer, format=out_format, **save_kwargs)
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        logger.warning("private image sanitize failed (%s)", type(exc).__name__)
        raise ValidationError("No se pudo procesar la imagen.") from exc
    return ContentFile(buffer.getvalue(), name=f"image{extension}")


def schedule_private_file_delete(name: str) -> None:
    """Delete a managed private file after the DB transaction commits."""
    if not _is_safe_private_name(name):
        return

    def _delete() -> None:
        if _reference_count(name):
            return
        try:
            default_storage.delete(name)
        except Exception as exc:
            logger.warning(
                "private media delete failed kind=%s (%s)",
                _kind(name),
                type(exc).__name__,
            )

    transaction.on_commit(_delete)


def remember_previous_names(instance, field_names: tuple[str, ...]) -> list[str]:
    previous: list[str] = []
    if not instance.pk:
        return previous
    model = type(instance)
    stored = model.objects.filter(pk=instance.pk).values(*field_names).first()
    if not stored:
        return previous
    for field_name in field_names:
        name = stored.get(field_name) or ""
        if name:
            previous.append(name)
    return previous


def sanitize_uncommitted_fields(instance, field_names: tuple[str, ...]) -> None:
    for field_name in field_names:
        field_file = getattr(instance, field_name, None)
        if not field_file or getattr(field_file, "_committed", True):
            continue
        setattr(instance, field_name, sanitize_uploaded_image(field_file.file))


def schedule_unreferenced(names: list[str], still_used: set[str]) -> None:
    for name in names:
        if name and name not in still_used:
            schedule_private_file_delete(name)


def current_names(instance, field_names: tuple[str, ...]) -> set[str]:
    names = set()
    for field_name in field_names:
        field_file = getattr(instance, field_name, None)
        name = getattr(field_file, "name", "") or ""
        if name:
            names.add(name)
    return names


def _output_policy(source_format: str | None, image: Image.Image):
    fmt = (source_format or "").upper()
    if fmt == "PNG":
        mode = image.mode if image.mode in {"1", "L", "LA", "RGB", "RGBA"} else "RGBA"
        return "PNG", ".png", mode, {}
    if fmt == "WEBP":
        mode = image.mode if image.mode in {"RGB", "RGBA"} else "RGB"
        return "WEBP", ".webp", mode, {"quality": JPEG_QUALITY}
    mode = "RGB"
    return "JPEG", ".jpg", mode, {"quality": JPEG_QUALITY, "optimize": True}


def _is_safe_private_name(name: str) -> bool:
    if not name or name.startswith(("/", "\\")) or ".." in name.replace("\\", "/").split("/"):
        return False
    normalized = name.replace("\\", "/")
    return normalized.startswith(PRIVATE_MEDIA_PREFIXES)


def _kind(name: str) -> str:
    normalized = name.replace("\\", "/")
    if normalized.startswith("profile_pictures/"):
        return "profile"
    return "progress"


def _reference_count(name: str) -> int:
    from accounts.models import CustomUser
    from progress.models import ProgressPhoto

    return (
        ProgressPhoto.objects.filter(photo=name).count()
        + ProgressPhoto.objects.filter(thumbnail=name).count()
        + CustomUser.objects.filter(profile_picture=name).count()
    )
