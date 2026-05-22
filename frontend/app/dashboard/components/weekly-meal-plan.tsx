"use client"

import { useState, useEffect, useCallback } from "react"
import { Calendar, ChefHat, Check, Clock, Loader2, Copy, ArrowRight, BookOpen, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { nutritionService } from "@/lib/nutrition-service"
import { MealSelectionModal } from "@/components/dashboard/meal-selection-modal"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { API_CONFIG, authenticatedFetch } from "@/lib/api"

const FALLBACK_MEAL_TYPES = [
  { name: "Desayuno", type: "breakfast", time: "08:00", icon: "🌅" },
  { name: "Snack Mañana", type: "morning_snack", time: "10:30", icon: "☕" },
  { name: "Almuerzo", type: "lunch", time: "13:00", icon: "🍽️" },
  { name: "Snack Tarde", type: "afternoon_snack", time: "16:00", icon: "🍎" },
  { name: "Cena", type: "dinner", time: "20:00", icon: "🌙" },
]

const resolveRecipeImageSrc = (src?: string | null) => {
  const value = String(src || '').trim()
  if (!value) return '/placeholder.jpg'
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:') || value.startsWith('blob:')) {
    return value
  }
  if (value.startsWith('/')) {
    return `${API_CONFIG.BASE_URL}${value}`
  }
  return value
}

