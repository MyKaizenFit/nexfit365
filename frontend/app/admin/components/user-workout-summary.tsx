"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, RefreshCw, Dumbbell, Activity, Clock, Edit, Trash2, TrendingUp } from "lucide-react"
import { useAdminUserWorkouts } from "@/hooks/use-admin-user-workouts"
import { useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts"

export function UserWorkoutSummary({ userId }: { userId: string }) {
  const { program, logs, totals, stats, loading, error, refetch, updateLog, deleteLog } = useAdminUserWorkouts(userId)
  const [editing, setEditing] = useState<{ id: string; duration_minutes?: number | null; calories_burned?: number | null; rating?: number | null }> | null>(null)
  const [saving, setSaving] = useState(false)

  const todaysWorkout = program?.program?.days?.[0] || null

  const startEdit = (log: any) => {
    setEditing({
      id: log.id,
      duration_minutes: log.duration_minutes ?? null,
      calories_burned: log.calories_burned ?? null,
      rating: log.rating ?? null,
    })
  }

  const handleSave = async () => {
    if (!editing) return
    try {
      setSaving(true)
      await updateLog(editing.id, {
        duration_minutes: editing.duration_minutes ?? undefined,
        calories_burned: editing.calories_burned ?? undefined,
        rating: editing.rating ?? undefined,
      })
      setEditing(null)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading && !program) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Resumen de entrenamientos
          </CardTitle>
          <CardDescription>Cargando datos del usuario...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparando resumen
        </CardContent>
      </Card>
    )
  }

  const activeProgram = program?.program
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader className="flex items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4" />
              Programa de entrenamiento
            </CardTitle>
            <CardDescription>Plan asignado y datos clave</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualizar
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{activeProgram?.name || "Sin programa"}</Badge>
            {program?.summary?.days_per_week ? (
              <Badge variant="outline">{program.summary.days_per_week} días/sem</Badge>
            ) : null}
            {program?.summary?.duration_weeks ? (
              <Badge variant="outline">{program.summary.duration_weeks} semanas</Badge>
            ) : null}
            {activeProgram?.goal ? <Badge variant="outline" className="capitalize">{activeProgram.goal}</Badge> : null}
            {program?.summary?.is_active === false ? <Badge variant="destructive">Inactivo</Badge> : null}
          </div>

          <Separator />

          {activeProgram ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Nivel</p>
                <p className="font-semibold capitalize">{activeProgram.difficulty || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Ubicación</p>
                <p className="font-semibold capitalize">{activeProgram.location || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Días totales</p>
                <p className="font-semibold">{program?.summary?.total_days ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Días de entrenamiento</p>
                <p className="font-semibold">{program?.summary?.training_days ?? "—"}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay programa asignado.</p>
          )}

          <Separator />
          <div>
            <p className="text-sm font-medium mb-2">Entrenamiento del día</p>
            {todaysWorkout ? (
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{todaysWorkout.name || todaysWorkout.day}</p>
                <p className="text-muted-foreground">
                  {todaysWorkout.duration ? `${todaysWorkout.duration} min` : "Duración no especificada"}
                </p>
                <div className="text-xs text-muted-foreground">
                  {(todaysWorkout.exercises || []).slice(0, 5).map((ex: any, idx: number) => (
                    <div key={idx} className="flex justify-between">
                      <span className="truncate">{ex.name}</span>
                      <span>{ex.sets}x{ex.reps}</span>
                    </div>
                  ))}
                  {(todaysWorkout.exercises || []).length === 0 && <p>Sin ejercicios cargados.</p>}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No hay entrenamiento disponible.</p>
            )}
          </div>

          {stats && (
            <>
              <Separator />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <Stat label="Sesiones totales" value={stats.total_logs ?? 0} />
                <Stat label="Completadas" value={stats.totals?.completed_sessions ?? 0} />
                <Stat label="Duración total" value={`${stats.totals?.duration_minutes ?? 0} min`} />
                <Stat label="Calorías totales" value={`${stats.totals?.calories_burned ?? 0} kcal`} />
                <Stat label="Promedio duración" value={`${stats.totals?.avg_duration ?? 0} min`} />
                <Stat label="Logs 30d" value={stats.last_30_days?.logs ?? 0} />
                <Stat label="Tonelaje 30d" value={`${Math.round(stats.last_30_days?.tonnage ?? 0)} kg`} />
                <Stat label="Promedio 30d" value={`${stats.last_30_days?.avg_duration ?? 0} min`} />
              </div>

              {stats.streaks && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <Stat label="Racha actual" value={`${stats.streaks.current || 0} días`} />
                  <Stat label="Racha más larga" value={`${stats.streaks.longest || 0} días`} />
                </div>
              )}

              {stats.top_exercises && stats.top_exercises.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <TrendingUp className="h-4 w-4" />
                    Top ejercicios (tonelaje / PR)
                  </div>
                  <div className="grid gap-2">
                    {stats.top_exercises.map((ex: any, idx: number) => (
                      <div key={`${ex.name}-${idx}`} className="flex items-center justify-between rounded-lg border p-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{idx + 1}</Badge>
                          <span className="text-sm font-semibold">{ex.name}</span>
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>Tnl: {Math.round(ex.tonnage || 0)} kg</span>
                          <span>PR: {ex.pr ? `${ex.pr} kg` : "—"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {stats.top_muscle_groups && stats.top_muscle_groups.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <TrendingUp className="h-4 w-4" />
                    Volumen por grupo muscular (30d)
                  </div>
                  <ChartContainer
                    config={{
                      tonnage: { label: "Tonnage", color: "hsl(var(--chart-2))" },
                    }}
                    className="h-56"
                  >
                    <BarChart data={stats.top_muscle_groups}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="muscle_group" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="tonnage" fill="var(--color-tonnage)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </div>
              )}

              {stats.weekly_volume && stats.weekly_volume.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <TrendingUp className="h-4 w-4" />
                    Volumen semanal (8s)
                  </div>
                  <ChartContainer
                    config={{
                      tonnage: { label: "Tonnage", color: "hsl(var(--chart-3))" },
                      sessions: { label: "Sesiones", color: "hsl(var(--chart-4))" },
                    }}
                    className="h-60"
                  >
                    <LineChart data={stats.weekly_volume}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week_start" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="tonnage" stroke="var(--color-tonnage)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="sessions" stroke="var(--color-sessions)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ChartContainer>
                </div>
              )}

              {stats.exercise_prs && stats.exercise_prs.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <TrendingUp className="h-4 w-4" />
                    PR estimado (1RM)
                  </div>
                  <div className="grid gap-2">
                    {stats.exercise_prs.map((ex: any, idx: number) => (
                      <div key={`${ex.name}-${idx}`} className="flex items-center justify-between rounded-lg border p-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{idx + 1}</Badge>
                          <span className="text-sm font-semibold">{ex.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          1RM: {ex.pr_1rm} kg
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Últimos entrenamientos
          </CardTitle>
          <CardDescription>Registros recientes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {logs && logs.length > 0 ? (
            logs.slice(0, 5).map((log) => (
              <div key={log.id} className="border rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>{log.date}</span>
                  {log.completed ? (
                    <Badge className="bg-green-100 text-green-800 border-0">Completado</Badge>
                  ) : (
                    <Badge variant="outline">Pendiente</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex gap-2 items-center">
                  <Clock className="h-3 w-3" />
                  <span>{log.duration_minutes ?? "—"} min</span>
                  {log.calories_burned ? <span>· {log.calories_burned} kcal</span> : null}
                </div>
                {log.notes ? <p className="text-xs text-muted-foreground line-clamp-2">{log.notes}</p> : null}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="h-8" onClick={() => startEdit(log)}>
                    <Edit className="h-3 w-3 mr-1" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-red-600 hover:text-red-700"
                    onClick={() => deleteLog(log.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Borrar
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sin logs recientes</p>
          )}

          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span>Sesiones completadas</span>
            <span className="font-semibold">{totals?.completed_sessions ?? 0}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Minutos totales</span>
            <span className="font-semibold">{totals?.duration_minutes ?? 0} min</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar log de entrenamiento</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Duración (min)</p>
              <Input
                type="number"
                value={editing?.duration_minutes ?? ""}
                onChange={(e) => setEditing((prev) => prev ? { ...prev, duration_minutes: e.target.value ? Number(e.target.value) : null } : prev)}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Calorías</p>
              <Input
                type="number"
                value={editing?.calories_burned ?? ""}
                onChange={(e) => setEditing((prev) => prev ? { ...prev, calories_burned: e.target.value ? Number(e.target.value) : null } : prev)}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Rating (1-5)</p>
              <Input
                type="number"
                min={1}
                max={5}
                value={editing?.rating ?? ""}
                onChange={(e) => setEditing((prev) => prev ? { ...prev, rating: e.target.value ? Number(e.target.value) : null } : prev)}
              />
            </div>
          </div>
          <DialogFooter className="justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-3 bg-white/60">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  )
}

