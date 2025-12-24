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
  ArrowDown,
  X,
  BookOpen,
  Zap
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
import { fixEncoding } from "@/lib/encoding-fix"

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
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [loadingRecipe, setLoadingRecipe] = useState(false)
  const [showRecipeModal, setShowRecipeModal] = useState(false)

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
          description: fixEncoding(planDetail.description || ''),
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

  // Función para cargar una receta completa por ID
  const loadRecipeDetail = async (recipeId: string) => {
    try {
      setLoadingRecipe(true)
      const { getAuthHeaders } = await import('@/contexts/auth-context')
      const { buildApiUrl } = await import('@/lib/api')
      const headers = await getAuthHeaders()
      
      const response = await fetch(buildApiUrl(`admin/nutrition/recipes/${recipeId}/`), {
        headers
      })

      if (response.ok) {
        const recipe = await response.json()
        setSelectedRecipe(recipe)
        setShowRecipeModal(true)
      } else {
        // Si no se encuentra en el endpoint admin, intentar en el endpoint público
        const publicResponse = await fetch(buildApiUrl(`nutrition/recipes/${recipeId}/`), {
          headers
        })
        if (publicResponse.ok) {
          const recipe = await publicResponse.json()
          setSelectedRecipe(recipe)
          setShowRecipeModal(true)
        } else {
          toast({
            title: "Error",
            description: "No se pudo cargar la receta",
            variant: "destructive"
          })
        }
      }
    } catch (error) {
      console.error('Error loading recipe:', error)
      toast({
        title: "Error",
        description: "Error al cargar la receta",
        variant: "destructive"
      })
    } finally {
      setLoadingRecipe(false)
    }
  }

  // Función para manejar el clic en una receta
  const handleViewRecipe = async (recipeItem: string | Recipe) => {
    if (typeof recipeItem === 'object' && recipeItem !== null) {
      // Si ya tenemos la receta completa, mostrarla directamente
      setSelectedRecipe(recipeItem as Recipe)
      setShowRecipeModal(true)
    } else {
      // Si solo tenemos el ID, cargar la receta completa
      await loadRecipeDetail(recipeItem as string)
    }
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
                  <CardTitle className="text-lg">{fixEncoding(plan.name)}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {fixEncoding(plan.description || '')}
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
                                const recipeId = isObject ? (recipeItem as any).id : recipeItem as string
                                
                                return (
                                  <div key={idx} className="bg-gray-50 rounded-lg p-2 text-sm hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate">
                                          {recipeName}
                                        </div>
                                        {recipe && (
                                          <div className="text-xs text-gray-500 mt-1">
                                            {recipe.calories} kcal | P:{recipe.protein}g C:{recipe.carbs}g G:{recipe.fat}g
                                          </div>
                                        )}
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 flex-shrink-0"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleViewRecipe(recipeItem)
                                        }}
                                        disabled={loadingRecipe}
                                      >
                                        <Eye className="w-3 h-3" />
                                      </Button>
                                    </div>
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

      {/* Modal de detalles de receta */}
      {showRecipeModal && selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          onClose={() => {
            setShowRecipeModal(false)
            setSelectedRecipe(null)
          }}
        />
      )}
    </div>
  )
}

// Componente modal para mostrar detalles completos de una receta
interface RecipeDetailModalProps {
  recipe: Recipe
  onClose: () => void
}

