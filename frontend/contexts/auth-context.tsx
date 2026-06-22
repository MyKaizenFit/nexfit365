// contexts/auth-context.tsx
// Contexto de autenticación para manejar el estado global del usuario

"use client"

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  getAuthService,
  User,
  LoginCredentials,
  RegisterCredentials,
  AuthResponse
} from '@/lib/auth-service'
import { AUTH_ENDPOINTS, buildApiUrl, getAuthHeaders as buildAuthRequestHeaders, USER_ENDPOINTS } from '@/lib/api'
import { isAdminJwtPayload, parseJwtPayload } from '@/lib/jwt'
import { dismissBlockingOverlays } from '@/lib/dismiss-blocking-overlays'
import { useAuthNotifications } from '@/hooks/use-auth-notifications'

// Estado de autenticación
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  mustChangePassword: boolean
}

// Acciones de autenticación
interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
  refreshUser: () => Promise<void>
  updateProfile: (profileData: any) => Promise<void>
  getAuthHeaders: () => Promise<HeadersInit>
  forgotPassword: (email: string) => Promise<void>
  changePasswordAfterTemporary: (newPassword: string, newPasswordConfirm: string) => Promise<void>
}

// Contexto completo
interface AuthContextType extends AuthState, AuthActions { }

// Crear contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined)

