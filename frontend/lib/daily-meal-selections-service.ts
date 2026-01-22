// lib/daily-meal-selections-service.ts
// Servicio para gestionar selecciones diarias de comidas

import { API_CONFIG, getAuthHeaders, buildApiUrl } from './api'
import { MealOption } from './nutrition-service'
import { requestThrottler } from './request-throttle'
import { apiCache, generateCacheKey } from './api-cache'

export interface DailyMealSelection {
  id?: string
  user?: string
  date: string
  meal_type: string
  selected_option: MealOption
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface DailyMealSelectionsResponse {
  results: DailyMealSelection[]
  count: number
  next: string | null
  previous: string | null
}

class DailyMealSelectionsService {
  private baseUrl: string

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL
  }

  // Obtener selecciones del día
  async getDailySelections(date: string): Promise<DailyMealSelection[]> {
    // Verificar si hay token de acceso disponible
    try {
      const { authService } = require('./auth-service')
      const token = authService.getAccessToken()
      if (!token) {
        return []
      }
    } catch (error) {
      return []
    }

    const cacheKey = generateCacheKey(`daily-meal-selections/?date=${date}`)
    
    // Intentar obtener del caché primero
    const cached = apiCache.get<DailyMealSelection[]>(cacheKey)
    if (cached) {
      return cached
    }

    try {
      const result = await requestThrottler.throttle('daily-meal-selections', async () => {
        const headers = await getAuthHeaders()
        const response = await fetch(`${buildApiUrl('nutrition/daily-meal-selections/')}?date=${date}`, {
          headers,
          method: 'GET',
        })

        if (!response.ok) {
          if (response.status === 404) {
            return []
          }
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const data: DailyMealSelectionsResponse = await response.json()
        return data.results || []
      })

      // Almacenar en caché por 1 minuto (las selecciones cambian frecuentemente)
      apiCache.set(cacheKey, result, 1 * 60 * 1000)
      
      return result
    } catch (error) {
      return []
    }
  }

  // Crear o actualizar selección de comida
  async saveMealSelection(selection: Partial<DailyMealSelection>): Promise<DailyMealSelection | null> {
    // Verificar si hay token de acceso disponible
    try {
      const { authService } = require('./auth-service')
      const token = authService.getAccessToken()
      if (!token) {
        return null
      }
    } catch (error) {
      return null
    }

    try {
      const headers = await getAuthHeaders()
      
      // Verificar si ya existe una selección para esta comida y fecha
      const existingSelections = await this.getDailySelections(selection.date!)
      const existingSelection = existingSelections.find(
        s => s.meal_type === selection.meal_type
      )

      // Mapeo de tipos de comida a UUIDs de DefaultMeal del backend
      const mealTypeToUUID: Record<string, string> = {
        'breakfast': '95a0a1a2-8b30-42dd-81e4-ac730e2bd8b8', // Desayuno
        'morning_snack': 'f452d76e-43cc-4dc9-b646-576d3dca9ad4', // Snack Mañana
        'lunch': '48bc2dce-2d14-488f-8fbe-41a91ad383c1', // Almuerzo
        'afternoon_snack': '7dced9fd-1428-4014-9f86-831597e22da3', // Snack Tarde
        'dinner': '15f40ebf-d147-4106-8845-164a6d1537c4' // Cena
      }

      // Obtener el UUID correspondiente al tipo de comida
      const selectedMealUUID = mealTypeToUUID[selection.meal_type!]
      
      if (!selectedMealUUID) {
        throw new Error(`Tipo de comida no válido: ${selection.meal_type}`)
      }

      // Preparar los datos para enviar al backend
      const dataToSend = {
        date: selection.date,
        meal_type: selection.meal_type,
        selected_meal_id: selectedMealUUID, // UUID válido del backend
        notes: selection.notes || `Seleccionado: ${selection.selected_option?.name}`,
      }


      let response: Response

      if (existingSelection) {
        // Actualizar selección existente
        response = await fetch(`${buildApiUrl(`nutrition/daily-meal-selections/${existingSelection.id}/`)}`, {
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          method: 'PUT',
          body: JSON.stringify(dataToSend),
        })
      } else {
        // Crear nueva selección
        response = await fetch(`${buildApiUrl('nutrition/daily-meal-selections/')}`, {
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          method: 'POST',
          body: JSON.stringify(dataToSend),
        })
      }

      if (!response.ok) {
        let errorDetails = ''
        try {
          const errorResponse = await response.json()
          errorDetails = JSON.stringify(errorResponse)
        } catch {
          errorDetails = response.statusText
        }
        
        throw new Error(`Error ${response.status}: ${errorDetails}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      return null
    }
  }

  // Eliminar selección de comida
  async deleteMealSelection(selectionId: string): Promise<boolean> {
    // Verificar si hay token de acceso disponible
    try {
      const { authService } = require('./auth-service')
      const token = authService.getAccessToken()
      if (!token) {
        return false
      }
    } catch (error) {
      return false
    }

    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${buildApiUrl(`nutrition/daily-meal-selections/${selectionId}/`)}`, {
        headers,
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return true
    } catch (error) {
      return false
    }
  }

  // Obtener todas las selecciones de un usuario
  async getUserSelections(userId?: string): Promise<DailyMealSelection[]> {
    // Verificar si hay token de acceso disponible
    try {
      const { authService } = require('./auth-service')
      const token = authService.getAccessToken()
      if (!token) {
        return []
      }
    } catch (error) {
      return []
    }

    try {
      const headers = await getAuthHeaders()
      const url = userId 
        ? `${buildApiUrl('nutrition/daily-meal-selections/')}?user=${userId}`
        : `${buildApiUrl('nutrition/daily-meal-selections/')}`
      
      const response = await fetch(url, {
        headers,
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data: DailyMealSelectionsResponse = await response.json()
      return data.results || []
    } catch (error) {
      return []
    }
  }

  // Sincronizar selecciones locales con el backend
  async syncSelectionsWithBackend(
    localSelections: Record<string, MealOption>,
    date: string
  ): Promise<boolean> {
    try {
      
      // Obtener selecciones del backend
      const backendSelections = await this.getDailySelections(date)

      // Crear mapeo de tipos de comida
      const mealTypeMapping: Record<string, string> = {
        'Desayuno': 'breakfast',
        'Snack Mañana': 'morning_snack',
        'Almuerzo': 'lunch',
        'Snack Tarde': 'afternoon_snack',
        'Cena': 'dinner'
      }

      // Guardar cada selección local en el backend
      for (const [mealName, option] of Object.entries(localSelections)) {
        const mealType = mealTypeMapping[mealName]
        if (mealType) {
          const selection: Partial<DailyMealSelection> = {
            date,
            meal_type: mealType,
            selected_option: option,
            notes: `Seleccionado: ${option.name}`
          }

          const result = await this.saveMealSelection(selection)
          if (!result) {
            return false
          }
        }
      }

      return true
    } catch (error) {
      return false
    }
  }

  // Cargar selecciones del backend y convertirlas al formato local
  async loadSelectionsFromBackend(date: string): Promise<Record<string, MealOption>> {
    try {
      const backendSelections = await this.getDailySelections(date)

      // Mapeo inverso de tipos de comida
      const mealTypeMapping: Record<string, string> = {
        'breakfast': 'Desayuno',
        'morning_snack': 'Snack Mañana',
        'lunch': 'Almuerzo',
        'afternoon_snack': 'Snack Tarde',
        'dinner': 'Cena'
      }

      const localSelections: Record<string, MealOption> = {}

      backendSelections.forEach(selection => {
        const mealName = mealTypeMapping[selection.meal_type]
        if (mealName && selection.selected_option) {
          localSelections[mealName] = selection.selected_option
        }
      })

      return localSelections
    } catch (error) {
      return {}
    }
  }
}

// Exportar instancia singleton
export const dailyMealSelectionsService = new DailyMealSelectionsService()
export default dailyMealSelectionsService

