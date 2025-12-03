// contexts/auth-context.tsx
// Contexto de autenticación para manejar el estado global del usuario

"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  authService,
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
        const hasValidTokens = await authService.hasValidTokens()

        if (hasValidTokens) {
          try {
            // Intentar obtener usuario actual
            const user = await authService.getCurrentUser()
            console.log('🔍 AuthContext - initializeAuth - Datos del usuario recibidos:', {
              email: user.email,
              is_superuser: user.is_superuser,
              is_staff: user.is_staff,
              role: user.role,
              roleType: typeof user.role,
              fullUser: user
            })
            setState({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              mustChangePassword: user.must_change_password || false,
            })
          } catch (userError: any) {
            // Solo mostrar warning si no es un error de autenticación esperado
            if (userError.message !== 'Sesión expirada. Por favor, inicia sesión nuevamente.') {
              console.warn('Error al obtener usuario, limpiando tokens inválidos:', userError)
            }
            // Si no se puede obtener el usuario, limpiar tokens y marcar como no autenticado
            authService.clearTokens()
            setState({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
              mustChangePassword: false,
            })
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

      // Debug: verificar datos del usuario DESPUÉS de guardar
      console.log('🔍 AuthContext - Estado actualizado después del login:', {
        email: authResponse.user.email,
        is_superuser: authResponse.user.is_superuser,
        is_staff: authResponse.user.is_staff,
        role: authResponse.user.role,
        roleType: typeof authResponse.user.role
      })

      // También verificar el token JWT directamente para obtener la información de admin
      let isAdminFromToken = false
      try {
        const accessToken = authService.getAccessToken()
        if (accessToken && !accessToken.startsWith('offline_token_')) {
          const payload = JSON.parse(atob(accessToken.split('.')[1]))
          console.log('🔍 Payload del token JWT:', payload)
          isAdminFromToken = payload.is_superuser || payload.is_staff || payload.role === 'ADMIN'
        }
      } catch (tokenError) {
        console.warn('Error al decodificar token:', tokenError)
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
        const accessToken = authService.getAccessToken()
        if (accessToken && !accessToken.startsWith('offline_token_')) {
          const payload = JSON.parse(atob(accessToken.split('.')[1]))
          console.log('🔍 Payload del token JWT:', payload)
          isAdminFromToken = payload.is_superuser || payload.is_staff || payload.role === 'ADMIN'
        }
      } catch (tokenError) {
        console.warn('Error al decodificar token:', tokenError)
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
      if (authService.isAuthenticated()) {
        const user = await authService.getCurrentUser()
        console.log('🔍 AuthContext - refreshUser - Datos del usuario recibidos:', {
          email: user.email,
          is_superuser: user.is_superuser,
          is_staff: user.is_staff,
          role: user.role,
          roleType: typeof user.role,
          fullUser: user
        })
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
      const accessToken = authService.getAccessToken()
      if (!accessToken) {
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

  // Verificar si el token está próximo a expirar y renovarlo
  useEffect(() => {
    if (!state.isAuthenticated) return

    const checkTokenExpiration = async () => {
      if (authService.isAuthenticated()) {
        try {
          // Verificar si el token está próximo a expirar
          if (authService.isTokenExpiringSoon()) {
            console.log('🔄 Token próximo a expirar, renovando automáticamente...')
            const refreshResult = await authService.refreshAccessToken()

            if (refreshResult.success && refreshResult.newToken) {
              console.log('✅ Token renovado exitosamente')
              // Refrescar datos del usuario con el nuevo token
              try {
                await refreshUser()
              } catch (refreshError) {
                console.warn('Error al refrescar usuario después de renovar token:', refreshError)
                // No hacer logout si solo falla el refresh del usuario
              }
            } else {
              console.error('❌ No se pudo renovar el token:', refreshResult.error)
              // Solo hacer logout si el error no es "blacklisted" o "en progreso"
              // Estos pueden ser problemas temporales de sincronización
              if (refreshResult.error && 
                  !refreshResult.error.includes('offline') && 
                  !refreshResult.error.includes('blacklisted') &&
                  !refreshResult.error.includes('en progreso')) {
                await logout()
              } else if (refreshResult.error?.includes('blacklisted')) {
                // Si el token está blacklisted, puede ser porque se renovó desde otro lugar
                // Intentar obtener el usuario con el token actual antes de hacer logout
                console.warn('⚠️ Token blacklisted, puede ser un problema temporal')
              }
            }
          } else {
            // Si no está próximo a expirar, verificar que el token sea válido
            // haciendo una verificación silenciosa
            const token = authService.getAccessToken()
            if (token && !token.startsWith('offline_token_')) {
              try {
                // Verificar que el token sea válido decodificándolo
                const payload = JSON.parse(atob(token.split('.')[1]))
                const expirationTime = payload.exp * 1000
                const currentTime = Date.now()

                // Si el token ya expiró, intentar renovarlo inmediatamente
                if (expirationTime <= currentTime) {
                  console.log('⚠️ Token expirado, renovando inmediatamente...')
                  const refreshResult = await authService.refreshAccessToken()
                  if (refreshResult.success && refreshResult.newToken) {
                    await refreshUser()
                  } else {
                    console.warn('⚠️ No se pudo renovar el token automáticamente. Seguirá intentando...')
                    // NO hacer logout automático, solo advertir
                  }
                }
              } catch (error) {
                console.warn('Error verificando token:', error)
              }
            }
          }
        } catch (error) {
          console.error('Error al verificar/renovar token:', error)
          // No hacer logout automáticamente, solo loguear el error
          // El usuario puede seguir usando la app si el token aún es válido
        }
      }
    }

    // Verificar cada 5 minutos para evitar renovaciones excesivas
    // El token se renueva automáticamente cuando está próximo a expirar (30 min antes)
    const interval = setInterval(checkTokenExpiration, 5 * 60 * 1000)

    // Ejecutar después de 30 segundos para evitar ejecución inmediata al montar
    // Esto da tiempo a que la página cargue completamente
    const initialTimeout = setTimeout(() => {
      checkTokenExpiration()
    }, 30 * 1000)

    return () => {
      clearInterval(interval)
      if (initialTimeout) {
        clearTimeout(initialTimeout)
      }
    }
  }, [state.isAuthenticated, refreshUser, logout])

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
