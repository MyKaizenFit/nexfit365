import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { authenticatedFetch } from "@/lib/api"
import { parsePositiveIntId } from "@/lib/admin-id-utils"

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
  workout_day?: string | number | null
  workout_day_name?: string
  workout_day_day?: string
  duration_minutes?: number
  completed?: boolean
  rating?: number
  calories_burned?: number
  notes?: string
  exercises_data?: any[]
  log_exercises?: any[]
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
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [state, setState] = useState<HookState>({
    program: null,
    logs: [],
    totals: {},
    stats: null,
    loading: true,
    error: null,
  })

  const fetchProgram = useCallback(async (options: { silent?: boolean } = {}) => {
    const parsedUserId = parsePositiveIntId(userId)
    if (!parsedUserId) {
      setState((prev) => ({ ...prev, loading: false, error: null, program: null }))
      return
    }

    try {
      if (!options.silent) {
        setState(prev => ({ ...prev, loading: true, error: null }))
      }
      const response = await authenticatedFetch(`admin/workouts/users/${parsedUserId}/program/`)
      if (!response.ok) {
        throw new Error(`Error ${response.status}`)
      }
      const data = await response.json()
      setState(prev => ({ ...prev, program: data, loading: false }))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      setState(prev => ({ ...prev, loading: false, error: message }))
    }
  }, [userId])

  const fetchLogs = useCallback(async () => {
    const parsedUserId = parsePositiveIntId(userId)
    if (!parsedUserId) return

    try {
      const response = await authenticatedFetch(`admin/workouts/users/${parsedUserId}/workout-logs/?limit=25`)
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
  }, [userId])

  const fetchStats = useCallback(async () => {
    const parsedUserId = parsePositiveIntId(userId)
    if (!parsedUserId) return

    try {
      const response = await authenticatedFetch(`admin/workouts/users/${parsedUserId}/workout-stats/`)
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
      setState(prev => ({ ...prev, stats: null }))
    }
  }, [userId])

  const reloadAll = useCallback(async (options: { silent?: boolean } = {}) => {
    await Promise.allSettled([
      fetchProgram(options),
      fetchLogs(),
      fetchStats(),
    ])
  }, [fetchLogs, fetchProgram, fetchStats])

  useEffect(() => {
    const parsedUserId = parsePositiveIntId(userId)
    if (parsedUserId && isAuthenticated && !authLoading) {
      void reloadAll()
    } else if (authLoading) {
      setState(prev => ({ ...prev, loading: true }))
    } else if (!parsedUserId) {
      setState(prev => ({ ...prev, loading: false, program: null, logs: [], stats: null, error: null }))
    }
  }, [userId, isAuthenticated, authLoading, reloadAll])

  return {
    ...state,
    refetch: reloadAll,
    updateLog: async (logId: string, payload: Partial<AdminWorkoutLog>) => {
      const parsedUserId = parsePositiveIntId(userId)
      if (!parsedUserId) {
        throw new Error("ID de usuario no válido")
      }
      const response = await authenticatedFetch(`admin/workouts/users/${parsedUserId}/workout-logs/${logId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || "Error al actualizar el log")
      }
      await reloadAll({ silent: true })
    },
    deleteLog: async (logId: string) => {
      const parsedUserId = parsePositiveIntId(userId)
      if (!parsedUserId) {
        throw new Error("ID de usuario no válido")
      }
      await authenticatedFetch(`admin/workouts/users/${parsedUserId}/workout-logs/${logId}/`, {
        method: "DELETE",
      })
      await reloadAll({ silent: true })
    },
  }
}
