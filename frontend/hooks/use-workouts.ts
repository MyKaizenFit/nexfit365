// hooks/use-workouts.ts
// Hook para manejar rutinas de ejercicios con datos reales del backend

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { buildApiUrl, authenticatedFetch } from '@/lib/api'

// Interfaces
export interface Exercise {
  id: string
  name: string
  category: string
  muscle_groups: string[]
  description: string
  instructions: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  equipment: string
  video_file?: string
  video_file_url?: string
  video_display_url?: string
  thumbnail?: string
  thumbnail_url?: string
  image_url?: string
  has_video?: boolean
  google_drive_file_id?: string
}

export interface WorkoutDayExercise {
  id: string
  exercise: Exercise
  sets: number
  reps: string
  weight?: number
  duration?: number
  rest_time: number
  notes?: string
  order_index: number
}

export interface WorkoutDay {
  id: string
  day_name: string
  day_number: number
  is_rest_day: boolean
  notes?: string
  order_index: number
  exercises: WorkoutDayExercise[]
}

export interface WorkoutProgram {
  id: string
  name: string
  description: string
  level: 'beginner' | 'intermediate' | 'advanced'
  goal: 'weight_loss' | 'muscle_gain' | 'strength_building' | 'endurance' | 'general_fitness'
  days_per_week: number
  duration_weeks: number
  start_date: string
  end_date?: string
  is_active: boolean
  days: WorkoutDay[]
}

export interface WorkoutTemplate {
  id: string
  name: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  goal: 'weight_loss' | 'muscle_gain' | 'strength_building' | 'endurance' | 'general_fitness'
  duration_weeks: number
  days_per_week: number
  is_active: boolean
  is_public: boolean
  tags: string[]
  created_by: {
    id: string
    first_name: string
    last_name: string
  }
}

export interface WorkoutLog {
  id: string
  user: string
  workout_day: string
  workout_day_name?: string  // Nombre descriptivo del día
  workout_day_day?: string   // Día de la semana (monday, tuesday, etc.)
  date: string
  completed: boolean
  notes?: string
  sets_completed: number
  total_sets: number
  duration_minutes?: number
  rating?: number  // Calificación del entrenamiento (1-5)
  created_at?: string
  updated_at?: string
}

