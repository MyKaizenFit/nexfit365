"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2, Save, Dumbbell, Clock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { buildApiUrl, getAuthHeaders } from "@/lib/api"
import { fixEncoding } from "@/lib/encoding-fix"

interface Exercise {
  id?: string
  name: string
  sets: number
  reps: string
  weight: string
  rest: number
  notes: string
}

interface WorkoutDay {
  id?: string
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
  daysPerWeek: number
  weeklySchedule: WorkoutDay[]
  durationWeeks?: number
  isActive?: boolean
}

export function WorkoutProgramEditor({ userId, onSave }: { userId: string; onSave: () => void }) {
  const [program, setProgram] = useState<WorkoutProgram | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadUserProgram()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const loadUserProgram = async () => {
    try {
      setLoading(true)
      setError(null)

      const headers = await getAuthHeaders()

      // Usar el endpoint de admin que devuelve el programa activo del usuario
      const response = await fetch(buildApiUrl(`admin/workouts/users/${userId}/program/`), {
        headers,
      })

      if (!response.ok) {
        throw new Error("Error al cargar el programa de entrenamiento del usuario")
      }

      const data = await response.json()

      // El endpoint devuelve { user_id, program, summary }
      const detail = data.program

      if (!detail) {
        // Si no tiene programa aún, crear uno vacío en memoria
        setProgram({
          name: "Nuevo Programa de Entrenamientos",
          description: "Programa personalizado para el usuario",
          level: "beginner",
          goal: "general_fitness",
          daysPerWeek: 3,
          weeklySchedule: [],
          durationWeeks: 4,
          isActive: true,
        })
        return
      }


      // Mapear días de la semana: el backend usa day_of_week (monday, tuesday, etc.)
      // pero el componente espera nombres en español
      const dayOfWeekMap: Record<string, string> = {
        monday: "Lunes",
        tuesday: "Martes",
        wednesday: "Miércoles",
        thursday: "Jueves",
        friday: "Viernes",
        saturday: "Sábado",
        sunday: "Domingo",
      }

      // Ordenar días por day_number
      const sortedDays = [...(detail.days || [])].sort((a: any, b: any) => (a.day_number || 0) - (b.day_number || 0))

      const weeklySchedule: WorkoutDay[] = sortedDays.map((day: any, index: number) => ({
        id: day.id,
        day: dayOfWeekMap[day.day_of_week] || day.day_of_week || "Lunes",
        name: fixEncoding(day.name || `Entrenamiento ${index + 1}`),
        duration: day.duration_minutes || 60,
        isRestDay: !!day.is_rest_day,
        dayNumber: day.day_number,
        notes: day.notes || "",
        exercises: (day.exercises || []).map((ex: any, exIndex: number) => ({
          id: ex.id,
          name: fixEncoding(ex.exercise?.name || ex.exercise_name || ex.name || `Ejercicio ${exIndex + 1}`),
          sets: ex.sets ?? 3,
          reps: ex.reps || "10-12",
          weight: ex.weight || "",
          rest: ex.rest_seconds ?? 60,
          notes: ex.notes || "",
        })),
      }))


      setProgram({
        id: detail.id,
        name: fixEncoding(detail.name || "Programa de Entrenamiento"),
        description: detail.description || "",
        level: detail.difficulty || "intermediate", // El backend usa 'difficulty', no 'level'
        goal: detail.goal || "general_fitness",
        daysPerWeek: detail.days_per_week || weeklySchedule.length || 3,
        weeklySchedule,
        durationWeeks: detail.duration_weeks,
        isActive: detail.is_active,
      })
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
        daysPerWeek: 3,
        weeklySchedule: [],
        durationWeeks: 4,
        isActive: true,
      })
    } finally {
      setLoading(false)
    }
  }

  const addWorkoutDay = () => {
    if (!program) return

    const newDay: WorkoutDay = {
      id: undefined,
      day: "Lunes",
      name: "Nuevo entrenamiento",
      duration: 60,
      isRestDay: false,
      exercises: [],
      dayNumber: (program.weeklySchedule.length || 0) + 1,
    }
    setProgram({ ...program, weeklySchedule: [...program.weeklySchedule, newDay] })
  }

  const updateWorkoutDay = (dayId: string | undefined, updates: Partial<WorkoutDay>) => {
    if (!program) return

    setProgram({
      ...program,
      weeklySchedule: program.weeklySchedule.map((day) => (day.id === dayId ? { ...day, ...updates } : day)),
    })
  }

  const deleteWorkoutDay = (dayId: string | undefined) => {
    if (!program) return

    setProgram({
      ...program,
      weeklySchedule: program.weeklySchedule.filter((day) => day.id !== dayId),
    })
  }

  const addExercise = (dayId: string | undefined) => {
    if (!program) return

    const newExercise: Exercise = {
      id: undefined,
      name: "Nuevo ejercicio",
      sets: 3,
      reps: "10-12",
      weight: "",
      rest: 60,
      notes: "",
    }

    const targetDay = program.weeklySchedule.find((d) => d.id === dayId)
    const currentExercises = targetDay?.exercises || []
    updateWorkoutDay(dayId, {
      exercises: [...currentExercises, newExercise],
    })
  }

  const updateExercise = (dayId: string | undefined, exerciseId: string | undefined, updates: Partial<Exercise>) => {
    if (!program) return
    const day = program.weeklySchedule.find((d) => d.id === dayId)
    if (day) {
      const updatedExercises = day.exercises.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, ...updates } : exercise,
      )
      updateWorkoutDay(dayId, { exercises: updatedExercises })
    }
  }

  const deleteExercise = (dayId: string | undefined, exerciseId: string | undefined) => {
    if (!program) return
    const day = program.weeklySchedule.find((d) => d.id === dayId)
    if (day) {
      const updatedExercises = day.exercises.filter((exercise) => exercise.id !== exerciseId)
      updateWorkoutDay(dayId, { exercises: updatedExercises })
    }
  }

  const handleSave = async () => {
    if (!program) return

    try {
      setSaving(true)
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

      const daysPayload = program.weeklySchedule.map((day, index) => ({
        id: day.id,
        day_of_week: dayToDayOfWeekMap[day.day] || day.day.toLowerCase() || "monday",
        name: day.name,
        day_number: day.dayNumber ?? index + 1,
        duration_minutes: day.duration,
        is_rest_day: day.isRestDay,
        notes: day.notes || "",
        order_index: index + 1,
        exercises: day.isRestDay
          ? []
          : day.exercises.map((ex, exIndex) => ({
              id: ex.id,
              exercise_id: null,
              sets: ex.sets,
              reps: ex.reps,
              weight: ex.weight,
              rest_seconds: ex.rest,
              notes: ex.notes,
              order_index: exIndex + 1,
            })),
      }))

      const payload: any = {
        user_id: userId,
        name: program.name,
        description: program.description,
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

      const saved = await response.json()

      if (!program.id && saved.id) {
        setProgram({ ...program, id: saved.id })
      }

      toast({
        title: "✅ Programa de entrenamientos guardado",
        description: "Los cambios han sido aplicados al usuario",
      })

      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
      toast({
        title: "❌ Error",
        description: err instanceof Error ? err.message : "No se pudo guardar el programa de entrenamientos",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading || !program) {
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

  return (
    <div className="space-y-6">
      {/* Header del programa */}
      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
            <Dumbbell className="h-6 w-6" />
            Editor de Programa de Entrenamientos
          </CardTitle>
          <CardDescription>Personaliza el programa de ejercicios del usuario</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="program-name">Nombre del programa</Label>
              <Input
                id="program-name"
                value={program.name}
                onChange={(e) => setProgram({ ...program, name: e.target.value })}
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
                onChange={(e) => setProgram({ ...program, daysPerWeek: Number(e.target.value) })}
                className="border-2 border-gray-200 focus:border-purple-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level">Nivel</Label>
              <Select value={program.level} onValueChange={(value) => setProgram({ ...program, level: value })}>
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
              <Select value={program.goal} onValueChange={(value) => setProgram({ ...program, goal: value })}>
                <SelectTrigger className="border-2 border-gray-200 focus:border-purple-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weight_loss">Pérdida de peso</SelectItem>
                  <SelectItem value="muscle_gain">Ganancia muscular</SelectItem>
                  <SelectItem value="strength_building">Fuerza</SelectItem>
                  <SelectItem value="endurance">Resistencia</SelectItem>
                  <SelectItem value="general_fitness">Fitness general</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="program-description">Descripción</Label>
            <Textarea
              id="program-description"
              value={program.description}
              onChange={(e) => setProgram({ ...program, description: e.target.value })}
              className="border-2 border-gray-200 focus:border-purple-400"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Programa semanal */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Programa Semanal</h3>
          <Button
            onClick={addWorkoutDay}
            className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white border-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Añadir día
          </Button>
        </div>

        {program.weeklySchedule.map((day, index) => (
          <Card key={day.id ?? index} className="backdrop-blur-sm bg-white/80 border-0 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  {day.isRestDay ? (
                    <div className="p-2 bg-gray-200 rounded-full">
                      <Clock className="h-4 w-4 text-gray-600" />
                    </div>
                  ) : (
                    <div className="p-2 bg-gradient-to-r from-purple-400 to-violet-500 rounded-full">
                      <Dumbbell className="h-4 w-4 text-white" />
                    </div>
                  )}
                  Día #{index + 1}
                </CardTitle>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => deleteWorkoutDay(day.id)}
                  className="h-8 w-8 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Día de la semana</Label>
                  <Select value={day.day} onValueChange={(value) => updateWorkoutDay(day.id, { day: value })}>
                    <SelectTrigger className="border-2 border-gray-200 focus:border-purple-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Lunes">Lunes</SelectItem>
                      <SelectItem value="Martes">Martes</SelectItem>
                      <SelectItem value="Miércoles">Miércoles</SelectItem>
                      <SelectItem value="Jueves">Jueves</SelectItem>
                      <SelectItem value="Viernes">Viernes</SelectItem>
                      <SelectItem value="Sábado">Sábado</SelectItem>
                      <SelectItem value="Domingo">Domingo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nombre del entrenamiento</Label>
                  <Input
                    value={day.name}
                    onChange={(e) => updateWorkoutDay(day.id, { name: e.target.value })}
                    className="border-2 border-gray-200 focus:border-purple-400"
                    disabled={day.isRestDay}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duración (minutos)</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="number"
                      value={day.duration}
                      onChange={(e) => updateWorkoutDay(day.id, { duration: Number(e.target.value) })}
                      className="pl-10 border-2 border-gray-200 focus:border-purple-400"
                      disabled={day.isRestDay}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`rest-day-${day.id ?? index}`}
                  checked={day.isRestDay}
                  onChange={(e) => updateWorkoutDay(day.id, { isRestDay: e.target.checked })}
                  className="rounded"
                  title="Marcar como día de descanso"
                  aria-label="Marcar como día de descanso"
                />
                <Label htmlFor={`rest-day-${day.id ?? index}`}>Día de descanso</Label>
              </div>

              {!day.isRestDay && (
                <>
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Ejercicios</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addExercise(day.id)}
                      className="text-purple-600 border-purple-300 hover:bg-purple-50"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Añadir ejercicio
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {day.exercises.map((exercise, exerciseIndex) => (
                      <div
                        key={exercise.id ?? exerciseIndex}
                        className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-purple-800">Ejercicio #{exerciseIndex + 1}</h5>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => deleteExercise(day.id, exercise.id)}
                            className="h-6 w-6 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Nombre del ejercicio</Label>
                            <Input
                              value={exercise.name}
                              onChange={(e) => updateExercise(day.id, exercise.id, { name: e.target.value })}
                              className="h-8 text-sm border-purple-300 focus:border-purple-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Peso/Resistencia</Label>
                            <Input
                              value={exercise.weight}
                              onChange={(e) => updateExercise(day.id, exercise.id, { weight: e.target.value })}
                              className="h-8 text-sm border-purple-300 focus:border-purple-500"
                              placeholder="ej: 80kg, peso corporal"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Series</Label>
                            <Input
                              type="number"
                              value={exercise.sets}
                              onChange={(e) =>
                                updateExercise(day.id, exercise.id, { sets: Number(e.target.value) })
                              }
                              className="h-8 text-sm border-purple-300 focus:border-purple-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Repeticiones</Label>
                            <Input
                              value={exercise.reps}
                              onChange={(e) => updateExercise(day.id, exercise.id, { reps: e.target.value })}
                              className="h-8 text-sm border-purple-300 focus:border-purple-500"
                              placeholder="ej: 8-10, 12"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Descanso (seg)</Label>
                            <Input
                              type="number"
                              value={exercise.rest}
                              onChange={(e) =>
                                updateExercise(day.id, exercise.id, { rest: Number(e.target.value) })
                              }
                              className="h-8 text-sm border-purple-300 focus:border-purple-500"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Notas técnicas</Label>
                          <Textarea
                            value={exercise.notes}
                            onChange={(e) => updateExercise(day.id, exercise.id, { notes: e.target.value })}
                            className="text-sm border-purple-300 focus:border-purple-500"
                            rows={2}
                            placeholder="Técnica, consejos, modificaciones..."
                          />
                        </div>
                      </div>
                    ))}

                    {day.exercises.length === 0 && (
                      <div className="text-center py-6 text-gray-500">
                        <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay ejercicios añadidos</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Botones de acción */}
      <div className="flex gap-4 pt-6">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar programa de entrenamientos
            </>
          )}
        </Button>
        <Button variant="outline" onClick={onSave} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
