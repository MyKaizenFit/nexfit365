import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import {
  adminWellnessService,
  AdminSleepPerformanceResponse,
} from "@/lib/admin-wellness-service"

interface HookState {
  data: AdminSleepPerformanceResponse | null
  loading: boolean
  error: string | null
}

export function useAdminUserSleepPerformance(userId: string | number, days: number) {
  const { getAuthHeaders, isAuthenticated, isLoading: authLoading } = useAuth()
  const [state, setState] = useState<HookState>({
    data: null,
    loading: true,
    error: null,
  })

  const fetchData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      const headers = await getAuthHeaders()
      const data = await adminWellnessService.sleepPerformance(userId, headers, days)
      setState({ data, loading: false, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar sueño vs rendimiento"
      setState(prev => ({ ...prev, loading: false, error: message }))
    }
  }, [days, getAuthHeaders, userId])

  useEffect(() => {
    if (userId && isAuthenticated && !authLoading) {
      void fetchData()
    } else if (authLoading) {
      setState(prev => ({ ...prev, loading: true }))
    }
  }, [authLoading, fetchData, isAuthenticated, userId])

  return {
    ...state,
    refetch: fetchData,
  }
}