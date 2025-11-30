import { useEffect, useRef, useCallback } from 'react'

interface UseAutoRefreshOptions {
  interval?: number // en milisegundos
  enabled?: boolean
  onRefresh: () => Promise<void> | void
  dependencies?: any[]
}

export function useAutoRefresh({
  interval = 120000, // 2 minutos por defecto (reducido para evitar rate limiting)
  enabled = true,
  onRefresh,
  dependencies = []
}: UseAutoRefreshOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isRefreshingRef = useRef(false)

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) return
    
    try {
      isRefreshingRef.current = true
      await onRefresh()
    } catch (error) {
      console.error('Error en auto-refresh:', error)
    } finally {
      isRefreshingRef.current = false
    }
  }, [onRefresh])

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Limpiar intervalo anterior
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Establecer nuevo intervalo
    intervalRef.current = setInterval(refresh, interval)

    // Limpiar al desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, interval, refresh, ...dependencies])

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    refresh,
    isRefreshing: isRefreshingRef.current
  }
}
