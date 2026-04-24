import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import type { UpdateUserData } from '@/types/user'
import { buildApiUrl } from '@/lib/api'

export type { UpdateUserData } from '@/types/user'

export interface AdminUser {
  id: number
  email: string
  first_name: string
  last_name: string
  phone_number?: string
  role: 'basic' | 'pro' | 'premium' | 'admin'
  role_display: string
  is_active: boolean
  is_staff: boolean
  is_staff_display: string
  is_superuser: boolean
  is_superuser_display: string
  is_verified: boolean
  birth_date?: string
  gender?: string
  gender_display?: string
  age?: number
  height?: number
  weight?: number
  target_weight?: number
  bmi?: number
  date_joined: string
  created_at_formatted: string
  last_login?: string
  last_login_formatted: string
  created_at: string
  updated_at: string
  premium_alerts?: PremiumAlerts | null
}

export interface PremiumAlerts {
  enabled: boolean
  unread_notifications: number
  recent_profile_changes: number
  recent_workout_feedback: number
  latest_workout_feedback: {
    date: string
    rating: number | null
    message: string | null
  } | null
  pending_total: number
  has_pending: boolean
}

export interface UserStats {
  total_users: number
  active_users: number
  staff_users: number
  superusers: number
  new_users_last_7_days: number
  users_by_role: Array<{ role: string; count: number }>
}

export interface CreateUserData {
  email: string
  password: string
  password_confirm?: string
  first_name: string
  last_name: string
  phone_number?: string
  birth_date?: string
  gender?: string
  height?: number
  weight?: number
  target_weight?: number
  activity_level?: string
  fitness_goals?: string[]
  allergies?: string[]
  medical_conditions?: string[]
  role?: 'premium' | 'pro' | 'basic' | 'admin' | 'trainer' | 'user'
}

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getAuthHeaders } = useAuth()

  // Función para mapear roles del backend al frontend
  // Ahora el backend usa directamente basic, pro, premium, admin
  const mapBackendRoleToFrontend = (backendRole: string): 'basic' | 'pro' | 'premium' | 'admin' => {
    const roleMapping: Record<string, 'basic' | 'pro' | 'premium' | 'admin'> = {
      // Valores nuevos del backend (directos)
      'basic': 'basic',
      'pro': 'pro',
      'premium': 'premium',
      'admin': 'admin',
      // Compatibilidad con valores antiguos y variantes
      'MEMBER': 'basic',
      'member': 'basic',
      'TRAINER': 'pro',
      'trainer': 'pro',
      'ADMIN': 'admin',
    }
    return roleMapping[backendRole] || 'basic'
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl('admin/users/'), {
        headers
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      // Asegurar que siempre sea un array
      const usersArray = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : []
      // Mapear roles del backend al frontend para cada usuario
      const mappedUsers = usersArray.map((user: any) => ({
        ...user,
        role: mapBackendRoleToFrontend(user.role || 'basic')
      }))
      setUsers(mappedUsers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl('admin/users/stats/'), {
        headers
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setStats(data)
    } catch (err) {
      // Usar datos por defecto cuando el endpoint no esté disponible
      setStats({
        total_users: 0,
        active_users: 0,
        inactive_users: 0,
        staff_users: 0,
        superusers: 0,
        new_users_last_7_days: 0,
        new_users_this_month: 0,
        role_distribution: []
      })
    }
  }

  const createUser = async (userData: CreateUserData) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl('admin/users/'), {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `Error ${response.status}`)
      }

      const newUser = await response.json()
      setUsers(prev => [newUser, ...prev])
      return newUser
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const updateUser = async (userId: number, userData: UpdateUserData) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`admin/users/${userId}/`), {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `Error ${response.status}`)
      }

      const updatedUser = await response.json()
      setUsers(prev => prev.map(user => user.id === userId ? updatedUser : user))
      return updatedUser
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const bulkUpdateStatus = async (userIds: number[], isActive: boolean) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl('admin/users/bulk_action/'), {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_ids: userIds,
          action: isActive ? 'activate' : 'deactivate'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `Error ${response.status}`)
      }

      // Actualizar el estado local
      setUsers(prev => prev.map(user =>
        userIds.includes(user.id) ? { ...user, is_active: isActive } : user
      ))

      return await response.json()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const bulkDelete = async (userIds: number[]) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl('admin/users/bulk_action/'), {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_ids: userIds,
          action: 'delete'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `Error ${response.status}`)
      }

      // Remover usuarios eliminados del estado local
      setUsers(prev => prev.filter(user => !userIds.includes(user.id)))

      return await response.json()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const deleteUser = async (userId: number) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`admin/users/${userId}/`), {
        method: 'DELETE',
        headers
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `Error ${response.status}`)
      }

      // Remover usuario del estado local
      setUsers(prev => prev.filter(user => user.id !== userId))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const changeUserRole = async (userId: number, newRole: 'basic' | 'pro' | 'premium' | 'admin') => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`admin/users/${userId}/change_role/`), {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error ${response.status}`)
      }

      const result = await response.json()

      // Actualizar usuario en el estado local
      setUsers(prev => prev.map(user =>
        user.id === userId
          ? { ...user, role: newRole, role_display: result.role_display }
          : user
      ))

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const toggleUserVerification = async (userId: number) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`admin/users/${userId}/toggle_verification/`), {
        method: 'POST',
        headers
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error ${response.status}`)
      }

      const result = await response.json()

      // Actualizar usuario en el estado local
      setUsers(prev => prev.map(user =>
        user.id === userId
          ? { ...user, is_verified: result.is_verified }
          : user
      ))

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const changeUserStatus = async (userId: number, isActive: boolean) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`admin/users/${userId}/change_status/`), {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: isActive })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error ${response.status}`)
      }

      const result = await response.json()

      // Actualizar usuario en el estado local
      setUsers(prev => prev.map(user =>
        user.id === userId
          ? { ...user, is_active: result.is_active }
          : user
      ))

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const resetUserPassword = async (userId: number, newPassword: string) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`admin/users/${userId}/reset_password/`), {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: newPassword })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error ${response.status}`)
      }

      return await response.json()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const bulkChangeRole = async (userIds: number[], newRole: 'basic' | 'pro' | 'premium' | 'admin') => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl('admin/users/bulk_change_role/'), {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_ids: userIds,
          role: newRole
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error ${response.status}`)
      }

      const result = await response.json()

      // Actualizar usuarios en el estado local
      setUsers(prev => prev.map(user =>
        userIds.includes(user.id)
          ? { ...user, role: newRole }
          : user
      ))

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const bulkToggleVerification = async (userIds: number[], isVerified: boolean) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl('admin/users/bulk_toggle_verification/'), {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_ids: userIds,
          is_verified: isVerified
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error ${response.status}`)
      }

      const result = await response.json()

      // Actualizar usuarios en el estado local
      setUsers(prev => prev.map(user =>
        userIds.includes(user.id)
          ? { ...user, is_verified: isVerified }
          : user
      ))

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const refetchAll = async () => {
    await Promise.all([fetchUsers(), fetchStats()])
  }

  useEffect(() => {
    refetchAll()
  }, [])

  return {
    users,
    stats,
    loading,
    error,
    fetchUsers,
    fetchStats,
    createUser,
    updateUser,
    bulkUpdateStatus,
    bulkDelete,
    deleteUser,
    changeUserRole,
    toggleUserVerification,
    changeUserStatus,
    resetUserPassword,
    bulkChangeRole,
    bulkToggleVerification,
    refetch: refetchAll
  }
}