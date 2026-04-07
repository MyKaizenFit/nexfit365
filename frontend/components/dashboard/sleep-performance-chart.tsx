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
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"
import { Activity, Loader2, Moon, RefreshCw, TrendingUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useSleepPerformance } from "@/hooks/use-sleep-performance"

const PERIOD_OPTIONS = [14, 30, 60, 90] as const
type Period = (typeof PERIOD_OPTIONS)[number]

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3 bg-white/60">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}

function correlationLabel(r: number | null): string {
  if (r == null) return "Sin datos suficientes"
  if (r >= 0.6) return "Correlación alta positiva"
  if (r >= 0.25) return "Correlación positiva moderada"
  if (r > -0.25) return "Relación débil o neutra"
  if (r > -0.6) return "Correlación negativa moderada"
  return "Correlación alta negativa"
}

function correlationColor(r: number | null): string {
  if (r == null) return "secondary"
  if (r >= 0.6) return "default"
  if (r >= 0.25) return "secondary"
  if (r > -0.25) return "outline"
  return "destructive"
}

export function SleepPerformanceChart() {
  const [days, setDays] = useState<Period>(30)
  const { data, loading, error, refetch } = useSleepPerformance(days)

  const timelineData = useMemo(() => {
    return (data?.points ?? []).map(point => ({
      ...point,
      short_date: new Date(point.date).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
      }),
    }))
  }, [data?.points])

  const scatterData = useMemo(() => {
    return timelineData
      .filter(p => p.sleep_hours != null && p.workout_avg_rating != null)
      .map(p => ({
        x: p.sleep_hours as number,
        y: p.workout_avg_rating as number,
        date: p.date,
      }))
  }, [timelineData])

  const summary = data?.summary
  const correlation = summary?.sleep_vs_rating_correlation ?? null
  const label = correlationLabel(correlation)
  const badgeVariant = correlationColor(correlation) as "default" | "secondary" | "outline" | "destructive"

  return (
    <Card className="border border-indigo-100 shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-indigo-700">
              <Moon className="h-5 w-5" />
              Sueño vs Rendimiento
            </CardTitle>
            <CardDescription>
              Relación entre tus horas de sueño, motivación y calidad de tus entrenamientos
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Actualizar
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {PERIOD_OPTIONS.map(option => (
            <Button
              key={option}
              size="sm"
              variant={days === option ? "default" : "outline"}
              className={cn("h-8", days !== option && "bg-white")}
              onClick={() => setDays(option)}
            >
              {option}d
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Estadísticas resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Días con bienestar"
            value={summary?.wellness_days ?? 0}
            icon={<Moon className="h-4 w-4 text-indigo-500" />}
          />
          <StatCard
            label="Días con entreno"
            value={summary?.workout_days ?? 0}
            icon={<Activity className="h-4 w-4 text-emerald-500" />}
          />
          <StatCard
            label="Pares comparables"
            value={summary?.sleep_rating_pairs ?? 0}
            icon={<TrendingUp className="h-4 w-4 text-amber-500" />}
          />
          <div className="rounded-lg border p-3 bg-white/60 col-span-2 sm:col-span-1">
            <p className="text-xs text-muted-foreground mb-1">Correlación sueño/rendimiento</p>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xl font-bold">
                {correlation != null ? correlation.toFixed(2) : "—"}
              </p>
              <Badge variant={badgeVariant} className="text-xs whitespace-nowrap">
                {label}
              </Badge>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando análisis...
          </div>
        ) : timelineData.length === 0 ? (
          <div className="rounded-xl border bg-slate-50 p-8 text-center space-y-2">
            <Moon className="h-10 w-10 text-indigo-300 mx-auto" />
            <p className="font-medium text-gray-700">Sin datos suficientes</p>
            <p className="text-sm text-muted-foreground">
              Registra tu sueño y motivación diariamente desde el widget de bienestar para ver esta gráfica.
            </p>
          </div>
        ) : (
          <>
            {/* Gráfico de evolución temporal */}
            <div>
              <p className="text-sm font-medium mb-3 text-gray-700">Evolución temporal</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="short_date"
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      yAxisId="sleep"
                      domain={[0, 12]}
                      tick={{ fontSize: 10 }}
                      label={{ value: "h sueño", angle: -90, position: "insideLeft", fontSize: 10, dx: -4 }}
                    />
                    <YAxis
                      yAxisId="rating"
                      orientation="right"
                      domain={[0, 5]}
                      tick={{ fontSize: 10 }}
                      label={{ value: "rendimiento", angle: 90, position: "insideRight", fontSize: 10, dx: 4 }}
                    />
                    <Tooltip
                      labelFormatter={label => `Fecha: ${label}`}
                      formatter={(value: number, name: string) => {
                        if (name === "sleep_hours") return [`${value} h`, "Sueño"]
                        if (name === "workout_avg_rating") return [value, "Rendimiento"]
                        return [value, name]
                      }}
                    />
                    <Legend
                      formatter={(value: string) => {
                        const labels: Record<string, string> = {
                          sleep_hours: "Horas de sueño",
                          workout_avg_rating: "Rendimiento entreno",
                        }
                        return labels[value] ?? value
                      }}
                    />
                    <Line
                      yAxisId="sleep"
                      type="monotone"
                      dataKey="sleep_hours"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                    <Line
                      yAxisId="rating"
                      type="monotone"
                      dataKey="workout_avg_rating"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 justify-center mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-indigo-500" /> Horas de sueño (eje izq.)</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-emerald-500" /> Rendimiento 0-5 (eje der.)</span>
              </div>
            </div>

            {/* Gráfico de dispersión sueño → rendimiento */}
            {scatterData.length >= 3 && (
              <div>
                <p className="text-sm font-medium mb-3 text-gray-700">
                  Relación directa: sueño → rendimiento
                </p>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 4, right: 16, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name="Sueño"
                        domain={[0, 12]}
                        tick={{ fontSize: 10 }}
                        label={{ value: "horas de sueño", position: "insideBottom", offset: -12, fontSize: 10 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name="Rendimiento"
                        domain={[0, 5]}
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        formatter={(value: number, name: string) => {
                          if (name === "Sueño") return [`${value} h`, "Sueño"]
                          if (name === "Rendimiento") return [value, "Rendimiento"]
                          return [value, name]
                        }}
                        labelFormatter={(_, payload) => {
                          const d = (payload?.[0]?.payload as { date?: string })?.date
                          return d ? new Date(d).toLocaleDateString("es-ES") : ""
                        }}
                      />
                      <Scatter data={scatterData} fill="#6366f1" opacity={0.7} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Interpretación */}
            <div className="rounded-xl border bg-indigo-50/60 p-4 space-y-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm font-medium text-indigo-800">Interpretación del análisis</p>
                <Badge variant={badgeVariant}>{label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {correlation != null ? (
                  <>
                    Analizados {summary?.sleep_rating_pairs ?? 0} días con datos de sueño y entrenamiento
                    durante el período{" "}
                    {data?.from ? new Date(data.from).toLocaleDateString("es-ES") : "—"} -{" "}
                    {data?.to ? new Date(data.to).toLocaleDateString("es-ES") : "—"}.
                    {" "}Coeficiente de correlación de Pearson: <strong>{correlation.toFixed(4)}</strong>.
                  </>
                ) : (
                  "Registra más días con datos de sueño y entrenamientos completados para ver el análisis de correlación."
                )}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
