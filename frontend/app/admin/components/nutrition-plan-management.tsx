"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast"
import { useAdminNutritionPlans, NutritionPlan, CreateNutritionPlanData, PlanMeal, Recipe } from "@/hooks/use-admin-nutrition-plans"
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
    fetchPlanDetail,
    fetchRecipes,
    refetch
  } = useAdminNutritionPlans()

  const [selectedPlans, setSelectedPlans] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingPlan, setEditingPlan] = useState<NutritionPlan | null>(null)
  const [isViewMode, setIsViewMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [planMeals, setPlanMeals] = useState<PlanMeal[]>([])
  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([])

  // Cargar recetas disponibles al montar
  useEffect(() => {
    const loadRecipes = async () => {
      const recipes = await fetchRecipes()
      setAvailableRecipes(recipes)
    }
    loadRecipes()
  }, [])

  // Función para cargar los detalles completos de un plan
  const handleEditPlan = async (planId: string) => {
    try {
      setLoadingDetail(true)
      const planDetail = await fetchPlanDetail(planId)
      
      if (planDetail) {
        setFormData({
          name: planDetail.name || '',
          description: planDetail.description || '',
          daily_calories: planDetail.daily_calories || 2000,
          target_macros: {
            protein_percentage: planDetail.protein_percentage || 30,
            carbs_percentage: planDetail.carbs_percentage || 40,
            fat_percentage: planDetail.fat_percentage || 30
          }
        })
        
        // Cargar las comidas del plan
        setPlanMeals(planDetail.meals || [])
        setEditingPlan(planDetail)
      }
    } catch (error) {
      console.error('Error loading plan detail:', error)
    } finally {
      setLoadingDetail(false)
    }
  }

  // Función para obtener el nombre de una receta por ID
  const getRecipeName = (recipeId: string): string => {
    const recipe = availableRecipes.find(r => r.id === recipeId)
    return recipe?.name || recipeId
  }

  // Función para obtener los macros de una receta
  const getRecipeMacros = (recipeId: string): Recipe | null => {
    return availableRecipes.find(r => r.id === recipeId) || null
  }

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
                    <DropdownMenuItem 
                      onClick={() => handleEditPlan(plan.id)}
                      disabled={loadingDetail}
                    >
                      {loadingDetail ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Eye className="w-4 h-4 mr-2" />
                      )}
                      Ver Detalles
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleEditPlan(plan.id)}
                      disabled={loadingDetail}
                    >
                      {loadingDetail ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Edit className="w-4 h-4 mr-2" />
                      )}
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
          setPlanMeals([])
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Editar Plan de Nutrición" : "Crear Plan de Nutrición"}
            </DialogTitle>
            <DialogDescription>
              {editingPlan ? "Modifica los datos del plan" : "Completa los datos para crear un nuevo plan"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Información básica */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FormLabel>Nombre</FormLabel>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Plan de Pérdida de Peso"
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
            </div>
            <div>
              <FormLabel>Descripción</FormLabel>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del plan..."
                rows={2}
              />
            </div>
            
            {/* Macros */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  Distribución de Macronutrientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{formData.target_macros.protein_percentage}%</div>
                    <div className="text-sm text-gray-600">Proteína</div>
                    <div className="text-xs text-gray-500">
                      ~{Math.round(formData.daily_calories * formData.target_macros.protein_percentage / 100 / 4)}g
                    </div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{formData.target_macros.carbs_percentage}%</div>
                    <div className="text-sm text-gray-600">Carbohidratos</div>
                    <div className="text-xs text-gray-500">
                      ~{Math.round(formData.daily_calories * formData.target_macros.carbs_percentage / 100 / 4)}g
                    </div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{formData.target_macros.fat_percentage}%</div>
                    <div className="text-sm text-gray-600">Grasas</div>
                    <div className="text-xs text-gray-500">
                      ~{Math.round(formData.daily_calories * formData.target_macros.fat_percentage / 100 / 9)}g
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Comidas del plan */}
            {editingPlan && planMeals.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ChefHat className="w-4 h-4 text-green-500" />
                    Comidas del Plan ({planMeals.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {planMeals.map((meal, index) => (
                    <Card key={meal.id} className="border-l-4 border-l-green-400">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-lg">{meal.name}</h4>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Clock className="w-3 h-3" />
                              {meal.time}
                              <Badge variant="outline" className="ml-2">
                                {meal.meal_type === 'breakfast' && 'Desayuno'}
                                {meal.meal_type === 'morning_snack' && 'Snack Mañana'}
                                {meal.meal_type === 'lunch' && 'Almuerzo'}
                                {meal.meal_type === 'afternoon_snack' && 'Snack Tarde'}
                                {meal.meal_type === 'dinner' && 'Cena'}
                                {meal.meal_type === 'post_workout' && 'Post-Entreno'}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-orange-600">{meal.calories} kcal</div>
                            <div className="text-xs text-gray-500">
                              P:{meal.protein}g | C:{meal.carbs}g | G:{meal.fat}g
                            </div>
                          </div>
                        </div>
                        
                        {meal.description && (
                          <p className="text-sm text-gray-600 mb-3">{meal.description}</p>
                        )}
                        
                        {/* Recetas sugeridas */}
                        {meal.suggested_recipes && meal.suggested_recipes.length > 0 && (
                          <div className="mt-3">
                            <h5 className="text-sm font-medium mb-2 flex items-center gap-1">
                              <Apple className="w-3 h-3" />
                              Opciones de Recetas ({meal.suggested_recipes.length}):
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {meal.suggested_recipes.slice(0, 6).map((recipeItem, idx) => {
                                // La receta puede venir como objeto o como ID string
                                const isObject = typeof recipeItem === 'object' && recipeItem !== null
                                const recipe = isObject ? recipeItem as Recipe : getRecipeMacros(recipeItem as string)
                                const recipeName = isObject 
                                  ? (recipeItem as any).name 
                                  : (recipe?.name || getRecipeName(recipeItem as string))
                                
                                return (
                                  <div key={idx} className="bg-gray-50 rounded-lg p-2 text-sm">
                                    <div className="font-medium truncate">
                                      {recipeName}
                                    </div>
                                    {recipe && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        {recipe.calories} kcal | P:{recipe.protein}g C:{recipe.carbs}g G:{recipe.fat}g
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                            {meal.suggested_recipes.length > 6 && (
                              <div className="text-xs text-gray-400 mt-2">
                                ... y {meal.suggested_recipes.length - 6} más
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            )}
            
            {editingPlan && planMeals.length === 0 && !loadingDetail && (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center text-gray-500">
                  <ChefHat className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Este plan no tiene comidas configuradas</p>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false)
              setEditingPlan(null)
              setPlanMeals([])
            }}>
              Cerrar
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

