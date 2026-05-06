"use client"

import { useState } from "react"
import { Bell, Check, Trash2, Mail, MessageSquare, Award, Calendar, X, ArrowRight, RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/hooks/use-toast"
import { useNotificationsEnhanced } from "@/hooks/use-notifications-enhanced"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function NotificationsDropdown() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAsUnread,
    trackClick,
    deleteNotification,
    markAllAsRead,
    clearAll,
  } = useNotificationsEnhanced()

  const closeOnMobile = () => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches) {
      setOpen(false)
    }
  }

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
        return <Mail className="h-4 w-4 text-gray-600" />
      case "general":
        return <Bell className="h-4 w-4 text-indigo-600" />
      default:
        return <Bell className="h-4 w-4 text-gray-600" />
    }
  }

  const handleMarkAsRead = (id: string) => {
    markAsRead(id)
    closeOnMobile()
    toast({
      title: "✅ Notificación marcada como leída",
      description: "La notificación ha sido marcada como leída",
    })
  }

  const handleDeleteNotification = (id: string) => {
    deleteNotification(id)
    closeOnMobile()
    toast({
      title: "🗑️ Notificación eliminada",
      description: "La notificación ha sido eliminada",
    })
  }

  const handleMarkAllAsRead = () => {
    markAllAsRead()
    closeOnMobile()
    toast({
      title: "✅ Todas marcadas como leídas",
      description: "Todas las notificaciones han sido marcadas como leídas",
    })
  }

  const handleClearAll = () => {
    const accepted = window.confirm("¿Seguro que quieres eliminar todas las notificaciones?")
    if (!accepted) return
    clearAll()
    closeOnMobile()
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



  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-gradient-to-r hover:from-purple-50 hover:to-violet-50 rounded-xl transition-all duration-300"
        >
          <Bell className="h-5 w-5 text-purple-600" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs animate-pulse bg-gradient-to-r from-rose-500 to-pink-500 border-0 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[90vw] sm:w-96 p-0 shadow-2xl border-0 backdrop-blur-sm bg-white/95" side="bottom">
        <div className="p-4 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-violet-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-purple-600" />
              <h3 className="font-bold text-lg bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                Notificaciones
              </h3>
            </div>
            <div className="flex gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="h-8 px-2 text-xs text-purple-600 hover:bg-purple-100 transition-all"
                  title="Marcar todas como leídas"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Marcar
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-8 px-2 text-xs text-red-600 hover:bg-red-100 transition-all"
                  title="Eliminar todas las notificaciones"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600 font-medium">
            {unreadCount > 0 ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                {unreadCount} notificación{unreadCount !== 1 ? "es" : ""} sin leer
              </span>
            ) : (
              "Todas las notificaciones leídas ✓"
            )}
          </p>
        </div>
        
        <ScrollArea className="h-96">
          <div className="p-3 space-y-2">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="bg-gradient-to-br from-purple-100 to-violet-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                  <Bell className="h-8 w-8 text-purple-400" />
                </div>
                <p className="font-medium">No hay notificaciones</p>
                <p className="text-xs text-gray-400">Estás todo al día ✨</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`group p-3 rounded-lg transition-all duration-200 cursor-default border-l-4 ${
                    notification.read 
                      ? "bg-gray-50 border-l-gray-200 hover:bg-gray-100" 
                      : "bg-gradient-to-r from-purple-50 to-violet-50 border-l-purple-400 hover:from-purple-100 hover:to-violet-100"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className={`text-sm font-bold leading-tight ${
                            notification.read ? "text-gray-700" : "text-gray-900"
                          }`}>
                            {notification.title}
                          </h4>
                          <p className={`text-xs mt-1 leading-relaxed ${
                            notification.read ? "text-gray-500" : "text-gray-700"
                          }`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <p className="text-xs text-gray-500">
                              {formatRelativeTime(notification.created_at)}
                            </p>
                            {!notification.read && (
                              <span className="inline-block w-2 h-2 bg-purple-500 rounded-full" />
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="h-7 w-7 p-0 hover:bg-purple-100 transition-colors"
                              title="Marcar como leído"
                            >
                              <Check className="h-3.5 w-3.5 text-purple-600" />
                            </Button>
                          )}
                          {notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                markAsUnread(notification.id)
                                closeOnMobile()
                              }}
                              className="h-7 w-7 p-0 hover:bg-amber-100 transition-colors"
                              title="Marcar como no leída"
                            >
                              <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNotification(notification.id)}
                            className="h-7 w-7 p-0 hover:bg-red-100 transition-colors"
                            title="Eliminar notificación"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-600" />
                          </Button>
                          {notification.action_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                await trackClick(notification.id)
                                window.location.href = notification.action_url!
                              }}
                              className="h-7 w-7 p-0 hover:bg-blue-100 transition-colors"
                              title="Abrir enlace"
                            >
                              <ArrowRight className="h-3.5 w-3.5 text-blue-600" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        
        {notifications.length > 0 && (
          <div className="p-3 border-t border-purple-100 bg-gradient-to-r from-purple-50 to-violet-50">
            <Button
              onClick={() => {
                setOpen(false)
                router.push("/dashboard?section=settings&tab=notifications")
              }}
              className="w-full bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white border-0 transition-all duration-300 font-semibold text-sm group"
            >
              Ver todas las notificaciones
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
