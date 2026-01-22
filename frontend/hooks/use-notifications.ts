import { useCallback } from 'react'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface NotificationOptions {
  title?: string
  duration?: number
}

export function useNotifications() {
  const showNotification = useCallback((
    type: NotificationType,
    message: string,
    options: NotificationOptions = {}
  ) => {
    const { title, duration = 5000 } = options
    
    // Usar el sistema de notificaciones global si está disponible
    if (typeof window !== 'undefined' && (window as any).addNotification) {
      (window as any).addNotification({
        type,
        title: title || getDefaultTitle(type),
        message,
        duration,
      })
    } else {
      // Fallback: usar console.log para desarrollo
    }
  }, [])

  const success = useCallback((message: string, options?: NotificationOptions) => {
    showNotification('success', message, options)
  }, [showNotification])

  const error = useCallback((message: string, options?: NotificationOptions) => {
    showNotification('error', message, options)
  }, [showNotification])

  const warning = useCallback((message: string, options?: NotificationOptions) => {
    showNotification('warning', message, options)
  }, [showNotification])

  const info = useCallback((message: string, options?: NotificationOptions) => {
    showNotification('info', message, options)
  }, [showNotification])

  return {
    showNotification,
    success,
    error,
    warning,
    info,
  }
}

function getDefaultTitle(type: NotificationType): string {
  switch (type) {
    case 'success':
      return '¡Éxito!'
    case 'error':
      return 'Error'
    case 'warning':
      return 'Advertencia'
    case 'info':
      return 'Información'
    default:
      return 'Notificación'
  }
}
