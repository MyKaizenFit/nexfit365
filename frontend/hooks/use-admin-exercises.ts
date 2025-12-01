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
  image_url?: string
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
  image_url?: string
}

export const useAdminExercises = () => {
  const { getAuthHeaders } = useAuth()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [stats, setStats] = useState<ExerciseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExercises = async () => {
    try {
      setLoading(true)
      setError(null)

      let headers = await getAuthHeaders()
      let response = await fetch(buildApiUrl(`admin/exercises/exercises/?page_size=1000`), {
        headers
      })

      // Si recibimos 401, intentar refrescar el token
      if (response.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) return // Ya redirigió al login
        headers = newHeaders
        response = await fetch(buildApiUrl(`admin/exercises/exercises/?page_size=1000`), {
          headers
        })
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        console.error('❌ Error en respuesta:', response.status, errorText)
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const exercisesData = data.results || data

      if (Array.isArray(exercisesData)) {
        setExercises(exercisesData)
        console.log(`✅ Total ejercicios cargados: ${exercisesData.length}`)
      } else {
        console.error('Expected array but got:', typeof exercisesData)
        setExercises([])
      }
    } catch (err) {
      console.error('Error fetching exercises:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      setExercises([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      let headers = await getAuthHeaders()
      let response = await fetch(buildApiUrl(`admin/exercises/exercises/stats/`), {
        headers
      })

      // Si recibimos 401, intentar refrescar el token
      if (response.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) return // Ya redirigió al login
        headers = newHeaders
        response = await fetch(buildApiUrl(`admin/exercises/exercises/stats/`), {
          headers
        })
      }

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error('Error fetching exercise stats:', err)
      // Datos de fallback
      setStats({
        total_exercises: exercises.length,
        exercises_by_category: {},
        exercises_by_muscle_group: {},
        recent_exercises: 0
      })
    }
  }

  const createExercise = async (exerciseData: CreateExerciseData): Promise<Exercise> => {
    try {
      let headers = await getAuthHeaders()
      const requestBody = JSON.stringify(exerciseData)
      let response = await fetch(buildApiUrl(`admin/exercises/exercises/`), {
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
        response = await fetch(buildApiUrl(`admin/exercises/exercises/`), {
          method: 'POST',
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

      const newExercise = await response.json()
      setExercises(prev => [...prev, newExercise])
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
      let response = await fetch(buildApiUrl(`admin/exercises/exercises/${exerciseId}/`), {
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
        response = await fetch(buildApiUrl(`admin/exercises/exercises/${exerciseId}/`), {
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
      setExercises(prev => prev.map(exercise =>
        exercise.id === exerciseId ? updatedExercise : exercise
      ))
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
      let response = await fetch(buildApiUrl(`admin/exercises/exercises/${exerciseId}/`), {
        method: 'DELETE',
        headers
      })

      // Si recibimos 401, intentar refrescar el token
      if (response.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) throw new Error('Sesión expirada')
        headers = newHeaders
        response = await fetch(buildApiUrl(`admin/exercises/exercises/${exerciseId}/`), {
          method: 'DELETE',
          headers
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `Error ${response.status}`)
      }

      setExercises(prev => prev.filter(exercise => exercise.id !== exerciseId))
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

      setExercises(prev => prev.filter(exercise => {
        const exerciseIdNum = typeof exercise.id === 'string' ? parseInt(exercise.id, 10) : exercise.id
        return !exerciseIds.includes(exerciseIdNum)
      }))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  useEffect(() => {
    fetchExercises()
    fetchStats()
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
      let response = await fetch(buildApiUrl('admin/exercises/exercises/bulk_create/'), {
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
        response = await fetch(buildApiUrl('admin/exercises/exercises/bulk_create/'), {
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
      await fetchStats()

      return result
    } catch (err) {
      console.error('Error bulk creating exercises:', err)
      throw err
    }
  }

  return {
    exercises,
    stats,
    loading,
    error,
    fetchExercises,
    fetchStats,
    createExercise,
    updateExercise,
    deleteExercise,
    bulkDeleteExercises,
    bulkCreateExercises,
    uploadExerciseVideo,
    uploadExerciseThumbnail,
    refetch: () => { fetchExercises(); fetchStats() }
  }
}

