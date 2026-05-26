"use client"

import { useState, useEffect, useCallback } from "react"
import { Calendar, ChevronLeft, ChevronRight, ChefHat, Check, Clock, Loader2, Copy, ArrowRight, CalendarDays } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { MealIngredientSubstitution, nutritionService } from "@/lib/nutrition-service"
import { MealSelectionModal } from "@/components/dashboard/meal-selection-modal"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday, isPast, addMonths, subMonths } from "date-fns"
import { es } from "date-fns/locale"
import { authenticatedFetch } from "@/lib/api"

const MEAL_TYPES = [
  { name: "Desayuno", type: "breakfast", time: "08:00", icon: "🌅" },
  { name: "Snack Mañana", type: "morning_snack", time: "10:30", icon: "☕" },
  { name: "Almuerzo", type: "lunch", time: "13:00", icon: "🍽️" },
  { name: "Snack Tarde", type: "afternoon_snack", time: "16:00", icon: "🍎" },
  { name: "Cena", type: "dinner", time: "20:00", icon: "🌙" },
]

interface MonthlyMealSelection {
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
  recipe_name?: string
  custom_description?: string
  substitution_details?: MealIngredientSubstitution[]
  completed?: boolean
  // Macros directos (alternativa a recipe.macros)
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
}

