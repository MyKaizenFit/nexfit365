import { buildApiUrl } from "@/lib/api"

export interface AdminWeightEntry {
  id: string
  weight: number
  date: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface AdminWeightSummary {
  user_id: number
  count: number
  current: AdminWeightEntry | null
  previous: AdminWeightEntry | null
  latest?: AdminWeightEntry | null
  change: number | null
  min: number | null
  max: number | null
  avg: number | null
}

class AdminProgressService {
  private parseWeightEntries(data: unknown): AdminWeightEntry[] {
    if (Array.isArray(data)) {
      return data
    }
    if (data && typeof data === "object" && "results" in data) {
      const results = (data as { results?: AdminWeightEntry[] }).results
      return Array.isArray(results) ? results : []
    }
    return []
  }

  async listWeightEntries(userId: string | number, headers: HeadersInit): Promise<AdminWeightEntry[]> {
    const res = await fetch(buildApiUrl(`admin/progress/users/${userId}/weight-history/?page_size=500`), {
      headers,
    })
    if (!res.ok) throw new Error(`Error ${res.status} al cargar historial de peso`)
    const data = await res.json()
    return this.parseWeightEntries(data)
  }

  async summary(userId: string | number, headers: HeadersInit): Promise<AdminWeightSummary> {
    const res = await fetch(buildApiUrl(`admin/progress/users/${userId}/weight-history/summary/`), {
      headers,
    })
    if (!res.ok) throw new Error(`Error ${res.status} al cargar resumen de peso`)
    return res.json()
  }

  async addWeightEntry(
    userId: string | number,
    headers: HeadersInit,
    payload: { weight: number; date: string; notes?: string }
  ) {
    const res = await fetch(buildApiUrl(`admin/progress/users/${userId}/weight-history/`), {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || "Error al crear la entrada de peso")
    }
    return res.json()
  }

  async updateWeightEntry(
    userId: string | number,
    id: string,
    headers: HeadersInit,
    payload: { weight?: number; date?: string; notes?: string }
  ) {
    const res = await fetch(buildApiUrl(`admin/progress/users/${userId}/weight-history/${id}/`), {
      method: "PATCH",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || "Error al actualizar la entrada de peso")
    }
    return res.json()
  }

  async deleteWeightEntry(userId: string | number, headers: HeadersInit, id: string) {
    const res = await fetch(buildApiUrl(`admin/progress/users/${userId}/weight-history/${id}/`), {
      method: "DELETE",
      headers,
    })
    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || "Error al eliminar la entrada de peso")
    }
  }
}

export const adminProgressService = new AdminProgressService()


