"use client"

import { useState, useEffect } from "react"
import { Plus, Edit, Trash2, Eye, User, Calendar, Dumbbell, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
}

interface WorkoutPlanTemplate {
  id: string
  name: string
  description: string
  difficulty: string
  goal: string
  duration_weeks: number
  days_per_week: number
}

interface UserWorkoutPlan {
  id: string
  user: string
  template_name: string
  template_difficulty: string
  is_customized: boolean
  start_date: string
  end_date?: string
  is_active: boolean
  assigned_by_name: string
  notes: string
  created_at: string
}

export function UserWorkoutPlans() {
  const [userPlans, setUserPlans] = useState<UserWorkoutPlan[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [templates, setTemplates] = useState<WorkoutPlanTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<UserWorkoutPlan | null>(null)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterUser, setFilterUser] = useState("all")
  const [filterActive, setFilterActive] = useState("all")

  // Estados para asignar plan
  const [assignFormData, setAssignFormData] = useState({
    user: "",
    template: "",
    start_date: "",
    end_date: "",
    notes: ""
  })

  // Cargar datos
  const loadData = async () => {
    try {
      setLoading(true)
      
      // Cargar planes de usuarios
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (filterUser && filterUser !== 'all') params.append('user', filterUser)
      if (filterActive && filterActive !== 'all') params.append('is_active', filterActive)
      
      const [plansResponse, usersResponse, templatesResponse] = await Promise.all([
        fetch(`/api/user-workout-plans/?${params}`, { credentials: 'include' }),
        fetch('/api/users/', { credentials: 'include' }),
        fetch('/api/workout-plan-templates/?is_active=true', { credentials: 'include' })
      ])

      if (plansResponse.ok) {
        const plansData = await plansResponse.json()
        setUserPlans(plansData.results || plansData)
      }

      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData.results || usersData)
      }

      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json()
        setTemplates(templatesData.results || templatesData)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [searchTerm, filterUser, filterActive])

  // Asignar plan a usuario
  const handleAssignPlan = async () => {
    try {
      const response = await fetch('/api/user-workout-plans/', {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignFormData)
      })

      if (response.ok) {
        toast({
          title: "✅ Plan asignado",
          description: "El plan de entrenamiento ha sido asignado al usuario exitosamente"
        })
        setIsAssignDialogOpen(false)
        resetAssignForm()
        loadData()
      } else {
        throw new Error('Error al asignar plan')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo asignar el plan",
        variant: "destructive"
      })
    }
  }

  // Activar/desactivar plan
  const handleTogglePlan = async (plan: UserWorkoutPlan) => {
    try {
      const response = await fetch(`/api/user-workout-plans/${plan.id}/activate/`, {
        credentials: 'include',
        method: 'POST'
      })

      if (response.ok) {
        toast({
          title: "✅ Plan actualizado",
          description: `El plan ha sido ${plan.is_active ? 'desactivado' : 'activado'} exitosamente`
        })
        loadData()
      } else {
        throw new Error('Error al actualizar plan')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el plan",
        variant: "destructive"
      })
    }
  }

  // Eliminar plan
  const handleDeletePlan = async (plan: UserWorkoutPlan) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el plan asignado a este usuario?`)) {
      return
    }

    try {
      const response = await fetch(`/api/user-workout-plans/${plan.id}/`, {
        credentials: 'include',
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "✅ Plan eliminado",
          description: "El plan ha sido eliminado exitosamente"
        })
        loadData()
      } else {
        throw new Error('Error al eliminar plan')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el plan",
        variant: "destructive"
      })
    }
  }

  const resetAssignForm = () => {
    setAssignFormData({
      user: "",
      template: "",
      start_date: "",
      end_date: "",
      notes: ""
    })
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-muted text-foreground'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Planes de Entrenamiento de Usuarios</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Planes de Entrenamiento de Usuarios
          </h2>
          <p className="text-muted-foreground">Gestiona los planes asignados a los usuarios</p>
        </div>
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0">
              <Plus className="h-4 w-4 mr-2" />
              Asignar Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Asignar Plan de Entrenamiento</DialogTitle>
              <DialogDescription>
                Asigna un plan de entrenamiento a un usuario específico
              </DialogDescription>
            </DialogHeader>
            <AssignPlanForm 
              formData={assignFormData}
              setFormData={setAssignFormData}
              users={users}
              templates={templates}
              onSubmit={handleAssignPlan}
              onCancel={() => setIsAssignDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <Input
                id="search"
                placeholder="Buscar planes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user">Usuario</Label>
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los usuarios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los usuarios</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="active">Estado</Label>
              <Select value={filterActive} onValueChange={setFilterActive}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="true">Activos</SelectItem>
                  <SelectItem value="false">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("")
                  setFilterUser("all")
                  setFilterActive("all")
                }}
                className="w-full"
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de planes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {userPlans.map((plan) => (
          <Card key={plan.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{plan.template_name}</CardTitle>
                  <CardDescription>
                    Asignado a: {plan.user}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Badge className={getDifficultyColor(plan.template_difficulty)}>
                    {plan.template_difficulty === 'beginner' ? 'Principiante' : 
                     plan.template_difficulty === 'intermediate' ? 'Intermedio' : 'Avanzado'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Inicio: {new Date(plan.start_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Por: {plan.assigned_by_name}</span>
                </div>
              </div>

              {plan.notes && (
                <div className="text-sm text-muted-foreground">
                  <strong>Notas:</strong> {plan.notes}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  {plan.is_active && (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Activo
                    </Badge>
                  )}
                  {plan.is_customized && (
                    <Badge variant="outline" className="bg-purple-100 text-purple-800">
                      Personalizado
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedPlan(plan)
                      setIsViewDialogOpen(true)
                    }}
                    title="Ver detalles"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleTogglePlan(plan)}
                    title={plan.is_active ? "Desactivar" : "Activar"}
                    className={plan.is_active ? "text-yellow-600" : "text-green-600"}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeletePlan(plan)}
                    title="Eliminar"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {userPlans.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No hay planes asignados</h3>
            <p className="text-muted-foreground mb-4">
              Asigna el primer plan de entrenamiento a un usuario
            </p>
            <Button onClick={() => setIsAssignDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Asignar Plan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog para ver detalles */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Plan de Entrenamiento</DialogTitle>
            <DialogDescription>
              Información completa del plan asignado al usuario
            </DialogDescription>
          </DialogHeader>
          {selectedPlan && (
            <PlanDetails plan={selectedPlan} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Componente para el formulario de asignación
function AssignPlanForm({ 
  formData, 
  setFormData, 
  users, 
  templates, 
  onSubmit, 
  onCancel 
}: {
  formData: any
  setFormData: (data: any) => void
  users: User[]
  templates: WorkoutPlanTemplate[]
  onSubmit: () => void
  onCancel: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="user">Usuario</Label>
        <Select value={formData.user} onValueChange={(value) => setFormData({ ...formData, user: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar usuario" />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.first_name} {user.last_name} ({user.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="template">Plantilla de Plan</Label>
        <Select value={formData.template} onValueChange={(value) => setFormData({ ...formData, template: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar plantilla" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name} ({template.difficulty === 'beginner' ? 'Principiante' : 
                                 template.difficulty === 'intermediate' ? 'Intermedio' : 'Avanzado'})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">Fecha de inicio</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">Fecha de finalización (opcional)</Label>
          <Input
            id="end_date"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas (opcional)</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Notas adicionales sobre el plan..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={onSubmit}>
          Asignar Plan
        </Button>
      </div>
    </div>
  )
}

// Componente para mostrar detalles del plan
function PlanDetails({ plan }: { plan: UserWorkoutPlan }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información del Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Nombre del plan</Label>
              <p className="text-sm text-muted-foreground">{plan.template_name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Dificultad</Label>
              <p className="text-sm text-muted-foreground">
                {plan.template_difficulty === 'beginner' ? 'Principiante' : 
                 plan.template_difficulty === 'intermediate' ? 'Intermedio' : 'Avanzado'}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Estado</Label>
              <p className="text-sm text-muted-foreground">
                {plan.is_active ? 'Activo' : 'Inactivo'}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Personalizado</Label>
              <p className="text-sm text-muted-foreground">
                {plan.is_customized ? 'Sí' : 'No'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información de Asignación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Usuario</Label>
              <p className="text-sm text-muted-foreground">{plan.user}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Asignado por</Label>
              <p className="text-sm text-muted-foreground">{plan.assigned_by_name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Fecha de inicio</Label>
              <p className="text-sm text-muted-foreground">
                {new Date(plan.start_date).toLocaleDateString()}
              </p>
            </div>
            {plan.end_date && (
              <div>
                <Label className="text-sm font-medium">Fecha de finalización</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date(plan.end_date).toLocaleDateString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {plan.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{plan.notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="text-sm text-muted-foreground">
        <strong>Fecha de asignación:</strong> {new Date(plan.created_at).toLocaleDateString()}
      </div>
    </div>
  )
}



























