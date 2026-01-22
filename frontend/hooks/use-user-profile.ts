// hooks/use-user-profile.ts
// Hook para manejar el perfil del usuario con datos reales del backend

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { userService, UserProfile } from '@/lib/user-service'

export function useUserProfile() {
  const { isAuthenticated, user: authUser, refreshUser } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated && authUser) {
      fetchUserProfile()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, authUser])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await userService.getUserProfile()
      setProfile(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al obtener perfil')
      
      // Si falla, usar datos básicos del contexto de autenticación
      if (authUser) {
        setProfile({
          id: parseInt(authUser.id.toString()),
          email: authUser.email,
          first_name: authUser.first_name,
          last_name: authUser.last_name,
          role: authUser.role,
          is_staff: authUser.is_staff,
          is_superuser: authUser.is_superuser,
          is_verified: authUser.is_verified,
          date_joined: authUser.date_joined,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<UserProfile> & { profile_picture?: File }) => {
    try {
      setError(null)
      
      const response = await userService.updateUserProfile(updates)
      // Extraer campos de plan si existen
      const { plan_updated, plan_update_message, ...profileData } = response as any
      setProfile(profileData as UserProfile)
      
      // Devolver respuesta completa incluyendo información de plan
      return {
        ...profileData,
        plan_updated,
        plan_update_message
      }
      
      // Actualizar también el contexto de autenticación para que la foto aparezca en todos los lugares
      try {
        await refreshUser()
      } catch (authError) {
        // Si falla la actualización del contexto, no es crítico, solo loguear
      }
      
      // Si se actualizó la foto, refrescar el perfil para obtener la nueva URL
      if (updates.profile_picture instanceof File) {
        // Esperar un momento para que el servidor procese la imagen
        setTimeout(() => {
          fetchUserProfile()
        }, 500)
      } else {
        // Refrescar el perfil para obtener datos actualizados
        setTimeout(() => {
          fetchUserProfile()
        }, 300)
      }
      
      return updatedProfile
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar perfil'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const refreshProfile = () => {
    fetchUserProfile()
  }

  return {
    profile,
    loading,
    error,
    updateProfile,
    refreshProfile,
  }
}
