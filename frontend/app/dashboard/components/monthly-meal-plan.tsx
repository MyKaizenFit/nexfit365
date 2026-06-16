"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChefHat,
  Check,
  Clock,
  Loader2,
  Copy,
  ArrowRight,
  CalendarDays,
  MoreVertical,
  X,
  CopyCheck,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/hooks/use-toast"
import { MealIngredientSubstitution, nutritionService } from "@/lib/nutrition-service"
import { MealSelectionModal } from "@/components/dashboard/meal-selection-modal"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday,
  isPast,
  addMonths,
  subMonths,
  getISOWeek,
  startOfWeek,
  addDays,
} from "date-fns"
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
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
}

type CopyMode = {
  type: "day" | "week"
  sourceDate: string
} | null

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Devuelve las 7 fechas (YYYY-MM-DD) de la semana que contiene startDate. */
function weekDates(startDate: string): string[] {
  const d = new Date(startDate + "T00:00:00")
  const mon = startOfWeek(d, { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => format(addDays(mon, i), "yyyy-MM-dd"))
}

/** Normaliza una fecha string a YYYY-MM-DD asegurando zona horaria local. */
function toLocalDateStr(d: Date): string {
  return format(d, "yyyy-MM-dd")
}

// ──────────────────────────────────────────────────────────────────────────────

export function MonthlyMealPlan() {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(new Date()))
  const [monthlySelections, setMonthlySelections] = useState<Record<string, MonthlyMealSelection[]>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedMeal, setSelectedMeal] = useState<{ date: string; meal_type: string } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [mealOptions, setMealOptions] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar")

  // ── copy mode ──
  const [copyMode, setCopyMode] = useState<CopyMode>(null)
  // Cache de selecciones de otros meses (para copias cross-month)
  const [remoteSelections, setRemoteSelections] = useState<Record<string, MonthlyMealSelection[]>>({})

  // ── navigation ──────────────────────────────────────────────────────────────

  const getMonthDays = useCallback(() => {
    return eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  }, [currentMonth])

  const loadMonthlySelections = useCallback(async () => {
    setLoading(true)
    try {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth() + 1
      const selections = await nutritionService.getMonthlyMealSelections(year, month)
      setMonthlySelections(selections)
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar las selecciones del mes", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [currentMonth])

  useEffect(() => {
    loadMonthlySelections()
  }, [loadMonthlySelections])

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const goToCurrentMonth = () => setCurrentMonth(startOfMonth(new Date()))

  // ── meal selection ──────────────────────────────────────────────────────────

  const handleSelectMeal = async (date: string, mealType: string) => {
    setSelectedDay(date)
    setSelectedMeal({ date, meal_type: mealType })
    try {
      const response = await authenticatedFetch(`nutrition/plan-meals-for-selection/?meal_type=${mealType}`, {
        method: "GET",
      })
      if (response.ok) {
        const data = await response.json()
        const mealTypeKey =
          mealType === "breakfast"
            ? "breakfast"
            : mealType === "lunch"
              ? "lunch"
              : mealType === "dinner"
                ? "dinner"
                : mealType === "morning_snack"
                  ? "morning_snack"
                  : "afternoon_snack"
        setMealOptions(data.meals_by_type?.[mealTypeKey] || [])
        setIsModalOpen(true)
      }
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar las opciones de comida", variant: "destructive" })
    }
  }

  const handleSaveSelection = async (option: any) => {
    if (!selectedMeal) return
    setSaving(true)
    try {
      const recipeId = option?.recipeId
        ? String(option.recipeId)
        : typeof option?.id === "string" && option.id.startsWith("recipe-")
          ? option.id.replace(/^recipe-/, "")
          : option?.id
            ? String(option.id)
            : undefined
      const selections = [
        {
          date: selectedMeal.date,
          meal_type: selectedMeal.meal_type,
          recipe_id: recipeId,
          calories: option.calories || 0,
          protein: option.protein || 0,
          carbs: option.carbs || 0,
          fat: option.fat || 0,
          custom_description: option.customDescription || option.name || "",
          substitution_details: option.substitution_details || [],
          completed: false,
        },
      ]
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth() + 1
      await nutritionService.saveMonthlyMealSelections(year, month, selections)
      toast({
        title: "✅ Comida seleccionada",
        description: `${option.name} guardada para ${format(new Date(selectedMeal.date + "T00:00:00"), "EEEE d", { locale: es })}`,
      })
      setIsModalOpen(false)
      setSelectedMeal(null)
      await loadMonthlySelections()
    } catch {
      toast({ title: "Error", description: "No se pudo guardar la selección", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // ── copy helpers ────────────────────────────────────────────────────────────

  /** Construye la lista de selecciones para guardar a partir de un origen de un día. */
  const buildDaySelections = (sourceDateStr: string, targetDateStr: string): any[] => {
    const src = monthlySelections[sourceDateStr] || remoteSelections[sourceDateStr] || []
    return src.map((s) => ({
      date: targetDateStr,
      meal_type: s.meal_type,
      recipe_id: s.recipe?.id || (s as any).recipe_id,
      calories: s.recipe?.calories || s.calories || 0,
      protein: s.recipe?.protein || s.protein || 0,
      carbs: s.recipe?.carbs || s.carbs || 0,
      fat: s.recipe?.fat || s.fat || 0,
      custom_description: s.custom_description || s.recipe?.name || s.recipe_name || "",
      substitution_details: s.substitution_details || [],
      completed: false,
    }))
  }

  /** Guarda selecciones; detecta cambios de mes automáticamente. */
  const saveSelections = async (selectionsToSave: any[]) => {
    if (!selectionsToSave.length) return
    // Agrupar por mes para respetar la API
    const byMonth: Record<string, any[]> = {}
    for (const sel of selectionsToSave) {
      const d = new Date(sel.date + "T00:00:00")
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`
      if (!byMonth[key]) byMonth[key] = []
      byMonth[key].push(sel)
    }
    for (const [key, sels] of Object.entries(byMonth)) {
      const [y, m] = key.split("-").map(Number)
      await nutritionService.saveMonthlyMealSelections(y, m, sels)
    }
  }

  /** Carga selecciones de otro mes si aún no están en cache. */
  const ensureRemoteMonth = async (year: number, month: number) => {
    const key = `${year}-${month}`
    if ((remoteSelections as any)[key + "_loaded"]) return
    try {
      const data = await nutritionService.getMonthlyMealSelections(year, month)
      setRemoteSelections((prev) => ({ ...prev, ...data, [key + "_loaded"]: [] as any }))
    } catch {
      // silencioso
    }
  }

  // ── copy mode UI ────────────────────────────────────────────────────────────

  const startCopyMode = (date: string, type: "day" | "week") => {
    setCopyMode({ type, sourceDate: date })
    toast({
      title: type === "day" ? "📋 Modo copia: día" : "📅 Modo copia: semana",
      description:
        type === "day"
          ? "Selecciona el día destino en el calendario (puedes navegar a otro mes)"
          : "Selecciona el primer día de la semana destino (puedes navegar a otro mes)",
    })
  }

  const cancelCopyMode = () => {
    setCopyMode(null)
  }

  const handleCopyTarget = async (targetDate: string) => {
    if (!copyMode) return
    setSaving(true)
    try {
      const src = copyMode.sourceDate
      const srcDate = new Date(src + "T00:00:00")
      // Asegurar que tenemos las selecciones del mes origen si es otro mes
      if (
        srcDate.getFullYear() !== currentMonth.getFullYear() ||
        srcDate.getMonth() !== currentMonth.getMonth()
      ) {
        await ensureRemoteMonth(srcDate.getFullYear(), srcDate.getMonth() + 1)
      }

      if (copyMode.type === "day") {
        const selToSave = buildDaySelections(src, targetDate)
        if (!selToSave.length) {
          toast({
            title: "Día vacío",
            description: "El día origen no tiene comidas planificadas.",
            variant: "destructive",
          })
          setSaving(false)
          return
        }
        await saveSelections(selToSave)
        toast({
          title: "✅ Día copiado",
          description: `Comidas del ${format(srcDate, "d MMM yyyy", { locale: es })} → ${format(new Date(targetDate + "T00:00:00"), "d MMM yyyy", { locale: es })}`,
        })
      } else {
        // Semana: calcular los 7 días de la semana origen y mapear a la semana destino
        const srcWeek = weekDates(src)
        const dstWeek = weekDates(targetDate)
        const allSels: any[] = []
        let totalSrc = 0
        for (let i = 0; i < 7; i++) {
          const daySels = buildDaySelections(srcWeek[i], dstWeek[i])
          totalSrc += (monthlySelections[srcWeek[i]] || remoteSelections[srcWeek[i]] || []).length
          allSels.push(...daySels)
        }
        if (!allSels.length && totalSrc === 0) {
          toast({
            title: "Semana vacía",
            description: "La semana origen no tiene comidas planificadas.",
            variant: "destructive",
          })
          setSaving(false)
          return
        }
        if (allSels.length > 0) {
          await saveSelections(allSels)
        }
        const srcLabel = format(new Date(srcWeek[0] + "T00:00:00"), "d MMM", { locale: es })
        const dstLabel = format(new Date(dstWeek[0] + "T00:00:00"), "d MMM yyyy", { locale: es })
        toast({ title: "✅ Semana copiada", description: `Semana del ${srcLabel} → semana del ${dstLabel}` })
      }

      setCopyMode(null)
      await loadMonthlySelections()
    } catch {
      toast({ title: "Error", description: "No se pudo copiar", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // ── apply to month ──────────────────────────────────────────────────────────

  const handleApplyToMonth = async (sourceDate: string) => {
    setSaving(true)
    try {
      const sourceSelections = monthlySelections[sourceDate] || []
      if (!sourceSelections.length) {
        toast({ title: "Sin selecciones", description: "El día no tiene comidas planificadas.", variant: "destructive" })
        return
      }
      const selectionsToSave: any[] = []
      getMonthDays().forEach((day) => {
        const targetDateStr = toLocalDateStr(day)
        if (targetDateStr === sourceDate) return
        selectionsToSave.push(...buildDaySelections(sourceDate, targetDateStr))
      })
      if (selectionsToSave.length > 0) {
        await saveSelections(selectionsToSave)
        toast({
          title: "✅ Aplicado a todo el mes",
          description: `Comidas del ${format(new Date(sourceDate + "T00:00:00"), "EEEE d", { locale: es })} aplicadas a todo el mes`,
        })
        await loadMonthlySelections()
      }
    } catch {
      toast({ title: "Error", description: "No se pudo aplicar a todo el mes", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // ── display helpers ─────────────────────────────────────────────────────────

  const getSelectionForMeal = (dateStr: string, mealType: string): any | null => {
    const daySelections = monthlySelections[dateStr] || []
    return daySelections.find((s: any) => typeof s === "object" && s?.meal_type === mealType) || null
  }

  const getMealName = (selection: any | null): string => {
    if (!selection) return "Sin nombre"
    if (selection.recipe?.name?.trim()) return selection.recipe.name
    if (selection.recipe_name?.trim()) return selection.recipe_name
    if (selection.custom_description?.trim()) return selection.custom_description
    const mealTypeNames: Record<string, string> = {
      breakfast: "Desayuno",
      morning_snack: "Snack Mañana",
      lunch: "Almuerzo",
      afternoon_snack: "Snack Tarde",
      dinner: "Cena",
    }
    return `${mealTypeNames[selection.meal_type] || "Comida"} - Seleccionada`
  }

  // ── calendar layout ─────────────────────────────────────────────────────────

  const monthDays = getMonthDays()
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const firstDayOfWeek = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1
  const calendarDays: (Date | null)[] = []
  for (let i = 0; i < firstDayOfWeek; i++) {
    const prevDay = new Date(monthStart)
    prevDay.setDate(prevDay.getDate() - (firstDayOfWeek - i))
    calendarDays.push(prevDay)
  }
  monthDays.forEach((day) => calendarDays.push(day))
  const remaining = 7 - (calendarDays.length % 7)
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const nextDay = new Date(monthEnd)
      nextDay.setDate(nextDay.getDate() + i)
      calendarDays.push(nextDay)
    }
  }
  const weeks: (Date | null)[][] = []
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7))
  }

  // Semana origen en copy-week mode
  const sourceCopyWeekDates =
    copyMode?.type === "week" ? new Set(weekDates(copyMode.sourceDate)) : new Set<string>()

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
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
            <p className="text-base md:text-lg font-semibold capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: es })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Banner de modo copia */}
      {copyMode && (
        <Card className="border-2 border-blue-400 bg-blue-50">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-blue-800">
                <CopyCheck className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">
                    {copyMode.type === "day" ? "Copia de día activa" : "Copia de semana activa"}
                  </p>
                  <p className="text-xs text-blue-600">
                    Origen:{" "}
                    <strong>
                      {format(new Date(copyMode.sourceDate + "T00:00:00"), "EEEE d MMM yyyy", { locale: es })}
                    </strong>
                    {copyMode.type === "week" && " (semana completa)"}
                    {" · "}Puedes navegar a otro mes y elegir el destino
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={cancelCopyMode}
                className="border-blue-400 text-blue-700 hover:bg-blue-100 h-8 flex-shrink-0"
              >
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendario */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : (
        <div className="space-y-2 md:space-y-4">
          {/* Encabezados días */}
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
              <div key={d} className="text-center text-xs md:text-sm font-medium text-muted-foreground py-1 md:py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Semanas */}
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible">
            <div className="inline-block min-w-full md:block">
              {weeks.map((week, weekIndex) => (
                <div
                  key={weekIndex}
                  className="grid grid-cols-7 gap-1 md:gap-2 min-w-[700px] md:min-w-0 mb-1 md:mb-2"
                >
                  {week.map((day, dayIndex) => {
                    if (!day) return <div key={dayIndex} className="min-h-[120px]" />

                    const dateStr = toLocalDateStr(day)
                    const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
                    const isCurrentDay = isToday(day)
                    const daySelections = monthlySelections[dateStr] || []
                    const hasSelections = daySelections.length > 0
                    const isPastDay = isPast(day) && !isCurrentDay

                    // Copy mode styles
                    const isSource = copyMode?.sourceDate === dateStr
                    const isSourceWeekDay = copyMode?.type === "week" && sourceCopyWeekDates.has(dateStr)
                    const isCopyTarget = copyMode && isCurrentMonth && !isSource && !isSourceWeekDay

                    return (
                      <Card
                        key={dateStr}
                        className={[
                          "min-h-[100px] md:min-h-[120px] transition-all",
                          !isCurrentMonth ? "opacity-40" : "",
                          isCurrentDay ? "ring-2 ring-teal-500" : "",
                          isPastDay ? "bg-muted" : "",
                          isSource || isSourceWeekDay
                            ? "ring-2 ring-blue-500 bg-blue-50"
                            : "",
                          isCopyTarget
                            ? "cursor-pointer hover:ring-2 hover:ring-blue-300 hover:bg-blue-50/60"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => {
                          if (copyMode && isCurrentMonth && !isSource && !isSourceWeekDay) {
                            handleCopyTarget(dateStr)
                          }
                        }}
                      >
                        <CardHeader className="pb-1 md:pb-2 p-1.5 md:p-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-xs md:text-sm font-medium">
                                {format(day, "d")}
                              </CardTitle>
                              {isCurrentDay && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] md:text-[10px] mt-0.5 md:mt-1 px-1 py-0"
                                >
                                  Hoy
                                </Badge>
                              )}
                              {(isSource || isSourceWeekDay) && (
                                <Badge className="text-[9px] mt-0.5 px-1 py-0 bg-blue-500 text-white">
                                  Origen
                                </Badge>
                              )}
                              {isCopyTarget && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] mt-0.5 px-1 py-0 border-blue-400 text-blue-600"
                                >
                                  ← Clic para pegar
                                </Badge>
                              )}
                            </div>

                            {/* Menú de acciones (solo días del mes actual) */}
                            {isCurrentMonth && !copyMode && (
                              <div className="flex items-center gap-0.5">
                                {hasSelections && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 md:h-5 md:w-5 touch-manipulation"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleApplyToMonth(dateStr)
                                    }}
                                    disabled={saving}
                                    title="Aplicar a todo el mes"
                                  >
                                    <ArrowRight className="h-3 w-3" />
                                  </Button>
                                )}

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 md:h-5 md:w-5 touch-manipulation"
                                      onClick={(e) => e.stopPropagation()}
                                      disabled={saving}
                                    >
                                      <MoreVertical className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="z-50">
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        startCopyMode(dateStr, "day")
                                      }}
                                      disabled={!hasSelections}
                                    >
                                      <Copy className="h-4 w-4 mr-2" />
                                      Copiar día
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        startCopyMode(dateStr, "week")
                                      }}
                                      disabled={!hasSelections}
                                    >
                                      <Calendar className="h-4 w-4 mr-2" />
                                      Copiar semana completa
                                    </DropdownMenuItem>
                                    {hasSelections && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleApplyToMonth(dateStr)
                                          }}
                                        >
                                          <ArrowRight className="h-4 w-4 mr-2" />
                                          Aplicar a todo el mes
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                          </div>
                        </CardHeader>

                        <CardContent className="p-1.5 md:p-2 space-y-0.5 md:space-y-1">
                          {/* En modo copia mostrar resumen simplificado */}
                          {copyMode && isCurrentMonth ? (
                            <div className="text-center py-2">
                              {hasSelections ? (
                                <p className="text-[9px] text-muted-foreground">
                                  {daySelections.length} comida{daySelections.length !== 1 ? "s" : ""}
                                </p>
                              ) : (
                                <p className="text-[9px] text-muted-foreground italic">Vacío</p>
                              )}
                            </div>
                          ) : (
                            isCurrentMonth &&
                            MEAL_TYPES.map((meal) => {
                              const selection = getSelectionForMeal(dateStr, meal.type)
                              const isCompleted = selection?.completed === true
                              const hasSelection = !!selection

                              return (
                                <div key={meal.type} className="relative group">
                                  <Button
                                    variant={hasSelection ? (isCompleted ? "secondary" : "outline") : "outline"}
                                    className={[
                                      "w-full justify-start h-auto p-1 md:p-1.5 text-[8px] md:text-[9px] touch-manipulation",
                                      hasSelection && !isCompleted
                                        ? "border-blue-300 bg-blue-50 hover:bg-blue-100 active:bg-blue-200"
                                        : "",
                                      hasSelection
                                        ? "min-h-[70px] md:min-h-[85px]"
                                        : "min-h-[32px] md:min-h-[40px]",
                                    ]
                                      .filter(Boolean)
                                      .join(" ")}
                                    onClick={() => handleSelectMeal(dateStr, meal.type)}
                                    disabled={saving || !isCurrentMonth}
                                  >
                                    <div className="flex flex-col gap-0.5 md:gap-1 w-full text-left">
                                      <div className="flex items-center gap-0.5 md:gap-1">
                                        <span className="text-[10px] md:text-[11px] flex-shrink-0">{meal.icon}</span>
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-[8px] md:text-[9px] leading-tight truncate">
                                            {meal.name}
                                          </div>
                                          {!hasSelection && (
                                            <div className="text-[6px] md:text-[7px] text-muted-foreground">
                                              {meal.time}
                                            </div>
                                          )}
                                        </div>
                                        {hasSelection && (
                                          <Check
                                            className={`h-2 w-2 md:h-2.5 md:w-2.5 flex-shrink-0 ${isCompleted ? "text-teal-600" : "text-blue-500"}`}
                                          />
                                        )}
                                      </div>

                                      {hasSelection && (
                                        <div className="mt-0.5 pt-0.5 md:pt-1 border-t border-border/60 space-y-0.5 md:space-y-1">
                                          <div className="text-[8px] md:text-[9px] font-semibold text-foreground leading-tight break-words line-clamp-2">
                                            {getMealName(selection)}
                                          </div>
                                          <div className="flex items-center gap-0.5 md:gap-1">
                                            {!isCompleted && (
                                              <Badge
                                                variant="outline"
                                                className="text-[6px] md:text-[7px] px-0.5 md:px-1 py-0 h-2.5 md:h-3 border-blue-300 text-blue-600 bg-blue-50"
                                              >
                                                📋
                                              </Badge>
                                            )}
                                            {isCompleted && (
                                              <Badge
                                                variant="outline"
                                                className="text-[6px] md:text-[7px] px-0.5 md:px-1 py-0 h-2.5 md:h-3 border-teal-300 text-teal-600 bg-teal-50"
                                              >
                                                ✅
                                              </Badge>
                                            )}
                                            {selection.substitution_details?.length ? (
                                              <Badge
                                                variant="outline"
                                                className="text-[6px] md:text-[7px] px-0.5 md:px-1 py-0 h-2.5 md:h-3 border-emerald-300 text-emerald-700 bg-emerald-50"
                                              >
                                                Cambio
                                              </Badge>
                                            ) : null}
                                          </div>
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
                                </div>
                              )
                            })
                          )}
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
          mealName={MEAL_TYPES.find((m) => m.type === selectedMeal.meal_type)?.name || ""}
          mealTime={MEAL_TYPES.find((m) => m.type === selectedMeal.meal_type)?.time || ""}
          mealType={selectedMeal.meal_type}
          options={mealOptions}
          onSelectOption={handleSaveSelection}
        />
      )}
    </div>
  )
}
