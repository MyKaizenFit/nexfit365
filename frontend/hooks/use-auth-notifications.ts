"use client"

import { useToast } from '@/hooks/use-toast'

export const useAuthNotifications = () => {
  const { toast } = useToast()

  const showLoginSuccess = (userName: string) => {
    toast({
      title: "¡Bienvenido!",
      description: `Has iniciado sesión como ${userName}`,
      variant: "default",
    })
  }

  const showLoginError = (errorMessage: string) => {
    toast({
      title: "Error de autenticación",
      description: errorMessage,
      variant: "destructive",
    })
  }

  const showRegisterSuccess = (userName: string) => {
    toast({
      title: "¡Cuenta creada!",
      description: `Bienvenido ${userName}, tu cuenta ha sido creada exitosamente`,
      variant: "default",
    })
  }

  const showRegisterError = (errorMessage: string) => {
    toast({
      title: "Error de registro",
      description: errorMessage,
      variant: "destructive",
    })
  }

  const showLogoutSuccess = () => {
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente",
      variant: "default",
    })
  }

  const showLogoutError = (errorMessage: string) => {
    toast({
      title: "Error al cerrar sesión",
      description: errorMessage,
      variant: "destructive",
    })
  }

  const showProfileUpdateSuccess = () => {
    toast({
      title: "Perfil actualizado",
      description: "Tus preferencias han sido guardadas correctamente",
      variant: "default",
    })
  }

  const showProfileUpdateError = (errorMessage: string) => {
    toast({
      title: "Error al actualizar perfil",
      description: errorMessage,
      variant: "destructive",
    })
  }

  const showSessionExpired = () => {
    toast({
      title: "Sesión expirada",
      description: "Tu sesión ha expirado, por favor inicia sesión nuevamente",
      variant: "destructive",
    })
  }

  const showOfflineMode = () => {
    toast({
      title: "Modo offline activado",
      description: "El backend no está disponible, funcionando en modo offline",
      variant: "default",
    })
  }

  return {
    showLoginSuccess,
    showLoginError,
    showRegisterSuccess,
    showRegisterError,
    showLogoutSuccess,
    showLogoutError,
    showProfileUpdateSuccess,
    showProfileUpdateError,
    showSessionExpired,
    showOfflineMode,
  }
}
