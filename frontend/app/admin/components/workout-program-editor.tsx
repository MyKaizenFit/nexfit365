"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Plus, Trash2, Save, Dumbbell, Clock, Loader2, RefreshCw, ChevronLeft, ChevronRight, Search, ArrowUp, ArrowDown, Copy, ClipboardPaste, Check, CalendarDays, ChevronDown, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { buildApiUrl, getAuthHeaders } from "@/lib/api"
import { formatInvalidIdMessage, isValidUserId, parsePositiveIntId } from "@/lib/admin-id-utils"
import { fixEncoding } from "@/lib/encoding-fix"
import { cn } from "@/lib/utils"
import {
  dayNumberForWeekDay,
  dayNumberForWeekSlot,
  getWorkoutSlotIndexFromDay,
  getWorkoutWeekFromDay,
  normalizeWorkoutDayNumbers,
  programWeekFromCalendarGridWeek,
  workoutDayHasSlot,
  workoutDayInWeek,
  workoutDayMatchesSlot,
  WORKOUT_DAY_NAMES,
} from "@/lib/workout-week-utils"

interface Exercise {
  id?: string
  localId?: string
  exerciseId?: string
  name: string
  sets: number
  reps: string
  weight: string
  rest: number
  notes: string
}

interface WorkoutDay {
  id?: string
  localId?: string
  day: string
  name: string
  duration: number
  exercises: Exercise[]
  isRestDay: boolean
  dayNumber?: number
  notes?: string
}

interface WorkoutProgram {
  id?: string
  name: string
  description: string
  level: string
  goal: string
  targetRpe: string
  daysPerWeek: number
  weeklySchedule: WorkoutDay[]
  durationWeeks?: number
  isActive?: boolean
}

interface CalendarWorkoutLog {
  id: string
  date: string
  completed?: boolean
}

type WorkoutClipboard =
  | { type: "day"; day: WorkoutDay }
  | { type: "week"; days: WorkoutDay[]; weekNumber: number }
  | null

interface ExerciseOption {
  id: string | number
  name: string
  category?: string
  muscle_groups?: string[]
}

const DAY_OPTIONS: string[] = [...WORKOUT_DAY_NAMES]
const UNSAVED_CHANGES_MESSAGE = "Hay cambios sin guardar. ¿Quieres salir sin guardar?"
const AUTOSAVE_DELAY_MS = 10000
const AUTOSAVE_IDLE_GRACE_MS = 3000
const RPE_LINE_REGEX = /^RPE objetivo:\s*([1-9](?:[.,][0-9])?|10)\s*$/im

function extractTargetRpe(description?: string) {
  const match = (description || "").match(RPE_LINE_REGEX)
  return match?.[1]?.replace(",", ".") || ""
}

function stripTargetRpe(description?: string) {
  return (description || "")
    .replace(RPE_LINE_REGEX, "")
    .split("\n")
    .map(line => line.trimEnd())
    .join("\n")
    .trim()
}

function buildDescriptionWithRpe(description: string, targetRpe: string) {
  const cleanDescription = stripTargetRpe(description)
  const cleanRpe = targetRpe.trim().replace(",", ".")
  const parts = cleanRpe ? [`RPE objetivo: ${cleanRpe}`] : []
  if (cleanDescription) parts.push(cleanDescription)
  return parts.join("\n")
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

function getSpanishDayName(date: Date) {
  return DAY_OPTIONS[(date.getDay() + 6) % 7]
}

function isSameCalendarDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatCalendarDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getCalendarWeekNumber(date: Date, calendarStartDate: Date) {
  const start = Date.UTC(calendarStartDate.getFullYear(), calendarStartDate.getMonth(), calendarStartDate.getDate())
  const target = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((target - start) / (24 * 60 * 60 * 1000))
  return Math.max(1, Math.floor(diffDays / 7) + 1)
}

function createLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalizeDateLikeWorkoutText(value: string) {
  const raw = String(value || "").trim()
  const match = raw.match(/^20\d{2}-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])(?: 00:00:00)?$/)
  if (!match) return value
  return `${Number(match[2])}-${Number(match[1])}`
}

function getWorkoutDayKey(day: WorkoutDay, fallbackIndex: number) {
  return day.id ?? day.localId ?? String(fallbackIndex)
}

function getWorkoutWeekNumber(day: WorkoutDay, fallbackIndex: number) {
  const weekFromDayNumber = getWorkoutWeekFromDay(day)
  if (weekFromDayNumber != null) return weekFromDayNumber
  return Math.max(1, Math.ceil((fallbackIndex + 1) / 7))
}

function getWorkoutDayIndexInWeek(day: WorkoutDay, _fallbackIndex: number) {
  return getWorkoutSlotIndexFromDay(day)
}

function normalizeWorkoutSchedule(days: WorkoutDay[]) {
  return [...days]
    .sort((a, b) => (a.dayNumber ?? 9999) - (b.dayNumber ?? 9999))
}

function cloneExerciseForWorkoutCopy(exercise: Exercise): Exercise {
  return {
    ...exercise,
    id: undefined,
    localId: createLocalId("exercise"),
  }
}

function cloneWorkoutDayForCopy(day: WorkoutDay, updates: Partial<WorkoutDay> = {}): WorkoutDay {
  return {
    ...day,
    ...updates,
    id: undefined,
    localId: createLocalId("day"),
    exercises: (day.exercises || []).map(cloneExerciseForWorkoutCopy),
  }
}

function getWorkoutDaysForWeekDay(schedule: WorkoutDay[], week: number, dayName: string) {
  return schedule
    .map((workoutDay, index) => ({ workoutDay, index }))
    .filter(
      (item) =>
        item.workoutDay.day === dayName && getWorkoutWeekNumber(item.workoutDay, item.index) === week,
    )
}

function getWeekDayChipLabel(day?: WorkoutDay) {
  if (!day) return "Sin rutina"
  if (day.isRestDay) return "Descanso"
  if (day.name?.trim()) return day.name.trim()
  if (day.exercises.length > 0) return `${day.exercises.length} ejercicios`
  return "Nuevo"
}

type DayBlueprintSource = "reference" | "program_week1" | "program_pattern" | "empty"

function mapApiDaysToSchedule(detailDays: any[]): WorkoutDay[] {
  const dayOfWeekMap: Record<string, string> = {
    monday: "Lunes",
    tuesday: "Martes",
    wednesday: "Miércoles",
    thursday: "Jueves",
    friday: "Viernes",
    saturday: "Sábado",
    sunday: "Domingo",
  }

  const sortedDays = [...(detailDays || [])].sort((a: any, b: any) => (a.day_number || 0) - (b.day_number || 0))

  const mappedDays = sortedDays.map((day: any, index: number) => ({
    id: day.id,
    localId: createLocalId("day"),
    day: dayOfWeekMap[day.day_of_week] || day.day_of_week || "Lunes",
    name: fixEncoding(day.name || `Entrenamiento ${index + 1}`),
    duration: day.duration_minutes || 60,
    isRestDay: !!day.is_rest_day,
    dayNumber: day.day_number,
    notes: day.notes || "",
    exercises: (day.exercises || []).map((ex: any, exIndex: number) => ({
      id: ex.id,
      localId: createLocalId("exercise"),
      exerciseId: ex.exercise?.id || ex.exercise_id,
      name: fixEncoding(ex.exercise?.name || ex.exercise_name || ex.name || `Ejercicio ${exIndex + 1}`),
      sets: ex.sets ?? 3,
      reps: normalizeDateLikeWorkoutText(ex.reps || "10-12"),
      weight: ex.weight || "",
      rest: ex.rest_seconds ?? 60,
      notes: ex.notes || "",
    })),
  }))

  return normalizeWorkoutDayNumbers(mappedDays)
}

function getReferenceDayForSlot(schedule: WorkoutDay[], targetWeek: number, targetDayName: string) {
  if (schedule.length === 0) return null

  const targetDayIndex = DAY_OPTIONS.indexOf(targetDayName)
  if (targetDayIndex < 0) return null

  const targetDayNumber = dayNumberForWeekDay(targetWeek, targetDayName)
  const exact = schedule.find((day) => workoutDayHasSlot(day) && day.dayNumber === targetDayNumber)
  if (exact) return exact

  const sameWeekDay = schedule.find(
    (day, index) => day.day === targetDayName && getWorkoutWeekNumber(day, index) === targetWeek,
  )
  if (sameWeekDay) return sameWeekDay

  const templateWeeks = Math.max(...schedule.map((day, index) => getWorkoutWeekNumber(day, index)), 1)
  const cycledWeek = ((targetWeek - 1) % templateWeeks) + 1
  const cycledDay = schedule.find(
    (day, index) => day.day === targetDayName && getWorkoutWeekNumber(day, index) === cycledWeek,
  )
  if (cycledDay) return cycledDay

  const weekOneDay = schedule.find(
    (day, index) => day.day === targetDayName && getWorkoutWeekNumber(day, index) === 1,
  )
  if (weekOneDay) return weekOneDay

  return schedule.find((day) => day.day === targetDayName) || null
}

