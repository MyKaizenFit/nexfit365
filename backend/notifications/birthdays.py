from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone

from .models import Notification


BIRTHDAY_USER_KIND = "birthday_user_message"
BIRTHDAY_ADMIN_KIND = "birthday_admin_alert"


def is_birthday_today(user, today=None) -> bool:
    today = today or timezone.localdate()
    birth_date = getattr(user, "birth_date", None)
    return bool(birth_date and birth_date.month == today.month and birth_date.day == today.day)


def get_display_name(user) -> str:
    full_name = user.get_full_name().strip() if hasattr(user, "get_full_name") else ""
    return full_name or getattr(user, "email", "") or "Usuario"


def get_admin_users():
    User = get_user_model()
    return User.objects.filter(
        Q(is_staff=True) | Q(is_superuser=True) | Q(role__iexact="admin"),
        is_active=True,
    ).distinct()


def ensure_user_birthday_notification(user, today=None) -> bool:
    today = today or timezone.localdate()
    if not is_birthday_today(user, today):
        return False

    exists = Notification.objects.filter(
        user=user,
        created_at__date=today,
        data__kind=BIRTHDAY_USER_KIND,
    ).exists()
    if exists:
        return False

    Notification.objects.create(
        user=user,
        type="general",
        title="¡Feliz cumpleaños!",
        message="Todo el equipo te desea un día genial. ¡A disfrutarlo!",
        data={"kind": BIRTHDAY_USER_KIND, "birthday_date": today.isoformat()},
        action_url="/dashboard",
    )
    return True


def ensure_admin_birthday_notifications(user, today=None) -> int:
    today = today or timezone.localdate()
    if not is_birthday_today(user, today):
        return 0

    created = 0
    birthday_user_id = str(user.id)
    display_name = get_display_name(user)

    for admin in get_admin_users():
        exists = Notification.objects.filter(
            user=admin,
            created_at__date=today,
            data__kind=BIRTHDAY_ADMIN_KIND,
            data__birthday_user_id=birthday_user_id,
        ).exists()
        if exists:
            continue

        Notification.objects.create(
            user=admin,
            type="general",
            title="Cumpleaños de usuario",
            message=f"Hoy es el cumpleaños de {display_name}.",
            data={
                "kind": BIRTHDAY_ADMIN_KIND,
                "birthday_user_id": birthday_user_id,
                "birthday_user_name": display_name,
                "birthday_date": today.isoformat(),
            },
            action_url=f"/admin/user-v2/{user.id}",
        )
        created += 1

    return created


def ensure_birthday_notifications_for_user(user, today=None) -> dict:
    today = today or timezone.localdate()
    birthday = is_birthday_today(user, today)
    user_created = ensure_user_birthday_notification(user, today) if birthday else False
    admin_created = ensure_admin_birthday_notifications(user, today) if birthday else 0

    return {
        "is_birthday": birthday,
        "message": "¡Feliz cumpleaños! Todo el equipo te desea un día genial." if birthday else "",
        "user_notification_created": user_created,
        "admin_notifications_created": admin_created,
    }


def ensure_today_birthday_notifications(today=None) -> dict:
    today = today or timezone.localdate()
    User = get_user_model()
    birthday_users = User.objects.filter(
        is_active=True,
        birth_date__month=today.month,
        birth_date__day=today.day,
    )

    users_count = 0
    user_notifications_created = 0
    admin_notifications_created = 0

    for user in birthday_users:
        users_count += 1
        if ensure_user_birthday_notification(user, today):
            user_notifications_created += 1
        admin_notifications_created += ensure_admin_birthday_notifications(user, today)

    return {
        "date": today.isoformat(),
        "birthday_users": users_count,
        "user_notifications_created": user_notifications_created,
        "admin_notifications_created": admin_notifications_created,
    }
