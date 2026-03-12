import { buildApiUrl, authenticatedFetch } from '@/lib/api'
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
  substitutes?: Array<{
    id: string
    substitute_id: string
    substitute_name: string
    category: string
    priority: number
    notes: string
  }>
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
  is_template?: boolean
  is_system?: boolean
  user?: string | number | null
  user_email?: string | null
  created_by?: string | number | null
  created_by_email?: string | null
  created_at: string
  updated_at: string
  days?: WorkoutDay[]
  days_count?: number
  training_days?: number
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
  substitutes?: Array<{
    id: string
    substitute_id: string
    substitute_name: string
    category: string
    priority: number
    notes: string
  }>
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
  user?: string
  is_template?: boolean
  is_system?: boolean
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
    if (filters.user && filters.user !== 'all') params.append('user', filters.user)
    if (filters.is_template !== undefined) params.append('is_template', filters.is_template.toString())
    if (filters.is_system !== undefined) params.append('is_system', filters.is_system.toString())

    // Importante: devolver endpoint RELATIVO para usar authenticatedFetch (que ya aplica buildApiUrl)
    return `admin/workouts/programs/?${params.toString()}`
  }, [pageSize])

  const fetchPlans = useCallback(async (page: number = 1, filters: WorkoutPlanFilters = {}) => {
    try {
      setLoading(true)
      setError(null)

      const url = buildFetchUrl(page, filters)

      const response = await authenticatedFetch(url, {
        // Evitar caches HTTP intermedios / navegador (reduce casos de "lista vieja")
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data: PaginatedResponse<WorkoutPlan> = await response.json()
      // (removed misplaced object)

      if (Array.isArray(data.results)) {
        setPlans(data.results)
        setTotalCount(data.count || 0)
        setCurrentPage(page)
      } else {
        setPlans([])
        setTotalCount(0)
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      setPlans([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [buildFetchUrl])

  const fetchExercises = async () => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`admin/exercises/`), {
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
    }
  }

  const fetchStats = async () => {
    try {
      // Obtener total de planes
      const totalResponse = await authenticatedFetch(`admin/workouts/programs/?page_size=1`)

      if (!totalResponse.ok) {
        throw new Error(`Error ${totalResponse.status}: ${totalResponse.statusText}`)
      }

      const totalData = await totalResponse.json()
      const totalCount = totalData.count || 0

      // Obtener planes activos
      let activeCount = 0
      try {
        const activeResponse = await authenticatedFetch(`admin/workouts/programs/?is_active=true&page_size=1`)
        if (activeResponse.ok) {
          const activeData = await activeResponse.json()
          activeCount = activeData.count || 0
        }
      } catch (err) {
      }

      // Obtener planes recientes (últimos 7 días)
      let recentCount = 0
      try {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const recentResponse = await authenticatedFetch(`admin/workouts/programs/?created_after=${sevenDaysAgo.toISOString()}&page_size=1`)
        if (recentResponse.ok) {
          const recentData = await recentResponse.json()
          recentCount = recentData.count || 0
        }
      } catch (err) {
      }

      // Obtener planes por dificultad - hacer en paralelo con mejor manejo de errores
      const programsByDifficulty: Record<string, number> = {}
      const difficultyLevels = ['beginner', 'intermediate', 'advanced']

      const difficultyPromises = difficultyLevels.map(async (difficulty) => {
        try {
          const diffResponse = await authenticatedFetch(`admin/workouts/programs/?difficulty=${difficulty}&page_size=1`)
          if (diffResponse.ok) {
            const diffData = await diffResponse.json()
            return { difficulty, count: diffData.count || 0 }
          }
          return { difficulty, count: 0 }
        } catch (err) {
          return { difficulty, count: 0 }
        }
      })

      const difficultyResults = await Promise.allSettled(difficultyPromises)
      difficultyResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          programsByDifficulty[result.value.difficulty] = result.value.count
        }
      })

      // Obtener planes por rol - calcular desde los planes cargados
      // Nota: min_role_required no existe en el modelo, así que calculamos desde los planes
      const programsByRole: Record<string, number> = {}
      // Como no hay campo min_role_required, dejamos esto vacío o calculamos desde otra fuente
      // Por ahora, lo dejamos vacío ya que el campo no existe en el modelo

      const stats: WorkoutPlanStats = {
        total_programs: totalCount,
        active_programs: activeCount,
        programs_by_difficulty: programsByDifficulty,
        programs_by_role: programsByRole, // Vacío ya que el campo no existe
        recent_programs: recentCount
      }

      setStats(stats)
    } catch (err) {
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

      // min_role_required no existe en el modelo, así que dejamos esto vacío
      const programsByRole: Record<string, number> = {}

      setStats({
        total_programs: totalCount,
        active_programs: activePlans,
        programs_by_difficulty: programsByDifficulty,
        programs_by_role: programsByRole, // Vacío ya que el campo no existe
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
      const response = await authenticatedFetch(`admin/workouts/programs/${planId}/`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        // Si el plan ya no existe (o nunca se guardó), forzar refetch para limpiar la lista
        if (response.status === 404) {
          fetchPlans(currentPage, filters)
          return null
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const planDetail = await response.json()
      return planDetail
    } catch (err) {
      return null
    }
  }, [fetchPlans, currentPage, filters])

  // CRUD operations
  const createPlan = async (planData: any): Promise<WorkoutPlan> => {
    const response = await authenticatedFetch('admin/workouts/programs/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(planData),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || errorData.message || `Error ${response.status}`)
    }
    const newPlan = await response.json()

    // Recargar desde la página 1 para asegurar que el nuevo plan aparezca
    // y actualizar las estadísticas inmediatamente
    setCurrentPage(1)
    await Promise.all([
      fetchPlans(1, filters),
      fetchStats()
    ])

    return newPlan
  }

  const updatePlan = async (planId: string, planData: any): Promise<WorkoutPlan> => {
    const response = await authenticatedFetch(`admin/workouts/programs/${planId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(planData),
    })
    if (!response.ok) throw new Error(`Error ${response.status}`)
    const updatedPlan = await response.json()

    // Actualizar lista y estadísticas
    await Promise.all([
      fetchPlans(currentPage, filters),
      fetchStats()
    ])

    return updatedPlan
  }

  const deletePlan = async (planId: string): Promise<void> => {
    const response = await authenticatedFetch(`admin/workouts/programs/${planId}/`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error(`Error ${response.status}`)

    // Actualizar lista y estadísticas
    await Promise.all([
      fetchPlans(currentPage, filters),
      fetchStats()
    ])
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

