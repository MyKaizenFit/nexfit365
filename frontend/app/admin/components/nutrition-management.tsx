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
    refetch
  } = useAdminNutrition()

  const [selectedNutrition, setSelectedNutrition] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingNutrition, setEditingNutrition] = useState<Nutrition | null>(null)
  const [isViewMode, setIsViewMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
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
    calories_per_serving: 300,
    ingredients: '',
    instructions: '',
    image_url: '',
    tags: ''
  })

  // Filtrar recetas
  const filteredNutrition = nutrition.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.ingredients.some(ing => ing.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter
    const matchesDifficulty = difficultyFilter === "all" || item.difficulty === difficultyFilter
    
    return matchesSearch && matchesCategory && matchesDifficulty
  })
  
  // Ordenamiento
  const sortedNutrition = [...filteredNutrition].sort((a, b) => {
    let aValue: any
    let bValue: any
    
    switch (sortColumn) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'category':
        aValue = a.category
        bValue = b.category
        break
      case 'difficulty':
        aValue = a.difficulty
        bValue = b.difficulty
        break
      case 'calories':
        aValue = a.calories_per_serving
        bValue = b.calories_per_serving
        break
      case 'time':
        aValue = a.prep_time_minutes
        bValue = b.prep_time_minutes
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
  })
  
  // Calcular paginación
  // Usar el total sin filtrar para determinar si mostrar paginación
  const totalNutrition = nutrition.length
  const totalPages = Math.ceil(sortedNutrition.length / 50) || 1
  const startIndex = (currentPage - 1) * 50
  const endIndex = startIndex + 50
  const currentNutrition = sortedNutrition.slice(startIndex, endIndex)
  
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
  }, [searchTerm, categoryFilter, difficultyFilter])

  // Obtener categorías únicas
  const categories = Array.from(new Set(nutrition.map(item => item.category)))

  // Funciones para manejar el formulario
  const handleFormChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const loadNutritionData = (nutrition: Nutrition) => {
    setFormData({
      name: nutrition.name || '',
      category: nutrition.category || '',
      difficulty: nutrition.difficulty || 'easy',
      prep_time_minutes: nutrition.prep_time_minutes || 30,
      servings: nutrition.servings || 1,
      calories_per_serving: nutrition.calories_per_serving || 300,
      ingredients: nutrition.ingredients?.join('\n') || '',
      instructions: nutrition.instructions || '',
      image_url: nutrition.image_url || '',
      tags: nutrition.tags?.join(', ') || ''
    })
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
      calories_per_serving: 300,
      ingredients: '',
      instructions: '',
      image_url: '',
      tags: ''
    })
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
        calories_per_serving: formData.calories_per_serving,
        ingredients: formData.ingredients.split('\n').filter(ing => ing.trim()),
        instructions: formData.instructions.trim(),
        image_url: formData.image_url.trim() || undefined,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
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
          <div className="grid gap-4 md:grid-cols-3">
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

      {/* Nutrition Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recetas</CardTitle>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectedNutrition.length === currentNutrition.length && currentNutrition.length > 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedNutrition(currentNutrition.map(item => item.id))
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
        <CardContent>
          <div className="rounded-md border">
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
                  {currentNutrition.map((item) => (
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
                              {item.ingredients.length} ingredientes
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
                          {item.calories_per_serving} cal
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Paginación */}
          {totalPages > 0 && (
            <div className="border-t p-4 flex items-center justify-between">
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
          )}
        </CardContent>
      </Card>

      {/* Dialog para crear/editar/ver receta */}
      <Dialog open={showCreateDialog || !!editingNutrition} onOpenChange={(open) => {
        if (!open) {
          resetForm()
        }
      }}>
        <DialogContent className="max-w-2xl">
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
              <FormLabel>Calorías por Porción</FormLabel>
              <Input
                type="number"
                value={formData.calories_per_serving}
                onChange={(e) => handleFormChange('calories_per_serving', parseInt(e.target.value) || 300)}
                readOnly={isViewMode}
                className={isViewMode ? "bg-gray-50" : ""}
              />
            </div>
            
            <div>
              <FormLabel>Ingredientes *</FormLabel>
              <Textarea
                placeholder="Lista los ingredientes, uno por línea..."
                value={formData.ingredients}
                onChange={(e) => handleFormChange('ingredients', e.target.value)}
                rows={4}
                readOnly={isViewMode}
                className={isViewMode ? "bg-gray-50" : ""}
              />
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
    </div>
  )
}


