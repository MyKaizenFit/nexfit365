// lib/api.ts
// Configuración base de la API y endpoints

// No importar authService aquí para evitar importación circular
// Se importará dinámicamente cuando sea necesario

// Helper para obtener la URL base de forma segura (tanto en cliente como servidor)
export const getApiBaseUrl = (): string => {
  // SIEMPRE usar la variable de entorno (NUNCA hardcodear localhost)
  const envUrl = process.env.NEXT_PUBLIC_API_URL

  if (envUrl) {
    // Si hay variable de entorno, usarla (remover /api si está al final)
    const baseUrl = envUrl.replace(/\/api\/?$/, '').replace(/\/?$/, '')
    return baseUrl
  }

  // Si no hay variable de entorno, lanzar error en producción
  if (process.env.NODE_ENV === 'production') {
    // En producción, usar el dominio HTTPS como fallback si no hay variable de entorno
    return 'https://api.nexfit365.dpdns.org'
  }

  // Solo en desarrollo, usar localhost:8000 como fallback
  return 'http://localhost:8000'
}

export const API_CONFIG = {
  // URL base de la API (cambiar según entorno)
  get BASE_URL() {
    return getApiBaseUrl()
  },

  // Timeout para requests
  TIMEOUT: 10000,

  // Headers por defecto
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json; charset=utf-8',
    'Accept': 'application/json; charset=utf-8',
  }
}

// Endpoints de autenticación
export const AUTH_ENDPOINTS = {
  LOGIN: 'auth/login/',
  REGISTER: 'auth/register/',
  REFRESH: 'auth/refresh/',
  LOGOUT: 'auth/logout/',
  FORGOT_PASSWORD: 'auth/forgot-password/',
  RESET_PASSWORD: 'auth/reset-password/',
  CHANGE_PASSWORD: 'auth/change-password/',
  CHANGE_PASSWORD_AFTER_TEMPORARY: 'auth/change-password-after-temporary/',
  ME: 'me/',
}

// Endpoints de usuarios
export const USER_ENDPOINTS = {
  PROFILE: 'me/',
  UPDATE_PROFILE: 'me/',
  COMPLETE_INITIAL_REGISTRATION: 'profile/initial-registration',
  INITIAL_REGISTRATION_STATUS: 'profile/initial-registration/status',
}

// Endpoints de entrenamientos
export const WORKOUT_ENDPOINTS = {
  PROGRAMS: 'workout-programs/',
  SESSIONS: 'workout-logs/',
  EXERCISES: 'exercises/',
}

// Endpoints de nutrición (todos con prefijo nutrition/)
export const NUTRITION_ENDPOINTS = {
  PLANS: 'nutrition/plans/',
  MEALS: 'nutrition/meal-logs/',
  FOODS: 'nutrition/foods/',
  DEFAULT_PLANS: 'nutrition/default-plans/',
  CURRENT_PLAN: 'nutrition/current-plan/',
  CHANGE_PLAN: 'nutrition/change-plan/',
  SUITABLE_PLANS: 'nutrition/personalized/suitable-plans/',
  PLAN_MEALS_FOR_SELECTION: 'nutrition/plan-meals-for-selection/',
  PLAN_MEALS_FOR_SELECTION_BATCH: 'nutrition/plan-meals-for-selection-batch/',
  SHOPPING_LIST: 'nutrition/shopping-list/',
  PLAN_HISTORY: 'nutrition/plan-history/',
  RECIPES: 'nutrition/recipes/',
}

// Endpoints de progreso
export const PROGRESS_ENDPOINTS = {
  PHOTOS: 'progress-photos/',
  WEIGHT: 'weight-history/',
  MEASUREMENTS: 'measurements/',
}

// Endpoints de logros
export const ACHIEVEMENT_ENDPOINTS = {
  ACHIEVEMENTS: 'achievements/',
  USER_ACHIEVEMENTS: 'user-achievements/',
}

