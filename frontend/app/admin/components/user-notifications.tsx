"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, Send, Bell, Sparkles, Dumbbell, Utensils } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAdminUserNotifications } from "@/hooks/use-admin-user-notifications"

interface Props {
  userId: string
}

export function UserNotifications({ userId }: Props) {
  const { notifications, loading, error, refetch, send } = useAdminUserNotifications(userId)
  const [form, setForm] = useState({ title: "", message: "", type: "info", priority: "medium" })
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    try {
      setSending(true)
      await send(form)
      setForm({ title: "", message: "", type: "info", priority: "medium" })
    } catch (err) {
    } finally {
      setSending(false)
      await refetch()
    }
  }

  const applyTemplate = (template: "meal" | "workout" | "encourage") => {
    if (template === "meal") {
      setForm({
        title: "Recordatorio de comidas",
        message: "No olvides registrar tus comidas de hoy para mantener tus objetivos al día.",
        type: "meal",
        priority: "medium",
      })
    } else if (template === "workout") {
      setForm({
        title: "Entrenamiento pendiente",
        message: "Tienes un entrenamiento asignado hoy. ¡Dale, tú puedes!",
        type: "workout",
        priority: "high",
      })
    } else {
      setForm({
        title: "¡Sigue así!",
        message: "Estás haciendo un gran trabajo. Mantén el ritmo y cuida tu descanso.",
        type: "motivation",
        priority: "low",
      })
    }
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificaciones al usuario
          </CardTitle>
          <CardDescription>Enviar y revisar historial</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <Loader2 className="h-4 w-4 mr-1" />
          Refrescar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Título</Label>
              <Input value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Mensaje</Label>
              <Textarea
                value={form.message}
                onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) => setForm(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="meal">Comida</SelectItem>
                    <SelectItem value="workout">Entrenamiento</SelectItem>
                    <SelectItem value="reminder">Recordatorio</SelectItem>
                    <SelectItem value="motivation">Motivación</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="warning">Advertencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Prioridad</Label>
                <Select
                  value={form.priority}
                  onValueChange={(value) => setForm(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Button type="button" size="sm" variant="outline" onClick={() => applyTemplate("meal")}>
                <Utensils className="h-3 w-3 mr-1" /> Recordatorio comidas
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => applyTemplate("workout")}>
                <Dumbbell className="h-3 w-3 mr-1" /> Entrenamiento
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => applyTemplate("encourage")}>
                <Sparkles className="h-3 w-3 mr-1" /> Motivación
              </Button>
            </div>
            <Button onClick={handleSend} disabled={sending || !form.title || !form.message}>
              {sending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enviar
            </Button>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin notificaciones.</p>
            ) : (
              notifications.slice(0, 20).map(n => (
                <div key={n.id} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>{n.title}</span>
                    <Badge variant={n.read_at ? "outline" : "default"}>{n.read_at ? "Leída" : "No leída"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("es-ES")}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