export function useWorkouts() {
  const { isAuthenticated, user } = useAuth()
  const [workoutPrograms, setWorkoutPrograms] = useState<WorkoutProgram[]>([])
  const [activeProgram, setActiveProgram] = useState<WorkoutProgram | null>(null)
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar datos iniciales
  useEffect(() => {
    if (isAuthenticated) {
      // Agregar un pequeño delay para evitar peticiones simultáneas
      const timer = setTimeout(() => {
        loadWorkoutData()
      }, 100)
      
      return () => clearTimeout(timer)
    } else {
      // Limpiar datos cuando el usuario se desloguea
      setWorkoutPrograms([])
      setActiveProgram(null)
      setTemplates([])
      setExercises([])
      setWorkoutLogs([])
      setLoading(false)
      setError(null)
    }
  }, [isAuthenticated])

  const loadWorkoutData = async () => {
    // No cargar datos si el usuario no está autenticado
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      // Cargar de forma secuencial para evitar rate limiting
      await fetchWorkoutPrograms()
      await new Promise(resolve => setTimeout(resolve, 200)) // Pequeño delay
      
      await fetchActiveProgram()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      await fetchTemplates()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      await fetchExercises()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      await fetchWorkoutLogs()
    } catch (err) {
      console.error('Error loading workout data:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar datos de entrenamiento')
    } finally {
      setLoading(false)
    }
  }

  // Obtener programas de entrenamiento del usuario
  const fetchWorkoutPrograms = async () => {
    if (!isAuthenticated) {
      console.log('Usuario no autenticado, saltando fetchWorkoutPrograms')
      return
    }

    try {
      const response = await authenticatedFetch('workout-programs/')
      const data = await response.json()
      
      if (response.ok) {
        setWorkoutPrograms(data.results || data)
      } else {
        throw new Error(data.detail || 'Error al obtener programas de entrenamiento')
      }
    } catch (err) {
      console.error('Error fetching workout programs:', err)
      throw err
    }
  }

  // Obtener programa activo
  const fetchActiveProgram = async () => {
    if (!isAuthenticated) {
      console.log('Usuario no autenticado, saltando fetchActiveProgram')
      return
    }

    try {
      const response = await authenticatedFetch('workout-programs/my_active_program/')
      
      if (response.ok) {
        const data = await response.json()
        setActiveProgram(data)
      } else if (response.status === 404) {
        setActiveProgram(null)
      } else {
        const data = await response.json()
        throw new Error(data.detail || 'Error al obtener programa activo')
      }
    } catch (err) {
      console.error('Error fetching active program:', err)
      throw err
    }
  }

  // Obtener plantillas disponibles
  const fetchTemplates = async () => {
    if (!isAuthenticated) {
      console.log('Usuario no autenticado, saltando fetchTemplates')
      return
    }

    try {
      const response = await authenticatedFetch('workout-programs/available_templates/')
      const data = await response.json()
      
      if (response.ok) {
        setTemplates(data)
      } else {
        throw new Error(data.detail || 'Error al obtener plantillas')
      }
    } catch (err) {
      console.error('Error fetching templates:', err)
      throw err
    }
  }

  // Obtener ejercicios disponibles
  const fetchExercises = async () => {
    if (!isAuthenticated) {
      console.log('Usuario no autenticado, saltando fetchExercises')
      return
    }

    try {
      const response = await authenticatedFetch('exercises/')
      const data = await response.json()
      
      if (response.ok) {
        setExercises(data.results || data)
      } else {
        throw new Error(data.detail || 'Error al obtener ejercicios')
      }
    } catch (err) {
      console.error('Error fetching exercises:', err)
      throw err
    }
  }

  // Obtener logs de entrenamiento
  const fetchWorkoutLogs = async () => {
    if (!isAuthenticated) {
      console.log('Usuario no autenticado, saltando fetchWorkoutLogs')
      return
    }

    try {
      const response = await authenticatedFetch('workout-logs/')
      const data = await response.json()
      
      if (response.ok) {
        setWorkoutLogs(data.results || data)
      } else {
        throw new Error(data.detail || 'Error al obtener logs de entrenamiento')
      }
    } catch (err) {
      console.error('Error fetching workout logs:', err)
      throw err
    }
  }

  // Crear programa desde plantilla
  const createProgramFromTemplate = async (templateId: string, userId: string, startDate?: string) => {
    if (!isAuthenticated) {
      throw new Error('Usuario no autenticado')
    }

    try {
      const response = await authenticatedFetch(`workout-programs/${templateId}/create_from_template/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          start_date: startDate || new Date().toISOString().split('T')[0]
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        // Recargar programas
        await fetchWorkoutPrograms()
        return data
      } else {
        throw new Error(data.detail || 'Error al crear programa desde plantilla')
      }
    } catch (err) {
      console.error('Error creating program from template:', err)
      throw err
    }
  }

  // Activar programa
  const activateProgram = async (programId: string) => {
    if (!isAuthenticated) {
      throw new Error('Usuario no autenticado')
    }

    try {
      const response = await authenticatedFetch(`workout-programs/${programId}/activate/`, {
        method: 'POST'
      })

      const data = await response.json()
      
      if (response.ok) {
        // Recargar programa activo
        await fetchActiveProgram()
        await fetchWorkoutPrograms()
        return data
      } else {
        throw new Error(data.detail || 'Error al activar programa')
      }
    } catch (err) {
      console.error('Error activating program:', err)
      throw err
    }
  }

  // Crear log de entrenamiento
  const createWorkoutLog = async (workoutDayId: string, notes?: string) => {
    if (!isAuthenticated) {
      throw new Error('Usuario no autenticado')
    }

    try {
      const response = await authenticatedFetch('workout-logs/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workout_day: workoutDayId,
          notes: notes || '',
          completed: true,
          date: new Date().toISOString().split('T')[0]
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        // Recargar logs
        await fetchWorkoutLogs()
        return data
      } else {
        throw new Error(data.detail || 'Error al crear log de entrenamiento')
      }
    } catch (err) {
      console.error('Error creating workout log:', err)
      throw err
    }
  }

  // Obtener ejercicios por categoría
  const getExercisesByCategory = (category: string) => {
    return exercises.filter(exercise => exercise.category === category)
  }

  // Obtener ejercicios por grupo muscular
  const getExercisesByMuscleGroup = (muscleGroup: string) => {
    return exercises.filter(exercise => 
      exercise.muscle_groups.some(mg => 
        mg.toLowerCase().includes(muscleGroup.toLowerCase())
      )
    )
  }

  // Obtener programa activo del día actual
  const getTodaysWorkout = () => {
    if (!activeProgram) return null
    
    const today = new Date().getDay() // 0 = Domingo, 1 = Lunes, etc.
    const dayNumber = today === 0 ? 7 : today // Convertir domingo a día 7
    
    return activeProgram.days.find(day => day.day_number === dayNumber)
  }

  // Obtener progreso semanal
  const getWeeklyProgress = () => {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    
    const recentLogs = workoutLogs.filter(log => 
      new Date(log.date) >= oneWeekAgo
    )
    
    return {
      totalWorkouts: recentLogs.length,
      completedWorkouts: recentLogs.filter(log => log.completed).length,
      totalMinutes: recentLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0)
    }
  }

  // Refrescar todos los datos
  const refreshData = useCallback(async () => {
    await loadWorkoutData()
  }, [])

  // Alias para logWorkout
  const logWorkout = createWorkoutLog
  
  return {
    // Estado
    workoutPrograms,
    activeProgram,
    templates,
    exercises,
    workoutLogs,
    loading,
    error,
    
    // Acciones
    fetchWorkoutPrograms,
    fetchActiveProgram,
    fetchTemplates,
    fetchExercises,
    fetchWorkoutLogs,
    createProgramFromTemplate,
    activateProgram,
    createWorkoutLog,
    logWorkout,  // Alias
    refreshData,
    
    // Utilidades
    getExercisesByCategory,
    getExercisesByMuscleGroup,
    getTodaysWorkout,
    getWeeklyProgress
  }
}