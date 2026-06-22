// lib/auth-service.ts
// Servicio de autenticación mejorado con validación y manejo de errores

import {
  buildApiUrl,
  getAuthHeaders,
  handleApiResponse,
  handleFetchError,
  AUTH_ENDPOINTS
} from './api'
import { requestThrottler } from './request-throttle'
import { apiCache, generateCacheKey } from './api-cache'
import { isJwtExpired, parseJwtPayload } from './jwt'
import type { User } from '@/types/user'

let refreshAccessTokenPromise: Promise<{ success: boolean; newToken?: string; error?: string }> | null = null

// Re-exportar el tipo User
export type { User } from '@/types/user'

// Tipos para autenticación
export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterCredentials {
  email: string
  password: string
  password_confirm: string
  first_name?: string
  last_name?: string
  role?: string
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface AuthResponse {
  user: User
  tokens: AuthTokens
  must_change_password?: boolean
}

// Utilidades para cookies
const setCookie = (name: string, value: string, days?: number) => {
  if (typeof window === 'undefined') return

  // Construir la cookie con todos los atributos necesarios
  const isSecure = window.location.protocol === 'https:'

  // Construir el string de la cookie
  let cookieString = `${name}=${encodeURIComponent(value)}`
  if (days) {
    const expires = new Date()
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000))
    cookieString += `;expires=${expires.toUTCString()}`
  }
  cookieString += `;path=/`
  cookieString += `;SameSite=Lax`

  if (isSecure) {
    cookieString += `;Secure`
  }

  document.cookie = cookieString
  
  // NO loguear valores de cookies por seguridad
  // Verificar que se guardó correctamente
  const saved = getCookie(name)
  if (!saved && process.env.NODE_ENV === 'development') {
  }
}

const getRememberSessionPreference = (): boolean => {
  if (typeof window === 'undefined') return true
  return localStorage.getItem('remember_session') !== 'false'
}

const setRememberedEmail = (email: string, rememberSession: boolean) => {
  if (typeof window === 'undefined') return

  if (rememberSession) {
    localStorage.setItem('remember_session', 'true')
    localStorage.setItem('remembered_email', email)
  } else {
    localStorage.setItem('remember_session', 'false')
    localStorage.removeItem('remembered_email')
  }
}

const getCookie = (name: string): string | null => {
  if (typeof window === 'undefined') return null

  const nameEQ = name + "="
  const ca = document.cookie.split(';')

  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim()
    if (c.indexOf(nameEQ) === 0) {
      const value = c.substring(nameEQ.length, c.length)
      // Decodificar el valor por si fue codificado
      try {
        return decodeURIComponent(value)
      } catch {
        return value
      }
    }
  }

  return null
}

