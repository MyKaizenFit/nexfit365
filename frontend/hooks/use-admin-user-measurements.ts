import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import {
  adminMeasurementsService,
  AdminBodyMeasurement,
} from "@/lib/admin-measurements-service"

interface HookState {
  entries: AdminBodyMeasurement[]
  count: number
  loading: boolean
  error: string | null
}

export function useAdminUserMeasurements(userId: string | number) {
  const { getAuthHeaders, isAuthenticated, isLoading: authLoading } = useAuth()
  const [state, setState] = useState<HookState>({
    entries: [],
    count: 0,
    loading: true,
    error: null,
  })

  const fetchAll = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      const headers = await getAuthHeaders()
      const { results, count } = await adminMeasurementsService.list(userId, headers)
      const entries = Array.isArray(results) ? results : []
      setState({ entries, count, loading: false, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar medidas corporales"
      setState(prev => ({ ...prev, loading: false, error: message }))
    }
  }, [getAuthHeaders, userId])

  useEffect(() => {
    if (userId && isAuthenticated && !authLoading) {
      void fetchAll()
    } else if (authLoading) {
      setState(prev => ({ ...prev, loading: true }))
    }
  }, [userId, isAuthenticated, authLoading, fetchAll])

  const safeEntries = Array.isArray(state.entries) ? state.entries : []

  return {
    ...state,
    entries: safeEntries,
    refetch: fetchAll,
  }
}
