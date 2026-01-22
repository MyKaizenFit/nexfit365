"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, RefreshCw, UtensilsCrossed, Activity, History, Edit, Trash2 } from "lucide-react"
import { useAdminUserNutrition } from "@/hooks/use-admin-user-nutrition"
import { useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export function UserNutritionSummary({ userId }: { userId: string }) {
  const { summary, history, logs, totals, loading, error, refetch, updateLog, deleteLog } = useAdminUserNutrition(userId)
  const [editing, setEditing] = useState<{ id: string; calories?: number | null; protein?: number | null; carbs?: number | null; fat?: number | null } | null>(null)
  const [saving, setSaving] = useState(false)

  const startEdit = (log: any) => {
    setEditing({
      id: log.id,
      calories: log.calories ?? null,
      protein: log.protein ?? null,
      carbs: log.carbs ?? null,
      fat: log.fat ?? null,
    })
  }

  const handleSave = async () => {
    if (!editing) return
    try {
      setSaving(true)
      await updateLog(editing.id, {
        calories: editing.calories ?? undefined,
        protein: editing.protein ?? undefined,
        carbs: editing.carbs ?? undefined,
        fat: editing.fat ?? undefined,
      })
      setEditing(null)
    } catch (err) {
    } finally {
      setSaving(false)
    }
  }

  const renderMacro = (label: string, key: "calories" | "protein" | "carbs" | "fat") => {
    const current = summary?.macro_intake?.totals?.[key] ?? 0
    const target = summary?.macros_target?.[key] ?? 0
    const percent = target ? Math.min(100, Math.round((current / target) * 100)) : 0
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>{label}</span>
          <span className="font-semibold">
            {Math.round(current)}{key === "calories" ? " kcal" : " g"}
          </span>
        </div>
        <Progress value={percent} className="h-2" />
        <p className="text-xs text-muted-foreground">
          Objetivo: {target ? `${target}${key === "calories" ? " kcal" : " g"}` : "—"} · {percent}% logrado
        </p>
      </div>
    )
  }

  const renderPerDayBars = () => {
    const perDay = summary?.macro_intake?.per_day || []
    const target = summary?.macros_target?.calories || 0
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">Últimos días (kcal)</p>
        <div className="space-y-1">
          {perDay.slice(0, 7).map((d: any) => {
            const calories = d.calories || 0
            const pct = target ? Math.min(100, Math.round((calories / target) * 100)) : 0
            return (
              <div key={d.date} className="text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>{d.date}</span>
                  <span>{Math.round(calories)} kcal</span>
                </div>
                <div className="h-2 bg-gray-100 rounded">
                  <div className="h-2 bg-orange-500 rounded" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
          {perDay.length === 0 && <p className="text-xs text-muted-foreground">Sin datos recientes.</p>}
        </div>
      </div>
    )
  }

  if (loading && !summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4" />
            Resumen nutricional
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader className="flex items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4" />
              Plan nutricional
            </CardTitle>
            <CardDescription>Plan activo y consumo reciente</CardDescription>
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
            <Badge variant="secondary">{summary?.plan?.name || "Sin plan asignado"}</Badge>
            {summary?.plan?.daily_calories ? (
              <Badge className="bg-orange-100 text-orange-800 border-0">
                {summary.plan.daily_calories} kcal objetivo
              </Badge>
            ) : null}
            <Badge variant="outline">
              Ventana: {summary?.period?.start_date} → {summary?.period?.end_date}
            </Badge>
            <Badge variant="outline">Logs: {summary?.logs_count ?? 0}</Badge>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderMacro("Calorías", "calories")}
            {renderMacro("Proteína", "protein")}
            {renderMacro("Carbohidratos", "carbs")}
            {renderMacro("Grasas", "fat")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Últimos registros
          </CardTitle>
          <CardDescription>Entradas recientes de comidas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {logs && logs.length > 0 ? (
            logs.slice(0, 5).map((log) => (
              <div key={log.id} className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="capitalize">{log.meal_type.replace("_", " ")}</span>
                  <span className="text-muted-foreground">{log.date}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {log.recipe_name || log.notes || "Sin descripción"}
                </div>
                <div className="text-xs flex gap-2 text-muted-foreground">
                  {log.calories ? <span>{Math.round(log.calories)} kcal</span> : null}
                  {log.protein ? <span>{Math.round(Number(log.protein))} g P</span> : null}
                </div>
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
            <p className="text-sm text-muted-foreground">Sin registros recientes</p>
          )}

          <Separator />

          <div className="flex items-center justify-between text-sm">
            <span>Totales mostrados</span>
            <span className="font-semibold">{Math.round(totals.calories || 0)} kcal</span>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader className="flex items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Historial de cambios de plan
            </CardTitle>
            <CardDescription>Últimos ajustes realizados por admin/usuario</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {history && history.length > 0 ? (
            history.slice(0, 6).map((item) => (
              <div key={item.id} className="border rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className="truncate">{item.new_plan_name || "Nuevo plan"}</span>
                  <Badge variant="outline">{item.reason_display || item.reason || "Cambio"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.old_plan_name ? `De: ${item.old_plan_name}` : "Sin plan previo"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString("es-ES")} · {item.changed_by_email || "Sistema"}
                </p>
                {item.notes ? <p className="text-xs text-muted-foreground line-clamp-2">{item.notes}</p> : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground col-span-3">Sin historial disponible</p>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-sm">Consumo diario vs objetivo</CardTitle>
          <CardDescription>Calorías por día (últimos 7)</CardDescription>
        </CardHeader>
        <CardContent>{renderPerDayBars()}</CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar log de comida</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Calorías</p>
              <Input
                type="number"
                value={editing?.calories ?? ""}
                onChange={(e) => setEditing((prev) => prev ? { ...prev, calories: e.target.value ? Number(e.target.value) : null } : prev)}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Proteína (g)</p>
              <Input
                type="number"
                value={editing?.protein ?? ""}
                onChange={(e) => setEditing((prev) => prev ? { ...prev, protein: e.target.value ? Number(e.target.value) : null } : prev)}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Carbohidratos (g)</p>
              <Input
                type="number"
                value={editing?.carbs ?? ""}
                onChange={(e) => setEditing((prev) => prev ? { ...prev, carbs: e.target.value ? Number(e.target.value) : null } : prev)}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Grasas (g)</p>
              <Input
                type="number"
                value={editing?.fat ?? ""}
                onChange={(e) => setEditing((prev) => prev ? { ...prev, fat: e.target.value ? Number(e.target.value) : null } : prev)}
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

