"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Calendar, ChefHat, Check, BookOpen, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { MealIngredientSubstitution, nutritionService } from "@/lib/nutrition-service"
import { MealSelectionModal } from "@/components/dashboard/meal-selection-modal"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { API_CONFIG, authenticatedFetch } from "@/lib/api"
import { formatMacro } from "@/lib/utils"
import { WeeklyCalendarSkeleton } from "@/components/dashboard/dashboard-skeletons"
import { cn } from "@/lib/utils"

const getMondayOfWeek = (date: Date): Date => {
  const monday = new Date(date)
  const weekday = monday.getDay()
  const diff = weekday === 0 ? -6 : 1 - weekday
  monday.setDate(monday.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return ''
}

const isAuthSessionError = (error: unknown): boolean => {
  const message = getErrorMessage(error).toLowerCase()
  if (!message) return false
  return (
    message.includes('sesion expirada') ||
    message.includes('sesión expirada') ||
    message.includes('token expirado') ||
    message.includes('token is blacklisted') ||
    message.includes('blacklisted') ||
    message.includes('401') ||
    message.includes('unauthorized') ||
    message.includes('token_not_valid') ||
    message.includes('no hay token')
  )
}

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
  substitution_details?: MealIngredientSubstitution[]
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  completed?: boolean
}

type MealSlot = {
  id?: string
  name: string
  meal_type: string
  time?: string | null
  order_index?: number
  icon?: string
}

interface PlanDayData {
  slots: MealSlot[]
  optionsByMealId: Record<string, any[]>
  mealsByType: Record<string, any[]>
  source?: string
  planName?: string
}

