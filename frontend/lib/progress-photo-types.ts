/** Tipos de foto de progreso — alineados con backend/progress/photo_types.py */

export const COMPARABLE_PHOTO_TYPES = [
  "front",
  "back",
  "left_side",
  "right_side",
] as const

export type ComparablePhotoType = (typeof COMPARABLE_PHOTO_TYPES)[number]

/** Incluye legado `side` / `other` para datos antiguos. */
export type ProgressPhotoType = ComparablePhotoType | "side" | "other"

export const PHOTO_TYPE_LABELS: Record<ProgressPhotoType, string> = {
  front: "Frontal",
  back: "Espalda",
  left_side: "Lateral izquierdo",
  right_side: "Lateral derecho",
  side: "Sin clasificar",
  other: "Sin clasificar",
}

export const PHOTO_TYPE_OPTIONS: { value: ProgressPhotoType; label: string }[] = [
  { value: "front", label: "Frontal" },
  { value: "back", label: "Espalda" },
  { value: "left_side", label: "Lateral izquierdo" },
  { value: "right_side", label: "Lateral derecho" },
]

export function getPhotoTypeLabel(type?: string | null): string {
  if (!type) return "Sin clasificar"
  return PHOTO_TYPE_LABELS[type as ProgressPhotoType] || "Sin clasificar"
}

export function isComparablePhotoType(type?: string | null): type is ComparablePhotoType {
  return COMPARABLE_PHOTO_TYPES.includes(type as ComparablePhotoType)
}

export function isUnclassifiedPhotoType(type?: string | null): boolean {
  return !isComparablePhotoType(type)
}
