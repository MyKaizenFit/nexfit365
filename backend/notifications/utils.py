from __future__ import annotations

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone

from .models import Notification


def notify_admins_user_change(*, user, title: str, message: str, data: dict | None = None, expires_days: int = 14) -> int:
    """Crea notificaciones para administradores activas sobre cambios hechos por un usuario."""
    User = get_user_model()
    admins = User.objects.filter(
        Q(is_staff=True) | Q(is_superuser=True) | Q(role='admin'),
        is_active=True,
    ).exclude(id=user.id)

    if not admins.exists():
        return 0

    payload = {
        'priority': 'high',
        'source': 'user_change',
        'changed_user_id': user.id,
        'changed_user_email': getattr(user, 'email', ''),
    }
    if data:
        payload.update(data)

    expires_at = timezone.now() + timedelta(days=expires_days)
    rows = [
        Notification(
            user=admin,
            type='system',
            title=title,
            message=message,
            data=payload,
            expires_at=expires_at,
        )
        for admin in admins
    ]
    Notification.objects.bulk_create(rows)
    return len(rows)
