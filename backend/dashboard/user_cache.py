"""Invalidación puntual de caché del dashboard de un usuario."""

from django.core.cache import cache
from django.utils import timezone


def invalidate_user_dashboard_cache(user_id) -> None:
    today = timezone.localdate()
    utc_today = timezone.now().date()
    dates = {today, utc_today}
    months = {today.strftime("%Y-%m"), utc_today.strftime("%Y-%m")}
    for day in dates:
        cache.delete(f"dashboard_today_{user_id}_{day}")
        cache.delete(f"dashboard_weekly_{user_id}_{day}")
    for month in months:
        cache.delete(f"dashboard_monthly_{user_id}_{month}")
    cache.delete(f"dashboard_stats_v2_{user_id}")
