/**
 * Componente para mostrar notificaciones de rate limiting
 */

import { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Clock, AlertTriangle, RefreshCw } from 'lucide-react'

interface RateLimitNotificationProps {
  retryAfter?: number // segundos hasta el próximo intento
  onRetry?: () => void
  onDismiss?: () => void
}

export function RateLimitNotification({ 
  retryAfter, 
  onRetry, 
  onDismiss 
}: RateLimitNotificationProps) {
  const [timeLeft, setTimeLeft] = useState(retryAfter || 0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (!retryAfter) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [retryAfter])

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  const handleRetry = () => {
    onRetry?.()
  }

  if (!isVisible) return null

  return (
    <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-orange-800 dark:text-orange-200">
            Demasiadas solicitudes. 
            {timeLeft > 0 ? (
              <span className="flex items-center gap-1 ml-1">
                <Clock className="h-3 w-3" />
                Inténtalo de nuevo en {timeLeft}s
              </span>
            ) : (
              ' Ya puedes intentar de nuevo.'
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {timeLeft === 0 && onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetry}
              className="h-7 px-2 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Reintentar
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="h-7 px-2 text-xs text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
          >
            ×
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}

/**
 * Hook para manejar notificaciones de rate limiting
 */
export function useRateLimitNotification() {
  const [notification, setNotification] = useState<{
    retryAfter?: number
    onRetry?: () => void
  } | null>(null)

  const showNotification = (retryAfter?: number, onRetry?: () => void) => {
    setNotification({ retryAfter, onRetry })
  }

  const hideNotification = () => {
    setNotification(null)
  }

  const RateLimitAlert = () => {
    if (!notification) return null

    return (
      <RateLimitNotification
        retryAfter={notification.retryAfter}
        onRetry={notification.onRetry}
        onDismiss={hideNotification}
      />
    )
  }

  return {
    showNotification,
    hideNotification,
    RateLimitAlert
  }
}
