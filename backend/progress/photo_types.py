"""Tipos de foto de progreso — fuente única para modelo, serializers y APIs."""

# Tipos usados en comparación y subida (producto).
COMPARABLE_PHOTO_TYPES = (
    ("front", "Frontal"),
    ("back", "Espalda"),
    ("left_side", "Lateral izquierdo"),
    ("right_side", "Lateral derecho"),
)

# Legado: se mantienen para no invalidar filas antiguas; se muestran como sin clasificar.
LEGACY_PHOTO_TYPES = (
    ("side", "Sin clasificar"),
    ("other", "Sin clasificar"),
)

PHOTO_TYPES = COMPARABLE_PHOTO_TYPES + LEGACY_PHOTO_TYPES

COMPARABLE_TYPE_KEYS = frozenset(k for k, _ in COMPARABLE_PHOTO_TYPES)
ALL_TYPE_KEYS = frozenset(k for k, _ in PHOTO_TYPES)
LEGACY_TYPE_KEYS = frozenset(k for k, _ in LEGACY_PHOTO_TYPES)

PHOTO_TYPE_LABELS = dict(PHOTO_TYPES)


def is_unclassified(photo_type: str) -> bool:
    return photo_type in LEGACY_TYPE_KEYS or photo_type not in ALL_TYPE_KEYS
