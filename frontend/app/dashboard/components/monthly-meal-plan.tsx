"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  Loader2,
  Copy,
  ArrowRight,
  CalendarDays,
  MoreVertical,
  X,
  CopyCheck,
  ClipboardPaste,
  ChevronDown,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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
  startOfWeek,
  addDays,
} from "date-fns"
import { es } from "date-fns/locale"
import { authenticatedFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

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

type MealClipboard = {
  type: "day" | "week"
  sourceDate: string
  /** Snapshot de comidas copiadas (independiente del mes visible). */
  sourceDays: Record<string, MonthlyMealSelection[]>
}

function weekDates(startDate: string): string[] {
  const d = new Date(startDate + "T00:00:00")
  const mon = startOfWeek(d, { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => format(addDays(mon, i), "yyyy-MM-dd"))
}

function weekKey(startDate: string): string {
  return weekDates(startDate)[0]
}

function toLocalDateStr(d: Date): string {
  return format(d, "yyyy-MM-dd")
}

function formatWeekRange(anchorDate: string): string {
  const days = weekDates(anchorDate)
  const start = new Date(days[0] + "T00:00:00")
  const end = new Date(days[6] + "T00:00:00")
  return `${format(start, "d MMM", { locale: es })} – ${format(end, "d MMM yyyy", { locale: es })}`
}

export function MonthlyMealPlan() {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(new Date()))
  const [monthlySelections, setMonthlySelections] = useState<Record<string, MonthlyMealSelection[]>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedMeal, setSelectedMeal] = useState<{ date: string; meal_type: string } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [mealOptions, setMealOptions] = useState<any[]>([])
  const [remoteSelections, setRemoteSelections] = useState<Record<string, MonthlyMealSelection[]>>({})

  const [clipboard, setClipboard] = useState<MealClipboard | null>(null)
  const [selectedPasteWeeks, setSelectedPasteWeeks] = useState<Set<string>>(new Set())
  const [showCopyTools, setShowCopyTools] = useState(false)

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

  const getSelectionsForDate = useCallback((dateStr: string): MonthlyMealSelection[] => {
    return monthlySelections[dateStr] || remoteSelections[dateStr] || []
  }, [monthlySelections, remoteSelections])

  const weekHasMeals = useCallback((anchorDate: string): boolean => {
    return weekDates(anchorDate).some((dateStr) => getSelectionsForDate(dateStr).length > 0)
  }, [getSelectionsForDate])

  const handleSelectMeal = async (date: string, mealType: string) => {
    if (clipboard) return
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

  const buildDaySelectionsFromSnapshot = (
    sourceDays: Record<string, MonthlyMealSelection[]>,
    sourceDateStr: string,
    targetDateStr: string,
  ): any[] => {
    const src = sourceDays[sourceDateStr] || []
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

  const saveSelections = async (selectionsToSave: any[]) => {
    if (!selectionsToSave.length) return
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

  const snapshotDays = (type: "day" | "week", anchorDate: string): Record<string, MonthlyMealSelection[]> => {
    const dates = type === "day" ? [anchorDate] : weekDates(anchorDate)
    return Object.fromEntries(
      dates.map((dateStr) => [dateStr, [...getSelectionsForDate(dateStr)]]),
    )
  }

  const copyToClipboard = (date: string, type: "day" | "week") => {
    const sourceDays = snapshotDays(type, date)
    const hasContent = Object.values(sourceDays).some((items) => items.length > 0)
    if (!hasContent) {
      toast({
        title: type === "day" ? "Día vacío" : "Semana vacía",
        description: "No hay comidas planificadas para copiar.",
        variant: "destructive",
      })
      return
    }

    setClipboard({ type, sourceDate: date, sourceDays })
    setSelectedPasteWeeks(new Set())
    setShowCopyTools(true)

    const sourceLabel = type === "day"
      ? format(new Date(date + "T00:00:00"), "EEEE d MMM yyyy", { locale: es })
      : formatWeekRange(date)

    toast({
      title: type === "day" ? "📋 Día copiado" : "📅 Semana copiada",
      description: `${sourceLabel} · Elige destino y pulsa Pegar`,
    })
  }

  const clearClipboard = () => {
    setClipboard(null)
    setSelectedPasteWeeks(new Set())
  }

  const pasteDay = async (targetDate: string) => {
    if (!clipboard || clipboard.type !== "day") return
    if (targetDate === clipboard.sourceDate) {
      toast({ title: "Mismo día", description: "Elige un día distinto al origen.", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const selToSave = buildDaySelectionsFromSnapshot(clipboard.sourceDays, clipboard.sourceDate, targetDate)
      if (!selToSave.length) {
        toast({ title: "Sin contenido", description: "No hay comidas para pegar.", variant: "destructive" })
        return
      }
      await saveSelections(selToSave)
      toast({
        title: "✅ Día pegado",
        description: `${format(new Date(clipboard.sourceDate + "T00:00:00"), "d MMM", { locale: es })} → ${format(new Date(targetDate + "T00:00:00"), "d MMM yyyy", { locale: es })}`,
      })
      await loadMonthlySelections()
    } catch {
      toast({ title: "Error", description: "No se pudo pegar el día", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const pasteWeek = async (targetAnchorDate: string) => {
    if (!clipboard || clipboard.type !== "week") return

    const sourceWeekKey = weekKey(clipboard.sourceDate)
    const targetWeekKey = weekKey(targetAnchorDate)
    if (sourceWeekKey === targetWeekKey) {
      toast({ title: "Misma semana", description: "Elige una semana distinta al origen.", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const srcWeek = weekDates(clipboard.sourceDate)
      const dstWeek = weekDates(targetAnchorDate)
      const allSels: any[] = []
      for (let i = 0; i < 7; i++) {
        allSels.push(...buildDaySelectionsFromSnapshot(clipboard.sourceDays, srcWeek[i], dstWeek[i]))
      }
      if (!allSels.length) {
        toast({ title: "Semana vacía", description: "No hay comidas para pegar.", variant: "destructive" })
        return
      }
      await saveSelections(allSels)
      toast({
        title: "✅ Semana pegada",
        description: `${formatWeekRange(clipboard.sourceDate)} → ${formatWeekRange(targetAnchorDate)}`,
      })
      await loadMonthlySelections()
    } catch {
      toast({ title: "Error", description: "No se pudo pegar la semana", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const pasteWeekToMany = async () => {
    if (!clipboard || clipboard.type !== "week" || selectedPasteWeeks.size === 0) return

    setSaving(true)
    try {
      const srcWeek = weekDates(clipboard.sourceDate)
      const allSels: any[] = []
      for (const targetKey of selectedPasteWeeks) {
        const dstWeek = weekDates(targetKey)
        if (weekKey(clipboard.sourceDate) === targetKey) continue
        for (let i = 0; i < 7; i++) {
          allSels.push(...buildDaySelectionsFromSnapshot(clipboard.sourceDays, srcWeek[i], dstWeek[i]))
        }
      }
      if (!allSels.length) {
        toast({ title: "Sin destinos válidos", description: "Selecciona al menos una semana distinta al origen.", variant: "destructive" })
        return
      }
      await saveSelections(allSels)
      toast({
        title: "✅ Semanas pegadas",
        description: `Copiado en ${selectedPasteWeeks.size} semana${selectedPasteWeeks.size === 1 ? "" : "s"}.`,
      })
      setSelectedPasteWeeks(new Set())
      await loadMonthlySelections()
    } catch {
      toast({ title: "Error", description: "No se pudieron pegar las semanas", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleApplyToMonth = async (sourceDate: string) => {
    if (!confirm(
      "¿Aplicar este día a TODO el mes?\n\nEsto sobrescribirá las comidas de los demás días del mes. Para copiar solo a días concretos, usa Copiar / Pegar.",
    )) {
      return
    }

    setSaving(true)
    try {
      const sourceSelections = getSelectionsForDate(sourceDate)
      if (!sourceSelections.length) {
        toast({ title: "Sin selecciones", description: "El día no tiene comidas planificadas.", variant: "destructive" })
        return
      }
      const snapshot = { [sourceDate]: sourceSelections }
      const selectionsToSave: any[] = []
      getMonthDays().forEach((day) => {
        const targetDateStr = toLocalDateStr(day)
        if (targetDateStr === sourceDate) return
        selectionsToSave.push(...buildDaySelectionsFromSnapshot(snapshot, sourceDate, targetDateStr))
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

  const getSelectionForMeal = (dateStr: string, mealType: string): any | null => {
    const daySelections = getSelectionsForDate(dateStr)
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

  const monthDays = getMonthDays()
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const firstDayOfWeek = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1
  const calendarDays: Date[] = []
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

  const weeks: Date[][] = []
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7))
  }

  const visibleWeekKeys = weeks.map((week) => weekKey(toLocalDateStr(week[0])))
  const sourceWeekKeySet = clipboard?.type === "week"
    ? new Set(weekDates(clipboard.sourceDate))
    : new Set<string>()
  const clipboardSourceWeekKey = clipboard?.type === "week" ? weekKey(clipboard.sourceDate) : null

  const togglePasteWeek = (key: string) => {
    if (clipboardSourceWeekKey && key === clipboardSourceWeekKey) return
    setSelectedPasteWeeks((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const clipboardSummary = clipboard
    ? clipboard.type === "day"
      ? format(new Date(clipboard.sourceDate + "T00:00:00"), "EEEE d MMM yyyy", { locale: es })
      : formatWeekRange(clipboard.sourceDate)
    : ""

  return (
    <div className="space-y-6">
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
              <Button variant="outline" size="sm" onClick={goToPreviousMonth} disabled={loading} className="h-8 md:h-9">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToCurrentMonth} disabled={loading} className="h-8 md:h-9 text-xs md:text-sm">
                Hoy
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextMonth} disabled={loading} className="h-8 md:h-9">
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

      <Collapsible open={showCopyTools || !!clipboard} onOpenChange={setShowCopyTools}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg border bg-slate-50 px-3 py-2.5 text-left text-sm font-medium hover:bg-slate-100 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Copy className="h-4 w-4 text-teal-700" />
              Copiar y pegar comidas
            </span>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", (showCopyTools || clipboard) && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <Card className={cn("border", clipboard ? "border-blue-400 bg-blue-50/60" : "bg-slate-50")}>
            <CardContent className="py-3 px-4 space-y-3">
              {clipboard ? (
                <>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-2 text-blue-900">
                      <CopyCheck className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">
                          Portapapeles: {clipboard.type === "day" ? "Día" : "Semana"}
                        </p>
                        <p className="text-xs text-blue-700">{clipboardSummary}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {clipboard.type === "day"
                            ? "Pulsa «Pegar día» en el destino. Puedes cambiar de mes antes de pegar."
                            : "Marca semanas destino abajo o pulsa «Pegar semana» en cada fila."}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={clearClipboard} className="h-8 flex-shrink-0">
                      <X className="h-4 w-4 mr-1" />
                      Vaciar
                    </Button>
                  </div>

                  {clipboard.type === "week" && (
                    <div className="space-y-2 rounded-lg border bg-white/80 p-3">
                      <p className="text-xs font-medium">Pegar en varias semanas del calendario visible</p>
                      <div className="flex flex-wrap gap-2">
                        {visibleWeekKeys.map((key, index) => {
                          const isSource = key === clipboardSourceWeekKey
                          const isSelected = selectedPasteWeeks.has(key)
                          return (
                            <Button
                              key={key}
                              type="button"
                              size="sm"
                              variant={isSelected ? "default" : "outline"}
                              className="h-8"
                              disabled={isSource || saving}
                              onClick={() => togglePasteWeek(key)}
                            >
                              {isSelected ? <Check className="mr-1 h-3.5 w-3.5" /> : null}
                              Sem. {index + 1}
                            </Button>
                          )
                        })}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={selectedPasteWeeks.size === 0 || saving}
                        onClick={() => void pasteWeekToMany()}
                      >
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ClipboardPaste className="h-3.5 w-3.5 mr-2" />}
                        Pegar en {selectedPasteWeeks.size} semana{selectedPasteWeeks.size === 1 ? "" : "s"}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Usa el menú <strong>⋮</strong> de un día para copiar un día o una semana completa.
                  Después elige el destino y pulsa <strong>Pegar</strong>.
                  «Aplicar a todo el mes» es distinto: repite un día en todo el mes.
                </p>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : (
        <div className="space-y-2 md:space-y-4">
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
              <div key={d} className="text-center text-xs md:text-sm font-medium text-muted-foreground py-1 md:py-2">
                {d}
              </div>
            ))}
          </div>

          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible">
            <div className="inline-block min-w-full md:block space-y-1 md:space-y-2">
              {weeks.map((week, weekIndex) => {
                const weekAnchor = toLocalDateStr(week[0])
                const wKey = weekKey(weekAnchor)
                const isSourceWeek = clipboard?.type === "week" && wKey === clipboardSourceWeekKey
                const canPasteWeek = clipboard?.type === "week" && !isSourceWeek

                return (
                  <div key={weekIndex} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1">
                      <span className="text-[10px] md:text-xs font-medium text-muted-foreground truncate">
                        Sem. {weekIndex + 1} · {formatWeekRange(weekAnchor)}
                      </span>
                      {canPasteWeek && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-7 text-[10px] md:text-xs flex-shrink-0"
                          disabled={saving}
                          onClick={() => void pasteWeek(weekAnchor)}
                        >
                          <ClipboardPaste className="h-3 w-3 mr-1" />
                          Pegar semana
                        </Button>
                      )}
                      {isSourceWeek && (
                        <Badge variant="outline" className="text-[10px] border-blue-400 text-blue-700">
                          Origen
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-7 gap-1 md:gap-2 min-w-[700px] md:min-w-0">
                      {week.map((day) => {
                        const dateStr = toLocalDateStr(day)
                        const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
                        const isCurrentDay = isToday(day)
                        const daySelections = getSelectionsForDate(dateStr)
                        const hasSelections = daySelections.length > 0
                        const isPastDay = isPast(day) && !isCurrentDay

                        const isSourceDay = clipboard?.type === "day" && clipboard.sourceDate === dateStr
                        const isSourceWeekDay = clipboard?.type === "week" && sourceWeekKeySet.has(dateStr)
                        const canPasteDay = clipboard?.type === "day" && !isSourceDay

                        return (
                          <Card
                            key={dateStr}
                            className={cn(
                              "min-h-[100px] md:min-h-[120px] transition-all",
                              !isCurrentMonth && "opacity-50",
                              isCurrentDay && "ring-2 ring-teal-500",
                              isPastDay && isCurrentMonth && "bg-muted",
                              (isSourceDay || isSourceWeekDay) && "ring-2 ring-blue-500 bg-blue-50",
                            )}
                          >
                            <CardHeader className="pb-1 md:pb-2 p-1.5 md:p-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <CardTitle className="text-xs md:text-sm font-medium">{format(day, "d")}</CardTitle>
                                  {isCurrentDay && (
                                    <Badge variant="outline" className="text-[9px] md:text-[10px] mt-0.5 md:mt-1 px-1 py-0">
                                      Hoy
                                    </Badge>
                                  )}
                                  {(isSourceDay || isSourceWeekDay) && (
                                    <Badge className="text-[9px] mt-0.5 px-1 py-0 bg-blue-500 text-white">Origen</Badge>
                                  )}
                                </div>

                                {isCurrentMonth && !clipboard && (
                                  <div className="flex items-center gap-0.5">
                                    {hasSelections && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 md:h-5 md:w-5 touch-manipulation"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          void handleApplyToMonth(dateStr)
                                        }}
                                        disabled={saving}
                                        title="Aplicar a todo el mes (sobrescribe el mes)"
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
                                            copyToClipboard(dateStr, "day")
                                          }}
                                          disabled={!hasSelections}
                                        >
                                          <Copy className="h-4 w-4 mr-2" />
                                          Copiar día
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            copyToClipboard(dateStr, "week")
                                          }}
                                          disabled={!weekHasMeals(dateStr)}
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
                                                void handleApplyToMonth(dateStr)
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

                            <CardContent className="p-1.5 md:p-2 space-y-1">
                              {canPasteDay && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  className="h-7 w-full text-[10px] md:text-xs"
                                  disabled={saving}
                                  onClick={() => void pasteDay(dateStr)}
                                >
                                  <ClipboardPaste className="h-3 w-3 mr-1" />
                                  Pegar día
                                </Button>
                              )}

                              {isCurrentMonth && MEAL_TYPES.map((meal) => {
                                const selection = getSelectionForMeal(dateStr, meal.type)
                                const isCompleted = selection?.completed === true
                                const hasSelection = !!selection

                                return (
                                  <div key={meal.type} className="relative group">
                                    <Button
                                      variant={hasSelection ? (isCompleted ? "secondary" : "outline") : "outline"}
                                      className={cn(
                                        "w-full justify-start h-auto p-1 md:p-1.5 text-[8px] md:text-[9px] touch-manipulation",
                                        hasSelection && !isCompleted && "border-blue-300 bg-blue-50 hover:bg-blue-100",
                                        hasSelection ? "min-h-[70px] md:min-h-[85px]" : "min-h-[32px] md:min-h-[40px]",
                                      )}
                                      onClick={() => handleSelectMeal(dateStr, meal.type)}
                                      disabled={saving || !isCurrentMonth || !!clipboard}
                                    >
                                      <div className="flex flex-col gap-0.5 md:gap-1 w-full text-left">
                                        <div className="flex items-center gap-0.5 md:gap-1">
                                          <span className="text-[10px] md:text-[11px] flex-shrink-0">{meal.icon}</span>
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium text-[8px] md:text-[9px] leading-tight truncate">
                                              {meal.name}
                                            </div>
                                            {!hasSelection && (
                                              <div className="text-[6px] md:text-[7px] text-muted-foreground">{meal.time}</div>
                                            )}
                                          </div>
                                          {hasSelection && (
                                            <Check className={cn("h-2 w-2 md:h-2.5 md:w-2.5 flex-shrink-0", isCompleted ? "text-teal-600" : "text-blue-500")} />
                                          )}
                                        </div>

                                        {hasSelection && (
                                          <div className="mt-0.5 pt-0.5 md:pt-1 border-t border-border/60 space-y-0.5 md:space-y-1">
                                            <div className="text-[8px] md:text-[9px] font-semibold text-foreground leading-tight break-words line-clamp-2">
                                              {getMealName(selection)}
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
                              })}
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

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
