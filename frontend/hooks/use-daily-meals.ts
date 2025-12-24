'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { nutritionService, MealOption, MealLog } from '@/lib/nutrition-service'
import { dailyMealSelectionsService } from '@/lib/daily-meal-selections-service'
import { useNutrition } from '@/hooks/use-nutrition'
import { getAuthHeaders, buildApiUrl } from '@/lib/api'

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

  // Calcular macros totales (solo de comidas completadas)
  const calculateTotalMacros = useCallback((meals: DailyMeal[], goalMacros?: DailyMacros) => {
    // Solo contar calorías de comidas completadas
    const completedMeals = meals.filter(meal => meal.isCompleted)
    const totalCalories = completedMeals.reduce((sum, meal) => 
      sum + (meal.selectedOption?.calories || 0), 0)
    const totalProtein = completedMeals.reduce((sum, meal) => 
      sum + (meal.selectedOption?.protein || 0), 0)
    const totalCarbs = completedMeals.reduce((sum, meal) => 
      sum + (meal.selectedOption?.carbs || 0), 0)
    const totalFat = completedMeals.reduce((sum, meal) => 
      sum + (meal.selectedOption?.fat || 0), 0)

    // Usar macros personalizados si están disponibles, sino usar los del estado
    const targetMacros = goalMacros || macros

    return {
      caloriesConsumed: totalCalories,
      caloriesGoal: targetMacros.caloriesGoal,
      proteinConsumed: totalProtein,
      proteinGoal: targetMacros.proteinGoal,
      carbsConsumed: totalCarbs,
      carbsGoal: targetMacros.carbsGoal,
      fatConsumed: totalFat,
      fatGoal: targetMacros.fatGoal
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

  // Seleccionar opción de comida (solo planificación, no completada)
  const selectMealOption = useCallback(async (mealId: string, option: MealOption) => {
    console.log('🚀 Seleccionando opción:', { mealId, option })
    
    // Actualizar estado inmediatamente (marcar como no completada por defecto)
    setMeals(prevMeals => {
      console.log('📝 Estado anterior de comidas:', prevMeals.map(m => ({ id: m.id, name: m.name, selected: m.selectedOption?.name })))
      
      const updatedMeals = prevMeals.map(meal => 
        meal.id === mealId 
          ? { ...meal, selectedOption: option, isCompleted: false } // No completada por defecto
          : meal
      )
      
      console.log('📝 Estado actualizado de comidas:', updatedMeals.map(m => ({ id: m.id, name: m.name, selected: m.selectedOption?.name, completed: m.isCompleted })))
      
      // Guardar en localStorage como backup
      saveSelectionsToStorage(updatedMeals)
      
      // Actualizar macros (solo de comidas completadas)
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
            console.log(`💾 Guardando selección en backend: ${meal.name} -> ${mealType} (no completada)`)
            
            // Guardar como MealLog con completed=False
            const headers = await getAuthHeaders()
            
            // Preparar datos para enviar
            const requestData: any = {
              date: today,
              meal_type: mealType,
              calories: option.calories || 0,
              protein: option.protein || 0,
              carbs: option.carbs || 0,
              fat: option.fat || 0,
              completed: false // Solo planificación, no completada
            }
            
            // Solo incluir recipe_id si existe y es válido
            if (option.id && option.id !== 'undefined' && option.id !== 'null') {
              // Si el ID contiene "recipe-" o es un UUID, usarlo directamente
              // Si es un ID numérico, convertirlo a string
              requestData.recipe_id = String(option.id).replace('recipe-', '')
            } else if (option.recipeId) {
              requestData.recipe_id = String(option.recipeId).replace('recipe-', '')
            } else {
              // Si no hay recipe_id, usar custom_description
              requestData.custom_description = option.name || 'Comida seleccionada'
            }
            
            console.log('📤 Enviando datos al backend:', requestData)
            
            const response = await fetch(buildApiUrl('nutrition/daily-meal-selections/'), {
              headers: {
                ...headers,
                'Content-Type': 'application/json; charset=utf-8'
              },
              method: 'POST',
              body: JSON.stringify(requestData)
            })

            if (response.ok) {
              console.log('✅ Selección guardada exitosamente en backend (no completada)')
            } else {
              const errorText = await response.text()
              console.error('❌ Error guardando selección en backend:', response.status, errorText)
              try {
                const errorData = JSON.parse(errorText)
                console.error('Detalles del error:', errorData)
              } catch (e) {
                console.error('Error no es JSON:', errorText)
              }
            }
          }
        }

      } catch (error) {
        console.error('❌ Error sincronizando con backend:', error)
      } finally {
        setSyncing(false)
      }
    }, 100)

  }, [calculateTotalMacros, saveSelectionsToStorage, meals])

  // Marcar comida como completada (solo en vista diaria)
  const markMealCompleted = useCallback(async (mealId: string) => {
    const meal = meals.find(m => m.id === mealId)
    if (!meal || !meal.selectedOption) {
      console.warn('No se puede marcar como completada: no hay opción seleccionada')
      return
    }

    // Actualizar estado inmediatamente
    setMeals(prevMeals => {
      const updatedMeals = prevMeals.map(m => 
        m.id === mealId 
          ? { ...m, isCompleted: true }
          : m
      )
      
      // Actualizar macros (ahora incluye esta comida completada)
      const newMacros = calculateTotalMacros(updatedMeals)
      setMacros(newMacros)
      
      return updatedMeals
    })

    // Actualizar en el backend
    try {
      const today = new Date().toISOString().split('T')[0]
      const mealTypeMapping: Record<string, string> = {
        'Desayuno': 'breakfast',
        'Snack Mañana': 'morning_snack',
        'Almuerzo': 'lunch',
        'Snack Tarde': 'afternoon_snack',
        'Cena': 'dinner'
      }

      const mealType = mealTypeMapping[meal.name]
      if (mealType) {
        const headers = await getAuthHeaders()
        const response = await fetch(buildApiUrl('nutrition/daily-meal-selections/'), {
          headers,
          method: 'POST',
          body: JSON.stringify({
            date: today,
            meal_type: mealType,
            recipe_id: meal.selectedOption.id,
            calories: meal.selectedOption.calories || 0,
            protein: meal.selectedOption.protein || 0,
            carbs: meal.selectedOption.carbs || 0,
            fat: meal.selectedOption.fat || 0,
            completed: true // Ahora sí está completada
          })
        })

        if (response.ok) {
          console.log('✅ Comida marcada como completada en backend')
        } else {
          console.error('❌ Error marcando comida como completada')
        }
      }
    } catch (error) {
      console.error('❌ Error actualizando estado de completado:', error)
    }
  }, [calculateTotalMacros, meals])

  // Cargar selecciones del backend desde MealLog (incluye completadas y no completadas)
  const loadSelectionsFromBackend = useCallback(async (date: string) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${buildApiUrl('nutrition/daily-meal-selections/')}?date=${date}`, {
        headers,
        method: 'GET',
      })

      if (!response.ok) {
        console.error('Error obteniendo selecciones:', response.status)
        return null
      }

      const data = await response.json()
      const selections = data.selections || []
      
      // Mapeo de tipos de comida del backend a nombres en español
      const mealTypeMapping: Record<string, string> = {
        'breakfast': 'Desayuno',
        'morning_snack': 'Snack Mañana',
        'lunch': 'Almuerzo',
        'afternoon_snack': 'Snack Tarde',
        'dinner': 'Cena'
      }

      // Convertir selecciones a formato MealOption
      const selectionsMap: Record<string, MealOption> = {}
      
      selections.forEach((log: any) => {
        const mealName = mealTypeMapping[log.meal_type]
        if (mealName) {
          // Determinar el nombre de la comida - priorizar recipe_name, luego recipe.name, luego custom_description
          let mealNameToShow = 'Sin nombre'
          
          // Primero intentar con recipe_name (viene del serializer)
          if (log.recipe_name) {
            mealNameToShow = log.recipe_name
          }
          // Luego intentar con recipe.name (si recipe es un objeto)
          else if (log.recipe) {
            if (typeof log.recipe === 'object' && log.recipe.name) {
              mealNameToShow = log.recipe.name
            }
          }
          // Finalmente usar custom_description
          if (mealNameToShow === 'Sin nombre' && log.custom_description) {
            mealNameToShow = log.custom_description
          }
          
          console.log(`📋 Cargando selección para ${mealName}:`, {
            recipe_name: log.recipe_name,
            recipe: log.recipe,
            custom_description: log.custom_description,
            nombre_final: mealNameToShow
          })
          
          // Crear MealOption con el nombre correcto
          selectionsMap[mealName] = {
            id: (log.recipe?.id || log.recipe || `custom-${log.id}`).toString(),
            name: mealNameToShow,
            calories: log.calories || (log.recipe?.calories) || 0,
            protein: log.protein || (log.recipe?.protein) || 0,
            carbs: log.carbs || (log.recipe?.carbs) || 0,
            fat: log.fat || (log.recipe?.fat) || 0,
            category: 'balanced',
            icon: '🍽️',
            description: log.recipe?.description || log.custom_description || '',
            cookTime: log.recipe?.prep_time_minutes ? `${log.recipe.prep_time_minutes} min` : '15 min',
            recipeId: log.recipe?.id || log.recipe
          }
        }
      })

      return Object.keys(selectionsMap).length > 0 ? selectionsMap : null
    } catch (error) {
      console.error('Error cargando selecciones del backend:', error)
      return null
    }
  }, [])

  // Aplicar selecciones a las comidas (incluye completadas y no completadas)
  const applySelectionsToMeals = useCallback(async (meals: DailyMeal[], selections: Record<string, MealOption> | null, date: string) => {
    if (selections) {
      // Cargar estado de completado desde el backend
      try {
        const headers = await getAuthHeaders()
        const response = await fetch(`${buildApiUrl('nutrition/daily-meal-selections/')}?date=${date}`, {
          headers,
          method: 'GET',
        })

        if (response.ok) {
          const data = await response.json()
          const logs = data.selections || []
          
          const mealTypeMapping: Record<string, string> = {
            'breakfast': 'Desayuno',
            'morning_snack': 'Snack Mañana',
            'lunch': 'Almuerzo',
            'afternoon_snack': 'Snack Tarde',
            'dinner': 'Cena'
          }

          const completedMap: Record<string, boolean> = {}
          logs.forEach((log: any) => {
            const mealName = mealTypeMapping[log.meal_type]
            if (mealName) {
              completedMap[mealName] = log.completed || false
            }
          })

          return meals.map(meal => {
            const selection = selections[meal.name]
            if (selection) {
              return { 
                ...meal, 
                selectedOption: selection, 
                isCompleted: completedMap[meal.name] || false 
              }
            }
            return meal
          })
        }
      } catch (error) {
        console.error('Error cargando estado de completado:', error)
      }

      // Fallback: mostrar selecciones pero marcarlas como no completadas
      return meals.map(meal => {
        const selection = selections[meal.name]
        if (selection) {
          // Asegurarse de que el nombre esté presente
          const mealOption = {
            ...selection,
            name: selection.name || 'Sin nombre'
          }
          return { ...meal, selectedOption: mealOption, isCompleted: false }
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

  // Cargar datos iniciales (solo una vez al montar o cuando cambie el plan)
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    let isMounted = true
    setLoading(true)
    
    const loadData = async () => {
      try {
        // Primero cargar opciones del plan
        await loadPlanMealOptions()
        
        if (!isMounted) return
        
        // Generar comidas del día
        const dailyMeals = generateDailyMeals()
        const today = new Date().toISOString().split('T')[0]
        
        // Intentar cargar desde el backend primero
        const backendSelections = await loadSelectionsFromBackend(today)
        
        if (!isMounted) return
        
        if (backendSelections) {
          // Usar selecciones del backend (incluye completadas y no completadas)
          const mealsWithBackendSelections = await applySelectionsToMeals(dailyMeals, backendSelections, today)
          setMeals(mealsWithBackendSelections)
          
          // Calcular macros solo de comidas completadas
          const completedMeals = mealsWithBackendSelections.filter(m => m.isCompleted)
          const initialMacros = calculateTotalMacros(completedMeals)
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
        if (!isMounted) return
        // Fallback: usar solo comidas sin selecciones
        const fallbackMeals = generateDailyMeals()
        setMeals(fallbackMeals)
        const initialMacros = calculateTotalMacros(fallbackMeals)
        setMacros(initialMacros)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadData()
    
    return () => {
      isMounted = false
    }
  }, [isAuthenticated, currentPlan?.id]) // Solo cuando cambie el ID del plan, no el objeto completo

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
        const mealsWithSelections = await applySelectionsToMeals(dailyMeals, backendSelections, today)
        
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
