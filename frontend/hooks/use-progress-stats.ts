import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { progressService, ProgressStats } from '@/lib/progress-service'

export function useProgressStats() {
  const { isAuthenticated } = useAuth()
  const [stats, setStats] = useState<ProgressStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await progressService.getProgressStats()
      setStats(data)
    } catch (err) {
      if (err instanceof Error && err.message.includes('token')) {
        setStats(null)
        return
      }
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats()
    } else {
      setStats(null)
      setLoading(false)
    }
  }, [isAuthenticated])

  const refreshStats = () => {
    fetchStats()
  }

  return {
    stats,
    loading,
    error,
    refreshStats,
  }
}






