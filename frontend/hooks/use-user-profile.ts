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

  const fetchUserProfile = async (forceRefresh = false) => {
    try {
      if (!profile) {
        setLoading(true)
      }
      setError(null)

      const data = await userService.getUserProfile(forceRefresh)
      setProfile(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al obtener perfil'
      if (!profile) {
        setError(errorMessage)
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

      try {
        await refreshUser()
      } catch {
        // No bloquear ni cerrar sesión: el PATCH ya guardó.
      }

      if ((updates.profile_picture as any) instanceof File) {
        setTimeout(() => {
          fetchUserProfile()
        }, 500)
      }
      
      // Devolver respuesta completa incluyendo información de plan
      return {
        ...profileData,
        plan_updated,
        plan_update_message
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar perfil'
      throw new Error(errorMessage)
    }
  }

  const refreshProfile = async () => {
    await fetchUserProfile(true)
  }

  return {
    profile,
    loading,
    error,
    updateProfile,
    refreshProfile,
  }
}
