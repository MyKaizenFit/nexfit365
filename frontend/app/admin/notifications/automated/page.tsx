"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { 
  Settings, 
  Play, 
  Pause, 
  Clock, 
  Bell, 
  AlertTriangle,
  CheckCircle,
  Edit,
  Save,
  X
} from "lucide-react"
import { useAutomatedNotifications } from "@/lib/automated-notifications"
import { useAuth } from "@/contexts/auth-context"

export default function AutomatedNotificationsPage() {
  const { user: currentUser } = useAuth()
  const { startService, stopService, getRules, toggleRule, updateRule } = useAutomatedNotifications()
  const [rules, setRules] = useState(getRules())
  const [editingRule, setEditingRule] = useState<string | null>(null)
  const [serviceRunning, setServiceRunning] = useState(false)

  // Verificar permisos de administrador
  if (!currentUser?.is_staff && !currentUser?.is_superuser) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acceso Denegado</h2>
            <p className="text-gray-600">No tienes permisos para acceder a esta sección.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleToggleRule = (ruleId: string, enabled: boolean) => {
    toggleRule(ruleId, enabled)
    setRules(getRules())
    toast({
      title: enabled ? "✅ Regla habilitada" : "⏸️ Regla deshabilitada",
      description: `La regla de notificación ha sido ${enabled ? 'habilitada' : 'deshabilitada'}`,
    })
  }

  const handleStartService = () => {
    startService()
    setServiceRunning(true)
    toast({
      title: "🚀 Servicio iniciado",
      description: "El servicio de notificaciones automáticas ha sido iniciado",
    })
  }

  const handleStopService = () => {
    stopService()
    setServiceRunning(false)
    toast({
      title: "⏹️ Servicio detenido",
      description: "El servicio de notificaciones automáticas ha sido detenido",
    })
  }

  const handleEditRule = (ruleId: string) => {
    setEditingRule(ruleId)
  }

  const handleSaveRule = (ruleId: string, updates: any) => {
    updateRule(ruleId, updates)
    setRules(getRules())
    setEditingRule(null)
    toast({
      title: "✅ Regla actualizada",
      description: "La regla de notificación ha sido actualizada",
    })
  }

  const handleCancelEdit = () => {
    setEditingRule(null)
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

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "meal":
        return <Badge className="bg-orange-100 text-orange-800 border-0">Comida</Badge>
      case "workout":
        return <Badge className="bg-purple-100 text-purple-800 border-0">Entrenamiento</Badge>
      case "achievement":
        return <Badge className="bg-yellow-100 text-yellow-800 border-0">Logro</Badge>
      case "reminder":
        return <Badge className="bg-blue-100 text-blue-800 border-0">Recordatorio</Badge>
      case "system":
        return <Badge className="bg-gray-100 text-gray-800 border-0">Sistema</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-green-100 rounded-lg">
          <Settings className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Notificaciones Automáticas</h1>
          <p className="text-gray-600">Gestiona las reglas de notificaciones automáticas</p>
        </div>
      </div>

      {/* Control del Servicio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Control del Servicio
          </CardTitle>
          <CardDescription>
            Inicia o detén el servicio de notificaciones automáticas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${serviceRunning ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm font-medium">
                  Servicio {serviceRunning ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <Badge variant={serviceRunning ? "default" : "secondary"}>
                {serviceRunning ? "Ejecutándose" : "Detenido"}
              </Badge>
            </div>
            <div className="flex gap-2">
              {!serviceRunning ? (
                <Button onClick={handleStartService} className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Iniciar Servicio
                </Button>
              ) : (
                <Button onClick={handleStopService} variant="outline" className="flex items-center gap-2">
                  <Pause className="h-4 w-4" />
                  Detener Servicio
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reglas de Notificación */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Reglas de Notificación</h2>
        <div className="grid gap-4">
          {rules.map((rule) => (
            <Card key={rule.id} className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                      />
                      <Label className="text-base font-medium">{rule.name}</Label>
                    </div>
                    {getTypeBadge(rule.notification.type)}
                    {getPriorityBadge(rule.notification.priority)}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingRule === rule.id ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleSaveRule(rule.id, {})}
                          className="flex items-center gap-1"
                        >
                          <Save className="h-4 w-4" />
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                          className="flex items-center gap-1"
                        >
                          <X className="h-4 w-4" />
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditRule(rule.id)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-4 w-4" />
                        Editar
                      </Button>
                    )}
                  </div>
                </div>
                <CardDescription>{rule.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Información de la notificación */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Título</Label>
                    {editingRule === rule.id ? (
                      <Input
                        value={rule.notification.title}
                        onChange={(e) => {
                          const updatedRule = { ...rule }
                          updatedRule.notification.title = e.target.value
                          setRules(rules.map(r => r.id === rule.id ? updatedRule : r))
                        }}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-sm text-gray-600 mt-1">{rule.notification.title}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Mensaje</Label>
                    {editingRule === rule.id ? (
                      <Textarea
                        value={rule.notification.message}
                        onChange={(e) => {
                          const updatedRule = { ...rule }
                          updatedRule.notification.message = e.target.value
                          setRules(rules.map(r => r.id === rule.id ? updatedRule : r))
                        }}
                        className="mt-1"
                        rows={2}
                      />
                    ) : (
                      <p className="text-sm text-gray-600 mt-1">{rule.notification.message}</p>
                    )}
                  </div>
                </div>

                {/* Configuración avanzada */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Prioridad</Label>
                    {editingRule === rule.id ? (
                      <Select
                        value={rule.notification.priority}
                        onValueChange={(value) => {
                          const updatedRule = { ...rule }
                          updatedRule.notification.priority = value as any
                          setRules(rules.map(r => r.id === rule.id ? updatedRule : r))
                        }}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Baja</SelectItem>
                          <SelectItem value="medium">Media</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                          <SelectItem value="urgent">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="mt-1">{getPriorityBadge(rule.notification.priority)}</div>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Cooldown (horas)</Label>
                    {editingRule === rule.id ? (
                      <Input
                        type="number"
                        value={rule.cooldownHours}
                        onChange={(e) => {
                          const updatedRule = { ...rule }
                          updatedRule.cooldownHours = parseInt(e.target.value)
                          setRules(rules.map(r => r.id === rule.id ? updatedRule : r))
                        }}
                        className="mt-1"
                        min="1"
                        max="168"
                      />
                    ) : (
                      <p className="text-sm text-gray-600 mt-1">{rule.cooldownHours} horas</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Última Activación</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      {rule.lastTriggered 
                        ? new Date(rule.lastTriggered).toLocaleString()
                        : 'Nunca'
                      }
                    </p>
                  </div>
                </div>

                {/* Acción de la notificación */}
                {rule.notification.actionable && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Texto del Botón</Label>
                      {editingRule === rule.id ? (
                        <Input
                          value={rule.notification.action_text || ''}
                          onChange={(e) => {
                            const updatedRule = { ...rule }
                            updatedRule.notification.action_text = e.target.value
                            setRules(rules.map(r => r.id === rule.id ? updatedRule : r))
                          }}
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-sm text-gray-600 mt-1">{rule.notification.action_text}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">URL de Acción</Label>
                      {editingRule === rule.id ? (
                        <Input
                          value={rule.notification.action_url || ''}
                          onChange={(e) => {
                            const updatedRule = { ...rule }
                            updatedRule.notification.action_url = e.target.value
                            setRules(rules.map(r => r.id === rule.id ? updatedRule : r))
                          }}
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-sm text-gray-600 mt-1">{rule.notification.action_url}</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Estadísticas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Estadísticas del Servicio
          </CardTitle>
          <CardDescription>
            Información sobre el rendimiento del servicio de notificaciones automáticas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{rules.length}</div>
              <div className="text-sm text-gray-600">Reglas Configuradas</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {rules.filter(r => r.enabled).length}
              </div>
              <div className="text-sm text-gray-600">Reglas Activas</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {rules.filter(r => r.lastTriggered).length}
              </div>
              <div className="text-sm text-gray-600">Reglas Ejecutadas</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}



























