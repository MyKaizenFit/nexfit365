import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { buildApiUrl } from '@/lib/api'

export interface AdminNotification {
  id: string
  user: string
  title: string
  message: string
  type: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  is_read: boolean
  is_expired: boolean
  created_at: string
  expires_at?: string
  action_url?: string
  delivery_summary?: {
    push?: {
      status: string
      attempts: number
      last_error?: string
      last_attempt_at?: string | null
      delivered_at?: string | null
    }
    email?: {
      status: string
      attempts: number
      last_error?: string
      last_attempt_at?: string | null
      delivered_at?: string | null
    }
  }
}

export interface NotificationDeliveryLog {
  id: string
  notification: string
  channel: 'push' | 'email'
  channel_label: string
  status: 'pending' | 'sent' | 'failed' | 'skipped'
  status_label: string
  attempts: number
  last_error: string
  task_id: string
  last_attempt_at?: string | null
  delivered_at?: string | null
  metadata?: Record<string, any>
}

export interface NotificationStats {
  total_notifications: number
  read_notifications: number
  unread_notifications: number
  clicked_notifications?: number
  recent_notifications_30_days: number
  type_distribution: Array<{ type: string; count: number }>
  notifications_by_type?: Array<{ type: string; count: number }>
}

export interface CreateNotificationData {
  user_ids?: number[]
  title: string
  message: string
  type?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  action_url?: string
  expires_at?: string
  send_email?: boolean
}

export interface AutomationRuleSummary {
  key: string
  name: string
  description: string
  recommended: boolean
  audience_size: number
  last_run_at?: string | null
  last_targeted_users?: number
}

export interface AutomationSummary {
  generated_at: string
  weekly_brief: string
  segments: Record<string, number>
  automation_rules: AutomationRuleSummary[]
}

export function useAdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [automationSummary, setAutomationSummary] = useState<AutomationSummary | null>(null)
  const [deliveryLogsByNotification, setDeliveryLogsByNotification] = useState<Record<string, NotificationDeliveryLog[]>>({})
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
      const items = data.results || data || []
      const normalized = items.map((item: any) => ({
        ...item,
        priority: item.priority || item?.data?.priority || 'medium',
      }))
      setNotifications(normalized)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
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
    }
  }

  const fetchAutomationSummary = async () => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl('admin/notifications/automation-summary/'), {
        headers
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setAutomationSummary(data)
    } catch (err) {
    }
  }

  const sendBulkNotification = async (notificationData: CreateNotificationData) => {
    try {
      const headers = await getAuthHeaders()
      const endpoint = notificationData.user_ids && notificationData.user_ids.length > 0
        ? 'admin/notifications/send_bulk/'
        : 'admin/notifications/send_to_all/'

      const response = await fetch(buildApiUrl(endpoint), {
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

  const runAutomation = async (automation_key: string) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl('admin/notifications/run-automation/'), {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ automation_key })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.detail || `Error ${response.status}`)
      }

      const result = await response.json()
      await Promise.all([fetchNotifications(), fetchStats(), fetchAutomationSummary()])
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`admin/notifications/${notificationId}/`), {
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

  const markAsRead = async (notificationId: string) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`admin/notifications/${notificationId}/mark_as_read/`), {
        method: 'POST',
        headers: {
          ...headers
        }
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

  const refetchAll = async () => {
    await Promise.all([fetchNotifications(), fetchStats(), fetchAutomationSummary()])
  }

  const fetchDeliveryLogs = async (notificationId: string) => {
    if (deliveryLogsByNotification[notificationId]) {
      return deliveryLogsByNotification[notificationId]
    }

    const headers = await getAuthHeaders()
    const response = await fetch(buildApiUrl(`admin/notifications/${notificationId}/delivery-logs/`), {
      headers,
    })

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }

    const payload = await response.json()
    const logs: NotificationDeliveryLog[] = payload.logs || []
    setDeliveryLogsByNotification((prev) => ({ ...prev, [notificationId]: logs }))
    return logs
  }

  useEffect(() => {
    refetchAll()
  }, [])

  return {
    notifications,
    stats,
    automationSummary,
    loading,
    error,
    sendBulkNotification,
    runAutomation,
    deleteNotification,
    markAsRead,
    refetch: refetchAll,
    fetchDeliveryLogs,
    deliveryLogsByNotification,
  }
}