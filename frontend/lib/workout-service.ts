// lib/workout-service.ts
// Servicio para manejar las operaciones relacionadas con entrenamientos

import { buildApiUrl, getAuthHeaders, handleApiResponse } from './api'

// Interfaces
export interface Exercise {
  id: string
  name: string
  sets: number
  reps: string
  weight: string
  duration?: number
  rest_time: number
  notes: string
  order_index: number
}

export interface WorkoutDay {
  id: string
  day_name: string
  day_number: number
  is_rest_day: boolean
  notes: string
  exercises: Exercise[]
}

export interface UserWorkoutPlan {
  id: string
  template_name: string
  template_difficulty: string
  is_customized: boolean
  start_date: string
  end_date?: string
  is_active: boolean
  notes: string
  custom_days?: WorkoutDay[]
}

export interface WorkoutLog {
  id: string
  date: string
  duration_minutes: number
  completed: boolean
  notes: string
  rating: number
  workout_day_id?: string
}

export interface WorkoutProgram {
  id: string
  name: string
  description?: string
  difficulty?: string
  goal?: string
  location?: string
  duration_weeks?: number
  days_per_week?: number
  estimated_duration_minutes?: number
  is_active?: boolean
  is_system?: boolean
  is_template?: boolean
  days?: WorkoutDay[]
  created_at?: string
}

export interface WorkoutPlanTemplate {
  id: string
  name: string
  description: string
  difficulty: string
  duration_weeks: number
  is_active: boolean
  created_by: string
  days: WorkoutDay[]
}

export interface CreateWorkoutLogData {
  workout_day_id: string
  date: string
  duration_minutes: number
  completed: boolean
  notes?: string
  rating?: number
}

class WorkoutService {
  // Obtener planes de entrenamiento activos del usuario
  async getUserWorkoutPlans(isActive?: boolean): Promise<{ data: UserWorkoutPlan[] | null; error: string | null }> {
    try {
      const params = new URLSearchParams()
      if (isActive !== undefined) {
        params.append('is_active', isActive.toString())
      }
      
      const url = buildApiUrl(`user-workout-plans/?${params.toString()}`)
      const response = await fetch(url, {
        headers: getAuthHeaders()
      })
      
      const result = await handleApiResponse<any>(response)
      
      if (result.error) {
        return { data: null, error: result.error }
      }
      
      // Manejar respuesta con paginación o array directo
      const plansArray = Array.isArray(result.data) ? result.data : (result.data?.results || [])
      return { data: plansArray, error: null }
    } catch (error) {
      return { data: null, error: 'Error al obtener planes de entrenamiento' }
    }
  }

  // Obtener logs de entrenamiento
  async getWorkoutLogs(): Promise<{ data: WorkoutLog[] | null; error: string | null }> {
    try {
      const url = buildApiUrl('workout-logs/')
      const response = await fetch(url, {
        headers: getAuthHeaders()
      })
      
      const result = await handleApiResponse<any>(response)
      
      if (result.error) {
        return { data: null, error: result.error }
      }
      
      // Manejar respuesta con paginación o array directo
      const logsArray = Array.isArray(result.data) ? result.data : (result.data?.results || [])
      return { data: logsArray, error: null }
    } catch (error) {
      return { data: null, error: 'Error al obtener historial de entrenamientos' }
    }
  }

  // Crear un nuevo log de entrenamiento
  async createWorkoutLog(logData: CreateWorkoutLogData): Promise<{ data: WorkoutLog | null; error: string | null }> {
    try {
      const url = buildApiUrl('workout-logs/')
      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(logData)
      })
      
