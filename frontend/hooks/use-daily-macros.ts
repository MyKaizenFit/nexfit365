'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { userService } from '@/lib/user-service'

interface DailyMacros {
  caloriesConsumed: number
  caloriesGoal: number
  proteinConsumed: number
  proteinGoal: number
  carbsConsumed: number
  carbsGoal: number
  fatConsumed: number
  fatGoal: number
}

export function useDailyMacros() {
  const { isAuthenticated } = useAuth()
  const [macros, setMacros] = useState<DailyMacros>({
    caloriesConsumed: 0,
    caloriesGoal: 2000,
    proteinConsumed: 0,
    proteinGoal: 150,
    carbsConsumed: 0,
    carbsGoal: 220,
    fatConsumed: 0,
    fatGoal: 80
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      fetchDailyMacros()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated])

  const fetchDailyMacros = async () => {
    try {
      setLoading(true)
      setError(null)

      // Obtener estadísticas del usuario
      const userStats = await userService.getUserStats()
      
      // Obtener plan nutricional actual
      const nutritionPlan = await userService.getCurrentNutritionPlan()
      
      // Calcular macros del día
      const dailyMacros: DailyMacros = {
        caloriesConsumed: userStats.caloriesToday || 0,
        caloriesGoal: nutritionPlan?.daily_calories || 2000,
        proteinConsumed: userStats.proteinToday || 0,
        proteinGoal: nutritionPlan?.protein_goal || 150,
        carbsConsumed: userStats.carbsToday || 0,
        carbsGoal: nutritionPlan?.carbs_goal || 220,
        fatConsumed: userStats.fatToday || 0,
        fatGoal: nutritionPlan?.fat_goal || 80
      }

      setMacros(dailyMacros)
    } catch (err) {
      console.error('Error fetching daily macros:', err)
      setError(err instanceof Error ? err.message : 'Error al obtener macros')
      
      // Usar datos por defecto si falla
      setMacros({
        caloriesConsumed: 0,
        caloriesGoal: 2000,
        proteinConsumed: 0,
        proteinGoal: 150,
        carbsConsumed: 0,
        carbsGoal: 220,
        fatConsumed: 0,
        fatGoal: 80
      })
    } finally {
      setLoading(false)
    }
  }

  const refreshMacros = () => {
    fetchDailyMacros()
  }

  return {
    macros,
    loading,
    error,
    refreshMacros
  }
}
