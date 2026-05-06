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
  MousePointerClick,
  RefreshCw,
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
  const {
    sendBulkNotification,
    stats,
    refetch,
    loading: notificationsLoading,
    notifications,
    fetchDeliveryLogs,
    deliveryLogsByNotification,
  } = useAdminNotifications()
  const [sending, setSending] = useState(false)
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null)
  const [loadingDeliveryFor, setLoadingDeliveryFor] = useState<string | null>(null)

  const notificationTemplates = [
    {
      key: "workout_reminder",
      label: "Recordatorio Entreno",
      type: "workout_reminder",
      priority: "medium" as const,
      title: "💪 No olvides tu entrenamiento de hoy",
      message: "Tu constancia te acerca a tus objetivos. ¡Entrena hoy y suma progreso!",
      expiresInDays: 2,
    },
    {
      key: "meal_reminder",
      label: "Recordatorio Comida",
      type: "meal_reminder",
      priority: "medium" as const,
      title: "🥗 Hora de tu comida planificada",
      message: "Sigue tu plan nutricional para mantener el ritmo de tu transformación.",
      expiresInDays: 1,
    },
    {
      key: "achievement",
      label: "Logro",
      type: "achievement",
      priority: "high" as const,
      title: "🏆 ¡Nuevo logro desbloqueado!",
      message: "¡Gran trabajo! Has alcanzado un nuevo hito en tu progreso.",
      expiresInDays: 30,
    },
    {
      key: "system",
      label: "Sistema",
      type: "system",
      priority: "high" as const,
      title: "⚙️ Actualización importante",
      message: "Tenemos una actualización relevante para mejorar tu experiencia en la app.",
      expiresInDays: 14,
    },
  ]

  const toExpiresAtIso = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toISOString()
  }

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
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])

  const ROLES = [
    { value: 'basic', label: 'Basic' },
    { value: 'pro', label: 'Pro' },
    { value: 'premium', label: 'Premium' },
    { value: 'trainer', label: 'Entrenador' },
  ]

  const toggleRole = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  const getSegmentedUserIds = (): number[] | undefined => {
    if (selectedRoles.length === 0) return undefined
    return users
      .filter(u => selectedRoles.some(r => u.role?.toLowerCase() === r))
      .map(u => u.id)
  }

  const containerClass =
    variant === "standalone"
      ? cn("container mx-auto p-6 space-y-6", className)
      : cn("space-y-6", className)

  const cardClass = "backdrop-blur-sm bg-white/80 border-0 shadow-xl"
  const actionButtonClass =
    "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
  const totalNotifications = stats?.total_notifications ?? 0
  const clickedNotifications = stats?.clicked_notifications ?? 0
  const ctr = totalNotifications > 0 ? ((clickedNotifications / totalNotifications) * 100).toFixed(1) : "0.0"

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

  const getDeliveryBadge = (status?: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-emerald-100 text-emerald-800 border-0">Enviado</Badge>
      case "failed":
        return <Badge variant="destructive">Fallido</Badge>
      case "skipped":
        return <Badge variant="secondary">Omitido</Badge>
      default:
        return <Badge variant="outline">Pendiente</Badge>
    }
  }

  const handleToggleDelivery = async (notificationId: string) => {
    if (expandedDelivery === notificationId) {
      setExpandedDelivery(null)
      return
    }

    setExpandedDelivery(notificationId)
    if (!deliveryLogsByNotification[notificationId]) {
      try {
        setLoadingDeliveryFor(notificationId)
        await fetchDeliveryLogs(notificationId)
      } catch (error) {
        toast({
          title: "❌ Error",
          description: "No se pudo cargar la trazabilidad de entrega",
          variant: "destructive",
        })
      } finally {
        setLoadingDeliveryFor(null)
      }
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
        description: result.message || `Notificaciones creadas: ${result.notifications_created ?? 0}`,
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
      const segmentedIds = getSegmentedUserIds()
      const result = await sendBulkNotification({
        ...broadcastNotification,
        ...(segmentedIds ? { user_ids: segmentedIds } : {}),
      })

      toast({
        title: "✅ Notificación masiva enviada",
        description: result.message || `Notificaciones creadas: ${result.notifications_created ?? 0}`,
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

  const applyTemplateToIndividual = (templateKey: string) => {
    const template = notificationTemplates.find((item) => item.key === templateKey)
    if (!template) return

    setIndividualNotification((prev) => ({
      ...prev,
      title: template.title,
      message: template.message,
      type: template.type,
      priority: template.priority,
      expires_at: toExpiresAtIso(template.expiresInDays),
    }))
  }

  const applyTemplateToBroadcast = (templateKey: string) => {
    const template = notificationTemplates.find((item) => item.key === templateKey)
    if (!template) return

    setBroadcastNotification((prev) => ({
      ...prev,
      title: template.title,
      message: template.message,
      type: template.type,
      priority: template.priority,
      expires_at: toExpiresAtIso(template.expiresInDays),
    }))
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

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="backdrop-blur-sm bg-white/85 border-0 shadow-md">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.total_notifications ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-sm bg-white/85 border-0 shadow-md">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">No leídas</p>
            <p className="text-2xl font-bold text-rose-600">{stats?.unread_notifications ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-sm bg-white/85 border-0 shadow-md">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Leídas</p>
            <p className="text-2xl font-bold text-emerald-600">{stats?.read_notifications ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-sm bg-white/85 border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Clicadas</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.clicked_notifications ?? 0}</p>
              </div>
              <MousePointerClick className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-sm bg-white/85 border-0 shadow-md">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">CTR</p>
            <p className="text-2xl font-bold text-violet-600">{ctr}%</p>
            <p className="text-[11px] text-gray-400 mt-1">clics / total</p>
          </CardContent>
        </Card>
      </div>

      <Card className="backdrop-blur-sm bg-white/85 border-0 shadow-md">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">Actividad últimos 30 días</p>
            <p className="text-xs text-gray-500 mt-1">Volumen reciente de notificaciones enviadas desde el sistema.</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-cyan-600">{stats?.recent_notifications_30_days ?? 0}</p>
            <p className="text-xs text-gray-400">notificaciones</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={refetch}
          disabled={notificationsLoading}
          className="bg-white/80"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar estadísticas
        </Button>
      </div>

      <Card className="backdrop-blur-sm bg-white/85 border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Trazabilidad de entrega</CardTitle>
          <CardDescription>
            Estado push/email por notificación con acceso al log detallado de cada canal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(notifications || []).slice(0, 10).map((item) => (
            <div key={item.id} className="rounded-lg border bg-white p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.user} • {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleDelivery(item.id)}
                >
                  {expandedDelivery === item.id ? "Ocultar" : "Ver detalle"}
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 rounded-md bg-slate-50 px-2 py-1 text-xs">
                  <span className="font-medium">Push</span>
                  {getDeliveryBadge(item.delivery_summary?.push?.status)}
                  <span className="text-muted-foreground">intentos: {item.delivery_summary?.push?.attempts ?? 0}</span>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-slate-50 px-2 py-1 text-xs">
                  <span className="font-medium">Email</span>
                  {getDeliveryBadge(item.delivery_summary?.email?.status)}
                  <span className="text-muted-foreground">intentos: {item.delivery_summary?.email?.attempts ?? 0}</span>
                </div>
              </div>

              {expandedDelivery === item.id && (
                <div className="rounded-md border bg-slate-50 p-2 space-y-2">
                  {loadingDeliveryFor === item.id ? (
                    <p className="text-xs text-muted-foreground">Cargando logs de entrega...</p>
                  ) : (deliveryLogsByNotification[item.id] || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aún no hay logs de entrega para esta notificación.</p>
                  ) : (
                    (deliveryLogsByNotification[item.id] || []).map((log) => (
                      <div key={log.id} className="rounded bg-white border p-2 text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{log.channel_label}</Badge>
                          {getDeliveryBadge(log.status)}
                          <span className="text-muted-foreground">intentos: {log.attempts}</span>
                        </div>
                        {log.last_error ? <p className="text-rose-600">Error: {log.last_error}</p> : null}
                        <p className="text-muted-foreground">
                          Último intento: {log.last_attempt_at ? new Date(log.last_attempt_at).toLocaleString() : "-"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
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
                    <Label htmlFor="individual_template">Plantilla rápida</Label>
                    <Select onValueChange={applyTemplateToIndividual}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una plantilla" />
                      </SelectTrigger>
                      <SelectContent>
                        {notificationTemplates.map((template) => (
                          <SelectItem key={template.key} value={template.key}>
                            {template.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

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

                  <div>
                    <Label htmlFor="individual_expires_at">Expira en (opcional)</Label>
                    <Input
                      id="individual_expires_at"
                      type="datetime-local"
                      value={individualNotification.expires_at ? individualNotification.expires_at.slice(0, 16) : ""}
                      onChange={(e) =>
                        setIndividualNotification((prev) => ({
                          ...prev,
                          expires_at: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                        }))
                      }
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
                    <Label htmlFor="broadcast_template">Plantilla rápida</Label>
                    <Select onValueChange={applyTemplateToBroadcast}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una plantilla" />
                      </SelectTrigger>
                      <SelectContent>
                        {notificationTemplates.map((template) => (
                          <SelectItem key={template.key} value={template.key}>
                            {template.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

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

                  <div>
                    <Label htmlFor="broadcast_expires_at">Expira en (opcional)</Label>
                    <Input
                      id="broadcast_expires_at"
                      type="datetime-local"
                      value={broadcastNotification.expires_at ? broadcastNotification.expires_at.slice(0, 16) : ""}
                      onChange={(e) =>
                        setBroadcastNotification((prev) => ({
                          ...prev,
                          expires_at: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border border-blue-100 bg-blue-50/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      Segmentación por rol
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs text-muted-foreground mb-2">
                      Selecciona roles para filtrar destinatarios. Sin selección se envía a todos.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ROLES.map(role => (
                        <button
                          key={role.value}
                          type="button"
                          onClick={() => toggleRole(role.value)}
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                            selectedRoles.includes(role.value)
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-blue-700 border-blue-300 hover:bg-blue-50"
                          )}
                        >
                          {role.label}
                        </button>
                      ))}
                    </div>
                    {selectedRoles.length > 0 && (
                      <p className="text-xs text-blue-700 mt-1">
                        {getSegmentedUserIds()?.length ?? 0} usuario(s) seleccionado(s)
                      </p>
                    )}
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
                      Prioridad seleccionada: <span className="font-semibold">{getPriorityBadge(broadcastNotification.priority || '')}</span>
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

