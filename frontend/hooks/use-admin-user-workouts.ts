import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { buildApiUrl } from "@/lib/api"

export interface AdminWorkoutProgramSummary {
  program: any | null
  summary?: {
    days_per_week?: number
    duration_weeks?: number
    total_days?: number
    training_days?: number
    is_active?: boolean
  }
}

export interface AdminWorkoutLog {
  id: string
  date: string
  duration_minutes?: number
  completed?: boolean
  rating?: number
  calories_burned?: number
  notes?: string
}

interface HookState {
  program: AdminWorkoutProgramSummary | null
  logs: AdminWorkoutLog[]
  totals: Record<string, number>
  stats: Record<string, any> | null
  loading: boolean
  error: string | null
}

export function useAdminUserWorkouts(userId: string | number) {
  const { getAuthHeaders, isAuthenticated, isLoading: authLoading } = useAuth()
  const [state, setState] = useState<HookState>({
    program: null,
    logs: [],
    totals: {},
    stats: null,
    loading: true,
    error: null,
  })

  const fetchProgram = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`admin/workouts/users/${userId}/program/`), {
        headers,
      })
      if (!response.ok) {
        throw new Error(`Error ${response.status}`)
      }
      const data = await response.json()
      setState(prev => ({ ...prev, program: data, loading: false }))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      setState(prev => ({ ...prev, loading: false, error: message }))
    }
  }, [getAuthHeaders, userId])

  const fetchLogs = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      const url = buildApiUrl(`admin/workouts/users/${userId}/workout-logs/?limit=25`)
      const response = await fetch(url, {
        headers,
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error ${response.status}`)
      }
      const data = await response.json()
      setState(prev => ({
        ...prev,
        logs: Array.isArray(data.logs) ? data.logs : [],
        totals: data.totals && typeof data.totals === 'object' ? data.totals : {},
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      setState(prev => ({ ...prev, error: message }))
    }
  }, [getAuthHeaders, userId])

  const fetchStats = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`admin/workouts/users/${userId}/workout-stats/`), {
        headers,
      })
      if (!response.ok) {
        // Si es un error 500 o similar, establecer stats vacío en lugar de error
        if (response.status >= 500) {
          setState(prev => ({ ...prev, stats: null }))
          return
        }
        throw new Error(`Error ${response.status}`)
      }
      const data = await response.json()
      setState(prev => ({ ...prev, stats: data }))
    } catch (err) {
      // En caso de error, establecer stats como null para evitar errores
      setState(prev => ({ ...prev, stats: null }))
    }
  }, [getAuthHeaders, userId])

  const reloadAll = useCallback(async () => {
    await Promise.allSettled([fetchProgram(), fetchLogs(), fetchStats()])
  }, [fetchLogs, fetchProgram, fetchStats])

  useEffect(() => {
    // Esperar a que la autenticación esté lista antes de hacer peticiones
    if (userId && isAuthenticated && !authLoading) {
      void reloadAll()
    } else if (authLoading) {
      setState(prev => ({ ...prev, loading: true }))
    }
  }, [userId, isAuthenticated, authLoading, reloadAll])

  return {
    ...state,
    refetch: reloadAll,
    updateLog: async (logId: string, payload: Partial<AdminWorkoutLog>) => {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`admin/workouts/users/${userId}/workout-logs/${logId}/`), {
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
      await fetch(buildApiUrl(`admin/workouts/users/${userId}/workout-logs/${logId}/`), {
        method: "DELETE",
        headers,
      })
      await reloadAll()
    },
  }
}

