import { buildApiUrl } from '@/lib/api'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { handle401AndRefresh } from '@/lib/fetch-with-auth'

export interface Nutrition {
  id: number
  name: string
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
  prep_time_minutes: number
  servings: number
  calories_per_serving: number
  ingredients: string[]
  instructions: string
  image_url?: string
  tags: string[]
  created_at: string
  updated_at: string
}

export interface NutritionStats {
  total_nutrition: number
  nutrition_by_category: Record<string, number>
  nutrition_by_difficulty: Record<string, number>
  recent_nutrition: number
}

export interface CreateNutritionData {
  name: string
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
  prep_time_minutes: number
  servings: number
  calories_per_serving: number
  ingredients: string[]
  instructions: string
  image_url?: string
  tags: string[]
}

export const useAdminNutrition = () => {
  const { getAuthHeaders } = useAuth()
  const [nutrition, setNutrition] = useState<Nutrition[]>([])
  const [stats, setStats] = useState<NutritionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNutrition = async () => {
    try {
      let headers = await getAuthHeaders()
      let response = await fetch(buildApiUrl('admin/nutrition/recipes/'), {
        headers
      })

      // Si recibimos 401, intentar refrescar el token
      if (response.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) return // Ya redirigió al login
        headers = newHeaders
        response = await fetch(buildApiUrl('admin/nutrition/recipes/'), {
          headers
        })
      }

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Asegurar que sea un array
      if (Array.isArray(data)) {
        setNutrition(data)
      } else if (data.results && Array.isArray(data.results)) {
        setNutrition(data.results)
      } else {
        console.warn('Formato de datos inesperado:', data)
        setNutrition([])
      }
    } catch (err) {
      console.error('Error fetching nutrition:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar recetas')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      let headers = await getAuthHeaders()
      let response = await fetch(buildApiUrl('admin/nutrition/recipes/stats/'), {
        headers
      })

      // Si recibimos 401, intentar refrescar el token
      if (response.status === 401) {
        const { authService } = await import('@/lib/auth-service')
        const refreshResult = await authService.refreshAccessToken()
        
        if (refreshResult.success && refreshResult.newToken) {
          headers = await getAuthHeaders()
          response = await fetch(buildApiUrl('admin/nutrition/recipes/stats/'), {
            headers
          })
        } else {
          return
        }
      }

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error('Error fetching nutrition stats:', err)
      // No establecer error aquí, solo usar datos por defecto
      setStats({
        total_nutrition: 0,
        nutrition_by_category: {},
        nutrition_by_difficulty: {},
        recent_nutrition: 0
      })
    }
  }

  const createNutrition = async (nutritionData: CreateNutritionData): Promise<Nutrition> => {
    try {
      let headers = await getAuthHeaders()
      let response = await fetch(buildApiUrl('admin/nutrition/recipes/'), {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(nutritionData)
      })

      // Si recibimos 401, intentar refrescar el token
      if (response.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) throw new Error('Sesión expirada')
        headers = newHeaders
        response = await fetch(buildApiUrl('admin/nutrition/recipes/'), {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(nutritionData)
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `Error ${response.status}: ${response.statusText}`)
      }

      const newNutrition = await response.json()
      
      // Actualizar la lista local
      setNutrition(prev => [...prev, newNutrition])
      
      // Refrescar estadísticas
      await fetchStats()
      
      return newNutrition
    } catch (err) {
      console.error('Error creating nutrition:', err)
      throw err
    }
  }

  const updateNutrition = async (id: string, nutritionData: Partial<CreateNutritionData>): Promise<Nutrition> => {
    try {
      let headers = await getAuthHeaders()
      let response = await fetch(buildApiUrl(`admin/nutrition/recipes/${id}/`), {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(nutritionData)
      })

      // Si recibimos 401, intentar refrescar el token
      if (response.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) throw new Error('Sesión expirada')
        headers = newHeaders
        response = await fetch(buildApiUrl(`admin/nutrition/recipes/${id}/`), {
          method: 'PUT',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(nutritionData)
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `Error ${response.status}: ${response.statusText}`)
      }

      const updatedNutrition = await response.json()
      
      // Actualizar la lista local
      setNutrition(prev => prev.map(item => 
        item.id === parseInt(id) ? updatedNutrition : item
      ))
      
      // Refrescar estadísticas
      await fetchStats()
      
      return updatedNutrition
    } catch (err) {
      console.error('Error updating nutrition:', err)
      throw err
    }
  }

  const deleteNutrition = async (id: string): Promise<void> => {
    try {
      let headers = await getAuthHeaders()
      let response = await fetch(buildApiUrl(`admin/nutrition/recipes/${id}/`), {
        method: 'DELETE',
        headers
      })

      // Si recibimos 401, intentar refrescar el token
      if (response.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) throw new Error('Sesión expirada')
        headers = newHeaders
        response = await fetch(buildApiUrl(`admin/nutrition/recipes/${id}/`), {
          method: 'DELETE',
          headers
        })
      }

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      // Actualizar la lista local
      setNutrition(prev => prev.filter(item => item.id !== parseInt(id)))
      
      // Refrescar estadísticas
      await fetchStats()
    } catch (err) {
      console.error('Error deleting nutrition:', err)
      throw err
    }
  }

  const bulkDeleteNutrition = async (ids: number[]): Promise<void> => {
    try {
      let headers = await getAuthHeaders()
      let response = await fetch(buildApiUrl('admin/nutrition/recipes/bulk_delete/'), {
        method: 'DELETE',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nutrition_ids: ids })
      })

      // Si recibimos 401, intentar refrescar el token
      if (response.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) throw new Error('Sesión expirada')
        headers = newHeaders
        response = await fetch(buildApiUrl('admin/nutrition/recipes/bulk_delete/'), {
          method: 'DELETE',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ nutrition_ids: ids })
        })
      }

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      // Actualizar la lista local
      setNutrition(prev => prev.filter(item => !ids.includes(item.id)))
      
      // Refrescar estadísticas
      await fetchStats()
    } catch (err) {
      console.error('Error bulk deleting nutrition:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchNutrition()
    fetchStats()
  }, [])

  return {
    nutrition,
    stats,
    loading,
    error,
    fetchNutrition,
    fetchStats,
    createNutrition,
    updateNutrition,
    deleteNutrition,
    bulkDeleteNutrition,
    refetch: () => { fetchNutrition(); fetchStats() }
  }
}












