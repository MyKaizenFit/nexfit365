// contexts/auth-context.tsx
// Contexto de autenticación para manejar el estado global del usuario

"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  getAuthService,
  User,
  LoginCredentials,
  RegisterCredentials,
  AuthResponse
} from '@/lib/auth-service'
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
        // Verificar si hay tokens válidos
        const authService = getAuthService()
        const hasValidTokens = await authService.hasValidTokens()

        if (hasValidTokens) {
          try {
            // Intentar obtener usuario actual
            const user = await authService.getCurrentUser()
            // NO loguear datos del usuario por seguridad
            if (process.env.NODE_ENV === 'development') {
              console.log('🔍 AuthContext - Usuario autenticado correctamente')
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
              console.warn('⚠️ Rate limit alcanzado, manteniendo sesión activa. Reintentará automáticamente...')
              setState({
                user: null,
                isAuthenticated: true, // Mantener como autenticado
                isLoading: false,
                error: 'Rate limit alcanzado. Por favor, espera un momento.',
                mustChangePassword: false,
              })
            } else if (userError.message !== 'Sesión expirada. Por favor, inicia sesión nuevamente.') {
              console.warn('Error al obtener usuario, limpiando tokens inválidos:', userError)
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
          console.warn('Error al inicializar autenticación (continuando en modo offline):', error)
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
      console.log('🔍 AuthContext - Datos del usuario recibidos del login:', {
        email: authResponse.user.email,
        is_superuser: authResponse.user.is_superuser,
        is_staff: authResponse.user.is_staff,
        role: authResponse.user.role,
        roleType: typeof authResponse.user.role,
        must_change_password: mustChangePassword,
        fullUser: authResponse.user
      })

      setState({
        user: authResponse.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        mustChangePassword,
      })

      // Si debe cambiar contraseña, redirigir a la página de cambio
      if (mustChangePassword) {
        console.log('🔀 Usuario debe cambiar contraseña, redirigiendo a /auth/change-password')
        router.push('/auth/change-password')
        return
      }

      // Mostrar notificación de éxito
      authNotifications.showLoginSuccess(authResponse.user.first_name)

      // NO loguear datos del usuario por seguridad
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 AuthContext - Login exitoso')
      }

      // También verificar el token JWT directamente para obtener la información de admin
      let isAdminFromToken = false
      try {
        const authService = getAuthService()
        const accessToken = authService.getAccessToken()
        if (accessToken && !accessToken.startsWith('offline_token_')) {
          const payload = JSON.parse(atob(accessToken.split('.')[1]))
          // NO loguear payload del token por seguridad
          isAdminFromToken = payload.is_superuser || payload.is_staff || payload.role === 'ADMIN'
        }
      } catch (tokenError) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error al decodificar token:', tokenError)
        }
      }

      // Redirigir según el rol del usuario (priorizar información del token)
      const isAdmin = isAdminFromToken || authResponse.user.is_superuser || authResponse.user.is_staff || authResponse.user.role === 'ADMIN'

      // Usar window.location.href para forzar un reload completo que lea las cookies correctamente
      // Esto es necesario porque router.push hace navegación del lado del cliente y el middleware
      // puede no ver las cookies recién guardadas
      if (isAdmin) {
        console.log('🔀 Redirigiendo a /admin (usuario administrador)')
        // Pequeño delay para asegurar que las cookies se guarden
        await new Promise(resolve => setTimeout(resolve, 100))
        window.location.href = '/admin'
      } else {
        // Verificar si el formulario inicial está completo
        const formCompleted = localStorage.getItem('initial_form_completed')
        if (!formCompleted || formCompleted !== 'true') {
          console.log('🔀 Redirigiendo a /initial-registration (formulario pendiente)')
          await new Promise(resolve => setTimeout(resolve, 100))
          window.location.href = '/initial-registration'
        } else {
          console.log('🔀 Redirigiendo a /dashboard (usuario normal)')
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
      console.log('🧹 Limpiando datos de sesión anterior...')
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
      console.log('🔍 Datos del usuario después del registro:', {
        email: authResponse.user.email,
        is_superuser: authResponse.user.is_superuser,
        is_staff: authResponse.user.is_staff,
        role: authResponse.user.role
      })

      // También verificar el token JWT directamente para obtener la información de admin
      let isAdminFromToken = false
      try {
        const authService = getAuthService()
        const accessToken = authService.getAccessToken()
        if (accessToken && !accessToken.startsWith('offline_token_')) {
          const payload = JSON.parse(atob(accessToken.split('.')[1]))
          // NO loguear payload del token por seguridad
          isAdminFromToken = payload.is_superuser || payload.is_staff || payload.role === 'ADMIN'
        }
      } catch (tokenError) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error al decodificar token:', tokenError)
        }
      }

      // Redirigir según el rol del usuario (priorizar información del token)
      const isAdmin = isAdminFromToken || authResponse.user.is_superuser || authResponse.user.is_staff || authResponse.user.role === 'ADMIN'

      // Usar window.location.href para forzar un reload completo
      if (isAdmin) {
        console.log('🔀 Redirigiendo a /admin (usuario administrador)')
        await new Promise(resolve => setTimeout(resolve, 100))
        window.location.href = '/admin'
      } else {
        // SIEMPRE redirigir al formulario de registro inicial después de registrar
        console.log('🔀 Redirigiendo a /initial-registration (formulario de registro inicial)')
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
    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
      }))

      const authService = getAuthService()
      await authService.logout()

      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })

      // Mostrar notificación de éxito
      authNotifications.showLogoutSuccess()

      // Redirigir al login
      router.push('/auth')
    } catch (error) {
      console.error('Error al hacer logout:', error)

      // Mostrar notificación de error
      authNotifications.showLogoutError('Error al cerrar sesión')

      // Asegurar que se limpie el estado incluso si hay error
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        mustChangePassword: false,
      })
      router.push('/auth')
    }
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
          console.log('🔍 AuthContext - Usuario refrescado')
        }
        setState(prev => ({
          ...prev,
          user,
        }))
      }
    } catch (error) {
      console.error('Error al refrescar usuario:', error)
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
      const accessToken = authService.getAccessToken()
      if (!accessToken) {
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

      return {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    } catch (error) {
      console.error('Error al obtener headers de autenticación:', error)
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
          console.warn('⚠️ Tokens no válidos detectados durante sesión activa. Redirigiendo a /auth...')
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

        // Verificar si el token está próximo a expirar
        if (authService.isTokenExpiringSoon()) {
          console.log('🔄 Token próximo a expirar, refrescando proactivamente...')
          
          const refreshResult = await authService.refreshAccessToken()
          
          if (refreshResult.success) {
            console.log('✅ Token refrescado proactivamente con éxito')
          } else {
            // Si el refresh falla por sesión expirada/401, authService puede limpiar tokens.
            // En ese caso, no dejar el estado inconsistente: forzar logout/redirect.
            const err = refreshResult.error || ''
            if (err.includes('Sesión expirada') || err.includes('expired') || err.includes('401') || !authService.hasValidTokens()) {
              console.warn('⚠️ Refresh falló y la sesión ya no es válida. Redirigiendo a /auth...')
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
              console.warn('⚠️ No se pudo refrescar el token proactivamente:', refreshResult.error)
            }
          }
        }
      } catch (error) {
        // Manejar errores de red/CORS de forma silenciosa
        // No hacer logout automático, el token se refrescará bajo demanda cuando sea necesario
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Error en refresh proactivo (se ignorará):', error)
        }
      }
    }

    // Verificar inmediatamente al montar el componente
    checkAndRefreshToken()

    // Verificar cada 5 minutos si el token está próximo a expirar
    // Esto es suficiente porque el token dura 2 horas y se refresca cuando quedan menos de 30 minutos
    const interval = setInterval(checkAndRefreshToken, 5 * 60 * 1000) // 5 minutos

    return () => {
      clearInterval(interval)
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
  return user?.is_superuser || user?.role === 'ADMIN'
}

// Hook para verificar si es staff
export const useIsStaff = () => {
  const { user } = useAuth()
  return user?.is_staff || user?.is_superuser
}
