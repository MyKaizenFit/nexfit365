"use client"

import { useState, useEffect, useCallback } from "react"
import { Calendar, ChevronLeft, ChevronRight, ChefHat, Check, Clock, Loader2, Copy, ArrowRight, CalendarDays } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { nutritionService } from "@/lib/nutrition-service"
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
  custom_description?: string
  completed?: boolean
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
      console.error('Error cargando selecciones mensuales:', error)
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
      console.error('Error cargando opciones:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las opciones de comida",
        variant: "destructive"
      })
    }
  }

  // Guardar selección
  const handleSaveSelection = async (option: any) => {
    if (!selectedMeal) return

    setSaving(true)
    try {
      const selections = [{
        date: selectedMeal.date,
        meal_type: selectedMeal.meal_type,
        recipe_id: option.id,
        calories: option.calories || 0,
        protein: option.protein || 0,
        carbs: option.carbs || 0,
        fat: option.fat || 0,
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
            recipe_id: selection.recipe?.id,
            calories: selection.recipe?.calories || 0,
            protein: selection.recipe?.protein || 0,
            carbs: selection.recipe?.carbs || 0,
            fat: selection.recipe?.fat || 0,
            custom_description: selection.custom_description,
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
      console.error('Error copiando semana:', error)
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
            recipe_id: selection.recipe?.id,
            calories: selection.recipe?.calories || 0,
            protein: selection.recipe?.protein || 0,
            carbs: selection.recipe?.carbs || 0,
            fat: selection.recipe?.fat || 0,
            custom_description: selection.custom_description,
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
      console.error('Error aplicando a mes:', error)
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
  const getSelectionForMeal = (dateStr: string, mealType: string): MonthlyMealSelection | null => {
    const daySelections = monthlySelections[dateStr] || []
    return daySelections.find(s => s.meal_type === mealType) || null
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Planificación Mensual
              </CardTitle>
              <CardDescription>
                Planifica tus comidas para todo el mes
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousMonth}
                disabled={loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToCurrentMonth}
                disabled={loading}
              >
                Hoy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextMonth}
                disabled={loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-lg font-semibold">
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
        <div className="space-y-4">
          {/* Encabezados de días de la semana */}
          <div className="grid grid-cols-7 gap-2">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendario por semanas */}
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-2">
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
                    className={`min-h-[120px] ${
                      !isCurrentMonth ? 'opacity-40' : ''
                    } ${isCurrentDay ? 'ring-2 ring-teal-500' : ''} ${
                      isPastDay ? 'bg-gray-50' : ''
                    }`}
                  >
                    <CardHeader className="pb-2 p-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xs font-medium">
                            {format(day, 'd')}
                          </CardTitle>
                          {isCurrentDay && (
                            <Badge variant="outline" className="text-[10px] mt-1">
                              Hoy
                            </Badge>
                          )}
                        </div>
                        {hasSelections && isCurrentMonth && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => handleApplyToMonth(dateStr)}
                            disabled={saving}
                            title="Aplicar a todo el mes"
                          >
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-2 space-y-1">
                      {isCurrentMonth && MEAL_TYPES.map((meal) => {
                        const selection = getSelectionForMeal(dateStr, meal.type)
                        
                        return (
                          <div
                            key={meal.type}
                            className="relative group"
                          >
                            <Button
                              variant={selection ? "secondary" : "outline"}
                              className="w-full justify-start h-auto p-1 text-[10px]"
                              onClick={() => handleSelectMeal(dateStr, meal.type)}
                              disabled={saving || !isCurrentMonth}
                            >
                              <div className="flex items-center gap-1 w-full">
                                <span className="text-xs">{meal.icon}</span>
                                <div className="flex-1 text-left min-w-0">
                                  <div className="font-medium truncate">{meal.name}</div>
                                  {selection ? (
                                    <div className="text-[8px] text-muted-foreground truncate">
                                      {selection.recipe?.name || selection.custom_description}
                                    </div>
                                  ) : (
                                    <div className="text-[8px] text-muted-foreground">
                                      {meal.time}
                                    </div>
                                  )}
                                </div>
                                {selection && (
                                  <Check className="h-2 w-2 text-teal-600 flex-shrink-0" />
                                )}
                              </div>
                            </Button>
                            {hasSelections && weekIndex > 0 && dayIndex === 0 && isCurrentMonth && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm"
                                onClick={() => {
                                  // Copiar semana anterior
                                  const previousWeekStart = new Date(day)
                                  previousWeekStart.setDate(day.getDate() - 7)
                                  handleCopyWeek(format(previousWeekStart, 'yyyy-MM-dd'), dateStr)
                                }}
                                disabled={saving}
                                title="Copiar semana anterior"
                              >
                                <Copy className="h-2 w-2" />
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