function RecipeDetailModal({ recipe, onClose }: RecipeDetailModalProps) {
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'hard': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getDifficultyLabel = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'Fácil'
      case 'medium': return 'Medio'
      case 'hard': return 'Difícil'
      default: return difficulty || 'No especificado'
    }
  }

  const formatMacro = (value: number | string | undefined): string => {
    if (value === undefined || value === null) return '0'
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '0'
    const rounded = Math.round(num * 10) / 10
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1)
  }

  const formatIngredients = (ingredients: any): Array<{ name: string; amount: string | number | null; unit: string | null }> => {
    if (!ingredients) return []
    if (Array.isArray(ingredients)) {
      return ingredients.map(ing => {
        if (typeof ing === 'string') {
          return { name: ing, amount: null, unit: null }
        }
        if (typeof ing === 'object') {
          return {
            name: ing.name || ing.ingredient || 'Ingrediente',
            amount: ing.amount || ing.quantity || null,
            unit: ing.unit || 'g'
          }
        }
        return { name: String(ing), amount: null, unit: null }
      })
    }
    return []
  }

  const ingredients = formatIngredients(recipe.ingredients)
  const instructions = recipe.instructions 
    ? (typeof recipe.instructions === 'string' ? recipe.instructions.split('\n') : recipe.instructions)
    : []

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-xl flex items-center justify-center">
                  <ChefHat className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <DialogTitle className="text-2xl font-bold">{recipe.name}</DialogTitle>
                  <DialogDescription className="text-sm text-gray-600 mt-1">
                    {recipe.description || 'Sin descripción'}
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {recipe.difficulty && (
                  <Badge className={getDifficultyColor(recipe.difficulty)}>
                    {getDifficultyLabel(recipe.difficulty)}
                  </Badge>
                )}
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {recipe.prep_time_minutes || 0} min prep + {recipe.cook_time_minutes || 0} min cocción
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {recipe.servings || 1} {recipe.servings === 1 ? 'porción' : 'porciones'}
                </Badge>
                {recipe.category && (
                  <Badge variant="secondary">{recipe.category}</Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Macros */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center bg-orange-50 rounded-lg p-4 border border-orange-100">
              <div className="text-2xl font-bold text-orange-600 mb-1">
                {recipe.calories || 0}
              </div>
              <div className="text-xs text-orange-500 font-medium">kcal</div>
            </div>
            <div className="text-center bg-blue-50 rounded-lg p-4 border border-blue-100">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {formatMacro(recipe.protein)}g
              </div>
              <div className="text-xs text-blue-500 font-medium">Proteína</div>
            </div>
            <div className="text-center bg-green-50 rounded-lg p-4 border border-green-100">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {formatMacro(recipe.carbs)}g
              </div>
              <div className="text-xs text-green-500 font-medium">Carbos</div>
            </div>
            <div className="text-center bg-yellow-50 rounded-lg p-4 border border-yellow-100">
              <div className="text-2xl font-bold text-yellow-600 mb-1">
                {formatMacro(recipe.fat)}g
              </div>
              <div className="text-xs text-yellow-500 font-medium">Grasas</div>
            </div>
          </div>

          {/* Ingredientes */}
          {ingredients.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-orange-500" />
                Ingredientes
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                {ingredients.map((ingredient, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                    <span className="text-gray-700 font-medium">{ingredient.name}</span>
                    {ingredient.amount !== null && (
                      <span className="text-gray-600 font-semibold">
                        {ingredient.amount} {ingredient.unit || 'g'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instrucciones */}
          {instructions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-500" />
                Instrucciones
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                {instructions.map((instruction, index) => (
                  instruction.trim() && (
                    <div key={index} className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <p className="text-gray-700 flex-1">{instruction.trim()}</p>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Información adicional */}
          {(recipe.fiber || recipe.sugar || recipe.sodium) && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Información Nutricional Adicional</h3>
              <div className="grid grid-cols-3 gap-4">
                {recipe.fiber && (
                  <div className="text-center bg-purple-50 rounded-lg p-3 border border-purple-100">
                    <div className="text-lg font-bold text-purple-600">{formatMacro(recipe.fiber)}g</div>
                    <div className="text-xs text-purple-500 font-medium">Fibra</div>
                  </div>
                )}
                {recipe.sugar && (
                  <div className="text-center bg-pink-50 rounded-lg p-3 border border-pink-100">
                    <div className="text-lg font-bold text-pink-600">{formatMacro(recipe.sugar)}g</div>
                    <div className="text-xs text-pink-500 font-medium">Azúcar</div>
                  </div>
                )}
                {recipe.sodium && (
                  <div className="text-center bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                    <div className="text-lg font-bold text-indigo-600">{formatMacro(recipe.sodium)}mg</div>
                    <div className="text-xs text-indigo-500 font-medium">Sodio</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

