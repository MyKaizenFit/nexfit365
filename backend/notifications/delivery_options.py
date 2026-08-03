"""Helpers for notification delivery-channel flags."""

TYPE_PREF_KEYS = {
    "meal_reminder": "meals",
    "nutrition": "meals",
    "workout_reminder": "workouts",
    "workout": "workouts",
    "achievement": "achievements",
    "system": "admin",
    "progress": "reminders",
    "general": "reminders",
}


def _notification_data(notification):
    data = getattr(notification, "data", None)
    return data if isinstance(data, dict) else {}


def _user_prefs(notification) -> dict:
    user = getattr(notification, "user", None)
    prefs = getattr(user, "notification_preferences", None) if user else None
    return prefs if isinstance(prefs, dict) else {}


def _pref_enabled(prefs: dict, key: str, default: bool = True) -> bool:
    if key not in prefs:
        return default
    return bool(prefs.get(key))


def _type_pref_allows(notification, prefs: dict) -> bool:
    ntype = getattr(notification, "type", None) or "general"
    key = TYPE_PREF_KEYS.get(ntype, "reminders")
    return _pref_enabled(prefs, key, default=True)


def should_send_push(notification) -> bool:
    if not bool(_notification_data(notification).get("send_push", True)):
        return False
    prefs = _user_prefs(notification)
    if not _pref_enabled(prefs, "push", default=True):
        return False
    return _type_pref_allows(notification, prefs)


def should_send_email(notification) -> bool:
    if not bool(_notification_data(notification).get("send_email", True)):
        return False
    prefs = _user_prefs(notification)
    if not _pref_enabled(prefs, "email", default=True):
        return False
    return _type_pref_allows(notification, prefs)
