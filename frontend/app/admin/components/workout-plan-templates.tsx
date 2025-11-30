"use client"

import { useState, useEffect } from "react"
import { Plus, Edit, Trash2, Copy, Eye, Dumbbell, Clock, Target, Users } from "lucide-react"
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

interface Exercise {
  id: string
  name: string
  sets: number
  reps: string
  weight: string
  duration?: number
  rest_time: number
  notes: string
  order_index: number
}

interface WorkoutDay {
  id: string
  day_name: string
  day_number: number
  is_rest_day: boolean
  notes: string
  order_index: number
  exercises: Exercise[]
}

interface WorkoutPlanTemplate {
  id: string
  name: string
  description: string
  difficulty: string
  goal: string
  duration_weeks: number
  days_per_week: number
  is_active: boolean
  is_public: boolean
  created_by_name: string
  tags: string[]
  days_count: number
  created_at: string
  days?: WorkoutDay[]
}

export function WorkoutPlanTemplates() {
  const [templates, setTemplates] = useState<WorkoutPlanTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutPlanTemplate | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterDifficulty, setFilterDifficulty] = useState("")
  const [filterGoal, setFilterGoal] = useState("")

  // Estados para crear/editar plantilla
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    difficulty: "beginner",
    goal: "general_fitness",
    duration_weeks: 4,
    days_per_week: 3,
    is_active: true,
    is_public: true,
    tags: [] as string[],
    days: [] as WorkoutDay[]
  })

  // Cargar plantillas
  const loadTemplates = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (filterDifficulty) params.append('difficulty', filterDifficulty)
      if (filterGoal) params.append('goal', filterGoal)
      
      const response = await fetch(`/api/workout-plan-templates/?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.results || data)
      }
    } catch (error) {
      console.error('Error cargando plantillas:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las plantillas",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [searchTerm, filterDifficulty, filterGoal])

  // Crear nueva plantilla
  const handleCreateTemplate = async () => {
    try {
      const response = await fetch('/api/workout-plan-templates/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast({
          title: "✅ Plantilla creada",
          description: "La plantilla de entrenamiento ha sido creada exitosamente"
        })
        setIsCreateDialogOpen(false)
        resetForm()
        loadTemplates()
      } else {
        throw new Error('Error al crear plantilla')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la plantilla",
        variant: "destructive"
      })
    }
  }

  // Duplicar plantilla
  const handleDuplicateTemplate = async (template: WorkoutPlanTemplate) => {
    try {
      const response = await fetch(`/api/workout-plan-templates/${template.id}/duplicate/`, {
        method: 'POST'
      })

      if (response.ok) {
        toast({
          title: "✅ Plantilla duplicada",
          description: "La plantilla ha sido duplicada exitosamente"
        })
        loadTemplates()
      } else {
        throw new Error('Error al duplicar plantilla')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo duplicar la plantilla",
        variant: "destructive"
      })
    }
  }

  // Eliminar plantilla
  const handleDeleteTemplate = async (template: WorkoutPlanTemplate) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la plantilla "${template.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/workout-plan-templates/${template.id}/`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "✅ Plantilla eliminada",
          description: "La plantilla ha sido eliminada exitosamente"
        })
        loadTemplates()
      } else {
        throw new Error('Error al eliminar plantilla')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la plantilla",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      difficulty: "beginner",
      goal: "general_fitness",
      duration_weeks: 4,
      days_per_week: 3,
      is_active: true,
      is_public: true,
      tags: [],
      days: []
    })
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getGoalColor = (goal: string) => {
    switch (goal) {
      case 'weight_loss': return 'bg-blue-100 text-blue-800'
      case 'muscle_gain': return 'bg-purple-100 text-purple-800'
      case 'strength_building': return 'bg-orange-100 text-orange-800'
      case 'endurance': return 'bg-green-100 text-green-800'
      case 'general_fitness': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Plantillas de Planes de Entrenamiento</h2>
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
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
            Plantillas de Planes de Entrenamiento
          </h2>
          <p className="text-muted-foreground">Gestiona las plantillas de planes de entrenamiento</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white border-0">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Plantilla
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nueva Plantilla de Plan de Entrenamiento</DialogTitle>
              <DialogDescription>
                Crea una nueva plantilla que los administradores pueden asignar a los usuarios
              </DialogDescription>
            </DialogHeader>
            <CreateTemplateForm 
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleCreateTemplate}
              onCancel={() => setIsCreateDialogOpen(false)}
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
                placeholder="Buscar plantillas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="difficulty">Dificultad</Label>
              <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las dificultades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las dificultades</SelectItem>
                  <SelectItem value="beginner">Principiante</SelectItem>
                  <SelectItem value="intermediate">Intermedio</SelectItem>
                  <SelectItem value="advanced">Avanzado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal">Objetivo</Label>
              <Select value={filterGoal} onValueChange={setFilterGoal}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los objetivos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los objetivos</SelectItem>
                  <SelectItem value="weight_loss">Pérdida de peso</SelectItem>
                  <SelectItem value="muscle_gain">Ganancia muscular</SelectItem>
                  <SelectItem value="strength_building">Fuerza</SelectItem>
                  <SelectItem value="endurance">Resistencia</SelectItem>
                  <SelectItem value="general_fitness">Fitness general</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("")
                  setFilterDifficulty("")
                  setFilterGoal("")
                }}
                className="w-full"
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de plantillas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {template.description || "Sin descripción"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Badge className={getDifficultyColor(template.difficulty)}>
                    {template.difficulty === 'beginner' ? 'Principiante' : 
                     template.difficulty === 'intermediate' ? 'Intermedio' : 'Avanzado'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={getGoalColor(template.goal)}>
                  {template.goal === 'weight_loss' ? 'Pérdida de peso' :
                   template.goal === 'muscle_gain' ? 'Ganancia muscular' :
                   template.goal === 'strength_building' ? 'Fuerza' :
                   template.goal === 'endurance' ? 'Resistencia' : 'Fitness general'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{template.duration_weeks} semanas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-muted-foreground" />
                  <span>{template.days_per_week} días/semana</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span>{template.days_count} días</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{template.created_by_name}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  {template.is_active && (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Activo
                    </Badge>
                  )}
                  {template.is_public && (
                    <Badge variant="outline">
                      Público
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedTemplate(template)
                      setIsViewDialogOpen(true)
                    }}
                    title="Ver detalles"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDuplicateTemplate(template)}
                    title="Duplicar"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteTemplate(template)}
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

      {templates.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No hay plantillas</h3>
            <p className="text-muted-foreground mb-4">
              Crea tu primera plantilla de plan de entrenamiento
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Plantilla
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog para ver detalles */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              Detalles de la plantilla de plan de entrenamiento
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <TemplateDetails template={selectedTemplate} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Componente para el formulario de creación
function CreateTemplateForm({ 
  formData, 
  setFormData, 
  onSubmit, 
  onCancel 
}: {
  formData: any
  setFormData: (data: any) => void
  onSubmit: () => void
  onCancel: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre del plan</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="ej: Plan de Fuerza para Principiantes"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration_weeks">Duración (semanas)</Label>
          <Input
            id="duration_weeks"
            type="number"
            min="1"
            max="52"
            value={formData.duration_weeks}
            onChange={(e) => setFormData({ ...formData, duration_weeks: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="difficulty">Dificultad</Label>
          <Select value={formData.difficulty} onValueChange={(value) => setFormData({ ...formData, difficulty: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Principiante</SelectItem>
              <SelectItem value="intermediate">Intermedio</SelectItem>
              <SelectItem value="advanced">Avanzado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="goal">Objetivo</Label>
          <Select value={formData.goal} onValueChange={(value) => setFormData({ ...formData, goal: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weight_loss">Pérdida de peso</SelectItem>
              <SelectItem value="muscle_gain">Ganancia muscular</SelectItem>
              <SelectItem value="strength_building">Fuerza</SelectItem>
              <SelectItem value="endurance">Resistencia</SelectItem>
              <SelectItem value="general_fitness">Fitness general</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe el plan de entrenamiento..."
          rows={3}
        />
      </div>

      <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    title="Marcar como plan activo"
                    aria-label="Marcar como plan activo"
                  />
                  <Label htmlFor="is_active">Plan activo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    title="Marcar como plan público"
                    aria-label="Marcar como plan público"
                  />
                  <Label htmlFor="is_public">Plan público</Label>
                </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={onSubmit}>
          Crear Plantilla
        </Button>
      </div>
    </div>
  )
}

// Componente para mostrar detalles de la plantilla
function TemplateDetails({ template }: { template: WorkoutPlanTemplate }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{template.duration_weeks}</div>
              <div className="text-sm text-muted-foreground">Semanas</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{template.days_per_week}</div>
              <div className="text-sm text-muted-foreground">Días por semana</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{template.days_count}</div>
              <div className="text-sm text-muted-foreground">Días totales</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Información del Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Dificultad</Label>
            <p className="text-sm text-muted-foreground">
              {template.difficulty === 'beginner' ? 'Principiante' : 
               template.difficulty === 'intermediate' ? 'Intermedio' : 'Avanzado'}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium">Objetivo</Label>
            <p className="text-sm text-muted-foreground">
              {template.goal === 'weight_loss' ? 'Pérdida de peso' :
               template.goal === 'muscle_gain' ? 'Ganancia muscular' :
               template.goal === 'strength_building' ? 'Fuerza' :
               template.goal === 'endurance' ? 'Resistencia' : 'Fitness general'}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium">Creado por</Label>
            <p className="text-sm text-muted-foreground">{template.created_by_name}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Fecha de creación</Label>
            <p className="text-sm text-muted-foreground">
              {new Date(template.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {template.description && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Descripción</Label>
          <p className="text-sm text-muted-foreground">{template.description}</p>
        </div>
      )}

      {template.tags && template.tags.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Etiquetas</Label>
          <div className="flex flex-wrap gap-2">
            {template.tags.map((tag, index) => (
              <Badge key={index} variant="outline">{tag}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
