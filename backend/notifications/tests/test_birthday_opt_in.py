from datetime import date

import pytest
from django.contrib.auth import get_user_model

from notifications.birthdays import ensure_user_birthday_notification
from notifications.models import Notification

User = get_user_model()
pytestmark = pytest.mark.django_db


def test_birthday_notice_is_off_until_the_user_enables_it():
    user = User.objects.create_user(
        email="birthday@example.invalid",
        password="TestPass123!",
        birth_date=date(1990, 9, 30),
    )
    today = date(2026, 9, 30)
    assert ensure_user_birthday_notification(user, today) is False
    assert Notification.objects.filter(user=user).count() == 0

    user.notification_preferences = {"birthday": True}
    user.save(update_fields=["notification_preferences"])
    assert ensure_user_birthday_notification(user, today) is True
    assert Notification.objects.filter(user=user, title="¡Feliz cumpleaños!").count() == 1