export function WeeklyMealPlan() {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getMondayOfWeek(new Date()))
  
  const [weeklySelections, setWeeklySelections] = useState<Record<string, WeeklyMealSelection[]>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(todayStr)
  const [selectedMeal, setSelectedMeal] = useState<{ date: string; meal_type: string; plan_meal_id?: string | null; meal_name?: string; meal_time?: string | null; currentSelection?: { optionId?: string | null; recipeId?: string | null } } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [mealOptions, setMealOptions] = useState<any[]>([])
  const [hasAuthError, setHasAuthError] = useState(false)
  // Cache simple de opciones por fecha + tipo (para evitar refetch al abrir/cerrar)
  const [optionsByDateAndType, setOptionsByDateAndType] = useState<Record<string, Record<string, any[]>>>({})
  const [planDataPerDay, setPlanDataPerDay] = useState<Record<string, PlanDayData>>({})
  const [planDataLoading, setPlanDataLoading] = useState(true)

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
      setHasAuthError(false)
    } catch (error) {
      const sessionExpired = isAuthSessionError(error)
      setHasAuthError(sessionExpired)
      toast({
        title: sessionExpired ? "Sesion expirada" : "Error",
        description: sessionExpired
          ? "Tu sesion expiro. Inicia sesion de nuevo para ver tu menu semanal."
          : "No se pudieron cargar las selecciones de la semana",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [currentWeekStart])

  useEffect(() => {
    loadWeeklySelections()
  }, [loadWeeklySelections])

  // Cargar estructura y opciones del plan para la semana (1 request batch)
  useEffect(() => {
    const days = getWeekDays()
    const startDateStr = format(days[0], 'yyyy-MM-dd')
    setPlanDataLoading(true)

    const emptyDay = (): PlanDayData => ({
      slots: [],
      optionsByMealId: {},
      mealsByType: {},
    })

    ;(async () => {
      try {
        const response = await authenticatedFetch(
          `nutrition/plan-meals-for-selection-batch/?start_date=${startDateStr}`,
          { method: 'GET' },
        )
        const perDay: Record<string, PlanDayData> = {}
        const optionsCache: Record<string, Record<string, any[]>> = {}

        if (!response.ok) {
          days.forEach((day) => {
            perDay[format(day, 'yyyy-MM-dd')] = emptyDay()
          })
          setPlanDataPerDay(perDay)
          return
        }

        const payload = await response.json()
        const results = (payload.results || {}) as Record<string, any>
        days.forEach((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const data = results[dateStr] || {}
          const dayData: PlanDayData = {
            slots: (data.meal_slots || []) as MealSlot[],
            optionsByMealId: (data.options_by_meal_id || {}) as Record<string, any[]>,
            mealsByType: (data.meals_by_type || {}) as Record<string, any[]>,
            source: data.source as string | undefined,
            planName: data.plan_name as string | undefined,
          }
          perDay[dateStr] = dayData
          if (Object.keys(dayData.mealsByType).length > 0) {
            optionsCache[dateStr] = dayData.mealsByType
          }
        })
        setPlanDataPerDay(perDay)
        setOptionsByDateAndType((prev) => ({ ...prev, ...optionsCache }))
      } catch (error) {
        if (isAuthSessionError(error)) {
          setHasAuthError(true)
        }
        const perDay: Record<string, PlanDayData> = {}
        days.forEach((day) => {
          perDay[format(day, 'yyyy-MM-dd')] = emptyDay()
        })
        setPlanDataPerDay(perDay)
      } finally {
        setPlanDataLoading(false)
      }
    })()
  }, [getWeekDays, currentWeekStart])

  const hasUserPlan = useMemo(
    () => Object.values(planDataPerDay).some((d) => d.source === 'user_plan' && d.slots.length > 0),
    [planDataPerDay],
  )

  const getSelectionForMeal = (dateStr: string, mealType: string, planMealId?: string): WeeklyMealSelection | null => {
    const daySelections = weeklySelections[dateStr] || []
    if (planMealId) {
      const byId = daySelections.find((s: any) => typeof s === 'object' && s.plan_meal_id && String(s.plan_meal_id) === String(planMealId))
      if (byId) return byId
    }
    const sameMealTypeWithId = daySelections.find((s: any) => typeof s === 'object' && s.meal_type === mealType && s.plan_meal_id)
    if (!sameMealTypeWithId) {
      return daySelections.find((s: any) => typeof s === 'object' && s.meal_type === mealType) || null
    }
    return null
  }

  const getMealName = (selection: WeeklyMealSelection | null): string => {
    if (!selection) return 'Sin nombre'
    if (selection.recipe?.name && selection.recipe.name.trim() !== '') return selection.recipe.name
    if (selection.recipe_name && selection.recipe_name.trim() !== '') return selection.recipe_name
    if (selection.custom_description && selection.custom_description.trim() !== '') return selection.custom_description
    const mealTypeNames: Record<string, string> = {
      breakfast: 'Desayuno',
      morning_snack: 'Snack Mañana',
      lunch: 'Almuerzo',
      afternoon_snack: 'Snack Tarde',
      dinner: 'Cena',
    }
    const mealTypeName = mealTypeNames[selection.meal_type] || 'Comida'
    return `${mealTypeName} - Seleccionada`
  }

  const getRecommendedOption = (dateStr: string, slot: { id?: string; meal_type: string }): any | null => {
    const dayData = planDataPerDay[dateStr]
    if (!dayData) return null
    if (slot.id && dayData.optionsByMealId[slot.id]?.length) {
      return dayData.optionsByMealId[slot.id][0]
    }
    const byType = dayData.mealsByType[slot.meal_type]
    if (byType?.length) return byType[0]
    return null
  }

  type MealDisplayInfo = {
    name: string
    imageSrc: string
    calories: number
    protein: number
    carbs: number
    fat: number
    isSaved: boolean
    isRecommended: boolean
    isCompleted: boolean
  }

  const getMealDisplay = (dateStr: string, slot: MealSlot): MealDisplayInfo => {
    const selection = getSelectionForMeal(dateStr, slot.meal_type, slot.id)
    if (selection) {
      return {
        name: getMealName(selection),
        imageSrc: resolveRecipeImageSrc(selection.recipe?.image_url),
        calories: selection.recipe?.calories || selection.calories || 0,
        protein: selection.recipe?.protein || selection.protein || 0,
        carbs: selection.recipe?.carbs || selection.carbs || 0,
        fat: selection.recipe?.fat || selection.fat || 0,
        isSaved: true,
        isRecommended: false,
        isCompleted: selection.completed === true,
      }
    }
    const recommended = getRecommendedOption(dateStr, slot)
    if (recommended) {
      return {
        name: recommended.name || slot.name,
        imageSrc: resolveRecipeImageSrc(recommended.imageUrl),
        calories: recommended.calories || 0,
        protein: recommended.protein || 0,
        carbs: recommended.carbs || 0,
        fat: recommended.fat || 0,
        isSaved: false,
        isRecommended: true,
        isCompleted: false,
      }
    }
    return {
      name: slot.name,
      imageSrc: '/placeholder.jpg',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      isSaved: false,
      isRecommended: false,
      isCompleted: false,
    }
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

  const slotsForDay = useCallback((dateStr: string): MealSlot[] => {
    const dayData = planDataPerDay[dateStr]
    if (!dayData || dayData.source !== 'user_plan' || !dayData.slots?.length) return []
    return dayData.slots.map((s) => {
      const meta = MEAL_TYPE_META[s.meal_type] || { name: s.name || s.meal_type, time: '', icon: '🍽️' }
      return {
        id: s.id,
        name: s.name || meta.name,
        meal_type: s.meal_type,
        time: s.time ?? meta.time,
        icon: meta.icon,
        order_index: s.order_index,
      }
    })
  }, [planDataPerDay])

  // Abrir modal de selección
  const handleSelectMeal = async (date: string, slot: { id?: string; meal_type: string; name?: string; time?: string | null }) => {
    const currentSelection = getSelectionForMeal(date, slot.meal_type, slot.id)
    const recommended = !currentSelection ? getRecommendedOption(date, slot) : null
    setSelectedDay(date)
    setSelectedMeal({
      date,
      meal_type: slot.meal_type,
      plan_meal_id: slot.id || null,
      meal_name: slot.name,
      meal_time: slot.time,
      currentSelection: {
        optionId: currentSelection?.recipe_id
          ? String(currentSelection.recipe_id)
          : recommended?.recipeId
            ? String(recommended.recipeId)
            : null,
        recipeId: currentSelection?.recipe?.id
          ? String(currentSelection.recipe.id)
          : recommended?.recipeId
            ? String(recommended.recipeId)
            : null,
      },
    })

    try {
      const dayData = planDataPerDay[date]
      if (slot.id && dayData?.optionsByMealId[slot.id]?.length) {
        setMealOptions(dayData.optionsByMealId[slot.id])
        setIsModalOpen(true)
        return
      }

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
      setHasAuthError(false)
    } catch (error) {
      const sessionExpired = isAuthSessionError(error)
      setHasAuthError(sessionExpired)
      toast({
        title: sessionExpired ? "Sesion expirada" : "Error",
        description: sessionExpired
          ? "Tu sesion expiro. Inicia sesion de nuevo para seleccionar comidas."
          : "No se pudieron cargar las opciones de comida",
        variant: "destructive"
      })
    }
  }

  // Guardar selección en backend
  const persistMealSelection = async (
    date: string,
    slot: { id?: string; meal_type: string },
    option: any,
    completed = false,
  ) => {
    const recipeId = resolveRecipeId(option)
    const selections = [{
      date,
      meal_type: slot.meal_type,
      plan_meal_id: slot.id || undefined,
      recipe_id: recipeId,
      calories: option.calories || 0,
      protein: option.protein || 0,
      carbs: option.carbs || 0,
      fat: option.fat || 0,
      custom_description: option.customDescription || option.name || '',
      substitution_details: option.substitution_details || [],
      completed,
    }]
    await nutritionService.saveWeeklyMealSelections(selections)
    await loadWeeklySelections()
  }

  // Guardar selección desde el modal
  const handleSaveSelection = async (option: any) => {
    if (!selectedMeal) return

    setSaving(true)
    try {
      await persistMealSelection(selectedMeal.date, {
        id: selectedMeal.plan_meal_id || undefined,
        meal_type: selectedMeal.meal_type,
      }, option, false)

      toast({
        title: "✅ Comida seleccionada",
        description: `${option.name} guardada para ${format(new Date(selectedMeal.date), 'EEEE d', { locale: es })}`,
      })

      setIsModalOpen(false)
      setSelectedMeal(null)
    } catch {
      toast({
        title: "Error",
        description: "No se pudo guardar la selección",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Marcar comida como completada (si solo hay sugerencia, la confirma al guardar)
  const handleToggleCompleted = async (dateStr: string, slot: { meal_type: string; id?: string }) => {
    let selection = getSelectionForMeal(dateStr, slot.meal_type, slot.id)
    if (!selection) {
      const recommended = getRecommendedOption(dateStr, slot)
      if (recommended) {
        setSaving(true)
        try {
          await persistMealSelection(dateStr, slot, recommended, true)
          toast({
            title: "✅ Comida completada",
            description: `${recommended.name} confirmada para ${format(new Date(dateStr), 'EEEE d', { locale: es })}`,
          })
        } catch {
          toast({
            title: "Error",
            description: "No se pudo confirmar la comida",
            variant: "destructive",
          })
        } finally {
          setSaving(false)
        }
        return
      }
      handleSelectMeal(dateStr, slot)
      return
    }

    setSaving(true)
    try {
      const newCompletedStatus = !selection.completed
      await persistMealSelection(
        dateStr,
        slot,
        {
          name: getMealName(selection),
          recipeId: selection.recipe?.id || (selection as any).recipe_id,
          calories: selection.recipe?.calories || selection.calories || 0,
          protein: selection.recipe?.protein || selection.protein || 0,
          carbs: selection.recipe?.carbs || selection.carbs || 0,
          fat: selection.recipe?.fat || selection.fat || 0,
          customDescription: selection.custom_description || selection.recipe?.name || selection.recipe_name || '',
          substitution_details: selection.substitution_details || [],
        },
        newCompletedStatus,
      )
      toast({
        title: newCompletedStatus ? "✅ Comida completada" : "📋 Comida desmarcada",
        description: `Estado actualizado para ${format(new Date(dateStr), 'EEEE d', { locale: es })}`,
      })
    } catch {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la comida",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const weekDays = getWeekDays()

  const isCurrentWeek = getMondayOfWeek(new Date()).getTime() === currentWeekStart.getTime()

  const countDayMeals = (dateStr: string) => {
    let filled = 0
    let completed = 0
    for (const slot of slotsForDay(dateStr)) {
      const display = getMealDisplay(dateStr, slot)
      if (display.isSaved || display.isRecommended) filled++
      if (display.isCompleted) completed++
    }
    return { filled, completed, total: slotsForDay(dateStr).length }
  }

  const weekStats = (() => {
    let planned = 0
    let completed = 0
    let totalSlots = 0
    for (const day of weekDays) {
      const dateStr = format(day, 'yyyy-MM-dd')
      const { filled, completed: dayCompleted, total } = countDayMeals(dateStr)
      totalSlots += total
      planned += filled
      completed += dayCompleted
    }
    return { planned, completed, totalSlots }
  })()

  const shiftWeek = (delta: number) => {
    setCurrentWeekStart((prev) => {
      const next = new Date(prev)
      next.setDate(prev.getDate() + delta * 7)
      return next
    })
    if (selectedDay) {
      const selected = new Date(selectedDay)
      selected.setDate(selected.getDate() + delta * 7)
      setSelectedDay(format(selected, 'yyyy-MM-dd'))
    }
  }

  const goToThisWeek = () => {
    setCurrentWeekStart(getMondayOfWeek(new Date()))
    setSelectedDay(todayStr)
  }

  const selectDay = (dateStr: string) => {
    setSelectedDay(dateStr)
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches) {
      window.requestAnimationFrame(() => {
        document.getElementById('weekly-day-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {hasAuthError && (
        <Card className="border-red-200">
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <p className="text-sm text-red-700">
                Tu sesion ha expirado. Inicia sesion de nuevo para cargar correctamente tu menu semanal.
              </p>
              <Button onClick={() => { window.location.href = '/auth' }}>
                Iniciar sesion
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header + navegación de semana */}
      <Card>
        <CardHeader className="pb-3 md:pb-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Calendar className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
                Planificación Semanal
              </CardTitle>
              <CardDescription className="text-xs md:text-sm mt-1">
                {format(weekDays[0], "d 'de' MMMM", { locale: es })} – {format(weekDays[6], "d 'de' MMMM, yyyy", { locale: es })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => shiftWeek(-1)} aria-label="Semana anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {!isCurrentWeek ? (
                <Button type="button" variant="secondary" size="sm" className="h-9 text-xs" onClick={goToThisWeek}>
                  Hoy
                </Button>
              ) : null}
              <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => shiftWeek(1)} aria-label="Semana siguiente">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {hasUserPlan && weekStats.totalSlots > 0 ? (
            <div className="rounded-xl bg-teal-50/80 border border-teal-100 px-3 py-2.5">
              <div className="flex items-center justify-between text-xs font-medium text-teal-800 mb-1.5">
                <span>{weekStats.planned}/{weekStats.totalSlots} comidas planificadas</span>
                <span>{weekStats.completed} completadas</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-teal-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-teal-500 transition-all"
                  style={{ width: `${weekStats.totalSlots > 0 ? (weekStats.planned / weekStats.totalSlots) * 100 : 0}%` }}
                />
              </div>
            </div>
          ) : null}
        </CardHeader>
      </Card>

      {loading || planDataLoading ? (
        <WeeklyCalendarSkeleton />
      ) : !hasUserPlan ? (
        <Card className="border-dashed">
          <CardContent className="py-10 md:py-12 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <ChefHat className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-base md:text-lg font-semibold">Sin plan nutricional asignado</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Cuando tu entrenador te asigne un plan, podrás planificar aquí las comidas de cada día de la semana.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Calendario semanal — 2 filas en móvil (4+3), fila única en desktop */}
          <div className="grid grid-cols-4 gap-2 md:grid-cols-7 md:gap-3">
            {weekDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDay
              const dayName = format(day, 'EEE', { locale: es })
              const dayNumber = format(day, 'd')
              const { filled, completed, total } = countDayMeals(dateStr)
              const fillPct = total > 0 ? (filled / total) * 100 : 0

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => selectDay(dateStr)}
                  className={cn(
                    "rounded-xl border bg-card p-2.5 md:p-3 text-center transition-all touch-manipulation",
                    "hover:shadow-md hover:border-teal-200 active:scale-[0.98]",
                    isSelected && "ring-2 ring-teal-500 border-teal-400 shadow-md bg-teal-50/40",
                    isToday && !isSelected && "border-teal-300 bg-teal-50/20",
                  )}
                >
                  <div className="font-semibold text-[10px] md:text-xs capitalize text-muted-foreground">{dayName}</div>
                  <div className={cn("text-xl md:text-2xl font-black my-0.5 leading-none", (isToday || isSelected) && "text-teal-600")}>
                    {dayNumber}
                  </div>
                  <div className="text-[9px] md:text-[10px] text-muted-foreground capitalize">{format(day, 'MMM', { locale: es })}</div>
                  {isToday ? (
                    <Badge variant="secondary" className="mt-1 h-4 px-1.5 text-[9px] bg-teal-600 text-white hover:bg-teal-600">
                      Hoy
                    </Badge>
                  ) : null}
                  {total > 0 ? (
                    <div className="mt-1.5 md:mt-2">
                      <div className="text-[9px] md:text-[10px] font-semibold text-teal-600">{completed}/{total}</div>
                      <div className="mt-1 h-1 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${fillPct}%` }} />
                      </div>
                    </div>
                  ) : null}
                </button>
              )
            })}
          </div>

          {/* Detalle del día seleccionado */}
          <div id="weekly-day-detail" className="space-y-3 scroll-mt-4">
            {selectedDay ? (
              <>
                <div className="px-0.5">
                  <h3 className="text-base md:text-lg font-bold capitalize">
                    {format(new Date(selectedDay), "EEEE d 'de' MMMM", { locale: es })}
                  </h3>
                  <p className="text-xs text-muted-foreground">Toca una comida para elegir o cambiar la receta</p>
                </div>

                <div className="space-y-2">
          {slotsForDay(selectedDay).length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No hay comidas asignadas para este día en tu plan nutricional
              </CardContent>
            </Card>
          ) : null}
          {slotsForDay(selectedDay).map((slot) => {
            const display = getMealDisplay(selectedDay, slot)
            const hasDisplay = display.isSaved || display.isRecommended
            const mealLabel = slot.name || slot.meal_type
            const mealTime = (slot.time || "").slice(0, 5) || ""
            const statusLabel = display.isCompleted
              ? 'Completada'
              : display.isSaved
                ? 'Planificada'
                : display.isRecommended
                  ? 'Sugerida'
                  : 'Pendiente'
            return (
              <div
                key={String(slot.id || slot.meal_type) + '-' + String(slot.order_index || '')}
                className="relative group"
              >
                <Button
                  type="button"
                  variant={hasDisplay ? (display.isCompleted ? "secondary" : "outline") : "outline"}
                  className={`w-full justify-start h-auto text-[10px] md:text-xs touch-manipulation ${
                    hasDisplay
                      ? `overflow-hidden rounded-2xl border p-0 shadow-sm hover:shadow-md ${display.isCompleted ? 'border-teal-200' : display.isRecommended ? 'border-amber-100' : 'border-orange-100'}`
                      : 'min-h-[56px] p-3'
                  }`}
                  onClick={() => handleSelectMeal(selectedDay, slot)}
                  disabled={saving}
                >
                  {hasDisplay ? (
                    <div className="w-full text-left bg-white">
                      <div className="relative h-36 overflow-hidden">
                        <img
                          src={display.imageSrc}
                          alt={display.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => { ;(e.target as HTMLImageElement).src = '/placeholder.jpg' }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent" />
                        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 shadow-sm">{mealLabel}</span>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-bold shadow ${
                            display.isCompleted
                              ? 'bg-teal-500 text-white'
                              : display.isRecommended
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-white/90 text-gray-700'
                          }`}>
                            {statusLabel}
                          </span>
                        </div>
                        <div className="absolute bottom-3 left-3 right-3">
                          <h4 className="line-clamp-2 text-base font-black leading-tight text-white drop-shadow">{display.name}</h4>
                          <div className="mt-1.5 flex items-center gap-2 text-[10px] font-semibold text-white/90">
                            <span>{slot.icon || getSlotIcon(slot.meal_type)}</span>
                            {mealTime && <span>{mealTime}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 p-2">
                        <span className="rounded-xl border border-orange-100/80 bg-orange-50/60 px-1.5 py-1.5 text-center">
                          <span className="block text-[11px] font-black text-orange-600">{display.calories}</span>
                          <span className="block text-[8px] font-semibold text-orange-400">kcal</span>
                        </span>
                        <span className="rounded-xl border border-blue-100 bg-blue-50 px-1.5 py-1.5 text-center">
                          <span className="block text-[11px] font-black text-blue-700">{formatMacro(display.protein)}g</span>
                          <span className="block text-[8px] font-semibold text-blue-500">prot</span>
                        </span>
                        <span className="rounded-xl border border-emerald-100/80 bg-emerald-50/60 px-1.5 py-1.5 text-center">
                          <span className="block text-[11px] font-black text-emerald-600">{formatMacro(display.carbs)}g</span>
                          <span className="block text-[8px] font-semibold text-emerald-400">carb</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 px-2 pb-2 text-[10px] font-bold">
                        <span className="flex items-center justify-center gap-1 rounded-xl bg-orange-50/60 px-2 py-2 text-orange-600">
                          <BookOpen className="h-3 w-3" />Receta
                        </span>
                        <span className="flex items-center justify-center gap-1 rounded-xl bg-gray-50 px-2 py-2 text-gray-600">
                          <RefreshCw className="h-3 w-3" />Cambiar
                        </span>
                      </div>
                      <button
                        type="button"
                        className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full shadow transition-colors ${
                          display.isCompleted ? 'bg-teal-500 text-white' : 'bg-white/90 text-gray-600'
                        }`}
                        onClick={(e) => { e.stopPropagation(); handleToggleCompleted(selectedDay, slot) }}
                        disabled={saving}
                        title={display.isCompleted ? "Marcar como no completada" : "Marcar como completada"}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 w-full text-left">
                      <span className="text-xl flex-shrink-0">{slot.icon || getSlotIcon(slot.meal_type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{mealLabel}</div>
                        {mealTime && <div className="text-xs text-muted-foreground">{mealTime}</div>}
                      </div>
                      <ChefHat className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  )}
                </Button>
              </div>
            )
          })}
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Selecciona un día en el calendario para planificar tus comidas
                </CardContent>
              </Card>
            )}
          </div>
        </>
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
