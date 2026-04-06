// hooks/use-notifications-enhanced.ts
// Hook mejorado para manejar notificaciones con el backend

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { notificationService, Notification, NotificationSettings } from '@/lib/notification-service'
import { automatedNotificationService } from '@/lib/automated-notifications'
import { toast } from '@/hooks/use-toast'

const normalizeHeaders = (headers: HeadersInit): Record<string, string> => {
  return Object.fromEntries(new Headers(headers).entries())
}

export function useNotificationsEnhanced() {
  const { isAuthenticated, getAuthHeaders } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [settings, setSettings] = useState<NotificationSettings>({
    email: true,
    push: true,
    meals: true,
    workouts: true,
    achievements: true,
    reminders: true,
    marketing: false,
    admin: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  // Cargar notificaciones
  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      setLoading(true)
      setError(null)

      const headers = normalizeHeaders(await getAuthHeaders())
      const items = await notificationService.getNotifications(headers)
      const uniqueItems = Array.from(
        new Map(items.map((item) => [item.id, item])).values()
      ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setNotifications(uniqueItems)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar notificaciones')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, getAuthHeaders])

  // Cargar configuración
  const loadSettings = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      const loaded = await notificationService.getSettings()
      setSettings(loaded)
    } catch (err) {
    }
  }, [isAuthenticated])

  // Efectos
  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications()
      loadSettings()
      
      // Inicializar servicio de notificaciones automáticas (deshabilitado temporalmente)
      // automatedNotificationService.loadPersistentState()
      // automatedNotificationService.start()
    } else {
      // Detener servicio cuando no está autenticado
      automatedNotificationService.stop()
    }
  }, [isAuthenticated, loadNotifications, loadSettings])

  // Actualizar contador cuando cambien las notificaciones
  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.read).length
    setUnreadCount(unreadCount)
  }, [notifications])

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      // automatedNotificationService.stop()
      // automatedNotificationService.savePersistentState()
    }
  }, [])

  // Auto-refresh cada 30 segundos (deshabilitado temporalmente)
  // useEffect(() => {
  //   if (!isAuthenticated) return

  //   const interval = setInterval(() => {
  //     // Solo recargar notificaciones, el contador se actualiza automáticamente
  //     loadNotifications()
  //   }, 30000)

  //   return () => clearInterval(interval)
  // }, [isAuthenticated, loadNotifications])

  // Marcar como leída
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const headers = normalizeHeaders(await getAuthHeaders())
      await notificationService.markAsRead(notificationId, headers)

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
      
      toast({
        title: "✅ Notificación marcada como leída",
        description: "La notificación ha sido marcada como leída",
      })
    } catch (err) {
      toast({
        title: "❌ Error",
        description: err instanceof Error ? err.message : "No se pudo marcar la notificación como leída",
        variant: "destructive",
      })
    }
  }, [getAuthHeaders])

  const markAsUnread = useCallback(async (notificationId: string) => {
    try {
      const headers = normalizeHeaders(await getAuthHeaders())
      await notificationService.markAsUnread(notificationId, headers)

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: false, is_read: false } : n)
      )
      setUnreadCount(prev => prev + 1)
      
      toast({
        title: "↩️ Notificación marcada como no leída",
        description: "La notificación volverá a aparecer como pendiente",
      })
    } catch (err) {
      toast({
        title: "❌ Error",
        description: err instanceof Error ? err.message : "No se pudo marcar la notificación como no leída",
        variant: "destructive",
      })
    }
  }, [getAuthHeaders])

  // Marcar todas como leídas
  const markAllAsRead = useCallback(async () => {
    try {
      const headers = normalizeHeaders(await getAuthHeaders())
      await notificationService.markAllAsRead(headers)

      setNotifications(prev => prev.map(n => ({ ...n, read: true, is_read: true })))
      setUnreadCount(0)
      
      toast({
        title: "✅ Todas marcadas como leídas",
        description: "Todas las notificaciones han sido marcadas como leídas",
      })
    } catch (err) {
      toast({
        title: "❌ Error",
        description: err instanceof Error ? err.message : "No se pudo marcar todas las notificaciones como leídas",
        variant: "destructive",
      })
    }
  }, [getAuthHeaders])

  const trackClick = useCallback(async (notificationId: string) => {
    try {
      const headers = normalizeHeaders(await getAuthHeaders())
      await notificationService.trackClick(notificationId, headers)
    } catch {
      // No bloquea navegación si falla telemetry
    }
  }, [getAuthHeaders])

  // Eliminar notificación
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const headers = normalizeHeaders(await getAuthHeaders())
      await notificationService.deleteNotification(notificationId, headers)

      const notification = notifications.find(n => n.id === notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      
      // Actualizar contador si no estaba leída
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
      
      toast({
        title: "🗑️ Notificación eliminada",
        description: "La notificación ha sido eliminada",
      })
    } catch (err) {
      toast({
        title: "❌ Error",
        description: err instanceof Error ? err.message : "No se pudo eliminar la notificación",
        variant: "destructive",
      })
    }
  }, [getAuthHeaders, notifications])

  // Limpiar todas las notificaciones
  const clearAll = useCallback(async () => {
    try {
      const headers = normalizeHeaders(await getAuthHeaders())
      await notificationService.clearAll(headers)
      setNotifications([])
      setUnreadCount(0)
      
      toast({
        title: "🗑️ Todas las notificaciones eliminadas",
        description: "Se han eliminado todas las notificaciones",
      })
    } catch (err) {
      toast({
        title: "❌ Error",
        description: err instanceof Error ? err.message : "No se pudieron eliminar todas las notificaciones",
        variant: "destructive",
      })
    }
  }, [getAuthHeaders])

  // Actualizar configuración
  const updateSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    try {
      const updated = await notificationService.updateSettings(newSettings)
      setSettings(updated)
      
      toast({
        title: "✅ Configuración actualizada",
        description: "Las preferencias de notificaciones han sido actualizadas",
      })
    } catch (err) {
      toast({
        title: "❌ Error",
        description: err instanceof Error ? err.message : "No se pudo actualizar la configuración",
        variant: "destructive",
      })
    }
  }, [])

  // Refrescar datos
  const refresh = useCallback(async () => {
    await Promise.all([
      loadNotifications(),
      loadSettings(),
    ])
    // El contador se actualiza automáticamente cuando cambian las notificaciones
  }, [loadNotifications, loadSettings])

  // Filtrar notificaciones por tipo
  const getNotificationsByType = useCallback((type: string) => {
    return notifications.filter(n => n.type === type)
  }, [notifications])

  // Obtener notificaciones no leídas
  const getUnreadNotifications = useCallback(() => {
    return notifications.filter(n => !n.read)
  }, [notifications])

  // Obtener notificaciones por prioridad
  const getNotificationsByPriority = useCallback((priority: string) => {
    return notifications.filter(n => n.priority === priority)
  }, [notifications])

  return {
    // Estado
    notifications,
    settings,
    loading,
    error,
    unreadCount,
    
    // Acciones
    markAsRead,
    markAsUnread,
    trackClick,
    markAllAsRead,
    deleteNotification,
    clearAll,
    updateSettings,
    refresh,
    
    // Utilidades
    getNotificationsByType,
    getUnreadNotifications,
    getNotificationsByPriority,
  }
}

