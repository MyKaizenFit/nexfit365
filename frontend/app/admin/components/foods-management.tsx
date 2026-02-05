"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Trash2, Edit, Check, X, RefreshCw, Upload, ChevronDown, ChevronUp, Loader2, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Food {
  id: string
  name: string
  brand: string
  category: string
  serving_size: number
  serving_unit: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  sodium: number
  is_verified: boolean
  created_at: string
}

interface ImportResult {
  imported: number
  skipped: number
  error?: string
}

export function FoodsManagement() {
  const [foods, setFoods] = useState<Food[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [categories, setCategories] = useState<string[]>([])
  const [selectedFoods, setSelectedFoods] = useState<string[]>([])
  const [expandedFood, setExpandedFood] = useState<string | null>(null)
  
  // Import dialog
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importSearchTerm, setImportSearchTerm] = useState("")
  const [importMaxResults, setImportMaxResults] = useState(50)
  const [importing, setImporting] = useState(false)
  
  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingFood, setEditingFood] = useState<Food | null>(null)
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    categories: 0
  })

  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token')
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }

  const fetchFoods = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/v1/nutrition/foods/', {
        headers: getAuthHeaders()
      })
      if (response.ok) {
        const data = await response.json()
        const foodsList = data.results || data || []
        setFoods(foodsList)
        
        // Extract unique categories
        const cats = [...new Set(foodsList.map((f: Food) => f.category).filter(Boolean))]
        setCategories(cats as string[])
        
        // Calculate stats
        setStats({
          total: foodsList.length,
          verified: foodsList.filter((f: Food) => f.is_verified).length,
          categories: cats.length
        })
      }
    } catch (error) {
      console.error('Error fetching foods:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los alimentos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFoods()
  }, [])

  const handleImport = async () => {
    if (!importSearchTerm.trim()) {
      toast({
        title: "Error",
        description: "Introduce un término de búsqueda",
        variant: "destructive"
      })
      return
    }

    setImporting(true)
    try {
      const response = await fetch('/api/v1/nutrition/foods/import/', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          search_term: importSearchTerm,
          max_results: importMaxResults
        })
      })
      
      if (response.ok) {
        const result: ImportResult = await response.json()
        toast({
          title: "✅ Importación completada",
          description: `${result.imported} alimentos importados, ${result.skipped} omitidos (ya existían)`
        })
        setImportDialogOpen(false)
        setImportSearchTerm("")
        fetchFoods()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.detail || "Error durante la importación",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error de conexión durante la importación",
        variant: "destructive"
      })
    } finally {
      setImporting(false)
    }
  }

  const handleDelete = async (foodId: string) => {
    try {
      const response = await fetch(`/api/v1/nutrition/foods/${foodId}/`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        toast({
          title: "✅ Alimento eliminado",
          description: "El alimento se ha eliminado correctamente"
        })
        fetchFoods()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el alimento",
        variant: "destructive"
      })
    }
  }

  const handleBulkDelete = async () => {
    if (selectedFoods.length === 0) return
    
    try {
      await Promise.all(
        selectedFoods.map(id =>
          fetch(`/api/v1/nutrition/foods/${id}/`, {
            method: 'DELETE',
            headers: getAuthHeaders()
          })
        )
      )
      
      toast({
        title: "✅ Alimentos eliminados",
        description: `${selectedFoods.length} alimentos eliminados correctamente`
      })
      setSelectedFoods([])
      fetchFoods()
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al eliminar algunos alimentos",
        variant: "destructive"
      })
    }
  }

  const handleVerify = async (foodId: string, verified: boolean) => {
    try {
      const response = await fetch(`/api/v1/nutrition/foods/${foodId}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_verified: verified })
      })
      
      if (response.ok) {
        toast({
          title: verified ? "✅ Alimento verificado" : "Verificación eliminada"
        })
        fetchFoods()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el alimento",
        variant: "destructive"
      })
    }
  }

  const handleSaveEdit = async () => {
    if (!editingFood) return
    
    try {
      const response = await fetch(`/api/v1/nutrition/foods/${editingFood.id}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(editingFood)
      })
      
      if (response.ok) {
        toast({
          title: "✅ Alimento actualizado"
        })
        setEditDialogOpen(false)
        setEditingFood(null)
        fetchFoods()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el alimento",
        variant: "destructive"
      })
    }
  }

  // Filtrar alimentos
  const filteredFoods = foods.filter(food => {
    const matchesSearch = food.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         food.brand?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || food.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Calcular macros %
  const getMacroPercent = (food: Food) => {
    const total = food.protein + food.carbs + food.fat
    if (total === 0) return { protein: 0, carbs: 0, fat: 0 }
    return {
      protein: Math.round((food.protein / total) * 100),
      carbs: Math.round((food.carbs / total) * 100),
      fat: Math.round((food.fat / total) * 100)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando alimentos...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestión de Alimentos</h2>
          <p className="text-muted-foreground">
            Base de datos de alimentos para tracking nutricional
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchFoods} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={() => setImportDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
            <Upload className="h-4 w-4 mr-2" />
            Importar desde OpenFoodFacts
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verificados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorías</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.categories}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar alimentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedFoods.length > 0 && (
              <Button variant="destructive" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar ({selectedFoods.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Foods Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alimentos ({filteredFoods.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedFoods.length === filteredFoods.length && filteredFoods.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedFoods(filteredFoods.map(f => f.id))
                        } else {
                          setSelectedFoods([])
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">Categoría</TableHead>
                  <TableHead className="text-right">Kcal</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Prot</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Carbs</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Grasa</TableHead>
                  <TableHead className="text-center">✓</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFoods.slice(0, 100).map(food => (
                  <>
                    <TableRow key={food.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <Checkbox
                          checked={selectedFoods.includes(food.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedFoods([...selectedFoods, food.id])
                            } else {
                              setSelectedFoods(selectedFoods.filter(id => id !== food.id))
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-6 w-6"
                            onClick={() => setExpandedFood(expandedFood === food.id ? null : food.id)}
                          >
                            {expandedFood === food.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                          <div>
                            <div className="font-medium">{food.name}</div>
                            {food.brand && <div className="text-xs text-muted-foreground">{food.brand}</div>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">{food.category || "Sin categoría"}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{food.calories}</TableCell>
                      <TableCell className="text-right hidden sm:table-cell">{food.protein}g</TableCell>
                      <TableCell className="text-right hidden sm:table-cell">{food.carbs}g</TableCell>
                      <TableCell className="text-right hidden sm:table-cell">{food.fat}g</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVerify(food.id, !food.is_verified)}
                          className={food.is_verified ? "text-green-600" : "text-gray-400"}
                        >
                          {food.is_verified ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingFood(food)
                              setEditDialogOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                            onClick={() => handleDelete(food.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {/* Expanded Row */}
                    {expandedFood === food.id && (
                      <TableRow>
                        <TableCell colSpan={9} className="bg-muted/30 p-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Info General */}
                            <div className="bg-white rounded-lg p-4 shadow-sm">
                              <h4 className="font-semibold text-sm mb-2 text-primary">📋 Info General</h4>
                              <div className="space-y-1 text-sm">
                                <p><span className="text-muted-foreground">Nombre:</span> {food.name}</p>
                                <p><span className="text-muted-foreground">Marca:</span> {food.brand || "-"}</p>
                                <p><span className="text-muted-foreground">Categoría:</span> {food.category || "-"}</p>
                                <p><span className="text-muted-foreground">Porción:</span> {food.serving_size}{food.serving_unit}</p>
                              </div>
                            </div>
                            
                            {/* Calorías */}
                            <div className="bg-white rounded-lg p-4 shadow-sm">
                              <h4 className="font-semibold text-sm mb-2 text-primary">🔥 Calorías</h4>
                              <div className="text-3xl font-bold">{food.calories}</div>
                              <div className="text-xs text-muted-foreground">kcal por 100g</div>
                            </div>
                            
                            {/* Macros */}
                            <div className="bg-white rounded-lg p-4 shadow-sm">
                              <h4 className="font-semibold text-sm mb-2 text-primary">💪 Macronutrientes</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span>🥩 Proteínas</span>
                                  <span className="font-medium">{food.protein}g ({getMacroPercent(food).protein}%)</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>🍚 Carbohidratos</span>
                                  <span className="font-medium">{food.carbs}g ({getMacroPercent(food).carbs}%)</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>🧈 Grasas</span>
                                  <span className="font-medium">{food.fat}g ({getMacroPercent(food).fat}%)</span>
                                </div>
                              </div>
                              {/* Macro bar */}
                              <div className="flex h-3 rounded-full overflow-hidden mt-2">
                                <div className="bg-red-500" style={{ width: `${getMacroPercent(food).protein}%` }} />
                                <div className="bg-yellow-500" style={{ width: `${getMacroPercent(food).carbs}%` }} />
                                <div className="bg-blue-500" style={{ width: `${getMacroPercent(food).fat}%` }} />
                              </div>
                            </div>
                            
                            {/* Otros */}
                            <div className="bg-white rounded-lg p-4 shadow-sm">
                              <h4 className="font-semibold text-sm mb-2 text-primary">🌿 Otros Nutrientes</h4>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span>🌾 Fibra</span>
                                  <span className="font-medium">{food.fiber}g</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>🍬 Azúcar</span>
                                  <span className="font-medium">{food.sugar}g</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>🧂 Sodio</span>
                                  <span className="font-medium">{food.sodium}mg</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
                {filteredFoods.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No se encontraron alimentos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {filteredFoods.length > 100 && (
            <p className="text-sm text-muted-foreground text-center mt-4">
              Mostrando 100 de {filteredFoods.length} alimentos. Usa el buscador para filtrar.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>📥 Importar desde OpenFoodFacts</DialogTitle>
            <DialogDescription>
              Busca e importa alimentos de la base de datos colaborativa OpenFoodFacts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Término de búsqueda</Label>
              <Input
                placeholder="Ej: pollo, arroz, pasta, leche..."
                value={importSearchTerm}
                onChange={(e) => setImportSearchTerm(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Busca por nombre del alimento en español
              </p>
            </div>
            <div className="space-y-2">
              <Label>Máximo de resultados</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={importMaxResults}
                onChange={(e) => setImportMaxResults(parseInt(e.target.value) || 50)}
              />
              <p className="text-xs text-muted-foreground">
                Entre 1 y 100 alimentos por búsqueda
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="font-medium text-blue-800 text-sm mb-2">💡 Sugerencias</h4>
              <div className="text-xs text-blue-700 space-y-1">
                <p><strong>Proteínas:</strong> pollo, pechuga, atún, salmón, huevo, ternera</p>
                <p><strong>Carbohidratos:</strong> arroz, pasta, pan, avena, patata</p>
                <p><strong>Lácteos:</strong> leche, yogur, queso</p>
                <p><strong>Suplementos:</strong> proteína whey, caseína</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={importing} className="bg-green-600 hover:bg-green-700">
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>✏️ Editar Alimento</DialogTitle>
          </DialogHeader>
          {editingFood && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={editingFood.name}
                  onChange={(e) => setEditingFood({ ...editingFood, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input
                  value={editingFood.brand}
                  onChange={(e) => setEditingFood({ ...editingFood, brand: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Input
                  value={editingFood.category}
                  onChange={(e) => setEditingFood({ ...editingFood, category: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Calorías (kcal)</Label>
                <Input
                  type="number"
                  value={editingFood.calories}
                  onChange={(e) => setEditingFood({ ...editingFood, calories: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Proteínas (g)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editingFood.protein}
                  onChange={(e) => setEditingFood({ ...editingFood, protein: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Carbohidratos (g)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editingFood.carbs}
                  onChange={(e) => setEditingFood({ ...editingFood, carbs: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Grasas (g)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editingFood.fat}
                  onChange={(e) => setEditingFood({ ...editingFood, fat: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fibra (g)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editingFood.fiber}
                  onChange={(e) => setEditingFood({ ...editingFood, fiber: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Azúcar (g)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editingFood.sugar}
                  onChange={(e) => setEditingFood({ ...editingFood, sugar: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Sodio (mg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editingFood.sodium}
                  onChange={(e) => setEditingFood({ ...editingFood, sodium: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
