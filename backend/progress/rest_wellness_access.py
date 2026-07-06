from test_users_config import is_test_user

REST_WELLNESS_PILOT_EMAILS = frozenset({
    "raptoraitor32@gmail.com",
    "contacto.sarakhalaf@gmail.com",
})


def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def can_access_rest_wellness(user) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    email = _normalize_email(user.email)
    if email in REST_WELLNESS_PILOT_EMAILS:
        return True
    return is_test_user(email)


def can_coach_rest_wellness(user) -> bool:
    return can_access_rest_wellness(user)
