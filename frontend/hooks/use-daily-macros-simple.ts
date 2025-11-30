'use client'

import { useState, useEffect } from 'react'

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

export function useDailyMacrosSimple() {
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

  useEffect(() => {
    // Simular carga de datos
    const timer = setTimeout(() => {
      setMacros({
        caloriesConsumed: 1785,
        caloriesGoal: 2000,
        proteinConsumed: 120,
        proteinGoal: 150,
        carbsConsumed: 180,
        carbsGoal: 220,
        fatConsumed: 65,
        fatGoal: 80
      })
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const refreshMacros = () => {
    setLoading(true)
    setTimeout(() => {
      setMacros({
        caloriesConsumed: Math.floor(Math.random() * 2000),
        caloriesGoal: 2000,
        proteinConsumed: Math.floor(Math.random() * 150),
        proteinGoal: 150,
        carbsConsumed: Math.floor(Math.random() * 220),
        carbsGoal: 220,
        fatConsumed: Math.floor(Math.random() * 80),
        fatGoal: 80
      })
      setLoading(false)
    }, 500)
  }

  return {
    macros,
    loading,
    refreshMacros
  }
}
