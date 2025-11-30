import { useState, useEffect } from 'react'
import { progressService, ProgressStats } from '@/lib/progress-service'

export function useProgressStats() {
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
      setError(err instanceof Error ? err.message : 'Error desconocido')
      console.error('Error al obtener estadísticas de progreso:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

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






