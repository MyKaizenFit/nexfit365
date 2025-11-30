import { buildApiUrl, getAuthHeaders, handleApiResponse } from './api'
import { authService } from './auth-service'

// Interfaces para el progreso
export interface WeightEntry {
  id: string
  weight: number
  date: string
  notes?: string
  created_at: string
}

export interface BodyMeasurement {
  id: string
  date: string
  chest?: number
  waist?: number
  hips?: number
  arms?: number
  thighs?: number
  neck?: number
  forearms?: number
  calves?: number
  notes?: string
  created_at: string
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

export interface WorkoutSession {
  id: string
  date: string
  duration: number
  workout_type: string
  notes?: string
  created_at: string
}

class ProgressService {
  // Obtener estadísticas generales de progreso
  async getProgressStats(): Promise<ProgressStats | null> {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Usuario no autenticado')
      }

      const response = await fetch(buildApiUrl('progress-stats/dashboard/'), {
        method: 'GET',
        headers: getAuthHeaders(),
      })

      const result = await handleApiResponse<ProgressStats>(response)
      
      if (result.error) {
        throw new Error(result.error)
      }

      return result.data
    } catch (error) {
      console.warn('Error al obtener estadísticas de progreso:', error)
      return null
    }
  }

  // Obtener historial de peso
  async getWeightHistory(): Promise<WeightEntry[]> {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Usuario no autenticado')
      }

      const response = await fetch(buildApiUrl('weight-history/'), {
        method: 'GET',
        headers: getAuthHeaders(),
      })

      const result = await handleApiResponse<WeightEntry[]>(response)
      
      if (result.error) {
        throw new Error(result.error)
      }

      return result.data || []
    } catch (error) {
      console.warn('Error al obtener historial de peso:', error)
      return []
    }
  }

  // Agregar nueva entrada de peso
  async addWeightEntry(weight: number, date: string, notes?: string): Promise<WeightEntry> {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Usuario no autenticado')
      }

      const payload = {
        weight,
        date,
        notes: notes || '',
      }
      
      console.log('📤 Enviando datos de peso:', payload)
      console.log('📤 URL:', buildApiUrl('weight-history/'))
      console.log('📤 Headers:', getAuthHeaders())

      const response = await fetch(buildApiUrl('weight-history/'), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await handleApiResponse<WeightEntry>(response)
      
      if (result.error) {
        throw new Error(result.error)
      }

      return result.data!
    } catch (error) {
      console.error('Error al agregar entrada de peso:', error)
      throw error
    }
  }

  // Actualizar entrada de peso
  async updateWeightEntry(id: string, weight: number, date: string, notes?: string): Promise<WeightEntry> {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Usuario no autenticado')
      }

      const response = await fetch(buildApiUrl(`weight-history/${id}/`), {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weight,
          date,
          notes: notes || '',
        }),
      })

      const result = await handleApiResponse<WeightEntry>(response)
      
      if (result.error) {
        throw new Error(result.error)
      }

      return result.data!
    } catch (error) {
      console.error('Error al actualizar entrada de peso:', error)
      throw error
    }
  }

  // Eliminar entrada de peso
  async deleteWeightEntry(id: string): Promise<boolean> {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Usuario no autenticado')
      }

      const response = await fetch(buildApiUrl(`weight-history/${id}/`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      if (response.status === 204) {
        return true
      }

      const result = await handleApiResponse<any>(response)
      
      if (result.error) {
        throw new Error(result.error)
      }

      return true
    } catch (error) {
      console.error('Error al eliminar entrada de peso:', error)
      throw error
    }
  }

  // Obtener medidas corporales
  async getBodyMeasurements(): Promise<BodyMeasurement[]> {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Usuario no autenticado')
      }

      const response = await fetch(buildApiUrl('measurements/'), {
        method: 'GET',
        headers: getAuthHeaders(),
      })

      const result = await handleApiResponse<BodyMeasurement[]>(response)
      
      if (result.error) {
        throw new Error(result.error)
      }

      return result.data || []
    } catch (error) {
      console.warn('Error al obtener medidas corporales:', error)
      return []
    }
  }

  // Agregar nuevas medidas corporales
  async addBodyMeasurement(data: Omit<BodyMeasurement, 'id' | 'created_at'>): Promise<BodyMeasurement> {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Usuario no autenticado')
      }

      const response = await fetch(buildApiUrl('measurements/'), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await handleApiResponse<BodyMeasurement>(response)
      
      if (result.error) {
        throw new Error(result.error)
      }

      return result.data!
    } catch (error) {
      console.error('Error al agregar medidas corporales:', error)
      throw error
    }
  }

  // Actualizar medidas corporales
  async updateBodyMeasurement(id: string, data: Partial<BodyMeasurement>): Promise<BodyMeasurement> {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Usuario no autenticado')
      }

      const response = await fetch(buildApiUrl(`measurements/${id}/`), {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await handleApiResponse<BodyMeasurement>(response)
      
      if (result.error) {
        throw new Error(result.error)
      }

      return result.data!
    } catch (error) {
      console.error('Error al actualizar medidas corporales:', error)
      throw error
    }
  }

  // Eliminar medidas corporales
  async deleteBodyMeasurement(id: string): Promise<boolean> {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Usuario no autenticado')
      }

      const response = await fetch(buildApiUrl(`measurements/${id}/`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      if (response.status === 204) {
        return true
      }

      const result = await handleApiResponse<any>(response)
      
      if (result.error) {
        throw new Error(result.error)
      }

      return true
    } catch (error) {
      console.error('Error al eliminar medidas corporales:', error)
      throw error
    }
  }
}

export const progressService = new ProgressService()
