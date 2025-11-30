/**
 * Hook para manejar requests API con throttling y caché automático
 */

import { useState, useCallback, useRef } from 'react'
import { requestThrottler } from '@/lib/request-throttle'
import { apiCache, generateCacheKey } from '@/lib/api-cache'

interface UseThrottledApiOptions {
  cacheTTL?: number // TTL del caché en milisegundos
  throttleKey?: string // Clave para throttling (por defecto usa la URL)
  priority?: 'high' | 'normal' | 'low'
  retryOnError?: boolean
  maxRetries?: number
}

interface UseThrottledApiReturn<T> {
  data: T | null
  loading: boolean
  error: string | null
  execute: (url: string, options?: RequestInit) => Promise<T | null>
  clearCache: () => void
  clearError: () => void
}

export function useThrottledApi<T = any>(
  options: UseThrottledApiOptions = {}
): UseThrottledApiReturn<T> {
  const {
    cacheTTL = 2 * 60 * 1000, // 2 minutos por defecto
    throttleKey,
    priority = 'normal',
    retryOnError = true,
    maxRetries = 2
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const retryCountRef = useRef(0)

  const execute = useCallback(async (
    url: string,
    requestOptions: RequestInit = {}
  ): Promise<T | null> => {
    const cacheKey = generateCacheKey(url, requestOptions.body ? JSON.parse(requestOptions.body as string) : undefined)
    
    // Generar throttleKey de forma segura
    let throttleKeyToUse: string
    if (throttleKey) {
      throttleKeyToUse = throttleKey
    } else {
      try {
        throttleKeyToUse = new URL(url).pathname
      } catch {
        // Si es URL relativa, usar tal como está
        throttleKeyToUse = url.startsWith('/') ? url : `/${url}`
      }
    }

    // Intentar obtener del caché primero
    const cached = apiCache.get<T>(cacheKey)
    if (cached) {
      setData(cached)
      setError(null)
      return cached
    }

    setLoading(true)
    setError(null)

    try {
      const result = await requestThrottler.throttle(throttleKeyToUse, async () => {
        const response = await fetch(url, requestOptions)

        // Manejar rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : 2000
          
          console.warn(`Rate limited. Waiting ${delay}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          
          // Reintentar una vez
          return fetch(url, requestOptions)
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return response.json()
      }, priority)

      setData(result)
      
      // Almacenar en caché
      apiCache.set(cacheKey, result, cacheTTL)
      
      retryCountRef.current = 0
      return result

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)

      // Reintentar si está habilitado y no hemos excedido el máximo
      if (retryOnError && retryCountRef.current < maxRetries) {
        retryCountRef.current++
        console.warn(`Reintentando request (${retryCountRef.current}/${maxRetries}):`, errorMessage)
        
        // Esperar un poco antes del reintento
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCountRef.current))
        
        return execute(url, requestOptions)
      }

      console.error('Error en request throttled:', errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [cacheTTL, throttleKey, priority, retryOnError, maxRetries])

  const clearCache = useCallback(() => {
    apiCache.clear()
    setData(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
    retryCountRef.current = 0
  }, [])

  return {
    data,
    loading,
    error,
    execute,
    clearCache,
    clearError
  }
}

/**
 * Hook especializado para requests GET con caché
 */
export function useCachedGet<T = any>(
  url: string,
  options: UseThrottledApiOptions & { 
    enabled?: boolean
    dependencies?: any[]
  } = {}
) {
  const { enabled = true, dependencies = [], ...apiOptions } = options
  const api = useThrottledApi<T>(apiOptions)

  const fetchData = useCallback(async () => {
    if (!enabled || !url) return null
    
    return api.execute(url, { method: 'GET' })
  }, [enabled, url, api.execute, ...dependencies])

  return {
    ...api,
    fetchData
  }
}