export function MonthlyMealPlan() {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const today = new Date()
    return startOfMonth(today)
  })
  
  const [monthlySelections, setMonthlySelections] = useState<Record<string, MonthlyMealSelection[]>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedMeal, setSelectedMeal] = useState<{ date: string; meal_type: string } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [mealOptions, setMealOptions] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')

  // Generar días del mes
  const getMonthDays = useCallback(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  // Cargar selecciones del mes
  const loadMonthlySelections = useCallback(async () => {
    setLoading(true)
    try {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth() + 1
      const selections = await nutritionService.getMonthlyMealSelections(year, month)
      setMonthlySelections(selections)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las selecciones del mes",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [currentMonth])

  useEffect(() => {
    loadMonthlySelections()
  }, [loadMonthlySelections])

  // Navegar meses
  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const goToCurrentMonth = () => {
    setCurrentMonth(startOfMonth(new Date()))
  }

  // Abrir modal de selección
  const handleSelectMeal = async (date: string, mealType: string) => {
    setSelectedDay(date)
    setSelectedMeal({ date, meal_type: mealType })
    
    try {
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
      const recipeId = option?.recipeId ? String(option.recipeId) : (typeof option?.id === 'string' && option.id.startsWith('recipe-') ? option.id.replace(/^recipe-/, '') : (option?.id ? String(option.id) : undefined))
      const selections = [{
        date: selectedMeal.date,
        meal_type: selectedMeal.meal_type,
        recipe_id: recipeId,
        calories: option.calories || 0,
        protein: option.protein || 0,
        carbs: option.carbs || 0,
        fat: option.fat || 0,
        custom_description: option.customDescription || option.name || '', // Preservar el nombre como custom_description si no hay recipe_id
        substitution_details: option.substitution_details || [],
        completed: false // Solo planificación, no completada
      }]

      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth() + 1
      await nutritionService.saveMonthlyMealSelections(year, month, selections)
      
      toast({
        title: "✅ Comida seleccionada",
        description: `${option.name} guardada para ${format(new Date(selectedMeal.date), 'EEEE d', { locale: es })}`,
      })

      setIsModalOpen(false)
      setSelectedMeal(null)
      await loadMonthlySelections()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la selección",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  // Copiar semana completa a otra semana del mes
  const handleCopyWeek = async (sourceDate: string, targetDate: string) => {
    setSaving(true)
    try {
      const sourceSelections = monthlySelections[sourceDate] || []
      
      if (sourceSelections.length === 0) {
        toast({
          title: "Sin selecciones",
          description: "El día seleccionado no tiene comidas planificadas",
          variant: "destructive"
        })
        return
      }

      // Calcular días de la semana (7 días desde sourceDate)
      const sourceDateObj = new Date(sourceDate)
      const targetDateObj = new Date(targetDate)
      const selectionsToSave: any[] = []

      for (let i = 0; i < 7; i++) {
        const sourceDay = new Date(sourceDateObj)
        sourceDay.setDate(sourceDateObj.getDate() + i)
        
        const targetDay = new Date(targetDateObj)
        targetDay.setDate(targetDateObj.getDate() + i)

        // Verificar que el día objetivo esté en el mes actual
        if (targetDay.getMonth() !== currentMonth.getMonth()) {
          continue
        }

        const sourceDayStr = format(sourceDay, 'yyyy-MM-dd')
        const targetDayStr = format(targetDay, 'yyyy-MM-dd')
        const daySelections = monthlySelections[sourceDayStr] || []

        daySelections.forEach(selection => {
          selectionsToSave.push({
            date: targetDayStr,
            meal_type: selection.meal_type,
            recipe_id: selection.recipe?.id || (selection as any).recipe_id,
            calories: selection.recipe?.calories || selection.calories || 0,
            protein: selection.recipe?.protein || selection.protein || 0,
            carbs: selection.recipe?.carbs || selection.carbs || 0,
            fat: selection.recipe?.fat || selection.fat || 0,
            custom_description: selection.custom_description || selection.recipe?.name || selection.recipe_name || '',
            substitution_details: selection.substitution_details || [],
            completed: false // Solo planificación al copiar
          })
        })
      }

      if (selectionsToSave.length > 0) {
        const year = currentMonth.getFullYear()
        const month = currentMonth.getMonth() + 1
        await nutritionService.saveMonthlyMealSelections(year, month, selectionsToSave)
        
        toast({
          title: "✅ Semana copiada",
          description: `Comidas copiadas de la semana del ${format(new Date(sourceDate), 'd MMM', { locale: es })} a la semana del ${format(new Date(targetDate), 'd MMM', { locale: es })}`,
        })

        await loadMonthlySelections()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar la semana",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  // Aplicar día a todo el mes
  const handleApplyToMonth = async (sourceDate: string) => {
    setSaving(true)
    try {
      const sourceSelections = monthlySelections[sourceDate] || []
      
      if (sourceSelections.length === 0) {
        toast({
          title: "Sin selecciones",
          description: "El día seleccionado no tiene comidas planificadas",
          variant: "destructive"
        })
        return
      }

      const monthDays = getMonthDays()
      const selectionsToSave: any[] = []

      monthDays.forEach(day => {
        const targetDateStr = format(day, 'yyyy-MM-dd')
        // No copiar al mismo día
        if (targetDateStr === sourceDate) return

        sourceSelections.forEach(selection => {
          selectionsToSave.push({
            date: targetDateStr,
            meal_type: selection.meal_type,
            recipe_id: selection.recipe?.id || (selection as any).recipe_id,
            calories: selection.recipe?.calories || selection.calories || 0,
            protein: selection.recipe?.protein || selection.protein || 0,
            carbs: selection.recipe?.carbs || selection.carbs || 0,
            fat: selection.recipe?.fat || selection.fat || 0,
            custom_description: selection.custom_description || selection.recipe?.name || selection.recipe_name || '',
            substitution_details: selection.substitution_details || [],
            completed: false // Solo planificación al aplicar
          })
        })
      })

      if (selectionsToSave.length > 0) {
        const year = currentMonth.getFullYear()
        const month = currentMonth.getMonth() + 1
        await nutritionService.saveMonthlyMealSelections(year, month, selectionsToSave)
        
        toast({
          title: "✅ Aplicado a todo el mes",
          description: `Comidas de ${format(new Date(sourceDate), 'EEEE d', { locale: es })} aplicadas a todo el mes`,
        })

        await loadMonthlySelections()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo aplicar a todo el mes",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  // Obtener selección para un día y tipo de comida
  const getSelectionForMeal = (dateStr: string, mealType: string): any | null => {
    const daySelections = monthlySelections[dateStr] || []
    // Buscar selección que coincida con el meal_type
    const selection = daySelections.find((s: any) => {
      if (typeof s === 'object' && s !== null) {
        return s.meal_type === mealType
      }
      return false
    })
    return selection || null
  }

  // Obtener el nombre de la comida con mejor manejo de casos
  const getMealName = (selection: any | null): string => {
    if (!selection) return 'Sin nombre'
    
    // Prioridad 1: recipe.name (si recipe es un objeto con name)
    if (selection.recipe?.name && selection.recipe.name.trim() !== '') {
      return selection.recipe.name
    }
    
    // Prioridad 2: recipe_name (viene del serializer)
    if (selection.recipe_name && selection.recipe_name.trim() !== '') {
      return selection.recipe_name
    }
    
    // Prioridad 3: custom_description
    if (selection.custom_description && selection.custom_description.trim() !== '') {
      return selection.custom_description
    }
    
    // Si no hay nombre, devolver un texto descriptivo en lugar de "Sin nombre"
    const mealTypeNames: Record<string, string> = {
      'breakfast': 'Desayuno',
      'morning_snack': 'Snack Mañana',
      'lunch': 'Almuerzo',
      'afternoon_snack': 'Snack Tarde',
      'dinner': 'Cena'
    }
    const mealTypeName = mealTypeNames[selection.meal_type] || 'Comida'
    return `${mealTypeName} - Seleccionada`
  }

  const monthDays = getMonthDays()
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  
  // Calcular días de la semana para el calendario (llenar con días del mes anterior si es necesario)
  const firstDayOfWeek = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1 // Lunes = 0
  const calendarDays: (Date | null)[] = []
  
  // Agregar días del mes anterior
  for (let i = 0; i < firstDayOfWeek; i++) {
    const prevDay = new Date(monthStart)
    prevDay.setDate(prevDay.getDate() - (firstDayOfWeek - i))
    calendarDays.push(prevDay)
  }
  
  // Agregar días del mes actual
  monthDays.forEach(day => calendarDays.push(day))
  
  // Completar hasta el final de la semana
  const remainingDays = 7 - (calendarDays.length % 7)
  if (remainingDays < 7) {
    for (let i = 1; i <= remainingDays; i++) {
      const nextDay = new Date(monthEnd)
      nextDay.setDate(nextDay.getDate() + i)
      calendarDays.push(nextDay)
    }
  }

  // Agrupar días por semana para la vista de calendario
  const weeks: (Date | null)[][] = []
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7))
  }

  return (
    <div className="space-y-6">
      {/* Header con navegación */}
      <Card>
        <CardHeader className="pb-3 md:pb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <CalendarDays className="h-4 w-4 md:h-5 md:w-5" />
                Planificación Mensual
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Planifica tus comidas para todo el mes
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousMonth}
                disabled={loading}
                className="h-8 md:h-9"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToCurrentMonth}
                disabled={loading}
                className="h-8 md:h-9 text-xs md:text-sm"
              >
                Hoy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextMonth}
                disabled={loading}
                className="h-8 md:h-9"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center">
            <p className="text-base md:text-lg font-semibold">
              {format(currentMonth, "MMMM yyyy", { locale: es })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Vista de calendario mensual */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : (
        <div className="space-y-2 md:space-y-4">
          {/* Encabezados de días de la semana */}
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
              <div key={day} className="text-center text-xs md:text-sm font-medium text-muted-foreground py-1 md:py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendario por semanas - Scroll horizontal en móvil */}
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible">
            <div className="inline-block min-w-full md:block">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-1 md:gap-2 min-w-[700px] md:min-w-0">
              {week.map((day, dayIndex) => {
                if (!day) return <div key={dayIndex} className="min-h-[120px]" />
                
                const dateStr = format(day, 'yyyy-MM-dd')
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
                const isCurrentDay = isToday(day)
                const daySelections = monthlySelections[dateStr] || []
                const hasSelections = daySelections.length > 0
                const isPastDay = isPast(day) && !isCurrentDay

                return (
                  <Card 
                    key={dateStr} 
                    className={`min-h-[100px] md:min-h-[120px] ${
                      !isCurrentMonth ? 'opacity-40' : ''
                    } ${isCurrentDay ? 'ring-2 ring-teal-500' : ''} ${
                      isPastDay ? 'bg-muted' : ''
                    }`}
                  >
                    <CardHeader className="pb-1 md:pb-2 p-1.5 md:p-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xs md:text-sm font-medium">
                            {format(day, 'd')}
                          </CardTitle>
                          {isCurrentDay && (
                            <Badge variant="outline" className="text-[9px] md:text-[10px] mt-0.5 md:mt-1 px-1 py-0">
                              Hoy
                            </Badge>
                          )}
                        </div>
                        {hasSelections && isCurrentMonth && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 md:h-5 md:w-5 touch-manipulation"
                            onClick={() => handleApplyToMonth(dateStr)}
                            disabled={saving}
                            title="Aplicar a todo el mes"
                          >
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-1.5 md:p-2 space-y-0.5 md:space-y-1">
                      {isCurrentMonth && MEAL_TYPES.map((meal) => {
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
                              className={`w-full justify-start h-auto p-1 md:p-1.5 text-[8px] md:text-[9px] touch-manipulation ${
                                hasSelection && !isCompleted ? 'border-blue-300 bg-blue-50 hover:bg-blue-100 active:bg-blue-200' : ''
                              } ${hasSelection ? 'min-h-[70px] md:min-h-[85px]' : 'min-h-[32px] md:min-h-[40px]'}`}
                              onClick={() => handleSelectMeal(dateStr, meal.type)}
                              disabled={saving || !isCurrentMonth}
                            >
                              <div className="flex flex-col gap-0.5 md:gap-1 w-full text-left">
                                {/* Header: Icono, nombre de comida */}
                                <div className="flex items-center gap-0.5 md:gap-1">
                                  <span className="text-[10px] md:text-[11px] flex-shrink-0">{meal.icon}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-[8px] md:text-[9px] leading-tight truncate">{meal.name}</div>
                                    {!hasSelection && (
                                      <div className="text-[6px] md:text-[7px] text-muted-foreground">{meal.time}</div>
                                    )}
                                  </div>
                                  {hasSelection && (
                                    <Check className={`h-2 w-2 md:h-2.5 md:w-2.5 flex-shrink-0 ${
                                      isCompleted ? 'text-teal-600' : 'text-blue-500'
                                    }`} />
                                  )}
                                </div>
                                
                                {/* Selección: Nombre completo de la receta con macros */}
                                {hasSelection && (
                                  <div className="mt-0.5 pt-0.5 md:pt-1 border-t border-border/60 space-y-0.5 md:space-y-1">
                                    <div className="text-[8px] md:text-[9px] font-semibold text-foreground leading-tight break-words line-clamp-2">
                                      {getMealName(selection)}
                                    </div>
                                    
                                    {/* Estado: Seleccionada o Completada */}
                                    <div className="flex items-center gap-0.5 md:gap-1">
                                      {!isCompleted && (
                                        <Badge variant="outline" className="text-[6px] md:text-[7px] px-0.5 md:px-1 py-0 h-2.5 md:h-3 border-blue-300 text-blue-600 bg-blue-50">
                                          📋
                                        </Badge>
                                      )}
                                      {isCompleted && (
                                        <Badge variant="outline" className="text-[6px] md:text-[7px] px-0.5 md:px-1 py-0 h-2.5 md:h-3 border-teal-300 text-teal-600 bg-teal-50">
                                          ✅
                                        </Badge>
                                      )}
                                      {selection.substitution_details?.length ? (
                                        <Badge variant="outline" className="text-[6px] md:text-[7px] px-0.5 md:px-1 py-0 h-2.5 md:h-3 border-emerald-300 text-emerald-700 bg-emerald-50">
                                          Cambio
                                        </Badge>
                                      ) : null}
                                    </div>
                                    
                                    {/* Macros nutricionales (solo calorías en vista mensual por espacio) */}
                                    {(selection.recipe?.calories || selection.calories) && (
                                      <div className="text-center bg-orange-50 rounded p-0.5">
                                        <div className="font-bold text-orange-600 text-[7px] md:text-[8px]">
                                          {selection.recipe?.calories || selection.calories || 0} kcal
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </Button>
                            {hasSelections && weekIndex > 0 && dayIndex === 0 && isCurrentMonth && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 md:h-4 md:w-4 absolute -right-0.5 -top-0.5 md:-right-1 md:-top-1 opacity-60 md:opacity-0 group-hover:opacity-100 md:group-hover:opacity-100 transition-opacity bg-card shadow-sm touch-manipulation"
                                onClick={() => {
                                  // Copiar semana anterior
                                  const previousWeekStart = new Date(day)
                                  previousWeekStart.setDate(day.getDate() - 7)
                                  handleCopyWeek(format(previousWeekStart, 'yyyy-MM-dd'), dateStr)
                                }}
                                disabled={saving}
                                title="Copiar semana anterior"
                              >
                                <Copy className="h-2.5 w-2.5 md:h-2 md:w-2" />
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                )
              })}
                </div>
              ))}
            </div>
          </div>
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
          mealType={selectedMeal.meal_type}
          options={mealOptions}
          onSelectOption={handleSaveSelection}
        />
      )}
    </div>
  )
}