const deleteCookie = (name: string) => {
  if (typeof window === 'undefined') return

  // Eliminar con todos los posibles atributos
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Lax`
  // NO loguear operaciones de cookies por seguridad
}

// Clase principal del servicio de autenticación mejorado
export class AuthService {
  private static instance: AuthService
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private isOfflineMode: boolean = false
  private readonly allowOfflineMode: boolean = process.env.NODE_ENV !== 'production'
  private isRefreshing: boolean = false // Flag para evitar múltiples renovaciones simultáneas

  private constructor() {
    // Inicializar tokens desde cookies si existen
    if (typeof window !== 'undefined') {
      this.accessToken = getCookie('accessToken')
      this.refreshToken = getCookie('refreshToken')

      // Solo loguear en modo desarrollo (sin información sensible)
      if (process.env.NODE_ENV === 'development') {
      }

      // Verificar si estamos en modo offline (sin backend)
      this.checkOfflineMode()
    }
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  // Verificar si estamos en modo offline
  private async checkOfflineMode() {
    if (!this.allowOfflineMode) {
      this.isOfflineMode = false
      return
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 segundos de timeout

      // Usar el endpoint público de health que no requiere autenticación
      const response = await fetch(buildApiUrl('/public-health-check'), {
        method: 'GET',
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        this.isOfflineMode = false
      } else {
        // Si el endpoint responde pero con error, no estamos en modo offline
        this.isOfflineMode = false
      }
    } catch (error) {
      this.isOfflineMode = true
    }
  }

  // Verificar si estamos en modo offline
  public getOfflineMode(): boolean {
    return this.isOfflineMode
  }

  // Verificar si hay tokens válidos
  hasValidTokens(): boolean {
    // Verificar que existan los tokens
    if (!this.accessToken || !this.refreshToken) {
      return false
    }

    // Verificar que no sean tokens offline (para desarrollo)
    if (this.accessToken.startsWith('offline_token_') || this.refreshToken.startsWith('offline_refresh_')) {
      if (!this.allowOfflineMode) {
        return false
      }
      return true
    }

    // Verificar que el token de acceso tenga el formato correcto (JWT)
    if (!this.accessToken.includes('.')) {
      return false
    }

    return true
  }

  hasRefreshToken(): boolean {
    return Boolean(this.getRefreshToken())
  }

  // Verificar si el usuario está autenticado
  isAuthenticated(): boolean {
    return this.hasValidTokens()
  }

  // Verificar si el token está próximo a expirar
  isTokenExpiringSoon(): boolean {
    if (!this.accessToken || this.accessToken.startsWith('offline_token_')) {
      return false
    }

    try {
      // Decodificar el token JWT para obtener la fecha de expiración
      const payload = parseJwtPayload(this.accessToken)
      if (!payload?.exp) {
        return false
      }
      const expirationTime = payload.exp * 1000 // Convertir a milisegundos
      const currentTime = Date.now()
      const timeUntilExpiration = expirationTime - currentTime

      // Considerar que está próximo a expirar si queda poco tiempo.
      // Importante: en producción el access suele durar ~15 min; si usamos 30 min aquí,
      // refrescamos en bucle y podemos acabar con refresh tokens blacklisteados.
      // 5 min da margen suficiente sin causar rotaciones excesivas.
      return timeUntilExpiration < 5 * 60 * 1000
    } catch (error) {
      return false
    }
  }

  isAccessTokenExpired(): boolean {
    const token = this.getAccessToken()
    if (!token || token.startsWith('offline_token_')) {
      return true
    }
    return isJwtExpired(parseJwtPayload(token))
  }

  needsTokenRefresh(): boolean {
    return this.isAccessTokenExpired() || this.isTokenExpiringSoon()
  }

  private async postAuthWithTransientRetry(url: string, body: unknown): Promise<Response> {
    const doRequest = () =>
      fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      })

    let response = await doRequest()
    if (response.status === 500) {
      await new Promise((resolve) => setTimeout(resolve, 800))
      response = await doRequest()
    }
    return response
  }

  refreshAccessTokenDeduped(): Promise<{ success: boolean; newToken?: string; error?: string }> {
    if (!refreshAccessTokenPromise) {
      refreshAccessTokenPromise = this.refreshAccessToken().finally(() => {
        refreshAccessTokenPromise = null
      })
    }
    return refreshAccessTokenPromise
  }

  // Login de usuario
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Verificar si el backend está disponible
      if (this.allowOfflineMode && this.isOfflineMode) {
        // Modo offline: simular login exitoso
        const mockUser: User = {
          id: 1,
          email: credentials.email,
          first_name: "Usuario",
          last_name: "Demo",
          role: "basic", // Usar "basic" como valor por defecto
          is_staff: false,
          is_superuser: false,
          is_verified: true,
          date_joined: new Date().toISOString(),
        }

        const mockTokens: AuthTokens = {
          access: `offline_token_${Date.now()}`,
          refresh: `offline_refresh_${Date.now()}`,
        }

        this.accessToken = mockTokens.access
        this.refreshToken = mockTokens.refresh

        // Guardar en cookies
        setCookie('accessToken', mockTokens.access, 7)
        setCookie('refreshToken', mockTokens.refresh, 30)

        return {
          user: mockUser,
          tokens: mockTokens,
        }
      }

      // Validar datos antes de enviar
      if (!credentials.email || !credentials.password) {
        throw new Error('Email y contraseña son requeridos')
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(credentials.email)) {
        throw new Error('Formato de email inválido')
      }

      // NO loguear credenciales por seguridad
      if (process.env.NODE_ENV === 'development') {
      }

      // Agregar un pequeño delay para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))

      const response = await this.postAuthWithTransientRetry(
        buildApiUrl(AUTH_ENDPOINTS.LOGIN),
        credentials,
      )

      // Manejar diferentes códigos de respuesta
      if (response.status === 400) {
        const errorData = await response.json()

        // Extraer mensaje de error específico con mejor formato
        let errorMessage = 'Credenciales inválidas'

        if (errorData.email && Array.isArray(errorData.email)) {
          errorMessage = `Email: ${errorData.email[0]}`
        } else if (errorData.password && Array.isArray(errorData.password)) {
          errorMessage = `Contraseña: ${errorData.password[0]}`
        } else if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
          errorMessage = errorData.non_field_errors[0]
        } else if (errorData.detail) {
          errorMessage = errorData.detail
        } else if (errorData.message) {
          errorMessage = errorData.message
        } else if (errorData.error) {
          errorMessage = errorData.error
        } else if (typeof errorData === 'string') {
          errorMessage = errorData
        }

        throw new Error(errorMessage)
      }

      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}))
        let errorMessage = 'Credenciales inválidas'

        if (errorData.detail) {
          errorMessage = errorData.detail
          // Detectar si el usuario no existe
          const detailLower = errorData.detail.toLowerCase()
          if (detailLower.includes('no existe') || detailLower.includes('not found') || detailLower.includes('no encontrado')) {
            errorMessage = 'El usuario no existe. Puedes crear una nueva cuenta haciendo clic en "Registrarse".'
          }
        } else if (errorData.message) {
          errorMessage = errorData.message
          const messageLower = errorData.message.toLowerCase()
          if (messageLower.includes('no existe') || messageLower.includes('not found') || messageLower.includes('no encontrado')) {
            errorMessage = 'El usuario no existe. Puedes crear una nueva cuenta haciendo clic en "Registrarse".'
          }
        } else if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
          errorMessage = errorData.non_field_errors[0]
          const messageLower = errorMessage.toLowerCase()
          if (messageLower.includes('no existe') || messageLower.includes('not found') || messageLower.includes('no encontrado')) {
            errorMessage = 'El usuario no existe. Puedes crear una nueva cuenta haciendo clic en "Registrarse".'
          }
        }

        throw new Error(errorMessage)
      }

      if (response.status === 429) {
        throw new Error('Demasiados intentos de login. Por favor, espera un momento antes de intentar nuevamente.')
      }

      if (response.status === 500) {
        throw new Error('Error interno del servidor. Inténtalo de nuevo más tarde.')
      }

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`)
      }

      // El backend devuelve { access, refresh, user } en la respuesta del login
      const responseData = await response.json()

      if (!responseData.access || !responseData.refresh) {
        throw new Error('No se recibieron tokens de autenticación')
      }

      const rememberSession = credentials.rememberMe !== false
      const accessCookieDays = rememberSession ? 1 : undefined
      const refreshCookieDays = rememberSession ? 30 : undefined

      // Guardar tokens
      this.accessToken = responseData.access
      this.refreshToken = responseData.refresh

      // Guardar en cookies
      setCookie('accessToken', responseData.access, accessCookieDays)
      setCookie('refreshToken', responseData.refresh, refreshCookieDays)
      setRememberedEmail(credentials.email.trim().toLowerCase(), rememberSession)

      // Obtener información del usuario
      // Intentar usar el usuario de la respuesta del login si está disponible
      let user: User
      if (responseData.user) {
        // Convertir el usuario del backend al formato esperado
        user = {
          id: parseInt(responseData.user.id) || responseData.user.id,
          email: responseData.user.email,
          first_name: responseData.user.first_name || '',
          last_name: responseData.user.last_name || '',
          role: responseData.user.role || 'basic',
          is_staff: responseData.user.is_staff || false,
          is_superuser: responseData.user.is_superuser || false,
          is_verified: responseData.user.is_verified || false,
          date_joined: responseData.user.date_joined || new Date().toISOString(),
          must_change_password: responseData.user.must_change_password || responseData.must_change_password || false,
          ...responseData.user
        } as User
      } else {
        // Si no está en la respuesta, obtenerlo del endpoint /me/
        user = await this.getCurrentUser()
      }

      return {
        user,
        tokens: {
          access: responseData.access,
          refresh: responseData.refresh
        },
        must_change_password: responseData.must_change_password || user.must_change_password || false
      }
    } catch (error) {

      // Si falla la conexión al backend, activar modo offline solo si no estamos ya en modo offline
      if (!this.isOfflineMode && error instanceof TypeError && error.message.includes('fetch')) {
        this.isOfflineMode = true
        return this.login(credentials) // Reintentar en modo offline
      }

      // Re-lanzar el error para que se maneje en el contexto
      throw error
    }
  }

  // Registro de usuario
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      // Verificar si el backend está disponible
      if (this.isOfflineMode) {
        // Modo offline: simular registro exitoso
        const mockUser: User = {
          id: Date.now(),
          email: credentials.email,
          first_name: credentials.first_name || "Usuario",
          last_name: credentials.last_name || "Nuevo",
          role: "basic", // Usar "basic" como valor por defecto
          is_staff: false,
          is_superuser: false,
          is_verified: true,
          date_joined: new Date().toISOString(),
        }

        const mockTokens: AuthTokens = {
          access: `offline_token_${Date.now()}`,
          refresh: `offline_refresh_${Date.now()}`,
        }

        this.accessToken = mockTokens.access
        this.refreshToken = mockTokens.refresh

        // Guardar en cookies
        setCookie('accessToken', mockTokens.access, 7)
        setCookie('refreshToken', mockTokens.refresh, 30)

        return {
          user: mockUser,
          tokens: mockTokens,
        }
      }

      // Validar datos antes de enviar
      if (!credentials.email || !credentials.password || !credentials.password_confirm) {
        throw new Error('Todos los campos son requeridos')
      }

      if (credentials.password !== credentials.password_confirm) {
        throw new Error('Las contraseñas no coinciden')
      }

      if (credentials.password.length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres')
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(credentials.email)) {
        throw new Error('Formato de email inválido')
      }

      // Corregir el role para que coincida con el backend
      const correctedCredentials = {
        ...credentials,
        role: credentials.role || "basic" // Usar "basic" como valor por defecto
      }
      // (debug object removed)
      // (debug object removed)

      const response = await fetch(buildApiUrl(AUTH_ENDPOINTS.REGISTER), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(correctedCredentials),
      })

      // Manejar diferentes códigos de respuesta
      if (response.status === 400) {
        const errorData = await response.json()

        // Extraer mensaje de error específico con mejor formato
        let errorMessage = 'Error en el formulario'

        if (errorData.email && Array.isArray(errorData.email)) {
          errorMessage = `Email: ${errorData.email[0]}`
        } else if (errorData.password && Array.isArray(errorData.password)) {
          errorMessage = `Contraseña: ${errorData.password[0]}`
        } else if (errorData.password_confirm && Array.isArray(errorData.password_confirm)) {
          errorMessage = `Confirmación de contraseña: ${errorData.password_confirm[0]}`
        } else if (errorData.role && Array.isArray(errorData.role)) {
          errorMessage = `Rol: ${errorData.role[0]}`
        } else if (errorData.first_name && Array.isArray(errorData.first_name)) {
          errorMessage = `Nombre: ${errorData.first_name[0]}`
        } else if (errorData.last_name && Array.isArray(errorData.last_name)) {
          errorMessage = `Apellido: ${errorData.last_name[0]}`
        } else if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
          errorMessage = errorData.non_field_errors[0]
        } else if (errorData.detail) {
          errorMessage = errorData.detail
        } else if (errorData.message) {
          errorMessage = errorData.message
        } else if (errorData.error) {
          errorMessage = errorData.error
        } else if (typeof errorData === 'string') {
          errorMessage = errorData
        }

        throw new Error(errorMessage)
      }

      if (response.status === 500) {
        throw new Error('Error interno del servidor. Inténtalo de nuevo más tarde.')
      }

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`)
      }

      const result = await handleApiResponse<any>(response)

      if (result.error) {
        throw new Error(result.error)
      }

      if (!result.data) {
        throw new Error('No se recibieron datos de registro')
      }

      // El backend devuelve { user, tokens: { access, refresh } }
      const tokens = result.data.tokens || result.data
      const userData = result.data.user

      if (!tokens || !tokens.access || !tokens.refresh) {
        throw new Error('No se recibieron tokens de autenticación')
      }

      // Guardar tokens
      this.accessToken = tokens.access
      this.refreshToken = tokens.refresh

      // Guardar en cookies
      setCookie('accessToken', tokens.access, 1)
      setCookie('refreshToken', tokens.refresh, 30)

      // Usar el usuario de la respuesta o obtenerlo
      let user = userData
      if (!user) {
        user = await this.getCurrentUser()
      }

      return {
        user,
        tokens: {
          access: tokens.access,
          refresh: tokens.refresh
        }
      }
    } catch (error: any) {

      // Si falla la conexión al backend, activar modo offline solo si no estamos ya en modo offline
      if (!this.isOfflineMode && error instanceof TypeError && error.message.includes('fetch')) {
        this.isOfflineMode = true
        return this.register(credentials) // Reintentar en modo offline
      }

      // Asegurar que el error tenga un mensaje
      const errorMessage = error?.message || error?.toString() || 'Error desconocido al registrar usuario'
      const enhancedError = new Error(errorMessage)

      // Re-lanzar el error para que se maneje en el contexto
      throw enhancedError
    }
  }

  // Obtener token de acceso actual
  getAccessToken(): string | null {
    // Si no hay token en memoria, intentar obtenerlo de las cookies
    if (!this.accessToken && typeof window !== 'undefined') {
      const cookieToken = getCookie('accessToken')
      if (cookieToken) {
        this.accessToken = cookieToken
        // No loguear información sensible
        if (process.env.NODE_ENV === 'development') {
        }
      }
    }
    return this.accessToken
  }

  // Obtener token de renovación
  getRefreshToken(): string | null {
    // Si no hay token en memoria, intentar obtenerlo de las cookies
    if (!this.refreshToken && typeof window !== 'undefined') {
      const cookieToken = getCookie('refreshToken')
      if (cookieToken) {
        this.refreshToken = cookieToken
        // No loguear información sensible
        if (process.env.NODE_ENV === 'development') {
        }
      }
    }
    return this.refreshToken
  }

  // Obtener usuario actual
  async getCurrentUser(): Promise<User> {
    try {
      if (!this.hasValidTokens()) {
        throw new Error('No hay token de acceso válido')
      }

      // Verificar caché primero
      const cacheKey = generateCacheKey(AUTH_ENDPOINTS.ME)
      const cached = apiCache.get<User>(cacheKey)
      if (cached) {
        return cached
      }

      const user = await requestThrottler.throttle('auth-me', async () => {
        if (this.needsTokenRefresh()) {
          const refreshResult = await this.refreshAccessTokenDeduped()
          if (!refreshResult.success) {
            this.clearTokens()
            throw new Error(refreshResult.error || 'Sesión expirada. Por favor, inicia sesión nuevamente.')
          }
        }

        const { authenticatedFetch } = require('./api') as typeof import('./api')
        const response = await authenticatedFetch(AUTH_ENDPOINTS.ME, { method: 'GET' })
        const result = await handleApiResponse<User>(response)

        if (result.error) {
          throw new Error(result.error)
        }

        if (!result.data) {
          throw new Error('No se recibieron datos del usuario')
        }

        return result.data
      })

      apiCache.set(cacheKey, user, 5 * 60 * 1000)

      return user
    } catch (error) {
      if (error instanceof Error && !error.message.includes('No hay token de acceso válido')) {
      }
      throw handleFetchError(error)
    }
  }

  // Renovar token de acceso
  async refreshAccessToken(): Promise<{ success: boolean; newToken?: string; error?: string }> {
    // Evitar múltiples renovaciones simultáneas
    if (this.isRefreshing) {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 250))
        if (!this.isRefreshing) {
          break
        }
      }

      const payload = parseJwtPayload(this.accessToken)
      if (this.accessToken && !isJwtExpired(payload)) {
        return { success: true, newToken: this.accessToken }
      }
      return { success: false, error: 'Renovación en progreso' }
    }

    this.isRefreshing = true

    try {
      if (this.isOfflineMode) {
        // En modo offline, generar nuevo token
        const newToken = `offline_token_${Date.now()}`
        this.accessToken = newToken
        setCookie('accessToken', newToken, 1)
        this.isRefreshing = false
        return { success: true, newToken }
      }

      const refreshToken = this.getRefreshToken()
      if (!refreshToken) {
        this.isRefreshing = false
        return { success: false, error: 'No hay token de renovación' }
      }

      let response: Response
      try {
        response = await this.postAuthWithTransientRetry(buildApiUrl(AUTH_ENDPOINTS.REFRESH), {
          refresh: refreshToken,
        })
      } catch (fetchError) {
        // Manejar errores de red/CORS
        this.isRefreshing = false
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Error desconocido'
        
        // Detectar errores de red específicos
        if (errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch') || errorMessage.includes('CORS')) {
          return { success: false, error: 'Error de red. El token se refrescará automáticamente cuando sea necesario.' }
        }
        
        return { success: false, error: errorMessage }
      }

      // Si el refresh token es inválido/expiró (401), no tiene sentido reintentar.
      // Limpiar tokens para evitar bucles de refresh y forzar nuevo login.
      if (response.status === 401) {
        this.isRefreshing = false
        this.clearTokens()
        return { success: false, error: 'Sesión expirada. Por favor, inicia sesión nuevamente.' }
      }

      // Manejar errores de timeout (504) y otros errores HTTP
      if (!response.ok && response.status === 504) {
        this.isRefreshing = false
        return { success: false, error: 'Timeout del servidor. El token se refrescará automáticamente cuando sea necesario.' }
      }

      const result = await handleApiResponse<{ access: string; refresh?: string }>(response)

      if (result.error) {
        this.isRefreshing = false
        // Si el error es "Token is blacklisted" o "Token expirado", el refresh token también expiró
        // No hacer logout inmediatamente, solo retornar el error
        // El usuario deberá cerrar sesión manualmente si el refresh token expiró
        if (result.error.includes('expirado') || result.error.includes('expired') || result.error.includes('blacklisted')) {
          return { success: false, error: 'Token expirado. Por favor, cierra sesión e inicia de nuevo.' }
        }
        return { success: false, error: result.error }
      }

      if (!result.data) {
        this.isRefreshing = false
        return { success: false, error: 'No se recibió nuevo token de acceso' }
      }

      // Actualizar token de acceso
      this.accessToken = result.data.access

      // Si el backend devuelve un nuevo refresh token (ROTATE_REFRESH_TOKENS), actualizarlo también
      if (result.data.refresh) {
        this.refreshToken = result.data.refresh
        setCookie('refreshToken', result.data.refresh, getRememberSessionPreference() ? 30 : undefined)
        // No loguear información sensible
        if (process.env.NODE_ENV === 'development') {
        }
      }

      // Guardar en cookies
      setCookie('accessToken', result.data.access, getRememberSessionPreference() ? 1 : undefined)

      this.isRefreshing = false
      return { success: true, newToken: result.data.access }
    } catch (error) {
      this.isRefreshing = false
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return { success: false, error: errorMessage }
    }
  }

  // Logout
  async logout(): Promise<void> {
    const accessTokenToRevoke = this.getAccessToken()
    const refreshTokenToRevoke = this.getRefreshToken()
    this.clearTokens()

    try {
      if (!this.isOfflineMode && refreshTokenToRevoke) {
        // Intentar invalidar el token en el backend
        try {
          // NO loguear tokens por seguridad
          if (process.env.NODE_ENV === 'development') {
          }

          const response = await fetch(buildApiUrl(AUTH_ENDPOINTS.LOGOUT), {
            method: 'POST',
            headers: getAuthHeaders(accessTokenToRevoke || undefined),
            body: JSON.stringify({ refresh: refreshTokenToRevoke }),
          })

          if (!response.ok) {
            // Intentar obtener más detalles del error
            try {
              const errorData = await response.json()
            } catch (parseError) {
            }
          } else {
          }
        } catch (error) {
          // Si falla el logout en el backend, continuamos con la limpieza local
        }
      } else {
      }

    } catch (error) {
      // Asegurar que se limpien los tokens incluso si hay error
      this.clearTokens()
      throw handleFetchError(error)
    }
  }

  // Limpiar tokens
  public clearTokens() {
    this.accessToken = null
    this.refreshToken = null

    // Limpiar cookies
    deleteCookie('accessToken')
    deleteCookie('refreshToken')
  }

  // Cambiar contraseña
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      if (this.isOfflineMode) {
        // En modo offline, simular cambio exitoso
        return
      }

      if (!this.accessToken) {
        throw new Error('No hay token de acceso')
      }

      const response = await fetch(buildApiUrl(AUTH_ENDPOINTS.CHANGE_PASSWORD), {
        method: 'POST',
        headers: getAuthHeaders(this.accessToken),
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })

      const result = await handleApiResponse<void>(response)

      if (result.error) {
        throw new Error(result.error)
      }
    } catch (error) {
      throw handleFetchError(error)
    }
  }

  // Actualizar perfil del usuario
  async updateProfile(profileData: any): Promise<User> {
    try {
      if (this.isOfflineMode) {
        // En modo offline, simular actualización exitosa
        // En modo offline, devolver un usuario mock
        const mockUser: User = {
          id: 1,
          email: 'demo@example.com',
          first_name: 'Usuario',
          last_name: 'Demo',
          role: 'basic',
          is_staff: false,
          is_superuser: false,
          is_verified: true,
          date_joined: new Date().toISOString(),
        }
        return mockUser
      }

      if (!this.accessToken) {
        throw new Error('No hay token de acceso')
      }

      const response = await fetch(buildApiUrl('profile/'), {
        method: 'PUT',
        headers: getAuthHeaders(this.accessToken),
        body: JSON.stringify(profileData),
      })

      const result = await handleApiResponse<User>(response)

      if (result.error) {
        throw new Error(result.error)
      }

      if (!result.data) {
        throw new Error('No se recibieron datos del perfil actualizado')
      }

      return result.data
    } catch (error) {
      throw handleFetchError(error)
    }
  }

  // Solicitar reset de contraseña (envía contraseña temporal por email)
  async forgotPassword(email: string): Promise<void> {
    try {
      const response = await fetch(buildApiUrl(AUTH_ENDPOINTS.FORGOT_PASSWORD), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Error al solicitar reset de contraseña')
      }

      // El backend siempre devuelve éxito por seguridad (no revela si el email existe)
      return
    } catch (error) {
      throw handleFetchError(error)
    }
  }

  async resetPassword(token: string, newPassword: string, newPasswordConfirm: string): Promise<void> {
    try {
      if (newPassword !== newPasswordConfirm) {
        throw new Error('Las contraseñas no coinciden')
      }

      const response = await fetch(buildApiUrl(AUTH_ENDPOINTS.RESET_PASSWORD), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          token,
          new_password: newPassword,
          new_password_confirm: newPasswordConfirm,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Error al restablecer contraseña')
      }
    } catch (error) {
      throw handleFetchError(error)
    }
  }

  // Cambiar contraseña después de usar contraseña temporal
  async changePasswordAfterTemporary(newPassword: string, newPasswordConfirm: string): Promise<void> {
    try {
      if (!this.accessToken) {
        throw new Error('No hay token de acceso')
      }

      if (newPassword !== newPasswordConfirm) {
        throw new Error('Las contraseñas no coinciden')
      }

      const response = await fetch(buildApiUrl(AUTH_ENDPOINTS.CHANGE_PASSWORD_AFTER_TEMPORARY), {
        method: 'POST',
        headers: getAuthHeaders(this.accessToken),
        body: JSON.stringify({
          new_password: newPassword,
          new_password_confirm: newPasswordConfirm,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Error al cambiar contraseña')
      }

      // Limpiar tokens para forzar nuevo login
      this.accessToken = null
      this.refreshToken = null
      deleteCookie('accessToken')
      deleteCookie('refreshToken')

      return
    } catch (error) {
      throw handleFetchError(error)
    }
  }
}

// Exportar función para obtener la instancia singleton (lazy initialization)
// Esto evita problemas de inicialización circular
let _authServiceInstance: AuthService | null = null

export const getAuthService = (): AuthService => {
  if (!_authServiceInstance) {
    _authServiceInstance = AuthService.getInstance()
  }
  return _authServiceInstance
}

// Compatibilidad con imports legacy (preferir getAuthService en código nuevo)
export const authService = getAuthService()
