"use client"

import { useCallback, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { buildApiUrl } from "@/lib/api"
import { formatInvalidIdMessage, isValidWorkoutPlanId, normalizeWorkoutPlanId } from "@/lib/admin-id-utils"
import { fixEncoding } from "@/lib/encoding-fix"
import { Loader2, Plus, Trash2, Search, Filter, ArrowUp, ArrowDown, Shield, X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Copy, ClipboardPaste } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { handle401AndRefresh } from "@/lib/fetch-with-auth"
import { getMondayOfWeek, getProgramWeekForAnchor, slotInWeekFromDayNumber, weekNumberFromDayNumber } from "@/lib/workout-plan-utils"

type DayKey = "1" | "2" | "3" | "4" | "5" | "6" | "7"

export interface Exercise {
  id: string | number
  name: string
  category?: string
  muscle_groups?: string[]
  description?: string
  substitutes?: ExerciseSubstituteItem[]
}

interface WorkoutDayDraft {
  day_number: number
  day_name: string
  is_rest_day: boolean
  notes: string
  exercises: Array<{ exercise_id: string | number; series?: number; reps?: string; weight?: string; rest_seconds?: number; notes?: string }>
}

interface ExerciseSubstituteItem {
  id: string | number
  substitute_id: string
  substitute_name: string
  category?: string
  priority: number
  notes: string
}

type TemplateClipboard =
  | { type: "day"; day: WorkoutDayDraft }
  | { type: "week"; weekNumber: number; days: WorkoutDayDraft[] }
  | null

function cloneDayDraft(day: WorkoutDayDraft, overrides: Partial<WorkoutDayDraft> = {}): WorkoutDayDraft {
  return {
    ...day,
    ...overrides,
    exercises: day.exercises.map((exercise) => ({ ...exercise })),
  }
}

const DAY_LABELS: Record<DayKey, string> = {
  "1": "Lun",
  "2": "Mar",
  "3": "Mié",
  "4": "Jue",
  "5": "Vie",
  "6": "Sáb",
  "7": "Dom",
}

const DAY_FULL_NAMES: Record<DayKey, string> = {
  "1": "Lunes",
  "2": "Martes",
  "3": "Miércoles",
  "4": "Jueves",
  "5": "Viernes",
  "6": "Sábado",
  "7": "Domingo",
}

const WEEK_DAY_KEYS: DayKey[] = ["1", "2", "3", "4", "5", "6", "7"]
const UNSAVED_CHANGES_MESSAGE = "Hay cambios sin guardar. ¿Quieres salir sin guardar?"

function createDefaultWeekDays(durationWeeks = 1): WorkoutDayDraft[] {
  const result: WorkoutDayDraft[] = []
  for (let week = 1; week <= Math.max(1, durationWeeks); week++) {
    for (const key of WEEK_DAY_KEYS) {
      const weekday = Number(key)
      const dayNumber = dayNumberFromWeekAndDay(week, weekday)
      result.push({
        day_number: dayNumber,
        day_name: durationWeeks > 1
          ? `Semana ${week} - ${DAY_FULL_NAMES[key]}`
          : `Día ${weekday} - ${DAY_FULL_NAMES[key]}`,
        is_rest_day: true,
        notes: "",
        exercises: [],
      })
    }
  }
  return result
}

function toNumber(value: unknown, fallback = 0) {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN
  return Number.isFinite(n) ? n : fallback
}

function getMonthCalendarDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  const startDate = new Date(firstDay)
  startDate.setDate(firstDay.getDate() - mondayOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index)
    return date
  })
}

function dayKeyFromDate(date: Date): DayKey {
  return String(((date.getDay() + 6) % 7) + 1) as DayKey
}

function isSameCalendarDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** day_number global a partir de semana (1-based) y día de la semana (1=Lun…7=Dom). */
function dayNumberFromWeekAndDay(week: number, weekday: number): number {
  return (week - 1) * 7 + weekday
}

export const WorkoutTemplatePlanEditor = forwardRef<
  { handleSave: () => Promise<void>; hasUnsavedChanges: () => boolean; confirmDiscardChanges: () => boolean },
  {
    planId: string
    availableExercises: Exercise[]
    onSaved: () => void | Promise<void>
    onClose: () => void
    isEmbedded?: boolean
    onDirtyChange?: (hasUnsavedChanges: boolean) => void
  }