interface WeeklyMealSelection {
  date: string
  meal_type: string
  plan_meal_id?: string | null
  recipe?: {
    id: string
    name: string
    image_url?: string
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  recipe_id?: string
  recipe_name?: string
  custom_description?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
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
  const [selectedMeal, setSelectedMeal] = useState<{ date: string; meal_type: string; plan_meal_id?: string | null; meal_name?: string; meal_time?: string | null; currentSelection?: { optionId?: string | null; recipeId?: string | null } } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [mealOptions, setMealOptions] = useState<any[]>([])
  // Cache simple de opciones por fecha + tipo (para evitar refetch al abrir/cerrar)
  const [optionsByDateAndType, setOptionsByDateAndType] = useState<Record<string, Record<string, any[]>>>({})
  const [planMealSlotsPerDay, setPlanMealSlotsPerDay] = useState<Record<string, Array<{ id?: string; name: string; meal_type: string; time?: string | null; order_index?: number }>> | null>(null)

  const getSlotIcon = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return '🌅'
      case 'morning_snack': return '☕'
      case 'lunch': return '🍽️'
      case 'afternoon_snack': return '🍎'
      case 'dinner': return '🌙'
      default: return '🍽️'
    }
  }

  const resolveRecipeId = (option: any): string | undefined => {
    // Preferir SIEMPRE recipeId (es el ID real de Recipe en backend)
    if (option?.recipeId) return String(option.recipeId)
    // Fallback: si option.id viene como "recipe-<uuid>", extraer el uuid
    if (typeof option?.id === 'string' && option.id.startsWith('recipe-')) return option.id.replace(/^recipe-/, '')
    // Último fallback: usar id tal cual
    if (option?.id) return String(option.id)
    return undefined
  }

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
      setWeeklySelections(selections)
    } catch (error) {
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

  // Cargar estructura del plan para cada día de la semana actual
  useEffect(() => {
    const days = getWeekDays()
    Promise.all(
      days.map(async (day) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        try {
          const response = await authenticatedFetch(
            `nutrition/plan-meals-for-selection/?date=${dateStr}`,
            { method: 'GET' }
          )
          if (!response.ok) return { dateStr, slots: [] }
          const data = await response.json()
          return { dateStr, slots: (data.meal_slots || []) as Array<{ id?: string; name: string; meal_type: string; time?: string | null; order_index?: number }> }
        } catch {
          return { dateStr, slots: [] }
        }
      })
    ).then((results) => {
      const perDay: Record<string, Array<{ id?: string; name: string; meal_type: string; time?: string | null; order_index?: number }>> = {}
      results.forEach(({ dateStr, slots }) => { perDay[dateStr] = slots })
      setPlanMealSlotsPerDay(perDay)
    }).catch(() => {})
  }, [getWeekDays])

  // Navegación de semana eliminada - siempre muestra la semana actual

  // Abrir modal de selección
  const handleSelectMeal = async (date: string, slot: { id?: string; meal_type: string; name?: string; time?: string | null }) => {
    const currentSelection = getSelectionForMeal(date, slot.meal_type, slot.id)
    setSelectedDay(date)
    setSelectedMeal({
      date,
      meal_type: slot.meal_type,
      plan_meal_id: slot.id || null,
      meal_name: slot.name,
      meal_time: slot.time,
      currentSelection: {
        optionId: currentSelection?.recipe_id ? String(currentSelection.recipe_id) : null,
        recipeId: currentSelection?.recipe?.id ? String(currentSelection.recipe.id) : null,
      },
    })
    
    try {
      const cachedByType = optionsByDateAndType[date]?.[slot.meal_type]
      if (Array.isArray(cachedByType) && cachedByType.length > 0) {
        setMealOptions(cachedByType)
        setIsModalOpen(true)
        return
      }

      // Fallback: pedir al backend (por fecha) y extraer opciones por slot o por tipo
      const response = await authenticatedFetch(
        `nutrition/plan-meals-for-selection/?date=${date}`,
        { method: 'GET' }
      )
      if (!response.ok) return
      const data = await response.json()
      const options = data.meals_by_type?.[slot.meal_type] || []
      setMealOptions(options)
      setOptionsByDateAndType((prev) => ({
        ...prev,
        [date]: {
          ...(prev[date] || {}),
          [slot.meal_type]: options,
        },
      }))
      setIsModalOpen(true)
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
      const recipeId = resolveRecipeId(option)
      const selections = [{
        date: selectedMeal.date,
        meal_type: selectedMeal.meal_type,
        plan_meal_id: selectedMeal.plan_meal_id || undefined,
        recipe_id: recipeId,
        calories: option.calories || 0,
        protein: option.protein || 0,
        carbs: option.carbs || 0,
        fat: option.fat || 0,
        custom_description: option.name || '', // Preservar el nombre como custom_description si no hay recipe_id
        completed: false // Solo planificación, no completada
      }]

      const result = await nutritionService.saveWeeklyMealSelections(selections)
      
      
      toast({
        title: "✅ Comida seleccionada",
        description: `${option.name} guardada para ${format(new Date(selectedMeal.date), 'EEEE d', { locale: es })}`,
      })

      setIsModalOpen(false)
      setSelectedMeal(null)
      
      // Recargar selecciones después de guardar
      await loadWeeklySelections()
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

  // Marcar comida como completada directamente desde la vista
  const handleToggleCompleted = async (dateStr: string, slot: { meal_type: string; id?: string }) => {
    const selection = getSelectionForMeal(dateStr, slot.meal_type, slot.id)
    if (!selection) {
      // Si no hay selección, abrir modal para seleccionar
      handleSelectMeal(dateStr, slot)
      return
    }

    setSaving(true)
    try {
      const newCompletedStatus = !selection.completed
      
      const selections = [{
        date: dateStr,
        meal_type: slot.meal_type,
        plan_meal_id: (selection as any).plan_meal_id || slot.id,
        recipe_id: selection.recipe?.id || (selection as any).recipe_id,
        calories: selection.recipe?.calories || selection.calories || 0,
        protein: selection.recipe?.protein || selection.protein || 0,
        carbs: selection.recipe?.carbs || selection.carbs || 0,
        fat: selection.recipe?.fat || selection.fat || 0,
        custom_description: selection.custom_description || selection.recipe?.name || selection.recipe_name || '',
        completed: newCompletedStatus
      }]

      const result = await nutritionService.saveWeeklyMealSelections(selections)
      
      
      toast({
        title: newCompletedStatus ? "✅ Comida completada" : "📋 Comida desmarcada",
        description: `Estado actualizado para ${format(new Date(dateStr), 'EEEE d', { locale: es })}`,
      })
      
      // Recargar selecciones después de actualizar
      await loadWeeklySelections()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la comida",
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
        plan_meal_id: (selection as any).plan_meal_id,
        recipe_id: selection.recipe?.id || (selection as any).recipe_id,
        calories: selection.recipe?.calories || selection.calories || 0,
        protein: selection.recipe?.protein || selection.protein || 0,
        carbs: selection.recipe?.carbs || selection.carbs || 0,
        fat: selection.recipe?.fat || selection.fat || 0,
        custom_description: selection.custom_description || selection.recipe?.name || (selection as any).recipe_name || '',
        completed: false // Solo planificación al copiar
      }))

      await nutritionService.saveWeeklyMealSelections(selectionsToSave)
      
      toast({
        title: "✅ Día copiado",
        description: `Comidas copiadas de ${format(new Date(sourceDate), 'EEEE d', { locale: es })} a ${format(new Date(targetDate), 'EEEE d', { locale: es })}`,
      })

      await loadWeeklySelections()
    } catch (error) {
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
            plan_meal_id: (selection as any).plan_meal_id,
            recipe_id: selection.recipe?.id || (selection as any).recipe_id,
            calories: selection.recipe?.calories || selection.calories || 0,
            protein: selection.recipe?.protein || selection.protein || 0,
            carbs: selection.recipe?.carbs || selection.carbs || 0,
            fat: selection.recipe?.fat || selection.fat || 0,
            custom_description: selection.custom_description || selection.recipe?.name || (selection as any).recipe_name || '',
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
  const getSelectionForMeal = (dateStr: string, mealType: string, planMealId?: string): WeeklyMealSelection | null => {
    const daySelections = weeklySelections[dateStr] || []
    const selection = daySelections.find((s: any) => {
      if (typeof s !== 'object') return false
      if (planMealId && s.plan_meal_id) return String(s.plan_meal_id) === String(planMealId)
      return s.meal_type === mealType
    })
    return selection || null
  }

  const weekDays = getWeekDays()

  // Obtener el nombre de la comida con mejor manejo de casos
  const getMealName = (selection: WeeklyMealSelection | null): string => {
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

  const MEAL_TYPE_META: Record<string, { name: string; time: string; icon: string }> = {
    breakfast:        { name: 'Desayuno',      time: '08:00', icon: '🌅' },
    morning_snack:    { name: 'Snack Mañana',  time: '10:30', icon: '☕' },
    lunch:            { name: 'Almuerzo',      time: '13:00', icon: '🍽️' },
    afternoon_snack:  { name: 'Snack Tarde',   time: '16:00', icon: '🍎' },
    dinner:           { name: 'Cena',          time: '20:00', icon: '🌙' },
    pre_workout:      { name: 'Pre-entreno',   time: '17:00', icon: '💪' },
    post_workout:     { name: 'Post-entreno',  time: '19:00', icon: '🥤' },
    snack:            { name: 'Snack',         time: '16:00', icon: '🍎' },
  }

  // Usar slots del plan real por día; si no hay, usar FALLBACK_MEAL_TYPES
  const slotsForDay = useCallback((dateStr: string) => {
    const slots = planMealSlotsPerDay?.[dateStr]
    if (!slots || slots.length === 0) {
      return FALLBACK_MEAL_TYPES.map((m) => ({
        id: undefined,
        name: m.name,
        meal_type: m.type,
        time: m.time,
        icon: m.icon,
      }))
    }
    return slots.map((s) => {
      const meta = MEAL_TYPE_META[s.meal_type] || { name: s.name || s.meal_type, time: '', icon: '🍽️' }
      return {
        id: s.id,
        name: s.name || meta.name,
        meal_type: s.meal_type,
        time: s.time ?? meta.time,
        icon: meta.icon,
      }
    })
  }, [planMealSlotsPerDay])

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header sin navegación - solo información */}
      <Card>
        <CardHeader className="pb-3 md:pb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Calendar className="h-4 w-4 md:h-5 md:w-5" />
                Planificación Semanal
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Planifica tus comidas para toda la semana
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center">
            <p className="text-xs md:text-sm text-muted-foreground">
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
                          type="button"
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
                <CardContent className="p-2 md:p-6 space-y-1.5 md:space-y-2">
                  {slotsForDay(dateStr).map((slot: any) => {
                    const selection = getSelectionForMeal(dateStr, slot.meal_type, slot.id)
                    // Verificar si está completada (por defecto false si no se especifica)
                    const isCompleted = selection?.completed === true
                    const hasSelection = !!selection
                    const mealLabel = slot.name || slot.meal_type
                    const mealTime = (slot.time || "").slice(0, 5) || ""
                    const selectedName = selection ? getMealName(selection) : ""
                    const imageSrc = resolveRecipeImageSrc(selection?.recipe?.image_url)
                    const calories = selection?.recipe?.calories || selection?.calories || 0
                    const protein = selection?.recipe?.protein || selection?.protein || 0
                    const carbs = selection?.recipe?.carbs || selection?.carbs || 0
                    
                    return (
                      <div
                        key={String(slot.id || slot.meal_type) + '-' + String(slot.order_index || '')}
                        className="relative group"
                      >
                        <Button
                          type="button"
                          variant={hasSelection ? (isCompleted ? "secondary" : "outline") : "outline"}
                          className={`w-full justify-start h-auto text-[10px] md:text-xs touch-manipulation ${
                            hasSelection
                              ? `overflow-hidden rounded-2xl border p-0 shadow-sm hover:shadow-lg ${isCompleted ? 'border-teal-300' : 'border-orange-200'}`
                              : 'min-h-[40px] md:min-h-[45px] p-1.5 md:p-2'
                          }`}
                          onClick={() => handleSelectMeal(dateStr, slot)}
                          disabled={saving}
                        >
                          {hasSelection ? (
                            <div className="w-full text-left bg-white">
                              <div className="relative h-44 md:h-36 overflow-hidden">
                                <img
                                  src={imageSrc}
                                  alt={selectedName}
                                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  onError={(e) => {
                                    ;(e.target as HTMLImageElement).src = '/placeholder.jpg'
                                  }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent" />
                                <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
                                  <span className="rounded-full bg-lime-400 px-2.5 py-1 text-[10px] font-black text-lime-950 shadow">
                                    {mealLabel}
                                  </span>
                                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold shadow ${
                                    isCompleted ? 'bg-teal-500 text-white' : 'bg-white/90 text-gray-700'
                                  }`}>
                                    {isCompleted ? 'Completada' : 'Planificada'}
                                  </span>
                                </div>
                                <div className="absolute bottom-3 left-3 right-3">
                                  <h4 className="line-clamp-2 text-base md:text-sm font-black leading-tight text-white drop-shadow">
                                    {selectedName}
                                  </h4>
                                  <div className="mt-1.5 flex items-center gap-2 text-[10px] font-semibold text-white/90">
                                    <span>{slot.icon || getSlotIcon(slot.meal_type)}</span>
                                    {mealTime && <span>{mealTime}</span>}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-1.5 p-2">
                                <span className="rounded-xl border border-orange-100 bg-orange-50 px-1.5 py-1.5 text-center">
                                  <span className="block text-[11px] font-black text-orange-700">{calories}</span>
                                  <span className="block text-[8px] font-semibold text-orange-500">kcal</span>
                                </span>
                                <span className="rounded-xl border border-blue-100 bg-blue-50 px-1.5 py-1.5 text-center">
                                  <span className="block text-[11px] font-black text-blue-700">{protein}g</span>
                                  <span className="block text-[8px] font-semibold text-blue-500">prot</span>
                                </span>
                                <span className="rounded-xl border border-green-100 bg-green-50 px-1.5 py-1.5 text-center">
                                  <span className="block text-[11px] font-black text-green-700">{carbs}g</span>
                                  <span className="block text-[8px] font-semibold text-green-500">carb</span>
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-1.5 px-2 pb-2 text-[10px] font-bold">
                                <span className="flex items-center justify-center gap-1 rounded-xl bg-orange-50 px-2 py-2 text-orange-700">
                                  <BookOpen className="h-3 w-3" />
                                  Receta
                                </span>
                                <span className="flex items-center justify-center gap-1 rounded-xl bg-gray-50 px-2 py-2 text-gray-600">
                                  <RefreshCw className="h-3 w-3" />
                                  Cambiar
                                </span>
                                <span className="flex items-center justify-center rounded-xl bg-gray-50 px-2 py-2 text-gray-600">
                                  No me gusta
                                </span>
                              </div>

                              <button
                                type="button"
                                className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full shadow transition-colors ${
                                  isCompleted ? 'bg-teal-500 text-white' : 'bg-white/90 text-gray-600'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToggleCompleted(dateStr, slot)
                                }}
                                disabled={saving}
                                title={isCompleted ? "Marcar como no completada" : "Marcar como completada"}
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5 w-full text-left">
                              <div className="flex items-center gap-2">
                                <span className="text-base flex-shrink-0">{slot.icon || getSlotIcon(slot.meal_type)}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-xs leading-tight">{mealLabel}</div>
                                  <div className="text-[10px] text-muted-foreground">{mealTime}</div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 flex-shrink-0"
                                  tabIndex={-1}
                                >
                                  <ChefHat className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                              </div>
                            </div>
                          )}
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
          mealName={selectedMeal.meal_name || FALLBACK_MEAL_TYPES.find(m => m.type === selectedMeal.meal_type)?.name || selectedMeal.meal_type}
          mealTime={(selectedMeal.meal_time || FALLBACK_MEAL_TYPES.find(m => m.type === selectedMeal.meal_type)?.time || "").slice(0,5)}
          mealType={selectedMeal.meal_type}
          options={mealOptions}
          currentSelection={selectedMeal.currentSelection}
          onSelectOption={handleSaveSelection}
        />
      )}
    </div>
  )
}
