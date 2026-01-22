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
  exercises_data?: any[]  // Datos de ejercicios realizados con sets/reps/peso
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
      setError(err instanceof Error ? err.message : 'Error al cargar datos de entrenamiento')
    } finally {
      setLoading(false)
    }
  }

  // Obtener programas de entrenamiento del usuario
  const fetchWorkoutPrograms = async () => {
    if (!isAuthenticated) {
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
      throw err
    }
  }

  // Obtener programa activo
  const fetchActiveProgram = async () => {
    if (!isAuthenticated) {
      return
    }

    try {
      const response = await authenticatedFetch('workout-programs/my_active_program/')

      if (response.ok) {
        const data = await response.json()
        // El API devuelve { program: {...} } o { program: null }
        const program = data.program || data
        if (program && program.id) {
          // Asegurar que days siempre sea un array
          setActiveProgram({
            ...program,
            days: program.days || []
          })
        } else {
          setActiveProgram(null)
        }
      } else if (response.status === 404) {
        setActiveProgram(null)
      } else {
        const data = await response.json()
        throw new Error(data.detail || 'Error al obtener programa activo')
      }
    } catch (err) {
      throw err
    }
  }

  // Obtener plantillas disponibles
  const fetchTemplates = async () => {
    if (!isAuthenticated) {
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
      throw err
    }
  }

  // Obtener ejercicios disponibles
  const fetchExercises = async () => {
    if (!isAuthenticated) {
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
      throw err
    }
  }

  // Obtener logs de entrenamiento
  const fetchWorkoutLogs = async () => {
    if (!isAuthenticated) {
      return
    }

    try {
      const response = await authenticatedFetch('workout-logs/')
      const data = await response.json()

      if (response.ok) {
        const logs = data.results || data
        setWorkoutLogs(logs)
        
        // Log para depuración
        if (logs.length > 0) {
          const lastLog = logs[0] // El más reciente
            id: lastLog.id,
            date: lastLog.date,
            completed: lastLog.completed,
            has_exercises_data: !!lastLog.exercises_data,
            exercises_data_length: lastLog.exercises_data?.length || 0
          })
        }
      } else {
        throw new Error(data.detail || 'Error al obtener logs de entrenamiento')
      }
    } catch (err) {
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
      // Asegurarse de lanzar un Error con mensaje de string
      if (err instanceof Error) {
        throw err
      } else {
        const errorMessage = typeof err === 'string' ? err : (err?.message || JSON.stringify(err) || 'Error desconocido al activar programa')
        throw new Error(errorMessage)
      }
    }
  }

  // Crear log de entrenamiento
  const createWorkoutLog = async (
    workoutDayId: string,
    notes?: string,
    duration_minutes?: number,
    rating?: number,
    exercises_data?: any[]
  ) => {
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
          date: new Date().toISOString().split('T')[0],
          duration_minutes: duration_minutes || null,
          rating: rating || null,
          exercises_data: exercises_data || []
        })
      })

      // Leer la respuesta como texto primero para poder manejarla correctamente
      let text: string
      try {
        text = await response.text()
      } catch (textError) {
        const textErrorMsg = textError instanceof Error ? textError.message : String(textError)
        throw new Error(`No se pudo leer la respuesta del servidor: ${textErrorMsg}`)
      }

      // Limpiar el texto de posibles caracteres no válidos al inicio
      const cleanedText = text.trim()

      // Verificar el tipo de contenido
      const contentType = response.headers.get('content-type') || ''
      let data: any

      // Intentar parsear como JSON si el content-type lo indica o si parece JSON
      const looksLikeJson = cleanedText.startsWith('{') || cleanedText.startsWith('[')

      if (contentType.includes('application/json') || looksLikeJson) {
        try {
          // Si el texto está vacío, no intentar parsear
          if (!cleanedText || cleanedText === '') {
            if (response.ok) {
              // Respuesta exitosa sin contenido
              await fetchWorkoutLogs()
              await fetchWorkoutStatistics()
              return {}
            } else {
              throw new Error('Error del servidor: respuesta vacía')
            }
          }

          // Intentar parsear el JSON
          data = JSON.parse(cleanedText)
        } catch (jsonError) {
          // Si falla el parseo JSON, loguear el error completo

          // Si la respuesta es exitosa pero no es JSON válido, intentar continuar
          if (response.ok) {
            await fetchWorkoutLogs()
            await fetchWorkoutStatistics()
            return {}
          }
          
          // Si no es exitosa, lanzar un error con el texto de la respuesta
          const errorMsg = cleanedText || 'Error desconocido del servidor'
          throw new Error(`Error del servidor: ${errorMsg.substring(0, 200)}`)
        }
      } else {
        // Si no es JSON, usar el texto directamente
          contentType,
          status: response.status,
          text: cleanedText.substring(0, 200)
        })

        if (response.ok) {
          // Respuesta exitosa pero no JSON
          await fetchWorkoutLogs()
          await fetchWorkoutStatistics()
          return {}
        } else {
          throw new Error(cleanedText || 'Error del servidor')
        }
      }

      if (response.ok) {
        // Recargar logs y estadísticas
        await fetchWorkoutLogs()
        await fetchWorkoutStatistics()
        return data
      } else {
        // Manejar errores de validación de DRF
        let errorMessage = 'Error al crear log de entrenamiento'

        if (data) {
          if (typeof data === 'string') {
            errorMessage = data
          } else if (typeof data === 'object' && data !== null) {
            // Si es un objeto, extraer el mensaje de error de forma segura
            if (data.detail) {
              const detail = data.detail
              if (typeof detail === 'string' && detail !== '[object Object]') {
                errorMessage = detail
              } else if (typeof detail === 'object') {
                try {
                  errorMessage = JSON.stringify(detail)
                } catch (e) {
                  errorMessage = 'Error al crear log de entrenamiento'
                }
              } else {
                const detailStr = String(detail)
                errorMessage = detailStr !== '[object Object]' ? detailStr : 'Error al crear log de entrenamiento'
              }
            } else if (data.message) {
              const msg = data.message
              if (typeof msg === 'string' && msg !== '[object Object]') {
                errorMessage = msg
              } else if (typeof msg === 'object') {
                try {
                  errorMessage = JSON.stringify(msg)
                } catch (e) {
                  errorMessage = 'Error al crear log de entrenamiento'
                }
              } else {
                const msgStr = String(msg)
                errorMessage = msgStr !== '[object Object]' ? msgStr : 'Error al crear log de entrenamiento'
              }
            } else if (data.error) {
              const err = data.error
              if (typeof err === 'string' && err !== '[object Object]') {
                errorMessage = err
              } else if (typeof err === 'object') {
                try {
                  errorMessage = JSON.stringify(err)
                } catch (e) {
                  errorMessage = 'Error al crear log de entrenamiento'
                }
              } else {
                const errStr = String(err)
                errorMessage = errStr !== '[object Object]' ? errStr : 'Error al crear log de entrenamiento'
              }
            } else if (Array.isArray(data) && data.length > 0) {
              // Si es un array de errores, tomar el primero
              const firstError = data[0]
              if (typeof firstError === 'string') {
                errorMessage = firstError
              } else {
                try {
                  errorMessage = JSON.stringify(firstError)
                } catch (e) {
                  errorMessage = 'Error al crear log de entrenamiento'
                }
              }
            } else {
              // Como último recurso, convertir a string
              try {
                const jsonStr = JSON.stringify(data)
                if (jsonStr !== '{}' && jsonStr !== 'null' && !jsonStr.includes('[object Object]')) {
                  errorMessage = jsonStr
                }
              } catch (e) {
                errorMessage = 'Error desconocido al crear log de entrenamiento'
              }
            }
          }
        }

        // Asegurarse de que el mensaje no sea [object Object]
        if (errorMessage === '[object Object]' || errorMessage.includes('[object Object]')) {
          errorMessage = 'Error desconocido al crear log de entrenamiento'
        }

        throw new Error(errorMessage)
      }
    } catch (err) {
      
      // Extraer el mensaje de error de forma segura
      let errorMessage = 'Error desconocido al crear log de entrenamiento'
      
      if (err instanceof Error) {
        // Si el mensaje está vacío o es [object Object], crear uno nuevo
        if (!err.message || err.message === '[object Object]' || err.message.includes('[object Object]')) {
          errorMessage = 'Error desconocido al crear log de entrenamiento'
          throw new Error(errorMessage)
        }
        // Si el mensaje es válido, lanzar el error original
        throw err
      } else if (typeof err === 'string') {
        errorMessage = err
      } else if (err && typeof err === 'object') {
        // Intentar extraer mensaje del objeto
        if ('message' in err) {
          const msg = err.message
          if (typeof msg === 'string' && msg !== '[object Object]') {
            errorMessage = msg
          } else if (typeof msg === 'object') {
            try {
              errorMessage = JSON.stringify(msg)
            } catch (e) {
              errorMessage = 'Error desconocido al crear log de entrenamiento'
            }
          }
        } else if ('detail' in err) {
          const detail = err.detail
          if (typeof detail === 'string' && detail !== '[object Object]') {
            errorMessage = detail
          } else if (typeof detail === 'object') {
            try {
              errorMessage = JSON.stringify(detail)
            } catch (e) {
              errorMessage = 'Error desconocido al crear log de entrenamiento'
            }
          }
        } else {
          try {
            const jsonStr = JSON.stringify(err)
            if (jsonStr !== '{}' && jsonStr !== 'null') {
              errorMessage = jsonStr
            }
          } catch (e) {
            errorMessage = 'Error desconocido al crear log de entrenamiento'
          }
        }
      } else {
        const strErr = String(err)
        if (strErr !== '[object Object]') {
          errorMessage = strErr
        }
      }
      
      throw new Error(errorMessage)
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
    if (!activeProgram || !activeProgram.days) return null

    const today = new Date().getDay() // 0 = Domingo, 1 = Lunes, etc.
    const dayNumber = today === 0 ? 7 : today // Convertir domingo a día 7

    return activeProgram.days.find(day => day.day_number === dayNumber) || null
  }

  // Obtener progreso semanal (usando datos del servidor)
  const [workoutStatistics, setWorkoutStatistics] = useState<any>(null)

  const fetchWorkoutStatistics = async () => {
    if (!isAuthenticated) {
      return null
    }

    try {
      const response = await authenticatedFetch('workout-logs/statistics/')
      const data = await response.json()

      if (response.ok) {
        setWorkoutStatistics(data)
        return data
      } else {
        throw new Error(data.detail || 'Error al obtener estadísticas')
      }
    } catch (err) {
      return null
    }
  }

  // Cargar estadísticas cuando se cargan los datos
  useEffect(() => {
    if (isAuthenticated && workoutLogs.length >= 0) {
      fetchWorkoutStatistics()
    }
  }, [isAuthenticated, workoutLogs.length])

  // Obtener progreso semanal (compatibilidad con código existente)
  const getWeeklyProgress = () => {
    if (workoutStatistics) {
      return {
        totalWorkouts: workoutStatistics.completed_this_week,
        completedWorkouts: workoutStatistics.completed_this_week,
        totalMinutes: workoutStatistics.total_minutes_week
      }
    }

    // Fallback al cálculo local si no hay estadísticas del servidor
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
    workoutStatistics,
    loading,
    error,

    // Acciones
    fetchWorkoutPrograms,
    fetchActiveProgram,
    fetchTemplates,
    fetchExercises,
    fetchWorkoutLogs,
    fetchWorkoutStatistics,
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