function getProgramPatternDay(schedule: WorkoutDay[], targetWeek: number, targetDayName: string) {
  if (targetWeek > 1) {
    const weekOne = getWorkoutDaysForWeekDay(schedule, 1, targetDayName)[0]?.workoutDay
    if (weekOne) return weekOne
  }

  for (let week = targetWeek - 1; week >= 1; week -= 1) {
    const match = getWorkoutDaysForWeekDay(schedule, week, targetDayName)[0]?.workoutDay
    if (match) return match
  }

  return null
}

function resolveDayBlueprint(
  targetWeek: number,
  targetDayName: string,
  programSchedule: WorkoutDay[],
  referenceSchedule: WorkoutDay[],
): { day: WorkoutDay | null; source: DayBlueprintSource } {
  const referenceDay = getReferenceDayForSlot(referenceSchedule, targetWeek, targetDayName)
  if (referenceDay) {
    return { day: referenceDay, source: "reference" }
  }

  if (targetWeek > 1) {
    const weekOneDay = getWorkoutDaysForWeekDay(programSchedule, 1, targetDayName)[0]?.workoutDay
    if (weekOneDay) {
      return { day: weekOneDay, source: "program_week1" }
    }
  }

  const patternDay = getProgramPatternDay(programSchedule, targetWeek, targetDayName)
  if (patternDay) {
    return { day: patternDay, source: "program_pattern" }
  }

  return { day: null, source: "empty" }
}

