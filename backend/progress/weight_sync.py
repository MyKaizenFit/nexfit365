"""Sincroniza entradas de peso desde otras fuentes (fotos, perfil, etc.)."""

from __future__ import annotations

import logging
from decimal import Decimal
from typing import Optional

from django.db import transaction
from django.utils import timezone

from progress.models import WeightEntry

logger = logging.getLogger(__name__)


def upsert_weight_entry(
    user,
    weight,
    date=None,
    *,
    notes: str = "",
    update_user_weight: bool = True,
) -> Optional[WeightEntry]:
    """
    Crea o actualiza la entrada de peso para un usuario y fecha.
    """
    if weight is None or date is None:
        return None

    weight_decimal = Decimal(str(weight))

    with transaction.atomic():
        entry = (
            WeightEntry.objects.select_for_update()
            .filter(user=user, date=date)
            .order_by("-created_at")
            .first()
        )

        if entry:
            entry.weight = weight_decimal
            if notes and not entry.notes:
                entry.notes = notes
            entry.save(update_fields=["weight", "notes", "updated_at"])
        else:
            entry = WeightEntry.objects.create(
                user=user,
                weight=weight_decimal,
                date=date,
                notes=notes,
            )

        try:
            from dashboard.models import UserStats

            stats, created = UserStats.objects.get_or_create(user=user)
            if created or not stats.starting_weight:
                stats.starting_weight = weight_decimal
                if not stats.transformation_start_date:
                    stats.transformation_start_date = date or timezone.localdate()
            stats.current_weight = weight_decimal
            stats.save()
        except Exception as exc:
            logger.warning("No se pudo actualizar UserStats para user=%s: %s", user.pk, exc)

        if update_user_weight:
            try:
                user.weight = weight_decimal
                user.save(update_fields=["weight", "updated_at"])
            except Exception as exc:
                logger.warning(
                    "No se pudo actualizar user.weight para user=%s: %s", user.pk, exc
                )

    return entry
