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
  mealType: string
  selectedOption: MealOption | null
  isCompleted: boolean
  isSkipped?: boolean
  skipReason?: string | null
  mealLogId?: string | null
  photo?: string | null
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
  type PlanMealSlot = {
    id: string
    name: string
    time: string | null
    description?: string
    meal_type: string
    order_index?: number
  }

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
  const [planMealSlots, setPlanMealSlots] = useState<PlanMealSlot[]>([])
  const [planOptionsByMealId, setPlanOptionsByMealId] = useState<Record<string, MealOption[]>>({})
  const [logMetaByKey, setLogMetaByKey] = useState<Record<string, {
    id: string
    photo: string | null
    isSkipped: boolean
    skipReason: string | null
  }>>({})

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

  const mealTypeToIcon = (mealType: string): string => {
    const icons: Record<string, string> = {
      breakfast: "🌅",
      morning_snack: "☕",
      lunch: "🍽️",
      afternoon_snack: "🍎",
      dinner: "🌙",
      evening_snack: "🌜",
      pre_workout: "⚡",
      post_workout: "💪",
      other: "🍽️",
    }
    return icons[mealType] || "🍽️"
  }

  // Generar comidas del día (dinámico según el plan del usuario)
  const generateDailyMeals = useCallback((slotOverrides?: PlanMealSlot[]) => {
    const slots = Array.isArray(slotOverrides) && slotOverrides.length > 0 ? slotOverrides : planMealSlots

    // Si el backend devolvió slots, respetarlos (nº variable y tipos variables)
    if (Array.isArray(slots) && slots.length > 0) {
      const sorted = [...slots].sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      return sorted.map((m) => ({
        id: String(m.id),
        name: m.name,
        time: (m.time || "12:00").slice(0, 5),
        description: m.description || "",
        icon: mealTypeToIcon(m.meal_type),
        mealType: m.meal_type,
        selectedOption: null,
        isCompleted: false,
        isSkipped: false,
        skipReason: null,
      }))
    }

    // Fallback: estructura fija de 5 comidas
    const mealNames = ["Desayuno", "Snack Mañana", "Almuerzo", "Snack Tarde", "Cena"]
    const mealKeys = Object.keys(mealTimes)
    return mealNames.map((name, index) => ({
      id: `meal-${index + 1}`,
      name,
      time: mealTimes[mealKeys[index] as keyof typeof mealTimes] || "12:00",
      description: getMealDescription(name),
      icon: getMealIcon(name),
      mealType: (() => {
        const map: Record<string, string> = {
          "Desayuno": "breakfast",
          "Snack Mañana": "morning_snack",
          "Almuerzo": "lunch",
          "Snack Tarde": "afternoon_snack",
          "Cena": "dinner",
        }
        return map[name] || "breakfast"
      })(),
      selectedOption: null,
      isCompleted: false,
      isSkipped: false,
      skipReason: null,
    }))
  }, [planMealSlots])

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
    const totalCalories = completedMeals.reduce((sum, meal) => {
      const calories = Number(meal.selectedOption?.calories) || 0
      return sum + calories
    }, 0)
    const totalProtein = completedMeals.reduce((sum, meal) => {
      const protein = Number(meal.selectedOption?.protein) || 0
      return sum + protein
    }, 0)
    const totalCarbs = completedMeals.reduce((sum, meal) => {
      const carbs = Number(meal.selectedOption?.carbs) || 0
      return sum + carbs
    }, 0)
    const totalFat = completedMeals.reduce((sum, meal) => {
      const fat = Number(meal.selectedOption?.fat) || 0
      return sum + fat
    }, 0)

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
    }
  }, [planMealOptions, planOptionsByMealId])

  // Cargar selecciones desde localStorage como backup
  const loadSelectionsFromStorage = useCallback((meals: DailyMeal[]) => {
    if (typeof window !== 'undefined') {
      const today = new Date().toISOString().split('T')[0]
      const stored = localStorage.getItem(`meal-selections-${today}`)
      
      if (stored) {
        try {
          const selections = JSON.parse(stored)
          
          // Validar que selections sea un objeto válido
          if (!selections || typeof selections !== 'object' || Array.isArray(selections)) {
            localStorage.removeItem(`meal-selections-${today}`)
            return meals
          }
          
          
          return meals.map(meal => {
            const selection = selections[meal.id]
            if (selection && selection.option && typeof selection.option === 'object') {
              // Validar que la opción tenga la estructura correcta
              if (selection.option.id && selection.option.name) {
                return { ...meal, selectedOption: selection.option, isCompleted: true }
              }
            }
            return meal
          })
        } catch (error) {
          // Limpiar datos corruptos
          try {
            localStorage.removeItem(`meal-selections-${today}`)
          } catch (e) {
          }
        }
      }
    }
    return meals
  }, [])

  // Seleccionar opción de comida (solo planificación, no completada)
  const selectMealOption = useCallback(async (mealId: string, option: MealOption) => {
    
    // Actualizar estado inmediatamente (marcar como no completada por defecto)
    setMeals(prevMeals => {
      
      const updatedMeals = prevMeals.map(meal => 
        meal.id === mealId 
          ? { ...meal, selectedOption: option, isCompleted: true, isSkipped: false, skipReason: null } // Seleccionar = completar
          : meal
      )
      
      
      // Guardar en localStorage como backup
      saveSelectionsToStorage(updatedMeals)
      
      // Actualizar macros (comidas completadas al seleccionar)
      const newMacros = calculateTotalMacros(updatedMeals)
      setMacros(newMacros)
      
      return updatedMeals
    })

    // Sincronizar con el backend (en segundo plano)
    setTimeout(async () => {
      try {
        setSyncing(true)
        const today = new Date().toISOString().split('T')[0]

        // Encontrar la comida seleccionada (dinámico: viene del plan)
        const meal = meals.find(m => m.id === mealId)
        if (meal) {
          const mealType = meal.mealType
          if (mealType) {
            
            // Guardar como MealLog con completed=False
            const headers = await getAuthHeaders()
            
            // Preparar datos para enviar
            const requestData: any = {
              date: today,
              meal_type: mealType,
              // Si el id de la comida viene del plan (UUID), enviarlo para identificar el slot
              plan_meal_id: meal.id && !String(meal.id).startsWith('meal-') ? meal.id : undefined,
              calories: option.calories || 0,
              protein: option.protein || 0,
              carbs: option.carbs || 0,
              fat: option.fat || 0,
              skip_meal: false,
              completed: true, // Seleccionar = marcar como completada directamente
              custom_description: option.customDescription || option.name || 'Comida seleccionada',
              substitution_details: option.substitution_details || []
            }
            
            // Preferir recipeId (viene explícito del backend). Evita enviar IDs compuestos tipo "meal-...-recipe-...".
            if (option.recipeId) {
              requestData.recipe_id = String(option.recipeId)
            } else if (option.id && String(option.id).includes('recipe-')) {
              requestData.recipe_id = String(option.id).split('recipe-').pop()
            } else {
              // Si no hay recipe_id, usar custom_description
              requestData.custom_description = option.customDescription || option.name || 'Comida seleccionada'
            }
            
            
            const response = await fetch(buildApiUrl('nutrition/daily-meal-selections/'), {
              headers: {
                ...headers,
                'Content-Type': 'application/json; charset=utf-8'
              },
              method: 'POST',
              body: JSON.stringify(requestData)
            })

            if (response.ok) {
            } else {
              const errorText = await response.text()
              try {
                const errorData = JSON.parse(errorText)
              } catch (e) {
              }
            }
          }
        }

      } catch (error) {
      } finally {
        setSyncing(false)
      }
    }, 100)

  }, [calculateTotalMacros, saveSelectionsToStorage, meals])

  const deselectMealOption = useCallback(async (mealId: string) => {
    const meal = meals.find(m => m.id === mealId)

    setMeals(prevMeals => {
      const updatedMeals = prevMeals.map(currentMeal =>
        currentMeal.id === mealId
          ? { ...currentMeal, selectedOption: null, isCompleted: false, isSkipped: false, skipReason: null, photo: null, mealLogId: null }
          : currentMeal
      )
      saveSelectionsToStorage(updatedMeals)
      setMacros(calculateTotalMacros(updatedMeals))
      return updatedMeals
    })

    if (!meal?.mealType) return

    try {
      setSyncing(true)
      const today = new Date().toISOString().split('T')[0]
      const headers = await getAuthHeaders()
      const params = new URLSearchParams({ date: today })
      if (meal.id && !String(meal.id).startsWith('meal-')) {
        params.set('plan_meal_id', String(meal.id))
      } else {
        params.set('meal_type', meal.mealType)
      }

      await fetch(`${buildApiUrl('nutrition/daily-meal-selections/')}?${params.toString()}`, {
        headers,
        method: 'DELETE',
      })
    } finally {
      setSyncing(false)
    }
  }, [calculateTotalMacros, meals, saveSelectionsToStorage])

  // Cargar selecciones del backend desde MealLog (incluye completadas y no completadas)
  const loadSelectionsFromBackend = useCallback(async (date: string) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${buildApiUrl('nutrition/daily-meal-selections/')}?date=${date}`, {
        headers,
        method: 'GET',
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      const selections = data.selections || []

      // Convertir selecciones a formato MealOption
      const selectionsMap: Record<string, MealOption> = {}
      
      const nextMetaByKey: Record<string, {
        id: string
        photo: string | null
        isSkipped: boolean
        skipReason: string | null
      }> = {}

      selections.forEach((log: any) => {
        const mealType = String(log.meal_type || '')
        const key = String(log.plan_meal_id || mealType)
        if (key) {
          const optionsForMeal = (planOptionsByMealId[key] || planMealOptions[mealType] || []) as MealOption[]
          const fallbackOption = optionsForMeal.find((opt) => {
            const optRecipeId = opt?.recipeId != null ? String(opt.recipeId) : null
            const logRecipeId = log?.recipe?.id != null ? String(log.recipe.id) : (log?.recipe ? String(log.recipe) : null)
            if (optRecipeId && logRecipeId) return optRecipeId === logRecipeId
            return opt?.name && log?.custom_description && String(opt.name) === String(log.custom_description)
          })

          // Determinar el nombre de la comida - priorizar recipe_name, luego recipe.name, luego custom_description
          let mealNameToShow = 'Sin nombre'
          
          // Primero intentar con recipe_name (viene del serializer)
          if (log.recipe_name && log.recipe_name.trim() !== '') {
            mealNameToShow = log.recipe_name
          }
          // Luego intentar con recipe.name (si recipe es un objeto)
          else if (log.recipe) {
            if (typeof log.recipe === 'object' && log.recipe.name && log.recipe.name.trim() !== '') {
              mealNameToShow = log.recipe.name
            }
          }
          // Finalmente usar custom_description
          if (mealNameToShow === 'Sin nombre' && log.custom_description && log.custom_description.trim() !== '') {
            mealNameToShow = log.custom_description
          }
          
          // Si aún no hay nombre, usar un nombre genérico basado en el tipo de comida
          if (mealNameToShow === 'Sin nombre') {
            mealNameToShow = `${mealType} - Comida personalizada`
          }

          if (mealNameToShow === 'Sin nombre' && fallbackOption?.name) {
            mealNameToShow = fallbackOption.name
          }
          
          // Crear MealOption con el nombre correcto
          // Asegurar que los valores nutricionales sean números, no null/undefined
          const calories = Number(log.calories) || Number(log.recipe?.calories) || Number(fallbackOption?.calories) || 0
          const protein = Number(log.protein) || Number(log.recipe?.protein) || Number(fallbackOption?.protein) || 0
          const carbs = Number(log.carbs) || Number(log.recipe?.carbs) || Number(fallbackOption?.carbs) || 0
          const fat = Number(log.fat) || Number(log.recipe?.fat) || Number(fallbackOption?.fat) || 0
          
          selectionsMap[key] = {
            id: (log.recipe?.id || log.recipe || `custom-${log.id}`).toString(),
            name: mealNameToShow,
            calories: calories,
            protein: protein,
            carbs: carbs,
            fat: fat,
            imageUrl: log.recipe?.image_url || fallbackOption?.imageUrl || '',
            category: 'balanced',
            icon: fallbackOption?.icon || '🍽️',
            description: log.recipe?.description || log.custom_description || fallbackOption?.description || '',
            cookTime: log.recipe?.prep_time_minutes ? `${log.recipe.prep_time_minutes} min` : '15 min',
            recipeId: log.recipe?.id || log.recipe || fallbackOption?.recipeId,
            customDescription: log.custom_description || '',
            substitution_details: Array.isArray(log.substitution_details) ? log.substitution_details : []
          }

          nextMetaByKey[key] = {
            id: String(log.id),
            photo: log.photo ? String(log.photo) : null,
            isSkipped: Boolean(log.is_skipped),
            skipReason: log.skip_reason ? String(log.skip_reason) : null,
          }
        }
      })

      setLogMetaByKey(nextMetaByKey)

      return Object.keys(selectionsMap).length > 0 ? selectionsMap : null
    } catch (error) {
      setLogMetaByKey({})
      return null
    }
  }, [])

  // Marcar comida como completada (solo en vista diaria)
  const markMealCompleted = useCallback(async (mealId: string) => {
    const meal = meals.find(m => m.id === mealId)
    if (!meal || !meal.selectedOption) {
      return
    }

    // Actualizar estado inmediatamente
    setMeals(prevMeals => {
      const updatedMeals = prevMeals.map(m => 
        m.id === mealId 
          ? { ...m, isCompleted: true, isSkipped: false, skipReason: null }
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
      const mealType = meal.mealType
      if (mealType) {
        const headers = await getAuthHeaders()
        const response = await fetch(buildApiUrl('nutrition/daily-meal-selections/'), {
          headers,
          method: 'POST',
          body: JSON.stringify({
            date: today,
            meal_type: mealType,
            plan_meal_id: meal.id && !String(meal.id).startsWith('meal-') ? meal.id : undefined,
            recipe_id: meal.selectedOption.recipeId || (String(meal.selectedOption.id).includes('recipe-') ? String(meal.selectedOption.id).split('recipe-').pop() : meal.selectedOption.id),
            calories: meal.selectedOption.calories || 0,
            protein: meal.selectedOption.protein || 0,
            carbs: meal.selectedOption.carbs || 0,
            fat: meal.selectedOption.fat || 0,
            skip_meal: false,
            completed: true, // Ahora sí está completada
            custom_description: meal.selectedOption.customDescription || meal.selectedOption.name || meal.name,
            substitution_details: meal.selectedOption.substitution_details || []
          })
        })

        if (response.ok) {
          // Recargar selecciones del backend para actualizar los macros
          const selections = await loadSelectionsFromBackend(today)
          if (selections) {
            // Cargar estado de completado desde el backend
            const headers = await getAuthHeaders()
            const statusResponse = await fetch(`${buildApiUrl('nutrition/daily-meal-selections/')}?date=${today}`, {
              headers,
              method: 'GET',
            })
            
            if (statusResponse.ok) {
              const data = await statusResponse.json()
              const logs = data.selections || []
              const completedMap: Record<string, boolean> = {}
              const photoMap: Record<string, string | null> = {}
              const logIdMap: Record<string, string> = {}
              const skippedMap: Record<string, boolean> = {}
              const skippedReasonMap: Record<string, string | null> = {}
              logs.forEach((log: any) => {
                const mt = String(log.meal_type || '')
                const k = String(log.plan_meal_id || mt)
                if (k) {
                  completedMap[k] = log.completed || false
                  photoMap[k] = log.photo ? String(log.photo) : null
                  logIdMap[k] = String(log.id)
                  skippedMap[k] = Boolean(log.is_skipped)
                  skippedReasonMap[k] = log.skip_reason ? String(log.skip_reason) : null
                }
              })
              
              // Actualizar meals con las selecciones y estado de completado
              setMeals(currentMeals => {
                const updatedMeals = currentMeals.map(meal => {
                  const selection = selections[meal.id] || selections[meal.mealType]
                  const mapKey = String(meal.id)
                  const fallbackKey = meal.mealType
                  const photo = photoMap[mapKey] ?? photoMap[fallbackKey] ?? null
                  const mealLogId = logIdMap[mapKey] ?? logIdMap[fallbackKey] ?? null
                  if (selection) {
                    return { 
                      ...meal, 
                      selectedOption: selection, 
                      isCompleted: completedMap[mapKey] || completedMap[fallbackKey] || false,
                      isSkipped: skippedMap[mapKey] || skippedMap[fallbackKey] || false,
                      skipReason: skippedReasonMap[mapKey] ?? skippedReasonMap[fallbackKey] ?? null,
                      photo,
                      mealLogId,
                    }
                  }
                  return meal
                })
                
                // Recalcular macros con todas las comidas completadas
                const newMacros = calculateTotalMacros(updatedMeals)
                setMacros(newMacros)
                
                return updatedMeals
              })
            }
          }
        } else {
        }
      }
    } catch (error) {
    }
  }, [calculateTotalMacros, meals, loadSelectionsFromBackend])

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

          const completedMap: Record<string, boolean> = {}
          const skippedMap: Record<string, boolean> = {}
          const skippedReasonMap: Record<string, string | null> = {}
          logs.forEach((log: any) => {
            const mt = String(log.meal_type || '')
            const k = String(log.plan_meal_id || mt)
            if (k) {
              completedMap[k] = log.completed || false
              skippedMap[k] = Boolean(log.is_skipped)
              skippedReasonMap[k] = log.skip_reason ? String(log.skip_reason) : null
            }
          })

          return meals.map(meal => {
            const selection = selections[meal.id] || selections[meal.mealType]
            if (selection) {
              return { 
                ...meal, 
                selectedOption: selection, 
                isCompleted: completedMap[String(meal.id)] || completedMap[meal.mealType] || false,
                isSkipped: skippedMap[String(meal.id)] || skippedMap[meal.mealType] || false,
                skipReason: skippedReasonMap[String(meal.id)] ?? skippedReasonMap[meal.mealType] ?? null,
              }
            }
            return meal
          })
        }
      } catch (error) {
      }

      // Fallback: mostrar selecciones pero marcarlas como no completadas
      return meals.map(meal => {
        const selection = selections[meal.id] || selections[meal.mealType]
        const mapKey = String(meal.id)
        const fallbackKey = meal.mealType
        const meta = logMetaByKey[mapKey] || logMetaByKey[fallbackKey]
        if (selection) {
          // Asegurarse de que el nombre esté presente
          const mealOption = {
            ...selection,
            name: selection.name || 'Sin nombre'
          }
          return {
            ...meal,
            selectedOption: mealOption,
            isCompleted: false,
            isSkipped: Boolean(meta?.isSkipped),
            skipReason: meta?.skipReason || null,
            photo: meta?.photo || null,
            mealLogId: meta?.id || null,
          }
        }
        return meal
      })
    }
    return meals
  }, [logMetaByKey])

  const uploadMealPhoto = useCallback(async (mealId: string, photoFile: File): Promise<boolean> => {
    if (!isAuthenticated) return false

    const meal = meals.find((m) => m.id === mealId)
    if (!meal || !meal.mealType) return false

    try {
      const today = new Date().toISOString().split('T')[0]
      const headers = await getAuthHeaders()
      const formData = new FormData()

      formData.append('date', today)
      formData.append('meal_type', meal.mealType)
      formData.append('completed', meal.isCompleted ? 'true' : 'false')
      formData.append('skip_meal', meal.isSkipped ? 'true' : 'false')

      if (!String(meal.id).startsWith('meal-')) {
        formData.append('plan_meal_id', String(meal.id))
      }

      if (meal.selectedOption?.recipeId) {
        formData.append('recipe_id', String(meal.selectedOption.recipeId))
      } else if (meal.selectedOption?.id && String(meal.selectedOption.id).includes('recipe-')) {
        formData.append('recipe_id', String(meal.selectedOption.id).split('recipe-').pop() || '')
      }

      if (meal.selectedOption) {
        if (meal.isCompleted) {
          formData.append('calories', String(Number(meal.selectedOption.calories) || 0))
          formData.append('protein', String(Number(meal.selectedOption.protein) || 0))
          formData.append('carbs', String(Number(meal.selectedOption.carbs) || 0))
          formData.append('fat', String(Number(meal.selectedOption.fat) || 0))
        } else {
          formData.append('calories', '0')
          formData.append('protein', '0')
          formData.append('carbs', '0')
          formData.append('fat', '0')
        }
      }

      formData.append('custom_description', meal.selectedOption?.customDescription || meal.selectedOption?.name || meal.name)
      formData.append('substitution_details', JSON.stringify(meal.selectedOption?.substitution_details || []))
      formData.append('photo', photoFile)

      const response = await fetch(buildApiUrl('nutrition/daily-meal-selections/'), {
        method: 'POST',
        headers: {
          Authorization: headers.Authorization || headers.authorization || headers['Authorization'] || '',
        },
        body: formData,
      })

      if (!response.ok) {
        return false
      }

      const savedLog = await response.json()
      const photoUrl = savedLog?.photo ? String(savedLog.photo) : null

      setMeals((prevMeals) => prevMeals.map((currentMeal) => {
        if (currentMeal.id !== mealId) return currentMeal
        return {
          ...currentMeal,
          photo: photoUrl,
          mealLogId: savedLog?.id ? String(savedLog.id) : currentMeal.mealLogId || null,
        }
      }))

      return true
    } catch (error) {
      return false
    }
  }, [isAuthenticated, meals])

  const markMealAsNotEaten = useCallback(async (
    mealId: string,
    reason?: string,
    excludeFromRecommendations: boolean = true
  ): Promise<boolean> => {
    if (!isAuthenticated) return false

    const meal = meals.find((m) => m.id === mealId)
    if (!meal || !meal.mealType || !meal.selectedOption) return false

    try {
      const today = new Date().toISOString().split('T')[0]
      const headers = await getAuthHeaders()
      const payload: Record<string, any> = {
        date: today,
        meal_type: meal.mealType,
        completed: false,
        skip_meal: true,
        skip_reason: reason || '',
        exclude_from_recommendations: excludeFromRecommendations,
        custom_description: meal.selectedOption.customDescription || meal.selectedOption.name || meal.name,
        substitution_details: meal.selectedOption.substitution_details || [],
      }

      if (!String(meal.id).startsWith('meal-')) {
        payload.plan_meal_id = String(meal.id)
      }

      if (meal.selectedOption?.recipeId) {
        payload.recipe_id = String(meal.selectedOption.recipeId)
      } else if (meal.selectedOption?.id && String(meal.selectedOption.id).includes('recipe-')) {
        payload.recipe_id = String(meal.selectedOption.id).split('recipe-').pop() || ''
      }

      const response = await fetch(buildApiUrl('nutrition/daily-meal-selections/'), {
        headers: {
          ...headers,
          'Content-Type': 'application/json; charset=utf-8'
        },
        method: 'POST',
        body: JSON.stringify(payload),
      })

      if (!response.ok) return false

      const savedLog = await response.json()

      setMeals((prevMeals) => {
        const updatedMeals = prevMeals.map((currentMeal) => {
          if (currentMeal.id !== mealId) return currentMeal
          return {
            ...currentMeal,
            isCompleted: false,
            isSkipped: true,
            skipReason: savedLog?.skip_reason ? String(savedLog.skip_reason) : (reason || null),
            mealLogId: savedLog?.id ? String(savedLog.id) : currentMeal.mealLogId || null,
          }
        })

        const newMacros = calculateTotalMacros(updatedMeals)
        setMacros(newMacros)
        return updatedMeals
      })

      return true
    } catch (error) {
      return false
    }
  }, [calculateTotalMacros, isAuthenticated, meals])

  // Cargar opciones de comidas del plan activo
  const loadPlanMealOptions = useCallback(async (): Promise<PlanMealSlot[]> => {
    try {
      const planMeals = await nutritionService.getPlanMealsForSelection()
      if (planMeals && planMeals.meals_by_type) {
        setPlanMealOptions(planMeals.meals_by_type)

        if (planMeals.options_by_meal_id && typeof planMeals.options_by_meal_id === "object") {
          setPlanOptionsByMealId(planMeals.options_by_meal_id as any)
        } else {
          setPlanOptionsByMealId({})
        }

        // Actualizar objetivos de macros/kcal desde backend o plan activo
        if (planMeals.daily_calories_target && planMeals.daily_macros) {
          setMacros(prev => ({
            ...prev,
            caloriesGoal: Number(planMeals.daily_calories_target) || prev.caloriesGoal,
            proteinGoal: Number(planMeals.daily_macros?.protein) || prev.proteinGoal,
            carbsGoal: Number(planMeals.daily_macros?.carbs) || prev.carbsGoal,
            fatGoal: Number(planMeals.daily_macros?.fat) || prev.fatGoal,
          }))
        } else if (currentPlan && currentPlan.daily_calories && currentPlan.target_macros) {
          // Fallback a valores del plan si no hay personalización
          setMacros(prev => ({
            ...prev,
            caloriesGoal: Number(currentPlan.daily_calories) || prev.caloriesGoal,
            proteinGoal: Number(currentPlan.target_macros?.protein) || prev.proteinGoal,
            carbsGoal: Number(currentPlan.target_macros?.carbs) || prev.carbsGoal,
            fatGoal: Number(currentPlan.target_macros?.fat) || prev.fatGoal,
          }))
        }

        if (Array.isArray(planMeals.meal_slots)) {
          const normalizedSlots = planMeals.meal_slots.map((m) => ({
            id: String(m.id),
            name: m.name,
            time: (m.time || null) as any,
            description: m.description || "",
            meal_type: m.meal_type,
            order_index: m.order_index,
          }))
          setPlanMealSlots(normalizedSlots)
          return normalizedSlots
        } else {
          setPlanMealSlots([])
          return []
        }
      } else {
        // Fallback a opciones por defecto
        setPlanMealOptions(defaultMealOptions)
        setPlanMealSlots([])
        setPlanOptionsByMealId({})
        return []
      }
    } catch (error) {
      // Fallback a opciones por defecto
      setPlanMealOptions(defaultMealOptions)
      setPlanMealSlots([])
      setPlanOptionsByMealId({})
      return []
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
        const loadedSlots = await loadPlanMealOptions()
        
        if (!isMounted) return
        
        // Generar comidas del día usando los slots recién cargados
        const dailyMeals = generateDailyMeals(loadedSlots)
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
          setMacros(prev => ({
            ...initialMacros,
            caloriesGoal: prev.caloriesGoal,
            proteinGoal: prev.proteinGoal,
            carbsGoal: prev.carbsGoal,
            fatGoal: prev.fatGoal,
          }))
          
          // Sincronizar localStorage con backend
          saveSelectionsToStorage(mealsWithBackendSelections)
        } else {
          // Usar localStorage como backup
          const mealsWithLocalSelections = loadSelectionsFromStorage(dailyMeals)
          setMeals(mealsWithLocalSelections)
          
          // Calcular macros
          const initialMacros = calculateTotalMacros(mealsWithLocalSelections)
          setMacros(prev => ({
            ...initialMacros,
            caloriesGoal: prev.caloriesGoal,
            proteinGoal: prev.proteinGoal,
            carbsGoal: prev.carbsGoal,
            fatGoal: prev.fatGoal,
          }))
        }
      } catch (error) {
        if (!isMounted) return
        // Fallback: usar solo comidas sin selecciones
        const fallbackMeals = generateDailyMeals()
        setMeals(fallbackMeals)
        const initialMacros = calculateTotalMacros(fallbackMeals)
        setMacros(prev => ({
          ...initialMacros,
          caloriesGoal: prev.caloriesGoal,
          proteinGoal: prev.proteinGoal,
          carbsGoal: prev.carbsGoal,
          fatGoal: prev.fatGoal,
        }))
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
  const getMealOptions = useCallback((mealId: string): MealOption[] => {
    // Preferir opciones por slot (permite nº variable de comidas/día)
    const byId = planOptionsByMealId[mealId]
    if (Array.isArray(byId) && byId.length > 0) return byId

    // Fallback: buscar el slot y usar options por tipo
    const slot = meals.find((m) => m.id === mealId)
    const mealType = slot?.mealType || "breakfast"
    if (planMealOptions[mealType] && planMealOptions[mealType].length > 0) {
      return planMealOptions[mealType]
    }

    // Último fallback: opciones hardcodeadas
    const mealKey =
      mealType === "breakfast" ? "breakfast" :
      mealType === "morning_snack" ? "snack1" :
      mealType === "afternoon_snack" ? "snack2" :
      mealType === "dinner" ? "dinner" : "lunch"
    return defaultMealOptions[mealKey] || []
  }, [planMealOptions, planOptionsByMealId, meals])

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
        setMacros(prev => ({
          ...initialMacros,
          caloriesGoal: prev.caloriesGoal,
          proteinGoal: prev.proteinGoal,
          carbsGoal: prev.carbsGoal,
          fatGoal: prev.fatGoal,
        }))
        
        // Sincronizar localStorage
        saveSelectionsToStorage(mealsWithSelections)
      } catch (error) {
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
    deselectMealOption,
    markMealCompleted,
    markMealAsNotEaten,
    uploadMealPhoto,
    getMealOptions,
    refreshData
  }
}
