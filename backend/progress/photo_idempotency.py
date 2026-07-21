"""Idempotencia suave para subida de fotos de progreso (sin borrar historial)."""

from django.core.cache import cache

IDEMPOTENCY_TTL = 60 * 60 * 24  # 24h


def idempotency_cache_key(user_id, key: str) -> str:
    return f"progress_photo_idem:{user_id}:{key[:128]}"


def get_idempotency_key(request) -> str | None:
    raw = request.headers.get("Idempotency-Key") or request.META.get("HTTP_IDEMPOTENCY_KEY")
    if not raw:
        return None
    key = str(raw).strip()
    return key or None


def get_cached_photo_id(user_id, idem_key: str):
    return cache.get(idempotency_cache_key(user_id, idem_key))


def set_cached_photo_id(user_id, idem_key: str, photo_id) -> None:
    cache.set(idempotency_cache_key(user_id, idem_key), str(photo_id), timeout=IDEMPOTENCY_TTL)
