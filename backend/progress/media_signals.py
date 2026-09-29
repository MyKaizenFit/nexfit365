"""Delete private image files when the database row no longer references them."""

from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from accounts.models import CustomUser
from progress.models import ProgressPhoto
from progress.private_media import (
    current_names,
    remember_previous_names,
    sanitize_uncommitted_fields,
    schedule_private_file_delete,
    schedule_unreferenced,
)

_PHOTO_FIELDS = ("photo", "thumbnail")
_PROFILE_FIELDS = ("profile_picture",)


@receiver(pre_save, sender=ProgressPhoto)
def prepare_progress_photo_files(sender, instance, **kwargs):
    instance._previous_private_names = remember_previous_names(instance, _PHOTO_FIELDS)
    sanitize_uncommitted_fields(instance, _PHOTO_FIELDS)


@receiver(post_save, sender=ProgressPhoto)
def delete_replaced_progress_files(sender, instance, **kwargs):
    schedule_unreferenced(
        getattr(instance, "_previous_private_names", []),
        current_names(instance, _PHOTO_FIELDS),
    )


@receiver(post_delete, sender=ProgressPhoto)
def delete_progress_photo_files(sender, instance, **kwargs):
    for name in current_names(instance, _PHOTO_FIELDS):
        schedule_private_file_delete(name)


@receiver(pre_save, sender=CustomUser)
def prepare_profile_picture(sender, instance, **kwargs):
    instance._previous_private_names = remember_previous_names(instance, _PROFILE_FIELDS)
    sanitize_uncommitted_fields(instance, _PROFILE_FIELDS)


@receiver(post_save, sender=CustomUser)
def delete_replaced_profile_picture(sender, instance, **kwargs):
    schedule_unreferenced(
        getattr(instance, "_previous_private_names", []),
        current_names(instance, _PROFILE_FIELDS),
    )


@receiver(post_delete, sender=CustomUser)
def delete_profile_picture_file(sender, instance, **kwargs):
    for name in current_names(instance, _PROFILE_FIELDS):
        schedule_private_file_delete(name)
