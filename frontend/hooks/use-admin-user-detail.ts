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
  activity_level?: string
  training_days_per_week?: number
  dietary_restrictions?: string[]
  allergies?: string[]
  medical_conditions?: string[]
  disliked_foods?: string
  injuries_or_medical_issues?: string
  additional_info_for_admin?: string
  excluded_recipes?: Array<{ id: string; recipe_id: string; recipe_name: string; updated_at?: string }>
  excluded_ingredients?: Array<{ id: string; term: string; updated_at?: string }>
  recent_change_sections?: {
    fitness_preferences?: boolean
    dietary_information?: boolean
    medical_information?: boolean
    personal_information?: boolean
  }
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
  additional_info_for_admin?: string
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
      // Asegurar que los campos de array siempre sean arrays
      const normalizedData = {
        ...data,
        training_days: Array.isArray(data.training_days) ? data.training_days : (typeof data.training_days === 'number' ? [data.training_days] : []),
        equipment_available: Array.isArray(data.equipment_available) ? data.equipment_available : [],
        dietary_restrictions: Array.isArray(data.dietary_restrictions) ? data.dietary_restrictions : [],
        allergies: Array.isArray(data.allergies) ? data.allergies : [],
        medical_conditions: Array.isArray(data.medical_conditions) ? data.medical_conditions : [],
      }
      setUser(normalizedData)
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
      // Asegurar que los campos de array siempre sean arrays
      const normalizedUser = {
        ...updatedUser,
        training_days: Array.isArray(updatedUser.training_days) ? updatedUser.training_days : (typeof updatedUser.training_days === 'number' ? [updatedUser.training_days] : []),
        equipment_available: Array.isArray(updatedUser.equipment_available) ? updatedUser.equipment_available : [],
        dietary_restrictions: Array.isArray(updatedUser.dietary_restrictions) ? updatedUser.dietary_restrictions : [],
        allergies: Array.isArray(updatedUser.allergies) ? updatedUser.allergies : [],
        medical_conditions: Array.isArray(updatedUser.medical_conditions) ? updatedUser.medical_conditions : [],
      }
      setUser(normalizedUser)
      return normalizedUser
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





