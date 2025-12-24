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
}

export const adminWellnessService = new AdminWellnessService()



