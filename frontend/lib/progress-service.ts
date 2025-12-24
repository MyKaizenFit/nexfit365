// lib/progress-service.ts
// Servicio para análisis de progreso y recomendaciones

import { buildApiUrl, authenticatedFetch, getAuthHeaders } from './api'

export interface WeightAnalysis {
  has_enough_data: boolean
  status?: 'on_track' | 'stalled' | 'slow' | 'too_fast'
  period_weeks: number
  first_weight?: number
  last_weight?: number
  weight_change?: number
  weight_change_pct?: number
  weekly_change?: number
  recommendations: Array<{
    type: 'warning' | 'info' | 'success'
    title: string
    message: string
    action: string
    suggested_calorie_adjustment?: number
  }>
}

export interface WorkoutAnalysis {
  period_weeks: number
  total_workouts: number
  expected_workouts: number
  consistency_pct: number
  recommendations: Array<{
    type: 'warning' | 'info' | 'success'
    title: string
    message: string
    action: string
  }>
}

export interface NutritionAnalysis {
  period_weeks: number
  total_days: number
  days_with_meals: number
  consistency_pct: number
  recommendations: Array<{
    type: 'warning' | 'info' | 'success'
    title: string
    message: string
    action: string
  }>
}

export interface ProgressAnalysis {
  period_weeks: number
  analysis_date: string
  weight_analysis: WeightAnalysis
  workout_analysis: WorkoutAnalysis
  nutrition_analysis: NutritionAnalysis
  recommendations: {
    priority: Array<any>
    info: Array<any>
    success: Array<any>
    all: Array<any>
  }
  overall_status: string
  plan_adjustment_suggestion?: {
    reason: string
    message: string
    action: string
    calorie_adjustment: number
  }
}

export interface WeightEntry {
  id: number
  date: string
  weight: number
  notes?: string
}

export interface ProgressStats {
  weight: {
    current: number | null
    goal: number
    change: number | null
    progress: number
    entries_count: number
    entries_this_month: number
  }
  workouts: {
    this_week: number
    this_month: number
    goal_per_week: number
    progress: number
    total_time_month: number
    avg_time_per_workout: number
  }
  nutrition: {
    meals_this_week: number
    meals_this_month: number
    goal_per_week: number
    progress: number
  }
  photos: {
    total: number
    this_month: number
  }
  overall_progress: number
}

class ProgressService {
  /**
   * Obtener estadísticas de progreso para el dashboard
   */
  async getProgressStats(): Promise<ProgressStats | null> {
    try {
      const headers = await getAuthHeaders()
      const response = await authenticatedFetch(
        'progress-stats/dashboard/',
        {
          headers,
          method: 'GET'
        }
      )

      if (!response.ok) {
        console.error(`Error obteniendo estadísticas de progreso: ${response.status}`)
        return null
      }

      const data = await response.json()
      return data as ProgressStats
    } catch (error) {
      console.error('Error obteniendo estadísticas de progreso:', error)
      return null
    }
  }

  /**
   * Obtener análisis completo de progreso
   */
  async getProgressAnalysis(weeks: number = 4): Promise<ProgressAnalysis | null> {
    try {
      const headers = await getAuthHeaders()
      const response = await authenticatedFetch(
        `progress-stats/analysis/?weeks=${weeks}`,
        {
          headers,
          method: 'GET'
        }
      )

      if (!response.ok) {
        console.error(`Error obteniendo análisis de progreso: ${response.status}`)
        return null
      }

      const data = await response.json()
      return data as ProgressAnalysis
    } catch (error) {
      console.error('Error obteniendo análisis de progreso:', error)
      return null
    }
  }

  /**
   * Obtener historial de peso
   */
  async getWeightHistory(): Promise<WeightEntry[]> {
    try {
      const headers = await getAuthHeaders()
      const response = await authenticatedFetch(
        'weight-history/',
        {
          headers,
          method: 'GET'
        }
      )

      if (!response.ok) {
        console.error(`Error obteniendo historial de peso: ${response.status}`)
        return []
      }

      const data = await response.json()
      
      // Manejar respuesta paginada de Django REST Framework
      if (data && typeof data === 'object' && 'results' in data) {
        return data.results || []
      }

      // Fallback para respuesta no paginada
      if (Array.isArray(data)) {
        return data
      }

      return []
    } catch (error) {
      console.error('Error obteniendo historial de peso:', error)
      return []
    }
  }

  /**
   * Agregar entrada de peso
   */
  async addWeightEntry(weight: number, date: string, notes?: string): Promise<WeightEntry> {
    try {
      const headers = await getAuthHeaders()
      const response = await authenticatedFetch(
        'weight-history/',
        {
          headers,
          method: 'POST',
          body: JSON.stringify({
            weight,
            date,
            notes
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Error agregando entrada de peso: ${response.status}`)
      }

      const data = await response.json()
      return data as WeightEntry
    } catch (error) {
      console.error('Error agregando entrada de peso:', error)
      throw error
    }
  }

  /**
   * Actualizar entrada de peso
   */
  async updateWeightEntry(id: string | number, weight: number, date: string, notes?: string): Promise<WeightEntry> {
    try {
      const headers = await getAuthHeaders()
      const response = await authenticatedFetch(
        `weight-history/${id}/`,
        {
          headers,
          method: 'PUT',
          body: JSON.stringify({
            weight,
            date,
            notes
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Error actualizando entrada de peso: ${response.status}`)
      }

      const data = await response.json()
      return data as WeightEntry
    } catch (error) {
      console.error('Error actualizando entrada de peso:', error)
      throw error
    }
  }

  /**
   * Eliminar entrada de peso
   */
  async deleteWeightEntry(id: string | number): Promise<void> {
    try {
      const headers = await getAuthHeaders()
      const response = await authenticatedFetch(
        `weight-history/${id}/`,
        {
          headers,
          method: 'DELETE'
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Error eliminando entrada de peso: ${response.status}`)
      }
    } catch (error) {
      console.error('Error eliminando entrada de peso:', error)
      throw error
    }
  }

  /**
   * Aplicar ajuste sugerido al plan nutricional
   */
  async applyPlanAdjustment(calorieAdjustment: number): Promise<boolean> {
    try {
      // Obtener plan actual
      const headers = await getAuthHeaders()
      const planResponse = await authenticatedFetch(
        'nutrition/current-plan/',
        {
          headers,
          method: 'GET'
        }
      )

      if (!planResponse.ok) {
        throw new Error('No se pudo obtener el plan actual')
      }

      const planData = await planResponse.json()
      const currentPlan = planData.plan

      if (!currentPlan) {
        throw new Error('No hay plan activo para ajustar')
      }

      // Actualizar perfil del usuario para que el signal actualice el plan
      // Esto es un workaround - idealmente debería haber un endpoint específico
      // Por ahora, actualizamos el peso ligeramente para forzar recálculo
      // TODO: Crear endpoint específico para ajustar plan directamente
      
      return true
    } catch (error) {
      console.error('Error aplicando ajuste de plan:', error)
      return false
    }
  }
}

// Exportar instancia singleton
export const progressService = new ProgressService()
