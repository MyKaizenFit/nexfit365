// lib/user-service.ts
// Servicio para obtener datos reales del usuario desde el backend

import { buildApiUrl, getAuthHeaders, handleApiResponse, handleFetchError, AUTH_ENDPOINTS } from './api'
import { getAuthService } from './auth-service'
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

const MAX_PROGRESS_PHOTO_BYTES = 5 * 1024 * 1024

const isHeicFile = (file: File) => {
  const name = file.name.toLowerCase()
  return file.type === 'image/heic' || file.type === 'image/heif' || name.endsWith('.heic') || name.endsWith('.heif')
}

const loadImageElement = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = (err) => reject(err)
      img.src = reader.result as string
    }
    reader.onerror = (err) => reject(err)
    reader.readAsDataURL(file)
  })
}

const compressImageIfNeeded = async (file: File): Promise<File> => {
  if (typeof window === 'undefined') return file
  if (file.size <= MAX_PROGRESS_PHOTO_BYTES) return file

  const maxDim = 1920
  const quality = 0.85

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
    })

    if (!blob) return file
    const newName = file.name.replace(/\.(heic|heif|png)$/i, '.jpg')
    return new File([blob], newName, { type: 'image/jpeg' })
  } catch {
    try {
      const img = await loadImageElement(file)
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const width = Math.max(1, Math.round(img.width * scale))
      const height = Math.max(1, Math.round(img.height * scale))

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return file
      ctx.drawImage(img, 0, 0, width, height)

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
      })

      if (!blob) return file
      const newName = file.name.replace(/\.(heic|heif|png)$/i, '.jpg')
      return new File([blob], newName, { type: 'image/jpeg' })
    } catch {
      return file
    }
  }
}

