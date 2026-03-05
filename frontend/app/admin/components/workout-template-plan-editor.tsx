"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
import { Loader2, Plus, Trash2, Search, Filter } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { handle401AndRefresh } from "@/lib/fetch-with-auth"

type DayKey = "1" | "2" | "3" | "4" | "5" | "6" | "7"

export interface Exercise {
  id: string | number
  name: string
  category?: string
  muscle_groups?: string[]
  description?: string
}

interface WorkoutDayDraft {
  day_number: number
  day_name: string
  is_rest_day: boolean
  notes: string
  exercises: Array<{ exercise_id: string | number; series?: number; reps?: string; rest_seconds?: number; notes?: string }>
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

function toNumber(value: unknown, fallback = 0) {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN
  return Number.isFinite(n) ? n : fallback
}

export function WorkoutTemplatePlanEditor({
  planId,
  availableExercises,
  onSaved,
  onClose,
}: {
  planId: string
  availableExercises: Exercise[]
  onSaved: () => void | Promise<void>
  onClose: () => void
}) {
  const { getAuthHeaders } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeDay, setActiveDay] = useState<DayKey>("1")

  const [days, setDays] = useState<WorkoutDayDraft[]>([])

  // selector ejercicios
  const [showExerciseSelector, setShowExerciseSelector] = useState(false)
  const [exerciseSearch, setExerciseSearch] = useState("")
  const [exerciseCategoryFilter, setExerciseCategoryFilter] = useState("all")
  const [exerciseMuscleFilter, setExerciseMuscleFilter] = useState("all")
  const [targetDayIndex, setTargetDayIndex] = useState<number | null>(null)

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

  const loadPlan = async () => {
    setLoading(true)
    try {
      const data = await fetchJsonWithAuth(`admin/workouts/plans/${planId}/`)

      const incomingDays = Array.isArray(data.days) ? data.days : []
      const mapped: WorkoutDayDraft[] = incomingDays.map((d: any) => {
        const exercises = Array.isArray(d.exercises) ? d.exercises : []
        return {
          day_number: d.day_number || 1,
          day_name: fixEncoding(d.day_name || `Día ${d.day_number || 1}`),
          is_rest_day: d.is_rest_day || false,
          notes: fixEncoding(d.notes || ""),
          exercises: exercises.map((ex: any) => ({
            exercise_id: String(ex.exercise_id || ex.id || ""),
            series: ex.series != null ? toNumber(ex.series) : undefined,
            reps: ex.reps ? String(ex.reps) : undefined,
            rest_seconds: ex.rest_seconds != null ? toNumber(ex.rest_seconds) : undefined,
            notes: ex.notes ? fixEncoding(String(ex.notes)) : undefined,
          })),
        }
      })

      setDays(mapped)
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

  const handleSave = async () => {
    try {
      setSaving(true)

      const daysPayload = days.map((d) => ({
        day_number: d.day_number,
        day_name: d.day_name,
        is_rest_day: d.is_rest_day,
        notes: d.notes,
        exercises: d.exercises.map((e) => ({
          exercise_id: e.exercise_id,
          series: e.series != null ? toNumber(e.series) : null,
          reps: e.reps || null,
          rest_seconds: e.rest_seconds != null ? toNumber(e.rest_seconds) : null,
          notes: e.notes || null,
        })),
      }))

      await patchJsonWithAuth(`admin/workouts/plans/${planId}/`, { days: daysPayload })

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
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Configura los ejercicios para cada día de la semana.
        </div>
      </div>

      <Tabs value={activeDay} onValueChange={(v) => setActiveDay(v as DayKey)}>
        <TabsList className="grid grid-cols-7">
          {(["1", "2", "3", "4", "5", "6", "7"] as DayKey[]).map((d) => {
            const dayNum = Number(d)
            const day = days.find((x) => x.day_number === dayNum)
            return (
              <TabsTrigger key={d} value={d} className="text-xs">
                {DAY_LABELS[d]}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {(["1", "2", "3", "4", "5", "6", "7"] as DayKey[]).map((d) => {
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
                          return (
                            <Card key={idx} className="border">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                  <div className="flex-1">
                                    <div className="font-medium">
                                      {exerciseData ? fixEncoding(exerciseData.name) : `Ejercicio #${String(exercise.exercise_id)}`}
                                    </div>
                                    {exerciseData && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {exerciseData.category && <span>{fixEncoding(exerciseData.category)} • </span>}
                                        {exerciseData.muscle_groups?.map((m) => fixEncoding(m)).join(", ")}
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeExerciseFromDay(dayNum, exercise.exercise_id)}
                                    title="Eliminar ejercicio"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
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
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cerrar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar plan"
          )}
        </Button>
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
    </div>
  )
}
