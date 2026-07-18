import { buildApiUrl } from '@/lib/api'
// hooks/use-admin-nutrition-plans.ts
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { handle401AndRefresh } from '@/lib/fetch-with-auth'

export interface Recipe {
  id: string
  name: string
  description: string
  category: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  prep_time_minutes: number
  cook_time_minutes: number
  servings: number
  image_url?: string
  instructions?: string
  ingredients?: any[]
}

export interface PlanMeal {
  id: string
  name: string
  meal_type: string
  time: string
  calories: number
  protein: string
  carbs: string
  fat: string
  description: string
  order_index: number
  suggested_recipes: string[] | Recipe[]
}

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
  fiber_grams?: number
  goal?: string
  diet_type?: string
  meals_per_day?: number
  is_active: boolean
  is_default: boolean
  is_template?: boolean
  is_system?: boolean
  user_id?: number | null
  user_email?: string | null
  min_role_required?: string
  duration_weeks?: number
  target_audience?: string
  tags?: string[]
  image_url?: string
  created_at: string
  updated_at: string
  meals?: PlanMeal[]
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
  user_id?: number | null
}

export const useAdminNutritionPlans = () => {
  const { getAuthHeaders } = useAuth()
  const [plans, setPlans] = useState<NutritionPlan[]>([])
  const [stats, setStats] = useState<NutritionPlanStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const percentsToGrams = (dailyCalories: number, percents: { protein_percentage: number; carbs_percentage: number; fat_percentage: number }) => {
    const calories = Number(dailyCalories) || 0
    const proteinPct = Number(percents.protein_percentage) || 0
    const carbsPct = Number(percents.carbs_percentage) || 0
    const fatPct = Number(percents.fat_percentage) || 0
    return {
      protein_grams: Math.round((calories * proteinPct) / 100 / 4),
      carbs_grams: Math.round((calories * carbsPct) / 100 / 4),
      fat_grams: Math.round((calories * fatPct) / 100 / 9),
    }
  }

  const fetchPlans = async () => {
    try {
      setLoading(true)
      setError(null)
      
      let headers = await getAuthHeaders()
      let response = await fetch(buildApiUrl('admin/nutrition/plans/?page_size=200'), {
        credentials: 'include',
        headers
      })

      // Si recibimos 401, intentar refrescar el token
      if (response.status === 401) {
        const { authService } = await import('@/lib/auth-service')
        const refreshResult = await authService.refreshAccessToken()
        
        if (refreshResult.success && refreshResult.newToken) {
          headers = await getAuthHeaders()
          response = await fetch(buildApiUrl('admin/nutrition/plans/?page_size=200'), {
        credentials: 'include',
            headers
          })
        } else {
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
        setPlans([])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
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
      
      setStats(calculatedStats)
    } catch (err) {
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
      const grams = percentsToGrams(planData.daily_calories, planData.target_macros)
      const payload = {
        name: planData.name,
        description: planData.description,
        daily_calories: planData.daily_calories,
        ...grams,
        // Si se asigna a usuario: plan de usuario (no plantilla). Si no: plantilla.
        user_id: planData.user_id ?? null,
        is_template: planData.user_id ? false : true,
        is_system: false,
        is_active: true,
      }

      const response = await fetch(buildApiUrl('admin/nutrition/plans/'), {
        credentials: 'include',
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error ${response.status}`)
      }

      const newPlan = await response.json()
      // Refrescar listado (el endpoint de lista actual puede ser diferente/paginado)
      await fetchPlans()
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
      const patchPayload: any = { ...planData }
      if (planData.daily_calories != null && planData.target_macros) {
        Object.assign(patchPayload, percentsToGrams(planData.daily_calories, planData.target_macros))
      }

      let response = await fetch(buildApiUrl(`admin/nutrition/plans/${planId}/`), {
        credentials: 'include',
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(patchPayload)
      })

      // Si recibimos 401, intentar refrescar el token
      if (response.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) throw new Error('Sesión expirada')
        headers = newHeaders
        response = await fetch(buildApiUrl(`admin/nutrition/plans/${planId}/`), {
        credentials: 'include',
          method: 'PATCH',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(patchPayload)
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error ${response.status}`)
      }

      const updatedPlan = await response.json()
      await fetchPlans()
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
      let response = await fetch(buildApiUrl(`admin/nutrition/plans/${planId}/`), {
        credentials: 'include',
        method: 'DELETE',
        headers
      })

      // Si recibimos 401, intentar refrescar el token
      if (response.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) throw new Error('Sesión expirada')
        headers = newHeaders
        response = await fetch(buildApiUrl(`admin/nutrition/plans/${planId}/`), {
        credentials: 'include',
          method: 'DELETE',
          headers
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error ${response.status}`)
      }

      await fetchPlans()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const togglePlanActive = async (planId: string): Promise<void> => {
    try {
      let headers = await getAuthHeaders()
      const currentPlan = plans.find((plan) => plan.id === planId)
      const nextIsActive = !(currentPlan?.is_active ?? false)

      let response = await fetch(buildApiUrl(`admin/nutrition/plans/${planId}/`), {
        credentials: 'include',
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: nextIsActive })
      })

      // Si recibimos 401, intentar refrescar el token
      if (response.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) throw new Error('Sesión expirada')
        headers = newHeaders
        response = await fetch(buildApiUrl(`admin/nutrition/plans/${planId}/`), {
        credentials: 'include',
          method: 'PATCH',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ is_active: nextIsActive })
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error ${response.status}`)
      }

      await response.json().catch(() => ({}))

      setPlans(prev => prev.map(plan => 
        plan.id === planId 
          ? { ...plan, is_active: nextIsActive }
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
        credentials: 'include',
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
        credentials: 'include',
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
      await Promise.all(planIds.map(async (planId) => {
        let headers = await getAuthHeaders()
        let response = await fetch(buildApiUrl(`admin/nutrition/plans/${planId}/`), {
        credentials: 'include',
          method: 'PATCH',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ is_active: isActive })
        })

        if (response.status === 401) {
          const newHeaders = await handle401AndRefresh(getAuthHeaders)
          if (!newHeaders) throw new Error('Sesión expirada')
          headers = newHeaders
          response = await fetch(buildApiUrl(`admin/nutrition/plans/${planId}/`), {
        credentials: 'include',
            method: 'PATCH',
            headers: {
              ...headers,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_active: isActive })
          })
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Error ${response.status}`)
        }
      }))

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
      await Promise.all(planIds.map(async (planId) => {
        let headers = await getAuthHeaders()
        let response = await fetch(buildApiUrl(`admin/nutrition/plans/${planId}/`), {
        credentials: 'include',
          method: 'DELETE',
          headers,
        })

        if (response.status === 401) {
          const newHeaders = await handle401AndRefresh(getAuthHeaders)
          if (!newHeaders) throw new Error('Sesión expirada')
          headers = newHeaders
          response = await fetch(buildApiUrl(`admin/nutrition/plans/${planId}/`), {
        credentials: 'include',
            method: 'DELETE',
            headers,
          })
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Error ${response.status}`)
        }
      }))

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

  // Función para obtener el detalle completo de un plan con sus comidas y recetas
  const fetchPlanDetail = async (planId: string): Promise<NutritionPlan | null> => {
    try {
      let headers = await getAuthHeaders()
      let response = await fetch(buildApiUrl(`admin/nutrition/plans/${planId}/`), {
        credentials: 'include',
        headers
      })

      // Si recibimos 401, intentar refrescar el token
      if (response.status === 401) {
        const { authService } = await import('@/lib/auth-service')
        const refreshResult = await authService.refreshAccessToken()
        
        if (refreshResult.success && refreshResult.newToken) {
          headers = await getAuthHeaders()
          response = await fetch(buildApiUrl(`admin/nutrition/plans/${planId}/`), {
        credentials: 'include',
            headers
          })
        } else {
          return null
        }
      }

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const planDetail = await response.json()
      return planDetail
    } catch (err) {
      return null
    }
  }

  // Función para obtener todas las recetas disponibles
  const fetchRecipes = async (): Promise<Recipe[]> => {
    try {
      let headers = await getAuthHeaders()
      let response = await fetch(buildApiUrl('admin/nutrition/recipes/'), {
        credentials: 'include',
        headers
      })

      if (response.status === 401) {
        const { authService } = await import('@/lib/auth-service')
        const refreshResult = await authService.refreshAccessToken()
        if (refreshResult.success) {
          headers = await getAuthHeaders()
          response = await fetch(buildApiUrl('admin/nutrition/recipes/'), {
        credentials: 'include', headers })
        }
      }

      if (!response.ok) {
        return []
      }

      const data = await response.json()
      return data.results || data || []
    } catch (err) {
      return []
    }
  }

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
    fetchPlanDetail,
    fetchRecipes,
    refetch: fetchPlans
  }
}