const normalizeProgressPhotoFile = async (file: File): Promise<File> => {
  let normalized = file

  if (typeof window !== 'undefined' && isHeicFile(file)) {
    try {
      const { default: heic2any } = await import('heic2any')
      const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 })
      const blob = Array.isArray(result) ? result[0] : result
      if (blob instanceof Blob) {
        const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg')
        normalized = new File([blob], newName, { type: 'image/jpeg' })
      }
    } catch {
      // si falla la conversión, seguimos con el archivo original
    }
  }

  return compressImageIfNeeded(normalized)
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
  async getUserProfile(forceRefresh: boolean = false): Promise<UserProfile> {
    try {
      const authService = getAuthService()
      if (!authService.isAuthenticated()) {
        throw new Error('Usuario no autenticado')
      }

      const token = authService.getAccessToken()
      if (!token) {
        throw new Error('No hay token de acceso disponible')
      }

      // Si se fuerza la recarga, limpiar caché primero
      if (forceRefresh) {
        const profileCacheKey = generateCacheKey('/me/')
        apiCache.delete(profileCacheKey)
        const authCacheKey = generateCacheKey(AUTH_ENDPOINTS.ME)
        apiCache.delete(authCacheKey)
      }

      const response = await fetch(buildApiUrl('/me/'), {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
          'Authorization': `Bearer ${token}`,
          // Agregar header para evitar caché del navegador si se fuerza recarga
          ...(forceRefresh && { 'Cache-Control': 'no-cache' }),
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
  async getUserStats(): Promise<UserStats | null> {
    const cacheKey = generateCacheKey('/user-stats/')
    
    // Intentar obtener del caché primero
    const cached = apiCache.get<UserStats>(cacheKey)
    if (cached) {
      return cached
    }

    try {
      const authService = getAuthService()
      if (!authService.isAuthenticated()) {
        // Retornar null en lugar de lanzar error si no está autenticado
        return null
      }

      const token = authService.getAccessToken()
      if (!token) {
        // Retornar null en lugar de lanzar error si no hay token
        return null
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
      // Si es un error de autenticación, retornar null en lugar de lanzar
      if (error instanceof Error && (error.message.includes('autenticado') || error.message.includes('token'))) {
        return null
      }
      throw handleFetchError(error)
    }
  }

  // Obtener fotos de progreso
  async getProgressPhotos(): Promise<ProgressPhoto[]> {
    try {
      const authService = getAuthService()
      if (!authService.isAuthenticated()) {
        return []
      }

      const token = authService.getAccessToken()
      if (!token) {
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
        return []
      }

      // Manejar respuesta paginada de Django REST Framework
      if (result.data && 'results' in result.data) {
        return result.data.results
      }

      // Fallback para respuesta no paginada
      if (Array.isArray(result.data)) {
        return result.data
      }

      return []
    } catch (error) {
      return []
    }
  }

  // Subir foto de progreso
  async uploadProgressPhoto(
    file: File,
    weight?: number,
    notes?: string,
    photoType: 'front' | 'back' | 'side' | 'other' = 'front',
    date?: string
  ): Promise<ProgressPhoto> {
    try {
      const authService = getAuthService()
      if (!authService.isAuthenticated()) {
        throw new Error('Usuario no autenticado')
      }

      const token = authService.getAccessToken()
      if (!token) {
        throw new Error('No hay token de acceso disponible')
      }

      // NO loguear tokens por seguridad

      const url = buildApiUrl('progress-photos/')

      const normalizedFile = await normalizeProgressPhotoFile(file)

      // Crear FormData
      const formData = new FormData()
      formData.append('photo', normalizedFile, normalizedFile.name)
      formData.append('photo_type', photoType)
      formData.append('date', date || new Date().toLocaleDateString('en-CA'))
      
      // Asegurar que el peso se envíe como número
      if (weight !== undefined && weight !== null) {
        formData.append('weight', weight.toString())
      }
      
      // Asegurar que las notas se envíen como string
      if (notes && notes.trim()) {
        formData.append('notes', notes.trim())
      }

      // Log del FormData
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
        } else {
        }
      }

      // Preparar headers
      const headers = {
        'Authorization': `Bearer ${token}`,
      }


      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      })


      if (!response.ok) {
        
        // Log detallado del error
        try {
          const errorData = await response.json()
        } catch (parseError) {
        }

        // Log de headers de respuesta
        for (let [key, value] of response.headers.entries()) {
        }

        // Log de la petición
        for (let [key, value] of formData.entries()) {
          if (value instanceof File) {
          } else {
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

      return result.data

    } catch (error) {
      throw error
    }
  }

  async uploadProgressPhotos(
    files: File[],
    weight?: number,
    notes?: string,
    photoType: 'front' | 'back' | 'side' | 'other' = 'front',
    date?: string
  ): Promise<ProgressPhoto[]> {
    const uploaded: ProgressPhoto[] = []
    for (const file of files) {
      uploaded.push(await this.uploadProgressPhoto(file, weight, notes, photoType, date))
    }
    return uploaded
  }

  async deleteProgressPhoto(photoId: string | number): Promise<void> {
    const authService = getAuthService()
    if (!authService.isAuthenticated()) {
      throw new Error('Usuario no autenticado')
    }

    const token = authService.getAccessToken()
    if (!token) {
      throw new Error('No hay token de acceso disponible')
    }

    const response = await fetch(buildApiUrl(`progress-photos/${photoId}/`), {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok && response.status !== 204) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }
  }

  // Obtener historial de peso
  async getWeightHistory(): Promise<WeightEntry[]> {
    try {
      const authService = getAuthService()
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
      return []
    }
  }

  // Registrar nuevo peso
  async addWeightEntry(weight: number, notes?: string): Promise<WeightEntry> {
    try {
      const authService = getAuthService()
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
      const authService = getAuthService()
      if (!authService.isAuthenticated()) {
        throw new Error('Usuario no autenticado')
      }

      const token = authService.getAccessToken()
      if (!token) {
        throw new Error('No hay token de acceso disponible')
      }

      const response = await fetch(buildApiUrl('nutrition/current-plan/'), {
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
      return null
    }
  }

  // Obtener programa de entrenamiento actual
  async getCurrentWorkoutProgram(): Promise<WorkoutProgram | null> {
    try {
      const authService = getAuthService()
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
      return null
    }
  }

  // Actualizar perfil del usuario
  async updateUserProfile(updates: Partial<UserProfile> & { profile_picture?: File }): Promise<UserProfile> {
    try {
      const authService = getAuthService()
      if (!authService.isAuthenticated()) {
        throw new Error('Usuario no autenticado')
      }

      const token = authService.getAccessToken()
      if (!token) {
        throw new Error('No hay token de acceso disponible')
      }

      // Si hay un archivo de imagen, usar FormData
      const hasFile = (updates.profile_picture as any) instanceof File
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
                formData.append(key, value instanceof File ? value : String(value))
              }
            }
          }
        })
        
        // Añadir el archivo
        formData.append('profile_picture', updates.profile_picture as File)
        
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

      const response = await fetch(buildApiUrl('profile/'), {
        method: 'PATCH',
        headers,
        body,
      })

      const result = await handleApiResponse<UserProfile & { plan_updated?: boolean; plan_update_message?: string }>(response)
      
      if (result.error) {
        throw new Error(result.error)
      }

      if (!result.data) {
        throw new Error('No se recibió confirmación de la actualización')
      }

      // Limpiar caché del perfil para forzar actualización
      const profileCacheKey = generateCacheKey('profile/')
      apiCache.delete(profileCacheKey)
      
      // También limpiar caché de auth-me para que getCurrentUser obtenga datos frescos
      const authCacheKey = generateCacheKey(AUTH_ENDPOINTS.ME)
      apiCache.delete(authCacheKey)

      // Devolver datos con información de actualización de plan
      return {
        ...result.data,
        plan_updated: (result.data as any).plan_updated,
        plan_update_message: (result.data as any).plan_update_message
      } as UserProfile & { plan_updated?: boolean; plan_update_message?: string }
    } catch (error) {
      throw handleFetchError(error)
    }
  }

  // Obtener notificaciones
  async getNotifications(): Promise<any[]> {
    try {
      const authService = getAuthService()
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
      return []
    }
  }
}

// Exportar instancia singleton
export const userService = UserService.getInstance()