export function WorkoutProgramEditor({
  userId,
  onSave,
  onDirtyChange,
}: {
  userId: string
  onSave: () => void
  onDirtyChange?: (hasUnsavedChanges: boolean) => void
}) {
  const [program, setProgram] = useState<WorkoutProgram | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => new Date())
  const [activeWeek, setActiveWeek] = useState(1)
  const [activeDayName, setActiveDayName] = useState(() => getSpanishDayName(new Date()))
  const [showProgramSettings, setShowProgramSettings] = useState(false)
  const [showMonthlyCalendar, setShowMonthlyCalendar] = useState(false)
  const [showCopyWeekTools, setShowCopyWeekTools] = useState(false)
  const [referenceSchedule, setReferenceSchedule] = useState<WorkoutDay[]>([])
  const [referenceProgramName, setReferenceProgramName] = useState<string | null>(null)
  const [referenceProgramSource, setReferenceProgramSource] = useState<"assigned_template" | "default_config" | null>(null)
  const [calendarWorkoutLogs, setCalendarWorkoutLogs] = useState<CalendarWorkoutLog[]>([])
  const [autosaveState, setAutosaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [availableExercises, setAvailableExercises] = useState<ExerciseOption[]>([])
  const [loadingExercises, setLoadingExercises] = useState(false)
  const [showReplaceDialog, setShowReplaceDialog] = useState(false)
  const [exerciseSearch, setExerciseSearch] = useState("")
  const [workoutClipboard, setWorkoutClipboard] = useState<WorkoutClipboard>(null)
  const [weekCopySource, setWeekCopySource] = useState("1")
  const [weekCopyTargets, setWeekCopyTargets] = useState<string[]>(["2"])
  const [copyingWeeks, setCopyingWeeks] = useState(false)
  const [clipboardTargetWeek, setClipboardTargetWeek] = useState("1")
  const [replaceTarget, setReplaceTarget] = useState<{
    dayKey: string
    exerciseKey: string
    oldExerciseId?: string
    oldExerciseName: string
  } | null>(null)
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isAutosavingRef = useRef(false)
  const lastUserInteractionRef = useRef(Date.now())
  const hasLoadedOnceRef = useRef(false)
  const resolvedUserId = parsePositiveIntId(userId)
  const invalidUserId = userId != null && userId !== "" && resolvedUserId == null

  const filteredReplacementExercises = useMemo(() => {
    const query = exerciseSearch.trim().toLowerCase()
    return availableExercises.filter((exercise) => !query || (exercise.name || "").toLowerCase().includes(query))
  }, [availableExercises, exerciseSearch])

  const updateUnsavedChanges = (value: boolean) => {
    setHasUnsavedChanges(value)
    onDirtyChange?.(value)
  }

  const setProgramDraft = (nextProgram: WorkoutProgram) => {
    setProgram(nextProgram)
    updateUnsavedChanges(true)
  }

  const markUserInteraction = () => {
    lastUserInteractionRef.current = Date.now()
  }

  const confirmDiscardChanges = () => {
    return !hasUnsavedChanges || window.confirm(UNSAVED_CHANGES_MESSAGE)
  }

  useEffect(() => {
    hasLoadedOnceRef.current = false
    if (!isValidUserId(userId)) {
      setLoading(false)
      setProgram(null)
      setError(formatInvalidIdMessage("ID de usuario"))
      return
    }
    void loadUserProgram()
    void loadCalendarWorkoutLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    if (!hasUnsavedChanges) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasUnsavedChanges])

  const loadUserProgram = async (options: { silent?: boolean } = {}) => {
    const parsedUserId = parsePositiveIntId(userId)
    if (!parsedUserId) {
      setError(formatInvalidIdMessage("ID de usuario"))
      setLoading(false)
      return
    }

    const showBlockingLoader = !options.silent && !hasLoadedOnceRef.current
    try {
      if (showBlockingLoader) setLoading(true)
      setError(null)

      const headers = await getAuthHeaders()

      const response = await fetch(buildApiUrl(`admin/workouts/users/${parsedUserId}/program/`), {
        headers,
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error("Error al cargar el programa de entrenamiento del usuario")
      }

      const data = await response.json()

      if (data.reference_program?.days?.length) {
        setReferenceSchedule(mapApiDaysToSchedule(data.reference_program.days))
        setReferenceProgramName(fixEncoding(data.reference_program.name || "Plantilla admin"))
        setReferenceProgramSource(
          data.reference_program_source === "assigned_template" || data.reference_program_source === "default_config"
            ? data.reference_program_source
            : null,
        )
      } else {
        setReferenceSchedule([])
        setReferenceProgramName(null)
        setReferenceProgramSource(null)
      }

      // El endpoint devuelve { user_id, program, summary }
      const detail = data.program

      if (!detail) {
        // Si no tiene programa aún, crear uno vacío en memoria
        setProgram({
          name: "Nuevo Programa de Entrenamientos",
          description: "Programa personalizado para el usuario",
          level: "beginner",
          goal: "general_fitness",
          targetRpe: "",
          daysPerWeek: 3,
          weeklySchedule: [],
          durationWeeks: 4,
          isActive: true,
        })
        updateUnsavedChanges(false)
        return
      }

      const weeklySchedule = mapApiDaysToSchedule(detail.days || [])
      setProgram({
        id: detail.id,
        name: fixEncoding(detail.name || "Programa de Entrenamiento"),
        description: stripTargetRpe(detail.description),
        level: detail.difficulty || "intermediate", // El backend usa 'difficulty', no 'level'
        goal: detail.goal || "general_fitness",
        targetRpe: extractTargetRpe(detail.description),
        daysPerWeek: detail.days_per_week || weeklySchedule.length || 3,
        weeklySchedule,
        durationWeeks: detail.duration_weeks,
        isActive: detail.is_active,
      })
      updateUnsavedChanges(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
      toast({
        title: "Error",
        description: "No se pudo cargar el programa de entrenamientos del usuario",
        variant: "destructive",
      })

      // Fallback: programa vacío
      setProgram({
        name: "Nuevo Programa de Entrenamientos",
        description: "Programa personalizado para el usuario",
        level: "beginner",
        goal: "general_fitness",
        targetRpe: "",
        daysPerWeek: 3,
        weeklySchedule: [],
        durationWeeks: 4,
        isActive: true,
      })
      updateUnsavedChanges(false)
    } finally {
      hasLoadedOnceRef.current = true
      if (showBlockingLoader) setLoading(false)
    }
  }

  const loadAvailableExercises = async () => {
    if (availableExercises.length > 0 || loadingExercises) return

    try {
      setLoadingExercises(true)
      let nextUrl: string | null = buildApiUrl("admin/exercises/?page_size=1000")
      const headers = await getAuthHeaders()
      const allExercises: ExerciseOption[] = []

      while (nextUrl) {
        const response: Response = await fetch(nextUrl, { headers })
        if (!response.ok) throw new Error("Error al cargar ejercicios")
        const data: any = await response.json()
        const results = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : [])
        allExercises.push(...results)
        nextUrl = typeof data.next === "string" ? data.next : null
      }

      setAvailableExercises(allExercises)
    } catch (err) {
      toast({
        title: "❌ Error",
        description: err instanceof Error ? err.message : "No se pudieron cargar los ejercicios",
        variant: "destructive",
      })
    } finally {
      setLoadingExercises(false)
    }
  }

  const loadCalendarWorkoutLogs = async () => {
    const parsedUserId = parsePositiveIntId(userId)
    if (!parsedUserId) {
      setCalendarWorkoutLogs([])
      return
    }
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`admin/workouts/users/${parsedUserId}/workout-logs/?limit=500`), {
        headers,
        cache: "no-store",
      })
      if (!response.ok) return
      const data = await response.json()
      setCalendarWorkoutLogs(Array.isArray(data.logs) ? data.logs : [])
    } catch {
      setCalendarWorkoutLogs([])
    }
  }

  const addWorkoutDay = (preferredDay?: string, preferredWeek?: number) => {
    if (!program) return false
    const targetDay = preferredDay || DAY_OPTIONS[program.weeklySchedule.length % DAY_OPTIONS.length]
    const targetDayIndex = DAY_OPTIONS.indexOf(targetDay)
    const targetWeek = Math.max(1, preferredWeek || Math.ceil((program.weeklySchedule.length + 1) / 7))
    const targetDayNumber = dayNumberForWeekDay(targetWeek, targetDay)
    const alreadyExists = program.weeklySchedule.some((day) => workoutDayMatchesSlot(day, targetWeek, targetDay))
    if (alreadyExists) {
      toast({
        title: "Ya existe entrenamiento",
        description: `Semana ${targetWeek} · ${targetDay} ya tiene una rutina. Edita esa tarjeta o muévela antes de crear otra.`,
        variant: "destructive",
      })
      return false
    }

    const { day: blueprint, source } = resolveDayBlueprint(
      targetWeek,
      targetDay,
      program.weeklySchedule,
      referenceSchedule,
    )

    const newDay: WorkoutDay = blueprint
      ? cloneWorkoutDayForCopy(blueprint, {
          day: targetDay,
          dayNumber: targetDayNumber,
        })
      : {
          id: undefined,
          localId: createLocalId("day"),
          day: targetDay,
          name: `${targetDay} - Entrenamiento`,
          duration: program.weeklySchedule.find((day) => !day.isRestDay)?.duration || 60,
          isRestDay: false,
          exercises: [],
          dayNumber: targetDayNumber,
        }

    const weeklySchedule = normalizeWorkoutSchedule([...program.weeklySchedule, newDay])
    setProgramDraft({
      ...program,
      daysPerWeek: Math.min(7, Math.max(program.daysPerWeek || 1, targetDayIndex + 1)),
      durationWeeks: Math.max(program.durationWeeks || 1, targetWeek),
      weeklySchedule,
    })

    const sourceMessages: Record<DayBlueprintSource, string> = {
      reference: referenceProgramSource === "assigned_template"
        ? referenceProgramName
          ? `Contenido tomado de la plantilla asignada “${referenceProgramName}”.`
          : "Contenido tomado de la plantilla asignada al usuario."
        : referenceProgramName
          ? `Contenido tomado del menú por defecto “${referenceProgramName}”.`
          : "Contenido tomado del menú/plantilla definido por admin.",
      program_week1: "Copiado desde la Semana 1 del programa actual.",
      program_pattern: "Copiado desde un día similar ya definido en el programa.",
      empty: "Rutina vacía creada. Añade ejercicios manualmente.",
    }

    toast({
      title: source === "empty" ? "Rutina creada" : "Rutina creada con plantilla",
      description: `Semana ${targetWeek} · ${targetDay}. ${sourceMessages[source]}`,
    })

    return true
  }

  const syncSelectionFromDate = (date: Date, week: number, dayName: string) => {
    setSelectedCalendarDate(date)
    setActiveWeek(week)
    setActiveDayName(dayName)
    setClipboardTargetWeek(String(week))
  }

  const handleDayChipClick = (week: number, dayName: string) => {
    const dayIndex = DAY_OPTIONS.indexOf(dayName)
    const calendarStartDate = getMonthCalendarDays(calendarMonth)[0] || calendarMonth
    const targetDate = new Date(calendarStartDate)
    targetDate.setDate(calendarStartDate.getDate() + (week - 1) * 7 + Math.max(0, dayIndex))
    syncSelectionFromDate(targetDate, week, dayName)

    if (!program) return
    const existing = getWorkoutDaysForWeekDay(program.weeklySchedule, week, dayName)
    if (existing.length === 0) {
      addWorkoutDay(dayName, week)
    }
  }

  const handleWeekChange = (week: number) => {
    const nextWeek = Math.max(1, week)
    setActiveWeek(nextWeek)
    setClipboardTargetWeek(String(nextWeek))
    const dayIndex = DAY_OPTIONS.indexOf(activeDayName)
    const calendarStartDate = getMonthCalendarDays(calendarMonth)[0] || calendarMonth
    const targetDate = new Date(calendarStartDate)
    targetDate.setDate(calendarStartDate.getDate() + (nextWeek - 1) * 7 + Math.max(0, dayIndex))
    setSelectedCalendarDate(targetDate)
  }

  const updateWorkoutDay = (dayKey: string, updates: Partial<WorkoutDay>) => {
    if (!program) return

    setProgramDraft({
      ...program,
      weeklySchedule: program.weeklySchedule.map((day) =>
        (day.id ?? day.localId) === dayKey ? { ...day, ...updates } : day,
      ),
    })
  }

  const deleteWorkoutDay = (dayKey: string) => {
    if (!program) return

    setProgramDraft({
      ...program,
      daysPerWeek: Math.min(7, Math.max(1, program.weeklySchedule.length - 1)),
      weeklySchedule: program.weeklySchedule
        .filter((day) => (day.id ?? day.localId) !== dayKey)
        .map((day, index) => ({ ...day, dayNumber: index + 1 })),
    })
  }

  const moveWorkoutDayToDay = (dayKey: string, targetDay: string) => {
    if (!program) return
    const targetDayIndex = DAY_OPTIONS.indexOf(targetDay)
    if (targetDayIndex < 0) return

    const sourceItem = program.weeklySchedule
      .map((day, index) => ({ day, index }))
      .find((item) => getWorkoutDayKey(item.day, item.index) === dayKey)
    if (!sourceItem) return

    const sourceWeek = getWorkoutWeekNumber(sourceItem.day, sourceItem.index)
    const targetDayNumber = dayNumberForWeekDay(sourceWeek, targetDay)
    const targetOccupied = program.weeklySchedule.some((day, index) => {
      if (getWorkoutDayKey(day, index) === dayKey) return false
      return workoutDayMatchesSlot(day, sourceWeek, targetDay)
    })

    if (targetOccupied) {
      toast({
        title: "Ese día ya tiene rutina",
        description: `Semana ${sourceWeek} · ${targetDay} ya está ocupado. Muévelo o elimínalo antes.`,
        variant: "destructive",
      })
      return
    }

    setProgramDraft({
      ...program,
      weeklySchedule: normalizeWorkoutSchedule(program.weeklySchedule.map((day, index) =>
        getWorkoutDayKey(day, index) === dayKey ? { ...day, day: targetDay, dayNumber: targetDayNumber } : day,
      )),
    })
    toast({
      title: "✅ Entrenamiento movido",
      description: `Se ha movido a Semana ${sourceWeek} · ${targetDay}. Guarda el programa para aplicarlo al usuario.`,
    })
  }

  const copyWorkoutDayToClipboard = (day: WorkoutDay) => {
    setWorkoutClipboard({ type: "day", day })
    toast({
      title: "📋 Día copiado",
      description: `${day.name || "Entrenamiento"} está listo para pegar.`,
    })
  }

  const copyWorkoutWeekToClipboard = (weekNumber: number) => {
    if (!program) return
    const days = program.weeklySchedule.filter((day, index) => getWorkoutWeekNumber(day, index) === weekNumber)
    if (days.length === 0) {
      toast({
        title: "Semana vacía",
        description: "No hay entrenamientos para copiar en esa semana.",
        variant: "destructive",
      })
      return
    }

    setWorkoutClipboard({ type: "week", weekNumber, days })
    setWeekCopySource(String(weekNumber))
    setWeekCopyTargets((currentTargets) => {
      const validTargets = currentTargets.filter((week) => Number(week) !== weekNumber)
      if (validTargets.length > 0) return validTargets
      const fallbackTarget = weekNumber === 1 ? 2 : 1
      return [String(fallbackTarget)]
    })
    toast({
      title: "📋 Semana copiada",
      description: `Semana ${weekNumber} lista para pegar.`,
    })
  }

  const pasteWorkoutDay = (sourceDay: WorkoutDay, targetWeek: number, targetDayName: string) => {
    if (!program) return
    const targetDayIndex = DAY_OPTIONS.indexOf(targetDayName)
    if (targetDayIndex < 0) return

    const targetDayNumber = dayNumberForWeekDay(targetWeek, targetDayName)
    const clonedDay = cloneWorkoutDayForCopy(sourceDay, {
      day: targetDayName,
      dayNumber: targetDayNumber,
    })

    const withoutTarget = program.weeklySchedule.filter(
      (day) => !workoutDayMatchesSlot(day, targetWeek, targetDayName),
    )
    const weeklySchedule = normalizeWorkoutSchedule([...withoutTarget, clonedDay])
    setProgramDraft({
      ...program,
      daysPerWeek: Math.min(7, Math.max(program.daysPerWeek || 1, targetDayIndex + 1)),
      durationWeeks: Math.max(program.durationWeeks || 1, targetWeek),
      weeklySchedule,
    })
  }

  const pasteWorkoutWeek = (sourceDays: WorkoutDay[], targetWeek: number) => {
    if (!program) return
    const copiedDays = sourceDays.map((day) => {
      const sourceDayIndex = getWorkoutDayIndexInWeek(day, 0)
      const targetDayName = DAY_OPTIONS[sourceDayIndex] || day.day
      return cloneWorkoutDayForCopy(day, {
        day: targetDayName,
        dayNumber: dayNumberForWeekSlot(targetWeek, sourceDayIndex + 1),
      })
    })

    const weeklySchedule = normalizeWorkoutSchedule([
      ...program.weeklySchedule.filter((day) => !workoutDayInWeek(day, targetWeek)),
      ...copiedDays,
    ])
    setProgramDraft({
      ...program,
      daysPerWeek: Math.min(7, Math.max(program.daysPerWeek || 1, copiedDays.length)),
      durationWeeks: Math.max(program.durationWeeks || 1, targetWeek),
      weeklySchedule,
    })
  }

  const pasteWorkoutWeekToTargets = (sourceDays: WorkoutDay[], targetWeeks: number[]) => {
    if (!program) return
    const uniqueTargetWeeks = Array.from(new Set(targetWeeks)).filter((week) => week >= 1)
    if (uniqueTargetWeeks.length === 0) return

    const copiedDays = uniqueTargetWeeks.flatMap((targetWeek) =>
      sourceDays.map((day) => {
        const sourceDayIndex = getWorkoutDayIndexInWeek(day, 0)
        const targetDayName = DAY_OPTIONS[sourceDayIndex] || day.day
        return cloneWorkoutDayForCopy(day, {
          day: targetDayName,
          dayNumber: dayNumberForWeekSlot(targetWeek, sourceDayIndex + 1),
        })
      }),
    )

    const weeklySchedule = normalizeWorkoutSchedule([
      ...program.weeklySchedule.filter(
        (day) => !uniqueTargetWeeks.some((targetWeek) => workoutDayInWeek(day, targetWeek)),
      ),
      ...copiedDays,
    ])
    setProgramDraft({
      ...program,
      daysPerWeek: Math.min(7, Math.max(program.daysPerWeek || 1, sourceDays.length)),
      durationWeeks: Math.max(program.durationWeeks || 1, ...uniqueTargetWeeks),
      weeklySchedule,
    })
  }

  const toggleWeekCopyTarget = (week: string) => {
    if (week === weekCopySource) return
    setWeekCopyTargets((currentTargets) => (
      currentTargets.includes(week)
        ? currentTargets.filter((target) => target !== week)
        : [...currentTargets, week]
    ))
  }

  const handleWeekCopySourceChange = (week: string) => {
    setWeekCopySource(week)
    setWeekCopyTargets((currentTargets) => {
      const nextTargets = currentTargets.filter((target) => target !== week)
      if (nextTargets.length > 0) return nextTargets
      return [week === "1" ? "2" : "1"]
    })
  }

  const pasteClipboardToSelectedDate = (targetWeekOverride?: number) => {
    if (!workoutClipboard) {
      toast({
        title: "No hay nada copiado",
        description: "Copia primero un día o una semana.",
        variant: "destructive",
      })
      return
    }

    const targetWeek = Math.max(1, targetWeekOverride || Number(clipboardTargetWeek) || 1)
    const targetDayName = activeDayName || selectedDayName
    if (workoutClipboard.type === "day") {
      pasteWorkoutDay(workoutClipboard.day, targetWeek, targetDayName)
      toast({
        title: "✅ Día pegado",
        description: `Se pegó en Semana ${targetWeek} · ${targetDayName}.`,
      })
      return
    }

    pasteWorkoutWeek(workoutClipboard.days, targetWeek)
    toast({
      title: "✅ Semana pegada",
      description: `Semana ${workoutClipboard.weekNumber} copiada sobre Semana ${targetWeek}.`,
    })
  }

  const copyWeekDirectly = async () => {
    if (!program) return
    const parsedUserId = parsePositiveIntId(userId)
    if (!parsedUserId) {
      toast({
        title: "No se puede copiar",
        description: formatInvalidIdMessage("ID de usuario"),
        variant: "destructive",
      })
      return
    }
    if (!program.id) {
      toast({
        title: "Guarda el programa primero",
        description: "Crea o guarda el programa antes de copiar semanas.",
        variant: "destructive",
      })
      return
    }

    const sourceWeek = Math.max(1, Number(weekCopySource) || 1)
    const targetWeeks = Array.from(new Set(weekCopyTargets.map((week) => Number(week))))
      .filter((week) => Number.isFinite(week) && week >= 1 && week !== sourceWeek)
      .sort((a, b) => a - b)

    if (targetWeeks.length === 0) {
      toast({
        title: "Elige semanas destino",
        description: "Selecciona al menos una semana distinta de la semana origen.",
        variant: "destructive",
      })
      return
    }

    try {
      setCopyingWeeks(true)
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`admin/workouts/programs/${program.id}/copy-weeks/`), {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_week: sourceWeek,
          target_weeks: targetWeeks,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.detail || data.error || `Error ${response.status}`)
      }

      await loadUserProgram({ silent: true })
      updateUnsavedChanges(false)
      toast({
        title: "✅ Semana copiada",
        description: typeof data.detail === "string"
          ? data.detail
          : `Semana ${sourceWeek} copiada sobre ${targetWeeks.map((week) => `S${week}`).join(", ")}.`,
      })
    } catch (error) {
      toast({
        title: "❌ Error al copiar semana",
        description: error instanceof Error ? error.message : "No se pudo copiar la semana seleccionada",
        variant: "destructive",
      })
    } finally {
      setCopyingWeeks(false)
    }
  }

  const syncDaysPerWeek = (targetDays: number) => {
    if (!program) return
    const normalizedTarget = Math.min(7, Math.max(1, targetDays || 1))
    const currentDays = program.weeklySchedule
    let nextDays = [...currentDays]

    if (normalizedTarget > currentDays.length) {
      for (let index = currentDays.length; index < normalizedTarget; index += 1) {
        nextDays.push({
          id: undefined,
          localId: createLocalId("day"),
          day: DAY_OPTIONS[index % DAY_OPTIONS.length],
          name: "Nuevo entrenamiento",
          duration: 60,
          isRestDay: false,
          exercises: [],
          dayNumber: index + 1,
        })
      }
    } else {
      nextDays = nextDays.slice(0, normalizedTarget)
    }

    setProgramDraft({
      ...program,
      daysPerWeek: normalizedTarget,
      weeklySchedule: nextDays.map((day, index) => ({ ...day, dayNumber: index + 1 })),
    })
  }

  const addExercise = (dayKey: string) => {
    if (!program) return

    const newExercise: Exercise = {
      id: undefined,
      localId: createLocalId("exercise"),
      name: "Nuevo ejercicio",
      sets: 3,
      reps: "10-12",
      weight: "",
      rest: 60,
      notes: "",
    }

    const targetDay = program.weeklySchedule.find((d) => (d.id ?? d.localId) === dayKey)
    const currentExercises = targetDay?.exercises || []
    updateWorkoutDay(dayKey, {
      exercises: [...currentExercises, newExercise],
    })
  }

  const updateExercise = (dayKey: string, exerciseKey: string, updates: Partial<Exercise>) => {
    if (!program) return
    const day = program.weeklySchedule.find((d) => (d.id ?? d.localId) === dayKey)
    if (day) {
      const updatedExercises = day.exercises.map((exercise) =>
        (exercise.id ?? exercise.localId) === exerciseKey
          ? { ...exercise, ...updates, reps: updates.reps ? normalizeDateLikeWorkoutText(updates.reps) : exercise.reps }
          : exercise,
      )
      updateWorkoutDay(dayKey, { exercises: updatedExercises })
    }
  }

  const deleteExercise = (dayKey: string, exerciseKey: string) => {
    if (!program) return
    const day = program.weeklySchedule.find((d) => (d.id ?? d.localId) === dayKey)
    if (day) {
      const updatedExercises = day.exercises.filter((exercise) => (exercise.id ?? exercise.localId) !== exerciseKey)
      updateWorkoutDay(dayKey, { exercises: updatedExercises })
    }
  }

  const moveExercise = (dayKey: string, exerciseKey: string, direction: "up" | "down") => {
    if (!program) return
    const day = program.weeklySchedule.find((d) => (d.id ?? d.localId) === dayKey)
    if (!day) return

    const currentIndex = day.exercises.findIndex((exercise) => (exercise.id ?? exercise.localId) === exerciseKey)
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= day.exercises.length) return

    const updatedExercises = [...day.exercises]
    const currentExercise = updatedExercises[currentIndex]
    updatedExercises[currentIndex] = updatedExercises[targetIndex]
    updatedExercises[targetIndex] = currentExercise
    updateWorkoutDay(dayKey, { exercises: updatedExercises })
  }

  const openReplaceExerciseDialog = (dayKey: string, exerciseKey: string, exercise: Exercise) => {
    setReplaceTarget({
      dayKey,
      exerciseKey,
      oldExerciseId: exercise.exerciseId ? String(exercise.exerciseId) : undefined,
      oldExerciseName: exercise.name,
    })
    setExerciseSearch("")
    setShowReplaceDialog(true)
    void loadAvailableExercises()
  }

  const replaceExerciseInFutureSequence = (replacement: ExerciseOption) => {
    if (!program || !replaceTarget) return

    const targetDayIndex = program.weeklySchedule.findIndex((day) => (day.id ?? day.localId) === replaceTarget.dayKey)
    const targetDay = targetDayIndex >= 0 ? program.weeklySchedule[targetDayIndex] : null
    const targetExerciseIndex = targetDay
      ? targetDay.exercises.findIndex((exercise) => (exercise.id ?? exercise.localId) === replaceTarget.exerciseKey)
      : -1

    if (!targetDay || targetExerciseIndex < 0) return

    let replacedCount = 0
    const replacementId = String(replacement.id)
    const replacementName = fixEncoding(replacement.name)

    const weeklySchedule = program.weeklySchedule.map((day, dayIndex) => ({
      ...day,
      exercises: day.exercises.map((exercise, exerciseIndex) => {
        const isFuturePosition = dayIndex > targetDayIndex || (dayIndex === targetDayIndex && exerciseIndex >= targetExerciseIndex)
        if (!isFuturePosition) return exercise

        const isSameExercise = replaceTarget.oldExerciseId
          ? String(exercise.exerciseId || "") === replaceTarget.oldExerciseId
          : exercise.name === replaceTarget.oldExerciseName

        if (!isSameExercise) return exercise
        replacedCount += 1
        return { ...exercise, exerciseId: replacementId, name: replacementName }
      }),
    }))

    setProgramDraft({ ...program, weeklySchedule })
    setShowReplaceDialog(false)
    setReplaceTarget(null)
    toast({
      title: "✅ Ejercicio sustituido",
      description: `Se actualizó en ${replacedCount} aparición${replacedCount === 1 ? "" : "es"} desde esta posición en adelante.`,
    })
  }

  const handleSave = async (options: { silent?: boolean } = {}) => {
    if (!program) return
    const parsedUserId = parsePositiveIntId(userId)
    if (!parsedUserId) {
      toast({
        title: "No se puede guardar",
        description: formatInvalidIdMessage("ID de usuario"),
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
      setError(null)

      const headers = await getAuthHeaders()

      // Mapear nombres de días en español a formato del backend (day_of_week)
      const dayToDayOfWeekMap: Record<string, string> = {
        Lunes: "monday",
        Martes: "tuesday",
        Miércoles: "wednesday",
        Jueves: "thursday",
        Viernes: "friday",
        Sábado: "saturday",
        Domingo: "sunday",
      }

      const normalizedSchedule = normalizeWorkoutDayNumbers(program.weeklySchedule)
      const daysPayload = normalizedSchedule.map((day, index) => ({
        id: day.id,
        day_of_week: dayToDayOfWeekMap[day.day] || day.day.toLowerCase() || "monday",
        name: day.name,
        day_number: day.dayNumber,
        duration_minutes: day.duration,
        is_rest_day: day.isRestDay,
        notes: day.notes || "",
        order_index: index + 1,
        exercises: day.isRestDay
          ? []
          : day.exercises.map((ex, exIndex) => ({
              id: ex.id,
              exercise_id: ex.exerciseId || null,
              name: ex.name,
              sets: ex.sets,
              reps: ex.reps,
              weight: ex.weight,
              rest_seconds: ex.rest,
              notes: ex.notes,
              order_index: exIndex + 1,
            })),
      }))

      const payload: any = {
        user_id: parsedUserId,
        name: program.name,
        description: buildDescriptionWithRpe(program.description, program.targetRpe),
        difficulty: program.level, // El backend usa 'difficulty', no 'level'
        goal: program.goal,
        days_per_week: program.daysPerWeek || program.weeklySchedule.length || 3,
        duration_weeks: program.durationWeeks || 4,
        is_active: program.isActive !== false,
        days: daysPayload,
      }

      let response: Response
      if (program.id) {
        // Usar el endpoint de admin para actualizar programas de usuarios
        response = await fetch(buildApiUrl(`admin/workouts/programs/${program.id}/`), {
          method: "PATCH",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })
      } else {
        // Crear nuevo programa usando el endpoint de admin
        response = await fetch(buildApiUrl("admin/workouts/programs/"), {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.error || "Error al guardar el programa de entrenamientos")
      }

      const savedProgram = await response.json().catch(() => null)
      if (savedProgram?.id) {
        setProgram((current) => (current ? { ...current, id: savedProgram.id } : current))
      }
      updateUnsavedChanges(false)
      if (silent) {
        setAutosaveState("saved")
      } else {
        await loadUserProgram({ silent: true })

        toast({
          title: "✅ Programa de entrenamientos guardado",
          description: "Los cambios han sido aplicados al usuario",
        })

        onSave()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
      if (silent) {
        setAutosaveState("error")
      } else {
        toast({
          title: "❌ Error",
          description: err instanceof Error ? err.message : "No se pudo guardar el programa de entrenamientos",
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
    if (!program || loading || saving || !hasUnsavedChanges || isAutosavingRef.current) {
      return
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }

    const runAutosaveWhenIdle = () => {
      if (!hasUnsavedChanges || isAutosavingRef.current) return
      const idleFor = Date.now() - lastUserInteractionRef.current
      if (idleFor < AUTOSAVE_IDLE_GRACE_MS) {
        autosaveTimerRef.current = setTimeout(runAutosaveWhenIdle, AUTOSAVE_IDLE_GRACE_MS - idleFor)
        return
      }

      isAutosavingRef.current = true
      void handleSave({ silent: true })
    }

    autosaveTimerRef.current = setTimeout(runAutosaveWhenIdle, AUTOSAVE_DELAY_MS)

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program, hasUnsavedChanges, loading, saving])

  if (invalidUserId) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {formatInvalidIdMessage("ID de usuario")}
      </div>
    )
  }

  if ((loading && !hasLoadedOnceRef.current) || !program) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
          <p className="text-muted-foreground">Cargando programa de entrenamientos...</p>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
      </div>
    )
  }

  const calendarDays = getMonthCalendarDays(calendarMonth)
  const calendarStartDate = calendarDays[0] || calendarMonth
  const selectedCalendarWeek = getCalendarWeekNumber(selectedCalendarDate, calendarStartDate)
  const selectedDayName = getSpanishDayName(selectedCalendarDate)
  const selectedWorkoutDays = getWorkoutDaysForWeekDay(program.weeklySchedule, activeWeek, activeDayName)
  const totalWeeks = Math.max(
    1,
    program.durationWeeks || 1,
    ...program.weeklySchedule.map((day, index) => getWorkoutWeekNumber(day, index)),
  )
  const weekOptions = Array.from({ length: Math.max(totalWeeks + 1, 2) }, (_, index) => String(index + 1))
  const selectedWeekCopyTargets = Array.from(new Set(weekCopyTargets))
    .filter((week) => week !== weekCopySource)
    .sort((a, b) => Number(a) - Number(b))
  const weekCopySourceNumber = Math.max(1, Number(weekCopySource) || 1)
  const weekCopySourceDays = program.weeklySchedule
    .map((workoutDay, index) => ({ workoutDay, index }))
    .filter((item) => getWorkoutWeekNumber(item.workoutDay, item.index) === weekCopySourceNumber)
  const weekCopySourceSummary = weekCopySourceDays.length > 0
    ? weekCopySourceDays
      .map(({ workoutDay, index }) => DAY_OPTIONS[getWorkoutDayIndexInWeek(workoutDay, index)]?.slice(0, 3) || workoutDay.day.slice(0, 3))
      .join(" · ")
    : "sin rutinas"

  return (
    <div
      className="space-y-6"
      onFocusCapture={markUserInteraction}
      onKeyDownCapture={markUserInteraction}
      onPointerDownCapture={markUserInteraction}
    >
      {/* Header del programa — colapsable para no ocupar pantalla en móvil */}
      <Collapsible open={showProgramSettings} onOpenChange={setShowProgramSettings}>
        <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left hover:bg-muted/30 transition-colors rounded-t-lg"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-semibold text-base">
                  <Settings2 className="h-5 w-5 text-purple-600 shrink-0" />
                  <span className="truncate">{program.name || "Configuración del programa"}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {program.level} · {program.daysPerWeek} días/sem · {showProgramSettings ? "Toca para ocultar" : "Toca para editar nombre, nivel y objetivo"}
                </p>
              </div>
              <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", showProgramSettings && "rotate-180")} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
        <CardHeader className="pt-0">
          <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
            <Dumbbell className="h-6 w-6" />
            Editor de Programa de Entrenamientos
          </CardTitle>
          <CardDescription>Personaliza el programa de ejercicios del usuario</CardDescription>
          <div className="text-xs text-muted-foreground">
            {autosaveState === "saving" ? "Guardando automáticamente..." : null}
            {autosaveState === "saved" ? "Guardado automático aplicado" : null}
            {autosaveState === "error" ? "No se pudo guardar automáticamente. Usa Guardar para reintentar." : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="program-name">Nombre del programa</Label>
              <Input
                id="program-name"
                value={program.name}
                onChange={(e) => setProgramDraft({ ...program, name: e.target.value })}
                className="border-2 border-gray-200 focus:border-purple-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="days-per-week">Días por semana</Label>
              <Input
                id="days-per-week"
                type="number"
                min="1"
                max="7"
                value={program.daysPerWeek}
                onChange={(e) => setProgramDraft({ ...program, daysPerWeek: Math.min(7, Math.max(1, Number(e.target.value) || 1)) })}
                className="border-2 border-gray-200 focus:border-purple-400"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => syncDaysPerWeek(program.daysPerWeek)}>
                <RefreshCw className="h-3 w-3 mr-2" />
                Ajustar días
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level">Nivel</Label>
              <Select value={program.level} onValueChange={(value) => setProgramDraft({ ...program, level: value })}>
                <SelectTrigger className="border-2 border-gray-200 focus:border-purple-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Principiante</SelectItem>
                  <SelectItem value="intermediate">Intermedio</SelectItem>
                  <SelectItem value="advanced">Avanzado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal">Objetivo</Label>
              <Select value={program.goal} onValueChange={(value) => setProgramDraft({ ...program, goal: value })}>
                <SelectTrigger className="border-2 border-gray-200 focus:border-purple-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weight_loss">Pérdida de peso</SelectItem>
                  <SelectItem value="muscle_gain">Ganancia muscular</SelectItem>
                  <SelectItem value="strength">Fuerza</SelectItem>
                  <SelectItem value="endurance">Resistencia</SelectItem>
                  <SelectItem value="general_fitness">Entrenamiento general</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="program-description">Descripción</Label>
            <Textarea
              id="program-description"
              value={program.description}
              onChange={(e) => setProgramDraft({ ...program, description: e.target.value })}
              className="border-2 border-gray-200 focus:border-purple-400"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="program-target-rpe">RPE objetivo</Label>
            <Input
              id="program-target-rpe"
              type="number"
              min="1"
              max="10"
              step="0.5"
              placeholder="Ej: 8"
              value={program.targetRpe}
              onChange={(e) => setProgramDraft({ ...program, targetRpe: e.target.value })}
              className="border-2 border-gray-200 focus:border-purple-400"
            />
            <p className="text-xs text-muted-foreground">
              Se guardará como referencia dentro de la descripción del programa.
            </p>
          </div>
        </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Vista semanal — navegación principal (optimizada para móvil) */}
      <Card className="sticky top-0 z-20 backdrop-blur-md bg-white/95 border shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg">Vista semanal</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Toca un día para editarlo. Si está vacío, se crea al instante usando el menú admin cuando exista.
              </CardDescription>
              {referenceProgramName ? (
                <Badge variant="secondary" className="mt-2 text-[10px] font-normal">
                  {referenceProgramSource === "assigned_template"
                    ? `Plantilla asignada: ${referenceProgramName}`
                    : referenceProgramSource === "default_config"
                      ? `Menú por defecto: ${referenceProgramName}`
                      : `Menú prioritario: ${referenceProgramName}`}
                </Badge>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 h-8 text-xs"
              onClick={() => setShowMonthlyCalendar((value) => !value)}
            >
              <CalendarDays className="h-3.5 w-3.5 mr-1" />
              {showMonthlyCalendar ? "Ocultar" : "Calendario"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              disabled={activeWeek <= 1}
              onClick={() => handleWeekChange(activeWeek - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Select value={String(activeWeek)} onValueChange={(value) => handleWeekChange(Number(value))}>
              <SelectTrigger className="h-9 flex-1 font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weekOptions.map((week) => (
                  <SelectItem key={week} value={week}>Semana {week}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => handleWeekChange(activeWeek + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="hidden sm:inline-flex shrink-0 h-9"
              onClick={() => copyWorkoutWeekToClipboard(activeWeek)}
            >
              <Copy className="h-3.5 w-3.5 mr-1" />
              Copiar
            </Button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-thin -mx-1 px-1">
            {DAY_OPTIONS.map((dayName) => {
              const dayItems = getWorkoutDaysForWeekDay(program.weeklySchedule, activeWeek, dayName)
              const workoutDay = dayItems[0]?.workoutDay
              const previewDay = workoutDay ?? getReferenceDayForSlot(referenceSchedule, activeWeek, dayName)
              const isSelected = activeDayName === dayName
              const chipLabel = getWeekDayChipLabel(previewDay ?? undefined)
              const isRest = Boolean(previewDay?.isRestDay)
              const isEmpty = dayItems.length === 0
              const isPreview = isEmpty && Boolean(previewDay)

              return (
                <button
                  key={dayName}
                  type="button"
                  onClick={() => handleDayChipClick(activeWeek, dayName)}
                  className={cn(
                    "flex-shrink-0 w-[5.5rem] sm:w-24 snap-start rounded-xl border p-2.5 text-left transition touch-manipulation active:scale-[0.98]",
                    isSelected
                      ? "border-purple-500 bg-purple-50 shadow-sm ring-1 ring-purple-200"
                      : "border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/50",
                    isRest && !isSelected && "bg-slate-50",
                    isPreview && !isSelected && "border-dashed border-purple-200 bg-purple-50/30",
                  )}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {dayName.slice(0, 3)}
                  </div>
                  <div className={cn(
                    "mt-1 text-xs font-medium leading-tight line-clamp-2 min-h-[2rem]",
                    isEmpty && !isPreview ? "text-muted-foreground" : isRest ? "text-slate-600" : "text-purple-900",
                  )}>
                    {chipLabel}
                  </div>
                  {isEmpty && !isPreview ? (
                    <Plus className="h-3.5 w-3.5 mt-1 text-purple-600" />
                  ) : isRest ? (
                    <Clock className="h-3.5 w-3.5 mt-1 text-slate-400" />
                  ) : (
                    <Dumbbell className="h-3.5 w-3.5 mt-1 text-purple-500" />
                  )}
                  {isPreview ? (
                    <span className="mt-1 block text-[9px] text-purple-600/80">
                      {referenceProgramSource === "assigned_template" ? "Plantilla" : "Menú"}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {workoutClipboard ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8"
                onClick={() => pasteClipboardToSelectedDate(activeWeek)}
              >
                <ClipboardPaste className="h-3.5 w-3.5 mr-1" />
                Pegar en {activeDayName.slice(0, 3)}
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 sm:hidden"
              onClick={() => copyWorkoutWeekToClipboard(activeWeek)}
            >
              <Copy className="h-3.5 w-3.5 mr-1" />
              Copiar semana
            </Button>
            {workoutClipboard ? (
              <span className="text-[11px] text-muted-foreground truncate">
                Portapapeles: {workoutClipboard.type === "day"
                  ? workoutClipboard.day.name || "Entrenamiento"
                  : `Semana ${workoutClipboard.weekNumber}`}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {showMonthlyCalendar ? (
      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Calendario mensual de entrenamientos</CardTitle>
              <CardDescription>Selecciona un día del mes para editar los entrenamientos asociados a ese día semanal.</CardDescription>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Completado</span>
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Parcial</span>
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-white border" /> Sin actividad</span>
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
        <CardContent className="space-y-4">
          <Collapsible open={showCopyWeekTools} onOpenChange={setShowCopyWeekTools}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg border bg-slate-50 px-3 py-2.5 text-left text-sm font-medium hover:bg-slate-100 transition-colors"
              >
                <span>Copiar semanas entre bloques</span>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showCopyWeekTools && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
          <div className="rounded-lg border bg-slate-50 p-3 space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold">Copiar semanas</p>
                <p className="text-xs text-muted-foreground">
                  Elige una semana origen y una o varias semanas destino. Se aplica en una sola accion.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Semana destino</Label>
                  <Select value={clipboardTargetWeek} onValueChange={setClipboardTargetWeek}>
                    <SelectTrigger className="h-8 w-full sm:w-[130px] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {weekOptions.map((week) => (
                        <SelectItem key={week} value={week}>Semana {week}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => pasteClipboardToSelectedDate(activeWeek)}>
                  <ClipboardPaste className="h-3.5 w-3.5 mr-2" />
                  Pegar en Semana {activeWeek} · {activeDayName}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr_auto] lg:items-end">
              <div className="space-y-1">
                <Label className="text-xs">Copiar desde</Label>
                <Select value={weekCopySource} onValueChange={handleWeekCopySourceChange}>
                  <SelectTrigger className="h-8 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {weekOptions.map((week) => (
                      <SelectItem key={week} value={week}>Semana {week}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 rounded-md border bg-white px-2 py-1 text-xs">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="font-medium">S{weekCopySource}:</span>
                  <span className="truncate text-muted-foreground">{weekCopySourceSummary}</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Pegar en</Label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:flex lg:flex-wrap">
                  {weekOptions.map((week) => {
                    const isSource = week === weekCopySource
                    const isSelected = selectedWeekCopyTargets.includes(week)
                    return (
                      <Button
                        key={week}
                        type="button"
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        className={`h-8 justify-center ${isSelected ? "" : "bg-white"}`}
                        disabled={isSource}
                        onClick={() => toggleWeekCopyTarget(week)}
                      >
                        {isSelected ? <Check className="mr-1 h-3.5 w-3.5" /> : null}
                        S{week}
                      </Button>
                    )
                  })}
                </div>
              </div>
              <Button type="button" size="sm" variant="secondary" onClick={() => void copyWeekDirectly()} disabled={copyingWeeks || !program.id}>
                {copyingWeeks ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Copy className="h-3.5 w-3.5 mr-2" />}
                Copiar en {selectedWeekCopyTargets.length || 0}
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              Portapapeles: {workoutClipboard ? (
                workoutClipboard.type === "day"
                  ? `Día “${workoutClipboard.day.name || "Entrenamiento"}”`
                  : `Semana ${workoutClipboard.weekNumber}`
              ) : "vacío"}
            </div>
          </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2">
            {DAY_OPTIONS.map((day) => <div key={day}>{day.slice(0, 3)}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date) => {
              const dayName = getSpanishDayName(date)
              const calendarWeek = getCalendarWeekNumber(date, calendarStartDate)
              const programWeek = programWeekFromCalendarGridWeek(calendarWeek, program.durationWeeks || 4)
              const dayWorkouts = program.weeklySchedule
                .map((workoutDay, index) => ({ workoutDay, index }))
                .filter((item) => item.workoutDay.day === dayName && getWorkoutWeekNumber(item.workoutDay, item.index) === programWeek)
                .map((item) => item.workoutDay)
              const isCurrentMonth = date.getMonth() === calendarMonth.getMonth()
              const isSelected = isSameCalendarDay(date, selectedCalendarDate)
              const hasTraining = dayWorkouts.some((day) => !day.isRestDay && day.exercises.length > 0)
              const dateKey = formatCalendarDateKey(date)
              const dateLogs = calendarWorkoutLogs.filter((log) => log.date === dateKey)
              const hasCompletedLog = dateLogs.some((log) => log.completed)
              const hasPartialLog = dateLogs.length > 0 && !hasCompletedLog
              const progressClass = hasCompletedLog
                ? "bg-emerald-50 border-emerald-300"
                : hasPartialLog
                  ? "bg-amber-50 border-amber-300"
                  : isCurrentMonth
                    ? "bg-white"
                    : "bg-slate-50 text-muted-foreground"

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => {
                    syncSelectionFromDate(date, programWeek, dayName)
                  }}
                  className={`min-h-[82px] rounded-lg border p-2 text-left transition ${
                    isSelected ? "border-purple-500 bg-purple-50 shadow-sm" : "hover:border-purple-300 hover:bg-purple-50/40"
                  } ${progressClass}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-semibold">{date.getDate()}</span>
                    {hasCompletedLog ? (
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" title="Día completado" />
                    ) : hasPartialLog ? (
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-400" title="Día parcial" />
                    ) : hasTraining ? (
                      <Dumbbell className="h-3.5 w-3.5 text-purple-600" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </div>
                  <div className="mt-2 space-y-1">
                    {dayWorkouts.length > 0 ? (
                      dayWorkouts.slice(0, 2).map((item, index) => (
                        <div key={`${item.id || item.localId || index}-${date.toISOString()}`} className="truncate rounded bg-purple-100 px-1.5 py-0.5 text-[10px] text-purple-800">
                          {item.isRestDay ? "Descanso" : `S${programWeek} · ${item.name}`}
                        </div>
                      ))
                    ) : (
                      <div className="text-[10px] text-muted-foreground">Sin rutina</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
      ) : null}

      {/* Editor del día seleccionado */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Semana {activeWeek} · {activeDayName}</h3>
            <p className="text-sm text-muted-foreground">
              {selectedWorkoutDays.length === 0
                ? "Toca el día arriba o usa el botón para crear la rutina"
                : selectedWorkoutDays[0]?.workoutDay.isRestDay
                  ? "Día de descanso"
                  : `${selectedWorkoutDays[0]?.workoutDay.exercises.length ?? 0} ejercicios`}
            </p>
          </div>
          {selectedWorkoutDays.length === 0 ? (
            <Button
              onClick={() => addWorkoutDay(activeDayName, activeWeek)}
              className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white border-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear entrenamiento
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => {
                const first = selectedWorkoutDays[0]
                if (!first) return
                addExercise(first.workoutDay.id ?? first.workoutDay.localId ?? String(first.index))
              }}
              disabled={selectedWorkoutDays[0]?.workoutDay.isRestDay}
            >
              <Plus className="h-4 w-4 mr-1" />
              Añadir ejercicio
            </Button>
          )}
        </div>

        {selectedWorkoutDays.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-5 text-center text-sm text-muted-foreground space-y-3">
              <p>No hay rutina para Semana {activeWeek} · {activeDayName}.</p>
              {workoutClipboard ? (
                <Button type="button" variant="secondary" size="sm" onClick={() => pasteClipboardToSelectedDate(activeWeek)}>
                  <ClipboardPaste className="h-3.5 w-3.5 mr-2" />
                  Pegar copiado aquí
                </Button>
              ) : (
                <p className="text-xs">Toca el día en la franja superior para crearlo al instante.</p>
              )}
            </CardContent>
          </Card>
        )}

        {selectedWorkoutDays.map(({ workoutDay: day, index }) => (
          <Card key={day.id ?? day.localId ?? index} className="backdrop-blur-sm bg-white/80 border-0 shadow-lg">
            {(() => {
              const dayKey = day.id ?? day.localId ?? String(index)
              const weekNumber = getWorkoutWeekNumber(day, index)
              return (
                <>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <CardTitle className="text-base flex items-center gap-2 min-w-0">
                  {day.isRestDay ? (
                    <div className="p-2 bg-gray-200 rounded-full shrink-0">
                      <Clock className="h-4 w-4 text-gray-600" />
                    </div>
                  ) : (
                    <div className="p-2 bg-gradient-to-r from-purple-400 to-violet-500 rounded-full shrink-0">
                      <Dumbbell className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <span className="truncate">{day.name || `Semana ${weekNumber} · ${day.day}`}</span>
                </CardTitle>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Select value={day.day} onValueChange={(value) => moveWorkoutDayToDay(dayKey, value)}>
                    <SelectTrigger className="h-8 w-[7.5rem] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAY_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>{option.slice(0, 3)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyWorkoutDayToClipboard(day)}
                    className="h-8 w-8"
                    title="Copiar día"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => deleteWorkoutDay(dayKey)}
                    className="h-8 w-8 text-red-600 hover:bg-red-50"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Nombre del entrenamiento</Label>
                  <Input
                    value={day.name}
                    onChange={(e) => updateWorkoutDay(dayKey, { name: e.target.value })}
                    className="border-2 border-gray-200 focus:border-purple-400"
                    disabled={day.isRestDay}
                    placeholder="Ej: Pierna, Push, Full body..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duración (min)</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="number"
                      value={day.duration}
                      onChange={(e) => updateWorkoutDay(dayKey, { duration: Number(e.target.value) })}
                      className="pl-10 border-2 border-gray-200 focus:border-purple-400"
                      disabled={day.isRestDay}
                    />
                  </div>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer touch-manipulation">
                    <input
                      type="checkbox"
                      id={`rest-day-${day.id ?? index}`}
                      checked={day.isRestDay}
                      onChange={(e) => updateWorkoutDay(dayKey, { isRestDay: e.target.checked })}
                      className="rounded h-4 w-4"
                      title="Marcar como día de descanso"
                      aria-label="Marcar como día de descanso"
                    />
                    <Label htmlFor={`rest-day-${day.id ?? index}`} className="cursor-pointer">Día de descanso</Label>
                  </label>
                </div>
              </div>

              {!day.isRestDay && (
                <>
                  <div className="space-y-3">
                    {day.exercises.map((exercise, exerciseIndex) => (
                      (() => {
                        const exerciseKey = exercise.id ?? exercise.localId ?? String(exerciseIndex)
                        return (
                      <div
                        key={exercise.id ?? exercise.localId ?? exerciseIndex}
                        className="p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200"
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <h5 className="font-medium text-purple-800 text-sm pt-1 line-clamp-2 flex-1 min-w-0">
                            {exercise.name?.trim() || `Ejercicio ${exerciseIndex + 1}`}
                          </h5>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openReplaceExerciseDialog(dayKey, exerciseKey, exercise)}
                              className="h-8 w-8 border-purple-300 text-purple-700 hover:bg-purple-50"
                              title="Sustituir"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => moveExercise(dayKey, exerciseKey, "up")}
                              disabled={exerciseIndex === 0}
                              className="h-8 w-8"
                              title="Subir"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => moveExercise(dayKey, exerciseKey, "down")}
                              disabled={exerciseIndex === day.exercises.length - 1}
                              className="h-8 w-8"
                              title="Bajar"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => deleteExercise(dayKey, exerciseKey)}
                              className="h-8 w-8 text-red-600 hover:bg-red-50"
                              title="Eliminar"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-1 mb-2">
                          <Label className="text-xs">Nombre</Label>
                          <Input
                            value={exercise.name}
                            onChange={(e) => updateExercise(dayKey, exerciseKey, { name: e.target.value })}
                            className="h-9 text-sm border-purple-300 focus:border-purple-500"
                            placeholder="Nombre del ejercicio"
                          />
                        </div>

                        <div className="grid grid-cols-4 gap-2 mb-2">
                          <div className="space-y-1">
                            <Label className="text-[10px]">Series</Label>
                            <Input
                              type="number"
                              value={exercise.sets}
                              onChange={(e) =>
                                updateExercise(dayKey, exerciseKey, { sets: Number(e.target.value) })
                              }
                              className="h-9 text-sm border-purple-300 focus:border-purple-500 px-2"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">Reps</Label>
                            <Input
                              value={exercise.reps}
                              onChange={(e) => updateExercise(dayKey, exerciseKey, { reps: e.target.value })}
                              type="text"
                              inputMode="text"
                              autoComplete="off"
                              className="h-9 text-sm border-purple-300 focus:border-purple-500 px-2"
                              placeholder="8-10"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">Desc.</Label>
                            <Input
                              type="number"
                              value={exercise.rest}
                              onChange={(e) =>
                                updateExercise(dayKey, exerciseKey, { rest: Number(e.target.value) })
                              }
                              className="h-9 text-sm border-purple-300 focus:border-purple-500 px-2"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">Peso</Label>
                            <Input
                              value={exercise.weight}
                              onChange={(e) => updateExercise(dayKey, exerciseKey, { weight: e.target.value })}
                              className="h-9 text-sm border-purple-300 focus:border-purple-500 px-2"
                              placeholder="kg"
                            />
                          </div>
                        </div>

                        <details className="group">
                          <summary className="text-xs text-purple-700 cursor-pointer list-none flex items-center gap-1">
                            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                            Notas técnicas
                          </summary>
                          <div className="space-y-1 mt-2">
                            <Textarea
                              value={exercise.notes}
                              onChange={(e) => updateExercise(dayKey, exerciseKey, { notes: e.target.value })}
                              className="text-sm border-purple-300 focus:border-purple-500"
                              rows={2}
                              placeholder="Técnica, consejos..."
                            />
                          </div>
                        </details>
                      </div>
                        )
                      })()
                    ))}

                    {day.exercises.length === 0 && (
                      <button
                        type="button"
                        onClick={() => addExercise(dayKey)}
                        className="w-full rounded-lg border-2 border-dashed border-purple-200 py-8 text-center text-purple-700 hover:bg-purple-50/50 transition-colors touch-manipulation"
                      >
                        <Plus className="h-6 w-6 mx-auto mb-2 opacity-70" />
                        <p className="text-sm font-medium">Añadir primer ejercicio</p>
                      </button>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addExercise(dayKey)}
                    className="w-full text-purple-600 border-purple-300 hover:bg-purple-50"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Añadir ejercicio
                  </Button>
                </>
              )}
            </CardContent>
                </>
              )
            })()}
          </Card>
        ))}
      </div>

      {/* Botones de acción — fijos en móvil para evitar scroll hasta abajo */}
      <div className="h-20 md:h-0" aria-hidden="true" />
      <div className="fixed bottom-0 inset-x-0 z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:border-0 md:bg-transparent md:p-0 md:pt-6">
        <div className="flex gap-2 max-w-3xl mx-auto md:max-w-none">
          <Button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="flex-1 md:flex-none bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 h-11"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!confirmDiscardChanges()) return
              updateUnsavedChanges(false)
              void loadUserProgram({ silent: true })
            }}
            disabled={saving}
            className="shrink-0 h-11"
          >
            Cancelar
          </Button>
        </div>
      </div>

      <Dialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sustituir ejercicio</DialogTitle>
            <DialogDescription>
              Cambia “{replaceTarget?.oldExerciseName || "este ejercicio"}” por otro ejercicio. Se aplicará desde esta posición y en sus futuras apariciones.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar ejercicio..."
                value={exerciseSearch}
                onChange={(event) => setExerciseSearch(event.target.value)}
              />
            </div>

            {loadingExercises ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando ejercicios...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                {filteredReplacementExercises.map((exercise) => (
                  <Button
                    key={exercise.id}
                    variant="outline"
                    className="justify-start h-auto whitespace-normal py-3"
                    onClick={() => replaceExerciseInFutureSequence(exercise)}
                  >
                    <div className="text-left">
                      <div className="font-medium text-sm">{fixEncoding(exercise.name)}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {exercise.category && (
                          <Badge variant="outline" className="text-[10px]">
                            {fixEncoding(exercise.category)}
                          </Badge>
                        )}
                        {exercise.muscle_groups?.map((muscle) => (
                          <Badge variant="secondary" className="text-[10px]" key={muscle}>
                            {fixEncoding(muscle)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReplaceDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
