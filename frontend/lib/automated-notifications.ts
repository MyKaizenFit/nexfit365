// lib/automated-notifications.ts
// Servicio para notificaciones automáticas basadas en el comportamiento del usuario

import { notificationService, CreateNotificationData } from './notification-service'
import { useAuth } from '@/contexts/auth-context'

export interface AutomatedNotificationRule {
  id: string
  name: string
  description: string
  condition: () => Promise<boolean>
  notification: CreateNotificationData
  enabled: boolean
  lastTriggered?: Date
  cooldownHours: number // Horas de espera antes de poder volver a activarse
}

export class AutomatedNotificationService {
  private rules: AutomatedNotificationRule[] = []
  private checkInterval: NodeJS.Timeout | null = null
  private isRunning = false

  constructor() {
    this.initializeRules()
  }

  private initializeRules() {
    this.rules = [
      {
        id: 'daily-workout-reminder',
        name: 'Recordatorio de Entrenamiento Diario',
        description: 'Notifica si el usuario no ha completado su entrenamiento del día',
        condition: () => this.checkDailyWorkout(),
        notification: {
          type: 'workout',
          title: '¡No olvides tu entrenamiento!',
          message: 'Aún no has completado tu entrenamiento de hoy. ¡Es hora de ponerse en forma!',
          priority: 'medium',
          actionable: true,
          action_text: 'Comenzar entrenamiento',
          action_url: '/workouts',
        },
        enabled: true,
        cooldownHours: 2, // Puede activarse cada 2 horas
      },
      {
        id: 'meal-logging-reminder',
        name: 'Recordatorio de Registro de Comidas',
        description: 'Notifica si el usuario no ha registrado sus comidas del día',
        condition: () => this.checkMealLogging(),
        notification: {
          type: 'meal',
          title: '¡Registra tus comidas!',
          message: 'No olvides registrar lo que has comido hoy para mantener un seguimiento preciso de tu nutrición.',
          priority: 'low',
          actionable: true,
          action_text: 'Registrar comida',
          action_url: '/nutrition',
        },
        enabled: true,
        cooldownHours: 4, // Puede activarse cada 4 horas
      },
      {
        id: 'weight-reminder',
        name: 'Recordatorio de Peso Semanal',
        description: 'Notifica si el usuario no ha registrado su peso esta semana',
        condition: () => this.checkWeightReminder(),
        notification: {
          type: 'reminder',
          title: 'Recordatorio de peso',
          message: 'Es hora de registrar tu peso semanal para mantener un seguimiento de tu progreso.',
          priority: 'low',
          actionable: true,
          action_text: 'Registrar peso',
          action_url: '/progress',
        },
        enabled: true,
        cooldownHours: 24, // Puede activarse cada 24 horas
      },
      {
        id: 'achievement-celebration',
        name: 'Celebración de Logros',
        description: 'Celebra cuando el usuario alcanza hitos importantes',
        condition: () => this.checkAchievements(),
        notification: {
          type: 'achievement',
          title: '¡Felicidades!',
          message: 'Has alcanzado un nuevo hito en tu viaje de fitness. ¡Sigue así!',
          priority: 'medium',
          actionable: true,
          action_text: 'Ver logros',
          action_url: '/achievements',
        },
        enabled: true,
        cooldownHours: 1, // Puede activarse cada hora
      },
      {
        id: 'streak-maintenance',
        name: 'Mantenimiento de Racha',
        description: 'Motiva al usuario a mantener sus rachas de actividad',
        condition: () => this.checkStreakMaintenance(),
        notification: {
          type: 'reminder',
          title: '¡Mantén tu racha!',
          message: 'Tienes una racha impresionante. ¡No la rompas hoy!',
          priority: 'medium',
          actionable: true,
          action_text: 'Continuar racha',
          action_url: '/dashboard',
        },
        enabled: true,
        cooldownHours: 6, // Puede activarse cada 6 horas
      },
    ]
  }

  // Verificar si el usuario ha completado su entrenamiento diario
  private async checkDailyWorkout(): Promise<boolean> {
    try {
      // En una implementación real, esto verificaría con el backend
      const today = new Date().toDateString()
      const userId = this.getCurrentUserId()
      const lastWorkout = localStorage.getItem(`last_workout_${userId}`)
      
      // Si no hay registro de entrenamiento hoy, activar notificación
      return lastWorkout !== today
    } catch (error) {
      console.error('Error checking daily workout:', error)
      return false
    }
  }

  // Verificar si el usuario ha registrado sus comidas
  private async checkMealLogging(): Promise<boolean> {
    try {
      const today = new Date().toDateString()
      const userId = this.getCurrentUserId()
      const lastMealLog = localStorage.getItem(`last_meal_log_${userId}`)
      
      // Si no hay registro de comidas hoy, activar notificación
      return lastMealLog !== today
    } catch (error) {
      console.error('Error checking meal logging:', error)
      return false
    }
  }

  // Verificar si el usuario ha registrado su peso esta semana
  private async checkWeightReminder(): Promise<boolean> {
    try {
      const userId = this.getCurrentUserId()
      const lastWeightEntry = localStorage.getItem(`last_weight_entry_${userId}`)
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      
      // Si no hay registro de peso en la última semana, activar notificación
      return !lastWeightEntry || new Date(lastWeightEntry) < oneWeekAgo
    } catch (error) {
      console.error('Error checking weight reminder:', error)
      return false
    }
  }

