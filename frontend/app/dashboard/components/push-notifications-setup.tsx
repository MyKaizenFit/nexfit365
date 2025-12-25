'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, BellOff, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import { pushService, PushSubscriptionResponse } from '@/lib/push-service'
import { toast } from '@/hooks/use-toast'

export function PushNotificationsSetup() {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscriptions, setSubscriptions] = useState<PushSubscriptionResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    checkPushSupport()
  }, [])

  const checkPushSupport = async () => {
    setChecking(true)
    try {
      const supported = pushService.isSupported()
      setIsSupported(supported)

      if (supported) {
        // Verificar permisos
        if ('Notification' in window) {
          setPermission(Notification.permission)
        }

        // Verificar si hay suscripción activa
        const subscription = await pushService.getSubscription()
        setIsSubscribed(!!subscription)

        // Cargar suscripciones del backend
        await loadSubscriptions()
      }
    } catch (error) {
      console.error('Error verificando soporte push:', error)
    } finally {
      setChecking(false)
    }
  }

  const loadSubscriptions = async () => {
    try {
      const subs = await pushService.getUserSubscriptions()
      setSubscriptions(subs)
    } catch (error) {
      console.error('Error cargando suscripciones:', error)
    }
  }

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      // Crear suscripción
      const subscription = await pushService.subscribe()

      // Enviar al backend
      await pushService.sendSubscriptionToBackend(subscription)

      setIsSubscribed(true)
      await loadSubscriptions()

      toast({
        title: '✅ Notificaciones activadas',
        description: 'Ahora recibirás notificaciones push en tu dispositivo',
      })
    } catch (error) {
      console.error('Error suscribiéndose:', error)
      toast({
        title: '❌ Error',
        description: error instanceof Error ? error.message : 'No se pudo activar las notificaciones',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    setLoading(true)
    try {
      // Cancelar suscripción local
      await pushService.unsubscribe()

      // Eliminar del backend (si hay suscripciones)
      for (const sub of subscriptions) {
        try {
          await pushService.removeSubscriptionFromBackend(sub.id)
        } catch (error) {
          console.error('Error eliminando suscripción del backend:', error)
        }
      }

      setIsSubscribed(false)
      setSubscriptions([])

      toast({
        title: '✅ Notificaciones desactivadas',
        description: 'Ya no recibirás notificaciones push',
      })
    } catch (error) {
      console.error('Error cancelando suscripción:', error)
      toast({
        title: '❌ Error',
        description: 'No se pudo desactivar las notificaciones',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            Notificaciones Push No Disponibles
          </CardTitle>
          <CardDescription>
            Tu navegador no soporta notificaciones push
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Las notificaciones push requieren un navegador moderno con soporte para Service Workers y Push API.
            Prueba con Chrome, Firefox, Edge o Safari (iOS 16.4+).
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
          <Bell className="h-5 w-5" />
          Notificaciones Push
        </CardTitle>
        <CardDescription>
          Recibe notificaciones en tiempo real en tu dispositivo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estado de permisos */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3">
            {permission === 'granted' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : permission === 'denied' ? (
              <XCircle className="h-5 w-5 text-red-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-orange-600" />
            )}
            <div>
              <div className="font-medium text-gray-900">Permisos de Notificación</div>
              <div className="text-sm text-gray-600">
                {permission === 'granted' && 'Permisos concedidos'}
                {permission === 'denied' && 'Permisos denegados'}
                {permission === 'default' && 'Permisos no solicitados'}
              </div>
            </div>
          </div>
          <Badge
            variant={permission === 'granted' ? 'default' : permission === 'denied' ? 'destructive' : 'secondary'}
          >
            {permission === 'granted' && 'Activo'}
            {permission === 'denied' && 'Denegado'}
            {permission === 'default' && 'Pendiente'}
          </Badge>
        </div>

        {/* Estado de suscripción */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200">
          <div className="flex items-center gap-3">
            {isSubscribed ? (
              <Bell className="h-5 w-5 text-teal-600" />
            ) : (
              <BellOff className="h-5 w-5 text-gray-400" />
            )}
            <div>
              <div className="font-medium text-gray-900">Suscripción Push</div>
              <div className="text-sm text-gray-600">
                {isSubscribed
                  ? `Activa (${subscriptions.length} dispositivo${subscriptions.length !== 1 ? 's' : ''})`
                  : 'No activa'}
              </div>
            </div>
          </div>
          <Badge variant={isSubscribed ? 'default' : 'secondary'}>
            {isSubscribed ? 'Suscrito' : 'No suscrito'}
          </Badge>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3">
          {!isSubscribed ? (
            <Button
              onClick={handleSubscribe}
              disabled={loading || permission === 'denied'}
              className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Activando...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Activar Notificaciones
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleUnsubscribe}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Desactivando...
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4 mr-2" />
                  Desactivar Notificaciones
                </>
              )}
            </Button>
          )}
        </div>

        {/* Información adicional */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            Las notificaciones push te permiten recibir alertas importantes incluso cuando no estés usando la aplicación.
            Puedes activarlas o desactivarlas en cualquier momento desde aquí.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}






