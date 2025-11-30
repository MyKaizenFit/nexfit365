/**
 * Sistema de throttling para requests API
 * Previene exceder los límites de rate limiting del backend
 */

import { useCallback } from 'react'

interface ThrottleConfig {
  maxRequests: number
  timeWindow: number // en milisegundos
  retryDelay: number // delay entre reintentos en ms
}

interface RequestQueue {
  [key: string]: {
    requests: number
    windowStart: number
    queue: Array<() => Promise<any>>
    processing: boolean
  }
}

class RequestThrottler {
  private config: ThrottleConfig
  private queues: RequestQueue = {}

  constructor(config: ThrottleConfig = {
    maxRequests: 100, // 100 requests por ventana
    timeWindow: 60000, // 1 minuto
    retryDelay: 1000 // 1 segundo entre reintentos
  }) {
    this.config = config
  }

  /**
   * Ejecuta una función con throttling
   */
  async throttle<T>(
    key: string,
    fn: () => Promise<T>,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const execute = async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }

      // Si no hay cola para esta clave, crear una
      if (!this.queues[key]) {
        this.queues[key] = {
          requests: 0,
          windowStart: Date.now(),
          queue: [],
          processing: false
        }
      }

      const queue = this.queues[key]

      // Agregar a la cola según prioridad
      if (priority === 'high') {
        queue.queue.unshift(execute)
      } else {
        queue.queue.push(execute)
      }

      // Procesar la cola
      this.processQueue(key)
    })
  }

  /**
   * Procesa la cola de requests para una clave específica
   */
  private async processQueue(key: string) {
    const queue = this.queues[key]
    if (!queue || queue.processing) return

    queue.processing = true

    while (queue.queue.length > 0) {
      // Verificar si necesitamos resetear la ventana de tiempo
      const now = Date.now()
      if (now - queue.windowStart >= this.config.timeWindow) {
        queue.requests = 0
        queue.windowStart = now
      }

      // Si hemos alcanzado el límite, esperar
      if (queue.requests >= this.config.maxRequests) {
        const waitTime = this.config.timeWindow - (now - queue.windowStart)
        if (waitTime > 0) {
          await this.delay(waitTime)
          continue
        }
      }

      // Ejecutar el siguiente request
      const execute = queue.queue.shift()
      if (execute) {
        queue.requests++
        try {
          await execute()
        } catch (error) {
          console.error(`Error en request throttled (${key}):`, error)
        }
      }

      // Pequeño delay entre requests para evitar saturar
      await this.delay(100)
    }

    queue.processing = false
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Limpia colas inactivas
   */
  cleanup() {
    const now = Date.now()
    Object.keys(this.queues).forEach(key => {
      const queue = this.queues[key]
      if (now - queue.windowStart > this.config.timeWindow * 2) {
        delete this.queues[key]
      }
    })
  }
}

// Instancia global del throttler
export const requestThrottler = new RequestThrottler({
  maxRequests: 90, // Un poco menos que el límite del backend (120/min)
  timeWindow: 60000, // 1 minuto
  retryDelay: 1000
})

// Limpiar colas cada 5 minutos
setInterval(() => {
  requestThrottler.cleanup()
}, 5 * 60 * 1000)

/**
 * Hook para usar throttling en componentes React
 */
export function useRequestThrottle() {
  const throttle = useCallback(
    <T>(
      key: string,
      fn: () => Promise<T>,
      priority: 'high' | 'normal' | 'low' = 'normal'
    ) => {
      return requestThrottler.throttle(key, fn, priority)
    },
    []
  )

  return { throttle }
}

/**
 * Wrapper para fetch con throttling automático
 */
export async function throttledFetch(
  url: string,
  options: RequestInit = {},
  throttleKey?: string
): Promise<Response> {
  // Generar clave de throttling de forma segura
  let key: string
  if (throttleKey) {
    key = throttleKey
  } else {
    try {
      key = new URL(url).pathname
    } catch {
      // Si es URL relativa, usar tal como está
      key = url.startsWith('/') ? url : `/${url}`
    }
  }
  
  return requestThrottler.throttle(key, async () => {
    const response = await fetch(url, options)
    
    // Si recibimos 429, esperar y reintentar
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : 2000
      
      console.warn(`Rate limited. Waiting ${delay}ms before retry...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      
      // Reintentar una vez
      return fetch(url, options)
    }
    
    return response
  })
}
