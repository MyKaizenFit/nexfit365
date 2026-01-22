import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { adminProgressService, AdminWeightEntry, AdminWeightSummary } from "@/lib/admin-progress-service"

interface HookState {
  entries: AdminWeightEntry[]
  summary: AdminWeightSummary | null
  loading: boolean
  error: string | null
}

export function useAdminUserProgress(userId: string | number) {
  const { getAuthHeaders, isAuthenticated, isLoading: authLoading } = useAuth()
  const [state, setState] = useState<HookState>({
    entries: [],
    summary: null,
    loading: true,
    error: null,
  })

  const fetchAll = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      const headers = await getAuthHeaders()
      const [entries, summary] = await Promise.all([
        adminProgressService.listWeightEntries(userId, headers),
        adminProgressService.summary(userId, headers),
      ])
      setState(prev => ({ ...prev, entries, summary, loading: false }))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar progreso"
      setState(prev => ({ ...prev, loading: false, error: message }))
    }
  }, [getAuthHeaders, userId])

  useEffect(() => {
    // Esperar a que la autenticación esté lista antes de hacer peticiones
    if (userId && isAuthenticated && !authLoading) {
      void fetchAll()
    } else if (authLoading) {
      setState(prev => ({ ...prev, loading: true }))
    }
  }, [userId, isAuthenticated, authLoading, fetchAll])

  // Asegurar que entries siempre sea un array
  const safeEntries = Array.isArray(state.entries) ? state.entries : []
  
  return {
    ...state,
    entries: safeEntries,
    refetch: fetchAll,
    addEntry: async (payload: { weight: number; date: string; notes?: string }) => {
      const headers = await getAuthHeaders()
      const entry = await adminProgressService.addWeightEntry(userId, headers, payload)
      setState(prev => {
        const prevEntries = Array.isArray(prev.entries) ? prev.entries : []
        return { ...prev, entries: [entry, ...prevEntries] }
      })
      return entry
    },
    updateEntry: async (id: string, payload: { weight?: number; date?: string; notes?: string }) => {
      const headers = await getAuthHeaders()
      const entry = await adminProgressService.updateWeightEntry(userId, headers, id, payload)
      setState(prev => {
        const prevEntries = Array.isArray(prev.entries) ? prev.entries : []
        return {
          ...prev,
          entries: prevEntries.map(e => (e && e.id === id ? entry : e)),
        }
      })
      return entry
    },
    deleteEntry: async (id: string) => {
      const headers = await getAuthHeaders()
      await adminProgressService.deleteWeightEntry(userId, headers, id)
      setState(prev => {
        const prevEntries = Array.isArray(prev.entries) ? prev.entries : []
        return {
          ...prev,
          entries: prevEntries.filter(e => e && e.id !== id),
        }
      })
    },
  }
}




