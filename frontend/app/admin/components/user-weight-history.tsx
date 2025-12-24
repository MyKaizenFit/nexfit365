"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Plus, Trash2, Edit, TrendingUp, BarChart2 } from "lucide-react"
import { useAdminUserProgress } from "@/hooks/use-admin-user-progress"
import { Badge } from "@/components/ui/badge"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts"
import { cn } from "@/lib/utils"

interface Props {
  userId: string
}

export function UserWeightHistory({ userId }: Props) {
  const { entries, summary, loading, error, refetch, addEntry, updateEntry, deleteEntry } = useAdminUserProgress(userId)
  const [range, setRange] = useState<7 | 30 | 90 | 0>(30) // 0 = todo
  const [showDialog, setShowDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ weight: "", date: "", notes: "" })
  const [saving, setSaving] = useState(false)

  const onEdit = (entryId: string) => {
    const entry = entries.find(e => e.id === entryId)
    if (!entry) return
    setForm({
      weight: String(entry.weight),
      date: entry.date,
      notes: entry.notes || "",
    })
    setEditingId(entryId)
    setShowDialog(true)
  }

  const onAdd = () => {
    setForm({
      weight: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    })
    setEditingId(null)
    setShowDialog(true)
  }

  const handleSubmit = async () => {
    try {
      setSaving(true)
      const payload = {
        weight: Number(form.weight),
        date: form.date,
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
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    await deleteEntry(id)
    await refetch()
  }

  const filtered = useMemo(() => {
    if (range === 0) return entries
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - range)
    return entries.filter(e => new Date(e.date) >= cutoff)
  }, [entries, range])

  const trend = useMemo(() => {
    if (!summary?.current || !summary?.previous) return null
    return Number((summary.current.weight as number) - (summary.previous.weight as number))
  }, [summary])

  // Delta vs período previo (promedio)
  const periodDelta = useMemo(() => {
    if (range === 0) return null
    const now = new Date()
    const start = new Date()
    start.setDate(start.getDate() - range)
    const prevStart = new Date()
    prevStart.setDate(prevStart.getDate() - range * 2)
    const prevEnd = new Date()
    prevEnd.setDate(prevEnd.getDate() - range)

    const avg = (list: typeof entries) =>
      list.length ? list.reduce((s, e) => s + Number(e.weight), 0) / list.length : null

    const currentList = entries.filter(e => {
      const d = new Date(e.date)
      return d >= start && d <= now
    })
    const prevList = entries.filter(e => {
      const d = new Date(e.date)
      return d >= prevStart && d < prevEnd
    })

    const currentAvg = avg(currentList)
    const prevAvg = avg(prevList)
    if (currentAvg == null || prevAvg == null) return null
    const diff = currentAvg - prevAvg
    const pct = prevAvg !== 0 ? (diff / prevAvg) * 100 : null
    return { diff, pct }
  }, [entries, range])

  return (
    <Card>
      <CardHeader className="flex items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            Historial de peso
          </CardTitle>
          <CardDescription>CRUD + resumen y tendencia</CardDescription>
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
            <Stat label="Peso actual" value={summary.current?.weight ? `${summary.current.weight} kg` : "—"} />
            <Stat label="Mínimo" value={summary.min ? `${summary.min} kg` : "—"} />
            <Stat label="Máximo" value={summary.max ? `${summary.max} kg` : "—"} />
            <Stat
              label="Cambio vs previo"
              value={
                trend === null
                  ? "—"
                  : `${trend > 0 ? "+" : ""}${trend.toFixed(1)} kg`
              }
              badge={trend === null ? undefined : trend > 0 ? "sube" : trend < 0 ? "baja" : "igual"}
            />
          </div>
        )}

        <Separator />

        {periodDelta && (
          <div className="text-sm rounded-lg border p-3 bg-white/60 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Δ vs período previo ({range}d)</p>
              <p className="text-sm font-semibold">
                {periodDelta.diff > 0 ? "+" : ""}
                {periodDelta.diff.toFixed(1)} kg
                {periodDelta.pct != null ? ` (${periodDelta.pct.toFixed(1)}%)` : ""}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2 text-xs">
          {[7, 30, 90, 0].map(r => (
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

        {filtered.length > 1 && (
          <div>
            <p className="text-sm font-medium mb-2">Gráfica de peso</p>
            <ChartContainer
              config={{
                weight: { label: "Peso", color: "hsl(var(--chart-1))" },
              }}
              className="h-60"
            >
              <LineChart data={[...filtered].reverse()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="weight" stroke="var(--color-weight)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando historial...
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin entradas de peso.</p>
        ) : (
          <div className="space-y-2">
            {filtered.slice(0, 12).map(entry => (
              <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold">{entry.weight} kg</span>
                    <Badge variant="outline">{entry.date}</Badge>
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
            <DialogTitle>{editingId ? "Editar entrada" : "Añadir peso"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Peso (kg)</Label>
              <Input
                type="number"
                step="0.1"
                value={form.weight}
                onChange={e => setForm(prev => ({ ...prev, weight: e.target.value }))}
                placeholder="70.5"
              />
            </div>
            <div className="space-y-1">
              <Label>Fecha</Label>
              <Input type="date" value={form.date} onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))} />
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

function Stat({ label, value, badge }: { label: string; value: string | number; badge?: string }) {
  return (
    <div className="rounded-lg border p-3 bg-white/60">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{value}</span>
        {badge ? <Badge variant="outline">{badge}</Badge> : null}
      </div>
    </div>
  )
}


