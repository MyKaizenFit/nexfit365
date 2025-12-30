import { buildApiUrl } from '@/lib/api'
// hooks/use-admin-workout-plans-optimized.ts - Versión optimizada con paginación del servidor
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'

export interface Exercise {
  id: string  // UUID
  name: string
  category: string
  muscle_groups: string[]
  instructions: string
  video_url: string
  image_url: string
  difficulty?: string
  description?: string
}

export interface WorkoutPlan {
  id: string
  name: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  goal: string
  duration_weeks: number
  min_role_required: 'basic' | 'pro' | 'premium' | 'admin'
  estimated_duration_minutes?: number
  is_active: boolean
  is_default: boolean
  created_at: string
  updated_at: string
  days?: WorkoutDay[]
  days_count?: number
}

export interface WorkoutDay {
  id: string
  day_name: string
  day_number: number
  is_rest_day: boolean
  notes: string
  exercises: WorkoutDayExercise[]
}

export interface WorkoutDayExercise {
  id: string
  exercise: Exercise
  sets: number
  reps: number
  weight?: number
  duration?: number
  rest_time?: number
  notes: string
  order: number
}

export interface WorkoutPlanStats {
  total_programs: number
  active_programs: number
  programs_by_difficulty: Record<string, number>
  programs_by_role?: Record<string, number>
  recent_programs: number
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface WorkoutPlanFilters {
  search?: string
  difficulty?: string
  goal?: string
  min_role_required?: string
  is_active?: boolean
  is_public?: boolean
}

export const useAdminWorkoutPlansOptimized = () => {
  const { getAuthHeaders } = useAuth()
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [stats, setStats] = useState<WorkoutPlanStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Paginación del servidor
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize] = useState(50)
  const [filters, setFilters] = useState<WorkoutPlanFilters>({})

  // Construir URL con parámetros
  const buildFetchUrl = useCallback((page: number, filters: WorkoutPlanFilters) => {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    })
    
