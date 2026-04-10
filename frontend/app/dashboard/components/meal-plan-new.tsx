"use client"

import { useState, useEffect } from "react"
import { Check, Clock, Plus, ChevronDown, Utensils, Zap, Leaf, Loader2 } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { useNutrition } from "@/hooks/use-nutrition"
import { MealOption } from "@/lib/nutrition-service"

// Interfaz local para las comidas del día
interface DailyMeal {
  id: string
  name: string
  time: string
  completed: boolean
  calories: number
  protein: number
  carbs: number
  fat: number
  description: string
}

// Datos por defecto para fallback
const defaultMealOptions: Record<string, MealOption[]> = {
  breakfast: [
    {
      id: "default-b1",
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
  ],
  snack1: [
    {
      id: "default-s1",
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
  ],
  lunch: [
    {
      id: "default-l1",
      name: "Comida equilibrada",
      calories: 450,
      protein: 35,
      carbs: 40,
      fat: 18,
      category: "balanced",
      icon: "🥗",
      description: "Opción saludable por defecto",
      cookTime: "20 min",
    },
  ],
  snack2: [
    {
      id: "default-s2",
      name: "Snack saludable",
      calories: 220,
      protein: 20,
      carbs: 25,
      fat: 8,
      category: "balanced",
      icon: "🥜",
      description: "Opción por defecto",
    },
  ],
  dinner: [
    {
      id: "default-d1",
      name: "Cena equilibrada",
      calories: 380,
      protein: 30,
      carbs: 30,
      fat: 15,
      category: "balanced",
      icon: "🍗",
      description: "Opción saludable por defecto",
      cookTime: "15 min",
    },
  ],
}

export function MealPlan() {
  const [meals, setMeals] = useState<DailyMeal[]>([])
  
  // Usar el hook de nutrición
  const { 
    currentPlan, 
    suggestedMeals, 
    dailyStats, 
    isLoading, 
    error,
    markMealCompleted,
    createMealLog,
    refreshPlan 
  } = useNutrition()

  // Estructura de comidas del día
  const mealTimes = {
    breakfast: "08:00",
    snack1: "10:30", 
    lunch: "13:00",
    snack2: "16:00",
    dinner: "20:00"
  }

  // Generar comidas del día basadas en el plan actual o estructura por defecto
  const generateDailyMeals = () => {
    if (currentPlan && currentPlan.meals && currentPlan.meals.length > 0) {
      // Usar comidas del plan actual
      return currentPlan.meals.map((meal, index) => ({
        id: meal.id,
        name: meal.name,
        time: meal.time || mealTimes[Object.keys(mealTimes)[index] as keyof typeof mealTimes] || "12:00",
        completed: false, // Se determinará con mealLogs
        calories: meal.calories || 0,
        protein: meal.protein || 0,
        carbs: meal.carbs || 0,
        fat: meal.fat || 0,
        description: meal.description || "",
      }))
    } else {
      // Usar estructura por defecto
      const defaultMealNames = ["Desayuno", "Snack Mañana", "Almuerzo", "Snack Tarde", "Cena"]
      return defaultMealNames.map((name, index) => ({
        id: `default-${index + 1}`,
        name,
        time: mealTimes[Object.keys(mealTimes)[index] as keyof typeof mealTimes] || "12:00",
        completed: false,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        description: "",
      }))
    }
  }

  // Generar comidas cuando cambie el plan
  useEffect(() => {
    const dailyMeals = generateDailyMeals()
    setMeals(dailyMeals)
  }, [currentPlan])

  // Calcular macros restantes usando datos reales del backend
  const remainingMacros = {
    calories: (currentPlan?.daily_calories || 2000) - dailyStats.totalCalories,
    protein: (currentPlan?.target_macros?.protein || 150) - dailyStats.totalProtein,
    carbs: (currentPlan?.target_macros?.carbs || 200) - dailyStats.totalCarbs,
    fat: (currentPlan?.target_macros?.fat || 65) - dailyStats.totalFat,
  }

  // Obtener valores objetivo
  const targetCalories = currentPlan?.daily_calories || 2000
  const targetProtein = currentPlan?.target_macros?.protein || 150
  const targetCarbs = currentPlan?.target_macros?.carbs || 200
  const targetFat = currentPlan?.target_macros?.fat || 65

  // Obtener valores actuales
  const totalCalories = dailyStats.totalCalories
  const totalProtein = dailyStats.totalProtein
  const totalCarbs = dailyStats.totalCarbs
  const totalFat = dailyStats.totalFat

  const handleMarkMeal = async (mealId: string, mealName: string) => {
    const today = new Date().toISOString().split('T')[0]
    
    try {
      const success = await markMealCompleted(mealId, today)
      if (success) {
        // Refrescar el plan para obtener datos actualizados
        await refreshPlan()
      }
    } catch (error) {
    }
  }

  const handleSelectMealOption = async (mealId: string, option: MealOption, mealName: string) => {
    const today = new Date().toISOString().split('T')[0]
    
    try {
      // Solo crear MealLog si la comida existe en el backend (no es un ID por defecto)
      if (!mealId.startsWith('default-')) {
        const success = await createMealLog({
          meal: mealId, // ID de la comida real del backend
          date: today,
          completed: false,
          notes: `Seleccionado: ${option.name}`,
        })
        
        if (success) {
          toast({
            title: "Comida actualizada",
            description: `${option.name} seleccionada para ${mealName}`,
          })
          await refreshPlan()
        }
      } else {
        // Para comidas por defecto, crear MealLog SIN el campo meal
        const success = await createMealLog({
          // NO enviar el campo meal para comidas por defecto
          date: today,
          completed: false,
          notes: `Seleccionado: ${option.name} (comida por defecto)`,
        })
        
        if (success) {
          toast({
            title: "Comida seleccionada",
            description: `${option.name} seleccionada para ${mealName}`,
          })
          await refreshPlan()
        }
      }
    } catch (error) {
    }
  }

  const getRecommendedOptions = (mealName: string) => {
    // Mapear nombres de comidas a tipos para obtener opciones apropiadas
    const mealTypeMap: Record<string, keyof typeof defaultMealOptions> = {
      "Desayuno": "breakfast",
      "Snack Mañana": "snack1",
      "Almuerzo": "lunch",
      "Snack Tarde": "snack2",
      "Cena": "dinner"
    }
    
    const mealType = mealTypeMap[mealName] || "breakfast"
    const options = suggestedMeals.length > 0 ? suggestedMeals : defaultMealOptions[mealType] || []
    
    return options
      .map((option) => {
        let score = 0
        let recommendation = ""

        // Calcular qué tan bien se ajusta a los macros restantes
        if (remainingMacros.protein > 20 && option.protein > 20) {
          score += 2
          recommendation = "Ideal para proteína"
        } else if (remainingMacros.calories < 400 && option.calories < 300) {
          score += 2
          recommendation = "Perfecto para tus calorías restantes"
        } else if (remainingMacros.carbs < 30 && option.carbs < 20) {
          score += 1
          recommendation = "Bajo en carbos"
        }

        return { ...option, score, recommendation }
      })
      .sort((a, b) => b.score - a.score)
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "light":
        return <Leaf className="h-3 w-3 text-green-500" />
      case "protein-rich":
        return <Zap className="h-3 w-3 text-blue-500" />
      case "balanced":
        return <Utensils className="h-3 w-3 text-orange-500" />
      default:
        return null
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "light":
        return "bg-green-50 border-green-200 text-green-700"
      case "protein-rich":
        return "bg-blue-50 border-blue-200 text-blue-700"
      case "balanced":
        return "bg-orange-50 border-orange-200 text-orange-700"
      default:
        return "bg-gray-50 border-gray-200 text-gray-700"
    }
  }

  // Mostrar estado de carga
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

  // Mostrar error si existe
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan de Comidas de Hoy</CardTitle>
          <CardDescription>Error al cargar el plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={refreshPlan} variant="outline">
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan de Comidas de Hoy</CardTitle>
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
        <div className="space-y-3">
          {meals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay comidas programadas para hoy</p>
            </div>
          ) : (
            meals.map((meal, index) => {
              const recommendedOptions = getRecommendedOptions(meal.name)

              return (
                <div
                  key={meal.id}
                  className={`flex items-center p-3 rounded-lg border transition-all duration-300 hover:shadow-md hover:scale-[1.02] animate-in slide-in-from-left-4 delay-[${index * 150}ms] ${
                    meal.completed ? "bg-green-50 border-green-200 hover:bg-green-100" : "bg-muted/50 hover:bg-muted/70"
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={`p-1 rounded-full transition-all duration-500 hover:scale-110 cursor-pointer ${meal.completed ? "bg-green-500" : "bg-muted"}`}
                      onClick={() => handleMarkMeal(meal.id, meal.name)}
                    >
                      {meal.completed ? (
                        <Check className="h-3 w-3 text-white animate-in zoom-in-50 duration-500" />
                      ) : (
                        <Clock className="h-3 w-3 text-muted-foreground animate-in fade-in-0 duration-300" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 min-w-0">
                        <span className="font-medium text-sm transition-colors duration-300 hover:text-primary truncate">
                          {meal.name}
                        </span>
                        <Badge variant="outline" className="text-xs flex-shrink-0 animate-in fade-in-0 duration-700 delay-300">
                          {meal.time}
                        </Badge>
                      </div>

                      {/* Información de la comida */}
                      {meal.calories > 0 ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xl flex-shrink-0">🍽️</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{meal.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap min-w-0">
                              <span>{meal.calories} kcal</span>
                              <span>•</span>
                              <span>P: {meal.protein}g</span>
                              <span>•</span>
                              <span>C: {meal.carbs}g</span>
                              <span>•</span>
                              <span>G: {meal.fat}g</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Selecciona una opción de comida</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                    {/* Selector de opciones */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 transition-all duration-300 hover:scale-105 bg-transparent"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-80">
                        <DropdownMenuLabel className="flex items-center gap-2">
                          <Utensils className="h-4 w-4" />
                          Opciones para {meal.name}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        {recommendedOptions.map((option) => (
                          <DropdownMenuItem
                            key={option.id}
                            onClick={() => handleSelectMealOption(meal.id, option, meal.name)}
                            className="flex flex-col items-start p-3 cursor-pointer hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-2 w-full mb-1">
                              <span className="text-lg">{option.icon}</span>
                              <span className="font-medium flex-1">{option.name}</span>
                              {getCategoryIcon(option.category || '')}
                              {option.score > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  Recomendado
                                </Badge>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground mb-2">{option.description}</p>

                            <div className="flex items-center gap-3 text-xs w-full">
                              <span className="font-medium">{option.calories} kcal</span>
                              <div className="flex gap-2">
                                <span>P: {option.protein}g</span>
                                <span>C: {option.carbs}g</span>
                                <span>G: {option.fat}g</span>
                              </div>
                              {option.cookTime && (
                                <span className="text-muted-foreground ml-auto">{option.cookTime}</span>
                              )}
                            </div>

                            {option.recommendation && (
                              <div className={`text-xs px-2 py-1 rounded-full mt-2 ${getCategoryColor(option.category || '')}`}>
                                {option.recommendation}
                              </div>
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Botón para marcar como completado */}
                    {!meal.completed && (
                      <div
                        className="h-8 w-8 border-2 border-muted-foreground rounded-md flex-shrink-0 cursor-pointer flex items-center justify-center transition-colors duration-200 hover:bg-muted"
                        onClick={() => handleMarkMeal(meal.id, meal.name)}
                        aria-label={`Marcar ${meal.name} como completado`}
                      >
                        {/* No hay icono dentro, solo el cuadrado */}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Progreso del día */}
        <div className="mt-6 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Progreso del día</h4>
            <span className="text-sm text-muted-foreground">
              {totalCalories} / {targetCalories} kcal
            </span>
          </div>
          <Progress value={(totalCalories / targetCalories) * 100} className="h-2" />
          <div className="grid grid-cols-3 gap-4 mt-3 text-xs">
            <div className="text-center">
              <p className="text-muted-foreground">Proteína</p>
              <p className="font-medium">{Math.round((totalProtein / targetProtein) * 100)}%</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Carbohidratos</p>
              <p className="font-medium">{Math.round((totalCarbs / targetCarbs) * 100)}%</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Grasas</p>
              <p className="font-medium">{Math.round((totalFat / targetFat) * 100)}%</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
