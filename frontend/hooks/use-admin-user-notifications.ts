import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { buildApiUrl } from "@/lib/api"

export interface AdminNotificationItem {
  id: string
  type: string
  title: string
  message: string
  read_at?: string | null
  created_at: string
}

export function useAdminUserNotifications(userId: string | number) {
  const { getAuthHeaders } = useAuth()
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const headers = await getAuthHeaders()
      const res = await fetch(buildApiUrl(`admin/notifications/?user_id=${userId}`), { headers })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      setNotifications(data.results || data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando notificaciones")
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders, userId])

  useEffect(() => {
    if (userId) void fetchAll()
  }, [userId, fetchAll])

  return {
    notifications,
    loading,
    error,
    refetch: fetchAll,
    send: async (payload: { title: string; message: string; type?: string; priority?: string }) => {
      const headers = await getAuthHeaders()
      const res = await fetch(buildApiUrl(`admin/notifications/send_bulk/`), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: [Number(userId)], ...payload }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || "Error al enviar notificación")
      }
      await fetchAll()
    },
  }
}




