"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Save, ChefHat, Clock, Zap, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { buildApiUrl, getAuthHeaders } from "@/lib/api"

interface MealFood {
  food_id: string
  quantity: number
  food_name?: string
}

interface Meal {
  id?: string
  name: string
  time: string
  calories: number
  protein: number
  carbs: number
  fat: number
  description: string
  order_index?: number
  meal_foods?: MealFood[]
}

interface NutritionPlan {
  id?: string
  name: string
  description: string
  daily_calories: number
  target_macros: {
    protein_percentage?: number
    carbs_percentage?: number
    fat_percentage?: number
    protein?: number
    carbs?: number
    fat?: number
  }
  meals: Meal[]
  is_active?: boolean
  start_date?: string
  end_date?: string
}

export function NutritionPlanEditor({ userId, onSave }: { userId: string; onSave: () => void }) {
  const [plan, setPlan] = useState<NutritionPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar plan del usuario
  useEffect(() => {
    loadUserPlan()
  }, [userId])

  const loadUserPlan = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const headers = await getAuthHeaders()
      // Obtener planes del usuario (activos primero)
      const response = await fetch(buildApiUrl(`nutrition/plans/?user=${userId}`), {
        headers,
      })

      if (!response.ok) {
        throw new Error('Error al cargar el plan del usuario')
      }

      const data = await response.json()
      const plans = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : [])
      
      // Buscar plan activo o el más reciente
      let userPlan = plans.find((p: any) => p.is_active) || plans[0]

      if (userPlan) {
        // Cargar detalles completos del plan
        const detailResponse = await fetch(buildApiUrl(`nutrition/plans/${userPlan.id}/`), {
          headers,
        })

        if (detailResponse.ok) {
          const planDetail = await detailResponse.json()
          // Convertir formato del backend al formato del componente
          setPlan({
            id: planDetail.id,
            name: planDetail.name || 'Plan Nutricional',
            description: planDetail.description || '',
            daily_calories: planDetail.daily_calories || 2000,
            target_macros: {
              protein: planDetail.target_macros?.protein || 0,
              carbs: planDetail.target_macros?.carbs || 0,
              fat: planDetail.target_macros?.fat || 0,
              protein_percentage: planDetail.target_macros?.protein_percentage,
              carbs_percentage: planDetail.target_macros?.carbs_percentage,
              fat_percentage: planDetail.target_macros?.fat_percentage,
            },
            meals: (planDetail.meals || []).map((meal: any, index: number) => ({
              id: meal.id,
              name: meal.name || `Comida ${index + 1}`,
              time: meal.time || '12:00',
              calories: meal.calories || 0,
              protein: meal.protein || 0,
              carbs: meal.carbs || 0,
              fat: meal.fat || 0,
              description: meal.description || '',
              order_index: meal.order_index || index + 1,
              meal_foods: meal.meal_foods || [],
            })),
            is_active: planDetail.is_active,
            start_date: planDetail.start_date,
            end_date: planDetail.end_date,
          })
        } else {
          // Si no hay detalles, usar el plan básico
          setPlan({
            id: userPlan.id,
            name: userPlan.name || 'Plan Nutricional',
            description: userPlan.description || '',
            daily_calories: userPlan.daily_calories || 2000,
            target_macros: {
              protein: 0,
              carbs: 0,
              fat: 0,
            },
            meals: [],
            is_active: userPlan.is_active,
          })
        }
      } else {
        // Crear plan vacío si no existe
        setPlan({
          name: "Nuevo Plan Nutricional",
          description: "Plan nutricional personalizado",
          daily_calories: 2000,
          target_macros: {
            protein: 150,
            carbs: 220,
            fat: 80,
          },
          meals: [],
        })
      }
    } catch (err) {
      console.error('Error cargando plan:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      toast({
        title: 'Error',
        description: 'No se pudo cargar el plan del usuario',
        variant: 'destructive'
      })
      // Crear plan vacío en caso de error
      setPlan({
        name: "Nuevo Plan Nutricional",
        description: "Plan nutricional personalizado",
        daily_calories: 2000,
        target_macros: {
          protein: 150,
          carbs: 220,
          fat: 80,
        },
        meals: [],
      })
    } finally {
      setLoading(false)
    }
  }

  const addMeal = () => {
    if (!plan) return
    
    const newMeal: Meal = {
      name: "Nueva Comida",
      time: "12:00",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      description: "",
      order_index: plan.meals.length + 1,
      meal_foods: [],
    }
    setPlan({ ...plan, meals: [...plan.meals, newMeal] })
  }

  const updateMeal = (mealIndex: number, updates: Partial<Meal>) => {
    if (!plan) return
    
    setPlan({
      ...plan,
      meals: plan.meals.map((meal, index) => 
        index === mealIndex ? { ...meal, ...updates } : meal
      ),
    })
  }

  const deleteMeal = (mealIndex: number) => {
    if (!plan) return
    
    setPlan({
      ...plan,
      meals: plan.meals.filter((_, index) => index !== mealIndex),
    })
  }

  const addFoodToMeal = (mealIndex: number) => {
    if (!plan) return
    
    const food = prompt("Añadir alimento (ID del alimento):")
    if (food) {
      const meal = plan.meals[mealIndex]
      const newMealFood: MealFood = {
        food_id: food,
        quantity: 100, // cantidad por defecto en gramos
      }
      updateMeal(mealIndex, {
        meal_foods: [...(meal.meal_foods || []), newMealFood],
      })
    }
  }

  const removeFoodFromMeal = (mealIndex: number, foodIndex: number) => {
    if (!plan) return
    
    const meal = plan.meals[mealIndex]
    if (meal.meal_foods) {
      const newFoods = meal.meal_foods.filter((_, index) => index !== foodIndex)
      updateMeal(mealIndex, { meal_foods: newFoods })
    }
  }

  const handleSave = async () => {
    if (!plan) return

    try {
      setSaving(true)
      setError(null)

      const headers = await getAuthHeaders()
      
      // Preparar datos para el backend
      const planData = {
        user_id: userId,
        name: plan.name,
        description: plan.description,
        daily_calories: plan.daily_calories,
        target_macros: {
          protein: plan.target_macros.protein || 0,
          carbs: plan.target_macros.carbs || 0,
          fat: plan.target_macros.fat || 0,
        },
        meals: plan.meals.map((meal, index) => ({
          name: meal.name,
          time: meal.time,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          description: meal.description,
          order_index: meal.order_index || index + 1,
          meal_foods: meal.meal_foods || [],
        })),
        is_active: plan.is_active !== false, // Por defecto activo
      }

      let response
      if (plan.id) {
        // Actualizar plan existente
        response = await fetch(buildApiUrl(`nutrition/plans/${plan.id}/`), {
          method: 'PATCH',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(planData),
        })
      } else {
        // Crear nuevo plan
        response = await fetch(buildApiUrl('nutrition/plans/'), {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(planData),
        })
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.error || 'Error al guardar el plan')
      }

      const savedPlan = await response.json()
      
      toast({
        title: "✅ Plan nutricional guardado",
        description: "Los cambios han sido aplicados al usuario",
      })
      
      // Actualizar el plan con el ID si es nuevo
      if (!plan.id && savedPlan.id) {
        setPlan({ ...plan, id: savedPlan.id })
      }
      
      onSave()
    } catch (err) {
      console.error('Error guardando plan:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      toast({
        title: "❌ Error",
        description: err instanceof Error ? err.message : 'No se pudo guardar el plan',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-muted-foreground">Cargando plan nutricional...</p>
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No se pudo cargar el plan del usuario</p>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>
    )
  }

  const totalMacros = plan.meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein,
      carbs: acc.carbs + meal.carbs,
      fat: acc.fat + meal.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )

  return (
    <div className="space-y-6">
      {/* Header del plan */}
      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            <ChefHat className="h-6 w-6" />
            Editor de Plan Nutricional
          </CardTitle>
          <CardDescription>Personaliza el plan de alimentación del usuario</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plan-name">Nombre del plan</Label>
              <Input
                id="plan-name"
                value={plan.name}
                onChange={(e) => setPlan({ ...plan, name: e.target.value })}
                className="border-2 border-gray-200 focus:border-orange-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="daily-calories">Calorías diarias objetivo</Label>
              <Input
                id="daily-calories"
                type="number"
                value={plan.daily_calories}
                onChange={(e) => setPlan({ ...plan, daily_calories: Number(e.target.value) })}
                className="border-2 border-gray-200 focus:border-orange-400"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-description">Descripción</Label>
            <Textarea
              id="plan-description"
              value={plan.description}
              onChange={(e) => setPlan({ ...plan, description: e.target.value })}
              className="border-2 border-gray-200 focus:border-orange-400"
              rows={2}
            />
          </div>

          {/* Macros objetivo */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <Label htmlFor="target-protein" className="text-blue-700">
                Proteínas (g)
              </Label>
              <Input
                id="target-protein"
                type="number"
                value={plan.target_macros.protein || 0}
                onChange={(e) =>
                  setPlan({
                    ...plan,
                    target_macros: { ...plan.target_macros, protein: Number(e.target.value) },
                  })
                }
                className="mt-1 text-center border-blue-300 focus:border-blue-500"
              />
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <Label htmlFor="target-carbs" className="text-green-700">
                Carbohidratos (g)
              </Label>
              <Input
                id="target-carbs"
                type="number"
                value={plan.target_macros.carbs || 0}
                onChange={(e) =>
                  setPlan({
                    ...plan,
                    target_macros: { ...plan.target_macros, carbs: Number(e.target.value) },
                  })
                }
                className="mt-1 text-center border-green-300 focus:border-green-500"
              />
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
              <Label htmlFor="target-fat" className="text-yellow-700">
                Grasas (g)
              </Label>
              <Input
                id="target-fat"
                type="number"
                value={plan.target_macros.fat || 0}
                onChange={(e) =>
                  setPlan({
                    ...plan,
                    target_macros: { ...plan.target_macros, fat: Number(e.target.value) },
                  })
                }
                className="mt-1 text-center border-yellow-300 focus:border-yellow-500"
              />
            </div>
          </div>

          {/* Resumen actual */}
          <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-800 mb-2">Totales actuales del plan:</h4>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <span className="font-bold text-lg">{totalMacros.calories}</span>
                <p className="text-gray-600">kcal</p>
              </div>
              <div className="text-center">
                <span className="font-bold text-lg text-blue-600">{totalMacros.protein}g</span>
                <p className="text-gray-600">Proteínas</p>
              </div>
              <div className="text-center">
                <span className="font-bold text-lg text-green-600">{totalMacros.carbs}g</span>
                <p className="text-gray-600">Carbos</p>
              </div>
              <div className="text-center">
                <span className="font-bold text-lg text-yellow-600">{totalMacros.fat}g</span>
                <p className="text-gray-600">Grasas</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de comidas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Comidas del día</h3>
          <Button
            onClick={addMeal}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Añadir comida
          </Button>
        </div>

        {plan.meals.map((meal, index) => (
          <Card key={meal.id || index} className="backdrop-blur-sm bg-white/80 border-0 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Comida #{index + 1}</CardTitle>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => deleteMeal(index)}
                  className="h-8 w-8 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Nombre de la comida</Label>
                  <Input
                    value={meal.name}
                    onChange={(e) => updateMeal(index, { name: e.target.value })}
                    className="border-2 border-gray-200 focus:border-orange-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="time"
                      value={meal.time}
                      onChange={(e) => updateMeal(index, { time: e.target.value })}
                      className="pl-10 border-2 border-gray-200 focus:border-orange-400"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Calorías</Label>
                  <div className="relative">
                    <Zap className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="number"
                      value={meal.calories}
                      onChange={(e) => updateMeal(index, { calories: Number(e.target.value) })}
                      className="pl-10 border-2 border-gray-200 focus:border-orange-400"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-blue-700">Proteínas (g)</Label>
                  <Input
                    type="number"
                    value={meal.protein}
                    onChange={(e) => updateMeal(index, { protein: Number(e.target.value) })}
                    className="border-2 border-blue-200 focus:border-blue-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-green-700">Carbohidratos (g)</Label>
                  <Input
                    type="number"
                    value={meal.carbs}
                    onChange={(e) => updateMeal(index, { carbs: Number(e.target.value) })}
                    className="border-2 border-green-200 focus:border-green-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-yellow-700">Grasas (g)</Label>
                  <Input
                    type="number"
                    value={meal.fat}
                    onChange={(e) => updateMeal(index, { fat: Number(e.target.value) })}
                    className="border-2 border-yellow-200 focus:border-yellow-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={meal.description}
                  onChange={(e) => updateMeal(index, { description: e.target.value })}
                  className="border-2 border-gray-200 focus:border-orange-400"
                  rows={2}
                  placeholder="Describe esta comida..."
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Alimentos incluidos</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addFoodToMeal(index)}
                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Añadir
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {meal.meal_foods?.map((food, foodIndex) => (
                    <div
                      key={foodIndex}
                      className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
                    >
                      <span>{food.food_name || `Alimento ${food.food_id}`}</span>
                      <span className="text-xs">({food.quantity}g)</span>
                      <button
                        onClick={() => removeFoodFromMeal(index, foodIndex)}
                        className="ml-1 text-orange-600 hover:text-orange-800"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {(!meal.meal_foods || meal.meal_foods.length === 0) && (
                    <p className="text-gray-500 text-sm italic">No hay alimentos añadidos</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {plan.meals.length === 0 && (
          <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-lg">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No hay comidas en el plan</p>
              <Button
                onClick={addMeal}
                className="mt-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                Añadir primera comida
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Botones de acción */}
      <div className="flex gap-4 pt-6">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar plan nutricional
            </>
          )}
        </Button>
        <Button variant="outline" onClick={onSave} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
