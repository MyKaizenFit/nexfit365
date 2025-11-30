// lib/nutrition-service.ts
// Servicio para gestionar planes de nutrición y comidas

import { API_CONFIG, NUTRITION_ENDPOINTS, getAuthHeaders, buildApiUrl } from './api'
import { requestThrottler } from './request-throttle'
import { apiCache, generateCacheKey } from './api-cache'

// Interfaces para los datos de nutrición
export interface Food {
  id: string
  name: string
  unit: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface NutritionPlan {
  id: string
  name: string
  description: string
  daily_calories: number | null
  target_macros: {
    protein: number
    carbs: number
    fat: number
  } | null
  start_date: string
  end_date: string | null
  is_active: boolean
  meals: Meal[]
}

export interface Meal {
  id: string
  name: string
  time: string | null
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  description: string
  order_index: number
}

export interface MealLog {
  id: string
  meal: Meal | string | null // Puede ser un Meal completo, un ID string, o null
  date: string
  completed: boolean
  actual_foods: any[] | null
  notes: string
  rating: number | null
}

export interface MealOption {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  category?: "light" | "balanced" | "protein-rich"
  icon?: string  // Permitir cualquier emoji
  description: string
  cookTime?: string
}

class NutritionService {
  private baseUrl: string

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL
  }

  // Obtener el plan de nutrición activo del usuario
  async getCurrentPlan(): Promise<NutritionPlan | null> {
    // Verificar si hay token de acceso disponible
    try {
      const { authService } = require('./auth-service')
      const token = authService.getAccessToken()
      if (!token) {
        console.log('No hay token de acceso, saltando getCurrentPlan')
        return null
      }
    } catch (error) {
      console.log('Error verificando autenticación, saltando getCurrentPlan')
      return null
    }

    const cacheKey = generateCacheKey(NUTRITION_ENDPOINTS.CURRENT_PLAN)
    
    // Intentar obtener del caché primero
    const cached = apiCache.get<NutritionPlan>(cacheKey)
    if (cached) {
      return cached
    }

    try {
      const result = await requestThrottler.throttle('current-plan', async () => {
        const headers = await getAuthHeaders()
        const response = await fetch(buildApiUrl(NUTRITION_ENDPOINTS.CURRENT_PLAN), {
          headers,
          method: 'GET',
        })

        if (!response.ok) {
          if (response.status === 404 || response.status === 200) {
            // Si no hay plan, intentar obtener planes por defecto
            const data = await response.json()
            if (data.plan) {
              return data.plan
            }
            return null
          }
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        return data.plan || null
      })

      // Almacenar en caché por 5 minutos si hay resultado
      if (result) {
        apiCache.set(cacheKey, result, 5 * 60 * 1000)
      }
      
      return result
    } catch (error) {
      console.error('Error obteniendo plan de nutrición:', error)
      return null
    }
  }

  // Cambiar el plan nutricional del usuario
  async changePlan(defaultPlanId: string): Promise<NutritionPlan | null> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(NUTRITION_ENDPOINTS.CHANGE_PLAN), {
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          default_plan_id: defaultPlanId
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.detail || 'Error al cambiar plan')
      }

      const data = await response.json()
      
      // Invalidar caché del plan actual
      const cacheKey = generateCacheKey(NUTRITION_ENDPOINTS.CURRENT_PLAN)
      apiCache.delete(cacheKey)
      
