"use client"

import { useState, useEffect, useCallback } from "react"
import { Ruler, Plus, ChevronDown, ChevronUp, Loader2, Trash2, Calendar } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { authenticatedFetch } from "@/lib/api"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

interface BodyMeasurement {
  id: number
  date: string
  chest?: number | null
  waist?: number | null
  hips?: number | null
  arms?: number | null
  thighs?: number | null
  neck?: number | null
  forearms?: number | null
  calves?: number | null
  notes?: string
  created_at: string
}

interface MeasurementField {
  key: keyof BodyMeasurement
  label: string
  emoji: string
}

const FIELDS: MeasurementField[] = [
  { key: "chest", label: "Pecho", emoji: "💪" },
  { key: "waist", label: "Cintura", emoji: "📏" },
  { key: "hips", label: "Caderas", emoji: "🔵" },
  { key: "arms", label: "Brazos", emoji: "💪" },
  { key: "thighs", label: "Muslos", emoji: "🦵" },
  { key: "neck", label: "Cuello", emoji: "🔴" },
  { key: "forearms", label: "Antebrazos", emoji: "✊" },
  { key: "calves", label: "Gemelos", emoji: "🦵" },
]

type FormState = Partial<Record<keyof BodyMeasurement, string>>

const emptyForm = (): FormState => ({
  date: format(new Date(), "yyyy-MM-dd"),
  chest: "", waist: "", hips: "", arms: "",
  thighs: "", neck: "", forearms: "", calves: "", notes: "",
})

export function BodyMeasurements() {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authenticatedFetch("measurements/?ordering=-date")
      if (res.ok) {
        const data = await res.json()
        setMeasurements(data.results ?? data)
      }
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar las medidas.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    // Validar que al menos un campo de medida tenga valor
    const hasMeasure = FIELDS.some(f => form[f.key] && String(form[f.key]).trim() !== "")
    if (!hasMeasure) {
      toast({ title: "Error", description: "Introduce al menos una medida.", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, any> = { date: form.date, notes: form.notes || "" }
      FIELDS.forEach(f => {
        const v = form[f.key]
        payload[f.key] = v && String(v).trim() !== "" ? parseFloat(String(v)) : null
      })

      const res = await authenticatedFetch("measurements/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        toast({ title: "✅ Medidas guardadas", description: "Tus medidas han sido registradas." })
        setForm(emptyForm())
        setShowForm(false)
        load()
      } else {
        const err = await res.json().catch(() => ({}))
        const msg = err.date?.[0] || err.non_field_errors?.[0] || "Error al guardar."
        throw new Error(msg)
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudieron guardar las medidas.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeleting(id)
    try {
      const res = await authenticatedFetch(`measurements/${id}/`, { method: "DELETE" })
      if (res.ok || res.status === 204) {
        setMeasurements(prev => prev.filter(m => m.id !== id))
        if (expandedId === id) setExpandedId(null)
        toast({ title: "Medidas eliminadas" })
      }
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar.", variant: "destructive" })
    } finally {
      setDeleting(null)
    }
  }

  const formatDate = (d: string) => {
    try { return format(parseISO(d), "d MMM yyyy", { locale: es }) } catch { return d }
  }

  // Diferencia entre primera y última medida para un campo
  const getDelta = (field: keyof BodyMeasurement): string | null => {
    if (measurements.length < 2) return null
    const first = measurements[measurements.length - 1][field]
    const last = measurements[0][field]
    if (!first || !last) return null
    const d = Number(last) - Number(first)
    return `${d > 0 ? "+" : ""}${d.toFixed(1)} cm`
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Ruler className="h-4 w-4" />
              Medidas Corporales
            </CardTitle>
            <CardDescription className="text-sm">Seguimiento de tus medidas</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Registrar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && measurements.length === 0 && (
          <div className="text-center py-8">
            <Ruler className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-3">Aún no tienes medidas registradas</p>
            <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Primera medida
            </Button>
          </div>
        )}

        {!loading && measurements.length > 0 && (
          <>
            {/* Resumen de deltas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FIELDS.filter(f => measurements.some(m => m[f.key])).slice(0, 4).map(f => {
                const latest = measurements[0][f.key]
                const delta = getDelta(f.key)
                return (
                  <div key={f.key} className="bg-muted/50 rounded-lg p-2 text-center">
                    <div className="text-xs text-muted-foreground">{f.label}</div>
                    <div className="text-sm font-semibold">{latest ? `${latest} cm` : "—"}</div>
                    {delta && (
                      <div className={`text-xs ${delta.startsWith("+") ? "text-red-500" : "text-green-500"}`}>
                        {delta}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Historial */}
            <div className="space-y-2 mt-2">
              {measurements.map(m => (
                <div key={m.id} className="border rounded-lg overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{formatDate(m.date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {FIELDS.filter(f => m[f.key]).length} medidas
                      </Badge>
                      {expandedId === m.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </button>

                  {expandedId === m.id && (
                    <div className="border-t p-3 space-y-2">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {FIELDS.map(f => (
                          <div key={f.key} className="text-sm">
                            <span className="text-muted-foreground">{f.label}: </span>
                            <span className="font-medium">{m[f.key] ? `${m[f.key]} cm` : "—"}</span>
                          </div>
                        ))}
                      </div>
                      {m.notes && (
                        <p className="text-xs text-muted-foreground border-t pt-2">{m.notes}</p>
                      )}
                      <div className="flex justify-end pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          disabled={deleting === m.id}
                          onClick={() => handleDelete(m.id)}
                        >
                          {deleting === m.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <><Trash2 className="h-3.5 w-3.5 mr-1" />Eliminar</>
                          }
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>

      {/* Dialog de formulario */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Medidas Corporales</DialogTitle>
            <DialogDescription>
              Introduce tus medidas en centímetros. Deja en blanco los campos que no quieras registrar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="meas-date">Fecha</Label>
              <Input
                id="meas-date"
                type="date"
                value={form.date as string}
                max={format(new Date(), "yyyy-MM-dd")}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map(f => (
                <div key={f.key} className="space-y-1">
                  <Label htmlFor={`meas-${f.key}`}>{f.emoji} {f.label} (cm)</Label>
                  <Input
                    id={`meas-${f.key}`}
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="—"
                    value={form[f.key] as string ?? ""}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <Label htmlFor="meas-notes">Notas (opcional)</Label>
              <Textarea
                id="meas-notes"
                rows={2}
                placeholder="Observaciones..."
                value={form.notes as string ?? ""}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" disabled={saving} onClick={handleSave}>
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
