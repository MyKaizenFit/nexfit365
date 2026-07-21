"""Regression: business calendar days use Europe/Madrid localdate, not UTC."""
from datetime import datetime, timezone as dt_timezone

import pytest
from django.test import override_settings
from django.utils import timezone
from freezegun import freeze_time


@pytest.mark.django_db
@override_settings(TIME_ZONE="Europe/Madrid", USE_TZ=True)
@freeze_time(datetime(2026, 7, 17, 22, 30, tzinfo=dt_timezone.utc))
def test_localdate_is_madrid_day_not_utc_near_midnight():
    # 2026-07-17 22:30 UTC == 2026-07-18 00:30 in Europe/Madrid (CEST)
    assert timezone.now().date().isoformat() == "2026-07-17"
    assert timezone.localdate().isoformat() == "2026-07-18"