      return data.plan || null
    } catch (error) {
      console.error('Error cambiando plan:', error)
      throw error
    }
  }

  // Obtener planes disponibles para el usuario
  async getAvailablePlans(): Promise<any[]> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(NUTRITION_ENDPOINTS.SUITABLE_PLANS), {
        headers,
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.plans || []
    } catch (error) {
      console.error('Error obteniendo planes disponibles:', error)
      return []
    }
  }

  // Obtener comidas del plan activo organizadas por tipo
  async getPlanMealsForSelection(): Promise<{ meals_by_type: Record<string, MealOption[]>, plan_name?: string } | null> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(NUTRITION_ENDPOINTS.PLAN_MEALS_FOR_SELECTION), {
        headers,
        method: 'GET',
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return {
        meals_by_type: data.meals_by_type || {},
        plan_name: data.plan_name
      }
    } catch (error) {
      console.error('Error obteniendo comidas del plan:', error)
      return null
    }
  }

  // Crear un plan de nutrición por defecto
  private async createDefaultPlan(): Promise<NutritionPlan> {
    const cacheKey = generateCacheKey('default-nutrition-plans/?is_default=true')
    
    // Intentar obtener del caché primero
    const cached = apiCache.get<NutritionPlan>(cacheKey)
    if (cached) {
      return cached
    }

    try {
      const result = await requestThrottler.throttle('default-nutrition-plans', async () => {
        // Intentar obtener el plan por defecto del backend
        const headers = await getAuthHeaders()
        const response = await fetch(`${buildApiUrl('default-nutrition-plans/')}?is_default=true`, {
          headers,
          method: 'GET',
        })

        if (response.ok) {
          const data = await response.json()
          if (data.results && data.results.length > 0) {
            const defaultPlan = data.results[0]
            
            // Convertir DefaultMeal a Meal para mantener compatibilidad
            const meals = defaultPlan.meals?.map((defaultMeal: any) => ({
              id: defaultMeal.id,
              name: defaultMeal.name,
              time: defaultMeal.time,
              calories: defaultMeal.calories,
              protein: defaultMeal.protein,
              carbs: defaultMeal.carbs,
              fat: defaultMeal.fat,
              description: defaultMeal.description,
              order_index: defaultMeal.order_index
            })) || []

            return {
              id: defaultPlan.id,
              name: defaultPlan.name,
              description: defaultPlan.description,
              daily_calories: defaultPlan.daily_calories,
              target_macros: defaultPlan.target_macros,
              start_date: new Date().toISOString().split('T')[0],
              end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              is_active: true,
              meals: meals
            }
          }
        }
        
        // Fallback: plan local por defecto (solo si falla el backend)
        const today = new Date()
        const endDate = new Date()
        endDate.setDate(today.getDate() + 30)

        return {
          id: "default-plan",
          name: "Plan de Nutrición Básico",
          description: "Plan de nutrición equilibrado para comenzar tu viaje de salud",
          daily_calories: 2000,
          target_macros: {
            protein: 150,
            carbs: 200,
            fat: 65
          },
          start_date: today.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          is_active: true,
          meals: []
        }
      })

      // Almacenar en caché por 10 minutos (planes por defecto cambian menos)
      apiCache.set(cacheKey, result, 10 * 60 * 1000)
      
      return result
    } catch (error) {
      console.error('Error obteniendo plan por defecto del backend:', error)
      
      // Fallback: plan local por defecto (solo si falla el backend)
      const today = new Date()
      const endDate = new Date()
      endDate.setDate(today.getDate() + 30)

      return {
        id: "default-plan",
        name: "Plan de Nutrición Básico",
        description: "Plan de nutrición equilibrado para comenzar tu viaje de salud",
        daily_calories: 2000,
        target_macros: {
          protein: 150,
          carbs: 200,
          fat: 65
        },
        start_date: today.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        is_active: true,
        meals: []
      }
    }
  }

  // Obtener todos los planes de nutrición del usuario
  async getUserPlans(): Promise<NutritionPlan[]> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${buildApiUrl(NUTRITION_ENDPOINTS.PLANS)}`, {
        headers,
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Error obteniendo planes de nutrición:', error)
      return []
    }
  }

  // Obtener alimentos disponibles
  async getFoods(search?: string): Promise<Food[]> {
    try {
      const headers = await getAuthHeaders()
      const url = search 
        ? `${buildApiUrl(NUTRITION_ENDPOINTS.FOODS)}?q=${encodeURIComponent(search)}`
        : `${buildApiUrl(NUTRITION_ENDPOINTS.FOODS)}`
      
      const response = await fetch(url, {
        headers,
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Error obteniendo alimentos:', error)
      return []
    }
  }

  // Obtener registro de comidas del usuario para una fecha específica
  async getMealLogs(date: string): Promise<MealLog[]> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${buildApiUrl(NUTRITION_ENDPOINTS.MEALS)}?date=${date}`, {
        headers,
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Error obteniendo registro de comidas:', error)
      return []
    }
  }

  // Marcar una comida como completada
  async markMealCompleted(mealId: string, date: string, notes?: string): Promise<MealLog | null> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${buildApiUrl(NUTRITION_ENDPOINTS.MEALS)}`, {
        headers,
        method: 'POST',
        body: JSON.stringify({
          meal: mealId,
          date: date,
          completed: true,
          notes: notes || '',
        }),
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error marcando comida como completada:', error)
      return null
    }
  }

  // Crear un nuevo registro de comida
  async createMealLog(mealData: Partial<MealLog>): Promise<MealLog | null> {
    try {
      const headers = await getAuthHeaders()
      
      // Log de los datos que se van a enviar
      console.log('Datos a enviar a createMealLog:', mealData)
      console.log('Headers:', headers)
      
      const response = await fetch(`${buildApiUrl(NUTRITION_ENDPOINTS.MEALS)}`, {
        headers,
        method: 'POST',
        body: JSON.stringify(mealData),
      })

      if (!response.ok) {
        // Intentar obtener más detalles del error
        let errorDetails = ''
        try {
          const errorResponse = await response.json()
          errorDetails = JSON.stringify(errorResponse)
        } catch {
          errorDetails = response.statusText
        }
        
        console.error(`Error ${response.status} del backend:`, errorDetails)
        throw new Error(`Error ${response.status}: ${errorDetails}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creando registro de comida:', error)
      return null
    }
  }

  // Obtener opciones de comidas sugeridas basadas en el plan actual
  async getSuggestedMeals(): Promise<MealOption[]> {
    try {
      const currentPlan = await this.getCurrentPlan()
      if (!currentPlan || !currentPlan.meals) {
        return this.getDefaultMealOptions()
      }

      // Convertir las comidas del plan en opciones sugeridas
      return currentPlan.meals.map(meal => ({
        id: meal.id,
        name: meal.name,
        calories: meal.calories || 0,
        protein: meal.protein || 0,
        carbs: meal.carbs || 0,
        fat: meal.fat || 0,
        category: this.getMealCategory(meal),
        icon: this.getMealIcon(meal),
        description: meal.description || '',
        cookTime: '15 min', // Valor por defecto
      }))
    } catch (error) {
      console.error('Error obteniendo comidas sugeridas:', error)
      return this.getDefaultMealOptions()
    }
  }

  // Obtener opciones de comidas por defecto (fallback)
  private getDefaultMealOptions(): MealOption[] {
    return [
      {
        id: "default-1",
        name: "Desayuno equilibrado",
        calories: 350,
        protein: 20,
        carbs: 45,
        fat: 12,
        category: "balanced",
        icon: "🥗",
        description: "Opción saludable por defecto",
        cookTime: "10 min",
      },
      {
        id: "default-2",
        name: "Snack proteico",
        calories: 200,
        protein: 25,
        carbs: 15,
        fat: 8,
        category: "protein-rich",
        icon: "🍗",
        description: "Refuerzo de proteínas",
        cookTime: "5 min",
      },
    ]
  }

  // Determinar categoría de comida basada en macronutrientes
  private getMealCategory(meal: Meal): "light" | "balanced" | "protein-rich" {
    if (!meal.protein || !meal.carbs || !meal.fat) return "balanced"
    
    const proteinRatio = meal.protein / (meal.protein + meal.carbs + meal.fat)
    const carbRatio = meal.carbs / (meal.protein + meal.carbs + meal.fat)
    
    if (proteinRatio > 0.4) return "protein-rich"
    if (carbRatio > 0.6) return "light"
    return "balanced"
  }

  // Asignar icono basado en categoría y nombre
  private getMealIcon(meal: Meal): "🥗" | "🍗" | "🥑" | "🍎" | "🥜" | "🐟" {
    const name = meal.name.toLowerCase()
    
    if (name.includes('pollo') || name.includes('carne') || name.includes('huevo')) return "🍗"
    if (name.includes('pescado') || name.includes('atún') || name.includes('salmón')) return "🐟"
    if (name.includes('fruta') || name.includes('manzana') || name.includes('naranja')) return "🍎"
    if (name.includes('nueces') || name.includes('almendras') || name.includes('frutos secos')) return "🥜"
    if (name.includes('aguacate') || name.includes('palta')) return "🥑"
    
    return "🥗" // Opción por defecto
  }

  // Obtener estadísticas nutricionales del día
  async getDailyNutritionStats(date: string): Promise<{
    totalCalories: number
    totalProtein: number
    totalCarbs: number
    totalFat: number
    mealsCompleted: number
    totalMeals: number
  }> {
    try {
      const [mealLogs, currentPlan] = await Promise.all([
        this.getMealLogs(date),
        this.getCurrentPlan()
      ])

      const completedMeals = mealLogs.filter(log => log.completed)
      const totalMeals = currentPlan?.meals?.length || 0

      const stats = completedMeals.reduce((acc, log) => {
        if (log.meal && typeof log.meal === 'object') {
          acc.totalCalories += log.meal.calories || 0
          acc.totalProtein += log.meal.protein || 0
          acc.totalCarbs += log.meal.carbs || 0
          acc.totalFat += log.meal.fat || 0
        }
        return acc
      }, {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        mealsCompleted: completedMeals.length,
        totalMeals
      })

      return stats
    } catch (error) {
      console.error('Error obteniendo estadísticas nutricionales:', error)
      return {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        mealsCompleted: 0,
        totalMeals: 0
      }
    }
  }
}

// Exportar instancia singleton
export const nutritionService = new NutritionService()
export default nutritionService
