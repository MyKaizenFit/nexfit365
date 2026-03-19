import { buildApiUrl } from "@/lib/api"

export interface AdminWellnessEntry {
  id: string
  date: string
  sleep_hours: number
  motivation_score: number
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface AdminWellnessSummary {
  user_id: number
  count: number
  avg_sleep: number | null
  avg_motivation: number | null
  last: AdminWellnessEntry | null
}

export interface AdminSleepPerformancePoint {
  date: string
  sleep_hours: number | null
  motivation_score: number | null
  workout_completed: boolean
  workout_count: number
  workout_avg_rating: number | null
  workout_avg_duration_minutes: number | null
  workout_avg_calories_burned: number | null
}

export interface AdminSleepPerformanceSummary {
  wellness_days: number
  workout_days: number
  sleep_rating_pairs: number
  sleep_vs_rating_correlation: number | null
}

export interface AdminSleepPerformanceResponse {
  period_days: number
  from: string
  to: string
  summary: AdminSleepPerformanceSummary
  points: AdminSleepPerformancePoint[]
}

class AdminWellnessService {
  async list(userId: string | number, headers: HeadersInit): Promise<AdminWellnessEntry[]> {
    const res = await fetch(buildApiUrl(`admin/progress/users/${userId}/wellness/`), { headers })
    if (!res.ok) throw new Error(`Error ${res.status} al cargar bienestar`)
    return res.json()
  }

  async summary(userId: string | number, headers: HeadersInit): Promise<AdminWellnessSummary> {
    const res = await fetch(buildApiUrl(`admin/progress/users/${userId}/wellness/summary/`), { headers })
    if (!res.ok) throw new Error(`Error ${res.status} al cargar resumen de bienestar`)
    return res.json()
  }

  async create(userId: string | number, headers: HeadersInit, payload: Partial<AdminWellnessEntry>) {
    const res = await fetch(buildApiUrl(`admin/progress/users/${userId}/wellness/`), {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || "Error al crear registro de bienestar")
    }
    return res.json()
  }

  async update(userId: string | number, headers: HeadersInit, id: string, payload: Partial<AdminWellnessEntry>) {
    const res = await fetch(buildApiUrl(`admin/progress/users/${userId}/wellness/${id}/`), {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || "Error al actualizar registro de bienestar")
    }
    return res.json()
  }

  async remove(userId: string | number, headers: HeadersInit, id: string) {
    const res = await fetch(buildApiUrl(`admin/progress/users/${userId}/wellness/${id}/`), {
      method: "DELETE",
      headers,
    })
    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || "Error al eliminar registro de bienestar")
    }
  }

  async sleepPerformance(
    userId: string | number,
    headers: HeadersInit,
    days: number
  ): Promise<AdminSleepPerformanceResponse> {
    const res = await fetch(buildApiUrl(`admin/progress/users/${userId}/wellness/sleep-performance/?days=${days}`), {
      headers,
    })
    if (!res.ok) throw new Error(`Error ${res.status} al cargar sueño vs rendimiento`)
    return res.json()
  }
}

export const adminWellnessService = new AdminWellnessService()