// Hook para notificaciones automáticas
export function useAutomatedNotifications() {
  const { isAuthenticated, user } = useAuth()
  const { updateSettings } = useNotificationsEnhanced()

  // Verificar si el usuario no ha hecho su entrenamiento diario
  const checkDailyWorkout = useCallback(async () => {
    if (!isAuthenticated || !user) return

    try {
      // Aquí podrías verificar si el usuario ha completado su entrenamiento del día
      // Por ahora, simularemos la lógica
      const today = new Date().toDateString()
      const lastWorkout = localStorage.getItem(`last_workout_${user.id}`)
      
      if (lastWorkout !== today) {
        // El usuario no ha hecho su entrenamiento hoy
        // En una implementación real, esto se haría desde el backend
        
        // Aquí podrías enviar una notificación automática
        // await notificationService.createNotification({
        //   type: 'workout',
        //   title: '¡No olvides tu entrenamiento!',
        //   message: 'Aún no has completado tu entrenamiento de hoy. ¡Es hora de ponerse en forma!',
        //   priority: 'medium',
        //   actionable: true,
        //   action_text: 'Comenzar entrenamiento',
        //   action_url: '/workouts',
        // })
      }
    } catch (error) {
    }
  }, [isAuthenticated, user])

  // Verificar si el usuario no ha registrado sus comidas
  const checkMealLogging = useCallback(async () => {
    if (!isAuthenticated || !user) return

    try {
      // Verificar si el usuario ha registrado sus comidas del día
      const today = new Date().toDateString()
      const lastMealLog = localStorage.getItem(`last_meal_log_${user.id}`)
      
      if (lastMealLog !== today) {
        
        // Aquí podrías enviar una notificación automática
        // await notificationService.createNotification({
        //   type: 'meal',
        //   title: '¡Registra tus comidas!',
        //   message: 'No olvides registrar lo que has comido hoy para mantener un seguimiento preciso.',
        //   priority: 'low',
        //   actionable: true,
        //   action_text: 'Registrar comida',
        //   action_url: '/nutrition',
        // })
      }
    } catch (error) {
    }
  }, [isAuthenticated, user])

  // Verificar recordatorios de peso
  const checkWeightReminder = useCallback(async () => {
    if (!isAuthenticated || !user) return

    try {
      // Verificar si el usuario ha registrado su peso esta semana
      const lastWeightEntry = localStorage.getItem(`last_weight_entry_${user.id}`)
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      
      if (!lastWeightEntry || new Date(lastWeightEntry) < oneWeekAgo) {
        
        // Aquí podrías enviar una notificación automática
        // await notificationService.createNotification({
        //   type: 'reminder',
        //   title: 'Recordatorio de peso',
        //   message: 'Es hora de registrar tu peso semanal para mantener un seguimiento de tu progreso.',
        //   priority: 'low',
        //   actionable: true,
        //   action_text: 'Registrar peso',
        //   action_url: '/progress',
        // })
      }
    } catch (error) {
    }
  }, [isAuthenticated, user])

  // Ejecutar verificaciones automáticas
  useEffect(() => {
    if (!isAuthenticated) return

    // Ejecutar verificaciones cada hora
    const interval = setInterval(() => {
      checkDailyWorkout()
      checkMealLogging()
      checkWeightReminder()
    }, 60 * 60 * 1000) // 1 hora

    // Ejecutar una vez al cargar
    checkDailyWorkout()
    checkMealLogging()
    checkWeightReminder()

    return () => clearInterval(interval)
  }, [isAuthenticated, checkDailyWorkout, checkMealLogging, checkWeightReminder])

  return {
    checkDailyWorkout,
    checkMealLogging,
    checkWeightReminder,
  }
}
