import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { buildApiUrl } from '@/lib/api'
import { AdminUser } from './use-admin-users'

export interface AdminUserDetail extends AdminUser {
  phone_number?: string
  profile_picture_url?: string
  main_goal?: string
  main_goal_display?: string
  activity_level_display?: string
  training_location?: string
  training_location_display?: string
  training_days?: number[]
  equipment_available?: string[]
  workout_preferences?: Record<string, any>
  disliked_foods?: string
  injuries_or_medical_issues?: string
  daily_streak?: number
  longest_streak?: number
  last_completed_day?: string
  onboarding_completed?: boolean
  onboarding_step?: number
}

export interface UpdateUserProfileData {
  first_name?: string
  last_name?: string
  phone_number?: string
  birth_date?: string
  gender?: 'male' | 'female' | 'other'
  height?: number
  weight?: number
  target_weight?: number
  main_goal?: 'lose_weight' | 'gain_muscle' | 'body_recomposition' | 'maintain' | 'performance'
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  training_location?: 'home' | 'gym' | 'outdoor'
  training_days_per_week?: number
  training_days?: number[]
  equipment_available?: string[]
  dietary_restrictions?: string[]
  allergies?: string[]
  disliked_foods?: string
  medical_conditions?: string[]
  injuries_or_medical_issues?: string
  workout_preferences?: Record<string, any>
  notification_preferences?: Record<string, any>
}

export function useAdminUserDetail(userId: string | number) {
  const [user, setUser] = useState<AdminUserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getAuthHeaders } = useAuth()

  const fetchUser = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`admin/users/${userId}/`), {
        headers
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Usuario no encontrado')
        }
        const errorData = await response.json()
        throw new Error(errorData.detail || `Error ${response.status}`)
      }

      const data = await response.json()
      setUser(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const updateUser = async (updateData: UpdateUserProfileData) => {
    try {
      setError(null)
      
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`admin/users/${userId}/`), {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || errorData.message || `Error ${response.status}`)
      }

      const updatedUser = await response.json()
      setUser(updatedUser)
      return updatedUser
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw err
    }
  }

  useEffect(() => {
    if (userId) {
      fetchUser()
    }
  }, [userId])

  return {
    user,
    loading,
    error,
    refetch: fetchUser,
    updateUser
  }
}




