import {
  COMPARABLE_PHOTO_TYPES,
  ComparablePhotoType,
  getPhotoTypeLabel,
  isComparablePhotoType,
} from "@/lib/progress-photo-types"

export interface ComparablePhoto {
  id: string | number
  date: string
  photo_url: string
  photo_type: string
  weight?: number
}

export interface TypeComparison {
  type: ComparablePhotoType
  label: string
  first: ComparablePhoto | null
  last: ComparablePhoto | null
}

function sortByDateAsc<T extends { date: string; id: string | number }>(photos: T[]): T[] {
  return [...photos].sort((a, b) => {
    const dateDiff = new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()
    return dateDiff || String(a.id).localeCompare(String(b.id))
  })
}

/** Primera y última foto por cada postura comparable. Nunca mezcla tipos. */
export function buildComparisonsByType(photos: ComparablePhoto[]): TypeComparison[] {
  return COMPARABLE_PHOTO_TYPES.map((type) => {
    const ofType = sortByDateAsc(photos.filter((p) => p.photo_type === type))
    return {
      type,
      label: getPhotoTypeLabel(type),
      first: ofType[0] || null,
      last: ofType.length ? ofType[ofType.length - 1] : null,
    }
  })
}

export interface DayPackage {
  date: string
  weight: number | null
  photosByType: Record<ComparablePhotoType, ComparablePhoto | null>
  unclassified: ComparablePhoto[]
  all: ComparablePhoto[]
}

/** Agrupa por fecha; una foto representativa por tipo (la más reciente del día). */
export function buildDayPackages(
  photos: ComparablePhoto[],
  weightByDate?: Record<string, number | null | undefined>,
): DayPackage[] {
  const byDate = new Map<string, ComparablePhoto[]>()
  for (const photo of photos) {
    const date = photo.date || "Sin fecha"
    const list = byDate.get(date) || []
    list.push(photo)
    byDate.set(date, list)
  }

  const dates = [...byDate.keys()].sort((a, b) => b.localeCompare(a))

  return dates.map((date) => {
    const all = sortByDateAsc(byDate.get(date) || [])
    const photosByType = Object.fromEntries(
      COMPARABLE_PHOTO_TYPES.map((type) => {
        const matches = all.filter((p) => p.photo_type === type)
        return [type, matches.length ? matches[matches.length - 1] : null]
      }),
    ) as Record<ComparablePhotoType, ComparablePhoto | null>

    const unclassified = all.filter((p) => !isComparablePhotoType(p.photo_type))
    const weightFromMap = weightByDate?.[date]
    const weightFromPhoto = all.find((p) => p.weight != null)?.weight
    const weight =
      weightFromMap != null && weightFromMap !== undefined
        ? Number(weightFromMap)
        : weightFromPhoto != null
          ? Number(weightFromPhoto)
          : null

    return { date, weight, photosByType, unclassified, all }
  })
}
