import { buildApiUrl } from '@/lib/api'
// hooks/use-admin-workout-plans-optimized.ts - Versión optimizada con paginación del servidor
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'

export interface Exercise {
  id: number
  name: string
  category: string
  muscle_groups: string[]
  instructions: string
  video_url: string
  image_url: string
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
      // Obtener estadísticas del servidor si está disponible, o calcular localmente
      const response = await fetch(buildApiUrl(`workout-plan-templates/?page_size=1`), {
        headers
      })
      
      if (response.ok) {
        const data = await response.json()
        const totalCount = data.count || 0
        
        // Para estadísticas más detalladas, hacer queries adicionales optimizadas
        const stats: WorkoutPlanStats = {
          total_programs: totalCount,
          active_programs: 0, // Se puede calcular desde el filtro
          programs_by_difficulty: {},
          programs_by_role: {},
          recent_programs: 0
        }
        
        setStats(stats)
      }
    } catch (err) {
      console.error('Error calculating stats:', err)
      setStats({
        total_programs: totalCount,
        active_programs: 0,
        programs_by_difficulty: {},
        programs_by_role: {},
        recent_programs: 0
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
  
  // Actualizar stats cuando cambia totalCount
  useEffect(() => {
    if (totalCount > 0) {
      fetchStats()
    }
  }, [totalCount])

  return {
    plans,
    exercises,
    stats,
    loading,
    error,
    currentPage,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
    pageSize,
    filters,
    fetchPlans: (page?: number) => fetchPlans(page || currentPage, filters),
    fetchExercises,
    fetchStats,
    updateFilters,
    changePage,
    refetch: () => { fetchPlans(currentPage, filters); fetchExercises(); fetchStats() }
  }
}

