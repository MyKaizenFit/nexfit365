// lib/nutrition-service.ts
// Servicio para gestionar planes de nutrición y comidas

import { API_CONFIG, NUTRITION_ENDPOINTS, getAuthHeaders, buildApiUrl, authenticatedFetch, handleApiResponse, handleFetchError } from './api'
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
  category?: string
  brand?: string
  serving_size?: number
  serving_unit?: string
}

export interface NutritionPlan {
  id: string
  name: string
  description?: string
  daily_calories: number | null
  protein_grams?: number
  carbs_grams?: number
  fat_grams?: number
  protein_percentage?: number
  carbs_percentage?: number
  fat_percentage?: number
  macro_percentages?: {
    protein: number
    carbs: number
    fat: number
  }
  target_macros: {
    protein: number
    carbs: number
    fat: number
    protein_percentage?: number
    carbs_percentage?: number
    fat_percentage?: number
  } | null
  meals?: Meal[]
  start_date?: string
  end_date?: string | null
  is_active: boolean
  is_system?: boolean
  is_template?: boolean
  is_default?: boolean
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
  photo?: File | string | null
}

export interface MealOption {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  imageUrl?: string
  category?: "light" | "balanced" | "protein-rich"
  icon?: string  // Permitir cualquier emoji
  description: string
  cookTime?: string
  recipeId?: number | string  // ID de la receta si está asociada (puede ser número o UUID)
  customDescription?: string
  substitution_details?: MealIngredientSubstitution[]
}

export interface RecipeExclusionItem {
  id: string
  recipe_id: string
  recipe_name: string
  image_url?: string
  reason?: string
}

export interface IngredientExclusionItem {
  id: string
  term: string
  reason?: string
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
  recipe_ingredients?: Array<{
    id: string
    food?: string
    food_id?: string
    food_detail?: Food
    quantity: number | string
    unit: string
    notes?: string
    order?: number
  }>
  instructions: string
  image_url?: string
  video_url?: string
  diet_types?: string[]
  meal_types?: string[]
  allergens?: string[]
  tags?: string[]
}

export interface IngredientSubstitution {
  food_id: string
  food_name: string
  category: string
  quantity: number
  unit: string
  target_calories: number
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface IngredientSubstitutionResponse {
  recipe_id: string
  ingredient: {
    id?: string | null
    food_id: string
    food_name: string
    quantity: number
    unit: string
    category: string
    supports_volume?: boolean
    target_calories: number
  }
  results: IngredientSubstitution[]
}

export interface MealIngredientSubstitution {
  ingredient_id?: string | null
  original_food_id: string
  original_food_name: string
  original_quantity: number
  original_unit: string
  replacement_food_id: string
  replacement_food_name: string
  replacement_quantity: number
  replacement_unit: string
  target_calories: number
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

  private normalizeNutritionPlan(rawPlan: any): NutritionPlan {
    const dailyCalories = rawPlan?.daily_calories != null ? Number(rawPlan.daily_calories) : null
    const proteinGrams = Number(rawPlan?.protein_grams ?? rawPlan?.target_macros?.protein ?? 0)
    const carbsGrams = Number(rawPlan?.carbs_grams ?? rawPlan?.target_macros?.carbs ?? 0)
    const fatGrams = Number(rawPlan?.fat_grams ?? rawPlan?.target_macros?.fat ?? 0)

    const computedFromMacros = dailyCalories && dailyCalories > 0
      ? {
          protein: Number(((proteinGrams * 4) / dailyCalories * 100).toFixed(1)),
          carbs: Number(((carbsGrams * 4) / dailyCalories * 100).toFixed(1)),
          fat: Number(((fatGrams * 9) / dailyCalories * 100).toFixed(1)),
        }
      : { protein: 0, carbs: 0, fat: 0 }

    const macroPercentages = {
      protein: Number(rawPlan?.protein_percentage ?? rawPlan?.macro_percentages?.protein ?? rawPlan?.target_macros?.protein_percentage ?? computedFromMacros.protein),
      carbs: Number(rawPlan?.carbs_percentage ?? rawPlan?.macro_percentages?.carbs ?? rawPlan?.target_macros?.carbs_percentage ?? computedFromMacros.carbs),
      fat: Number(rawPlan?.fat_percentage ?? rawPlan?.macro_percentages?.fat ?? rawPlan?.target_macros?.fat_percentage ?? computedFromMacros.fat),
    }

    return {
      ...rawPlan,
      daily_calories: dailyCalories,
      protein_grams: proteinGrams,
      carbs_grams: carbsGrams,
      fat_grams: fatGrams,
      protein_percentage: macroPercentages.protein,
      carbs_percentage: macroPercentages.carbs,
      fat_percentage: macroPercentages.fat,
      macro_percentages: macroPercentages,
      target_macros: {
        protein: proteinGrams,
        carbs: carbsGrams,
        fat: fatGrams,
        protein_percentage: macroPercentages.protein,
        carbs_percentage: macroPercentages.carbs,
        fat_percentage: macroPercentages.fat,
      },
      is_active: Boolean(rawPlan?.is_active),
    }
  }