const setInitialRegistrationCookie = (completed: boolean) => {
  if (typeof document === 'undefined') return

  if (completed) {
    document.cookie = `initial_form_completed=true; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
  } else {
    document.cookie = 'initial_form_completed=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
  }
}

const syncInitialRegistrationStatus = async (accessToken: string): Promise<boolean> => {
  const response = await fetch(buildApiUrl(USER_ENDPOINTS.INITIAL_REGISTRATION_STATUS), {
    method: 'GET',
    headers: {
      'Accept': 'application/json; charset=utf-8',
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    localStorage.removeItem('initial_form_completed')
    setInitialRegistrationCookie(false)
    return false
  }

  const data = await response.json()
  const isComplete = Boolean(data.is_complete)

  if (isComplete) {
    localStorage.setItem('initial_form_completed', 'true')
    localStorage.setItem('user_profile', JSON.stringify(data.profile || {}))
    if (data.form_version) {
      localStorage.setItem('form_version', data.form_version.toString())
    }
  } else {
    localStorage.removeItem('initial_form_completed')
  }
  setInitialRegistrationCookie(isComplete)

  return isComplete
}

// Hook personalizado para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Props del provider
interface AuthProviderProps {
  children: ReactNode
}

// Provider del contexto
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const logoutInProgressRef = useRef(false)
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    mustChangePassword: false,
  })

  const router = useRouter()
  const authNotifications = useAuthNotifications()

  // Inicializar autenticación al cargar la app
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/auth')) {
          localStorage.removeItem('auth_logout_in_progress')
        }

        // Verificar si hay tokens válidos. En móvil es frecuente volver a la app
        // con el access caducado/perdido pero con refresh todavía vigente.
        const authService = getAuthService()
        let hasValidTokens = authService.hasValidTokens()

        if (!hasValidTokens && authService.hasRefreshToken()) {
          const refreshResult = await authService.refreshAccessTokenDeduped()
          hasValidTokens = Boolean(refreshResult.success && refreshResult.newToken)
        }

        if (hasValidTokens) {
          try {
            // Intentar obtener usuario actual
            const user = await authService.getCurrentUser()
            // NO loguear datos del usuario por seguridad
            if (process.env.NODE_ENV === 'development') {
            }
            setState({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              mustChangePassword: user.must_change_password || false,
            })
          } catch (userError: any) {
            // NO limpiar tokens si es un error de rate limiting (429)
            if (userError.message?.includes('Demasiadas solicitudes') || userError.message?.includes('Too Many Requests')) {
              setState({
                user: null,
                isAuthenticated: true, // Mantener como autenticado
                isLoading: false,
                error: 'Has alcanzado el límite de intentos. Por favor, espera un momento.',
                mustChangePassword: false,
              })
            } else if (userError.message !== 'Sesión expirada. Por favor, inicia sesión nuevamente.') {
              // Si no se puede obtener el usuario, limpiar tokens y marcar como no autenticado
              const authService = getAuthService()
              authService.clearTokens()
              setState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
                mustChangePassword: false,
              })
            } else {
              // Error de sesión expirada, limpiar
              const authService = getAuthService()
              authService.clearTokens()
              setState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
                mustChangePassword: false,
              })
            }
          }
        } else {
          // No hay tokens válidos, marcar como no autenticado silenciosamente
          setState(prev => ({
            ...prev,
            isLoading: false,
          }))
        }
      } catch (error) {
        // Solo mostrar warning si no es un error de autenticación esperado
        if (error instanceof Error && !error.message.includes('Sesión expirada')) {
        }
        // En lugar de hacer logout, simplemente marcar como no autenticado
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          mustChangePassword: false,
        })
      }
    }

    initializeAuth()
  }, [])

  // Función de login
  const login = async (credentials: LoginCredentials) => {
    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }))

      const authService = getAuthService()
      const authResponse: AuthResponse = await authService.login(credentials)

      // Verificar si el usuario debe cambiar contraseña
      const mustChangePassword = authResponse.must_change_password || authResponse.user.must_change_password || false

      // Debug: verificar datos del usuario ANTES de guardar
      // (debug info removed)

      setState({
        user: authResponse.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        mustChangePassword,
      })

      // Si debe cambiar contraseña, redirigir a la página de cambio
      if (mustChangePassword) {
        router.push('/auth/change-password')
        return
      }

      // Mostrar notificación de éxito
      authNotifications.showLoginSuccess(authResponse.user.first_name)

      // NO loguear datos del usuario por seguridad
      if (process.env.NODE_ENV === 'development') {
      }

      // También verificar el token JWT directamente para obtener la información de admin
      let isAdminFromToken = false
      try {
        const authService = getAuthService()
        const accessToken = authService.getAccessToken()
        const payload = parseJwtPayload(accessToken)
        isAdminFromToken = isAdminJwtPayload(payload)
      } catch (tokenError) {
        if (process.env.NODE_ENV === 'development') {
        }
      }

      // Redirigir según el rol del usuario (priorizar información del token)
      const userRole = (authResponse.user.role || '').toLowerCase()
      const isAdmin = isAdminFromToken || authResponse.user.is_superuser || authResponse.user.is_staff || userRole === 'admin' || userRole === 'trainer'

      // Usar window.location.href para forzar un reload completo que lea las cookies correctamente
      // Esto es necesario porque router.push hace navegación del lado del cliente y el middleware
      // puede no ver las cookies recién guardadas
      if (isAdmin) {
        // Pequeño delay para asegurar que las cookies se guarden
        await new Promise(resolve => setTimeout(resolve, 100))
        window.location.href = '/admin'
      } else {
        const accessToken = authService.getAccessToken()
        const formCompleted = accessToken
          ? await syncInitialRegistrationStatus(accessToken)
          : localStorage.getItem('initial_form_completed') === 'true'

        if (!formCompleted) {
          await new Promise(resolve => setTimeout(resolve, 100))
          window.location.href = '/initial-registration'
        } else {
          await new Promise(resolve => setTimeout(resolve, 100))
          window.location.href = '/dashboard'
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Error al iniciar sesión'

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))

      // Mostrar notificación de error
      authNotifications.showLoginError(errorMessage)

      // NO redirigir cuando hay un error de login
      // El usuario debe quedarse en la página de login para ver el error
      // y poder intentar de nuevo o crear una cuenta nueva
      
      throw error
    }
  }

  // Función de registro
  const register = async (credentials: RegisterCredentials) => {
    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }))

      // LIMPIAR DATOS DE SESIÓN ANTERIOR antes de registrar
      // Esto previene que datos de otra cuenta interfieran
      localStorage.removeItem('initial_form_completed')
      localStorage.removeItem('user_profile')
      localStorage.removeItem('form_version')

      // Limpiar cookie del formulario
      document.cookie = 'initial_form_completed=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'

      const authService = getAuthService()
      const authResponse: AuthResponse = await authService.register(credentials)

      setState({
        user: authResponse.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        mustChangePassword: false,
      })

      // Mostrar notificación de éxito
      authNotifications.showRegisterSuccess(authResponse.user.first_name)

      // Debug: verificar datos del usuario
      // (debug info removed)

      // También verificar el token JWT directamente para obtener la información de admin
      let isAdminFromToken = false
      try {
        const authService = getAuthService()
        const accessToken = authService.getAccessToken()
        const payload = parseJwtPayload(accessToken)
        isAdminFromToken = isAdminJwtPayload(payload)
      } catch (tokenError) {
        if (process.env.NODE_ENV === 'development') {
        }
      }

      // Redirigir según el rol del usuario (priorizar información del token)
      const userRole = (authResponse.user.role || '').toLowerCase()
      const isAdmin = isAdminFromToken || authResponse.user.is_superuser || authResponse.user.is_staff || userRole === 'admin' || userRole === 'trainer'

      // Usar window.location.href para forzar un reload completo
      if (isAdmin) {
        await new Promise(resolve => setTimeout(resolve, 100))
        window.location.href = '/admin'
      } else {
        // SIEMPRE redirigir al formulario de registro inicial después de registrar
        await new Promise(resolve => setTimeout(resolve, 100))
        window.location.href = '/initial-registration'
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Error al registrar usuario'

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))

      // Mostrar notificación de error
      authNotifications.showRegisterError(errorMessage)

      throw error
    }
  }

  // Función de logout
  const logout = async () => {
    if (logoutInProgressRef.current) {
      return
    }

    logoutInProgressRef.current = true

    const authService = getAuthService()
    const accessTokenToRevoke = authService.getAccessToken()
    const refreshTokenToRevoke = authService.getRefreshToken()

    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_logout_in_progress', 'true')
    }

    localStorage.removeItem('initial_form_completed')
    localStorage.removeItem('user_profile')
    localStorage.removeItem('form_version')
    setInitialRegistrationCookie(false)
    authService.clearTokens()

    if (
      typeof window !== 'undefined' &&
      refreshTokenToRevoke &&
      !authService.getOfflineMode()
    ) {
      void fetch(buildApiUrl(AUTH_ENDPOINTS.LOGOUT), {
        method: 'POST',
        headers: buildAuthRequestHeaders(accessTokenToRevoke || undefined),
        body: JSON.stringify({ refresh: refreshTokenToRevoke }),
        keepalive: true,
      }).catch(() => {
        // La sesión local ya está cerrada.
      })
    }

    dismissBlockingOverlays()

    if (typeof window !== 'undefined') {
      // Evitar re-render del dashboard sin sesión (dispara error.tsx) antes de salir.
      window.location.replace('/auth')
      return
    }

    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      mustChangePassword: false,
    })
    router.replace('/auth')
  }

  // Limpiar errores
  const clearError = () => {
    setState(prev => ({
      ...prev,
      error: null,
    }))
  }

  // Refrescar información del usuario
  const refreshUser = async () => {
    try {
      const authService = getAuthService()
      if (authService.isAuthenticated()) {
        const user = await authService.getCurrentUser()
        // NO loguear datos del usuario por seguridad
        if (process.env.NODE_ENV === 'development') {
        }
        setState(prev => ({
          ...prev,
          user,
        }))
      }
    } catch (error) {
      // Si hay error, hacer logout
      await logout()
    }
  }

  // Actualizar perfil del usuario
  const updateProfile = async (profileData: any) => {
    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }))

      const authService = getAuthService()
      const updatedUser = await authService.updateProfile(profileData)

      setState(prev => ({
        ...prev,
        user: updatedUser,
        isLoading: false,
        error: null,
      }))

      // Mostrar notificación de éxito
      authNotifications.showProfileUpdateSuccess()
    } catch (error: any) {
      const errorMessage = error.message || 'Error al actualizar el perfil'

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))

      // Mostrar notificación de error
      authNotifications.showProfileUpdateError(errorMessage)

      throw error
    }
  }

  // Solicitar reset de contraseña
  const forgotPassword = async (email: string) => {
    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }))

      const authService = getAuthService()
      await authService.forgotPassword(email)

      setState(prev => ({
        ...prev,
        isLoading: false,
      }))

      // Mostrar notificación de éxito
      authNotifications.showLoginSuccess('Se ha enviado una contraseña temporal a tu correo')
    } catch (error: any) {
      const errorMessage = error.message || 'Error al solicitar reset de contraseña'

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))

      // Mostrar notificación de error
      authNotifications.showLoginError(errorMessage)

      throw error
    }
  }

  // Cambiar contraseña después de usar temporal
  const changePasswordAfterTemporary = async (newPassword: string, newPasswordConfirm: string) => {
    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }))

      const authService = getAuthService()
      await authService.changePasswordAfterTemporary(newPassword, newPasswordConfirm)

      // Limpiar estado y redirigir al login
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        mustChangePassword: false,
      })

      // Mostrar notificación de éxito
      authNotifications.showLoginSuccess('Contraseña actualizada. Por favor, inicia sesión nuevamente.')

      // Redirigir al login
      router.push('/auth')
    } catch (error: any) {
      const errorMessage = error.message || 'Error al cambiar contraseña'

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))

      // Mostrar notificación de error
      authNotifications.showLoginError(errorMessage)

      throw error
    }
  }

  // Obtener headers de autenticación
  const getAuthHeaders = async (): Promise<HeadersInit> => {
    try {
      const authService = getAuthService()
      let accessToken = authService.getAccessToken()
      if (!accessToken) {
        const refreshResult = authService.hasRefreshToken()
          ? await authService.refreshAccessTokenDeduped()
          : { success: false }

        if (refreshResult.success && refreshResult.newToken) {
          accessToken = refreshResult.newToken
        } else {
          // Si no hay token, no dejar al usuario en un estado inconsistente (pantallas protegidas sin sesión real)
          setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            mustChangePassword: false,
          })
          router.push('/auth')
          throw new Error('No hay token de acceso disponible')
        }
      }

      // Si el token está expirado o próximo a expirar, refrescarlo antes de usarlo
      if (authService.needsTokenRefresh()) {
        const result = await authService.refreshAccessTokenDeduped()
        if (result.success && result.newToken) {
          accessToken = result.newToken
        }
      }

      return {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Refresh proactivo de token: verifica periódicamente si el token está próximo a expirar
   * y lo refresca automáticamente antes de que expire.
   * 
   * Esto evita que el token expire completamente y cause errores 401.
   * El refresh solo ocurre cuando el token está próximo a expirar (menos de 30 minutos).
   * 
   * Ventajas:
   * - El token se renueva automáticamente sin interrumpir al usuario
   * - Evita errores 401 y la necesidad de refrescar bajo demanda
   * - Maneja errores de red/CORS de forma silenciosa (no hace logout automático)
   */
  useEffect(() => {
    if (!state.isAuthenticated) {
      return
    }

    const authService = getAuthService()

    // Función para verificar y refrescar el token si es necesario
    const checkAndRefreshToken = async () => {
      try {
        // Si el estado dice "autenticado" pero ya no hay tokens, forzar logout/redirect
        if (!authService.hasValidTokens()) {
          setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            mustChangePassword: false,
          })
          router.push('/auth')
          return
        }

        // Renovar si el token ya expiró o está a punto de expirar
        if (authService.needsTokenRefresh()) {
          const refreshResult = await authService.refreshAccessTokenDeduped()
          
          if (refreshResult.success) {
          } else {
            // Si el refresh falla por sesión expirada/401, authService puede limpiar tokens.
            // En ese caso, no dejar el estado inconsistente: forzar logout/redirect.
            const err = refreshResult.error || ''
            if (err.includes('Sesión expirada') || err.includes('expired') || err.includes('401') || !authService.hasValidTokens()) {
              setState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
                mustChangePassword: false,
              })
              router.push('/auth')
              return
            }

            // Si falla el refresh proactivo, no hacer nada
            // El token se refrescará bajo demanda cuando haya un 401
            // Solo loguear en modo desarrollo para debugging
            if (process.env.NODE_ENV === 'development') {
            }
          }
        }
      } catch (error) {
        // Manejar errores de red/CORS de forma silenciosa
        // No hacer logout automático, el token se refrescará bajo demanda cuando sea necesario
        if (process.env.NODE_ENV === 'development') {
        }
      }
    }

    // Verificar inmediatamente al montar el componente
    checkAndRefreshToken()

    const handleResume = () => {
      if (document.visibilityState === 'visible') {
        checkAndRefreshToken()
      }
    }

    document.addEventListener('visibilitychange', handleResume)
    window.addEventListener('focus', handleResume)

    // Verificar periódicamente si el token necesita renovarse
    const interval = setInterval(checkAndRefreshToken, 5 * 60 * 1000)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleResume)
      window.removeEventListener('focus', handleResume)
    }
  }, [state.isAuthenticated])

  // Valor del contexto
  const contextValue: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
    refreshUser,
    updateProfile,
    getAuthHeaders,
    forgotPassword,
    changePasswordAfterTemporary,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook para verificar si el usuario está autenticado
export const useIsAuthenticated = () => {
  const { isAuthenticated, isLoading } = useAuth()
  return { isAuthenticated, isLoading }
}

// Hook para obtener solo el usuario
export const useUser = () => {
  const { user } = useAuth()
  return user
}

// Hook para verificar roles específicos
export const useHasRole = (role: string) => {
  const { user } = useAuth()
  return user?.role === role
}

// Hook para verificar si es admin
export const useIsAdmin = () => {
  const { user } = useAuth()
  const userRole = (user?.role || '').toLowerCase()
  return user?.is_superuser || user?.is_staff || userRole === 'admin' || userRole === 'trainer'
}

// Hook para verificar si es staff
export const useIsStaff = () => {
  const { user } = useAuth()
  return user?.is_staff || user?.is_superuser
}
