from test_users_config import is_test_user


def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def can_access_rest_wellness(user) -> bool:
    """GA: available to members by default; admin can opt out via rest_wellness_enabled."""
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "rest_wellness_enabled", True):
        return True
    # Test accounts keep access even if the flag was turned off.
    return is_test_user(_normalize_email(user.email))


def can_coach_rest_wellness(user) -> bool:
    """Solo staff/admin: el análisis y guión van en el panel de administración."""
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
        return True
    role = str(getattr(user, "role", "") or "").upper()
    return role == "ADMIN"