    if (filters.search) params.append('search', filters.search)
    if (filters.difficulty && filters.difficulty !== 'all') params.append('difficulty', filters.difficulty)
    if (filters.goal && filters.goal !== 'all') params.append('goal', filters.goal)
    if (filters.min_role_required && filters.min_role_required !== 'all') {
      params.append('min_role_required', filters.min_role_required)
    }
    if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString())
    if (filters.is_public !== undefined) params.append('is_public', filters.is_public.toString())
    
    return buildApiUrl(`workout-plan-templates/?${params.toString()}`)
  }, [pageSize])

  const fetchPlans = useCallback(async (page: number = 1, filters: WorkoutPlanFilters = {}) => {
    try {
      setLoading(true)
      setError(null)
      
      const headers = await getAuthHeaders()
      const url = buildFetchUrl(page, filters)
      
      console.log('📡 Fetching plans from:', url)
      const response = await fetch(url, { headers })
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      
      const data: PaginatedResponse<WorkoutPlan> = await response.json()
      
      console.log('📊 Datos recibidos:', {
        count: data.count,
        results: data.results?.length || 0,
        page: page
      })
      
      if (Array.isArray(data.results)) {
        setPlans(data.results)
        setTotalCount(data.count || 0)
        setCurrentPage(page)
      } else {
        console.error('Expected paginated response but got:', typeof data)
        setPlans([])
        setTotalCount(0)
      }
      
    } catch (err) {
      console.error('Error fetching workout plans:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      setPlans([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders, buildFetchUrl])

  const fetchExercises = async () => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`admin/exercises/exercises/`), {
        headers
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const exercisesData = data.results || data
      if (Array.isArray(exercisesData)) {
        setExercises(exercisesData)
      }
    } catch (err) {
      console.error('Error fetching exercises:', err)
    }
  }

  const fetchStats = async () => {
    try {
      const headers = await getAuthHeaders()
      
      // Obtener total de planes
      const totalResponse = await fetch(buildApiUrl(`workout-plan-templates/?page_size=1`), {
        headers
      })
      
      if (!totalResponse.ok) {
        throw new Error(`Error ${totalResponse.status}: ${totalResponse.statusText}`)
      }
      
      const totalData = await totalResponse.json()
      const totalCount = totalData.count || 0
      
      // Obtener planes activos
      const activeResponse = await fetch(buildApiUrl(`workout-plan-templates/?is_active=true&page_size=1`), {
        headers
      })
      
      let activeCount = 0
      if (activeResponse.ok) {
        const activeData = await activeResponse.json()
        activeCount = activeData.count || 0
      }
      
      // Obtener planes recientes (últimos 7 días)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const recentResponse = await fetch(buildApiUrl(`workout-plan-templates/?created_after=${sevenDaysAgo.toISOString()}&page_size=1`), {
        headers
      })
      
      let recentCount = 0
      if (recentResponse.ok) {
        const recentData = await recentResponse.json()
        recentCount = recentData.count || 0
      }
      
      // Obtener planes por dificultad
      const programsByDifficulty: Record<string, number> = {}
      const difficultyLevels = ['beginner', 'intermediate', 'advanced']
      
      for (const difficulty of difficultyLevels) {
        try {
          const diffResponse = await fetch(buildApiUrl(`workout-plan-templates/?difficulty=${difficulty}&page_size=1`), {
            headers
          })
          if (diffResponse.ok) {
            const diffData = await diffResponse.json()
            programsByDifficulty[difficulty] = diffData.count || 0
          }
        } catch (err) {
          console.error(`Error fetching plans for difficulty ${difficulty}:`, err)
        }
      }
      
      // Obtener planes por rol
      const programsByRole: Record<string, number> = {}
      const roles = ['basic', 'pro', 'premium']
      
      for (const role of roles) {
        try {
          const roleResponse = await fetch(buildApiUrl(`workout-plan-templates/?min_role_required=${role}&page_size=1`), {
            headers
          })
          if (roleResponse.ok) {
            const roleData = await roleResponse.json()
            programsByRole[role] = roleData.count || 0
          }
        } catch (err) {
          console.error(`Error fetching plans for role ${role}:`, err)
        }
      }
      
      const stats: WorkoutPlanStats = {
        total_programs: totalCount,
        active_programs: activeCount,
        programs_by_difficulty: programsByDifficulty,
        programs_by_role: programsByRole,
        recent_programs: recentCount
      }
      
      console.log('📊 Estadísticas de planes de entrenamiento calculadas:', stats)
      setStats(stats)
    } catch (err) {
      console.error('Error calculating stats:', err)
      // Calcular desde los planes cargados como fallback
      const activePlans = plans.filter(p => p.is_active).length
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const recentPlans = plans.filter(p => {
        const createdDate = new Date(p.created_at)
        return createdDate >= sevenDaysAgo
      }).length
      
      const programsByDifficulty: Record<string, number> = {}
      plans.forEach(plan => {
        if (plan.difficulty) {
          programsByDifficulty[plan.difficulty] = (programsByDifficulty[plan.difficulty] || 0) + 1
        }
      })
      
      const programsByRole: Record<string, number> = {}
      plans.forEach(plan => {
        if (plan.min_role_required) {
          programsByRole[plan.min_role_required] = (programsByRole[plan.min_role_required] || 0) + 1
        }
      })
      
      setStats({
        total_programs: totalCount,
        active_programs: activePlans,
        programs_by_difficulty: programsByDifficulty,
        programs_by_role: programsByRole,
        recent_programs: recentPlans
      })
    }
  }

  // Actualizar filtros y recargar
  const updateFilters = useCallback((newFilters: WorkoutPlanFilters) => {
    setFilters(newFilters)
    setCurrentPage(1)
    fetchPlans(1, newFilters)
  }, [fetchPlans])

  // Cambiar de página
  const changePage = useCallback((page: number) => {
    fetchPlans(page, filters)
  }, [fetchPlans, filters])

  // Inicializar
  useEffect(() => {
    fetchPlans(1, {})
    fetchExercises()
  }, []) // Solo al montar
  
  // Actualizar stats cuando cambian los planes o totalCount
  useEffect(() => {
    if (totalCount > 0 || plans.length > 0) {
      fetchStats()
    }
  }, [totalCount, plans.length])

  // Función para obtener el detalle completo de un plan
  const fetchPlanDetail = useCallback(async (planId: string): Promise<WorkoutPlan | null> => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`workout-plan-templates/${planId}/`), {
        headers
      })
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      
      const planDetail = await response.json()
      console.log('📋 Detalle del plan cargado:', planDetail.name, '- Días:', planDetail.days?.length || 0)
      return planDetail
    } catch (err) {
      console.error('Error fetching plan detail:', err)
      return null
    }
  }, [getAuthHeaders])

  // CRUD operations
  const createPlan = async (planData: any): Promise<WorkoutPlan> => {
    const headers = await getAuthHeaders()
    const response = await fetch(buildApiUrl('workout-plan-templates/'), {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(planData)
    })
    if (!response.ok) throw new Error(`Error ${response.status}`)
    const newPlan = await response.json()
    fetchPlans(currentPage, filters)
    return newPlan
  }

  const updatePlan = async (planId: string, planData: any): Promise<WorkoutPlan> => {
    const headers = await getAuthHeaders()
    const response = await fetch(buildApiUrl(`workout-plan-templates/${planId}/`), {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(planData)
    })
    if (!response.ok) throw new Error(`Error ${response.status}`)
    const updatedPlan = await response.json()
    fetchPlans(currentPage, filters)
    return updatedPlan
  }

  const deletePlan = async (planId: string): Promise<void> => {
    const headers = await getAuthHeaders()
    const response = await fetch(buildApiUrl(`workout-plan-templates/${planId}/`), {
      method: 'DELETE',
      headers
    })
    if (!response.ok) throw new Error(`Error ${response.status}`)
    fetchPlans(currentPage, filters)
  }

  const togglePlanActive = async (planId: string): Promise<void> => {
    const plan = plans.find(p => p.id === planId)
    if (plan) {
      await updatePlan(planId, { is_active: !plan.is_active })
    }
  }

  const setAsDefault = async (planId: string): Promise<void> => {
    await updatePlan(planId, { is_default: true })
  }

  const bulkToggleActive = async (planIds: string[], isActive: boolean): Promise<void> => {
    for (const id of planIds) {
      await updatePlan(id, { is_active: isActive })
    }
  }

  const bulkDelete = async (planIds: string[]): Promise<void> => {
    for (const id of planIds) {
      await deletePlan(id)
    }
  }

  // Asegurar que plans y exercises siempre sean arrays
  const safePlans = Array.isArray(plans) ? plans : []
  const safeExercises = Array.isArray(exercises) ? exercises : []
  
  return {
    plans: safePlans,
    exercises: safeExercises,
    stats,
    loading,
    error,
    currentPage,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
    pageSize,
    filters,
    fetchPlans: (page?: number) => fetchPlans(page || currentPage, filters),
    fetchPlanDetail,
    fetchExercises,
    fetchStats,
    updateFilters,
    changePage,
    createPlan,
    updatePlan,
    deletePlan,
    togglePlanActive,
    setAsDefault,
    bulkToggleActive,
    bulkDelete,
    refetch: () => { fetchPlans(currentPage, filters); fetchExercises(); fetchStats() }
  }
}

