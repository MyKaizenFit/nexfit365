import { buildApiUrl } from "@/lib/api"

export interface AdminBodyMeasurement {
  id: string
  date: string
  chest?: string | number | null
  waist?: string | number | null
  hips?: string | number | null
  arms?: string | number | null
  thighs?: string | number | null
  neck?: string | number | null
  forearms?: string | number | null
  calves?: string | number | null
  notes?: string
  created_at?: string
}

export function parseMeasurementList(data: unknown): {
  results: AdminBodyMeasurement[]
  count: number
} {
  if (Array.isArray(data)) {
    return { results: data as AdminBodyMeasurement[], count: data.length }
  }
  if (data && typeof data === "object") {
    const payload = data as { results?: unknown; count?: unknown }
    if (Array.isArray(payload.results)) {
      const results = payload.results as AdminBodyMeasurement[]
      const count = typeof payload.count === "number" ? payload.count : results.length
      return { results, count }
    }
  }
  return { results: [], count: 0 }
}

class AdminMeasurementsService {
  async list(
    userId: string | number,
    headers: HeadersInit,
  ): Promise<{ results: AdminBodyMeasurement[]; count: number }> {
    const res = await fetch(
      buildApiUrl(`admin/progress/users/${userId}/measurements/?ordering=-date`),
      {
        headers,
        credentials: "include",
      },
    )
    if (!res.ok) throw new Error(`Error ${res.status} al cargar medidas corporales`)
    return parseMeasurementList(await res.json())
  }
}

export const adminMeasurementsService = new AdminMeasurementsService()
