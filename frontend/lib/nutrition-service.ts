// lib/nutrition-service.ts
// Servicio para gestionar planes de nutrición y comidas

import { API_CONFIG, NUTRITION_ENDPOINTS, getAuthHeaders, buildApiUrl, authenticatedFetch } from './api'
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
  description?: string
  daily_calories: number
  target_macros: {
    protein: number
    carbs: number
    fat: number
    protein_percentage?: number
    carbs_percentage?: number
    fat_percentage?: number
  }
  meals?: Meal[]
  start_date?: string
  end_date?: string
  is_active: boolean
  is_system?: boolean
  is_template?: boolean
  is_default?: boolean
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
  recipeId?: number | string  // ID de la receta si está asociada (puede ser número o UUID)
}

export interface Recipe {
  id: number | string  // Puede ser número o UUID (string)
  name: string
  description: string
  category: string
  difficulty: string
  prep_time_minutes: number
  cook_time_minutes: number
  servings: number
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  sugar?: number
  sodium?: number
  ingredients: Array<{
    name: string
    amount: number | string
    unit: string
  }>
  instructions: string
  image_url?: string
  video_url?: string
  diet_types?: string[]
  meal_types?: string[]
  allergens?: string[]
  tags?: string[]
}

export interface PersonalizedRecipeQuantities {
  scale_factor: number
  ingredients: Array<{
    name: string
    amount: number | string | null
    unit: string | null
    note?: string
  }>
  macros: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber?: number
  }
  servings: number
  target_calories: number
  original_calories: number
  meal_type: string
  meal_percentage: number
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

  // Ajustar el plan nutricional actual con un ajuste de calorías
  async adjustPlan(calorieAdjustment: number, reason?: string, notes?: string): Promise<NutritionPlan | null> {
    try {
      const headers = await getAuthHeaders()
      
      const response = await fetch(buildApiUrl('nutrition/adjust-plan/'), {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          calorie_adjustment: calorieAdjustment,
          reason: reason || 'manual_adjustment',
          notes: notes || `Ajuste manual de ${calorieAdjustment > 0 ? '+' : ''}${calorieAdjustment} calorías`,
        }),
      })

      const result = await handleApiResponse<{
        plan: NutritionPlan
        message: string
        old_calories: number
        new_calories: number
        adjustment: number
      }>(response)

      if (result.error) {
        throw new Error(result.error)
      }

      if (!result.data || !result.data.plan) {
        throw new Error('No se recibió confirmación del ajuste')
      }

      // Limpiar caché del plan actual
      const cacheKey = generateCacheKey(NUTRITION_ENDPOINTS.CURRENT_PLAN)
      apiCache.delete(cacheKey)

      return result.data.plan
    } catch (error) {
      console.error('Error ajustando plan:', error)
      throw handleFetchError(error)
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
  async getPlanMealsForSelection(): Promise<{ 
    meals_by_type: Record<string, MealOption[]>, 
    plan_name?: string,
    daily_calories_target?: number,
    daily_macros?: {
      protein: number,
      carbs: number,
      fat: number,
      protein_percentage: number,
      carbs_percentage: number,
      fat_percentage: number
    }
  } | null> {
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
        plan_name: data.plan_name,
        daily_calories_target: data.daily_calories_target,
        daily_macros: data.daily_macros
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
        const response = await fetch(`${buildApiUrl('nutrition/default-nutrition-plans/')}?is_default=true`, {
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

  // Obtener receta personalizada con cantidades ajustadas según perfil
  async getPersonalizedRecipe(recipeId: number | string, mealType: string): Promise<{
    recipe: Recipe
    personalized_quantities: PersonalizedRecipeQuantities
    user_profile: {
      weight: number
      height: number
      age: number
      gender: string
      main_goal: string
      activity_level: string
      daily_calories_target: number
    }
  } | null> {
    try {
      const headers = await getAuthHeaders()
      const url = `${buildApiUrl(`nutrition/recipes/${recipeId}/personalized/`)}?meal_type=${mealType}`
      console.log('📡 Llamando a endpoint:', url)
      
      const response = await fetch(url, {
        headers,
        method: 'GET',
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Error ${response.status} al obtener receta personalizada:`, errorText)
        throw new Error(`Error ${response.status}: ${response.statusText}. ${errorText}`)
      }

      // Parsear JSON asegurando UTF-8
      const text = await response.text()
      const data = JSON.parse(text)
      console.log('✅ Respuesta recibida:', data)
      return data
    } catch (error: any) {
      console.error('❌ Error obteniendo receta personalizada:', error)
      throw error // Re-lanzar el error para que el componente pueda manejarlo
    }
  }

  // Obtener receta por ID
  async getRecipe(recipeId: number | string): Promise<Recipe | null> {
    try {
      const headers = await getAuthHeaders()
      const url = `${buildApiUrl(`nutrition/recipes/${recipeId}/`)}`
      console.log('📡 Llamando a endpoint de receta básica:', url)
      
      const response = await fetch(url, {
        headers,
        method: 'GET',
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Error ${response.status} al obtener receta:`, errorText)
        throw new Error(`Error ${response.status}: ${response.statusText}. ${errorText}`)
      }

      const data = await response.json()
      console.log('✅ Receta básica recibida:', data.name)
      return data
    } catch (error: any) {
      console.error('❌ Error obteniendo receta:', error)
      throw error // Re-lanzar el error para que el componente pueda manejarlo
    }
  }

  // Buscar recetas por nombre
  async searchRecipes(query: string): Promise<Recipe[]> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(
        `${buildApiUrl(`nutrition/recipes/?search=${encodeURIComponent(query)}`)}`,
        {
          headers,
          method: 'GET',
        }
      )

      if (!response.ok) {
        // Si el endpoint no existe, devolver array vacío
        if (response.status === 404) {
          return []
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return Array.isArray(data) ? data : (data.results || data.recipes || [])
    } catch (error) {
      console.error('Error buscando recetas:', error)
      return []
    }
  }

  // Listar todas las recetas
  async listRecipes(): Promise<Recipe[]> {
    try {
      const headers = await getAuthHeaders()
      
      // Intentar primero con el endpoint estándar
      let response = await fetch(
        `${buildApiUrl('nutrition/recipes/')}`,
        {
          headers,
          method: 'GET',
        }
      )

      // Si recibimos 401, intentar refrescar el token
      if (response.status === 401) {
        const { authService } = await import('./auth-service')
        const refreshResult = await authService.refreshAccessToken()
        if (refreshResult.success && refreshResult.newToken) {
          headers['Authorization'] = `Bearer ${refreshResult.newToken}`
          response = await fetch(
            `${buildApiUrl('nutrition/recipes/')}`,
            {
              headers,
              method: 'GET',
            }
          )
        }
      }

      // Si aún falla con 404, intentar con el endpoint de admin
      if (response.status === 404) {
        console.warn('⚠️ Endpoint /api/nutrition/recipes/ no encontrado, intentando con endpoint de admin...')
        response = await fetch(
          `${buildApiUrl('admin/nutrition/recipes/')}`,
          {
            headers,
            method: 'GET',
          }
        )
      }

      if (!response.ok) {
        console.error(`❌ Error ${response.status} al listar recetas:`, response.statusText)
        // Si falla, devolver array vacío en lugar de lanzar error
        return []
      }

      const data = await response.json()
      const recipes = Array.isArray(data) ? data : (data.results || data.recipes || [])
      console.log(`✅ ${recipes.length} recetas cargadas`)
      return recipes
    } catch (error) {
      console.error('❌ Error listando recetas:', error)
      return []
    }
  }

  /**
   * Obtener selecciones de comidas para una semana
   */
  async getWeeklyMealSelections(startDate?: string): Promise<Record<string, any[]>> {
    try {
      const headers = await getAuthHeaders()
      const url = startDate 
        ? `nutrition/weekly-meal-selections/?start_date=${startDate}`
        : 'nutrition/weekly-meal-selections/'
      const response = await authenticatedFetch(
        url,
        {
          headers,
          method: 'GET'
        }
      )

      if (!response.ok) {
        console.error(`Error obteniendo selecciones semanales: ${response.status}`)
        return {}
      }

      const data = await response.json()
      return data.selections || {}
    } catch (error) {
      console.error('Error obteniendo selecciones semanales:', error)
      return {}
    }
  }

  /**
   * Obtener selecciones de comidas para un mes
   */
  async getMonthlyMealSelections(year?: number, month?: number): Promise<Record<string, any[]>> {
    try {
      const headers = await getAuthHeaders()
      const today = new Date()
      const urlYear = year || today.getFullYear()
      const urlMonth = month || (today.getMonth() + 1)
      
      const url = `nutrition/monthly-meal-selections/?year=${urlYear}&month=${urlMonth}`
      const response = await authenticatedFetch(
        url,
        {
          headers,
          method: 'GET'
        }
      )

      if (!response.ok) {
        console.error(`Error obteniendo selecciones mensuales: ${response.status}`)
        return {}
      }

      const data = await response.json()
      return data.selections || {}
    } catch (error) {
      console.error('Error obteniendo selecciones mensuales:', error)
      return {}
    }
  }

  /**
   * Guardar selecciones de comidas para múltiples días
   */
  async saveWeeklyMealSelections(selections: Array<{
    date: string
    meal_type: string
    recipe_id?: string
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
    custom_description?: string
  }>): Promise<{ created: number; updated: number; errors?: any[] }> {
    try {
      const headers = await getAuthHeaders()
      const response = await authenticatedFetch(
        'nutrition/weekly-meal-selections/',
        {
          headers,
          method: 'POST',
          body: JSON.stringify({ selections })
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Error ${response.status}`)
      }

      const data = await response.json()
      return {
        created: data.created || 0,
        updated: data.updated || 0,
        errors: data.errors || null
      }
    } catch (error) {
      console.error('Error guardando selecciones semanales:', error)
      throw error
    }
  }

  /**
   * Guardar selecciones de comidas para múltiples días del mes
   */
  async saveMonthlyMealSelections(
    year: number,
    month: number,
    selections: Array<{
      date: string
      meal_type: string
      recipe_id?: string
      calories?: number
      protein?: number
      carbs?: number
      fat?: number
      custom_description?: string
    }>
  ): Promise<{ created: number; updated: number; errors?: any[] }> {
    try {
      const headers = await getAuthHeaders()
      const response = await authenticatedFetch(
        'nutrition/monthly-meal-selections/',
        {
          headers,
          method: 'POST',
          body: JSON.stringify({ year, month, selections })
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Error ${response.status}`)
      }

      const data = await response.json()
      return {
        created: data.created || 0,
        updated: data.updated || 0,
        errors: data.errors || null
      }
    } catch (error) {
      console.error('Error guardando selecciones mensuales:', error)
      throw error
    }
  }

}

// Exportar instancia singleton
export const nutritionService = new NutritionService()
export default nutritionService
