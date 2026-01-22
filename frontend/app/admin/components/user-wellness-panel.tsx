"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from "recharts"
import { Loader2, Plus, Edit, Trash2, Activity, Moon, Flame } from "lucide-react"
import { useAdminUserWellness } from "@/hooks/use-admin-user-wellness"
import { cn } from "@/lib/utils"

interface Props {
  userId: string
}

export function UserWellnessPanel({ userId }: Props) {
  const { entries, summary, loading, error, refetch, addEntry, updateEntry, deleteEntry } = useAdminUserWellness(userId)
  const [range, setRange] = useState<14 | 30 | 60 | 0>(30)
  const [showDialog, setShowDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ date: "", sleep_hours: "", motivation_score: "3", notes: "" })
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => {
    const entriesArray = Array.isArray(entries) ? entries : []
    if (range === 0) return entriesArray
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - range)
    return entriesArray.filter(e => e && new Date(e.date) >= cutoff)
  }, [entries, range])

  const periodStats = useMemo(() => {
    const calc = (days: number) => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - days)
      const prevStart = new Date()
      prevStart.setDate(prevStart.getDate() - days * 2)
      const prevEnd = new Date()
      prevEnd.setDate(prevEnd.getDate() - days)

      const entriesArray = Array.isArray(entries) ? entries : []
      const avgField = (list: typeof entriesArray, field: keyof typeof entriesArray[number]) => {
        const listArray = Array.isArray(list) ? list : []
        const vals = listArray.map(e => e ? Number(e[field]) : NaN).filter(v => !Number.isNaN(v))
        if (!vals.length) return null
        return vals.reduce((s, v) => s + v, 0) / vals.length
      }

      const current = entriesArray.filter(e => {
        if (!e) return false
        const d = new Date(e.date)
        return d >= start && d <= end
      })
      const prev = entriesArray.filter(e => {
        if (!e) return false
        const d = new Date(e.date)
        return d >= prevStart && d < prevEnd
      })

      const sleepAvg = avgField(current, "sleep_hours")
      const moodAvg = avgField(current, "motivation_score")
      const prevSleep = avgField(prev, "sleep_hours")
      const prevMood = avgField(prev, "motivation_score")

      const delta = (cur: number | null, prev: number | null) =>
        cur != null && prev != null ? cur - prev : null

      return {
        sleep: sleepAvg,
        mood: moodAvg,
        sleep_delta: delta(sleepAvg, prevSleep),
        mood_delta: delta(moodAvg, prevMood),
      }
    }
    return { p14: calc(14), p30: calc(30) }
  }, [entries])

  const onAdd = () => {
    setForm({
      date: new Date().toISOString().split("T")[0],
      sleep_hours: "",
      motivation_score: "3",
      notes: "",
    })
    setEditingId(null)
    setShowDialog(true)
  }

  const onEdit = (id: string) => {
    const entriesArray = Array.isArray(entries) ? entries : []
    const entry = entriesArray.find(e => e && e.id === id)
    if (!entry) return
    setForm({
      date: entry.date,
      sleep_hours: String(entry.sleep_hours),
      motivation_score: String(entry.motivation_score),
      notes: entry.notes || "",
    })
    setEditingId(id)
    setShowDialog(true)
  }

  const handleSubmit = async () => {
    try {
      setSaving(true)
      const payload = {
        date: form.date,
        sleep_hours: Number(form.sleep_hours),
        motivation_score: Number(form.motivation_score),
        notes: form.notes || undefined,
      }
      if (editingId) {
        await updateEntry(editingId, payload)
      } else {
        await addEntry(payload)
      }
      setShowDialog(false)
      await refetch()
    } catch (err) {
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    await deleteEntry(id)
    await refetch()
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Bienestar
          </CardTitle>
          <CardDescription>Horas de sueño y motivación</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <Loader2 className="h-4 w-4 mr-1" />
            Refrescar
          </Button>
          <Button size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Añadir
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Stat label="Promedio sueño 30d" value={summary.avg_sleep ? `${summary.avg_sleep.toFixed(1)} h` : "—"} />
            <Stat label="Promedio motivación 30d" value={summary.avg_motivation ? summary.avg_motivation.toFixed(1) : "—"} />
            <Stat label="Última fecha" value={summary.last?.date || "—"} />
            <Stat label="Registros totales" value={summary.count} />
          </div>
        )}

        {/* Comparativas 14/30 días */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <Stat
            label="14d: sueño / motivación"
            value={
              periodStats.p14.sleep != null
                ? `${periodStats.p14.sleep.toFixed(1)}h · ${periodStats.p14.mood?.toFixed(1) || "—"}/5`
                : "—"
            }
            badge={
              periodStats.p14.sleep_delta != null || periodStats.p14.mood_delta != null
                ? `${periodStats.p14.sleep_delta ? (periodStats.p14.sleep_delta > 0 ? "+" : "") + periodStats.p14.sleep_delta.toFixed(1) + "h" : ""} ${
                    periodStats.p14.mood_delta ? (periodStats.p14.mood_delta > 0 ? "+" : "") + periodStats.p14.mood_delta.toFixed(1) : ""
                  }`
                : undefined
            }
          />
          <Stat
            label="30d: sueño / motivación"
            value={
              periodStats.p30.sleep != null
                ? `${periodStats.p30.sleep.toFixed(1)}h · ${periodStats.p30.mood?.toFixed(1) || "—"}/5`
                : "—"
            }
            badge={
              periodStats.p30.sleep_delta != null || periodStats.p30.mood_delta != null
                ? `${periodStats.p30.sleep_delta ? (periodStats.p30.sleep_delta > 0 ? "+" : "") + periodStats.p30.sleep_delta.toFixed(1) + "h" : ""} ${
                    periodStats.p30.mood_delta ? (periodStats.p30.mood_delta > 0 ? "+" : "") + periodStats.p30.mood_delta.toFixed(1) : ""
                  }`
                : undefined
            }
          />
        </div>

        <div className="flex gap-2 text-xs">
          {[14, 30, 60, 0].map(r => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "outline"}
              className={cn("h-8", range === r ? "" : "bg-white")}
              onClick={() => setRange(r as typeof range)}
            >
              {r === 0 ? "Todo" : `${r}d`}
            </Button>
          ))}
        </div>

        {filtered.length > 0 && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Sueño (h) y motivación</p>
              <ChartContainer
                config={{
                  sleep_hours: { label: "Sueño", color: "hsl(var(--chart-2))" },
                  motivation_score: { label: "Motivación", color: "hsl(var(--chart-1))" },
                }}
                className="h-64"
              >
                <LineChart data={[...filtered].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="sleep_hours" stroke="var(--color-sleep_hours)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="motivation_score" stroke="var(--color-motivation_score)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Distribución de motivación</p>
              <ChartContainer
                config={{
                  motivation_score: { label: "Motivación", color: "hsl(var(--chart-3))" },
                }}
                className="h-56"
              >
                <BarChart data={filtered}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="motivation_score" fill="var(--color-motivation_score)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando bienestar...
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin registros de bienestar.</p>
        ) : (
          <div className="space-y-2">
            {filtered.slice(0, 20).map(entry => (
              <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{entry.date}</Badge>
                    <span className="text-sm font-semibold flex items-center gap-1">
                      <Moon className="h-4 w-4" /> {entry.sleep_hours} h
                    </span>
                    <span className="text-sm font-semibold flex items-center gap-1">
                      <Flame className="h-4 w-4" /> {entry.motivation_score}/5
                    </span>
                  </div>
                  {entry.notes && <p className="text-xs text-muted-foreground">{entry.notes}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => onEdit(entry.id)}>
                    <Edit className="h-3 w-3 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(entry.id)}>
                    <Trash2 className="h-3 w-3 mr-1" /> Borrar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar registro" : "Añadir registro"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Fecha</Label>
              <Input type="date" value={form.date} onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Horas de sueño</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="24"
                value={form.sleep_hours}
                onChange={e => setForm(prev => ({ ...prev, sleep_hours: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Motivación (1-5)</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={form.motivation_score}
                onChange={e => setForm(prev => ({ ...prev, motivation_score: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Notas (opcional)</Label>
              <Input value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
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


