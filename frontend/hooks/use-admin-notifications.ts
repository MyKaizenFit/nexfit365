import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { buildApiUrl } from '@/lib/api'

export interface AdminNotification {
  id: number
  user: {
    id: number
    email: string
    first_name: string
    last_name: string
  }
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error'
  priority: 'low' | 'medium' | 'high'
  is_read: boolean
  is_expired: boolean
  created_at: string
  expires_at?: string
  action_url?: string
}

export interface NotificationStats {
  total_notifications: number
  unread_notifications: number
  expired_notifications: number
  notifications_by_type: Array<{ type: string; count: number }>
}

export interface CreateNotificationData {
  user_ids?: number[]
  title: string
  message: string
  type?: 'info' | 'warning' | 'success' | 'error'
  priority?: 'low' | 'medium' | 'high'
  action_url?: string
  expires_at?: string
}

export function useAdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getAuthHeaders } = useAuth()

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl('admin/notifications/'), {
        headers
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setNotifications(data.results || data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl('admin/notifications/stats/'), {
        headers
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error('Error fetching notification stats:', err)
    }
  }

  const sendBulkNotification = async (notificationData: CreateNotificationData) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl('admin/notifications/send_bulk/'), {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notificationData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `Error ${response.status}`)
      }

      const result = await response.json()
      // Recargar las notificaciones después del envío
      await fetchNotifications()
      await fetchStats()
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const deleteNotification = async (notificationId: number) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/admin/notifications/${notificationId}/`, {
        method: 'DELETE',
        headers
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `Error ${response.status}`)
      }

      // Remover la notificación del estado local
      setNotifications(prev => prev.filter(notification => notification.id !== notificationId))
      await fetchStats()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const markAsRead = async (notificationId: number) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/admin/notifications/${notificationId}/`, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_read: true })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `Error ${response.status}`)
      }

      // Actualizar el estado local
      setNotifications(prev => prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, is_read: true }
          : notification
      ))
      await fetchStats()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  useEffect(() => {
    fetchNotifications()
    fetchStats()
  }, [])

  return {
    notifications,
    stats,
    loading,
    error,
    sendBulkNotification,
    deleteNotification,
    markAsRead,
    refetch: fetchNotifications
  }
}