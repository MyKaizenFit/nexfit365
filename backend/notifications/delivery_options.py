"""Helpers for notification delivery-channel flags."""


def _notification_data(notification):
    data = getattr(notification, "data", None)
    return data if isinstance(data, dict) else {}


def should_send_push(notification) -> bool:
    return bool(_notification_data(notification).get("send_push", True))


def should_send_email(notification) -> bool:
    return bool(_notification_data(notification).get("send_email", True))
