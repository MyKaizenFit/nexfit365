import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { buildApiUrl } from "@/lib/api"

export interface ProfileHistoryEntry {
  id: string
  user_id: number
  changed_by_email?: string | null
  created_at: string
  changes: Record<string, { old: any; new: any }>
}

export function useAdminUserProfileHistory(userId: string | number) {
  const { getAuthHeaders } = useAuth()
  const [data, setData] = useState<ProfileHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      const headers = await getAuthHeaders()
      const res = await fetch(buildApiUrl(`admin/users/audit/profile/${userId}/`), { headers })
      if (!res.ok) {
        throw new Error(`Error ${res.status}`)
      }
      const json = await res.json()
      setData(json.history || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) void fetchHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  return { history: data, loading, error, refetch: fetchHistory }
}

