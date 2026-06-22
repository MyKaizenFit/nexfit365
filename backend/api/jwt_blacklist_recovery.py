"""Recuperación automática de corrupción en tablas JWT (login/refresh 500)."""

from __future__ import annotations

import logging
import re
import time
from typing import Callable, TypeVar

from django.contrib.auth import get_user_model
from django.db import connection
from django.db.utils import DatabaseError

logger = logging.getLogger(__name__)

JWT_CORRUPTION_RE = re.compile(
    r"could not open file|unexpected data beyond EOF|could not read block|"
    r"read only 0 of 8192|invalid page|missing chunk",
    re.IGNORECASE,
)

T = TypeVar("T")


def is_jwt_blacklist_corruption(exc: BaseException) -> bool:
    current: BaseException | None = exc
    while current is not None:
        if JWT_CORRUPTION_RE.search(str(current)):
            return True
        current = current.__cause__  # type: ignore[assignment]
    return False


def _probe_jwt_write() -> bool:
    User = get_user_model()
    user = User.objects.filter(is_active=True).order_by("id").only("id").first()
    if user is None:
        return True

    probe_jti = f"auth-probe-{int(time.time() * 1000)}"
    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO token_blacklist_outstandingtoken (token, created_at, expires_at, user_id, jti)
            VALUES (%s, NOW(), NOW() + interval '1 hour', %s, %s)
            """,
            ["integrity-probe", user.id, probe_jti],
        )
        cursor.execute(
            "DELETE FROM token_blacklist_outstandingtoken WHERE jti = %s",
            [probe_jti],
        )
    return True


def repair_jwt_blacklist_tables(*, aggressive: bool = False) -> bool:
    """REINDEX/VACUUM; si falla el probe, TRUNCATE (invalida refresh tokens)."""
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "DELETE FROM token_blacklist_outstandingtoken WHERE expires_at < NOW();"
            )
            cursor.execute("REINDEX TABLE token_blacklist_outstandingtoken;")
            cursor.execute("REINDEX TABLE token_blacklist_blacklistedtoken;")
            cursor.execute("VACUUM token_blacklist_outstandingtoken;")
            cursor.execute("VACUUM token_blacklist_blacklistedtoken;")

        _probe_jwt_write()
        logger.info("JWT blacklist tables repaired (standard)")
        return True
    except Exception as first_error:
        logger.warning("JWT standard repair failed: %s", first_error)

    if not aggressive:
        return repair_jwt_blacklist_tables(aggressive=True)

    try:
        with connection.cursor() as cursor:
            cursor.execute("TRUNCATE token_blacklist_blacklistedtoken;")
            cursor.execute(
                "TRUNCATE token_blacklist_outstandingtoken RESTART IDENTITY CASCADE;"
            )
            cursor.execute("REINDEX TABLE token_blacklist_outstandingtoken;")
            cursor.execute("REINDEX TABLE token_blacklist_blacklistedtoken;")
        _probe_jwt_write()
        logger.warning(
            "JWT blacklist tables truncated and rebuilt (all refresh tokens invalidated)"
        )
        return True
    except Exception as aggressive_error:
        logger.exception("JWT aggressive repair failed: %s", aggressive_error)
        return False


def call_with_jwt_blacklist_recovery(fn: Callable[[], T]) -> T:
    try:
        return fn()
    except DatabaseError as exc:
        if not is_jwt_blacklist_corruption(exc):
            raise
        logger.warning("JWT corruption during auth request: %s", exc)
        if repair_jwt_blacklist_tables():
            return fn()
        raise
