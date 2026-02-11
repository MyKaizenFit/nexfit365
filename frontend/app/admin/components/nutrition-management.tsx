"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast"
import { useAdminNutrition, Nutrition, CreateNutritionData } from "@/hooks/use-admin-nutrition"
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
  ArrowLeft,
  ArrowRight,
  Salad
} from "lucide-react"
import { RecipeIngredientsEditor } from "./recipe-ingredients-editor"
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

export function NutritionManagement() {
  const {
    nutrition,
    stats,
    loading,
    error,
    createNutrition,
    updateNutrition,
    deleteNutrition,
    bulkDeleteNutrition,
    uploadRecipeImage,
    refetch
  } = useAdminNutrition()

  const [selectedNutrition, setSelectedNutrition] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all")
  const [goalFilter, setGoalFilter] = useState<string>("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingNutrition, setEditingNutrition] = useState<Nutrition | null>(null)
  const [isViewMode, setIsViewMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  
  // Editor de ingredientes
  const [ingredientsEditorOpen, setIngredientsEditorOpen] = useState(false)
  const [selectedRecipeForIngredients, setSelectedRecipeForIngredients] = useState<Nutrition | null>(null)
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50
  
  // Ordenamiento
  const [sortColumn, setSortColumn] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    difficulty: 'easy',
    prep_time_minutes: 30,
    servings: 1,
    calories_per_serving: 0,
    ingredients: '',
    instructions: '',
    image_url: '',
    tags: '',
    goal_category: ''
  })

  const goalOptions = [
    { value: '', label: 'Sin objetivo' },
    { value: 'lose_weight', label: 'Perder peso' },
    { value: 'gain_muscle', label: 'Ganar músculo' },
    { value: 'maintain', label: 'Mantener peso' },
    { value: 'body_recomposition', label: 'Recomposición corporal' },
    { value: 'performance', label: 'Rendimiento deportivo' },
  ]

  const formatIngredientLine = (ingredient: any) => {
    if (!ingredient) return ''
    if (typeof ingredient === 'string') return ingredient
    if (typeof ingredient === 'object') {
      if (ingredient.food_detail) {
        const name = ingredient.food_detail?.name || ''
        const amount = ingredient.quantity ?? ''
        const unit = ingredient.unit || ''
        const amountLabel = [amount, unit].filter(Boolean).join(' ')
        return [name, amountLabel].filter(Boolean).join(' ').trim()
      }
      const name = ingredient.name || ''
      const amount = ingredient.amount || ingredient.quantity || ''
      const unit = ingredient.unit || ''
      const amountLabel = [amount, unit].filter(Boolean).join(' ')
      return [name, amountLabel].filter(Boolean).join(' ').trim()
    }
    return ''
  }

  // Filtrar recetas - asegurar que nutrition sea un array
  const nutritionArray = Array.isArray(nutrition) ? nutrition : []
  const filteredNutrition = nutritionArray.filter(item => {
    if (!item) return false
    const ingredientText = Array.isArray(item.ingredients)
      ? item.ingredients.map(formatIngredientLine).join(' ').toLowerCase()
      : ''
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ingredientText.includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter
    const matchesDifficulty = difficultyFilter === "all" || item.difficulty === difficultyFilter
    const matchesGoal = goalFilter === "all" || (item.goal_category || '') === goalFilter
    
    return matchesSearch && matchesCategory && matchesDifficulty && matchesGoal
  })
  
  // Ordenamiento - asegurar que filteredNutrition sea un array
  const sortedNutrition = Array.isArray(filteredNutrition) ? [...filteredNutrition].sort((a, b) => {
    if (!a || !b) return 0
    let aValue: any
    let bValue: any
    
    switch (sortColumn) {
      case 'name':
        aValue = a.name?.toLowerCase() || ''
        bValue = b.name?.toLowerCase() || ''
        break
      case 'category':
        aValue = a.category || ''
        bValue = b.category || ''
        break
      case 'difficulty':
        aValue = a.difficulty || ''
        bValue = b.difficulty || ''
        break
      case 'calories':
        aValue = a.calories ?? a.calories_per_serving ?? 0
        bValue = b.calories ?? b.calories_per_serving ?? 0
        break
      case 'time':
        aValue = a.prep_time_minutes || 0
        bValue = b.prep_time_minutes || 0
        break
      default:
        return 0
    }
    
    if (typeof aValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    } else {
      return sortDirection === 'asc' 
        ? (aValue - bValue)
        : (bValue - aValue)
    }
  }) : []
  
  // Calcular paginación
  // Usar el total sin filtrar para determinar si mostrar paginación
  const totalNutrition = nutritionArray.length
  const totalPages = Math.ceil(sortedNutrition.length / 50) || 1
  const startIndex = (currentPage - 1) * 50
  const endIndex = startIndex + 50
  const currentNutrition = Array.isArray(sortedNutrition) ? sortedNutrition.slice(startIndex, endIndex) : []
  
  // Función para cambiar el ordenamiento
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }
  
  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, categoryFilter, difficultyFilter, goalFilter])

  useEffect(() => {
    if (!editingNutrition) return
    const updated = nutritionArray.find(item => item?.id === editingNutrition.id)
    if (updated) {
      setEditingNutrition(updated)
      loadNutritionData(updated)
    }
  }, [nutritionArray, editingNutrition?.id])

  // Obtener categorías únicas - asegurar que nutrition sea un array
  const categories = Array.from(new Set(nutritionArray.map(item => item?.category).filter(Boolean)))

  // Funciones para manejar el formulario
  const handleFormChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const loadNutritionData = (nutrition: Nutrition) => {
    const linkedIngredients = Array.isArray(nutrition.recipe_ingredients)
      ? nutrition.recipe_ingredients.map(formatIngredientLine).filter(Boolean)
      : []
    const ingredientsLines = linkedIngredients.length > 0
      ? linkedIngredients
      : Array.isArray(nutrition.ingredients)
        ? nutrition.ingredients.map(formatIngredientLine).filter(Boolean)
        : []
    setFormData({
      name: nutrition.name || '',
      category: nutrition.category || '',
      difficulty: nutrition.difficulty || 'easy',
      prep_time_minutes: nutrition.prep_time_minutes || 30,
      servings: nutrition.servings || 1,
      calories_per_serving: nutrition.calories ?? nutrition.calories_per_serving ?? 0,
      ingredients: ingredientsLines.join('\n'),
      instructions: nutrition.instructions || '',
      image_url: nutrition.image_url || '',
      tags: nutrition.tags?.join(', ') || '',
      goal_category: nutrition.goal_category || ''
    })
    setImageFile(null)
    setUploadingImage(false)
  }

  const handleEditNutrition = (nutrition: Nutrition) => {
    loadNutritionData(nutrition)
    setEditingNutrition(nutrition)
    setIsViewMode(false)
    setShowCreateDialog(true)
  }

  const handleViewNutrition = (nutrition: Nutrition) => {
    loadNutritionData(nutrition)
    setEditingNutrition(nutrition)
    setIsViewMode(true)
    setShowCreateDialog(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      difficulty: 'easy',
      prep_time_minutes: 30,
      servings: 1,
      calories_per_serving: 0,
      ingredients: '',
      instructions: '',
      image_url: '',
      tags: '',
      goal_category: ''
    })
    setImageFile(null)
    setUploadingImage(false)
    setShowCreateDialog(false)
    setEditingNutrition(null)
    setIsViewMode(false)
  }

  const openCreateDialog = () => {
    resetForm()
    setShowCreateDialog(true)
  }

  const handleSubmitNutrition = async () => {
    try {
      setIsLoading(true)
      
      // Validar campos requeridos
      if (!formData.name.trim() || !formData.category.trim() || !formData.instructions.trim()) {
        toast({
          title: "❌ Error",
          description: "Los campos Nombre, Categoría e Instrucciones son obligatorios",
          variant: "destructive",
        })
        return
      }

      // Preparar datos de la receta
      const nutritionData = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        difficulty: formData.difficulty as "easy" | "medium" | "hard",
        prep_time_minutes: formData.prep_time_minutes,
        servings: formData.servings,
        calories: formData.calories_per_serving,
        ingredients: formData.ingredients.split('\n').filter(ing => ing.trim()),
        instructions: formData.instructions.trim(),
        image_url: formData.image_url.trim() || undefined,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        goal_category: formData.goal_category || undefined
      }

      if (editingNutrition) {
        await updateNutrition(editingNutrition.id.toString(), nutritionData)
        toast({
          title: "✅ Receta actualizada",
          description: "La receta ha sido actualizada correctamente",
        })
      } else {
        await createNutrition(nutritionData)
        toast({
          title: "✅ Receta creada",
          description: "La receta ha sido creada correctamente",
        })
      }

      resetForm()
      
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al guardar receta",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedNutrition.length === 0) {
      toast({
        title: "❌ Error",
        description: "Selecciona al menos una receta para eliminar",
        variant: "destructive",
      })
      return
    }

    try {
      await bulkDeleteNutrition(selectedNutrition)
      setSelectedNutrition([])
      toast({
        title: "✅ Recetas eliminadas",
        description: `${selectedNutrition.length} recetas han sido eliminadas correctamente`,
      })
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al eliminar recetas",
        variant: "destructive",
      })
    }
  }

  const getDifficultyBadge = (difficulty: string) => {
    const variants = {
      easy: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      hard: "bg-red-100 text-red-800"
    }
    const labels = {
      easy: "Fácil",
      medium: "Medio",
      hard: "Difícil"
    }
    return (
      <Badge className={variants[difficulty as keyof typeof variants] || variants.easy}>
        {labels[difficulty as keyof typeof labels] || difficulty}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando recetas...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <span className="ml-2 text-red-500">Error al cargar recetas: {error}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestión de Recetas</h2>
          <p className="text-muted-foreground">
            Administra la base de datos de recetas del sistema
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Receta
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recetas</CardTitle>
              <ChefHat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_nutrition}</div>
            </CardContent>
          </Card>
          <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Por Categoría</CardTitle>
              <Apple className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(stats.nutrition_by_category || {}).length}</div>
            </CardContent>
          </Card>
          <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Por Dificultad</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(stats.nutrition_by_difficulty || {}).length}</div>
            </CardContent>
          </Card>
          <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recetas Recientes</CardTitle>
              <Flame className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recent_nutrition}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <FormLabel>Buscar</FormLabel>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar recetas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <FormLabel>Categoría</FormLabel>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FormLabel>Dificultad</FormLabel>
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las dificultades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="easy">Fácil</SelectItem>
                  <SelectItem value="medium">Medio</SelectItem>
                  <SelectItem value="hard">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <FormLabel>Objetivo</FormLabel>
              <Select value={goalFilter} onValueChange={setGoalFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los objetivos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {goalOptions.map(option => (
                    <SelectItem key={option.value || 'none'} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedNutrition.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedNutrition.length} receta(s) seleccionada(s)
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={isLoading}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Eliminar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Nutrition List - Mobile Cards / Desktop Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recetas</CardTitle>
            <div className="hidden md:flex items-center space-x-2">
              <Checkbox
                checked={selectedNutrition.length === currentNutrition.length && currentNutrition.length > 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedNutrition(Array.isArray(currentNutrition) ? currentNutrition.map(item => item.id) : [])
                  } else {
                    setSelectedNutrition([])
                  }
                }}
              />
              <span className="text-sm text-muted-foreground">
                {selectedNutrition.length > 0 ? `${selectedNutrition.length} seleccionadas` : 'Seleccionar todas'}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile View - Cards */}
          <div className="md:hidden space-y-3 p-3">
            {/* Select All Header */}
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedNutrition.length === currentNutrition.length && currentNutrition.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedNutrition(Array.isArray(currentNutrition) ? currentNutrition.map(item => item.id) : [])
                    } else {
                      setSelectedNutrition([])
                    }
                  }}
                />
                <span className="text-sm font-medium text-muted-foreground">
                  Seleccionar todas
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {selectedNutrition.length} seleccionadas
              </span>
            </div>

            {/* Recipe Cards */}
            {Array.isArray(currentNutrition) ? currentNutrition.map((item) => (
              <Card
                key={item.id}
                className={`border-2 transition-all ${
                  selectedNutrition.includes(item.id)
                    ? 'border-purple-500 bg-purple-50/50'
                    : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedNutrition.includes(item.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedNutrition(prev => [...prev, item.id])
                        } else {
                          setSelectedNutrition(prev => prev.filter(id => id !== item.id))
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base mb-1">
                            {item.name}
                          </div>
                          <div className="text-xs text-muted-foreground mb-2">
                            {(item.recipe_ingredients?.length ?? (Array.isArray(item.ingredients) ? item.ingredients.length : 0))} ingredientes
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleViewNutrition(item)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditNutrition(item)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedRecipeForIngredients(item)
                              setIngredientsEditorOpen(true)
                            }}>
                              <Salad className="h-4 w-4 mr-2" />
                              Editar Ingredientes
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => deleteNutrition(item.id.toString())}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {item.category && (
                          <Badge variant="outline" className="text-xs">
                            {item.category}
                          </Badge>
                        )}
                        {item.goal_category && (
                          <Badge variant="secondary" className="text-xs">
                            {goalOptions.find(option => option.value === item.goal_category)?.label || item.goal_category}
                          </Badge>
                        )}
                        {getDifficultyBadge(item.difficulty)}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground pt-2 border-t">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{item.prep_time_minutes} min</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{item.servings} porciones</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Flame className="h-3 w-3" />
                          <span>{item.calories ?? item.calories_per_serving ?? 0} kcal</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : null}
          </div>

          {/* Desktop View - Table */}
          <div className="hidden md:block rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left font-medium"></th>
                    <th 
                      className="p-3 text-left font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        Receta
                        {sortColumn === 'name' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="p-3 text-left font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                      onClick={() => handleSort('category')}
                    >
                      <div className="flex items-center gap-2">
                        Categoría
                        {sortColumn === 'category' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="p-3 text-left font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                      onClick={() => handleSort('difficulty')}
                    >
                      <div className="flex items-center gap-2">
                        Dificultad
                        {sortColumn === 'difficulty' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="p-3 text-left font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                      onClick={() => handleSort('time')}
                    >
                      <div className="flex items-center gap-2">
                        Tiempo
                        {sortColumn === 'time' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                    </th>
                    <th className="p-3 text-left font-medium">Porciones</th>
                    <th 
                      className="p-3 text-left font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                      onClick={() => handleSort('calories')}
                    >
                      <div className="flex items-center gap-2">
                        Calorías
                        {sortColumn === 'calories' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                    </th>
                    <th className="p-3 text-left font-medium">Acciones</th>
                </tr>
              </thead>
                <tbody>
                  {Array.isArray(currentNutrition) ? currentNutrition.map((item) => (
                    <tr key={item.id} className="border-t hover:bg-muted/50">
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={selectedNutrition.includes(item.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedNutrition(prev => [...prev, item.id])
                              } else {
                                setSelectedNutrition(prev => prev.filter(id => id !== item.id))
                              }
                            }}
                          />
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {(item.recipe_ingredients?.length ?? (Array.isArray(item.ingredients) ? item.ingredients.length : 0))} ingredientes
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{item.category}</Badge>
                      </td>
                      <td className="p-3">
                        {getDifficultyBadge(item.difficulty)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 mr-1" />
                          {item.prep_time_minutes} min
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Users className="h-4 w-4 mr-1" />
                          {item.servings}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Flame className="h-4 w-4 mr-1" />
                          {item.calories ?? item.calories_per_serving ?? 0} kcal
                        </div>
                      </td>
                      <td className="p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleViewNutrition(item)}
                              className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEditNutrition(item)}
                              className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-violet-50"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedRecipeForIngredients(item)
                                setIngredientsEditorOpen(true)
                              }}
                              className="hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50"
                            >
                              <Salad className="h-4 w-4 mr-2" />
                              Editar Ingredientes
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => deleteNutrition(item.id.toString())}
                              className="hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )) : null}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Paginación */}
          {totalPages > 0 && (
            <div className="border-t p-3 md:p-4">
              {/* Mobile View - Compact */}
              <div className="md:hidden space-y-3">
                <div className="text-xs text-center text-muted-foreground">
                  Página {currentPage} de {totalPages} • {sortedNutrition.length} recetas
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="flex-1 text-xs"
                  >
                    <ArrowLeft className="h-3 w-3 mr-1" />
                    Anterior
                  </Button>
                  <div className="flex items-center gap-1 px-2">
                    {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage === 1) {
                        pageNum = i + 1;
                      } else if (currentPage === totalPages) {
                        pageNum = totalPages - 2 + i;
                      } else {
                        pageNum = currentPage - 1 + i;
                      }
                      
                      if (pageNum < 1 || pageNum > totalPages) return null;
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-8 h-8 p-0 text-xs"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="flex-1 text-xs"
                  >
                    Siguiente
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>

              {/* Desktop View - Full */}
              <div className="hidden md:flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Mostrando {((currentPage - 1) * 50) + 1} - {Math.min(currentPage * 50, sortedNutrition.length)} de {sortedNutrition.length} recetas
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    Primera
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  
                  {/* Números de página */}
                  {totalPages > 0 && (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-10"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    Última
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para crear/editar/ver receta */}
      <Dialog open={showCreateDialog || !!editingNutrition} onOpenChange={(open) => {
        if (!open) {
          resetForm()
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isViewMode ? 'Ver Receta' : editingNutrition ? 'Editar Receta' : 'Crear Nueva Receta'}
            </DialogTitle>
            <DialogDescription>
              {isViewMode ? 'Información detallada de la receta' : editingNutrition ? 'Modifica la información de la receta' : 'Añade una nueva receta a la base de datos'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <FormLabel>Nombre de la Receta *</FormLabel>
                <Input
                  placeholder="Ej: Ensalada César"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  readOnly={isViewMode}
                  className={isViewMode ? "bg-gray-50" : ""}
                />
              </div>
              <div>
                <FormLabel>Categoría *</FormLabel>
                <Input
                  placeholder="Ej: Ensaladas, Sopas, Postres"
                  value={formData.category}
                  onChange={(e) => handleFormChange('category', e.target.value)}
                  readOnly={isViewMode}
                  className={isViewMode ? "bg-gray-50" : ""}
                />
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <FormLabel>Dificultad</FormLabel>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value) => handleFormChange('difficulty', value)}
                  disabled={isViewMode}
                >
                  <SelectTrigger className={isViewMode ? "bg-gray-50" : ""}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Fácil</SelectItem>
                    <SelectItem value="medium">Medio</SelectItem>
                    <SelectItem value="hard">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FormLabel>Tiempo de Preparación (min)</FormLabel>
                <Input
                  type="number"
                  value={formData.prep_time_minutes}
                  onChange={(e) => handleFormChange('prep_time_minutes', parseInt(e.target.value) || 30)}
                  readOnly={isViewMode}
                  className={isViewMode ? "bg-gray-50" : ""}
                />
              </div>
              <div>
                <FormLabel>Porciones</FormLabel>
                <Input
                  type="number"
                  value={formData.servings}
                  onChange={(e) => handleFormChange('servings', parseInt(e.target.value) || 1)}
                  readOnly={isViewMode}
                  className={isViewMode ? "bg-gray-50" : ""}
                />
              </div>
            </div>
            
            <div>
              <FormLabel>Calorías por Porción (auto)</FormLabel>
              <Input
                type="number"
                value={formData.calories_per_serving}
                readOnly
                className="bg-gray-50"
              />
              {formData.calories_per_serving <= 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  Pendiente de calcular: añade ingredientes vinculados para obtener macros fiables.
                </p>
              )}
            </div>

            <div>
              <FormLabel>Objetivo</FormLabel>
              <Select
                value={formData.goal_category}
                onValueChange={(value) => handleFormChange('goal_category', value)}
                disabled={isViewMode}
              >
                <SelectTrigger className={isViewMode ? "bg-gray-50" : ""}>
                  <SelectValue placeholder="Sin objetivo" />
                </SelectTrigger>
                <SelectContent>
                  {goalOptions.map(option => (
                    <SelectItem key={option.value || 'none'} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <div className="flex items-center justify-between gap-2">
                <FormLabel>Ingredientes *</FormLabel>
                {editingNutrition && !isViewMode && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedRecipeForIngredients(editingNutrition)
                      setIngredientsEditorOpen(true)
                    }}
                  >
                    Añadir alimentos y cantidades
                  </Button>
                )}
              </div>
              {editingNutrition ? (
                <div className="rounded-md border p-3 text-sm text-muted-foreground">
                  {formData.ingredients.trim() ? (
                    <div className="flex flex-wrap gap-2">
                      {formData.ingredients
                        .split('\n')
                        .map(line => line.trim())
                        .filter(Boolean)
                        .map((line, index) => (
                          <Badge key={`${line}-${index}`} variant="outline">
                            {line}
                          </Badge>
                        ))}
                    </div>
                  ) : (
                    <p>
                      Sin ingredientes vinculados. Usa "Añadir alimentos y cantidades" para cargarlos.
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-md border p-3 text-sm text-muted-foreground">
                  Guarda la receta para poder cargar alimentos y cantidades.
                </div>
              )}
            </div>
            
            <div>
              <FormLabel>Instrucciones *</FormLabel>
              <Textarea
                placeholder="Describe los pasos para preparar la receta..."
                value={formData.instructions}
                onChange={(e) => handleFormChange('instructions', e.target.value)}
                rows={6}
                readOnly={isViewMode}
                className={isViewMode ? "bg-gray-50" : ""}
              />
            </div>

            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <FormLabel>URL de Imagen (opcional)</FormLabel>
                <Input
                  placeholder="https://..."
                  value={formData.image_url}
                  onChange={(e) => handleFormChange('image_url', e.target.value)}
                  readOnly={isViewMode}
                  className={isViewMode ? "bg-gray-50" : ""}
                />
              </div>
              <div>
                <FormLabel>Etiquetas (opcional)</FormLabel>
                <Input
                  placeholder="Ej: vegetariano, sin gluten, rápido (separadas por comas)"
                  value={formData.tags}
                  onChange={(e) => handleFormChange('tags', e.target.value)}
                  readOnly={isViewMode}
                  className={isViewMode ? "bg-gray-50" : ""}
                />
              </div>
            </div>

            {editingNutrition && !isViewMode && (
              <div>
                <FormLabel>Subir Imagen (JPG, PNG, WebP - máx. 5MB)</FormLabel>
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="cursor-pointer"
                />
                {imageFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Seleccionado: {imageFile.name} ({(imageFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                {imageFile && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        setUploadingImage(true)
                        await uploadRecipeImage(editingNutrition.id, imageFile)
                        toast({
                          title: "✅ Imagen subida",
                          description: "La imagen se ha subido correctamente",
                        })
                        setImageFile(null)
                        refetch()
                      } catch (error) {
                        toast({
                          title: "❌ Error",
                          description: error instanceof Error ? error.message : "Error al subir imagen",
                          variant: "destructive",
                        })
                      } finally {
                        setUploadingImage(false)
                      }
                    }}
                    disabled={uploadingImage}
                    className="mt-2"
                  >
                    {uploadingImage && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Subir Imagen
                  </Button>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              {isViewMode ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!isViewMode && (
              <Button 
                onClick={handleSubmitNutrition}
                disabled={!formData.name.trim() || !formData.category.trim() || !formData.instructions.trim() || isLoading}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editingNutrition ? 'Actualizando...' : 'Creando...'}
                  </>
                ) : (
                  <>
                    {editingNutrition ? 'Actualizar' : 'Crear'} Receta
                  </>
                )}
              </Button>
            )}
            {isViewMode && editingNutrition && (
              <Button 
                onClick={() => handleEditNutrition(editingNutrition)}
                className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white border-0"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Editor de ingredientes */}
      {selectedRecipeForIngredients && (
        <RecipeIngredientsEditor
          recipe={{
            id: selectedRecipeForIngredients.id.toString(),
            name: selectedRecipeForIngredients.name,
            servings: selectedRecipeForIngredients.servings || 1,
            calories: selectedRecipeForIngredients.calories ?? selectedRecipeForIngredients.calories_per_serving ?? 0,
            protein: 0,
            carbs: 0,
            fat: 0
          }}
          isOpen={ingredientsEditorOpen}
          onClose={() => {
            setIngredientsEditorOpen(false)
            setSelectedRecipeForIngredients(null)
          }}
          onUpdate={() => {
            refetch()
          }}
        />
      )}
    </div>
  )
}


