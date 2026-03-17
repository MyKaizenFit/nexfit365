import { buildApiUrl, getAuthHeaders } from '@/lib/api'

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  created_at: string
  read_at?: string | null
  expires_at?: string | null
  action_url?: string
  read: boolean
  is_read: boolean
  data?: Record<string, any> | null
  priority: NotificationPriority
  actionable: boolean
  action_text?: string
}

export interface NotificationSettings {
  email: boolean
  push: boolean
  meals: boolean
  workouts: boolean
  achievements: boolean
  reminders: boolean
  marketing: boolean
  admin: boolean
}

export interface CreateNotificationData {
  user_ids?: number[]
  title: string
  message: string
  type?: string
  priority?: NotificationPriority
  action_url?: string
  expires_at?: string
  send_email?: boolean
  actionable?: boolean
  action_text?: string
}

interface ApiNotification {
  id: string
  type: string
  title: string
  message: string
  data?: Record<string, any> | null
  action_url?: string
  read_at?: string | null
  expires_at?: string | null
  created_at: string
}

const DEFAULT_SETTINGS: NotificationSettings = {
  email: true,
  push: true,
  meals: true,
  workouts: true,
  achievements: true,
  reminders: true,
  marketing: false,
  admin: true,
}

const SETTINGS_STORAGE_KEY = 'nexfit_notification_settings'

const mapApiNotification = (item: ApiNotification): Notification => {
  const metadata = item.data || {}
  return {
    id: String(item.id),
    type: item.type,
    title: item.title,
    message: item.message,
    created_at: item.created_at,
    read_at: item.read_at,
    expires_at: item.expires_at,
    action_url: item.action_url || '',
    read: Boolean(item.read_at),
    is_read: Boolean(item.read_at),
    data: item.data || null,
    priority: (metadata.priority || 'medium') as NotificationPriority,
    actionable: Boolean(metadata.actionable || item.action_url),
    action_text: metadata.action_text || 'Abrir',
  }
}

const resolveHeaders = (headers?: Record<string, string>) => headers || getAuthHeaders()

export const notificationService = {
  async getNotifications(headers?: Record<string, string>): Promise<Notification[]> {
    const response = await fetch(buildApiUrl('notifications/?ordering=-created_at'), {
      headers: resolveHeaders(headers),
    })

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    const items = Array.isArray(data) ? data : (data.results || [])
    return items.map(mapApiNotification)
  },

  async getUnreadCount(headers?: Record<string, string>): Promise<number> {
    const response = await fetch(buildApiUrl('notifications/unread_count/'), {
      headers: resolveHeaders(headers),
    })

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return Number(data.unread_count || 0)
  },

  async markAsRead(notificationId: string, headers?: Record<string, string>): Promise<void> {
    const response = await fetch(buildApiUrl(`notifications/${notificationId}/read/`), {
      method: 'PATCH',
      headers: resolveHeaders(headers),
    })

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }
  },

  async markAsUnread(notificationId: string, headers?: Record<string, string>): Promise<void> {
    const response = await fetch(buildApiUrl(`notifications/${notificationId}/unread/`), {
      method: 'PATCH',
      headers: resolveHeaders(headers),
    })

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }
  },

  async markAllAsRead(headers?: Record<string, string>): Promise<void> {
    const response = await fetch(buildApiUrl('notifications/mark_all_read/'), {
      method: 'PATCH',
      headers: resolveHeaders(headers),
    })

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }
  },

  async trackClick(notificationId: string, headers?: Record<string, string>): Promise<void> {
    const response = await fetch(buildApiUrl(`notifications/${notificationId}/track_click/`), {
      method: 'POST',
      headers: resolveHeaders(headers),
    })

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }
  },

  async deleteNotification(notificationId: string, headers?: Record<string, string>): Promise<void> {
    const response = await fetch(buildApiUrl(`notifications/${notificationId}/`), {
      method: 'DELETE',
      headers: resolveHeaders(headers),
    })

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }
  },

  async clearAll(headers?: Record<string, string>): Promise<void> {
    const notifications = await this.getNotifications(headers)
    await Promise.all(notifications.map((item) => this.deleteNotification(item.id, headers)))
  },

  async getSettings(): Promise<NotificationSettings> {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (!raw) return DEFAULT_SETTINGS
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
    } catch {
      return DEFAULT_SETTINGS
    }
  },

  async updateSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    const current = await this.getSettings()
    const next = { ...current, ...settings }
    if (typeof window !== 'undefined') {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next))
    }
    return next
  },

  async createNotification(payload: CreateNotificationData, headers?: Record<string, string>) {
    const response = await fetch(buildApiUrl('admin/notifications/send_bulk/'), {
      method: 'POST',
      headers: {
        ...resolveHeaders(headers),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Error ${response.status}`)
    }

    return response.json()
  },
}