>(function WorkoutTemplatePlanEditor(
  {
    planId,
    availableExercises,
    onSaved,
    onClose,
    isEmbedded = false,
    onDirtyChange,
  },
  ref
) {
  const { getAuthHeaders } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeDay, setActiveDay] = useState<DayKey>("1")
  const [activeWeek, setActiveWeek] = useState(1)
  const [planDurationWeeks, setPlanDurationWeeks] = useState(1)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [autosaveState, setAutosaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => new Date())
  const calendarPlanAnchorRef = useRef(getMondayOfWeek(new Date()).toISOString().slice(0, 10))
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isAutosavingRef = useRef(false)
  const [workoutClipboard, setWorkoutClipboard] = useState<TemplateClipboard>(null)
  const [showWeekCopyDialog, setShowWeekCopyDialog] = useState(false)
  const [weekCopySource, setWeekCopySource] = useState("1")
  const [weekCopyTargets, setWeekCopyTargets] = useState<string[]>(["2"])

  const [days, setDays] = useState<WorkoutDayDraft[]>(() => createDefaultWeekDays(1))

  const updateUnsavedChanges = useCallback((value: boolean) => {
    setHasUnsavedChanges(value)
    onDirtyChange?.(value)
  }, [onDirtyChange])

  const confirmDiscardChanges = useCallback(() => {
    return !hasUnsavedChanges || window.confirm(UNSAVED_CHANGES_MESSAGE)
  }, [hasUnsavedChanges])

  // Expose handleSave via ref
  useImperativeHandle(ref, () => ({
    handleSave: async () => {
      // handleSave defined below
      await handleSaveImpl()
    },
    hasUnsavedChanges: () => hasUnsavedChanges,
    confirmDiscardChanges,
  }))

  // selector ejercicios
  const [showExerciseSelector, setShowExerciseSelector] = useState(false)
  const [exerciseSearch, setExerciseSearch] = useState("")
  const [exerciseCategoryFilter, setExerciseCategoryFilter] = useState("all")
  const [exerciseMuscleFilter, setExerciseMuscleFilter] = useState("all")
  const [targetDayIndex, setTargetDayIndex] = useState<number | null>(null)
  const [exercisePickerMode, setExercisePickerMode] = useState<"add" | "replace">("add")
  const [replaceExerciseTarget, setReplaceExerciseTarget] = useState<{
    dayNum: number
    exerciseId: string | number
    exerciseIndex: number
  } | null>(null)

  const [showSubstitutesDialog, setShowSubstitutesDialog] = useState(false)
  const [substitutesExerciseId, setSubstitutesExerciseId] = useState<string | null>(null)
  const [substitutesExerciseName, setSubstitutesExerciseName] = useState("")
  const [substitutes, setSubstitutes] = useState<ExerciseSubstituteItem[]>([])
  const [substituteSearch, setSubstituteSearch] = useState("")
  const [loadingSubstitutes, setLoadingSubstitutes] = useState(false)

  const exercisesById = useMemo(() => {
    const map = new Map<string, Exercise>()
    for (const e of availableExercises) map.set(String(e.id), e)
    return map
  }, [availableExercises])

  const getUniqueCategories = useCallback(() => {
    const cats = new Set<string>()
    availableExercises.forEach((e) => {
      if (e.category) cats.add(e.category)
    })
    return Array.from(cats).sort()
  }, [availableExercises])

  const getUniqueMuscles = useCallback(() => {
    const muscles = new Set<string>()
    availableExercises.forEach((e) => {
      if (e.muscle_groups) {
        e.muscle_groups.forEach((m) => muscles.add(m))
      }
    })
    return Array.from(muscles).sort()
  }, [availableExercises])

  const filteredExercises = useMemo(() => {
    const q = exerciseSearch.trim().toLowerCase()
    return availableExercises.filter((e) => {
      const matchesSearch = !q || (e.name || "").toLowerCase().includes(q)
      const matchesCategory = exerciseCategoryFilter === "all" || (e.category || "") === exerciseCategoryFilter
      const matchesMuscle =
        exerciseMuscleFilter === "all" || (Array.isArray(e.muscle_groups) && e.muscle_groups.includes(exerciseMuscleFilter))
      return matchesSearch && matchesCategory && matchesMuscle
    })
  }, [availableExercises, exerciseSearch, exerciseCategoryFilter, exerciseMuscleFilter])

  const currentDayExercises = useMemo(() => {
    const dn = dayNumberFromWeekAndDay(activeWeek, Number(activeDay))
    const day = days.find((d) => d.day_number === dn)
    return day?.exercises || []
  }, [days, activeDay, activeWeek])
  const calendarDays = getMonthCalendarDays(calendarMonth)

  const getDaysForWeek = useCallback((weekNumber: number) => {
    return days.filter((day) => weekNumberFromDayNumber(day.day_number) === weekNumber)
  }, [days])

  const applyDaysUpdate = useCallback((nextDays: WorkoutDayDraft[]) => {
    setDays(nextDays)
    updateUnsavedChanges(true)
  }, [updateUnsavedChanges])

  const copyCurrentDay = () => {
    const dayNumber = dayNumberFromWeekAndDay(activeWeek, Number(activeDay))
    const day = days.find((item) => item.day_number === dayNumber)
    if (!day || day.exercises.length === 0) {
      toast({
        title: "Día vacío",
        description: "No hay ejercicios para copiar en este día.",
        variant: "destructive",
      })
      return
    }
    setWorkoutClipboard({ type: "day", day })
    toast({ title: "📋 Día copiado", description: `${day.day_name} listo para pegar.` })
  }

  const copyWeek = (weekNumber: number) => {
    const weekDays = getDaysForWeek(weekNumber).filter((day) => day.exercises.length > 0)
    if (weekDays.length === 0) {
      toast({
        title: "Semana vacía",
        description: "No hay entrenamientos para copiar en esa semana.",
        variant: "destructive",
      })
      return
    }
    setWorkoutClipboard({ type: "week", weekNumber, days: weekDays })
    setWeekCopySource(String(weekNumber))
    setWeekCopyTargets((current) => {
      const filtered = current.filter((week) => Number(week) !== weekNumber)
      return filtered.length > 0 ? filtered : [String(weekNumber === 1 ? 2 : 1)]
    })
    toast({ title: "📋 Semana copiada", description: `Semana ${weekNumber} lista para pegar.` })
  }

  const pasteDayToActiveSlot = () => {
    if (!workoutClipboard || workoutClipboard.type !== "day") {
      toast({
        title: "No hay día copiado",
        description: "Copia primero un día con ejercicios.",
        variant: "destructive",
      })
      return
    }

    const targetDayNumber = dayNumberFromWeekAndDay(activeWeek, Number(activeDay))
    const weekday = Number(activeDay)
    const pastedDay = cloneDayDraft(workoutClipboard.day, {
      day_number: targetDayNumber,
      day_name: planDurationWeeks > 1
        ? `Semana ${activeWeek} - ${DAY_FULL_NAMES[activeDay]}`
        : `Día ${weekday} - ${DAY_FULL_NAMES[activeDay]}`,
      is_rest_day: false,
    })

    applyDaysUpdate([
      ...days.filter((day) => day.day_number !== targetDayNumber),
      pastedDay,
    ])
    toast({
      title: "✅ Día pegado",
      description: `Copiado en Semana ${activeWeek} · ${DAY_FULL_NAMES[activeDay]}.`,
    })
  }

  const pasteWeekToTargets = (targetWeeks: number[]) => {
    if (!workoutClipboard || workoutClipboard.type !== "week") {
      toast({
        title: "No hay semana copiada",
        description: "Copia primero una semana con entrenamientos.",
        variant: "destructive",
      })
      return
    }

    const uniqueTargets = Array.from(new Set(targetWeeks)).filter((week) => week >= 1)
    if (uniqueTargets.length === 0) return

    let nextDays = [...days]
    for (const targetWeek of uniqueTargets) {
      const copiedDays = workoutClipboard.days.map((sourceDay) => {
        const slot = slotInWeekFromDayNumber(sourceDay.day_number)
        const targetDayNumber = dayNumberFromWeekAndDay(targetWeek, slot)
        return cloneDayDraft(sourceDay, {
          day_number: targetDayNumber,
          day_name: planDurationWeeks > 1
            ? `Semana ${targetWeek} - ${DAY_FULL_NAMES[String(slot) as DayKey]}`
            : `Día ${slot} - ${DAY_FULL_NAMES[String(slot) as DayKey]}`,
          is_rest_day: false,
        })
      })
      const targetDayNumbers = new Set(copiedDays.map((day) => day.day_number))
      nextDays = [
        ...nextDays.filter((day) => !targetDayNumbers.has(day.day_number)),
        ...copiedDays,
      ]
    }

    applyDaysUpdate(nextDays)
    setPlanDurationWeeks((current) => Math.max(current, ...uniqueTargets))
    toast({
      title: "✅ Semanas actualizadas",
      description: `Semana ${workoutClipboard.weekNumber} pegada en ${uniqueTargets.map((week) => `S${week}`).join(", ")}.`,
    })
  }

  const pasteWeekToActiveWeek = () => {
    pasteWeekToTargets([activeWeek])
  }

  const toggleWeekCopyTarget = (week: string) => {
    if (week === weekCopySource) return
    setWeekCopyTargets((current) => (
      current.includes(week)
        ? current.filter((target) => target !== week)
        : [...current, week]
    ))
  }

  const fetchJsonWithAuth = useCallback(async (url: string) => {
    let headers = await getAuthHeaders()
    let res = await fetch(buildApiUrl(url), { headers, cache: 'no-store' })
    if (res.status === 401) {
      const newHeaders = await handle401AndRefresh(getAuthHeaders)
      if (!newHeaders) throw new Error("Sesión expirada")
      headers = newHeaders
      res = await fetch(buildApiUrl(url), { headers, cache: 'no-store' })
    }
    if (!res.ok) throw new Error(`Error ${res.status}`)
    return await res.json()
  }, [getAuthHeaders])

  const patchJsonWithAuth = useCallback(async (url: string, body: any) => {
    let headers = await getAuthHeaders()
    let res = await fetch(buildApiUrl(url), {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    if (res.status === 401) {
      const newHeaders = await handle401AndRefresh(getAuthHeaders)
      if (!newHeaders) throw new Error("Sesión expirada")
      headers = newHeaders
      res = await fetch(buildApiUrl(url), {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: 'no-store',
      })
    }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.detail || errData.error || `Error ${res.status}`)
    }
    return await res.json().catch(() => null)
  }, [getAuthHeaders])

  const postJsonWithAuth = useCallback(async (url: string, body: any) => {
    let headers = await getAuthHeaders()
    let res = await fetch(buildApiUrl(url), {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.status === 401) {
      const newHeaders = await handle401AndRefresh(getAuthHeaders)
      if (!newHeaders) throw new Error("Sesión expirada")
      headers = newHeaders
      res = await fetch(buildApiUrl(url), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.detail || errData.error || `Error ${res.status}`)
    }
    return await res.json().catch(() => null)
  }, [getAuthHeaders])

  const resolvedPlanId = normalizeWorkoutPlanId(planId) || planId

  const loadPlan = async () => {
    if (!isValidWorkoutPlanId(resolvedPlanId)) {
      setLoading(false)
      setDays(createDefaultWeekDays())
      updateUnsavedChanges(false)
      if (planId !== "new") {
        toast({
          title: "Rutina no encontrada",
          description: formatInvalidIdMessage("Identificador de rutina"),
          variant: "destructive",
        })
      }
      return
    }

    setLoading(true)
    try {
      const data = await fetchJsonWithAuth(`admin/workouts/programs/${resolvedPlanId}/`)

      const duration = Math.max(1, data.duration_weeks || 1)
      setPlanDurationWeeks(duration)

      const incomingDays = Array.isArray(data.days) ? data.days : []
      const mapped: WorkoutDayDraft[] = incomingDays.map((d: any) => {
        const exercises = Array.isArray(d.exercises) ? d.exercises : []
        const dayName = d.day_name || d.name || `Día ${d.day_number || 1}`
        return {
          day_number: d.day_number || 1,
          day_name: fixEncoding(dayName),
          is_rest_day: d.is_rest_day || false,
          notes: fixEncoding(d.notes || ""),
          exercises: exercises.map((ex: any) => ({
            exercise_id: String(ex.exercise_id || ex.exercise || ex.id || ""),
            series: ex.series != null ? toNumber(ex.series) : (ex.sets != null ? toNumber(ex.sets) : undefined),
            reps: ex.reps ? String(ex.reps) : undefined,
            weight: ex.weight ? String(ex.weight) : "",
            rest_seconds: ex.rest_seconds != null ? toNumber(ex.rest_seconds) : undefined,
            notes: ex.notes ? fixEncoding(String(ex.notes)) : undefined,
          })),
        }
      })

      const daysByNumber = new Map<number, WorkoutDayDraft>()
      mapped.forEach((day) => { daysByNumber.set(day.day_number, day) })

      // Crear la rejilla completa: duration_weeks × 7 días, con independencia por semana
      const normalizedDays: WorkoutDayDraft[] = []
      for (let week = 1; week <= duration; week++) {
        for (const key of WEEK_DAY_KEYS) {
          const weekday = Number(key)
          const dn = dayNumberFromWeekAndDay(week, weekday)
          const existing = daysByNumber.get(dn)
          normalizedDays.push(existing || {
            day_number: dn,
            day_name: duration > 1
              ? `Semana ${week} - ${DAY_FULL_NAMES[key as DayKey]}`
              : `Día ${weekday} - ${DAY_FULL_NAMES[key as DayKey]}`,
            is_rest_day: true,
            notes: "",
            exercises: [],
          })
        }
      }

      setDays(normalizedDays)
      setActiveWeek(1)
      updateUnsavedChanges(false)
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo cargar el plan"
      toast({
        title: message.includes("404") ? "Rutina no encontrada" : "❌ Error",
        description: message.includes("404")
          ? "La rutina ya no existe. Se actualizará el listado."
          : message,
        variant: "destructive",
      })
      if (message.includes("404")) {
        await onSaved()
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId])

  useEffect(() => {
    if (!hasUnsavedChanges) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasUnsavedChanges])

  const updateDay = (dayNumber: number, patch: Partial<WorkoutDayDraft>) => {
    setDays((prev) => {
      const next = [...prev]
      const idx = next.findIndex((d) => d.day_number === dayNumber)
      if (idx < 0) return prev
      next[idx] = { ...next[idx], ...patch }
      return next
    })
    updateUnsavedChanges(true)
  }

  const openExercisePicker = (dayNum: number) => {
    setTargetDayIndex(dayNum)
    setExercisePickerMode("add")
    setReplaceExerciseTarget(null)
    setExerciseSearch("")
    setExerciseCategoryFilter("all")
    setExerciseMuscleFilter("all")
    setShowExerciseSelector(true)
  }

  const openReplaceExercisePicker = (dayNum: number, exerciseId: string | number, exerciseIndex: number) => {
    setTargetDayIndex(dayNum)
    setExercisePickerMode("replace")
    setReplaceExerciseTarget({ dayNum, exerciseId, exerciseIndex })
    setExerciseSearch("")
    setExerciseCategoryFilter("all")
    setExerciseMuscleFilter("all")
    setShowExerciseSelector(true)
  }

  const addExerciseToDay = (exercise: Exercise) => {
    if (targetDayIndex == null) return
    const dayNum = targetDayIndex

    updateUnsavedChanges(true)
    setDays((prev) => {
      const next = prev.map((day) => {
        if (day.day_number !== dayNum) return day

        const already = day.exercises.some((e) => String(e.exercise_id) === String(exercise.id))
        if (already) return day

        return {
          ...day,
          exercises: [
            ...day.exercises,
            { exercise_id: String(exercise.id), series: 3, reps: "8-12", weight: "", rest_seconds: 60, notes: "" },
          ],
          is_rest_day: false,
        }
      })
      return next
    })
  }

  const replaceExerciseInFutureOccurrences = (replacement: Exercise) => {
    if (!replaceExerciseTarget) return

    updateUnsavedChanges(true)
    let replacedCount = 0
    setDays((prev) => prev.map((day) => {
      const isFutureDay = day.day_number > replaceExerciseTarget.dayNum
      const isTargetDay = day.day_number === replaceExerciseTarget.dayNum

      if (!isFutureDay && !isTargetDay) return day

      const exercises = day.exercises.map((exercise, index) => {
        const isFuturePosition = isFutureDay || (isTargetDay && index >= replaceExerciseTarget.exerciseIndex)
        if (!isFuturePosition) return exercise
        if (String(exercise.exercise_id) !== String(replaceExerciseTarget.exerciseId)) return exercise

        replacedCount += 1
        return { ...exercise, exercise_id: String(replacement.id) }
      })

      return { ...day, exercises }
    }))

    setShowExerciseSelector(false)
    setReplaceExerciseTarget(null)
    setExercisePickerMode("add")
    toast({
      title: "✅ Ejercicio sustituido",
      description: `Se actualizó en ${replacedCount} aparición${replacedCount === 1 ? "" : "es"} desde esta posición en adelante.`,
    })
  }

  const moveExerciseUp = (dayNum: number, exerciseIndex: number) => {
    if (exerciseIndex === 0) return
    updateUnsavedChanges(true)
    setDays((prev) => {
      const next = prev.map((day) => {
        if (day.day_number !== dayNum) return day
        const currentExercises = [...day.exercises]
        const temp = currentExercises[exerciseIndex]
        currentExercises[exerciseIndex] = currentExercises[exerciseIndex - 1]
        currentExercises[exerciseIndex - 1] = temp
        return { ...day, exercises: currentExercises }
      })
      return next
    })
  }

  const moveExerciseDown = (dayNum: number, exerciseIndex: number) => {
    updateUnsavedChanges(true)
    setDays((prev) => {
      let didChange = false
      const next = prev.map((day) => {
        if (day.day_number !== dayNum || exerciseIndex >= day.exercises.length - 1) return day
        const currentExercises = [...day.exercises]
        const temp = currentExercises[exerciseIndex]
        currentExercises[exerciseIndex] = currentExercises[exerciseIndex + 1]
        currentExercises[exerciseIndex + 1] = temp
        didChange = true
        return { ...day, exercises: currentExercises }
      })
      return didChange ? next : prev
    })
  }

  const removeExerciseFromDay = (dayNum: number, exerciseId: string | number) => {
    updateUnsavedChanges(true)
    setDays((prev: WorkoutDayDraft[]) => {
      let didChange = false
      const next = prev.map((day) => {
        if (day.day_number !== dayNum) return day
        const exercises = day.exercises.filter((e) => String(e.exercise_id) !== String(exerciseId))
        didChange = exercises.length !== day.exercises.length
        return didChange ? { ...day, exercises } : day
      })
      return didChange ? next : prev
    })
  }

  const updateExerciseInDay = (dayNum: number, exerciseId: string | number, field: string, value: any) => {
    updateUnsavedChanges(true)
    setDays((prev) => {
      let didChange = false
      const next = prev.map((day) => {
        if (day.day_number !== dayNum) return day
        const exercises = day.exercises.map((exercise) => {
          if (String(exercise.exercise_id) !== String(exerciseId)) return exercise
          didChange = true
          return { ...exercise, [field]: value }
        })
        return didChange ? { ...day, exercises } : day
      })
      return didChange ? next : prev
    })
  }

  const openSubstitutesDialog = async (exerciseId: string | number) => {
    const baseId = String(exerciseId)
    const baseExercise = exercisesById.get(baseId)
    setSubstitutesExerciseId(baseId)
    setSubstitutesExerciseName(baseExercise ? fixEncoding(baseExercise.name) : `Ejercicio ${baseId}`)
    setSubstituteSearch("")
    setShowSubstitutesDialog(true)
    setLoadingSubstitutes(true)
    try {
      const data = await fetchJsonWithAuth(`admin/exercises/${baseId}/substitutes/`)
      setSubstitutes(Array.isArray(data) ? data : [])
    } catch (e) {
      toast({
        title: "❌ Error",
        description: e instanceof Error ? e.message : "No se pudieron cargar los ejercicios de respaldo",
        variant: "destructive",
      })
      setSubstitutes([])
    } finally {
      setLoadingSubstitutes(false)
    }
  }

  const handleAddSubstitute = async (substituteId: string | number) => {
    if (!substitutesExerciseId) return

    // Validar máximo 3 respaldos
    if (substitutes.length >= 3) {
      toast({
        title: "⚠️ Límite alcanzado",
        description: "Solo puedes asignar un máximo de 3 ejercicios de respaldo por ejercicio",
        variant: "destructive",
      })
      return
    }

    try {
      // Calcular próxima prioridad (1 = mayor prioridad)
      const nextPriority = substitutes.length + 1

      await postJsonWithAuth(`admin/exercises/${substitutesExerciseId}/add_substitute/`, {
        substitute_id: String(substituteId),
        priority: nextPriority,
        notes: "",
      })
      const refreshed = await fetchJsonWithAuth(`admin/exercises/${substitutesExerciseId}/substitutes/`)
      setSubstitutes(Array.isArray(refreshed) ? refreshed : [])
      toast({ title: "✅ Ejercicio de respaldo asignado" })
    } catch (e) {
      toast({
        title: "❌ Error",
        description: e instanceof Error ? e.message : "No se pudo asignar el respaldo",
        variant: "destructive",
      })
    }
  }

  const handleRemoveSubstitute = async (substituteId: string | number) => {
    if (!substitutesExerciseId) return
    try {
      await postJsonWithAuth(`admin/exercises/${substitutesExerciseId}/remove_substitute/`, {
        substitute_id: String(substituteId),
      })
      // Recargar lista completa para actualizar prioridades
      const refreshed = await fetchJsonWithAuth(`admin/exercises/${substitutesExerciseId}/substitutes/`)
      setSubstitutes(Array.isArray(refreshed) ? refreshed : [])
      toast({ title: "✅ Ejercicio de respaldo eliminado" })
    } catch (e) {
      toast({
        title: "❌ Error",
        description: e instanceof Error ? e.message : "No se pudo eliminar el respaldo",
        variant: "destructive",
      })
    }
  }

  const moveSubstituteUp = async (index: number) => {
    if (index === 0 || !substitutesExerciseId) return

    try {
      const newSubs = [...substitutes]
      const temp = newSubs[index]
      newSubs[index] = newSubs[index - 1]
      newSubs[index - 1] = temp

      // Actualizar prioridades en el backend
      await postJsonWithAuth(`admin/exercises/${substitutesExerciseId}/add_substitute/`, {
        substitute_id: String(newSubs[index - 1].substitute_id),
        priority: index, // La prioridad más baja es 1
        notes: newSubs[index - 1].notes,
      })

      await postJsonWithAuth(`admin/exercises/${substitutesExerciseId}/add_substitute/`, {
        substitute_id: String(newSubs[index].substitute_id),
        priority: index + 1,
        notes: newSubs[index].notes,
      })

      // Recargar lista
      const refreshed = await fetchJsonWithAuth(`admin/exercises/${substitutesExerciseId}/substitutes/`)
      setSubstitutes(Array.isArray(refreshed) ? refreshed : [])
    } catch (e) {
      toast({
        title: "❌ Error",
        description: "No se pudo reordenar",
        variant: "destructive",
      })
    }
  }

  const moveSubstituteDown = async (index: number) => {
    if (index === substitutes.length - 1 || !substitutesExerciseId) return

    try {
      const newSubs = [...substitutes]
      const temp = newSubs[index]
      newSubs[index] = newSubs[index + 1]
      newSubs[index + 1] = temp

      // Actualizar prioridades en el backend
      await postJsonWithAuth(`admin/exercises/${substitutesExerciseId}/add_substitute/`, {
        substitute_id: String(newSubs[index].substitute_id),
        priority: index + 1,
        notes: newSubs[index].notes,
      })

      await postJsonWithAuth(`admin/exercises/${substitutesExerciseId}/add_substitute/`, {
        substitute_id: String(newSubs[index + 1].substitute_id),
        priority: index + 2,
        notes: newSubs[index + 1].notes,
      })

      // Recargar lista
      const refreshed = await fetchJsonWithAuth(`admin/exercises/${substitutesExerciseId}/substitutes/`)
      setSubstitutes(Array.isArray(refreshed) ? refreshed : [])
    } catch (e) {
      toast({
        title: "❌ Error",
        description: "No se pudo reordenar",
        variant: "destructive",
      })
    }
  }

  const availableForSubstitute = useMemo(() => {
    if (!substitutesExerciseId) return [] as Exercise[]
    const q = substituteSearch.trim().toLowerCase()
    return availableExercises.filter((ex) => {
      const exId = String(ex.id)
      if (exId === String(substitutesExerciseId)) return false
      if (substitutes.some((s) => String(s.substitute_id) === exId)) return false
      if (!q) return true
      return (ex.name || "").toLowerCase().includes(q)
    })
  }, [availableExercises, substitutesExerciseId, substituteSearch, substitutes])

  const handleSaveImpl = async (options: { silent?: boolean } = {}) => {
    if (!isValidWorkoutPlanId(resolvedPlanId)) {
      toast({
        title: "No se puede guardar",
        description: formatInvalidIdMessage("Identificador de rutina"),
        variant: "destructive",
      })
      return
    }

    const silent = options.silent === true
    try {
      if (silent) {
        setAutosaveState("saving")
      } else {
        setSaving(true)
      }

      // Enviar todos los días de todas las semanas (no solo los 7 de la semana 1)
      const daysPayload = days.map((day) => {
        const exercises = Array.isArray(day.exercises) ? day.exercises : []
        const hasExercises = exercises.length > 0
        return {
          day_number: day.day_number,
          day_name: day.day_name?.trim() || `Día ${day.day_number}`,
          is_rest_day: !hasExercises,
          notes: day.notes || "",
          exercises: exercises
            .filter((e) => e.exercise_id)
            .map((e) => ({
              exercise_id: e.exercise_id,
              sets: e.series != null ? toNumber(e.series) : 3,
              reps: (e.reps || "10-12").toString(),
              weight: e.weight || "",
              rest_seconds: e.rest_seconds != null ? toNumber(e.rest_seconds) : 60,
              notes: e.notes || "",
            })),
        }
      })

      await patchJsonWithAuth(`admin/workouts/programs/${resolvedPlanId}/`, { days: daysPayload })

      updateUnsavedChanges(false)
      if (silent) {
        setAutosaveState("saved")
      } else {
        toast({ title: "✅ Plan de entrenamiento guardado", description: "Todos los cambios se han actualizado." })
        await loadPlan()
        await onSaved()
      }
    } catch (e) {
      if (silent) {
        setAutosaveState("error")
      } else {
        toast({
          title: "❌ Error",
          description: e instanceof Error ? e.message : "No se pudo guardar",
          variant: "destructive",
        })
      }
    } finally {
      if (silent) {
        isAutosavingRef.current = false
      } else {
        setSaving(false)
      }
    }
  }

  useEffect(() => {
    if (loading || saving || !hasUnsavedChanges || isAutosavingRef.current) {
      return
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }

    autosaveTimerRef.current = setTimeout(() => {
      if (!hasUnsavedChanges || isAutosavingRef.current) return
      isAutosavingRef.current = true
      void handleSaveImpl({ silent: true })
    }, 1800)

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, hasUnsavedChanges, loading, saving])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        {autosaveState === "saving" ? "Guardando automáticamente..." : null}
        {autosaveState === "saved" ? "Guardado automático aplicado" : null}
        {autosaveState === "error" ? "No se pudo guardar automáticamente. Usa Guardar para reintentar." : null}
        {autosaveState === "idle" ? "Guardado automático activo." : null}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-3 text-center">
            <div className="text-lg">📅</div>
            <div className="text-xs text-muted-foreground">Día activo</div>
            <div className="text-base font-bold">{DAY_LABELS[activeDay]}</div>
            {planDurationWeeks > 1 && (
              <div className="text-xs text-blue-600 font-semibold mt-0.5">Semana {activeWeek}</div>
            )}
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-3 text-center">
            <div className="text-lg">🏋️</div>
            <div className="text-xs text-muted-foreground">Ejercicios hoy</div>
            <div className="text-base font-bold">{currentDayExercises.length}</div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-3 text-center">
            <div className="text-lg">✅</div>
            <div className="text-xs text-muted-foreground">Días con rutina</div>
            <div className="text-base font-bold">{days.filter((d) => d.exercises.length > 0).length}</div>
          </CardContent>
        </Card>
        <Card className="border-violet-200 bg-violet-50">
          <CardContent className="p-3 text-center">
            <div className="text-lg">📆</div>
            <div className="text-xs text-muted-foreground">Semanas</div>
            <div className="text-base font-bold">{planDurationWeeks}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Configura ejercicios por día y su orden. Los días sin ejercicios se guardarán automáticamente como descanso.
        </div>
      </div>

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Calendario mensual de entrenamientos</CardTitle>
              <div className="text-sm text-muted-foreground">
                Selecciona un día del mes para editar directamente su rutina semanal.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[180px] text-center text-sm font-semibold capitalize">
                {calendarMonth.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2">
            {WEEK_DAY_KEYS.map((day) => <div key={day}>{DAY_LABELS[day]}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date) => {
              const key = dayKeyFromDate(date)
              const weekForDate = getProgramWeekForAnchor(
                calendarPlanAnchorRef.current,
                date,
                planDurationWeeks,
              )
              const isWithinPlanRange = weekForDate >= 1 && weekForDate <= planDurationWeeks
              const dn = isWithinPlanRange ? dayNumberFromWeekAndDay(weekForDate, Number(key)) : null
              const day = dn != null ? days.find((item) => item.day_number === dn) : undefined
              const exerciseCount = day?.exercises.length || 0
              const isRest = !day || day.is_rest_day || exerciseCount === 0
              const isCurrentMonth = date.getMonth() === calendarMonth.getMonth()
              const isSelected = isSameCalendarDay(date, selectedCalendarDate)

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => {
                    setSelectedCalendarDate(date)
                    setActiveDay(key)
                    if (isWithinPlanRange) {
                      setActiveWeek(weekForDate)
                    }
                  }}
                  className={`min-h-[82px] rounded-lg border p-2 text-left transition ${
                    isSelected ? "border-purple-500 bg-purple-50 shadow-sm" : "hover:border-purple-300 hover:bg-purple-50/40"
                  } ${isCurrentMonth ? "bg-white" : "bg-slate-50 text-muted-foreground"}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-semibold">{date.getDate()}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${isRest ? "bg-slate-100 text-slate-600" : "bg-purple-100 text-purple-800"}`}>
                      {isRest ? "Desc." : exerciseCount}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {planDurationWeeks > 1 && isWithinPlanRange && (
                      <div className="truncate rounded px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-700">
                        Sem. {weekForDate}
                      </div>
                    )}
                    <div className={`truncate rounded px-1.5 py-0.5 text-[10px] ${isRest ? "bg-slate-100 text-slate-600" : "bg-purple-100 text-purple-800"}`}>
                      {isRest ? "Descanso" : `${exerciseCount} ejercicios`}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selector de semana (solo visible si el plan tiene más de 1 semana) */}
      {planDurationWeeks > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">Semana:</span>
          {Array.from({ length: planDurationWeeks }, (_, i) => i + 1).map((w) => {
            const weekDays = WEEK_DAY_KEYS.map((k) =>
              days.find((x) => x.day_number === dayNumberFromWeekAndDay(w, Number(k)))
            )
            const withExercises = weekDays.filter((d) => d && d.exercises.length > 0).length
            return (
              <Button
                key={w}
                type="button"
                variant={activeWeek === w ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveWeek(w)}
                className="text-xs"
              >
                Semana {w}
                {withExercises > 0 && (
                  <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${activeWeek === w ? "bg-white/20" : "bg-purple-100 text-purple-700"}`}>
                    {withExercises}d
                  </span>
                )}
              </Button>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-slate-50 p-3">
        <Button type="button" variant="outline" size="sm" onClick={copyCurrentDay}>
          <Copy className="h-3.5 w-3.5 mr-1" />
          Copiar día
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => copyWeek(activeWeek)}>
          <Copy className="h-3.5 w-3.5 mr-1" />
          Copiar semana {activeWeek}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={pasteDayToActiveSlot}>
          <ClipboardPaste className="h-3.5 w-3.5 mr-1" />
          Pegar día
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={pasteWeekToActiveWeek}>
          <ClipboardPaste className="h-3.5 w-3.5 mr-1" />
          Pegar semana aquí
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => setShowWeekCopyDialog(true)}>
          Copiar semanas entre bloques
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          Portapapeles: {workoutClipboard
            ? workoutClipboard.type === "day"
              ? `Día (${workoutClipboard.day.exercises.length} ej.)`
              : `Semana ${workoutClipboard.weekNumber}`
            : "vacío"}
        </span>
      </div>

      <Tabs value={activeDay} onValueChange={(v) => setActiveDay(v as DayKey)}>
        <TabsList className="grid grid-cols-7 rounded-lg bg-muted p-1 h-auto">
          {WEEK_DAY_KEYS.map((d) => {
            const dn = dayNumberFromWeekAndDay(activeWeek, Number(d))
            const day = days.find((x) => x.day_number === dn)
            const hasExercises = (day?.exercises.length ?? 0) > 0
            return (
              <TabsTrigger key={d} value={d} className="text-xs rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm relative">
                {DAY_LABELS[d]}
                {hasExercises && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-purple-500" />
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {WEEK_DAY_KEYS.map((d) => {
          const dayNum = dayNumberFromWeekAndDay(activeWeek, Number(d))
          const day = days.find((x) => x.day_number === dayNum)
          if (!day) return null

          return (
            <TabsContent key={d} value={d} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <Label className="text-sm">Nombre del día</Label>
                  <Input
                    value={day.day_name}
                    onChange={(e) => updateDay(dayNum, { day_name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Checkbox
                    checked={day.is_rest_day}
                    onCheckedChange={(checked) => updateDay(dayNum, { is_rest_day: Boolean(checked) })}
                    id={`rest-day-${dayNum}`}
                  />
                  <Label htmlFor={`rest-day-${dayNum}`} className="text-sm cursor-pointer">
                    Día de descanso
                  </Label>
                </div>
              </div>

              {!day.is_rest_day && (
                <>
                  <div>
                    <Label className="text-sm">Notas del día</Label>
                    <Textarea
                      value={day.notes}
                      onChange={(e) => updateDay(dayNum, { notes: e.target.value })}
                      placeholder="Instrucciones especiales para este día..."
                      rows={2}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-semibold">Ejercicios</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openExercisePicker(dayNum)}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Ejercicio
                      </Button>
                    </div>

                    {day.exercises.length === 0 ? (
                      <Card className="border-dashed">
                        <CardContent className="p-6 text-center text-sm text-muted-foreground">
                          Sin ejercicios. Usa "Agregar Ejercicio" para comenzar.
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {day.exercises.map((exercise, idx) => {
                          const exerciseData = exercisesById.get(String(exercise.exercise_id))
                          const exerciseSubstitutes = exerciseData?.substitutes || []
                          const hasSubstitutes = exerciseSubstitutes.length > 0
                          return (
                            <Card key={idx} className={hasSubstitutes ? "border-2 border-amber-200 bg-amber-50/30" : "border"}>
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                  <div className="flex-1">
                                    <div className="font-medium flex items-center gap-2">
                                      <Badge variant="outline" className="text-[10px]">#{idx + 1}</Badge>
                                      {exerciseData ? fixEncoding(exerciseData.name) : `Ejercicio #${String(exercise.exercise_id)}`}
                                      {hasSubstitutes && (
                                        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] px-1.5 py-0.5">
                                          <Shield className="h-3 w-3 mr-1" />
                                          {exerciseSubstitutes.length} respaldo{exerciseSubstitutes.length > 1 ? 's' : ''}
                                        </Badge>
                                      )}
                                    </div>
                                    {exerciseData && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {exerciseData.category && <span>{fixEncoding(exerciseData.category)} • </span>}
                                        {exerciseData.muscle_groups?.map((m) => fixEncoding(m)).join(", ")}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openReplaceExercisePicker(dayNum, exercise.exercise_id, idx)}
                                      className="h-8 px-2 text-xs"
                                      title="Sustituir este ejercicio desde esta posición en adelante"
                                    >
                                      Sustituir
                                    </Button>
                                    <Button
                                      variant={hasSubstitutes ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => openSubstitutesDialog(exercise.exercise_id)}
                                      className={hasSubstitutes ? "h-8 px-2 text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white" : "h-8 px-2 text-xs"}
                                      title="Asignar ejercicios de respaldo"
                                    >
                                      <Shield className="h-3 w-3 mr-1" />
                                      Respaldo
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => moveExerciseUp(dayNum, idx)}
                                      disabled={idx === 0}
                                      title="Subir ejercicio"
                                    >
                                      <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => moveExerciseDown(dayNum, idx)}
                                      disabled={idx === day.exercises.length - 1}
                                      title="Bajar ejercicio"
                                    >
                                      <ArrowDown className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeExerciseFromDay(dayNum, exercise.exercise_id)}
                                      title="Eliminar ejercicio"
                                    >
                                      <Trash2 className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </div>
                                </div>

                                <div className="grid gap-3 md:grid-cols-4">
                                  <div>
                                    <Label className="text-xs">Series</Label>
                                    <Input
                                      type="number"
                                      value={exercise.series || ""}
                                      onChange={(e) =>
                                        updateExerciseInDay(dayNum, exercise.exercise_id, "series", parseInt(e.target.value) || null)
                                      }
                                      placeholder="3"
                                      className="h-8 mt-1"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Repeticiones</Label>
                                    <Input
                                      value={exercise.reps || ""}
                                      onChange={(e) => updateExerciseInDay(dayNum, exercise.exercise_id, "reps", e.target.value)}
                                      placeholder="8-12"
                                      className="h-8 mt-1"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Peso/RPE</Label>
                                    <Input
                                      value={exercise.weight || ""}
                                      onChange={(e) => updateExerciseInDay(dayNum, exercise.exercise_id, "weight", e.target.value)}
                                      placeholder="ej: 50 kg o RPE 8"
                                      className="h-8 mt-1"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Descanso (seg)</Label>
                                    <Input
                                      type="number"
                                      value={exercise.rest_seconds || ""}
                                      onChange={(e) =>
                                        updateExerciseInDay(dayNum, exercise.exercise_id, "rest_seconds", parseInt(e.target.value) || null)
                                      }
                                      placeholder="60"
                                      className="h-8 mt-1"
                                    />
                                  </div>
                                </div>

                                {/* Mostrar respaldos asignados */}
                                {hasSubstitutes && (
                                  <div className="mt-3 pt-3 border-t border-amber-200">
                                    <Label className="text-xs font-semibold text-amber-900 flex items-center gap-1">
                                      <Shield className="h-3 w-3" />
                                      Ejercicios de respaldo disponibles:
                                    </Label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {exerciseSubstitutes.map((sub: ExerciseSubstituteItem, subIdx: number) => (
                                        <Badge
                                          key={subIdx}
                                          variant="secondary"
                                          className="bg-gradient-to-r from-amber-100 to-orange-100 text-amber-900 border border-amber-300 text-xs px-2 py-1"
                                        >
                                          {fixEncoding(sub.substitute_name)}
                                          {sub.notes && (
                                            <span className="ml-1 text-[10px] opacity-70">({fixEncoding(sub.notes)})</span>
                                          )}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {exercise.notes && (
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    Notas: {fixEncoding(exercise.notes)}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}

              {day.is_rest_day && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4 text-center text-sm text-blue-700">
                    Este es un día de descanso. No se pueden agregar ejercicios.
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )
        })}
      </Tabs>

      <div className="flex justify-end gap-2 pt-4">
        {!isEmbedded && (
          <>
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cerrar
            </Button>
            <Button onClick={() => handleSaveImpl()} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar plan"
              )}
            </Button>
          </>
        )}
      </div>

      <Dialog open={showExerciseSelector} onOpenChange={setShowExerciseSelector}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{exercisePickerMode === "replace" ? "Sustituir ejercicio" : "Seleccionar ejercicio"}</DialogTitle>
            <DialogDescription>
              {exercisePickerMode === "replace"
                ? "Elige el nuevo ejercicio. Se aplicará desde esta posición y en sus futuras apariciones."
                : "Elige un ejercicio para agregarlo a este día."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar ejercicio..."
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
              />
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <Label className="text-xs">Categoría</Label>
                <Select value={exerciseCategoryFilter} onValueChange={setExerciseCategoryFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {getUniqueCategories().map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {fixEncoding(cat)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Grupo muscular</Label>
                <Select value={exerciseMuscleFilter} onValueChange={setExerciseMuscleFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {getUniqueMuscles().map((muscle) => (
                      <SelectItem key={muscle} value={muscle}>
                        {fixEncoding(muscle)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(exerciseSearch || exerciseCategoryFilter !== "all" || exerciseMuscleFilter !== "all") && (
              <Button size="sm" variant="ghost" onClick={() => {
                setExerciseSearch("")
                setExerciseCategoryFilter("all")
                setExerciseMuscleFilter("all")
              }}>
                <Filter className="h-3 w-3 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
            {filteredExercises.map((e) => {
              const alreadyAdded =
                targetDayIndex != null &&
                days
                  .find((d) => d.day_number === targetDayIndex)
                  ?.exercises.some((ex) => String(ex.exercise_id) === String(e.id))
              return (
                <Button
                  key={e.id}
                  variant="outline"
                  className="justify-start h-auto whitespace-normal"
                  onClick={() => {
                    if (exercisePickerMode === "replace") {
                      replaceExerciseInFutureOccurrences(e)
                      return
                    }
                    addExerciseToDay(e)
                  }}
                >
                  <div className="text-left">
                    <div className="font-medium text-sm flex items-center gap-1">
                      {fixEncoding(e.name)}
                      {alreadyAdded && <span className="text-[10px] text-muted-foreground font-normal">(ya en este día)</span>}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {e.category && (
                        <Badge variant="outline" className="text-[10px]">
                          {fixEncoding(e.category)}
                        </Badge>
                      )}
                      {e.muscle_groups?.map((muscle) => (
                        <Badge variant="secondary" className="text-[10px]" key={muscle}>
                          {fixEncoding(muscle)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Button>
              )
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExerciseSelector(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSubstitutesDialog} onOpenChange={setShowSubstitutesDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-600" />
              Ejercicios de respaldo
            </DialogTitle>
            <DialogDescription className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  Define alternativas para <strong className="text-amber-900">{substitutesExerciseName}</strong> en esta rutina.
                  Los usuarios podrán ver y elegir estos ejercicios de respaldo si no pueden realizar el ejercicio principal.
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Respaldos actuales {substitutes.length > 0 && `(${substitutes.length}/3)`}
              </Label>
              {loadingSubstitutes ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando respaldos...
                </div>
              ) : substitutes.length === 0 ? (
                <div className="text-sm text-muted-foreground mt-2 bg-gray-50 rounded-md p-3 text-center border border-dashed">
                  No hay respaldos asignados. Agrega ejercicios alternativos abajo.
                </div>
              ) : (
                <div className="space-y-2 mt-2">
                  {substitutes.map((s, index) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 border-2 border-amber-200 bg-amber-50/50 rounded-md p-3">
                      <div className="flex items-center gap-2">
                        {/* Botones de reordenamiento */}
                        <div className="flex flex-col gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveSubstituteUp(index)}
                            disabled={index === 0}
                            title="Subir prioridad"
                            className="h-5 w-5 p-0 hover:bg-amber-200 disabled:opacity-30"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveSubstituteDown(index)}
                            disabled={index === substitutes.length - 1}
                            title="Bajar prioridad"
                            className="h-5 w-5 p-0 hover:bg-amber-200 disabled:opacity-30"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Info del ejercicio */}
                        <div className="text-sm flex-1">
                          <div className="font-medium flex items-center gap-2">
                            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px]">
                              #{index + 1}
                            </Badge>
                            {fixEncoding(s.substitute_name)}
                          </div>
                          {s.category && <div className="text-xs text-muted-foreground mt-1">{fixEncoding(s.category)}</div>}
                          {s.notes && <div className="text-xs text-amber-700 mt-1 italic">{fixEncoding(s.notes)}</div>}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSubstitute(s.substitute_id)}
                        title="Eliminar respaldo"
                        className="h-8 w-8 hover:bg-red-100"
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <Label className="text-xs font-semibold">Agregar nuevo respaldo</Label>

              {substitutes.length >= 3 ? (
                <div className="mt-2 bg-amber-100 border border-amber-300 rounded-lg p-3 text-center">
                  <div className="text-sm font-medium text-amber-900">
                    ✅ Límite alcanzado
                  </div>
                  <div className="text-xs text-amber-700 mt-1">
                    Ya tienes 3 ejercicios de respaldo asignados (máximo permitido).
                  </div>
                </div>
              ) : (
                <>
                  <Input
                    className="mt-2"
                    placeholder="Buscar ejercicio alternativo..."
                    value={substituteSearch}
                    onChange={(e) => setSubstituteSearch(e.target.value)}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 max-h-64 overflow-y-auto">
                    {availableForSubstitute.map((e) => (
                      <Button
                        key={e.id}
                        variant="outline"
                        className="justify-between h-auto py-2"
                        onClick={() => handleAddSubstitute(e.id)}
                      >
                        <div className="text-left">
                          <div className="text-sm font-medium">{fixEncoding(e.name)}</div>
                          {e.category && <div className="text-xs text-muted-foreground">{fixEncoding(e.category)}</div>}
                        </div>
                        <Plus className="h-4 w-4" />
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubstitutesDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWeekCopyDialog} onOpenChange={setShowWeekCopyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copiar semanas entre bloques</DialogTitle>
            <DialogDescription>
              Elige la semana origen y una o más semanas destino. Se reemplazarán los entrenamientos de esas semanas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Semana origen</Label>
              <Select value={weekCopySource} onValueChange={setWeekCopySource}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: Math.max(planDurationWeeks, 1) }, (_, index) => String(index + 1)).map((week) => (
                    <SelectItem key={week} value={week}>Semana {week}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Semanas destino</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {Array.from({ length: Math.max(planDurationWeeks + 1, 2) }, (_, index) => String(index + 1)).map((week) => (
                  <label key={week} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <Checkbox
                      checked={weekCopyTargets.includes(week)}
                      disabled={week === weekCopySource}
                      onCheckedChange={() => toggleWeekCopyTarget(week)}
                    />
                    Semana {week}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWeekCopyDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                copyWeek(Number(weekCopySource))
                const targets = weekCopyTargets
                  .map((week) => Number(week))
                  .filter((week) => Number.isFinite(week) && week >= 1 && week !== Number(weekCopySource))
                if (targets.length === 0) {
                  toast({
                    title: "Elige semanas destino",
                    description: "Selecciona al menos una semana distinta de la origen.",
                    variant: "destructive",
                  })
                  return
                }
                pasteWeekToTargets(targets)
                setShowWeekCopyDialog(false)
              }}
            >
              Copiar y pegar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
})
