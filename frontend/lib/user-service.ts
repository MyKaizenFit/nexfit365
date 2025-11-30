// lib/user-service.ts
// Servicio para obtener datos reales del usuario desde el backend

import { buildApiUrl, getAuthHeaders, handleApiResponse, handleFetchError, AUTH_ENDPOINTS } from './api'
import { authService } from './auth-service'
import { requestThrottler } from './request-throttle'
import { apiCache, generateCacheKey } from './api-cache'

// Importar tipos desde el archivo centralizado
import type { User, UserProfile, UserStats } from '@/types/user'
export type { UserProfile, UserStats } from '@/types/user'

export interface ProgressPhoto {
  id: string  // El backend usa UUID
  date: string
  photo_url: string  // El backend devuelve 'photo_url'
  thumbnail_url?: string  // El backend también devuelve 'thumbnail_url'
  weight?: number
  notes?: string
  photo_type: 'front' | 'side' | 'back' | 'other'  // El backend usa 'other' en lugar de 'detail'
  measurements?: any
  created_at: string
}

export interface WeightEntry {
  id: number
  date: string
  weight: number
  notes?: string
}

export interface MeasurementEntry {
  id: number
  date: string
  chest?: number
  waist?: number
  hips?: number
  arms?: number
  thighs?: number
  notes?: string
}

export interface NutritionPlan {
  id: number
  name: string
  daily_calories: number
  protein_goal: number
  carbs_goal: number
  fat_goal: number
  meals: Meal[]
}

export interface Meal {
  id: number
  name: string
  time: string
  calories: number
  protein: number
  carbs: number
  fat: number
  description?: string
  foods?: string[]
}

export interface WorkoutProgram {
  id: number
  name: string
  description: string
  level: string
  goal: string
  days_per_week: number
  weekly_schedule: WorkoutDay[]
}

export interface WorkoutDay {
  id: number
  day: string
  name: string
  duration: number
  is_rest_day: boolean
  exercises: Exercise[]
}

export interface Exercise {
  id: number
  name: string
  sets: number
  reps: string
  weight?: string
  rest: number
  notes?: string
}

// Clase principal del servicio de usuario
export class UserService {
  private static instance: UserService

