// hooks/use-nutrition.ts
// Hook personalizado para gestionar el estado de nutrición

import { useState, useEffect, useCallback } from 'react'
import { nutritionService, NutritionPlan, Meal, MealLog, MealOption } from '@/lib/nutrition-service'
import { useAuth } from '@/contexts/auth-context'
import { toast } from '@/hooks/use-toast'

interface NutritionState {
  currentPlan: NutritionPlan | null
  suggestedMeals: MealOption[]
  dailyStats: {
    totalCalories: number
    totalProtein: number
    totalCarbs: number
    totalFat: number
    mealsCompleted: number
    totalMeals: number
  }
  isLoading: boolean
  error: string | null
}

interface UseNutritionReturn extends NutritionState {
  refreshPlan: () => Promise<void>
  refreshDailyStats: (date: string) => Promise<void>
  markMealCompleted: (mealId: string, date: string, notes?: string) => Promise<boolean>
  createMealLog: (mealData: Partial<MealLog>) => Promise<boolean>
  getFoods: (search?: string) => Promise<any[]>
  changePlan: (defaultPlanId: string) => Promise<boolean>
  getAvailablePlans: () => Promise<any[]>
}

export function useNutrition(): UseNutritionReturn {
  const { user, isAuthenticated } = useAuth()
  const [state, setState] = useState<NutritionState>({
    currentPlan: null,
    suggestedMeals: [],
    dailyStats: {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      mealsCompleted: 0,
      totalMeals: 0
    },
    isLoading: false,
    error: null
  })

  // Cargar plan de nutrición actual
  const loadCurrentPlan = useCallback(async () => {
    if (!isAuthenticated) return

    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const plan = await nutritionService.getCurrentPlan()
      const suggestedMeals = await nutritionService.getSuggestedMeals()
      
      setState(prev => ({
        ...prev,
        currentPlan: plan,
        suggestedMeals,
        isLoading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Error cargando plan de nutrición',
        isLoading: false
      }))
    }
  }, [isAuthenticated])

  // Cargar estadísticas del día
  const loadDailyStats = useCallback(async (date: string) => {
    if (!isAuthenticated) return

    try {
      const stats = await nutritionService.getDailyNutritionStats(date)
      setState(prev => ({
        ...prev,
        dailyStats: stats
      }))
    } catch (error) {
    }
  }, [isAuthenticated])

  // Refrescar plan completo
  const refreshPlan = useCallback(async () => {
    await loadCurrentPlan()
  }, [loadCurrentPlan])

  // Refrescar estadísticas del día
  const refreshDailyStats = useCallback(async (date: string) => {
    await loadDailyStats(date)
  }, [loadDailyStats])

  // Marcar comida como completada
  const markMealCompleted = useCallback(async (mealId: string, date: string, notes?: string): Promise<boolean> => {
    if (!isAuthenticated) return false

    try {
      const result = await nutritionService.markMealCompleted(mealId, date, notes)
      if (result) {
        // Refrescar estadísticas del día
        await loadDailyStats(date)
        
        toast({
          title: "¡Comida completada!",
          description: "Has marcado esta comida como completada exitosamente.",
          variant: "default",
        })
        
        return true
      }
      return false
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo marcar la comida como completada. Inténtalo de nuevo.",
        variant: "destructive",
      })
      return false
    }
  }, [isAuthenticated, loadDailyStats])

  // Crear registro de comida
  const createMealLog = useCallback(async (mealData: Partial<MealLog>): Promise<boolean> => {
    if (!isAuthenticated) return false

    try {
      const result = await nutritionService.createMealLog(mealData)
      if (result) {
        // Refrescar estadísticas si se incluye fecha
        if (mealData.date) {
          await loadDailyStats(mealData.date)
        }
        
        toast({
          title: "Registro creado",
          description: "Se ha creado el registro de comida exitosamente.",
          variant: "default",
        })
        
        return true
      }
      return false
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el registro de comida. Inténtalo de nuevo.",
        variant: "destructive",
      })
      return false
    }
  }, [isAuthenticated, loadDailyStats])

  // Buscar alimentos
  const getFoods = useCallback(async (search?: string): Promise<any[]> => {
    try {
      return await nutritionService.getFoods(search)
    } catch (error) {
      return []
    }
  }, [])

  // Cambiar plan nutricional
  const changePlan = useCallback(async (defaultPlanId: string): Promise<boolean> => {
    if (!isAuthenticated) return false

    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const newPlan = await nutritionService.changePlan(defaultPlanId)
      if (newPlan) {
        setState(prev => ({
          ...prev,
          currentPlan: newPlan,
          isLoading: false
        }))
        
        toast({
          title: "¡Plan actualizado!",
          description: `Has cambiado a "${newPlan.name}" exitosamente.`,
          variant: "default",
        })
        
        return true
      }
      return false
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error al cambiar plan',
        isLoading: false
      }))
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo cambiar el plan. Inténtalo de nuevo.",
        variant: "destructive",
      })
      return false
    }
  }, [isAuthenticated])

  // Obtener planes disponibles
  const getAvailablePlans = useCallback(async (): Promise<any[]> => {
    try {
      return await nutritionService.getAvailablePlans()
    } catch (error) {
      return []
    }
  }, [])

  // Cargar datos iniciales
  useEffect(() => {
    if (isAuthenticated && user) {
      loadCurrentPlan()
      
      // Cargar estadísticas del día actual
      const today = new Date().toISOString().split('T')[0]
      loadDailyStats(today)
    }
  }, [isAuthenticated, user, loadCurrentPlan, loadDailyStats])

  return {
    ...state,
    refreshPlan,
    refreshDailyStats,
    markMealCompleted,
    createMealLog,
    getFoods,
    changePlan,
    getAvailablePlans
  }
}
