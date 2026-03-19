"use client"

import { useMemo, useState } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts"
import { Activity, Loader2, Moon, RefreshCw, TrendingUp } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import { useAdminUserSleepPerformance } from "@/hooks/use-admin-user-sleep-performance"

interface Props {
  userId: string
}

export function UserSleepPerformancePanel({ userId }: Props) {
  const [days, setDays] = useState<14 | 30 | 60 | 90>(30)
  const { data, loading, error, refetch } = useAdminUserSleepPerformance(userId, days)

  const timelineData = useMemo(() => {
    const points = data?.points ?? []
    return points.map(point => ({
      ...point,
      short_date: new Date(point.date).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
      }),
    }))
  }, [data?.points])

  const scatterData = useMemo(() => {
    return timelineData
      .filter(point => point.sleep_hours != null && point.workout_avg_rating != null)
      .map(point => ({
        x: point.sleep_hours,
        y: point.workout_avg_rating,
        date: point.date,
        motivation_score: point.motivation_score,
        workout_count: point.workout_count,
        workout_avg_duration_minutes: point.workout_avg_duration_minutes,
        workout_avg_calories_burned: point.workout_avg_calories_burned,
      }))
  }, [timelineData])

  const summary = data?.summary
  const correlation = summary?.sleep_vs_rating_correlation ?? null

  const correlationLabel = useMemo(() => {
    if (correlation == null) return "Sin datos suficientes"
    if (correlation >= 0.6) return "Correlación alta positiva"
    if (correlation >= 0.25) return "Correlación positiva moderada"
    if (correlation > -0.25) return "Relación débil o neutra"
    if (correlation > -0.6) return "Correlación negativa moderada"
    return "Correlación alta negativa"
  }, [correlation])

  const workoutDaysWithData = useMemo(
    () => timelineData.filter(point => point.workout_completed).length,
    [timelineData]
  )

  const lastEntries = useMemo(() => [...timelineData].reverse().slice(0, 20), [timelineData])

  return (
    <Card className="border border-indigo-100 shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-indigo-700">
              <Moon className="h-5 w-5" />
              Sueño vs rendimiento
            </CardTitle>
            <CardDescription>
              Relación entre horas de sueño, motivación y calidad de entrenamiento del usuario
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refrescar
          </Button>
        </div>

        <div className="flex gap-2 text-xs flex-wrap">
          {[14, 30, 60, 90].map(option => (
            <Button
              key={option}
              size="sm"
              variant={days === option ? "default" : "outline"}
              className={cn("h-8", days === option ? "" : "bg-white")}
              onClick={() => setDays(option as typeof days)}
            >
              {option}d
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <StatCard label="Días con bienestar" value={summary?.wellness_days ?? 0} icon={<Moon className="h-4 w-4 text-indigo-600" />} />
          <StatCard label="Días con entreno" value={summary?.workout_days ?? workoutDaysWithData} icon={<Activity className="h-4 w-4 text-emerald-600" />} />
          <StatCard label="Pares comparables" value={summary?.sleep_rating_pairs ?? scatterData.length} icon={<TrendingUp className="h-4 w-4 text-amber-600" />} />
          <div className="rounded-lg border p-3 bg-white/60">
            <p className="text-xs text-muted-foreground">Correlación sueño/rendimiento</p>
            <div className="flex items-center justify-between gap-3 mt-1">
              <p className="text-sm font-semibold">{correlation != null ? correlation.toFixed(4) : "—"}</p>
              <Badge variant="outline">{correlationLabel}</Badge>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando análisis de sueño y rendimiento...
          </div>
        ) : timelineData.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos suficientes para mostrar el análisis.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium mb-2">Evolución temporal</p>
                <ChartContainer
                  config={{
                    sleep_hours: { label: "Sueño", color: "hsl(var(--chart-2))" },
                    workout_avg_rating: { label: "Rendimiento", color: "hsl(var(--chart-1))" },
                  }}
                  className="h-72"
                >
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="short_date" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} domain={[0, 12]} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} domain={[0, 5]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line yAxisId="left" type="monotone" dataKey="sleep_hours" stroke="var(--color-sleep_hours)" strokeWidth={2} connectNulls={false} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="workout_avg_rating" stroke="var(--color-workout_avg_rating)" strokeWidth={2} connectNulls={false} dot={false} />
                  </LineChart>
                </ChartContainer>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Relación directa sueño vs rendimiento</p>
                <ChartContainer
                  config={{
                    rendimiento: { label: "Rendimiento", color: "hsl(var(--chart-4))" },
                  }}
                  className="h-72"
                >
                  <ScatterChart margin={{ top: 12, right: 12, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="x" name="Sueño" tick={{ fontSize: 10 }} domain={[0, 12]} />
                    <YAxis type="number" dataKey="y" name="Rendimiento" tick={{ fontSize: 10 }} domain={[0, 5]} />
                    <ChartTooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      content={<ChartTooltipContent
                        formatter={(value, name, item) => {
                          if (name === "y") return [value, "Rendimiento"]
                          if (name === "x") return [`${value} h`, "Sueño"]
                          return [value, name]
                        }}
                        labelFormatter={(_, payload) => {
                          const point = payload?.[0]?.payload
                          return point?.date ? new Date(point.date).toLocaleDateString("es-ES") : "Relación"
                        }}
                      />}
                    />
                    <Scatter data={scatterData} fill="var(--color-rendimiento)" />
                  </ScatterChart>
                </ChartContainer>
              </div>
            </div>

            <div className="rounded-xl border bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div>
                  <p className="text-sm font-medium">Lectura del análisis</p>
                  <p className="text-sm text-muted-foreground">
                    Ventana analizada: {data?.from ? new Date(data.from).toLocaleDateString("es-ES") : "—"} - {data?.to ? new Date(data.to).toLocaleDateString("es-ES") : "—"}
                  </p>
                </div>
                <Badge variant="secondary">{correlationLabel}</Badge>
              </div>
              <p className="text-sm text-slate-700 mt-3">
                {correlation == null
                  ? "Todavía no hay suficientes días con sueño registrado y entrenamientos valorados para calcular una relación fiable."
                  : correlation > 0
                    ? "Cuanto mayor es el descanso, mejor tiende a comportarse la valoración media del entrenamiento en este período."
                    : correlation < 0
                      ? "En este período, más sueño no se está traduciendo en mejor valoración media del entrenamiento; conviene revisar calidad del descanso o carga de trabajo."
                      : "No se aprecia una relación clara entre sueño y rendimiento en el período analizado."}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Detalle diario</p>
              <div className="space-y-2">
                {lastEntries.map(entry => (
                  <div key={entry.date} className="rounded-lg border p-3 bg-white/70">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{new Date(entry.date).toLocaleDateString("es-ES")}</Badge>
                        <Badge variant="secondary">Sueño: {entry.sleep_hours != null ? `${entry.sleep_hours} h` : "—"}</Badge>
                        <Badge variant="secondary">Motivación: {entry.motivation_score != null ? `${entry.motivation_score}/5` : "—"}</Badge>
                        <Badge variant="secondary">Entrenos: {entry.workout_count}</Badge>
                      </div>
                      <div className="text-sm font-medium text-slate-700">
                        Rendimiento medio: {entry.workout_avg_rating != null ? `${entry.workout_avg_rating}/5` : "—"}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3 text-sm text-muted-foreground">
                      <div>Duración media: {entry.workout_avg_duration_minutes != null ? `${entry.workout_avg_duration_minutes} min` : "—"}</div>
                      <div>Calorías medias: {entry.workout_avg_calories_burned != null ? `${entry.workout_avg_calories_burned} kcal` : "—"}</div>
                      <div>Entreno completado: {entry.workout_completed ? "Sí" : "No"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3 bg-white/60">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className="text-sm font-semibold mt-1">{value}</p>
    </div>
  )
}