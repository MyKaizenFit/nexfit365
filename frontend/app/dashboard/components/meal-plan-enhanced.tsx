"use client"

import { useState, useEffect } from "react"
import { Check, Clock, ChefHat, BookOpen, Utensils, Loader2, Calendar, History } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"
import { useNutrition } from "@/hooks/use-nutrition"
import { MealOptionsModal } from "./meal-options-modal"
import { buildApiUrl, authenticatedFetch } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { getAuthService } from "@/lib/auth-service"

// Estructura de las 5 comidas fijas
const MEAL_STRUCTURE = [
  {
    type: "Desayuno",
    time: "08:00",
    icon: "🌅",
    description: "Comienza el día con energía"
  },
  {
    type: "Snack Mañana", 
    time: "10:30",
    icon: "☕",
    description: "Mantén el metabolismo activo"
  },
  {
    type: "Almuerzo",
    time: "13:00", 
    icon: "🍽️",
    description: "Comida principal del día"
  },
  {
    type: "Snack Tarde",
    time: "16:00",
    icon: "🍎", 
    description: "Recupera fuerzas para la tarde"
  },
  {
    type: "Cena",
    time: "20:00",
    icon: "🌙",
    description: "Termina el día de forma ligera"
  }
]

interface DailyMealSelection {
  id: string
  date: string
  meal_type: string
  selected_meal: {
    id: string
    name: string
    calories: number
    protein: number
    carbs: number
    fat: number
    description: string
    cook_time?: string
    difficulty?: string
    tags?: string[]
    recipe_url?: string
  }
  is_completed: boolean
  completed_at?: string
  notes?: string
}

