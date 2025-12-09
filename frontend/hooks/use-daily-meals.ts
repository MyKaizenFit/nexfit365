'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { nutritionService, MealOption, MealLog } from '@/lib/nutrition-service'
import { dailyMealSelectionsService } from '@/lib/daily-meal-selections-service'
import { useNutrition } from '@/hooks/use-nutrition'

interface DailyMeal {
  id: string
  name: string
  time: string
  description: string
  icon: string
  selectedOption: MealOption | null
  isCompleted: boolean
}

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

export function useDailyMeals() {
  const { isAuthenticated } = useAuth()
  const { currentPlan } = useNutrition()
  const [meals, setMeals] = useState<DailyMeal[]>([])
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
  const [syncing, setSyncing] = useState(false)
  const [planMealOptions, setPlanMealOptions] = useState<Record<string, MealOption[]>>({})

  // Estructura de comidas del día
  const mealTimes = {
    breakfast: "08:00",
    snack1: "10:30", 
    lunch: "13:00",
    snack2: "16:00",
    dinner: "20:00"
  }

  // Opciones de comidas por defecto
  const defaultMealOptions: Record<string, MealOption[]> = {
    breakfast: [
      {
        id: "breakfast-1",
        name: "Porridge de avena + plátano + PB + whey",
        calories: 450,
        protein: 25,
        carbs: 45,
        fat: 18,
        category: "balanced",
        icon: "🥗",
        description: "Desayuno energético para comenzar el día"
      },
      {
        id: "breakfast-2",
        name: "Huevos revueltos + pan integral + aguacate",
        calories: 380,
        protein: 22,
        carbs: 35,
        fat: 20,
        category: "protein-rich",
        icon: "🍗",
        description: "Desayuno rico en proteínas"
      }
    ],
    snack1: [
      {
        id: "snack1-1",
        name: "Yogur griego + frutos secos + miel",
        calories: 280,
        protein: 18,
        carbs: 25,
        fat: 15,
        category: "protein-rich",
        icon: "🥜",
        description: "Snack proteico para media mañana"
      },
      {
        id: "snack1-2",
        name: "Manzana + almendras + té verde",
        calories: 200,
        protein: 8,
        carbs: 30,
        fat: 12,
        category: "light",
        icon: "🍎",
        description: "Snack ligero y nutritivo"
      }
    ],
    lunch: [
      {
        id: "lunch-1",
        name: "Pollo a la plancha + arroz integral + verduras",
        calories: 520,
        protein: 35,
        carbs: 55,
        fat: 18,
        category: "balanced",
        icon: "🍗",
        description: "Comida principal del día"
      },
      {
        id: "lunch-2",
        name: "Salmón + quinoa + brócoli",
        calories: 480,
        protein: 32,
        carbs: 45,
        fat: 22,
        category: "protein-rich",
        icon: "🐟",
        description: "Opción rica en omega-3"
      }
    ],
    snack2: [
      {
        id: "snack2-1",
        name: "Batido de proteína + plátano + leche",
        calories: 320,
        protein: 28,
        carbs: 35,
        fat: 8,
        category: "protein-rich",
        icon: "🥛",
        description: "Recupera fuerzas para la tarde"
      },
      {
        id: "snack2-2",
        name: "Hummus + zanahorias + galletas integrales",
        calories: 250,
        protein: 8,
        carbs: 35,
        fat: 10,
        category: "light",
        icon: "🥕",
        description: "Snack saludable y saciante"
      }
    ],
    dinner: [
      {
        id: "dinner-1",
        name: "Ensalada de atún + aguacate + huevo",
        calories: 380,
        protein: 30,
        carbs: 15,
        fat: 25,
        category: "protein-rich",
        icon: "🥗",
        description: "Termina el día de forma ligera"
      },
      {
        id: "dinner-2",
        name: "Sopa de verduras + pechuga de pavo",
        calories: 320,
        protein: 28,
        carbs: 20,
        fat: 12,
        category: "light",
        icon: "🍲",
        description: "Cena ligera y nutritiva"
      }
    ]
  }

  // Generar comidas del día
  const generateDailyMeals = useCallback(() => {
    const mealNames = ["Desayuno", "Snack Mañana", "Almuerzo", "Snack Tarde", "Cena"]
    const mealKeys = Object.keys(mealTimes)
    
    return mealNames.map((name, index) => ({
      id: `meal-${index + 1}`,
      name,
      time: mealTimes[mealKeys[index] as keyof typeof mealTimes] || "12:00",
      description: getMealDescription(name),
      icon: getMealIcon(name),
      selectedOption: null,
      isCompleted: false
    }))
  }, [])

  // Obtener descripción de la comida
  const getMealDescription = (mealName: string): string => {
    const descriptions: Record<string, string> = {
      "Desayuno": "Comienza el día con energía",
      "Snack Mañana": "Mantén el metabolismo activo",
      "Almuerzo": "Comida principal del día",
      "Snack Tarde": "Recupera fuerzas para la tarde",
      "Cena": "Termina el día de forma ligera"
    }
    return descriptions[mealName] || "Comida del día"
  }

  // Obtener icono de la comida
  const getMealIcon = (mealName: string): string => {
    const icons: Record<string, string> = {
      "Desayuno": "🌅",
      "Snack Mañana": "☕",
      "Almuerzo": "🍽️",
      "Snack Tarde": "🍎",
      "Cena": "🌙"
    }
    return icons[mealName] || "🍽️"
  }

  // Calcular macros totales
  const calculateTotalMacros = useCallback((meals: DailyMeal[]) => {
    const totalCalories = meals.reduce((sum, meal) => 
      sum + (meal.selectedOption?.calories || 0), 0)
    const totalProtein = meals.reduce((sum, meal) => 
      sum + (meal.selectedOption?.protein || 0), 0)
    const totalCarbs = meals.reduce((sum, meal) => 
      sum + (meal.selectedOption?.carbs || 0), 0)
    const totalFat = meals.reduce((sum, meal) => 
      sum + (meal.selectedOption?.fat || 0), 0)

    console.log('Calculando macros:', {
      meals: meals.map(m => ({ name: m.name, selected: m.selectedOption?.name, calories: m.selectedOption?.calories })),
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat
    })

    return {
      caloriesConsumed: totalCalories,
      caloriesGoal: macros.caloriesGoal,
      proteinConsumed: totalProtein,
      proteinGoal: macros.proteinGoal,
      carbsConsumed: totalCarbs,
      carbsGoal: macros.carbsGoal,
      fatConsumed: totalFat,
      fatGoal: macros.fatGoal
    }
  }, [macros])

  // Guardar selecciones en localStorage como backup
  const saveSelectionsToStorage = useCallback((meals: DailyMeal[]) => {
    if (typeof window !== 'undefined') {
      const today = new Date().toISOString().split('T')[0]
      const selections = meals.reduce((acc, meal) => {
        if (meal.selectedOption) {
          acc[meal.id] = {
            mealId: meal.id,
            optionId: meal.selectedOption.id,
            option: meal.selectedOption
          }
        }
        return acc
      }, {} as Record<string, any>)
      
      localStorage.setItem(`meal-selections-${today}`, JSON.stringify(selections))
      console.log('Selecciones guardadas en localStorage (backup):', selections)
    }
  }, [])

  // Cargar selecciones desde localStorage como backup
  const loadSelectionsFromStorage = useCallback((meals: DailyMeal[]) => {
    if (typeof window !== 'undefined') {
      const today = new Date().toISOString().split('T')[0]
      const stored = localStorage.getItem(`meal-selections-${today}`)
      
      if (stored) {
        try {
          const selections = JSON.parse(stored)
          console.log('Selecciones cargadas desde localStorage (backup):', selections)
          
          return meals.map(meal => {
            const selection = selections[meal.id]
            if (selection && selection.option) {
              return { ...meal, selectedOption: selection.option, isCompleted: true }
            }
            return meal
          })
        } catch (error) {
          console.error('Error cargando selecciones del localStorage:', error)
        }
      }
    }
    return meals
  }, [])

  // Seleccionar opción de comida
  const selectMealOption = useCallback(async (mealId: string, option: MealOption) => {
    console.log('🚀 Seleccionando opción:', { mealId, option })
    
    // Actualizar estado inmediatamente
    setMeals(prevMeals => {
      console.log('📝 Estado anterior de comidas:', prevMeals.map(m => ({ id: m.id, name: m.name, selected: m.selectedOption?.name })))
      
      const updatedMeals = prevMeals.map(meal => 
        meal.id === mealId 
          ? { ...meal, selectedOption: option, isCompleted: true }
          : meal
      )
      
      console.log('📝 Estado actualizado de comidas:', updatedMeals.map(m => ({ id: m.id, name: m.name, selected: m.selectedOption?.name })))
      
      // Guardar en localStorage como backup
      saveSelectionsToStorage(updatedMeals)
      
      // Actualizar macros
      const newMacros = calculateTotalMacros(updatedMeals)
      console.log('📊 Nuevos macros calculados:', newMacros)
      setMacros(newMacros)
      
      return updatedMeals
    })

    // Sincronizar con el backend (en segundo plano)
    setTimeout(async () => {
      try {
        setSyncing(true)
        const today = new Date().toISOString().split('T')[0]
        
        // Crear mapeo de tipos de comida para el backend
        const mealTypeMapping: Record<string, string> = {
          'Desayuno': 'breakfast',
          'Snack Mañana': 'morning_snack',
          'Almuerzo': 'lunch',
          'Snack Tarde': 'afternoon_snack',
          'Cena': 'dinner'
        }

        // Encontrar el nombre de la comida
        const meal = meals.find(m => m.id === mealId)
        if (meal) {
          const mealType = mealTypeMapping[meal.name]
          if (mealType) {
            console.log(`💾 Guardando en backend: ${meal.name} -> ${mealType}`)
            const result = await dailyMealSelectionsService.saveMealSelection({
              date: today,
              meal_type: mealType,
              selected_option: option,
              notes: `Seleccionado: ${option.name}`
            })

            if (result) {
              console.log('✅ Selección guardada exitosamente en backend:', result)
            } else {
              console.error('❌ Error guardando selección en backend')
            }
          }
        }

        // También crear un MealLog para compatibilidad
        await nutritionService.createMealLog({
          date: today,
          completed: true,
          notes: `Seleccionado: ${option.name}`,
        })

      } catch (error) {
        console.error('❌ Error sincronizando con backend:', error)
      } finally {
        setSyncing(false)
      }
    }, 100)

  }, [calculateTotalMacros, saveSelectionsToStorage, meals])

  // Marcar comida como completada
  const markMealCompleted = useCallback((mealId: string) => {
    setMeals(prevMeals => {
      const updatedMeals = prevMeals.map(meal => 
        meal.id === mealId 
          ? { ...meal, isCompleted: true }
          : meal
      )
      
      // Actualizar macros si no hay opción seleccionada
      const newMacros = calculateTotalMacros(updatedMeals)
      setMacros(newMacros)
      
      return updatedMeals
    })
  }, [calculateTotalMacros])

  // Cargar selecciones del backend
  const loadSelectionsFromBackend = useCallback(async (date: string) => {
    try {
      console.log('Cargando selecciones del backend para:', date)
      const backendSelections = await dailyMealSelectionsService.loadSelectionsFromBackend(date)
      
      if (Object.keys(backendSelections).length > 0) {
        console.log('Selecciones encontradas en backend:', backendSelections)
        return backendSelections
      } else {
        console.log('No se encontraron selecciones en backend, usando localStorage como backup')
        return null
      }
    } catch (error) {
      console.error('Error cargando selecciones del backend:', error)
      return null
    }
  }, [])

  // Aplicar selecciones a las comidas
  const applySelectionsToMeals = useCallback((meals: DailyMeal[], selections: Record<string, MealOption> | null) => {
    if (selections) {
      return meals.map(meal => {
        const selection = selections[meal.name]
        if (selection) {
          return { ...meal, selectedOption: selection, isCompleted: true }
        }
        return meal
      })
    }
    return meals
  }, [])

  // Cargar opciones de comidas del plan activo
  const loadPlanMealOptions = useCallback(async () => {
    try {
      const planMeals = await nutritionService.getPlanMealsForSelection()
      if (planMeals && planMeals.meals_by_type) {
        setPlanMealOptions(planMeals.meals_by_type)
        
        // Actualizar macros con valores personalizados del backend
        if (planMeals.daily_calories_target && planMeals.daily_macros) {
          setMacros(prev => ({
            ...prev,
            caloriesGoal: planMeals.daily_calories_target!,
            proteinGoal: planMeals.daily_macros!.protein,
            carbsGoal: planMeals.daily_macros!.carbs,
            fatGoal: planMeals.daily_macros!.fat
          }))
          console.log('✅ Macros personalizados actualizados:', {
            calories: planMeals.daily_calories_target,
            protein: planMeals.daily_macros.protein,
            carbs: planMeals.daily_macros.carbs,
            fat: planMeals.daily_macros.fat
          })
        } else if (currentPlan && currentPlan.daily_calories && currentPlan.target_macros) {
          // Fallback a valores del plan si no hay personalización
          setMacros(prev => ({
            ...prev,
            caloriesGoal: currentPlan.daily_calories,
            proteinGoal: currentPlan.target_macros.protein || prev.proteinGoal,
            carbsGoal: currentPlan.target_macros.carbs || prev.carbsGoal,
            fatGoal: currentPlan.target_macros.fat || prev.fatGoal
          }))
        }
      } else {
        // Fallback a opciones por defecto
        setPlanMealOptions(defaultMealOptions)
      }
    } catch (error) {
      console.error('Error cargando opciones del plan:', error)
      // Fallback a opciones por defecto
      setPlanMealOptions(defaultMealOptions)
    }
  }, [currentPlan])

  // Cargar opciones del plan cuando cambie el plan activo
  useEffect(() => {
    if (isAuthenticated) {
      loadPlanMealOptions()
    }
  }, [isAuthenticated, currentPlan, loadPlanMealOptions])

  // Cargar datos iniciales
  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true)
      
      const loadData = async () => {
        try {
          // Primero cargar opciones del plan
          await loadPlanMealOptions()
          
          // Generar comidas del día
          const dailyMeals = generateDailyMeals()
          const today = new Date().toISOString().split('T')[0]
          
          // Intentar cargar desde el backend primero
          const backendSelections = await loadSelectionsFromBackend(today)
          
          if (backendSelections) {
            // Usar selecciones del backend
            const mealsWithBackendSelections = applySelectionsToMeals(dailyMeals, backendSelections)
            setMeals(mealsWithBackendSelections)
            
            // Calcular macros
            const initialMacros = calculateTotalMacros(mealsWithBackendSelections)
            setMacros(initialMacros)
            
            // Sincronizar localStorage con backend
            saveSelectionsToStorage(mealsWithBackendSelections)
          } else {
            // Usar localStorage como backup
            const mealsWithLocalSelections = loadSelectionsFromStorage(dailyMeals)
            setMeals(mealsWithLocalSelections)
            
            // Calcular macros
            const initialMacros = calculateTotalMacros(mealsWithLocalSelections)
            setMacros(initialMacros)
          }
        } catch (error) {
          console.error('Error cargando datos iniciales:', error)
          // Fallback: usar solo comidas sin selecciones
          const fallbackMeals = generateDailyMeals()
          setMeals(fallbackMeals)
          const initialMacros = calculateTotalMacros(fallbackMeals)
          setMacros(initialMacros)
        } finally {
          setLoading(false)
        }
      }

      loadData()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, generateDailyMeals, calculateTotalMacros, loadSelectionsFromBackend, applySelectionsToMeals, saveSelectionsToStorage, loadSelectionsFromStorage, loadPlanMealOptions])

  // Obtener opciones para una comida específica
  const getMealOptions = useCallback((mealName: string): MealOption[] => {
    // Mapeo de nombres a tipos de comida del backend
    const mealTypeMap: Record<string, string> = {
      "Desayuno": "breakfast",
      "Snack Mañana": "morning_snack",
      "Almuerzo": "lunch",
      "Snack Tarde": "afternoon_snack",
      "Cena": "dinner"
    }
    
    const mealType = mealTypeMap[mealName] || "breakfast"
    
    // Si hay opciones del plan, usarlas; si no, usar las por defecto
    if (planMealOptions[mealType] && planMealOptions[mealType].length > 0) {
      return planMealOptions[mealType]
    }
    
    // Fallback a opciones hardcodeadas si no hay plan
    const mealKey = mealName === "Desayuno" ? "breakfast" :
                   mealName === "Snack Mañana" ? "snack1" :
                   mealName === "Almuerzo" ? "lunch" :
                   mealName === "Snack Tarde" ? "snack2" :
                   mealName === "Cena" ? "dinner" : "breakfast"
    
    return defaultMealOptions[mealKey] || []
  }, [planMealOptions])

  // Refrescar datos
  const refreshData = useCallback(async () => {
    if (isAuthenticated) {
      setLoading(true)
      try {
        const dailyMeals = generateDailyMeals()
        const today = new Date().toISOString().split('T')[0]
        
        // Cargar desde backend
        const backendSelections = await loadSelectionsFromBackend(today)
        const mealsWithSelections = applySelectionsToMeals(dailyMeals, backendSelections)
        
        setMeals(mealsWithSelections)
        const initialMacros = calculateTotalMacros(mealsWithSelections)
        setMacros(initialMacros)
        
        // Sincronizar localStorage
        saveSelectionsToStorage(mealsWithSelections)
      } catch (error) {
        console.error('Error refrescando datos:', error)
        // Fallback a localStorage
        const dailyMeals = generateDailyMeals()
        const mealsWithLocalSelections = loadSelectionsFromStorage(dailyMeals)
        setMeals(mealsWithLocalSelections)
        const initialMacros = calculateTotalMacros(mealsWithLocalSelections)
        setMacros(initialMacros)
      } finally {
        setLoading(false)
      }
    }
  }, [isAuthenticated, generateDailyMeals, calculateTotalMacros, loadSelectionsFromBackend, applySelectionsToMeals, saveSelectionsToStorage, loadSelectionsFromStorage])

  return {
    meals,
    macros,
    loading,
    error,
    syncing,
    selectMealOption,
    markMealCompleted,
    getMealOptions,
    refreshData
  }
}
