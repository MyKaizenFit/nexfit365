"use client"

import { useState } from "react"
import { Bell, Check, Trash2, Filter, MoreVertical, Mail, MessageSquare, Award, Calendar, Settings, User, RefreshCw, ArrowRight, RotateCcw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "@/hooks/use-toast"
import { useNotificationsEnhanced } from "@/hooks/use-notifications-enhanced"
import { Notification } from "@/lib/notification-service"

export function NotificationsPanel() {
  const [filter, setFilter] = useState("all")
  const {
    notifications,
    settings,
    loading,
    error,
    unreadCount,
    markAsRead,
    markAsUnread,
    trackClick,
    markAllAsRead,
    deleteNotification,
    updateSettings,
    refresh,
  } = useNotificationsEnhanced()

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "meal_reminder":
        return <MessageSquare className="h-4 w-4 text-orange-600" />
      case "workout_reminder":
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
      case "general":
        return <Bell className="h-4 w-4 text-indigo-600" />
      default:
        return <Bell className="h-4 w-4 text-gray-600" />
    }
  }

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case "meal_reminder":
        return <Badge className="bg-orange-100 text-orange-800 border-0">Comida</Badge>
      case "workout_reminder":
        return <Badge className="bg-purple-100 text-purple-800 border-0">Entrenamiento</Badge>
      case "achievement":
        return <Badge className="bg-yellow-100 text-yellow-800 border-0">Logro</Badge>
      case "reminder":
        return <Badge className="bg-blue-100 text-blue-800 border-0">Recordatorio</Badge>
      case "system":
        return <Badge className="bg-gray-100 text-gray-800 border-0">Sistema</Badge>
      case "admin":
        return <Badge className="bg-red-100 text-red-800 border-0">Admin</Badge>
      case "marketing":
        return <Badge className="bg-green-100 text-green-800 border-0">Marketing</Badge>
      case "general":
        return <Badge className="bg-indigo-100 text-indigo-800 border-0">General</Badge>
      default:
        return <Badge variant="outline">{getNotificationCategory(type)}</Badge>
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

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "all") return true
    if (filter === "unread") return !notification.is_read
    if (filter === "read") return notification.is_read
    return notification.type === filter
  })

  const handleSettingChange = (setting: string, checked: boolean) => {
    updateSettings({ [setting]: checked })
  }

  const getNotificationCategory = (type: string) => {
    const categories: Record<string, string> = {
      "general": "General",
      "meal_reminder": "Comidas",
      "workout_reminder": "Entrenamientos",
      "achievement": "Logros",
      "reminder": "Recordatorios",
      "system": "Sistema",
      "admin": "Admin",
      "marketing": "Marketing",
    }
    return categories[type] || type
  }

  const formatRelativeTime = (dateString: string) => {
    const now = Date.now()
    const then = new Date(dateString).getTime()
    const diffSeconds = Math.max(1, Math.floor((now - then) / 1000))

    if (diffSeconds < 60) return "hace unos segundos"
    const diffMinutes = Math.floor(diffSeconds / 60)
    if (diffMinutes < 60) return `hace ${diffMinutes} min`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `hace ${diffHours} h`
    const diffDays = Math.floor(diffHours / 24)
    return `hace ${diffDays} día${diffDays !== 1 ? "s" : ""}`
  }

  const getDateGroup = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const itemDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    if (itemDay.getTime() === today.getTime()) return "Hoy"
    if (itemDay.getTime() === yesterday.getTime()) return "Ayer"
    return "Anteriores"
  }

  const groupedNotifications = filteredNotifications.reduce(
    (groups, notification) => {
      const group = getDateGroup(notification.created_at)
      if (!groups[group]) groups[group] = []
      groups[group].push(notification)
      return groups
    },
    { Hoy: [] as Notification[], Ayer: [] as Notification[], Anteriores: [] as Notification[] }
  )

  const orderedGroups = ["Hoy", "Ayer", "Anteriores"].filter(
    (group) => groupedNotifications[group].length > 0
  )

  return (
    <div className="space-y-6">
      {/* Panel de notificaciones */}
      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                <Bell className="h-5 w-5" />
                Notificaciones
                {unreadCount > 0 && <Badge className="bg-red-500 text-white border-0 ml-2">{unreadCount}</Badge>}
              </CardTitle>
              <CardDescription>Gestiona tus notificaciones y alertas</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-40 border-2 border-gray-200 focus:border-purple-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="unread">No leídas</SelectItem>
                  <SelectItem value="read">Leídas</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="meal_reminder">Comidas</SelectItem>
                  <SelectItem value="workout_reminder">Entrenamientos</SelectItem>
                  <SelectItem value="reminder">Recordatorios</SelectItem>
                  <SelectItem value="achievement">Logros</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-violet-50 bg-transparent"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Actualizar
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-violet-50 bg-transparent"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Marcar todas
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando notificaciones...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-4">
                <Bell className="h-12 w-12 mx-auto mb-2" />
                <p className="text-red-600">{error}</p>
              </div>
              <Button onClick={refresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="bg-gradient-to-br from-purple-100 to-violet-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <Bell className="h-10 w-10 text-purple-400" />
                  </div>
                  <p className="text-lg font-medium text-gray-700">No hay notificaciones para mostrar</p>
                  <p className="text-sm text-gray-400 mt-1">Cuando recibas notificaciones, aparecerán aquí</p>
                </div>
              ) : (
              orderedGroups.map((group) => (
                <div key={group} className="space-y-3">
                  <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-md border border-gray-100">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{group}</span>
                  </div>
                  {groupedNotifications[group].map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-xl border-l-4 transition-all duration-200 hover:shadow-lg ${
                    !notification.is_read
                      ? "bg-gradient-to-r from-purple-50 to-violet-50 border-l-purple-400 hover:from-purple-100 hover:to-violet-100"
                      : "bg-white border-l-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${
                        !notification.is_read 
                          ? "bg-purple-200/50" 
                          : "bg-gray-200/50"
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h4 className={`font-bold text-base leading-tight ${!notification.is_read ? "text-gray-900" : "text-gray-700"}`}>
                            {notification.title}
                          </h4>
                          {getNotificationBadge(notification.type)}
                          {!notification.is_read && (
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-rose-100 rounded-full">
                              <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                              <span className="text-xs text-rose-700 font-medium">Nueva</span>
                            </div>
                          )}
                        </div>
                        <p className={`text-sm leading-relaxed ${!notification.is_read ? "text-gray-800" : "text-gray-600"}`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                          <span>{formatRelativeTime(notification.created_at)}</span>
                          {notification.data?.priority && (
                            <>
                              <span>•</span>
                              {getPriorityBadge(notification.data.priority)}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="backdrop-blur-sm bg-white/90 border-0 shadow-xl">
                        {!notification.is_read && (
                          <DropdownMenuItem onClick={() => markAsRead(notification.id)} className="cursor-pointer">
                            <Check className="h-4 w-4 mr-2 text-purple-600" />
                            <span className="text-purple-600">Marcar como leído</span>
                          </DropdownMenuItem>
                        )}
                        {notification.is_read && (
                          <DropdownMenuItem onClick={() => markAsUnread(notification.id)} className="cursor-pointer">
                            <RotateCcw className="h-4 w-4 mr-2 text-amber-600" />
                            <span className="text-amber-600">Marcar como no leído</span>
                          </DropdownMenuItem>
                        )}
                        {notification.action_url && (
                          <DropdownMenuItem onClick={async () => {
                            await trackClick(notification.id)
                            window.location.href = notification.action_url!
                          }} className="cursor-pointer">
                            <ArrowRight className="h-4 w-4 mr-2 text-blue-600" />
                            <span className="text-blue-600">Ir a notificación</span>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => deleteNotification(notification.id)} className="cursor-pointer text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                  ))}
                </div>
              ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuración de notificaciones */}
      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            <Filter className="h-5 w-5" />
            Configuración de Notificaciones
          </CardTitle>
          <CardDescription>Personaliza qué notificaciones quieres recibir</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Canales de notificación */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-800">Canales de notificación</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <div>
                    <Label htmlFor="email-notifications" className="text-base font-medium">
                      Notificaciones por email
                    </Label>
                    <p className="text-sm text-gray-600">Recibe notificaciones en tu correo</p>
                  </div>
                </div>
                <Switch
                  id="email-notifications"
                  checked={settings.email}
                  onCheckedChange={(checked) => handleSettingChange("email", checked)}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-green-600" />
                  <div>
                    <Label htmlFor="push-notifications" className="text-base font-medium">
                      Notificaciones push
                    </Label>
                    <p className="text-sm text-gray-600">Recibe alertas en tu dispositivo</p>
                  </div>
                </div>
                <Switch
                  id="push-notifications"
                  checked={settings.push}
                  onCheckedChange={(checked) => handleSettingChange("push", checked)}
                />
              </div>
            </div>
          </div>

          {/* Tipos de notificación */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-800">Tipos de notificación</h4>
            <div className="space-y-3">
              {[
                { key: "meals", label: "Recordatorios de comidas", icon: MessageSquare, color: "orange" },
                { key: "workouts", label: "Recordatorios de entrenamientos", icon: Calendar, color: "purple" },
                { key: "achievements", label: "Logros y recompensas", icon: Award, color: "yellow" },
                { key: "reminders", label: "Recordatorios generales", icon: Bell, color: "blue" },
              ].map((setting) => (
                <div
                  key={setting.key}
                  className={`flex items-center justify-between p-3 bg-gradient-to-r from-${setting.color}-50 to-${setting.color}-50 rounded-lg border border-${setting.color}-200`}
                >
                  <div className="flex items-center gap-3">
                    <setting.icon className={`h-5 w-5 text-${setting.color}-600`} />
                    <Label htmlFor={setting.key} className="text-base font-medium">
                      {setting.label}
                    </Label>
                  </div>
                  <Switch
                    id={setting.key}
                    checked={settings[setting.key as keyof typeof settings] as boolean}
                    onCheckedChange={(checked) => handleSettingChange(setting.key, checked)}
                  />
                </div>
              ))}

              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-600" />
                  <div>
                    <Label htmlFor="marketing" className="text-base font-medium">
                      Comunicaciones de marketing
                    </Label>
                    <p className="text-sm text-gray-600">Ofertas, noticias y actualizaciones</p>
                  </div>
                </div>
                <Switch
                  id="marketing"
                  checked={settings.marketing}
                  onCheckedChange={(checked) => handleSettingChange("marketing", checked)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
