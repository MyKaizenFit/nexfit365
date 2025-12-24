"use client"

import { useState, useEffect, useCallback } from "react"
import { Calendar, ChevronLeft, ChevronRight, ChefHat, Check, Clock, Loader2, Copy, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { nutritionService } from "@/lib/nutrition-service"
import { MealSelectionModal } from "@/components/dashboard/meal-selection-modal"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { authenticatedFetch } from "@/lib/api"

const MEAL_TYPES = [
  { name: "Desayuno", type: "breakfast", time: "08:00", icon: "🌅" },
  { name: "Snack Mañana", type: "morning_snack", time: "10:30", icon: "☕" },
  { name: "Almuerzo", type: "lunch", time: "13:00", icon: "🍽️" },
  { name: "Snack Tarde", type: "afternoon_snack", time: "16:00", icon: "🍎" },
  { name: "Cena", type: "dinner", time: "20:00", icon: "🌙" },
]

interface WeeklyMealSelection {
  date: string
  meal_type: string
  recipe?: {
    id: string
    name: string
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  custom_description?: string
  completed?: boolean
}

export function WeeklyMealPlan() {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1)
    monday.setHours(0, 0, 0, 0)
    return monday
  })
  
  const [weeklySelections, setWeeklySelections] = useState<Record<string, WeeklyMealSelection[]>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedMeal, setSelectedMeal] = useState<{ date: string; meal_type: string } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [mealOptions, setMealOptions] = useState<any[]>([])

  // Generar días de la semana
  const getWeekDays = useCallback(() => {
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekStart)
      day.setDate(currentWeekStart.getDate() + i)
      days.push(day)
    }
    return days
  }, [currentWeekStart])

  // Cargar selecciones de la semana
  const loadWeeklySelections = useCallback(async () => {
    setLoading(true)
    try {
      const startDateStr = format(currentWeekStart, 'yyyy-MM-dd')
      const selections = await nutritionService.getWeeklyMealSelections(startDateStr)
      console.log('📋 Selecciones cargadas de la semana:', startDateStr, selections)
      setWeeklySelections(selections)
    } catch (error) {
      console.error('Error cargando selecciones semanales:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las selecciones de la semana",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [currentWeekStart])

  useEffect(() => {
    loadWeeklySelections()
  }, [loadWeeklySelections])

  // Navegar semanas
  const goToPreviousWeek = () => {
    const newStart = new Date(currentWeekStart)
    newStart.setDate(newStart.getDate() - 7)
    setCurrentWeekStart(newStart)
  }

  const goToNextWeek = () => {
    const newStart = new Date(currentWeekStart)
    newStart.setDate(newStart.getDate() + 7)
    setCurrentWeekStart(newStart)
  }

  const goToCurrentWeek = () => {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1)
    monday.setHours(0, 0, 0, 0)
    setCurrentWeekStart(monday)
  }

  // Abrir modal de selección
  const handleSelectMeal = async (date: string, mealType: string) => {
    setSelectedDay(date)
    setSelectedMeal({ date, meal_type: mealType })
    
    try {
      // Cargar opciones de comida para este tipo
      const response = await authenticatedFetch(
        `nutrition/plan-meals-for-selection/?meal_type=${mealType}`,
        { method: 'GET' }
      )
      
      if (response.ok) {
        const data = await response.json()
        const mealTypeKey = mealType === 'breakfast' ? 'breakfast' :
                           mealType === 'lunch' ? 'lunch' :
                           mealType === 'dinner' ? 'dinner' :
                           mealType === 'morning_snack' ? 'morning_snack' :
                           'afternoon_snack'
        
        const options = data.meals_by_type?.[mealTypeKey] || []
        setMealOptions(options)
        setIsModalOpen(true)
      }
    } catch (error) {
      console.error('Error cargando opciones:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las opciones de comida",
        variant: "destructive"
      })
    }
  }

  // Guardar selección (solo planificación, no completada)
  const handleSaveSelection = async (option: any) => {
    if (!selectedMeal) return

    setSaving(true)
    try {
      const selections = [{
        date: selectedMeal.date,
        meal_type: selectedMeal.meal_type,
        recipe_id: option.id || option.recipeId,
        calories: option.calories || 0,
        protein: option.protein || 0,
        carbs: option.carbs || 0,
        fat: option.fat || 0,
        completed: false // Solo planificación, no completada
      }]

      const result = await nutritionService.saveWeeklyMealSelections(selections)
      
      console.log('✅ Selección guardada:', result)
      
      toast({
        title: "✅ Comida seleccionada",
        description: `${option.name} guardada para ${format(new Date(selectedMeal.date), 'EEEE d', { locale: es })}`,
      })

      setIsModalOpen(false)
      setSelectedMeal(null)
      
      // Recargar selecciones después de guardar
      await loadWeeklySelections()
    } catch (error) {
      console.error('Error guardando selección:', error)
      toast({
        title: "Error",
        description: "No se pudo guardar la selección",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  // Copiar día completo a otro día
  const handleCopyDay = async (sourceDate: string, targetDate: string) => {
    setSaving(true)
    try {
      const sourceSelections = weeklySelections[sourceDate] || []
      
      if (sourceSelections.length === 0) {
        toast({
          title: "Sin selecciones",
          description: "El día seleccionado no tiene comidas planificadas",
          variant: "destructive"
        })
        return
      }

      const selectionsToSave = sourceSelections.map(selection => ({
        date: targetDate,
        meal_type: selection.meal_type,
        recipe_id: selection.recipe?.id,
        calories: selection.recipe?.calories || 0,
        protein: selection.recipe?.protein || 0,
        carbs: selection.recipe?.carbs || 0,
        fat: selection.recipe?.fat || 0,
        custom_description: selection.custom_description,
        completed: false // Solo planificación al copiar
      }))

      await nutritionService.saveWeeklyMealSelections(selectionsToSave)
      
      toast({
        title: "✅ Día copiado",
        description: `Comidas copiadas de ${format(new Date(sourceDate), 'EEEE d', { locale: es })} a ${format(new Date(targetDate), 'EEEE d', { locale: es })}`,
      })

      await loadWeeklySelections()
    } catch (error) {
      console.error('Error copiando día:', error)
      toast({
        title: "Error",
        description: "No se pudo copiar el día",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  // Aplicar día a toda la semana
  const handleApplyToWeek = async (sourceDate: string) => {
    setSaving(true)
    try {
      const sourceSelections = weeklySelections[sourceDate] || []
      
      if (sourceSelections.length === 0) {
        toast({
          title: "Sin selecciones",
          description: "El día seleccionado no tiene comidas planificadas",
          variant: "destructive"
        })
        return
      }

      const weekDays = getWeekDays()
      const selectionsToSave: any[] = []

      weekDays.forEach(day => {
        const targetDateStr = format(day, 'yyyy-MM-dd')
        // No copiar al mismo día
        if (targetDateStr === sourceDate) return

        sourceSelections.forEach(selection => {
          selectionsToSave.push({
            date: targetDateStr,
            meal_type: selection.meal_type,
            recipe_id: selection.recipe?.id,
            calories: selection.recipe?.calories || 0,
            protein: selection.recipe?.protein || 0,
            carbs: selection.recipe?.carbs || 0,
            fat: selection.recipe?.fat || 0,
            custom_description: selection.custom_description,
            completed: false // Solo planificación al aplicar
          })
        })
      })

      if (selectionsToSave.length > 0) {
        await nutritionService.saveWeeklyMealSelections(selectionsToSave)
        
        toast({
          title: "✅ Aplicado a toda la semana",
          description: `Comidas de ${format(new Date(sourceDate), 'EEEE d', { locale: es })} aplicadas a toda la semana`,
        })

        await loadWeeklySelections()
      }
    } catch (error) {
      console.error('Error aplicando a semana:', error)
      toast({
        title: "Error",
        description: "No se pudo aplicar a toda la semana",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  // Obtener selección para un día y tipo de comida
  const getSelectionForMeal = (dateStr: string, mealType: string): WeeklyMealSelection | null => {
    const daySelections = weeklySelections[dateStr] || []
    // Buscar por meal_type, puede venir como objeto o como string en el array
    const selection = daySelections.find((s: any) => {
      if (typeof s === 'object') {
        return s.meal_type === mealType
      }
      return false
    })
    return selection || null
  }

  const weekDays = getWeekDays()

  return (
    <div className="space-y-6">
      {/* Header con navegación */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Planificación Semanal
              </CardTitle>
              <CardDescription>
                Planifica tus comidas para toda la semana
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousWeek}
                disabled={loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToCurrentWeek}
                disabled={loading}
              >
                Hoy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextWeek}
                disabled={loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {format(weekDays[0], "d 'de' MMMM", { locale: es })} - {format(weekDays[6], "d 'de' MMMM, yyyy", { locale: es })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Vista semanal */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {weekDays.map((day, dayIndex) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
            const dayName = format(day, 'EEEE', { locale: es })
            const dayNumber = format(day, 'd')
            const daySelections = weeklySelections[dateStr] || []
            const hasSelections = daySelections.length > 0

            return (
              <Card key={dateStr} className={isToday ? "ring-2 ring-teal-500" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-sm font-medium">
                        {dayName.charAt(0).toUpperCase() + dayName.slice(1)}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {dayNumber} {format(day, 'MMM', { locale: es })}
                      </CardDescription>
                    </div>
                    {hasSelections && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleApplyToWeek(dateStr)}
                          disabled={saving}
                          title="Aplicar a toda la semana"
                        >
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {MEAL_TYPES.map((meal, mealIndex) => {
                    const selection = getSelectionForMeal(dateStr, meal.type)
                    // Verificar si está completada (por defecto false si no se especifica)
                    const isCompleted = selection?.completed === true
                    const hasSelection = !!selection
                    
                    return (
                      <div
                        key={meal.type}
                        className="relative group"
                      >
                        <Button
                          variant={hasSelection ? (isCompleted ? "secondary" : "outline") : "outline"}
                          className={`w-full justify-start h-auto p-2 text-xs ${
                            hasSelection && !isCompleted ? 'border-blue-300 bg-blue-50 hover:bg-blue-100' : ''
                          } ${hasSelection ? 'min-h-[110px]' : 'min-h-[45px]'}`}
                          onClick={() => handleSelectMeal(dateStr, meal.type)}
                          disabled={saving}
                        >
                          <div className="flex flex-col gap-1.5 w-full text-left">
                            {/* Header: Icono, nombre de comida y hora */}
                            <div className="flex items-center gap-2">
                              <span className="text-base flex-shrink-0">{meal.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-xs leading-tight">{meal.name}</div>
                                {!hasSelection && (
                                  <div className="text-[10px] text-muted-foreground">{meal.time}</div>
                                )}
                              </div>
                              {hasSelection && (
                                <Check className={`h-3.5 w-3.5 flex-shrink-0 ${
                                  isCompleted ? 'text-teal-600' : 'text-blue-500'
                                }`} />
                              )}
                            </div>
                            
                            {/* Selección: Nombre completo de la receta con macros */}
                            {hasSelection && (
                              <div className="mt-0.5 pt-1.5 border-t border-gray-200/60 space-y-1.5">
                                <div className="text-[11px] font-semibold text-gray-800 leading-tight break-words">
                                  {selection.recipe?.name || selection.recipe_name || selection.custom_description || 'Sin nombre'}
                                </div>
                                
                                {/* Estado: Seleccionada o Completada */}
                                <div className="flex items-center gap-1.5">
                                  {!isCompleted && (
                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-blue-300 text-blue-600 bg-blue-50">
                                      📋 Seleccionada
                                    </Badge>
                                  )}
                                  {isCompleted && (
                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-teal-300 text-teal-600 bg-teal-50">
                                      ✅ Completada
                                    </Badge>
                                  )}
                                </div>
                                
                                {/* Macros nutricionales */}
                                {(selection.recipe?.calories || selection.calories) && (
                                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                                    <div className="text-center bg-orange-50 rounded p-1">
                                      <div className="font-bold text-orange-600 text-[10px]">
                                        {selection.recipe?.calories || selection.calories || 0}
                                      </div>
                                      <div className="text-[8px] text-orange-500">kcal</div>
                                    </div>
                                    <div className="text-center bg-blue-50 rounded p-1">
                                      <div className="font-bold text-blue-600 text-[10px]">
                                        {selection.recipe?.protein || selection.protein || 0}
                                      </div>
                                      <div className="text-[8px] text-blue-500">prot</div>
                                    </div>
                                    <div className="text-center bg-green-50 rounded p-1">
                                      <div className="font-bold text-green-600 text-[10px]">
                                        {selection.recipe?.carbs || selection.carbs || 0}
                                      </div>
                                      <div className="text-[8px] text-green-500">carb</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </Button>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal de selección */}
      {isModalOpen && selectedMeal && (
        <MealSelectionModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedMeal(null)
          }}
          mealName={MEAL_TYPES.find(m => m.type === selectedMeal.meal_type)?.name || ""}
          mealTime={MEAL_TYPES.find(m => m.type === selectedMeal.meal_type)?.time || ""}
          options={mealOptions}
          onSelectOption={handleSaveSelection}
        />
      )}
    </div>
  )
}