  // Verificar logros recientes
  private async checkAchievements(): Promise<boolean> {
    try {
      // En una implementación real, esto verificaría con el backend
      const userId = this.getCurrentUserId()
      const lastAchievementCheck = localStorage.getItem(`last_achievement_check_${userId}`)
      const oneHourAgo = new Date()
      oneHourAgo.setHours(oneHourAgo.getHours() - 1)
      
      // Si no se ha verificado en la última hora, activar notificación
      return !lastAchievementCheck || new Date(lastAchievementCheck) < oneHourAgo
    } catch (error) {
      console.error('Error checking achievements:', error)
      return false
    }
  }

  // Verificar mantenimiento de rachas
  private async checkStreakMaintenance(): Promise<boolean> {
    try {
      // En una implementación real, esto verificaría con el backend
      const userId = this.getCurrentUserId()
      const currentStreak = parseInt(localStorage.getItem(`current_streak_${userId}`) || '0')
      
      // Si tiene una racha de al menos 3 días, motivar a mantenerla
      return currentStreak >= 3
    } catch (error) {
      console.error('Error checking streak maintenance:', error)
      return false
    }
  }

  // Obtener ID del usuario actual
  private getCurrentUserId(): string {
    // En una implementación real, esto vendría del contexto de autenticación
    return localStorage.getItem('user_id') || 'default_user'
  }

  // Iniciar el servicio de notificaciones automáticas
  public start(): void {
    if (this.isRunning) return

    this.isRunning = true
    console.log('🚀 Iniciando servicio de notificaciones automáticas')

    // Verificar reglas cada 30 minutos
    this.checkInterval = setInterval(() => {
      this.checkAllRules()
    }, 30 * 60 * 1000) // 30 minutos

    // Verificar una vez al iniciar
    this.checkAllRules()
  }

  // Detener el servicio
  public stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    this.isRunning = false
    console.log('⏹️ Servicio de notificaciones automáticas detenido')
  }

  // Verificar todas las reglas
  private async checkAllRules(): Promise<void> {
    const enabledRules = this.rules.filter(rule => rule.enabled)
    
    for (const rule of enabledRules) {
      try {
        await this.checkRule(rule)
      } catch (error) {
        console.error(`Error checking rule ${rule.id}:`, error)
      }
    }
  }

  // Verificar una regla específica
  private async checkRule(rule: AutomatedNotificationRule): Promise<void> {
    // Verificar cooldown
    if (rule.lastTriggered) {
      const timeSinceLastTrigger = Date.now() - rule.lastTriggered.getTime()
      const cooldownMs = rule.cooldownHours * 60 * 60 * 1000
      
      if (timeSinceLastTrigger < cooldownMs) {
        return // Aún en cooldown
      }
    }

    // Verificar condición
    const shouldTrigger = await rule.condition()
    
    if (shouldTrigger) {
      await this.triggerNotification(rule)
    }
  }

  // Activar notificación
  private async triggerNotification(rule: AutomatedNotificationRule): Promise<void> {
    try {
      // En una implementación real, esto enviaría la notificación al backend
      console.log(`🔔 Activando notificación: ${rule.name}`)
      
      // Simular envío de notificación
      // await notificationService.broadcastNotification(rule.notification)
      
      // Actualizar último activado
      rule.lastTriggered = new Date()
      
      // Guardar en localStorage para persistencia
      localStorage.setItem(`rule_${rule.id}_last_triggered`, rule.lastTriggered.toISOString())
      
    } catch (error) {
      console.error(`Error triggering notification for rule ${rule.id}:`, error)
    }
  }

  // Obtener reglas
  public getRules(): AutomatedNotificationRule[] {
    return [...this.rules]
  }

  // Habilitar/deshabilitar regla
  public toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.find(r => r.id === ruleId)
    if (rule) {
      rule.enabled = enabled
      console.log(`Regla ${ruleId} ${enabled ? 'habilitada' : 'deshabilitada'}`)
    }
  }

  // Actualizar configuración de regla
  public updateRule(ruleId: string, updates: Partial<AutomatedNotificationRule>): void {
    const rule = this.rules.find(r => r.id === ruleId)
    if (rule) {
      Object.assign(rule, updates)
      console.log(`Regla ${ruleId} actualizada`)
    }
  }

  // Cargar estado persistente
  public loadPersistentState(): void {
    this.rules.forEach(rule => {
      const lastTriggered = localStorage.getItem(`rule_${rule.id}_last_triggered`)
      if (lastTriggered) {
        rule.lastTriggered = new Date(lastTriggered)
      }
    })
  }

  // Guardar estado persistente
  public savePersistentState(): void {
    this.rules.forEach(rule => {
      if (rule.lastTriggered) {
        localStorage.setItem(`rule_${rule.id}_last_triggered`, rule.lastTriggered.toISOString())
      }
    })
  }
}

// Instancia singleton del servicio
export const automatedNotificationService = new AutomatedNotificationService()

// Hook para usar el servicio en componentes React
export function useAutomatedNotifications() {
  const { isAuthenticated } = useAuth()

  const startService = () => {
    if (isAuthenticated) {
      automatedNotificationService.loadPersistentState()
      automatedNotificationService.start()
    }
  }

  const stopService = () => {
    automatedNotificationService.stop()
    automatedNotificationService.savePersistentState()
  }

  const getRules = () => {
    return automatedNotificationService.getRules()
  }

  const toggleRule = (ruleId: string, enabled: boolean) => {
    automatedNotificationService.toggleRule(ruleId, enabled)
  }

  const updateRule = (ruleId: string, updates: Partial<AutomatedNotificationRule>) => {
    automatedNotificationService.updateRule(ruleId, updates)
  }

  return {
    startService,
    stopService,
    getRules,
    toggleRule,
    updateRule,
  }
}