      return await handleApiResponse<WorkoutLog>(response)
    } catch (error) {
      return { data: null, error: 'Error al registrar entrenamiento' }
    }
  }

  // Obtener plantillas de planes de entrenamiento (para administradores)
  async getWorkoutPlanTemplates(): Promise<{ data: WorkoutPlanTemplate[] | null; error: string | null }> {
    try {
      const url = buildApiUrl('workout-plan-templates/')
      const response = await fetch(url, {
        headers: getAuthHeaders()
      })
      
      return await handleApiResponse<WorkoutPlanTemplate[]>(response)
    } catch (error) {
      return { data: null, error: 'Error al obtener plantillas de planes' }
    }
  }

  // Crear una nueva plantilla de plan de entrenamiento
  async createWorkoutPlanTemplate(templateData: Partial<WorkoutPlanTemplate>): Promise<{ data: WorkoutPlanTemplate | null; error: string | null }> {
    try {
      const url = buildApiUrl('workout-plan-templates/')
      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(templateData)
      })
      
      return await handleApiResponse<WorkoutPlanTemplate>(response)
    } catch (error) {
      return { data: null, error: 'Error al crear plantilla de plan' }
    }
  }

  // Asignar un plan de entrenamiento a un usuario
  async assignWorkoutPlanToUser(userId: string, templateId: string, startDate: string): Promise<{ data: UserWorkoutPlan | null; error: string | null }> {
    try {
      const url = buildApiUrl('user-workout-plans/')
      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          user: userId,
          template: templateId,
          start_date: startDate,
          is_active: true
        })
      })
      
      return await handleApiResponse<UserWorkoutPlan>(response)
    } catch (error) {
      return { data: null, error: 'Error al asignar plan de entrenamiento' }
    }
  }

  // Activar/desactivar un plan de entrenamiento del usuario
  async toggleWorkoutPlanStatus(planId: string, isActive: boolean): Promise<{ data: UserWorkoutPlan | null; error: string | null }> {
    try {
      const url = buildApiUrl(`user-workout-plans/${planId}/`)
      const response = await fetch(url, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_active: isActive })
      })
      
      return await handleApiResponse<UserWorkoutPlan>(response)
    } catch (error) {
      return { data: null, error: 'Error al cambiar estado del plan' }
    }
  }

  // Obtener ejercicios disponibles
  async getExercises(): Promise<{ data: Exercise[] | null; error: string | null }> {
    try {
      const url = buildApiUrl('exercises/')
      const response = await fetch(url, {
        headers: getAuthHeaders()
      })
      
      return await handleApiResponse<Exercise[]>(response)
    } catch (error) {
      return { data: null, error: 'Error al obtener ejercicios' }
    }
  }

  // ---- CRUD de Programas de entrenamiento ----
  async getPrograms(): Promise<WorkoutProgram[]> {
    try {
      const headers = await getAuthHeaders()
      const url = buildApiUrl('workouts/programs/')
      const res = await fetch(url, { headers })
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data) ? data : (data.results ?? [])
    } catch { return [] }
  }

  async createProgram(data: {
    name: string
    description?: string
    difficulty?: string
    goal?: string
    location?: string
    duration_weeks?: number
    days_per_week?: number
    estimated_duration_minutes?: number
  }): Promise<WorkoutProgram | null> {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(buildApiUrl('workouts/programs/'), {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) return null
      return await res.json()
    } catch { return null }
  }

  async updateProgram(id: string, data: Partial<{
    name: string
    description: string
    difficulty: string
    goal: string
    location: string
    duration_weeks: number
    days_per_week: number
    estimated_duration_minutes: number
  }>): Promise<WorkoutProgram | null> {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(buildApiUrl(`workouts/programs/${id}/`), {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) return null
      return await res.json()
    } catch { return null }
  }

  async deleteProgram(id: string): Promise<boolean> {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(buildApiUrl(`workouts/programs/${id}/`), {
        method: 'DELETE',
        headers,
      })
      return res.ok || res.status === 204
    } catch { return false }
  }

  async activateProgram(id: string): Promise<boolean> {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(buildApiUrl(`workouts/programs/${id}/activate/`), {
        method: 'POST',
        headers,
      })
      return res.ok
    } catch { return false }
  }
}

// Exportar instancia singleton
export const workoutService = new WorkoutService()
export default workoutService

