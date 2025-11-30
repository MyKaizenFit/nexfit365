import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { buildApiUrl } from '@/lib/api'

export interface DashboardStats {
  users: {
    total: number
    active: number
    admins: number
  }
  workouts: {
    total_programs: number
    active_programs: number
    total_logs: number
  }
  nutrition: {
    total_plans: number
    active_plans: number
    total_meal_logs: number
  }
  progress: {
    total_photos: number
    total_weight_entries: number
  }
  notifications: {
    total: number
    unread: number
  }
}

export interface RecentActivity {
  recent_users: Array<{
    email: string
    joined: string
  }>
  recent_workout_logs: Array<{
    user_email: string
    program_name: string
    date: string
  }>
  recent_meal_logs: Array<{
    user_email: string
    meal_name: string
    date: string
  }>
}

export function useAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getAuthHeaders } = useAuth()

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl('admin/dashboard/stats/'), {
        headers
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      console.error('Error fetching dashboard stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentActivity = async () => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl('admin/dashboard/activity/'), {
        headers
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setRecentActivity(data)
    } catch (err) {
      console.error('Error fetching recent activity:', err)
    }
  }

  useEffect(() => {
    fetchStats()
    fetchRecentActivity()
  }, [])

  return {
    stats,
    recentActivity,
    loading,
    error,
    refetch: fetchStats
  }
}