  // Obtener el plan de nutrición activo del usuario
  async getCurrentPlan(): Promise<NutritionPlan | null> {
    try {
      const { getAuthService } = require('./auth-service')
      if (!getAuthService().isAuthenticated()) {
        return null
      }
    } catch (error) {
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
        credentials: 'include',
          headers,
          method: 'GET',
        })

        if (!response.ok) {
          if (response.status === 404 || response.status === 200) {
            // Si no hay plan, intentar obtener planes por defecto
            const data = await response.json()
            if (data.plan) {
              return this.normalizeNutritionPlan(data.plan)
            }
            return null
          }
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        return data.plan ? this.normalizeNutritionPlan(data.plan) : null
      })

      // Almacenar en caché por 5 minutos si hay resultado
      if (result) {
        apiCache.set(cacheKey, result, 5 * 60 * 1000)
      }

      return result
    } catch (error) {
      return null
    }
  }

  // Ajustar el plan nutricional actual con un ajuste de calorías
  async adjustPlan(calorieAdjustment: number, reason?: string, notes?: string): Promise<NutritionPlan | null> {
    try {
      const headers = await getAuthHeaders()
      
      const response = await fetch(buildApiUrl('nutrition/adjust-plan/'), {
        credentials: 'include',
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
      throw handleFetchError(error)
    }
  }

  // Cambiar el plan nutricional del usuario
  async changePlan(defaultPlanId: string): Promise<NutritionPlan | null> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(NUTRITION_ENDPOINTS.CHANGE_PLAN), {
        credentials: 'include',
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

      return data.plan ? this.normalizeNutritionPlan(data.plan) : null
    } catch (error) {
      throw error
    }
  }

  // Obtener planes disponibles para el usuario
  async getAvailablePlans(): Promise<any[]> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(NUTRITION_ENDPOINTS.SUITABLE_PLANS), {
        credentials: 'include',
        headers,
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.plans || []
    } catch (error) {
      return []
    }
  }

  // Obtener comidas del plan activo organizadas por tipo
  async getPlanMealsForSelection(date?: string): Promise<{ 
    meals_by_type: Record<string, MealOption[]>, 
    meal_slots?: Array<{
      id: string
      day_of_week?: number | null
      name: string
      meal_type: string
      time?: string | null
      description?: string
      order_index?: number
    }>,
    options_by_meal_id?: Record<string, MealOption[]>,
    plan_name?: string,
    source?: string,
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
      const endpoint = date
        ? `${NUTRITION_ENDPOINTS.PLAN_MEALS_FOR_SELECTION}?date=${date}`
        : NUTRITION_ENDPOINTS.PLAN_MEALS_FOR_SELECTION
      const response = await fetch(buildApiUrl(endpoint), {
        credentials: 'include',
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
        meal_slots: data.meal_slots || [],
        options_by_meal_id: data.options_by_meal_id || {},
        plan_name: data.plan_name,
        source: data.source,
        daily_calories_target: data.daily_calories_target,
        daily_macros: data.daily_macros
      }
    } catch (error) {
      return null
    }
  }

  async getRecipeExclusions(): Promise<RecipeExclusionItem[]> {
    try {
      const headers = await getAuthHeaders()
      const response = await authenticatedFetch('nutrition/meal-exclusions/', {
        headers,
        method: 'GET',
      })
      if (!response.ok) return []
      const data = await response.json()
      return Array.isArray(data.exclusions) ? data.exclusions : []
    } catch {
      return []
    }
  }

  async addRecipeExclusion(recipeId: string, reason?: string): Promise<RecipeExclusionItem | null> {
    try {
      const headers = await getAuthHeaders()
      const response = await authenticatedFetch('nutrition/meal-exclusions/', {
        headers,
        method: 'POST',
        body: JSON.stringify({ recipe_id: recipeId, reason: reason || '' }),
      })
      if (!response.ok) return null
      return await response.json()
    } catch {
      return null
    }
  }

  async removeRecipeExclusion(exclusionId: string): Promise<boolean> {
    try {
      const headers = await getAuthHeaders()
      const response = await authenticatedFetch(`nutrition/meal-exclusions/${exclusionId}/`, {
        headers,
        method: 'DELETE',
      })
      return response.ok
    } catch {
      return false
    }
  }

  async getIngredientExclusions(): Promise<IngredientExclusionItem[]> {
    try {
      const headers = await getAuthHeaders()
      const response = await authenticatedFetch('nutrition/ingredient-exclusions/', {
        headers,
        method: 'GET',
      })
      if (!response.ok) return []
      const data = await response.json()
      return Array.isArray(data.exclusions) ? data.exclusions : []
    } catch {
      return []
    }
  }

  async addIngredientExclusion(term: string, reason?: string): Promise<IngredientExclusionItem | null> {
    try {
      const headers = await getAuthHeaders()
      const response = await authenticatedFetch('nutrition/ingredient-exclusions/', {
        headers,
        method: 'POST',
        body: JSON.stringify({ term, reason: reason || '' }),
      })
      if (!response.ok) return null
      return await response.json()
    } catch {
      return null
    }
  }

  async removeIngredientExclusion(exclusionId: string): Promise<boolean> {
    try {
      const headers = await getAuthHeaders()
      const response = await authenticatedFetch(`nutrition/ingredient-exclusions/${exclusionId}/`, {
        headers,
        method: 'DELETE',
      })
      return response.ok
    } catch {
      return false
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
        credentials: 'include',
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

            return this.normalizeNutritionPlan({
              id: defaultPlan.id,
              name: defaultPlan.name,
              description: defaultPlan.description,
              daily_calories: defaultPlan.daily_calories,
              target_macros: defaultPlan.target_macros,
              start_date: new Date().toISOString().split('T')[0],
              end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              is_active: true,
              meals: meals
            })
          }
        }

        // Fallback: plan local por defecto (solo si falla el backend)
        const today = new Date()
        const endDate = new Date()
        endDate.setDate(today.getDate() + 30)

        return this.normalizeNutritionPlan({
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
        })
      })

      // Almacenar en caché por 10 minutos (planes por defecto cambian menos)
      apiCache.set(cacheKey, result, 10 * 60 * 1000)

      return result
    } catch (error) {

      // Fallback: plan local por defecto (solo si falla el backend)
      const today = new Date()
      const endDate = new Date()
      endDate.setDate(today.getDate() + 30)

      return this.normalizeNutritionPlan({
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
      })
    }
  }

  // Obtener todos los planes de nutrición del usuario
  async getUserPlans(): Promise<NutritionPlan[]> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${buildApiUrl(NUTRITION_ENDPOINTS.PLANS)}`, {
        credentials: 'include',
        headers,
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const plans = data.results || []
      return plans.map((plan: any) => this.normalizeNutritionPlan(plan))
    } catch (error) {
      return []
    }
  }

  async createPlan(data: {
    name: string
    description?: string
    daily_calories: number
    protein_grams?: number
    carbs_grams?: number
    fat_grams?: number
    goal?: string
    diet_type?: string
    meals_per_day?: number
    duration_weeks?: number
  }): Promise<NutritionPlan | null> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(NUTRITION_ENDPOINTS.PLANS), {
        credentials: 'include',
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) return null
      const plan = await response.json()
      return this.normalizeNutritionPlan(plan)
    } catch {
      return null
    }
  }

  async updatePlan(id: string, data: Partial<{
    name: string
    description: string
    daily_calories: number
    protein_grams: number
    carbs_grams: number
    fat_grams: number
    goal: string
    diet_type: string
    meals_per_day: number
    duration_weeks: number
  }>): Promise<NutritionPlan | null> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`${NUTRITION_ENDPOINTS.PLANS}${id}/`), {
        credentials: 'include',
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) return null
      const plan = await response.json()
      return this.normalizeNutritionPlan(plan)
    } catch {
      return null
    }
  }

  async deletePlan(id: string): Promise<boolean> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`${NUTRITION_ENDPOINTS.PLANS}${id}/`), {
        credentials: 'include',
        method: 'DELETE',
        headers,
      })
      return response.ok || response.status === 204
    } catch {
      return false
    }
  }

  async activatePlan(id: string): Promise<boolean> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`${NUTRITION_ENDPOINTS.PLANS}${id}/activate/`), {
        credentials: 'include',
        method: 'POST',
        headers,
      })
      return response.ok
    } catch {
      return false
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
        credentials: 'include',
        headers,
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.results || []
    } catch (error) {
      return []
    }
  }

  // Obtener registro de comidas del usuario para una fecha específica
  async getMealLogs(date: string): Promise<MealLog[]> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${buildApiUrl(NUTRITION_ENDPOINTS.MEALS)}?date=${date}`, {
        credentials: 'include',
        headers,
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.results || []
    } catch (error) {
      return []
    }
  }

  // Marcar una comida como completada
  async markMealCompleted(mealId: string, date: string, notes?: string): Promise<MealLog | null> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${buildApiUrl(NUTRITION_ENDPOINTS.MEALS)}`, {
        credentials: 'include',
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
      return null
    }
  }

  // Crear un nuevo registro de comida
  async createMealLog(mealData: Partial<MealLog>): Promise<MealLog | null> {
    try {
      const headers = await getAuthHeaders()

      const hasPhoto = mealData.photo instanceof File
      let response: Response

      if (hasPhoto) {
        const formData = new FormData()
        Object.entries(mealData).forEach(([key, value]) => {
          if (value === undefined || value === null) return
          if (key === 'photo' && value instanceof File) {
            formData.append('photo', value)
            return
          }
          formData.append(key, String(value))
        })

        response = await fetch(`${buildApiUrl(NUTRITION_ENDPOINTS.MEALS)}`, {
        credentials: 'include',
          headers: {
            Authorization: headers.Authorization || headers.authorization || headers['Authorization'] || ''
          },
          method: 'POST',
          body: formData,
        })
      } else {
        response = await fetch(`${buildApiUrl(NUTRITION_ENDPOINTS.MEALS)}`, {
        credentials: 'include',
          headers,
          method: 'POST',
          body: JSON.stringify(mealData),
        })
      }

      if (!response.ok) {
        // Intentar obtener más detalles del error
        let errorDetails = ''
        try {
          const errorResponse = await response.json()
          errorDetails = JSON.stringify(errorResponse)
        } catch {
          errorDetails = response.statusText
        }

        throw new Error(`Error ${response.status}: ${errorDetails}`)
      }

      return await response.json()
    } catch (error) {
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
      
      const response = await fetch(url, {
        credentials: 'include',
        headers,
        method: 'GET',
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error ${response.status}: ${response.statusText}. ${errorText}`)
      }

      // Parsear JSON asegurando UTF-8
      const text = await response.text()
      const data = JSON.parse(text)
      return data
    } catch (error: any) {
      throw error // Re-lanzar el error para que el componente pueda manejarlo
    }
  }

  // Obtener receta por ID
  async getRecipe(recipeId: number | string): Promise<Recipe | null> {
    try {
      const headers = await getAuthHeaders()
      const url = `${buildApiUrl(`nutrition/recipes/${recipeId}/`)}`
      
      const response = await fetch(url, {
        credentials: 'include',
        headers,
        method: 'GET',
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error ${response.status}: ${response.statusText}. ${errorText}`)
      }

      const data = await response.json()
      return data
    } catch (error: any) {
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
      return []
    }
  }

  // Listar todas las recetas
  async listRecipes(): Promise<Recipe[]> {
    try {
      const headers = await getAuthHeaders()
      const pageSize = 200
      
      // Intentar primero con el endpoint estándar
      let baseEndpoint = 'nutrition/recipes/'
      let response = await fetch(
        `${buildApiUrl(`${baseEndpoint}?page_size=${pageSize}&page=1`)}`,
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
            `${buildApiUrl(`${baseEndpoint}?page_size=${pageSize}&page=1`)}`,
            {
              headers,
              method: 'GET',
            }
          )
        }
      }

      // Si aún falla con 404, intentar con el endpoint de admin
      if (response.status === 404) {
        baseEndpoint = 'admin/nutrition/recipes/'
        response = await fetch(
          `${buildApiUrl(`${baseEndpoint}?page_size=${pageSize}&page=1`)}`,
          {
            headers,
            method: 'GET',
          }
        )
      }

      if (!response.ok) {
        // Si falla, devolver array vacío en lugar de lanzar error
        return []
      }

      const data = await response.json()
      if (Array.isArray(data)) {
        return data
      }

      const firstPage = Array.isArray(data.results) ? data.results : (data.recipes || [])
      const totalPages = data.total_pages || 1
      const count = data.count || firstPage.length

      if (totalPages <= 1 || firstPage.length >= count) {
        return firstPage
      }

      const all = [...firstPage]
      for (let page = 2; page <= totalPages; page += 1) {
        const pageResponse = await fetch(
          `${buildApiUrl(`${baseEndpoint}?page_size=${pageSize}&page=${page}`)}`,
          {
            headers,
            method: 'GET',
          }
        )
        if (!pageResponse.ok) break
        const pageData = await pageResponse.json()
        const pageResults = Array.isArray(pageData.results) ? pageData.results : (pageData.recipes || [])
        all.push(...pageResults)
        if (all.length >= count) break
      }
      return all
    } catch (error) {
      return []
    }
  }

  async getIngredientSubstitutions(
    recipeId: number | string,
    params: {
      ingredientId?: string
      foodId?: string
      quantity?: number | string
      unit?: string
      search?: string
      category?: string
    }
  ): Promise<IngredientSubstitutionResponse | null> {
    try {
      const headers = await getAuthHeaders()
      const query = new URLSearchParams()

      if (params.ingredientId) query.set('ingredient_id', params.ingredientId)
      if (params.foodId) query.set('food_id', params.foodId)
      if (params.quantity !== undefined) query.set('quantity', String(params.quantity))
      if (params.unit) query.set('unit', params.unit)
      if (params.search?.trim()) query.set('search', params.search.trim())
      if (params.category?.trim()) query.set('category', params.category.trim())

      const response = await fetch(
        buildApiUrl(`nutrition/recipes/${recipeId}/ingredient-substitutions/?${query.toString()}`),
        {
          headers,
          method: 'GET',
        }
      )

      if (!response.ok) {
        return null
      }

      return await response.json()
    } catch (error) {
      return null
    }
  }

  /**
   * Obtener selecciones de comidas para una semana
   */
  async getWeeklyMealSelections(startDate?: string): Promise<Record<string, any[]>> {
    // Esta función ahora devuelve todas las selecciones (completadas y no completadas)
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
        return {}
      }

      const data = await response.json()
      return data.selections || {}
    } catch (error) {
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
        return {}
      }

      const data = await response.json()
      return data.selections || {}
    } catch (error) {
      return {}
    }
  }

  /**
   * Guardar selecciones de comidas para múltiples días
   */
  async saveWeeklyMealSelections(selections: Array<{
    date: string
    meal_type: string
    plan_meal_id?: string
    recipe_id?: string
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
    custom_description?: string
    substitution_details?: MealIngredientSubstitution[]
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
      plan_meal_id?: string
      recipe_id?: string
      calories?: number
      protein?: number
      carbs?: number
      fat?: number
      custom_description?: string
      substitution_details?: MealIngredientSubstitution[]
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
      throw error
    }
  }

}

// Exportar instancia singleton
export const nutritionService = new NutritionService()
export default nutritionService
