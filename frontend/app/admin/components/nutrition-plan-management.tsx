"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast"
import { useAdminNutritionPlans, NutritionPlan, CreateNutritionPlanData } from "@/hooks/use-admin-nutrition-plans"
import {
  Apple,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Loader2,
  AlertCircle,
  ChefHat,
  Clock,
  Users,
  Flame,
  ArrowUp,
  ArrowDown
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label as FormLabel } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function NutritionPlanManagement() {
  const {
    plans,
    stats,
    loading,
    error,
    createPlan,
    updatePlan,
    deletePlan,
    togglePlanActive,
    setAsDefault,
    bulkToggleActive,
    bulkDelete,
    refetch
  } = useAdminNutritionPlans()

  const [selectedPlans, setSelectedPlans] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingPlan, setEditingPlan] = useState<NutritionPlan | null>(null)
  const [isViewMode, setIsViewMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Estado del formulario
  const [formData, setFormData] = useState<CreateNutritionPlanData>({
    name: '',
    description: '',
    daily_calories: 2000,
    target_macros: {
      protein_percentage: 30,
      carbs_percentage: 40,
      fat_percentage: 30
    }
  })

  // Filtrar planes
  const filteredPlans = plans.filter(plan => {
    const matchesSearch = plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.description?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const handleCreate = async () => {
    try {
      setIsLoading(true)
      await createPlan(formData)
      setShowCreateDialog(false)
      setFormData({
        name: '',
        description: '',
        daily_calories: 2000,
        target_macros: {
          protein_percentage: 30,
          carbs_percentage: 40,
          fat_percentage: 30
        }
      })
      toast({
        title: "Éxito",
        description: "Plan de nutrición creado correctamente",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al crear el plan",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingPlan) return
    
    try {
      setIsLoading(true)
      await updatePlan(editingPlan.id, formData)
      setEditingPlan(null)
      setFormData({
        name: '',
        description: '',
        daily_calories: 2000,
        target_macros: {
          protein_percentage: 30,
          carbs_percentage: 40,
          fat_percentage: 30
        }
      })
      toast({
        title: "Éxito",
        description: "Plan de nutrición actualizado correctamente",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el plan",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este plan?")) return
    
    try {
      await deletePlan(id)
      toast({
        title: "Éxito",
        description: "Plan eliminado correctamente",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el plan",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Planes de Nutrición</h2>
          <p className="text-gray-600 mt-1">Gestiona los planes de nutrición del sistema</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Crear Plan
        </Button>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{stats.total_plans}</p>
                </div>
                <Apple className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Activos</p>
                  <p className="text-2xl font-bold">{stats.active_plans}</p>
                </div>
                <ChefHat className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Búsqueda y filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar planes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de planes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlans.map((plan) => (
          <Card key={plan.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {plan.description}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      setEditingPlan(plan)
                      setFormData({
                        name: plan.name,
                        description: plan.description,
                        daily_calories: plan.daily_calories,
                        target_macros: {
                          protein_percentage: plan.protein_percentage,
                          carbs_percentage: plan.carbs_percentage,
                          fat_percentage: plan.fat_percentage
                        }
                      })
                    }}>
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(plan.id)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Calorías diarias:</span>
                  <span className="font-semibold">{plan.daily_calories} kcal</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Proteína:</span>
                  <span className="font-semibold">{plan.protein_percentage}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Carbohidratos:</span>
                  <span className="font-semibold">{plan.carbs_percentage}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Grasas:</span>
                  <span className="font-semibold">{plan.fat_percentage}%</span>
                </div>
                <div className="flex gap-2 mt-4">
                  {plan.is_active && (
                    <Badge variant="default">Activo</Badge>
                  )}
                  {plan.is_default && (
                    <Badge variant="secondary">Por defecto</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPlans.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">No se encontraron planes de nutrición</p>
          </CardContent>
        </Card>
      )}

      {/* Diálogo de creación/edición */}
      <Dialog open={showCreateDialog || editingPlan !== null} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false)
          setEditingPlan(null)
          setFormData({
            name: '',
            description: '',
            daily_calories: 2000,
            target_macros: {
              protein_percentage: 30,
              carbs_percentage: 40,
              fat_percentage: 30
            }
          })
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Editar Plan de Nutrición" : "Crear Plan de Nutrición"}
            </DialogTitle>
            <DialogDescription>
              {editingPlan ? "Modifica los datos del plan" : "Completa los datos para crear un nuevo plan"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <FormLabel>Nombre</FormLabel>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Plan de Pérdida de Peso"
              />
            </div>
            <div>
              <FormLabel>Descripción</FormLabel>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del plan..."
                rows={3}
              />
            </div>
            <div>
              <FormLabel>Calorías Diarias</FormLabel>
              <Input
                type="number"
                value={formData.daily_calories}
                onChange={(e) => setFormData({ ...formData, daily_calories: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <FormLabel>Proteína (%)</FormLabel>
                <Input
                  type="number"
                  value={formData.target_macros.protein_percentage}
                  onChange={(e) => setFormData({
                    ...formData,
                    target_macros: {
                      ...formData.target_macros,
                      protein_percentage: parseFloat(e.target.value) || 0
                    }
                  })}
                />
              </div>
              <div>
                <FormLabel>Carbohidratos (%)</FormLabel>
                <Input
                  type="number"
                  value={formData.target_macros.carbs_percentage}
                  onChange={(e) => setFormData({
                    ...formData,
                    target_macros: {
                      ...formData.target_macros,
                      carbs_percentage: parseFloat(e.target.value) || 0
                    }
                  })}
                />
              </div>
              <div>
                <FormLabel>Grasas (%)</FormLabel>
                <Input
                  type="number"
                  value={formData.target_macros.fat_percentage}
                  onChange={(e) => setFormData({
                    ...formData,
                    target_macros: {
                      ...formData.target_macros,
                      fat_percentage: parseFloat(e.target.value) || 0
                    }
                  })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false)
              setEditingPlan(null)
            }}>
              Cancelar
            </Button>
            <Button onClick={editingPlan ? handleUpdate : handleCreate} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {editingPlan ? "Actualizando..." : "Creando..."}
                </>
              ) : (
                editingPlan ? "Actualizar" : "Crear"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

