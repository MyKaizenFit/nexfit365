// lib/api.ts
// Configuración base de la API y endpoints

// No importar authService aquí para evitar importación circular
// Se importará dinámicamente cuando sea necesario

// Helper para obtener la URL base de forma segura (tanto en cliente como servidor)
const getApiBaseUrl = (): string => {
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
    console.warn('⚠️  NEXT_PUBLIC_API_URL no está configurada en producción, usando dominio HTTPS como fallback')
    return 'https://api.nexfit365.dpdns.org'
  }

  // Solo en desarrollo, usar localhost como fallback
  console.warn('⚠️  NEXT_PUBLIC_API_URL no está configurada, usando localhost:8000 como fallback (solo desarrollo)')
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
    'Content-Type': 'application/json',
    'Accept': 'application/json',
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
  COMPLETE_INITIAL_REGISTRATION: 'profile/initial-registration/',
  INITIAL_REGISTRATION_STATUS: 'profile/initial-registration/status/',
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
  DEFAULT_PLAN_CONFIGURATIONS: 'nutrition/default-plan-configurations/',
}

// Función para construir URLs completas
export const buildApiUrl = (endpoint: string): string => {
  // Asegurar que no haya dobles barras
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  return `${API_CONFIG.BASE_URL}/api/${cleanEndpoint}`
}

// Función para obtener headers con autenticación
export const getAuthHeaders = (token?: string): Record<string, string> => {
  const headers = { ...API_CONFIG.DEFAULT_HEADERS }

  let authToken = token

  // Si no se proporciona token, intentar obtenerlo del contexto de autenticación
  if (!authToken && typeof window !== 'undefined') {
    try {
      // Primero intentar obtener el token del servicio de autenticación
      try {
        const { authService } = require('./auth-service')
        const serviceToken = authService.getAccessToken()
        if (serviceToken) {
          authToken = serviceToken
          console.log('🔐 getAuthHeaders - Token obtenido del servicio de autenticación:', `${authToken.substring(0, 20)}...`)
        }
      } catch (serviceError) {
        console.warn('No se pudo obtener el token del servicio de autenticación:', serviceError)
      }

      // Si no se obtuvo del servicio, intentar obtenerlo de las cookies
      if (!authToken) {
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=')
          acc[key] = value
          return acc
        }, {} as Record<string, string>)

        authToken = cookies.accessToken

        // Debug: verificar el token obtenido
        console.log('🔐 getAuthHeaders - Token obtenido de cookies:', authToken ? `${authToken.substring(0, 20)}...` : 'null')
        console.log('🔐 getAuthHeaders - Todas las cookies:', document.cookie)
      }
    } catch (error) {
      console.warn('No se pudo obtener el token de autenticación:', error)
    }
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
    console.log('🔐 getAuthHeaders - Headers con autorización:', { ...headers, Authorization: `Bearer ${authToken.substring(0, 20)}...` })
  } else {
    console.warn('🔐 getAuthHeaders - No se encontró token de autenticación')
  }

  return headers
}

// Función para manejar respuestas de la API
export const handleApiResponse = async <T>(response: Response): Promise<{ data: T | null; error: string | null }> => {
  try {
    if (response.ok) {
      // Si la respuesta es exitosa, intentar parsear JSON
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return { data: null, error: null }
      }

      const data = await response.json()
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
        console.warn('Rate limit alcanzado:', errorMessage)
        return { data: null, error: errorMessage }
      }

      try {
        const errorData = await response.json()
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
        console.warn('No se pudo parsear el mensaje de error:', parseError)
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
  const { authService } = require('./auth-service')
  return authService
}

// Función para hacer requests con manejo automático de renovación de tokens
export const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const authService = getAuthService()
  const token = authService.getAccessToken()

  if (!token) {
    throw new Error('No hay token de acceso disponible')
  }

  // Agregar el token de autorización
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  }

  try {
    const response = await fetch(buildApiUrl(url), {
      ...options,
      headers
    })

    // Si recibimos un 401, intentar refrescar el token
    if (response.status === 401) {
      console.log('🔄 Token expirado (401), intentando refrescar...')

      try {
        const refreshResult = await authService.refreshAccessToken()

        if (refreshResult.success && refreshResult.newToken) {
          console.log('✅ Token refrescado exitosamente, reintentando request...')

          // Reintentar la request con el nuevo token
          const retryResponse = await fetch(buildApiUrl(url), {
            ...options,
            headers: {
              ...options.headers,
              'Authorization': `Bearer ${refreshResult.newToken}`
            }
          })

          // Si el retry también falla con 401, NO cerrar sesión automáticamente
          if (retryResponse.status === 401) {
            console.warn('⚠️ El refresh token también expiró. El usuario debe cerrar sesión manualmente.')
            // NO redirigir automáticamente, solo loguear
            throw new Error('Token expirado. Por favor, cierra sesión e inicia de nuevo.')
          }

          return retryResponse
        } else {
          console.warn('⚠️ No se pudo refrescar el token:', refreshResult.error)
          // NO redirigir automáticamente, el usuario debe cerrar sesión manualmente
          throw new Error(refreshResult.error || 'Token expirado. Por favor, cierra sesión e inicia de nuevo.')
        }
      } catch (refreshError) {
        console.warn('⚠️ Error refrescando token:', refreshError)
        // NO limpiar tokens ni redirigir automáticamente
        throw refreshError instanceof Error ? refreshError : new Error('Error de autenticación. Por favor, intenta de nuevo.')
      }
    }

    return response
  } catch (error) {
    console.error('Error en authenticatedFetch:', error)
    throw error
  }
}