  private constructor() {}

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService()
    }
    return UserService.instance
  }

  // Obtener perfil del usuario
  async getUserProfile(): Promise<UserProfile> {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Usuario no autenticado')
      }

      const token = authService.getAccessToken()
      if (!token) {
        throw new Error('No hay token de acceso disponible')
      }

      const response = await fetch(buildApiUrl('/me/'), {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
          'Authorization': `Bearer ${token}`,
        },
      })

      const result = await handleApiResponse<UserProfile>(response)
      
      if (result.error) {
        throw new Error(result.error)
      }

      if (!result.data) {
        throw new Error('No se recibieron datos del perfil')
      }

      return result.data
    } catch (error) {
      throw handleFetchError(error)
    }
  }

  // Obtener estadísticas del usuario
  async getUserStats(): Promise<UserStats> {
    const cacheKey = generateCacheKey('/user-stats/')
    
    // Intentar obtener del caché primero
    const cached = apiCache.get<UserStats>(cacheKey)
    if (cached) {
      return cached
    }

    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Usuario no autenticado')
      }

      const token = authService.getAccessToken()
      if (!token) {
        throw new Error('No hay token de acceso disponible')
      }

      const result = await requestThrottler.throttle('user-stats', async () => {
        const response = await fetch(buildApiUrl('/user-stats/'), {
          method: 'GET',
          headers: {
            ...getAuthHeaders(),
            'Authorization': `Bearer ${token}`,
          },
        })

        const apiResult = await handleApiResponse<UserStats>(response)
        
        if (apiResult.error) {
          throw new Error(apiResult.error)
        }

        if (!apiResult.data) {
          throw new Error('No se recibieron estadísticas')
        }

        return apiResult.data
      })

      // Almacenar en caché por 2 minutos
      apiCache.set(cacheKey, result, 2 * 60 * 1000)
      
      return result
    } catch (error) {
      throw handleFetchError(error)
    }
  }

  // Obtener fotos de progreso
  async getProgressPhotos(): Promise<ProgressPhoto[]> {
    try {
      if (!authService.isAuthenticated()) {
        console.warn('Usuario no autenticado al obtener fotos de progreso')
        return []
      }

      const token = authService.getAccessToken()
      if (!token) {
        console.warn('No hay token de acceso disponible para obtener fotos de progreso')
        return []
      }

      const response = await fetch(buildApiUrl('progress-photos/'), {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
          'Authorization': `Bearer ${token}`,
        },
      })

      const result = await handleApiResponse<{
        count: number
        next: string | null
        previous: string | null
        results: ProgressPhoto[]
      }>(response)
      
      if (result.error) {
        console.warn('Error del backend al obtener fotos:', result.error)
        return []
      }

      // Manejar respuesta paginada de Django REST Framework
      if (result.data && 'results' in result.data) {
        console.log(`📸 Fotos obtenidas del backend: ${result.data.results.length} de ${result.data.count} total`)
        return result.data.results
      }

      // Fallback para respuesta no paginada
      if (Array.isArray(result.data)) {
        console.log(`📸 Fotos obtenidas (formato directo): ${result.data.length}`)
        return result.data
      }

      console.warn('📸 Formato de respuesta inesperado:', result.data)
      return []
    } catch (error) {
      console.warn('Error al obtener fotos de progreso:', error)
      return []
    }
  }

  // Subir foto de progreso
  async uploadProgressPhoto(
    file: File,
    weight?: number,
    notes?: string,
    photoType: 'front' | 'back' | 'side' | 'other' = 'front'
  ): Promise<ProgressPhoto> {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Usuario no autenticado')
      }

      const token = authService.getAccessToken()
      if (!token) {
        throw new Error('No hay token de acceso disponible')
      }

      console.log('🔐 Token de acceso:', token.substring(0, 20) + '...')
      console.log('🔐 Usuario autenticado:', authService.getCurrentUser()?.email)

      const url = buildApiUrl('progress-photos/')
      console.log('🌐 Subiendo foto a:', url)

      // Crear FormData
      const formData = new FormData()
      formData.append('photo', file)
      formData.append('photo_type', photoType)
      formData.append('date', new Date().toISOString().split('T')[0])
      
      // Asegurar que el peso se envíe como número
      if (weight !== undefined && weight !== null) {
        formData.append('weight', weight.toString())
      }
      
      // Asegurar que las notas se envíen como string
      if (notes && notes.trim()) {
        formData.append('notes', notes.trim())
      }

      // Log del FormData
      console.log('📤 FormData preparado:')
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`)
        } else {
          console.log(`  ${key}: ${value}`)
        }
      }

      // Preparar headers
      const headers = {
        'Authorization': `Bearer ${token}`,
      }

      console.log('🔐 Headers de autenticación:', headers)

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      })

      console.log('📥 Respuesta del servidor:', response.status, response.statusText)

      if (!response.ok) {
        console.error('❌ Error HTTP:', response.status, response.statusText)
        
        // Log detallado del error
        try {
          const errorData = await response.json()
          console.error('❌ Detalles del error:', errorData)
        } catch (parseError) {
          console.error('❌ No se pudo parsear el error:', parseError)
        }

        // Log de headers de respuesta
        console.log('🔍 Headers de la respuesta:')
        for (let [key, value] of response.headers.entries()) {
          console.log(`  ${key}: ${value}`)
        }

        // Log de la petición
        console.log('🔍 URL de la petición:', url)
        console.log('🔍 Método:', 'POST')
        console.log('🔍 FormData enviado:')
        for (let [key, value] of formData.entries()) {
          if (value instanceof File) {
            console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`)
          } else {
            console.log(`  ${key}: ${value}`)
          }
        }

        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const result = await handleApiResponse<ProgressPhoto>(response)
      
      if (result.error) {
        throw new Error(result.error)
      }

      if (!result.data) {
        throw new Error('No se recibieron datos de la foto subida')
      }

      console.log('✅ Foto subida exitosamente:', result.data)
      return result.data

    } catch (error) {
      console.error('❌ Error en uploadProgressPhoto:', error)
      throw error
    }
  }

  // Obtener historial de peso
  async getWeightHistory(): Promise<WeightEntry[]> {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Usuario no autenticado')
      }

      const token = authService.getAccessToken()
      if (!token) {
        throw new Error('No hay token de acceso disponible')
      }

      const response = await fetch(buildApiUrl('weight-history/'), {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
          'Authorization': `Bearer ${token}`,
        },
      })

      const result = await handleApiResponse<{
        count: number
        next: string | null
        previous: string | null
        results: WeightEntry[]
      } | WeightEntry[]>(response)
      
      if (result.error) {
        throw new Error(result.error)
      }

      // Manejar respuesta paginada de Django REST Framework
      if (result.data && typeof result.data === 'object' && 'results' in result.data) {
        const paginatedData = result.data as { results: WeightEntry[] }
        return paginatedData.results || []
      }

      // Fallback para respuesta no paginada
      if (Array.isArray(result.data)) {
        return result.data
      }

      return []
    } catch (error) {
      console.warn('Error al obtener historial de peso:', error)
      return []
    }
  }

  // Registrar nuevo peso
  async addWeightEntry(weight: number, notes?: string): Promise<WeightEntry> {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Usuario no autenticado')
      }

      const token = authService.getAccessToken()
      if (!token) {
        throw new Error('No hay token de acceso disponible')
      }

      const response = await fetch(buildApiUrl('weight-history/'), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          weight,
          notes,
          date: new Date().toISOString().split('T')[0],
        }),
      })

      const result = await handleApiResponse<WeightEntry>(response)
      
      if (result.error) {
        throw new Error(result.error)
      }

      if (!result.data) {
        throw new Error('No se recibió confirmación del registro')
      }

      return result.data
    } catch (error) {
      throw handleFetchError(error)
    }
  }

  // Obtener plan nutricional actual
  async getCurrentNutritionPlan(): Promise<NutritionPlan | null> {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Usuario no autenticado')
      }

      const token = authService.getAccessToken()
      if (!token) {
        throw new Error('No hay token de acceso disponible')
      }

      const response = await fetch(buildApiUrl('/nutrition-plans/current/'), {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
          'Authorization': `Bearer ${token}`,
        },
      })

      const result = await handleApiResponse<NutritionPlan>(response)
      
      if (result.error) {
        throw new Error(result.error)
      }

      return result.data || null
    } catch (error) {
      console.warn('Error al obtener plan nutricional:', error)
      return null
    }
  }

  // Obtener programa de entrenamiento actual
  async getCurrentWorkoutProgram(): Promise<WorkoutProgram | null> {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Usuario no autenticado')
      }

      const token = authService.getAccessToken()
      if (!token) {
        throw new Error('No hay token de acceso disponible')
      }

      const response = await fetch(buildApiUrl('/workout-programs/current/'), {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
          'Authorization': `Bearer ${token}`,
        },
      })

      const result = await handleApiResponse<WorkoutProgram>(response)
      
      if (result.error) {
        throw new Error(result.error)
      }

      return result.data || null
    } catch (error) {
      console.warn('Error al obtener programa de entrenamiento:', error)
      return null
    }
  }

  // Actualizar perfil del usuario
  async updateUserProfile(updates: Partial<UserProfile> & { profile_picture?: File }): Promise<UserProfile> {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Usuario no autenticado')
      }

      const token = authService.getAccessToken()
      if (!token) {
        throw new Error('No hay token de acceso disponible')
      }

      // Si hay un archivo de imagen, usar FormData
      const hasFile = updates.profile_picture instanceof File
      let body: FormData | string
      let headers: Record<string, string>

      if (hasFile) {
        const formData = new FormData()
        
        // Añadir todos los campos excepto profile_picture
        Object.keys(updates).forEach(key => {
          if (key !== 'profile_picture' && updates[key as keyof typeof updates] !== undefined) {
            const value = updates[key as keyof typeof updates]
            if (value !== null) {
              if (typeof value === 'object' && !(value instanceof File)) {
                formData.append(key, JSON.stringify(value))
              } else {
                formData.append(key, value as string | number | boolean)
              }
            }
          }
        })
        
        // Añadir el archivo
        formData.append('profile_picture', updates.profile_picture)
        
        body = formData
        headers = {
          'Authorization': `Bearer ${token}`,
          // No establecer Content-Type, el navegador lo hará automáticamente con FormData
        }
      } else {
        body = JSON.stringify(updates)
        headers = {
          ...getAuthHeaders(),
          'Authorization': `Bearer ${token}`,
        }
      }

      const response = await fetch(buildApiUrl('/me/'), {
        method: 'PATCH',
        headers,
        body,
      })

      const result = await handleApiResponse<UserProfile>(response)
      
      if (result.error) {
        throw new Error(result.error)
      }

      if (!result.data) {
        throw new Error('No se recibió confirmación de la actualización')
      }

      // Limpiar caché del perfil para forzar actualización
      const profileCacheKey = generateCacheKey('/me/')
      apiCache.delete(profileCacheKey)
      
      // También limpiar caché de auth-me para que getCurrentUser obtenga datos frescos
      const authCacheKey = generateCacheKey(AUTH_ENDPOINTS.ME)
      apiCache.delete(authCacheKey)

      return result.data
    } catch (error) {
      throw handleFetchError(error)
    }
  }

  // Obtener notificaciones
  async getNotifications(): Promise<any[]> {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Usuario no autenticado')
      }

      const token = authService.getAccessToken()
      if (!token) {
        throw new Error('No hay token de acceso disponible')
      }

      const response = await fetch(buildApiUrl('/notifications/'), {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
          'Authorization': `Bearer ${token}`,
        },
      })

      const result = await handleApiResponse<any[]>(response)
      
      if (result.error) {
        throw new Error(result.error)
      }

      return result.data || []
    } catch (error) {
      console.warn('Error al obtener notificaciones:', error)
      return []
    }
  }
}

// Exportar instancia singleton
export const userService = UserService.getInstance()