export function MealPlanEnhanced() {
  const [dailySelections, setDailySelections] = useState<DailyMealSelection[]>([])
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false)

  const { user, isAuthenticated } = useAuth()
  const { 
    currentPlan, 
    suggestedMeals, 
    dailyStats, 
    error,
    refreshPlan 
  } = useNutrition()

  // Cargar selecciones del día
  useEffect(() => {
    // Solo cargar si está autenticado y no se ha intentado cargar antes
    const authService = getAuthService()
    if (isAuthenticated && authService.isAuthenticated() && !hasAttemptedLoad) {
      setHasAttemptedLoad(true)
      loadDailySelections()
    }
  }, [isAuthenticated, hasAttemptedLoad])

  const loadDailySelections = async () => {
    const authService = getAuthService()
    if (!isAuthenticated || !authService.isAuthenticated()) {
      return
    }

    try {
      setIsLoading(true)
      const today = new Date().toISOString().split('T')[0]
      
      const response = await authenticatedFetch('nutrition/daily-meal-selections/today/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setDailySelections(data)
      } else if (response.status === 401) {
        // Usuario no autenticado, mostrar mensaje y no reintentar
        toast({
          title: "Sesión expirada",
          description: "Por favor, inicia sesión nuevamente",
          variant: "destructive"
        })
        // No llamar a createDefaultSelections aquí para evitar bucles
        return
      } else {
        // Solo crear selecciones por defecto si no es un error de autenticación
        createDefaultSelections(today)
      }
    } catch (error: unknown) {
      // Solo crear selecciones por defecto si no es un error de autenticación
      const errorMessage = error instanceof Error ? error.message : ''
      if (errorMessage && !errorMessage.includes('Sesión expirada')) {
        const today = new Date().toISOString().split('T')[0]
        createDefaultSelections(today)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const createDefaultSelections = async (date: string) => {
    const authService = getAuthService()
    if (!isAuthenticated || !authService.getAccessToken()) {
      return
    }

    try {
      const defaultSelections = {
        date: date,
        breakfast: [],
        lunch: [],
        dinner: [],
        snacks: []
      }

      const response = await authenticatedFetch('nutrition/daily-meal-selections/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(defaultSelections)
      })

      if (response.ok) {
        const data = await response.json()
        setDailySelections(data)
        toast({
          title: "Selecciones creadas",
          description: "Se han creado las selecciones por defecto para hoy",
        })
      } else if (response.status === 401) {
        // No reintentar si es un error de autenticación
        return
      } else {
      }
    } catch (error: unknown) {
      // No reintentar si es un error de autenticación
      const errorMessage = error instanceof Error ? error.message : ''
      if (errorMessage && !errorMessage.includes('Sesión expirada')) {
      }
    }
  }

  const handleOpenMealOptions = (mealType: string) => {
    setSelectedMeal(mealType)
    setIsModalOpen(true)
  }

  const handleSelectMealOption = async (option: any) => {
    if (!selectedMeal) return

    try {
      const today = new Date().toISOString().split('T')[0]
      const selection = dailySelections.find(s => s.meal_type === selectedMeal && s.date === today)
      
      if (selection) {
        // Actualizar la selección existente
        const response = await authenticatedFetch(buildApiUrl(`nutrition/daily-meal-selections/${selection.id}/`), {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${getAuthService().getAccessToken()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            selected_meal_id: option.id,
            notes: `Seleccionado: ${option.name}`
          })
        })
        
        if (response.ok) {
          await loadDailySelections() // Recargar datos
          toast({
            title: "Comida seleccionada",
            description: `${option.name} seleccionada para ${selectedMeal}`,
          })
        } else if (response.status === 401) {
          toast({
            title: "Sesión expirada",
            description: "Por favor, inicia sesión nuevamente",
            variant: "destructive"
          })
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo seleccionar la comida",
        variant: "destructive"
      })
    }
    
    setIsModalOpen(false)
    setSelectedMeal(null)
  }

  const handleMarkCompleted = async (selection: DailyMealSelection) => {
    try {
      const response = await fetch(buildApiUrl(`nutrition/daily-meal-selections/${selection.id}/mark_completed/`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthService().getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        await loadDailySelections() // Recargar datos
        toast({
          title: "¡Comida completada!",
          description: `${selection.selected_meal.name} marcada como completada`,
        })
      } else if (response.status === 401) {
        toast({
          title: "Sesión expirada",
          description: "Por favor, inicia sesión nuevamente",
          variant: "destructive"
        })
      }
    } catch (error) {
    }
  }

  const handleChangeMeal = async (selection: DailyMealSelection) => {
    setSelectedMeal(selection.meal_type)
    setIsModalOpen(true)
  }

  // Obtener opciones de comida para el modal
  const getMealOptions = (mealType: string) => {
    const mealTypeMap: Record<string, string[]> = {
      "Desayuno": ["desayuno", "breakfast", "porridge", "yogur", "tostada", "smoothie", "aguacate"],
      "Snack Mañana": ["snack", "mañana", "overnight", "batido", "requesón", "muesli"],
      "Almuerzo": ["almuerzo", "lunch", "pollo", "arroz", "lentejas", "salmón", "pasta", "tacos"],
      "Snack Tarde": ["snack", "tarde", "hummus", "kéfir", "queso", "smoothie bowl", "tortitas"],
      "Cena": ["cena", "dinner", "garbanzos", "merluza", "pollo", "tortilla", "frittata"]
    }
    
    const keywords = mealTypeMap[mealType] || []
    
    return suggestedMeals.filter(meal => 
      keywords.some(keyword => 
        meal.name.toLowerCase().includes(keyword.toLowerCase()) ||
        meal.description.toLowerCase().includes(keyword.toLowerCase())
      )
    ).slice(0, 5) // Máximo 5 opciones
  }

  // Calcular macros restantes
  const remainingMacros = {
    calories: (currentPlan?.daily_calories || 2000) - dailyStats.totalCalories,
    protein: (currentPlan?.target_macros?.protein || 150) - dailyStats.totalProtein,
    carbs: (currentPlan?.target_macros?.carbs || 200) - dailyStats.totalCarbs,
    fat: (currentPlan?.target_macros?.fat || 65) - dailyStats.totalFat,
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan de Comidas de Hoy</CardTitle>
          <CardDescription>Inicia sesión para ver tu plan de nutrición</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Necesitas iniciar sesión para acceder a esta funcionalidad</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan de Comidas de Hoy</CardTitle>
          <CardDescription>Cargando tu plan personalizado...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Cargando plan de nutrición...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Plan de Comidas de Hoy
          </CardTitle>
          <CardDescription>
            {currentPlan ? `Plan: ${currentPlan.name}` : 'Tu menú personalizado para alcanzar tus objetivos'}
          </CardDescription>

          {/* Resumen de macros restantes */}
          <div className="grid grid-cols-4 gap-2 mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Restantes</p>
              <p className="text-sm font-bold">{remainingMacros.calories} kcal</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Proteína</p>
              <p className="text-sm font-bold">{remainingMacros.protein}g</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Carbos</p>
              <p className="text-sm font-bold">{remainingMacros.carbs}g</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Grasas</p>
              <p className="text-sm font-bold">{remainingMacros.fat}g</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {MEAL_STRUCTURE.map((meal, index) => {
              const selection = dailySelections.find(s => s.meal_type === meal.type)
              const hasSelection = selection && selection.selected_meal
              
              return (
                <div
                  key={meal.type}
                  className={`p-4 rounded-lg border transition-all duration-300 hover:shadow-md ${
                    selection?.is_completed 
                      ? "bg-green-50 border-green-200" 
                      : hasSelection 
                        ? "bg-blue-50 border-blue-200" 
                        : "bg-muted/50 border-muted"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Icono y tiempo */}
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{meal.icon}</span>
                      <div>
                        <h3 className="font-medium">{meal.type}</h3>
                        <p className="text-sm text-muted-foreground">{meal.time}</p>
                      </div>
                    </div>

                    {/* Estado de la comida */}
                    <div className="flex-1">
                      {hasSelection ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{selection.selected_meal.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {selection.selected_meal.calories} kcal
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            P: {selection.selected_meal.protein}g • C: {selection.selected_meal.carbs}g • G: {selection.selected_meal.fat}g
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">{meal.description}</p>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2">
                      {hasSelection ? (
                        <>
                          {!selection.is_completed ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleChangeMeal(selection)}
                                className="flex items-center gap-2"
                              >
                                <ChefHat className="h-4 w-4" />
                                Cambiar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleMarkCompleted(selection)}
                                className="flex items-center gap-2"
                              >
                                <Check className="h-4 w-4" />
                                Completar
                              </Button>
                            </>
                          ) : (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Completada
                            </Badge>
                          )}
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenMealOptions(meal.type)}
                          className="flex items-center gap-2"
                        >
                          <Utensils className="h-4 w-4" />
                          Ver Opciones
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Información adicional de la comida seleccionada */}
                  {hasSelection && selection.selected_meal.description && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-muted-foreground">
                        {selection.selected_meal.description}
                      </p>
                      
                      {/* Tags y tiempo de cocción */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selection.selected_meal.cook_time && (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {selection.selected_meal.cook_time}
                          </Badge>
                        )}
                        {selection.selected_meal.difficulty && (
                          <Badge variant="outline" className="text-xs">
                            {selection.selected_meal.difficulty}
                          </Badge>
                        )}
                        {selection.selected_meal.tags?.slice(0, 2).map((tag, tagIndex) => (
                          <Badge key={tagIndex} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Progreso del día */}
          <div className="mt-6 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Progreso del día</h4>
              <span className="text-sm text-muted-foreground">
                {dailyStats.totalCalories} / {currentPlan?.daily_calories || 2000} kcal
              </span>
            </div>
            <Progress value={(dailyStats.totalCalories / (currentPlan?.daily_calories || 2000)) * 100} className="h-2" />
            
            <div className="grid grid-cols-3 gap-4 mt-3 text-xs">
              <div className="text-center">
                <p className="text-muted-foreground">Proteína</p>
                <p className="font-medium">
                  {Math.round((dailyStats.totalProtein / (currentPlan?.target_macros?.protein || 150)) * 100)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Carbohidratos</p>
                <p className="font-medium">
                  {Math.round((dailyStats.totalCarbs / (currentPlan?.target_macros?.carbs || 200)) * 100)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Grasas</p>
                <p className="font-medium">
                  {Math.round((dailyStats.totalFat / (currentPlan?.target_macros?.fat || 65)) * 100)}%
                </p>
              </div>
            </div>
          </div>

          {/* Botón para ver historial */}
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm" className="flex items-center gap-2 mx-auto">
              <History className="h-4 w-4" />
              Ver Historial de Comidas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal de opciones de comida */}
      {selectedMeal && (
        <MealOptionsModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedMeal(null)
          }}
          mealName={selectedMeal}
          mealTime={MEAL_STRUCTURE.find(m => m.type === selectedMeal)?.time || ""}
          options={getMealOptions(selectedMeal)}
          onSelectMeal={handleSelectMealOption}
        />
      )}
    </>
  )
}
