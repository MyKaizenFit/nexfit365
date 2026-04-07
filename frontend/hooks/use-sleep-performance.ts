import { useState, useEffect, useCallback } from 'react'
import { progressService, SleepPerformanceResponse } from '@/lib/progress-service'

export function useSleepPerformance(days: number) {
  const [data, setData] = useState<SleepPerformanceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await progressService.getSleepPerformance(days)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}
