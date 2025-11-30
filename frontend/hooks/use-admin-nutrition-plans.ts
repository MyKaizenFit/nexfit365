import { buildApiUrl } from '@/lib/api'
// hooks/use-admin-nutrition-plans.ts
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { handle401AndRefresh } from '@/lib/fetch-with-auth'

export interface NutritionPlan {
  id: string
  name: string
  description: string
  daily_calories: number
  target_macros: {
    protein_percentage: number
    carbs_percentage: number
    fat_percentage: number
  }
  protein_percentage: number
  carbs_percentage: number
  fat_percentage: number
  protein_grams: number
  carbs_grams: number
  fat_grams: number
  is_active: boolean
  is_default: boolean
  min_role_required?: string
  duration_weeks?: number
  target_audience?: string
  tags?: any // JSON con los menús
  image_url?: string
  created_at: string
  updated_at: string
}

export interface NutritionPlanStats {
  total_plans: number
  active_plans: number
  plans_by_calories: Record<string, number>
  plans_by_target_audience?: Record<string, number>
  recent_plans: number
}

export interface CreateNutritionPlanData {
  name: string
  description: string
  daily_calories: number
  target_macros: {
    protein_percentage: number
    carbs_percentage: number
    fat_percentage: number
  }
}

export const useAdminNutritionPlans = () => {
  const { getAuthHeaders } = useAuth()
  const [plans, setPlans] = useState<NutritionPlan[]>([])
  const [stats, setStats] = useState<NutritionPlanStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlans = async () => {
    try {
      setLoading(true)
      setError(null)
      
      let headers = await getAuthHeaders()
      let response = await fetch(buildApiUrl('admin/nutrition/default-plans/'), {
        headers
      })

      // Si recibimos 401, intentar refrescar el token
      if (response.status === 401) {
        console.log('🔄 Token expirado, intentando refrescar...')
        const { authService } = await import('@/lib/auth-service')
        const refreshResult = await authService.refreshAccessToken()
        
        if (refreshResult.success && refreshResult.newToken) {
          console.log('✅ Token refrescado, reintentando...')
          headers = await getAuthHeaders()
          response = await fetch(buildApiUrl('admin/nutrition/default-plans/'), {
            headers
          })
        } else {
          console.error('❌ No se pudo refrescar el token')
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login'
          }
          return
        }
      }

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Validar que data.results sea un array
      if (Array.isArray(data.results)) {
        setPlans(data.results)
      } else if (Array.isArray(data)) {
        setPlans(data)
      } else {
        console.warn('Formato de datos inesperado:', data)
        setPlans([])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      console.error('Error fetching nutrition plans:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      // Calcular estadísticas desde los planes cargados
      const totalPlans = plans.length
      const activePlans = plans.filter(p => p.is_active).length
      
      // Planes por objetivo nutricional (basado en calorías)
      const plansByCalories: Record<string, number> = {}
      plans.forEach(plan => {
        let range = 'unknown'
        if (plan.daily_calories < 1500) range = 'bajo'
        else if (plan.daily_calories < 2000) range = 'medio'
        else range = 'alto'
        plansByCalories[range] = (plansByCalories[range] || 0) + 1
      })
      
      // Planes recientes (últimos 7 días)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const recentPlans = plans.filter(plan => {
        const createdDate = new Date(plan.created_at)
        return createdDate >= sevenDaysAgo
      }).length
      
      const calculatedStats: NutritionPlanStats = {
        total_plans: totalPlans,
        active_plans: activePlans,
        plans_by_calories: plansByCalories,
        recent_plans: recentPlans
      }
      
      console.log('📊 Estadísticas de planes de nutrición calculadas:', calculatedStats)
      setStats(calculatedStats)
    } catch (err) {
      console.error('Error calculating nutrition plan stats:', err)
      // Datos de fallback
      setStats({
        total_plans: plans.length,
        active_plans: plans.filter(p => p.is_active).length,
        plans_by_calories: {},
        recent_plans: 0
      })
    }
  }

  const createPlan = async (planData: CreateNutritionPlanData): Promise<NutritionPlan> => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl('admin/nutrition/default-plans/'), {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(planData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error ${response.status}`)
      }

      const newPlan = await response.json()
      setPlans(prev => [newPlan, ...prev])
      return newPlan
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const updatePlan = async (planId: string, planData: Partial<CreateNutritionPlanData>): Promise<NutritionPlan> => {
    try {
      let headers = await getAuthHeaders()
      let response = await fetch(buildApiUrl(`admin/nutrition/default-plans/${planId}/`), {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(planData)
      })

      // Si recibimos 401, intentar refrescar el token
      if (response.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) throw new Error('Sesión expirada')
        headers = newHeaders
        response = await fetch(buildApiUrl(`admin/nutrition/default-plans/${planId}/`), {
          method: 'PATCH',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(planData)
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error ${response.status}`)
      }

      const updatedPlan = await response.json()
      setPlans(prev => prev.map(plan => plan.id === planId ? updatedPlan : plan))
      return updatedPlan
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const deletePlan = async (planId: string): Promise<void> => {
    try {
      let headers = await getAuthHeaders()
      let response = await fetch(buildApiUrl(`admin/nutrition/default-plans/${planId}/`), {
        method: 'DELETE',
        headers
      })

      // Si recibimos 401, intentar refrescar el token
      if (response.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) throw new Error('Sesión expirada')
        headers = newHeaders
        response = await fetch(buildApiUrl(`admin/nutrition/default-plans/${planId}/`), {
          method: 'DELETE',
          headers
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error ${response.status}`)
      }

      setPlans(prev => prev.filter(plan => plan.id !== planId))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const togglePlanActive = async (planId: string): Promise<void> => {
    try {
      let headers = await getAuthHeaders()
      let response = await fetch(buildApiUrl(`admin/nutrition/default-plans/${planId}/toggle_active/`), {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        }
      })

      // Si recibimos 401, intentar refrescar el token
      if (response.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) throw new Error('Sesión expirada')
        headers = newHeaders
        response = await fetch(buildApiUrl(`admin/nutrition/default-plans/${planId}/toggle_active/`), {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          }
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error ${response.status}`)
      }

      const result = await response.json()
      
      // Actualizar el plan en el estado local
      setPlans(prev => prev.map(plan => 
        plan.id === planId 
          ? { ...plan, is_active: result.is_active }
          : plan
      ))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const setAsDefault = async (planId: string): Promise<void> => {
    try {
      let headers = await getAuthHeaders()
      let response = await fetch(buildApiUrl(`admin/nutrition/default-plans/${planId}/set_as_default/`), {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        }
      })

      // Si recibimos 401, intentar refrescar el token
      if (response.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) throw new Error('Sesión expirada')
        headers = newHeaders
        response = await fetch(buildApiUrl(`admin/nutrition/default-plans/${planId}/set_as_default/`), {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          }
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error ${response.status}`)
      }

      const result = await response.json()
      
      // Actualizar todos los planes para quitar el is_default de otros
      setPlans(prev => prev.map(plan => ({
        ...plan,
        is_default: plan.id === planId
      })))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const bulkToggleActive = async (planIds: string[], isActive: boolean): Promise<void> => {
    try {
      let headers = await getAuthHeaders()
      const requestBody = JSON.stringify({
        plan_ids: planIds,
        is_active: isActive
      })
      let response = await fetch(buildApiUrl('admin/nutrition/default-plans/bulk_toggle_active/'), {
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
        response = await fetch(buildApiUrl('admin/nutrition/default-plans/bulk_toggle_active/'), {
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
        throw new Error(errorData.error || `Error ${response.status}`)
      }

      // Actualizar los planes en el estado local
      setPlans(prev => prev.map(plan => 
        planIds.includes(plan.id) 
          ? { ...plan, is_active: isActive }
          : plan
      ))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const bulkDelete = async (planIds: string[]): Promise<void> => {
    try {
      let headers = await getAuthHeaders()
      const requestBody = JSON.stringify({
        plan_ids: planIds
      })
      let response = await fetch(buildApiUrl('admin/nutrition/default-plans/bulk_delete/'), {
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
        response = await fetch(buildApiUrl('admin/nutrition/default-plans/bulk_delete/'), {
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
        throw new Error(errorData.error || `Error ${response.status}`)
      }

      // Remover los planes eliminados del estado local
      setPlans(prev => prev.filter(plan => !planIds.includes(plan.id)))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])
  
  // Recalcular estadísticas cuando cambian los planes
  useEffect(() => {
    if (plans.length > 0) {
      fetchStats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans])

  return {
    plans,
    stats,
    loading,
    error,
    createPlan,
    updatePlan,
    deletePlan,
    togglePlanActive,
    setAsDefault,
    bulkToggleActive,
    bulkDelete,
    refetch: fetchPlans
  }
}
