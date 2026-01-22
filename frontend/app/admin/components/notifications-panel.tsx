"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import {
  Bell,
  Send,
  Users,
  User,
  AlertTriangle,
  Info,
  Clock,
  Target,
  MessageSquare,
  Award,
  Calendar,
  Mail,
  Settings,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useAdminNotifications, CreateNotificationData } from "@/hooks/use-admin-notifications"
import { useAdminUsers } from "@/hooks/use-admin-users"

interface AdminNotificationsPanelProps {
  variant?: "embedded" | "standalone"
  className?: string
}

export function AdminNotificationsPanel({
  variant = "embedded",
  className,
}: AdminNotificationsPanelProps) {
  const { user: currentUser } = useAuth()
  const { users, loading: usersLoading } = useAdminUsers()
  const { sendBulkNotification, loading: notificationsLoading } = useAdminNotifications()
  const [sending, setSending] = useState(false)

  const [individualNotification, setIndividualNotification] = useState<CreateNotificationData>({
    user_ids: [],
    title: "",
    message: "",
    type: "info",
    priority: "medium",
    action_url: "",
  })

  const [broadcastNotification, setBroadcastNotification] = useState<CreateNotificationData>({
    title: "",
    message: "",
    type: "info",
    priority: "medium",
    action_url: "",
  })

  const containerClass =
    variant === "standalone"
      ? cn("container mx-auto p-6 space-y-6", className)
      : cn("space-y-6", className)

  const cardClass = "backdrop-blur-sm bg-white/80 border-0 shadow-xl"
  const actionButtonClass =
    "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"

  if (!currentUser?.is_staff && !currentUser?.is_superuser) {
    return (
      <div className={containerClass}>
        <Card className={cardClass}>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acceso Denegado</h2>
            <p className="text-gray-600">No tienes permisos para acceder a esta sección.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "meal":
        return <MessageSquare className="h-4 w-4 text-orange-600" />
      case "workout":
        return <Calendar className="h-4 w-4 text-purple-600" />
      case "achievement":
        return <Award className="h-4 w-4 text-yellow-600" />
      case "reminder":
        return <Bell className="h-4 w-4 text-blue-600" />
      case "system":
        return <Settings className="h-4 w-4 text-gray-600" />
      case "admin":
        return <User className="h-4 w-4 text-red-600" />
      case "marketing":
        return <Mail className="h-4 w-4 text-green-600" />
      default:
        return <Bell className="h-4 w-4 text-gray-600" />
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive">Urgente</Badge>
      case "high":
        return <Badge variant="destructive">Alta</Badge>
      case "medium":
        return <Badge variant="default">Media</Badge>
      case "low":
        return <Badge variant="secondary">Baja</Badge>
      default:
        return <Badge variant="secondary">Baja</Badge>
    }
  }

  const handleSendIndividual = async () => {
    if (!individualNotification.title || !individualNotification.message || !individualNotification.user_ids?.length) {
      toast({
        title: "❌ Error",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive",
      })
      return
    }

    setSending(true)
    try {
      const result = await sendBulkNotification(individualNotification)

      toast({
        title: "✅ Notificación enviada",
        description: `La notificación ha sido enviada a ${result.detail}`,
      })

      setIndividualNotification({
        user_ids: [],
        title: "",
        message: "",
        type: "info",
        priority: "medium",
        action_url: "",
      })
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "No se pudo enviar la notificación",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const handleBroadcast = async () => {
    if (!broadcastNotification.title || !broadcastNotification.message) {
      toast({
        title: "❌ Error",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive",
      })
      return
    }

    setSending(true)
    try {
      const result = await sendBulkNotification(broadcastNotification)

      toast({
        title: "✅ Notificación masiva enviada",
        description: `La notificación ha sido enviada a ${result.detail}`,
      })

      setBroadcastNotification({
        title: "",
        message: "",
        type: "info",
        priority: "medium",
        action_url: "",
      })
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "No se pudo enviar la notificación masiva",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={containerClass}>
      <Card className={cardClass}>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg shadow-inner">
            <Bell className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-blue-700">Panel de Notificaciones</CardTitle>
            <CardDescription className="text-gray-600">
              Gestiona y envía notificaciones a los usuarios
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="individual" className="space-y-6">
        <div className="w-full overflow-x-auto">
          <TabsList className="inline-flex min-w-full md:min-w-0 bg-white/70 border border-gray-100 rounded-xl p-1 shadow-sm">
            <TabsTrigger
              value="individual"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500"
            >
              <User className="h-4 w-4" />
              Notificación Individual
            </TabsTrigger>
            <TabsTrigger
              value="broadcast"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500"
            >
              <Users className="h-4 w-4" />
              Notificación Masiva
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="individual" className="space-y-6">
          <Card className={cardClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Enviar Notificación Individual
              </CardTitle>
              <CardDescription>Envía una notificación específica a un usuario</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="target_user">Usuario Destinatario</Label>
                    <Select
                      value={individualNotification.user_ids?.[0]?.toString() || ""}
                      onValueChange={(value) =>
                        setIndividualNotification((prev) => ({
                          ...prev,
                          user_ids: value ? [parseInt(value)] : [],
                        }))
                      }
                      disabled={usersLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={usersLoading ? "Cargando usuarios..." : "Selecciona un usuario"} />
                      </SelectTrigger>
                      <SelectContent>
                        {users
                          .filter((user) => user.is_active)
                          .map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.first_name} {user.last_name} ({user.email})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="type">Tipo de Notificación</Label>
                    <Select
                      value={individualNotification.type}
                      onValueChange={(value: any) => setIndividualNotification((prev) => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Información</SelectItem>
                        <SelectItem value="warning">Advertencia</SelectItem>
                        <SelectItem value="success">Éxito</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="priority">Prioridad</Label>
                    <Select
                      value={individualNotification.priority}
                      onValueChange={(value: any) => setIndividualNotification((prev) => ({ ...prev, priority: value }))}
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

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Título</Label>
                    <Input
                      id="title"
                      value={individualNotification.title}
                      onChange={(e) => setIndividualNotification((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Título de la notificación"
                    />
                  </div>

                  <div>
                    <Label htmlFor="message">Mensaje</Label>
                    <Textarea
                      id="message"
                      value={individualNotification.message}
                      onChange={(e) => setIndividualNotification((prev) => ({ ...prev, message: e.target.value }))}
                      placeholder="Mensaje de la notificación"
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="action_url">URL de acción (opcional)</Label>
                    <Input
                      id="action_url"
                      value={individualNotification.action_url || ""}
                      onChange={(e) => setIndividualNotification((prev) => ({ ...prev, action_url: e.target.value }))}
                      placeholder="Ej: /dashboard"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSendIndividual}
                  disabled={sending || notificationsLoading}
                  className={cn("flex items-center gap-2", actionButtonClass)}
                >
                  {sending ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Enviar Notificación
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="broadcast" className="space-y-6">
          <Card className={cardClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Enviar Notificación Masiva
              </CardTitle>
              <CardDescription>Envía una notificación a todos los usuarios activos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="broadcast_type">Tipo de Notificación</Label>
                    <Select
                      value={broadcastNotification.type}
                      onValueChange={(value: any) => setBroadcastNotification((prev) => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Información</SelectItem>
                        <SelectItem value="warning">Advertencia</SelectItem>
                        <SelectItem value="success">Éxito</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="broadcast_priority">Prioridad</Label>
                    <Select
                      value={broadcastNotification.priority}
                      onValueChange={(value: any) => setBroadcastNotification((prev) => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baja</SelectItem>
                        <SelectItem value="medium">Media</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3 bg-slate-50">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Enviar correo electrónico</Label>
                      <p className="text-xs text-muted-foreground">
                        Además de la notificación interna, envía un email a los usuarios seleccionados
                      </p>
                    </div>
                    <Switch
                      checked={Boolean(broadcastNotification.send_email)}
                      onCheckedChange={(checked) =>
                        setBroadcastNotification((prev) => ({ ...prev, send_email: checked }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="broadcast_title">Título</Label>
                    <Input
                      id="broadcast_title"
                      value={broadcastNotification.title}
                      onChange={(e) => setBroadcastNotification((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Título de la notificación masiva"
                    />
                  </div>

                  <div>
                    <Label htmlFor="broadcast_message">Mensaje</Label>
                    <Textarea
                      id="broadcast_message"
                      value={broadcastNotification.message}
                      onChange={(e) => setBroadcastNotification((prev) => ({ ...prev, message: e.target.value }))}
                      placeholder="Mensaje de la notificación"
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="broadcast_action_url">URL de acción (opcional)</Label>
                    <Input
                      id="broadcast_action_url"
                      value={broadcastNotification.action_url || ""}
                      onChange={(e) => setBroadcastNotification((prev) => ({ ...prev, action_url: e.target.value }))}
                      placeholder="Ej: /dashboard"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border border-blue-100 bg-blue-50/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      Segmentación
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>Puedes segmentar la notificación seleccionando filtros específicos (próximamente).</p>
                    <p className="text-xs">Por ahora se envía a todos los usuarios activos.</p>
                  </CardContent>
                </Card>

                <Card className="border border-emerald-100 bg-emerald-50/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Info className="h-4 w-4 text-emerald-600" />
                      Resumen
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>
                      El mensaje se enviará a <strong>todos los usuarios activos</strong> de la plataforma.
                    </p>
                    <p>
                      Prioridad seleccionada: <span className="font-semibold">{getPriorityBadge(broadcastNotification.priority)}</span>
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleBroadcast}
                  disabled={sending || notificationsLoading}
                  className={cn("flex items-center gap-2", actionButtonClass)}
                >
                  {sending ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Enviar Notificación Masiva
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

