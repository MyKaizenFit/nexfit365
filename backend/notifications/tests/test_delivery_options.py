from types import SimpleNamespace

from notifications.delivery_options import should_send_email, should_send_push


def _notif(**kwargs):
    defaults = {
        "type": "general",
        "data": {},
        "user": SimpleNamespace(notification_preferences={}),
    }
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def test_defaults_allow_push_but_not_email():
    n = _notif()
    assert should_send_push(n) is True
    assert should_send_email(n) is False


def test_channel_data_flags_block():
    n = _notif(data={"send_push": False, "send_email": False})
    assert should_send_push(n) is False
    assert should_send_email(n) is False


def test_user_prefs_block_channels():
    user = SimpleNamespace(notification_preferences={"push": False, "email": False})
    n = _notif(user=user)
    assert should_send_push(n) is False
    assert should_send_email(n) is False


def test_type_pref_blocks_meals():
    user = SimpleNamespace(notification_preferences={"meals": False, "push": True, "email": True})
    n = _notif(
        type="meal_reminder",
        user=user,
        data={"created_by_admin": True, "send_email": True},
    )
    assert should_send_push(n) is False
    assert should_send_email(n) is False


def test_type_pref_allows_other_types():
    user = SimpleNamespace(notification_preferences={"meals": False, "push": True, "email": True})
    n = _notif(
        type="achievement",
        user=user,
        data={"created_by_admin": True, "send_email": True},
    )
    assert should_send_push(n) is True
    assert should_send_email(n) is True


def test_email_requires_manual_admin_notification():
    automatic = _notif(data={"send_email": True, "created_by_automation": True})
    assert should_send_email(automatic) is False

    manual = _notif(data={"send_email": True, "created_by_admin": True})
    assert should_send_email(manual) is True

    automated_admin = _notif(
        data={"send_email": True, "created_by_admin": True, "created_by_automation": True}
    )
    assert should_send_email(automated_admin) is False