// Endpoints de notificaciones
export const NOTIFICATION_ENDPOINTS = {
  NOTIFICATIONS: 'notifications/',
}

// Endpoints del dashboard
export const DASHBOARD_ENDPOINTS = {
  DASHBOARD: 'dashboard/',
}

// Endpoints de consejos
export const TIPS_ENDPOINTS = {
  TIPS: 'tips/',
}

// Endpoints de configuraciones
export const CONFIGURATION_ENDPOINTS = {
  DEFAULT_PLAN_CONFIGURATIONS: 'default-plan-configurations/',
}

// Función para construir URLs completas
export const buildApiUrl = (endpoint: string): string => {
  // Asegurar que no haya dobles barras
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  return `${API_CONFIG.BASE_URL}/api/${cleanEndpoint}`
}

/** URL absoluta para archivos en /media/ (vídeos, miniaturas). */
export const buildMediaUrl = (mediaPath?: string | null): string | null => {
  if (!mediaPath) return null
  if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
    return mediaPath
  }
  const cleanPath = mediaPath.startsWith('/') ? mediaPath : `/${mediaPath}`
  return `${API_CONFIG.BASE_URL}${cleanPath}`
}

// Función para obtener headers con autenticación
export const getAuthHeaders = (token?: string): Record<string, string> => {
  const headers: Record<string, string> = { ...API_CONFIG.DEFAULT_HEADERS }

  let authToken = token

  // Optional Bearer for scripts/offline; browsers rely on HttpOnly cookies.
  if (!authToken && typeof window !== 'undefined') {
    try {
      const { getAuthService } = require('./auth-service')
      const authService = getAuthService()
      const serviceToken = authService.getAccessToken()
      if (serviceToken) {
        authToken = serviceToken
      }
    } catch {
      // ignore
    }
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  if (typeof window !== 'undefined') {
    try {
      const csrf = document.cookie
        .split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith('csrfToken='))
      if (csrf) {
        headers['X-CSRFToken'] = decodeURIComponent(csrf.substring('csrfToken='.length))
      }
    } catch {
      // ignore
    }
  }

  return headers
}

// Función helper para parsear JSON con UTF-8 correctamente
const parseJsonWithUTF8 = async <T>(response: Response): Promise<T> => {
  const text = await response.text()
  // El texto ya viene en UTF-8 del servidor, solo necesitamos parsearlo
  return JSON.parse(text) as T
}

// Función para manejar respuestas de la API
export const handleApiResponse = async <T>(response: Response): Promise<{ data: T | null; error: string | null }> => {
  try {
    if (response.ok) {
      // Si la respuesta es exitosa, intentar parsear JSON
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return { data: null, error: null }
      }

      // Asegurar que el JSON se parsee con UTF-8
      const data = await parseJsonWithUTF8<T>(response)
      return { data, error: null }
    } else {
      // Si hay error, intentar obtener el mensaje de error
      let errorMessage = `Error ${response.status}: ${response.statusText}`

      // Manejo especial para rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        if (retryAfter) {
          errorMessage = `Demasiadas solicitudes. Inténtalo de nuevo en ${retryAfter} segundos.`
        } else {
          errorMessage = 'Demasiadas solicitudes. Por favor, espera un momento antes de intentar de nuevo.'
        }
        return { data: null, error: errorMessage }
      }

      try {
        const errorData = await parseJsonWithUTF8<any>(response)
        if (errorData.detail) {
          errorMessage = errorData.detail
        } else if (errorData.message) {
          errorMessage = errorData.message
        } else if (errorData.error) {
          errorMessage = errorData.error
        } else if (typeof errorData === 'string') {
          errorMessage = errorData
        }
      } catch (parseError) {
        // Si no se puede parsear el error, usar el mensaje por defecto
      }

      return { data: null, error: errorMessage }
    }
  } catch (error) {
    return { data: null, error: 'Error al procesar la respuesta' }
  }
}

