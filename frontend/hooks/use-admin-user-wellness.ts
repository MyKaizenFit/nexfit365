import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { adminWellnessService, AdminWellnessEntry, AdminWellnessSummary } from "@/lib/admin-wellness-service"

interface HookState {
  entries: AdminWellnessEntry[]
  summary: AdminWellnessSummary | null
  loading: boolean
  error: string | null
}

export function useAdminUserWellness(userId: string | number) {
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
        adminWellnessService.list(userId, headers),
        adminWellnessService.summary(userId, headers),
      ])
      setState(prev => ({ ...prev, entries, summary, loading: false }))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar bienestar"
      setState(prev => ({ ...prev, loading: false, error: message }))
    }
  }, [getAuthHeaders, userId])

  useEffect(() => {
    // Esperar a que la autenticación esté lista antes de hacer peticiones
    if (userId && isAuthenticated && !authLoading) {
      console.log(`💚 [useAdminUserWellness] Iniciando carga de datos para usuario ${userId}`)
      void fetchAll()
    } else if (authLoading) {
      console.log(`💚 [useAdminUserWellness] Esperando autenticación...`)
      setState(prev => ({ ...prev, loading: true }))
    }
  }, [userId, isAuthenticated, authLoading, fetchAll])

  // Asegurar que entries siempre sea un array
  const safeEntries = Array.isArray(state.entries) ? state.entries : []
  
  return {
    ...state,
    entries: safeEntries,
    refetch: fetchAll,
    addEntry: async (payload: Partial<AdminWellnessEntry>) => {
      const headers = await getAuthHeaders()
      const entry = await adminWellnessService.create(userId, headers, payload)
      setState(prev => {
        const prevEntries = Array.isArray(prev.entries) ? prev.entries : []
        return { ...prev, entries: [entry, ...prevEntries] }
      })
      return entry
    },
    updateEntry: async (id: string, payload: Partial<AdminWellnessEntry>) => {
      const headers = await getAuthHeaders()
      const entry = await adminWellnessService.update(userId, headers, id, payload)
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
      await adminWellnessService.remove(userId, headers, id)
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




