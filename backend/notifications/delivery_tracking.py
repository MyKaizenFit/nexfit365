from __future__ import annotations

from typing import Any

from django.utils import timezone

from .models import NotificationDeliveryLog


def update_delivery_log(
    *,
    notification_id,
    channel: str,
    status: str,
    attempts: int | None = None,
    task_id: str = "",
    error_message: str = "",
    metadata: dict[str, Any] | None = None,
    mark_delivered: bool = False,
) -> NotificationDeliveryLog:
    """Create/update a per-channel delivery trace for one notification."""
    now = timezone.now()
    log, _ = NotificationDeliveryLog.objects.get_or_create(
        notification_id=notification_id,
        channel=channel,
        defaults={
            "status": status,
            "attempts": attempts or 0,
            "task_id": task_id,
            "last_error": error_message,
            "last_attempt_at": now,
            "delivered_at": now if mark_delivered else None,
            "metadata": metadata or {},
        },
    )

    if attempts is not None:
        log.attempts = max(log.attempts, attempts)
    elif log.attempts == 0:
        log.attempts = 1

    log.status = status
    log.task_id = task_id or log.task_id
    log.last_error = error_message or ""
    log.last_attempt_at = now

    if metadata:
        combined = dict(log.metadata or {})
        combined.update(metadata)
        log.metadata = combined

    if mark_delivered:
        log.delivered_at = now

    log.save(update_fields=[
        "status",
        "attempts",
        "task_id",
        "last_error",
        "last_attempt_at",
        "delivered_at",
        "metadata",
        "updated_at",
    ])
    return log