// Función para manejar errores de fetch
export const handleFetchError = (error: any): Error => {
  if (error instanceof Error) {
    return error
  }

  if (typeof error === 'string') {
    return new Error(error)
  }

  return new Error('Error desconocido')
}

// Función para obtener la instancia de AuthService de forma dinámica
const getAuthService = () => {
  // Importación dinámica para evitar importación circular
  const { getAuthService } = require('./auth-service')
  return getAuthService()
}

const isRetryableStatus = (status: number): boolean => {
  return status === 429 || status === 502 || status === 503 || status === 504
}

const isRetryableNetworkError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  return (
    message.includes('failed to fetch')
    || message.includes('networkerror')
    || message.includes('network request failed')
    || message.includes('load failed')
    || message.includes('aborted')
  )
}

export type AuthenticatedFetchOptions = RequestInit & {
  uploadTimeoutMs?: number
  networkRetries?: number
}

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

const getClientContextHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {}

  const path = `${window.location.pathname}${window.location.search}${window.location.hash}`
  return {
    'X-Client-Path': path,
    'X-Client-Url': window.location.href,
  }
}

// Función para hacer requests con manejo automático de renovación de tokens
export const authenticatedFetch = async (url: string, options: AuthenticatedFetchOptions = {}): Promise<Response> => {
  const authService = getAuthService()
  const method = (options.method || 'GET').toUpperCase()
  const { uploadTimeoutMs, networkRetries = 0, ...fetchOptions } = options
  const canRetryTransient = method === 'GET' || method === 'HEAD' || method === 'OPTIONS'
  const maxTransientRetries = canRetryTransient ? 2 : networkRetries
  let transientAttempt = 0

  if (!authService.isAuthenticated() && !authService.getAccessToken()) {
    throw new Error('No hay sesión de acceso disponible')
  }

  const buildHeaders = (): HeadersInit => ({
    ...options.headers,
    ...getClientContextHeaders(),
    ...getAuthHeaders(authService.getAccessToken() || undefined),
  })

  const executeRequest = async (): Promise<Response> => {
    const controller = uploadTimeoutMs ? new AbortController() : null
    const timeoutId = controller
      ? window.setTimeout(() => controller.abort(), uploadTimeoutMs)
      : null

    try {
      return await fetch(buildApiUrl(url), {
        ...fetchOptions,
        credentials: 'include',
        signal: controller ? controller.signal : fetchOptions.signal,
        headers: buildHeaders(),
      })
    } finally {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }
  }

  while (true) {
    try {
      const response = await executeRequest()

      // Si recibimos un 401, intentar refrescar el token
      if (response.status === 401) {

        try {
          const refreshResult = await authService.refreshAccessTokenDeduped()

          if (refreshResult && refreshResult.success) {

            // Reintentar la request con cookies renovadas
            const retryResponse = await executeRequest()

            // Si el retry también falla con 401, NO cerrar sesión automáticamente
            if (retryResponse.status === 401) {
              // NO redirigir automáticamente, solo loguear
              throw new Error('Token expirado. Por favor, cierra sesión e inicia de nuevo.')
            }

            return retryResponse
          } else {
            // NO redirigir automáticamente, el usuario debe cerrar sesión manualmente
            throw new Error(refreshResult?.error || 'Token expirado. Por favor, cierra sesión e inicia de nuevo.')
          }
        } catch (refreshError) {
          // NO limpiar tokens ni redirigir automáticamente
          throw refreshError instanceof Error ? refreshError : new Error('Error de autenticación. Por favor, intenta de nuevo.')
        }
      }

      if (canRetryTransient && isRetryableStatus(response.status) && transientAttempt < maxTransientRetries) {
        transientAttempt += 1
        await delay(250 * transientAttempt)
        continue
      }

      return response
    } catch (error) {
      if (canRetryTransient && isRetryableNetworkError(error) && transientAttempt < maxTransientRetries) {
        transientAttempt += 1
        await delay(250 * transientAttempt)
        continue
      }

      throw error
    }
  }
}
