import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { buildApiUrl } from "@/lib/api"

export interface AdminNutritionSummary {
  plan: any | null
  macros_target: {
    calories: number | null
    protein: number | null
    carbs: number | null
    fat: number | null
  }
  macro_intake: {
    totals: Record<string, number>
    per_day: Array<Record<string, any>>
  }
  period: {
    start_date: string
    end_date: string
    days: number
  }
  logs_count: number
}

export interface AdminNutritionPlanHistoryEntry {
  id: string
  old_plan_name: string
  new_plan_name: string
  changed_by_email?: string
  reason?: string
  reason_display?: string
  notes?: string
  created_at: string
}

export interface AdminMealLog {
  id: string
  date: string
  meal_type: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  recipe_name?: string
  notes?: string
  completed?: boolean
  is_skipped?: boolean
  substitution_details?: Array<Record<string, unknown>>
  custom_description?: string
  recipe_changed?: boolean
}

export interface AdminDailyMealSlot {
  plan_meal_id?: string | null
  name: string
  meal_type: string
  suggested_recipe_name?: string | null
  status: "completed" | "pending" | "skipped" | "missing"
  log?: AdminMealLog | null
}

export interface AdminDailyMealStatus {
  date: string
  slots: AdminDailyMealSlot[]
}

interface HookState {
  summary: AdminNutritionSummary | null
  history: AdminNutritionPlanHistoryEntry[]
  logs: AdminMealLog[]
  totals: Record<string, number>
  loading: boolean
  error: string | null
}

export function useAdminUserNutrition(userId: string | number) {
  const { getAuthHeaders } = useAuth()
  const [state, setState] = useState<HookState>({
    summary: null,
    history: [],
    logs: [],
    totals: {},
    loading: true,
    error: null,
  })

  const fetchSummary = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`admin/nutrition/users/${userId}/plan/`), {
        credentials: 'include',
        headers,
      })
      if (!response.ok) {
        throw new Error(`Error ${response.status}`)
      }
      const data = await response.json()
      setState(prev => ({ ...prev, summary: data, loading: false }))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      setState(prev => ({ ...prev, loading: false, error: message }))
    }
  }, [getAuthHeaders, userId])

  const fetchHistory = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`admin/nutrition/users/${userId}/plan-history/`), {
        credentials: 'include',
        headers,
      })
      if (!response.ok) {
        throw new Error(`Error ${response.status}`)
      }
      const data = await response.json()
      setState(prev => ({ ...prev, history: data.history || [] }))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      setState(prev => ({ ...prev, error: message }))
    }
  }, [getAuthHeaders, userId])

  const fetchLogs = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`admin/nutrition/users/${userId}/meal-logs/?limit=25`), {
        credentials: 'include',
        headers,
      })
      if (!response.ok) {
        throw new Error(`Error ${response.status}`)
      }
      const data = await response.json()
      setState(prev => ({
        ...prev,
        logs: data.logs || [],
        totals: data.totals || {},
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      setState(prev => ({ ...prev, error: message }))
    }
  }, [getAuthHeaders, userId])

  const reloadAll = useCallback(async () => {
    await Promise.allSettled([fetchSummary(), fetchHistory(), fetchLogs()])
  }, [fetchHistory, fetchLogs, fetchSummary])

  useEffect(() => {
    if (userId) {
      void reloadAll()
    }
  }, [userId, reloadAll])

  return {
    ...state,
    refetch: reloadAll,
    updateLog: async (logId: string, payload: Partial<AdminMealLog>) => {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`admin/nutrition/users/${userId}/meal-logs/${logId}/`), {
        credentials: 'include',
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || "Error al actualizar el log")
      }
      await reloadAll()
    },
    deleteLog: async (logId: string) => {
      const headers = await getAuthHeaders()
      await fetch(buildApiUrl(`admin/nutrition/users/${userId}/meal-logs/${logId}/`), {
        credentials: 'include',
        method: "DELETE",
        headers,
      })
      await reloadAll()
    },
  }
}

