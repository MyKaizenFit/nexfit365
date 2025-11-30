/**
 * Sistema de caché para requests API
 * Reduce requests duplicadas y mejora el rendimiento
 */

import { useCallback } from 'react'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // time to live en milisegundos
}

interface CacheConfig {
  defaultTTL: number // TTL por defecto en milisegundos
  maxSize: number // máximo número de entradas en caché
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>()
  private config: CacheConfig

  constructor(config: CacheConfig = {
    defaultTTL: 5 * 60 * 1000, // 5 minutos por defecto
    maxSize: 100 // máximo 100 entradas
  }) {
    this.config = config
  }

  /**
   * Obtiene un valor del caché
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Verificar si ha expirado
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Almacena un valor en el caché
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Si el caché está lleno, eliminar la entrada más antigua
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL
    })
  }

  /**
   * Elimina una entrada del caché
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Limpia todas las entradas expiradas
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Limpia todo el caché
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Obtiene estadísticas del caché
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      entries: Array.from(this.cache.keys())
    }
  }
}

// Instancia global del caché
export const apiCache = new ApiCache({
  defaultTTL: 2 * 60 * 1000, // 2 minutos por defecto
  maxSize: 50 // máximo 50 entradas
})

// Limpiar caché cada 5 minutos
setInterval(() => {
  apiCache.cleanup()
}, 5 * 60 * 1000)

/**
 * Genera una clave de caché basada en la URL y parámetros
 */
export function generateCacheKey(url: string, params?: Record<string, any>): string {
  let baseKey: string
  
  try {
    // Intentar crear URL object (funciona para URLs absolutas)
    const urlObj = new URL(url)
    baseKey = urlObj.pathname
  } catch {
    // Si falla, es una URL relativa, usar tal como está
    baseKey = url.startsWith('/') ? url : `/${url}`
  }
  
  if (params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&')
    return `${baseKey}?${sortedParams}`
  }
  
  return baseKey
}

/**
 * Wrapper para fetch con caché automático
 */
export async function cachedFetch<T>(
  url: string,
  options: RequestInit = {},
  cacheTTL?: number
): Promise<T> {
  const cacheKey = generateCacheKey(url, options.body ? JSON.parse(options.body as string) : undefined)
  
  // Intentar obtener del caché primero
  const cached = apiCache.get<T>(cacheKey)
  if (cached) {
    console.log(`Cache hit for ${cacheKey}`)
    return cached
  }

  // Si no está en caché, hacer la request
  console.log(`Cache miss for ${cacheKey}`)
  const response = await fetch(url, options)
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()
  
  // Almacenar en caché
  apiCache.set(cacheKey, data, cacheTTL)
  
  return data
}

/**
 * Hook para usar caché en componentes React
 */
export function useApiCache() {
  const get = useCallback(<T>(key: string): T | null => {
    return apiCache.get<T>(key)
  }, [])

  const set = useCallback(<T>(key: string, data: T, ttl?: number): void => {
    apiCache.set(key, data, ttl)
  }, [])

  const deleteEntry = useCallback((key: string): void => {
    apiCache.delete(key)
  }, [])

  const clear = useCallback((): void => {
    apiCache.clear()
  }, [])

  return {
    get,
    set,
    delete: deleteEntry,
    clear,
    stats: apiCache.getStats()
  }
}
