"""Agrupación cronológica de peso + fotos por fecha (revisión quincenal / admin)."""

from __future__ import annotations

from collections import defaultdict
from datetime import date
from typing import Any

from .models import ProgressPhoto, WeightEntry
from .photo_types import COMPARABLE_PHOTO_TYPES, PHOTO_TYPE_LABELS, is_unclassified


def _photo_payload(photo: ProgressPhoto, request=None) -> dict[str, Any]:
    from .serializers import ProgressPhotoSerializer

    data = ProgressPhotoSerializer(photo, context={"request": request}).data
    return {
        "id": data["id"],
        "date": data["date"],
        "photo_type": data["photo_type"],
        "photo_type_label": PHOTO_TYPE_LABELS.get(data["photo_type"], "Sin clasificar"),
        "photo_url": data.get("photo_url"),
        "thumbnail_url": data.get("thumbnail_url"),
        "weight": data.get("weight"),
        "notes": data.get("notes") or "",
        "created_at": data.get("created_at"),
        "unclassified": is_unclassified(data["photo_type"]),
    }


def build_progress_timeline(user, request=None) -> list[dict[str, Any]]:
    """
    Una entrada por fecha con peso (si hay) y fotos clasificadas por tipo.
    Orden: más antigua → más reciente.
    """
    photos = list(
        ProgressPhoto.objects.filter(user=user).order_by("date", "created_at")
    )
    weights = {
        w.date: float(w.weight)
        for w in WeightEntry.objects.filter(user=user).order_by("date", "created_at")
    }

    by_date: dict[date, list[ProgressPhoto]] = defaultdict(list)
    for photo in photos:
        by_date[photo.date].append(photo)

    # Incluir fechas que solo tienen peso
    all_dates = sorted(set(by_date.keys()) | set(weights.keys()))

    timeline: list[dict[str, Any]] = []
    for day in all_dates:
        day_photos = by_date.get(day, [])
        by_type: dict[str, list[dict[str, Any]]] = {
            key: [] for key, _ in COMPARABLE_PHOTO_TYPES
        }
        unclassified: list[dict[str, Any]] = []

        for photo in day_photos:
            payload = _photo_payload(photo, request)
            if any(photo.photo_type == key for key, _ in COMPARABLE_PHOTO_TYPES):
                by_type[photo.photo_type].append(payload)
            else:
                unclassified.append(payload)

        weight = weights.get(day)
        if weight is None:
            for photo in day_photos:
                if photo.weight is not None:
                    weight = float(photo.weight)
                    break

        timeline.append(
            {
                "date": day.isoformat(),
                "weight": weight,
                "weight_registered": weight is not None,
                "photos_by_type": by_type,
                "unclassified_photos": unclassified,
                "photo_count": len(day_photos),
            }
        )

    return timeline


def first_last_by_type(user, request=None) -> dict[str, dict[str, Any] | None]:
    """Primera y última foto por cada tipo comparable (nunca mezcla posturas)."""
    result: dict[str, Any] = {}
    for photo_type, label in COMPARABLE_PHOTO_TYPES:
        qs = ProgressPhoto.objects.filter(user=user, photo_type=photo_type).order_by(
            "date", "created_at"
        )
        first = qs.first()
        last = qs.last()
        result[photo_type] = {
            "label": label,
            "first": _photo_payload(first, request) if first else None,
            "last": _photo_payload(last, request) if last else None,
        }
    return result
