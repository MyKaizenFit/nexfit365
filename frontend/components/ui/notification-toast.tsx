"use client"

import { useState, useEffect } from 'react'
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface NotificationToastProps {
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number // en milisegundos, 0 = no auto-close
  onClose?: () => void
  className?: string
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const colors = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
}

const iconColors = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
}

export function NotificationToast({
  type,
  title,
  message,
  duration = 5000,
  onClose,
  className,
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isClosing, setIsClosing] = useState(false)

  const Icon = icons[type]

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [duration])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsVisible(false)
      onClose?.()
    }, 200)
  }

  if (!isVisible) return null

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 max-w-sm w-full transform transition-all duration-200 ease-in-out',
        isClosing ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100',
        className
      )}
    >
      <div
        className={cn(
          'border rounded-lg shadow-lg p-4',
          colors[type]
        )}
      >
        <div className="flex items-start gap-3">
          <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', iconColors[type])} />
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm">{title}</h4>
            <p className="text-sm mt-1 opacity-90">{message}</p>
          </div>
          
          <button
            onClick={handleClose}
            className="flex-shrink-0 p-1 hover:bg-black/10 rounded transition-colors"
            aria-label="Cerrar notificación"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Componente para mostrar múltiples notificaciones
export function NotificationContainer() {
  const [notifications, setNotifications] = useState<Array<NotificationToastProps & { id: string }>>([])

  const addNotification = (notification: Omit<NotificationToastProps, 'onClose'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newNotification = {
      ...notification,
      id,
      onClose: () => removeNotification(id),
    }
    
    setNotifications(prev => [...prev, newNotification])
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  // Exponer la función para que otros componentes puedan usarla
  if (typeof window !== 'undefined') {
    (window as any).addNotification = addNotification
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          {...notification}
        />
      ))}
    </div>
  )
}
