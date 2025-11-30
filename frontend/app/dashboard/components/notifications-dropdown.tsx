"use client"

import { Bell, Check, Trash2, Mail, MessageSquare, Award, Calendar, X } from "lucide-react"
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
  const {
    notifications,
    unreadCount,
    markAsRead,
    deleteNotification,
    markAllAsRead,
    clearAll,
  } = useNotificationsEnhanced()

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
        return <Mail className="h-4 w-4 text-gray-600" />
      default:
        return <Bell className="h-4 w-4 text-gray-600" />
    }
  }

  const handleMarkAsRead = (id: string) => {
    markAsRead(id)
    toast({
      title: "✅ Notificación marcada como leída",
      description: "La notificación ha sido marcada como leída",
    })
  }

  const handleDeleteNotification = (id: string) => {
    deleteNotification(id)
    toast({
      title: "🗑️ Notificación eliminada",
      description: "La notificación ha sido eliminada",
    })
  }

  const handleMarkAllAsRead = () => {
    markAllAsRead()
    toast({
      title: "✅ Todas marcadas como leídas",
      description: "Todas las notificaciones han sido marcadas como leídas",
    })
  }

  const handleClearAll = () => {
    clearAll()
  }



  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 rounded-xl transition-all duration-300"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs animate-pulse bg-gradient-to-r from-rose-500 to-pink-500 border-0">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0" side="bottom">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg">Notificaciones</h3>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-8 px-2 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Marcar todas
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-8 px-2 text-xs text-red-600 hover:text-red-700"
              >
                <X className="h-3 w-3 mr-1" />
                Limpiar
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            {unreadCount > 0 ? `${unreadCount} no leídas` : "Todas leídas"}
          </p>
        </div>
        
        <ScrollArea className="h-80">
          <div className="p-2">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No hay notificaciones</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg mb-2 transition-all duration-200 hover:bg-gray-50 ${
                    notification.read ? "bg-gray-50" : "bg-blue-50 border-l-4 border-blue-500"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className={`text-sm font-medium ${
                            notification.read ? "text-gray-700" : "text-blue-900"
                          }`}>
                            {notification.title}
                          </h4>
                          <p className="text-xs text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-1 ml-2">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="h-6 w-6 p-0 hover:bg-blue-100"
                            >
                              <Check className="h-3 w-3 text-blue-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNotification(notification.id)}
                            className="h-6 w-6 p-0 hover:bg-red-100"
                          >
                            <Trash2 className="h-3 w-3 text-red-600" />
                          </Button>
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
          <div className="p-3 border-t bg-gray-50">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast({
                  title: "📱 Ver todas",
                  description: "Redirigiendo a la página de notificaciones...",
                })
              }}
              className="w-full text-xs"
            >
              Ver todas las notificaciones
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
