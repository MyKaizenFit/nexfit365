'use client'

import { buildApiUrl } from '@/lib/api'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { handle401AndRefresh } from '@/lib/fetch-with-auth'

export interface Exercise {
  id: number | string
  name: string
  description?: string
  category: string
  muscle_groups: string[]
  equipment?: string[]
  difficulty?: string
  instructions: string
  video_url?: string
  video_file?: string
  video_file_url?: string
  video_display_url?: string
  thumbnail?: string
  thumbnail_url?: string
  has_video?: boolean
  google_drive_file_id?: string
  is_system?: boolean
  is_active?: boolean
  tags?: string[]
  created_at?: string
  updated_at?: string
}

export interface ExerciseStats {
  total_exercises: number
  exercises_by_category: Record<string, number>
  exercises_by_muscle_group: Record<string, number>
  recent_exercises: number
}

export interface CreateExerciseData {
  name: string
  description?: string
  category: string
  muscle_groups: string[]
  equipment?: string[]
  difficulty?: string
  instructions: string
  video_url?: string
  tags?: string[]
}

export interface CategoryOption {
  value: string
  label: string
}

export const useAdminExercises = () => {
  const { getAuthHeaders } = useAuth()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [stats, setStats] = useState<ExerciseStats | null>(null)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Función para actualizar stats desde un array de ejercicios
  const updateStatsFromExercises = (exercisesList: Exercise[]) => {
    const categoryStats: Record<string, number> = {}
    const muscleGroupStats: Record<string, number> = {}
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    let recentCount = 0

    exercisesList.forEach(exercise => {
      // Estadísticas por categoría
      const category = exercise.category || 'Sin categoría'
      categoryStats[category] = (categoryStats[category] || 0) + 1

      // Estadísticas por grupo muscular
      if (exercise.muscle_groups && Array.isArray(exercise.muscle_groups)) {
        exercise.muscle_groups.forEach(mg => {
          muscleGroupStats[mg] = (muscleGroupStats[mg] || 0) + 1
        })
      }

      // Ejercicios recientes
      if (exercise.created_at) {
        const createdDate = new Date(exercise.created_at)
        if (createdDate >= thirtyDaysAgo) {
          recentCount++
        }
      }
    })

    setStats({
      total_exercises: exercisesList.length,
      exercises_by_category: categoryStats,
      exercises_by_muscle_group: muscleGroupStats,
      recent_exercises: recentCount
    })
  }

  const fetchExercises = async () => {
    let allExercises: Exercise[] = []
    try {
      setLoading(true)
      setError(null)

      let headers = await getAuthHeaders()
      let page = 1
      const pageSize = 10000 // Usar el máximo permitido por el backend
      let hasMore = true
      const maxPages = 50


      // Cargar todas las páginas automáticamente
      while (hasMore && page <= maxPages) {
        let response = await fetch(
          buildApiUrl(`admin/exercises/?page=${page}&page_size=${pageSize}`),
          { headers }
        )

        // Si recibimos 401, intentar refrescar el token
        if (response.status === 401) {
          const newHeaders = await handle401AndRefresh(getAuthHeaders)
          if (!newHeaders) return // Ya redirigió al login
          headers = newHeaders
          response = await fetch(
            buildApiUrl(`admin/exercises/?page=${page}&page_size=${pageSize}`),
            { headers }
          )
        }

        if (!response.ok) {
          const errorText = await response.text().catch(() => '')
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        // Manejar respuesta paginada o array directo
        const exercisesData = Array.isArray(data.results)
          ? data.results
          : (Array.isArray(data) ? data : [])

        if (exercisesData.length > 0) {
          allExercises = [...allExercises, ...exercisesData]

          // Verificar si hay más páginas
          // Si la respuesta tiene 'next' y no es null/undefined, hay más páginas
          // También verificar 'count' para saber el total esperado
          const totalCount = data.count || allExercises.length
          const hasNext = data.next !== null && data.next !== undefined && data.next !== ''


          // Si ya cargamos todos o no hay más páginas, terminar
          if (!hasNext || allExercises.length >= totalCount) {
            hasMore = false
          } else {
            hasMore = true
            page++
          }
        } else {
          // No hay más datos
          hasMore = false
        }
      }

      setExercises(allExercises)
      // Actualizar stats con el conteo real de ejercicios cargados
      updateStatsFromExercises(allExercises)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      if (allExercises.length > 0) {
        setExercises(allExercises)
        updateStatsFromExercises(allExercises)
      } else {
        setExercises([])
        setStats({
          total_exercises: 0,
          exercises_by_category: {},
          exercises_by_muscle_group: {},
          recent_exercises: 0
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      let headers = await getAuthHeaders()
      let response = await fetch(buildApiUrl(`exercises/categories/`), {
        headers
      })

      // Si recibimos 401, intentar refrescar el token
      if (response.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) return // Ya redirigió al login
        headers = newHeaders
        response = await fetch(buildApiUrl(`exercises/categories/`), {
          headers
        })
      }

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setCategories(data)
    } catch (err) {
      // Fallback a categorías por defecto si falla
      setCategories([
        { value: 'strength', label: 'Fuerza' },
        { value: 'cardio', label: 'Cardio' },
        { value: 'flexibility', label: 'Flexibilidad' },
        { value: 'hiit', label: 'HIIT' },
        { value: 'bodyweight', label: 'Peso corporal' },
        { value: 'functional', label: 'Funcional' },
        { value: 'plyometrics', label: 'Pliometría' },
        { value: 'balance', label: 'Equilibrio' },
      ])
    }
  }

  const fetchStats = async (useExercisesCount = false, exercisesList?: Exercise[]) => {
    try {
      // Si se solicita usar el conteo de ejercicios cargados, calcular stats localmente
      if (useExercisesCount) {
        const exercisesToUse = exercisesList || exercises
        if (exercisesToUse.length > 0) {
          updateStatsFromExercises(exercisesToUse)
          return
        }
      }

      // Obtener stats del backend
      let headers = await getAuthHeaders()
      let response = await fetch(buildApiUrl(`admin/exercises/stats/`), {
        headers
      })

      // Si recibimos 401, intentar refrescar el token
      if (response.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) return // Ya redirigió al login
        headers = newHeaders
        response = await fetch(buildApiUrl(`admin/exercises/stats/`), {
          headers
        })
      }

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setStats(data)
    } catch (err) {
      // Si tenemos ejercicios cargados, usar ese conteo como fallback
      const exercisesToUse = exercisesList || exercises
      if (exercisesToUse.length > 0) {
        updateStatsFromExercises(exercisesToUse)
      } else {
        // Si no hay ejercicios cargados, usar valores por defecto
        setStats({
          total_exercises: 0,
          exercises_by_category: {},
          exercises_by_muscle_group: {},
          recent_exercises: 0
        })
      }
    }
  }

  const createExercise = async (exerciseData: CreateExerciseData): Promise<Exercise> => {
    try {
      let headers = await getAuthHeaders()
      const requestBody = JSON.stringify(exerciseData)
      let response = await fetch(buildApiUrl(`admin/exercises/`), {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: requestBody
      })

      // Si recibimos 401, intentar refrescar el token
      if (response.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) throw new Error('Sesión expirada')
        headers = newHeaders
        response = await fetch(buildApiUrl(`admin/exercises/`), {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: requestBody
        })
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        // Manejar errores de validación de Django REST Framework
        let errorMessage = errorData.detail || `Error ${response.status}`

        // Si hay errores de campo específicos, formatearlos
        if (errorData.category) {
          const categoryError = Array.isArray(errorData.category) ? errorData.category[0] : errorData.category
          errorMessage = `Categoría: ${categoryError}`
        } else if (errorData.name) {
          const nameError = Array.isArray(errorData.name) ? errorData.name[0] : errorData.name
          errorMessage = `Nombre: ${nameError}`
        } else if (typeof errorData === 'object' && Object.keys(errorData).length > 0) {
          // Si hay múltiples errores, formatearlos
          const errorMessages = Object.entries(errorData).map(([field, errors]) => {
            const errorList = Array.isArray(errors) ? errors : [errors]
            return `${field}: ${errorList.join(', ')}`
          })
          errorMessage = errorMessages.join('; ')
        }

        throw new Error(errorMessage)
      }

      const newExercise = await response.json()
      setExercises(prev => {
        const updated = [...prev, newExercise]
        // Actualizar stats inmediatamente con el nuevo conteo
        updateStatsFromExercises(updated)
        return updated
      })
      return newExercise
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const updateExercise = async (exerciseId: number, exerciseData: Partial<CreateExerciseData>): Promise<Exercise> => {
    try {
      let headers = await getAuthHeaders()
      const requestBody = JSON.stringify(exerciseData)
      let response = await fetch(buildApiUrl(`admin/exercises/${exerciseId}/`), {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: requestBody
      })

      // Si recibimos 401, intentar refrescar el token
      if (response.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) throw new Error('Sesión expirada')
        headers = newHeaders
        response = await fetch(buildApiUrl(`admin/exercises/${exerciseId}/`), {
          method: 'PUT',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: requestBody
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `Error ${response.status}`)
      }

      const updatedExercise = await response.json()
      setExercises(prev => {
        const updated = prev.map(exercise =>
          exercise.id === exerciseId ? updatedExercise : exercise
        )
        // Actualizar stats si es necesario (aunque el conteo no cambia, puede cambiar la categoría)
        updateStatsFromExercises(updated)
        return updated
      })
      return updatedExercise
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const deleteExercise = async (exerciseId: number): Promise<void> => {
    try {
      let headers = await getAuthHeaders()
      let response = await fetch(buildApiUrl(`admin/exercises/${exerciseId}/`), {
        method: 'DELETE',
        headers
      })

      // Si recibimos 401, intentar refrescar el token
      if (response.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) throw new Error('Sesión expirada')
        headers = newHeaders
        response = await fetch(buildApiUrl(`admin/exercises/${exerciseId}/`), {
          method: 'DELETE',
          headers
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `Error ${response.status}`)
      }

      setExercises(prev => {
        const updated = prev.filter(exercise => exercise.id !== exerciseId)
        // Actualizar stats inmediatamente con el nuevo conteo
        updateStatsFromExercises(updated)
        return updated
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const bulkDeleteExercises = async (exerciseIds: number[]): Promise<void> => {
    try {
      let headers = await getAuthHeaders()
      const requestBody = JSON.stringify({ exercise_ids: exerciseIds })
      let response = await fetch(buildApiUrl(`admin/exercises/bulk_delete/`), {
        method: 'DELETE',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: requestBody
      })

      // Si recibimos 401, intentar refrescar el token
      if (response.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) throw new Error('Sesión expirada')
        headers = newHeaders
        response = await fetch(buildApiUrl(`admin/exercises/bulk_delete/`), {
          method: 'DELETE',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: requestBody
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `Error ${response.status}`)
      }

      setExercises(prev => {
        const updated = prev.filter(exercise => {
          const exerciseIdNum = typeof exercise.id === 'string' ? parseInt(exercise.id, 10) : exercise.id
          return !exerciseIds.includes(exerciseIdNum)
        })
        // Actualizar stats inmediatamente con el nuevo conteo
        updateStatsFromExercises(updated)
        return updated
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  useEffect(() => {
    // Cargar ejercicios primero (que ya actualiza stats), luego categorías
    // fetchStats ya no es necesario aquí porque fetchExercises actualiza las stats
    const loadData = async () => {
      await fetchExercises()
      await fetchCategories()
      // También obtener stats del backend para tener datos completos (categorías, grupos musculares, etc.)
      // Pero el total_exercises ya está actualizado por fetchExercises
      await fetchStats()
    }
    loadData()
  }, [])

  const uploadExerciseVideo = async (exerciseId: number | string, videoFile: File): Promise<Exercise> => {
    try {
      let headers = await getAuthHeaders()
      const formData = new FormData()
      formData.append('video_file', videoFile)

      let response = await fetch(buildApiUrl(`exercises/${exerciseId}/upload-video/`), {
        method: 'POST',
        headers: {
          ...headers,
          // No incluir Content-Type, el navegador lo establecerá automáticamente con el boundary
        },
        body: formData
      })

      if (response.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) throw new Error('Sesión expirada')
        headers = newHeaders
        response = await fetch(buildApiUrl(`exercises/${exerciseId}/upload-video/`), {
          method: 'POST',
          headers: {
            ...headers,
          },
          body: formData
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `Error ${response.status}`)
      }

      const updatedExercise = await response.json()
      setExercises(prev => prev.map(exercise =>
        String(exercise.id) === String(exerciseId) ? updatedExercise : exercise
      ))
      return updatedExercise
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const uploadExerciseThumbnail = async (exerciseId: number | string, thumbnailFile: File): Promise<Exercise> => {
    try {
      let headers = await getAuthHeaders()
      const formData = new FormData()
      formData.append('thumbnail', thumbnailFile)

      let response = await fetch(buildApiUrl(`exercises/${exerciseId}/upload-thumbnail/`), {
        method: 'POST',
        headers: {
          ...headers,
        },
        body: formData
      })

      if (response.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) throw new Error('Sesión expirada')
        headers = newHeaders
        response = await fetch(buildApiUrl(`exercises/${exerciseId}/upload-thumbnail/`), {
          method: 'POST',
          headers: {
            ...headers,
          },
          body: formData
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `Error ${response.status}`)
      }

      const updatedExercise = await response.json()
      setExercises(prev => prev.map(exercise =>
        String(exercise.id) === String(exerciseId) ? updatedExercise : exercise
      ))
      return updatedExercise
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const bulkCreateExercises = async (exercises: CreateExerciseData[]): Promise<{ success: boolean; created: number; updated: number; errors: any[] }> => {
    try {
      let headers = await getAuthHeaders()
      let response = await fetch(buildApiUrl('admin/exercises/bulk_create/'), {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ exercises })
      })

      // Si recibimos 401, intentar refrescar el token
      if (response.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) throw new Error('Sesión expirada')
        headers = newHeaders
        response = await fetch(buildApiUrl('admin/exercises/bulk_create/'), {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ exercises })
        })
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      // Refrescar la lista y estadísticas
      await fetchExercises()
      // Esperar un momento para asegurar que exercises se haya actualizado
      await new Promise(resolve => setTimeout(resolve, 100))
      await fetchStats()

      return result
    } catch (err) {
      throw err
    }
  }

  // === Gestión de Sustitutos ===
  const getExerciseSubstitutes = async (exerciseId: number | string): Promise<any[]> => {
    try {
      let headers = await getAuthHeaders()
      let response = await fetch(buildApiUrl(`admin/exercises/${exerciseId}/substitutes/`), {
        headers
      })
      if (response.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) throw new Error('Sesión expirada')
        headers = newHeaders
        response = await fetch(buildApiUrl(`admin/exercises/${exerciseId}/substitutes/`), { headers })
      }
      if (!response.ok) throw new Error('Error al obtener sustitutos')
      return await response.json()
    } catch (err) {
      console.error('Error fetching substitutes:', err)
      return []
    }
  }

  const addExerciseSubstitute = async (exerciseId: number | string, substituteId: number | string, priority = 1, notes = ''): Promise<any> => {
    let headers = await getAuthHeaders()
    let response = await fetch(buildApiUrl(`admin/exercises/${exerciseId}/add_substitute/`), {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ substitute_id: substituteId, priority, notes })
    })
    if (response.status === 401) {
      const newHeaders = await handle401AndRefresh(getAuthHeaders)
      if (!newHeaders) throw new Error('Sesión expirada')
      headers = newHeaders
      response = await fetch(buildApiUrl(`admin/exercises/${exerciseId}/add_substitute/`), {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ substitute_id: substituteId, priority, notes })
      })
    }
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error || 'Error al añadir sustituto')
    }
    return await response.json()
  }

  const removeExerciseSubstitute = async (exerciseId: number | string, substituteId: number | string): Promise<boolean> => {
    let headers = await getAuthHeaders()
    let response = await fetch(buildApiUrl(`admin/exercises/${exerciseId}/remove_substitute/`), {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ substitute_id: substituteId })
    })
    if (response.status === 401) {
      const newHeaders = await handle401AndRefresh(getAuthHeaders)
      if (!newHeaders) throw new Error('Sesión expirada')
      headers = newHeaders
      response = await fetch(buildApiUrl(`admin/exercises/${exerciseId}/remove_substitute/`), {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ substitute_id: substituteId })
      })
    }
    if (!response.ok) throw new Error('Error al eliminar sustituto')
    const data = await response.json()
    return data.removed
  }

  return {
    exercises,
    stats,
    categories,
    loading,
    error,
    fetchExercises,
    fetchStats,
    fetchCategories,
    createExercise,
    updateExercise,
    deleteExercise,
    bulkDeleteExercises,
    bulkCreateExercises,
    uploadExerciseVideo,
    uploadExerciseThumbnail,
    getExerciseSubstitutes,
    addExerciseSubstitute,
    removeExerciseSubstitute,
    refetch: () => { fetchExercises(); fetchStats(); fetchCategories() }
  }
}

