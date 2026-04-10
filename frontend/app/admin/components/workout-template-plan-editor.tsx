"use client"

import { useCallback, useEffect, useMemo, useState, forwardRef, useImperativeHandle } from "react"
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
import { fixEncoding } from "@/lib/encoding-fix"
import { Loader2, Plus, Trash2, Search, Filter, ArrowUp, ArrowDown, Shield, X, ChevronUp, ChevronDown } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { handle401AndRefresh } from "@/lib/fetch-with-auth"

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
  exercises: Array<{ exercise_id: string | number; series?: number; reps?: string; rest_seconds?: number; notes?: string }>
}

interface ExerciseSubstituteItem {
  id: string | number
  substitute_id: string
  substitute_name: string
  category?: string
  priority: number
  notes: string
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

function createDefaultWeekDays(): WorkoutDayDraft[] {
  return WEEK_DAY_KEYS.map((key) => {
    const dayNumber = Number(key)
    return {
      day_number: dayNumber,
      day_name: `Día ${dayNumber} - ${DAY_FULL_NAMES[key]}`,
      is_rest_day: true,
      notes: "",
      exercises: [],
    }
  })
}

function toNumber(value: unknown, fallback = 0) {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN
  return Number.isFinite(n) ? n : fallback
}

export const WorkoutTemplatePlanEditor = forwardRef<
  { handleSave: () => Promise<void> },
  {
    planId: string
    availableExercises: Exercise[]
    onSaved: () => void | Promise<void>
    onClose: () => void
    isEmbedded?: boolean
  }
>(function WorkoutTemplatePlanEditor(
  {
    planId,
    availableExercises,
    onSaved,
    onClose,
    isEmbedded = false,
  },
  ref
) {
  const { getAuthHeaders } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeDay, setActiveDay] = useState<DayKey>("1")

  const [days, setDays] = useState<WorkoutDayDraft[]>(createDefaultWeekDays())

  // Expose handleSave via ref
  useImperativeHandle(ref, () => ({
    handleSave: async () => {
      // handleSave defined below
      await handleSaveImpl()
    },
  }))

  // selector ejercicios
  const [showExerciseSelector, setShowExerciseSelector] = useState(false)
  const [exerciseSearch, setExerciseSearch] = useState("")
  const [exerciseCategoryFilter, setExerciseCategoryFilter] = useState("all")
  const [exerciseMuscleFilter, setExerciseMuscleFilter] = useState("all")
  const [targetDayIndex, setTargetDayIndex] = useState<number | null>(null)

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
    const activeNum = Number(activeDay)
    const day = days.find((d) => d.day_number === activeNum)
    return day?.exercises || []
  }, [days, activeDay])

  const fetchJsonWithAuth = useCallback(async (url: string) => {
    let headers = await getAuthHeaders()
    let res = await fetch(buildApiUrl(url), { headers })
    if (res.status === 401) {
      const newHeaders = await handle401AndRefresh(getAuthHeaders)
      if (!newHeaders) throw new Error("Sesión expirada")
      headers = newHeaders
      res = await fetch(buildApiUrl(url), { headers })
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
    })
    if (res.status === 401) {
      const newHeaders = await handle401AndRefresh(getAuthHeaders)
      if (!newHeaders) throw new Error("Sesión expirada")
      headers = newHeaders
      res = await fetch(buildApiUrl(url), {
        method: "PATCH",
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

  const loadPlan = async () => {
    setLoading(true)
    try {
      const data = await fetchJsonWithAuth(`admin/workouts/programs/${planId}/`)

      const incomingDays = Array.isArray(data.days) ? data.days : []
      const mapped: WorkoutDayDraft[] = incomingDays.map((d: any) => {
        const exercises = Array.isArray(d.exercises) ? d.exercises : []
        return {
          day_number: d.day_number || 1,
          day_name: fixEncoding(d.day_name || `Día ${d.day_number || 1}`),
          is_rest_day: d.is_rest_day || false,
          notes: fixEncoding(d.notes || ""),
          exercises: exercises.map((ex: any) => ({
            exercise_id: String(ex.exercise_id || ex.exercise || ex.id || ""),
            series: ex.series != null ? toNumber(ex.series) : (ex.sets != null ? toNumber(ex.sets) : undefined),
            reps: ex.reps ? String(ex.reps) : undefined,
            rest_seconds: ex.rest_seconds != null ? toNumber(ex.rest_seconds) : undefined,
            notes: ex.notes ? fixEncoding(String(ex.notes)) : undefined,
          })),
        }
      })

      const daysByNumber = new Map<number, WorkoutDayDraft>()
      mapped.forEach((day) => {
        daysByNumber.set(day.day_number, day)
      })

      const normalizedDays = WEEK_DAY_KEYS.map((key) => {
        const dayNumber = Number(key)
        const existing = daysByNumber.get(dayNumber)
        return existing || {
          day_number: dayNumber,
          day_name: `Día ${dayNumber} - ${DAY_FULL_NAMES[key]}`,
          is_rest_day: true,
          notes: "",
          exercises: [],
        }
      })

      setDays(normalizedDays)
    } catch (e) {
      toast({
        title: "❌ Error",
        description: e instanceof Error ? e.message : "No se pudo cargar el plan",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId])

  const updateDay = (dayNumber: number, patch: Partial<WorkoutDayDraft>) => {
    setDays((prev) => {
      const next = [...prev]
      const idx = next.findIndex((d) => d.day_number === dayNumber)
      if (idx < 0) return prev
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }

  const openExercisePicker = (dayNum: number) => {
    setTargetDayIndex(dayNum)
    setExerciseSearch("")
    setExerciseCategoryFilter("all")
    setExerciseMuscleFilter("all")
    setShowExerciseSelector(true)
  }

  const addExerciseToDay = (exercise: Exercise) => {
    if (targetDayIndex == null) return
    const dayNum = targetDayIndex

    setDays((prev) => {
      const next = [...prev]
      const day = next.find((d) => d.day_number === dayNum)
      if (!day) return prev

      const already = day.exercises.some((e) => String(e.exercise_id) === String(exercise.id))
      if (already) return prev

      day.exercises = [
        ...day.exercises,
        { exercise_id: String(exercise.id), series: 3, reps: "8-12", rest_seconds: 60, notes: "" },
      ]
      day.is_rest_day = false
      return next
    })
  }

  const moveExerciseUp = (dayNum: number, exerciseIndex: number) => {
    if (exerciseIndex === 0) return
    setDays((prev) => {
      const next = [...prev]
      const day = next.find((d) => d.day_number === dayNum)
      if (!day) return prev
      const currentExercises = [...day.exercises]
      const temp = currentExercises[exerciseIndex]
      currentExercises[exerciseIndex] = currentExercises[exerciseIndex - 1]
      currentExercises[exerciseIndex - 1] = temp
      day.exercises = currentExercises
      return next
    })
  }

  const moveExerciseDown = (dayNum: number, exerciseIndex: number) => {
    setDays((prev) => {
      const next = [...prev]
      const day = next.find((d) => d.day_number === dayNum)
      if (!day || exerciseIndex >= day.exercises.length - 1) return prev
      const currentExercises = [...day.exercises]
      const temp = currentExercises[exerciseIndex]
      currentExercises[exerciseIndex] = currentExercises[exerciseIndex + 1]
      currentExercises[exerciseIndex + 1] = temp
      day.exercises = currentExercises
      return next
    })
  }

  const removeExerciseFromDay = (dayNum: number, exerciseId: string | number) => {
    setDays((prev: WorkoutDayDraft[]) => {
      const next = [...prev]
      const day = next.find((d) => d.day_number === dayNum)
      if (!day) return prev
      day.exercises = day.exercises.filter((e) => String(e.exercise_id) !== String(exerciseId))
      return next
    })
  }

  const updateExerciseInDay = (dayNum: number, exerciseId: string | number, field: string, value: any) => {
    setDays((prev) => {
      const workoutDays = prev as WorkoutDayDraft[]
      const next = [...workoutDays]
      const targetDay = next.find((d) => d.day_number === dayNum)
      if (targetDay === undefined) {
        return workoutDays
      }
      const targetExercise = targetDay.exercises.find((e) => String(e.exercise_id) === String(exerciseId))
      if (targetExercise === undefined) {
        return workoutDays
      }
      (targetExercise as any)[field] = value
      return next
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

  const handleSaveImpl = async () => {
    try {
      setSaving(true)

      const daysPayload = WEEK_DAY_KEYS.map((key) => {
        const dayNumber = Number(key)
        const day = days.find((d) => d.day_number === dayNumber)
        const fallbackDayName = `Día ${dayNumber} - ${DAY_FULL_NAMES[key]}`
        const dayName = day?.day_name?.trim() ? day.day_name : fallbackDayName
        const exercises = Array.isArray(day?.exercises) ? day!.exercises : []
        const hasExercises = exercises.length > 0

        return {
          day_number: dayNumber,
          day_name: dayName,
          is_rest_day: hasExercises ? false : true,
          notes: day?.notes || "",
          exercises: exercises
            .filter((e) => e.exercise_id)
            .map((e) => ({
              exercise_id: e.exercise_id,
              sets: e.series != null ? toNumber(e.series) : 3,
              reps: (e.reps || "10-12").toString(),
              rest_seconds: e.rest_seconds != null ? toNumber(e.rest_seconds) : 60,
              notes: e.notes || "",
            })),
        }
      })

      await patchJsonWithAuth(`admin/workouts/programs/${planId}/`, { days: daysPayload })

      toast({ title: "✅ Plan de entrenamiento guardado", description: "Todos los cambios se han actualizado." })
      await loadPlan()
      await onSaved()
    } catch (e) {
      toast({
        title: "❌ Error",
        description: e instanceof Error ? e.message : "No se pudo guardar",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-3 text-center">
            <div className="text-lg">📅</div>
            <div className="text-xs text-muted-foreground">Día activo</div>
            <div className="text-base font-bold">{DAY_LABELS[activeDay]}</div>
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
            <div className="text-lg">💤</div>
            <div className="text-xs text-muted-foreground">Descanso</div>
            <div className="text-base font-bold">{days.filter((d) => d.exercises.length === 0 || d.is_rest_day).length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Configura ejercicios por día y su orden. Los días sin ejercicios se guardarán automáticamente como descanso.
        </div>
      </div>

      <Tabs value={activeDay} onValueChange={(v) => setActiveDay(v as DayKey)}>
        <TabsList className="grid grid-cols-7 rounded-lg bg-muted p-1 h-auto">
          {WEEK_DAY_KEYS.map((d) => {
            const dayNum = Number(d)
            const day = days.find((x) => x.day_number === dayNum)
            return (
              <TabsTrigger key={d} value={d} className="text-xs rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                {DAY_LABELS[d]}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {WEEK_DAY_KEYS.map((d) => {
          const dayNum = Number(d)
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

                                <div className="grid gap-3 md:grid-cols-3">
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
            <Button onClick={handleSaveImpl} disabled={saving}>
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
            <DialogTitle>Seleccionar ejercicio</DialogTitle>
            <DialogDescription>Elige un ejercicio para agregarlo a este día.</DialogDescription>
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
                  variant={alreadyAdded ? "secondary" : "outline"}
                  className="justify-start h-auto whitespace-normal"
                  onClick={() => {
                    addExerciseToDay(e)
                    setShowExerciseSelector(false)
                  }}
                  disabled={alreadyAdded}
                >
                  <div className="text-left">
                    <div className="font-medium text-sm">{fixEncoding(e.name)}</div>
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
    </div>
  )
})

