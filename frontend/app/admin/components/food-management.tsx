"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Plus, RefreshCw, Download, Trash2, Check, X, ChevronDown, ChevronUp, Loader2, Package, Filter, Eye } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Progress } from "@/components/ui/progress"

// Helper para obtener la URL de la API
const getApiUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, '').replace(/\/?$/, '')
  }
  if (process.env.NODE_ENV === 'production') {
    return 'https://api.nexfit365.dpdns.org'
  }
  return 'http://localhost:8001'
}

interface Food {
  id: string
  name: string
  brand: string
  category: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  sodium: number
  serving_size: number
  serving_unit: string
  is_verified: boolean
  created_at: string
}

interface FoodStats {
  total: number
  verified: number
  categories: string[]
}

export function FoodManagement() {
  const [foods, setFoods] = useState<Food[]>([])
  const [stats, setStats] = useState<FoodStats>({ total: 0, verified: 0, categories: [] })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [verifiedFilter, setVerifiedFilter] = useState("all")
  const [selectedFoods, setSelectedFoods] = useState<string[]>([])
  const [expandedFood, setExpandedFood] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 20

  // Modal de importar
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importSearchTerm, setImportSearchTerm] = useState("")
  const [importMaxResults, setImportMaxResults] = useState(50)
  const [importing, setImporting] = useState(false)

  const { getAuthHeaders } = useAuth()

  const fetchFoods = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: itemsPerPage.toString(),
      })
      
      if (searchTerm) params.append('search', searchTerm)
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      if (verifiedFilter !== 'all') params.append('is_verified', verifiedFilter === 'verified' ? 'true' : 'false')

      const headers = await getAuthHeaders()
      const response = await fetch(`${getApiUrl()}/api/nutrition/foods/?${params}`, {
        headers
      })
      
      if (response.ok) {
        const data = await response.json()
        setFoods(data.results || data)
        if (data.count) {
          setTotalPages(Math.ceil(data.count / itemsPerPage))
        }
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
  }, [currentPage, searchTerm, categoryFilter, verifiedFilter, getAuthHeaders])

  const fetchStats = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${getApiUrl()}/api/nutrition/foods/stats/`, {
        headers
      })
      
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }, [getAuthHeaders])

  useEffect(() => {
    fetchFoods()
    fetchStats()
  }, [fetchFoods, fetchStats])

  const handleImportFoods = async () => {
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
      const headers = await getAuthHeaders()
      const response = await fetch(`${getApiUrl()}/api/nutrition/foods/import_from_api/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          search_term: importSearchTerm,
          max_results: importMaxResults
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "✅ Importación completada",
          description: `${data.imported} alimentos importados, ${data.skipped} omitidos`,
        })
        setImportModalOpen(false)
        setImportSearchTerm("")
        fetchFoods()
        fetchStats()
      } else {
        const error = await response.json()
        throw new Error(error.detail || 'Error en la importación')
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al importar alimentos",
        variant: "destructive"
      })
    } finally {
      setImporting(false)
    }
  }

  const handleToggleVerified = async (foodId: string, currentStatus: boolean) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${getApiUrl()}/api/nutrition/foods/${foodId}/`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ is_verified: !currentStatus })
      })

      if (response.ok) {
        setFoods(foods.map(f => 
          f.id === foodId ? { ...f, is_verified: !currentStatus } : f
        ))
        toast({
          title: "✅ Actualizado",
          description: `Alimento marcado como ${!currentStatus ? 'verificado' : 'no verificado'}`,
        })
        fetchStats()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el alimento",
        variant: "destructive"
      })
    }
  }

  const handleDeleteFood = async (foodId: string) => {
    if (!confirm('¿Estás seguro de eliminar este alimento?')) return

    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${getApiUrl()}/api/nutrition/foods/${foodId}/`, {
        method: 'DELETE',
        headers
      })

      if (response.ok) {
        setFoods(foods.filter(f => f.id !== foodId))
        toast({
          title: "✅ Eliminado",
          description: "Alimento eliminado correctamente",
        })
        fetchStats()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el alimento",
        variant: "destructive"
      })
    }
  }

  const handleBulkVerify = async (verified: boolean) => {
    if (selectedFoods.length === 0) return

    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${getApiUrl()}/api/nutrition/foods/bulk_verify/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          food_ids: selectedFoods,
          is_verified: verified
        })
      })

      if (response.ok) {
        setFoods(foods.map(f => 
          selectedFoods.includes(f.id) ? { ...f, is_verified: verified } : f
        ))
        setSelectedFoods([])
        toast({
          title: "✅ Actualizados",
          description: `${selectedFoods.length} alimentos actualizados`,
        })
        fetchStats()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron actualizar los alimentos",
        variant: "destructive"
      })
    }
  }

  const getMacroPercentages = (food: Food) => {
    const total = (food.protein || 0) + (food.carbs || 0) + (food.fat || 0)
    if (total === 0) return { protein: 0, carbs: 0, fat: 0 }
    return {
      protein: Math.round((food.protein / total) * 100),
      carbs: Math.round((food.carbs / total) * 100),
      fat: Math.round((food.fat / total) * 100)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            🍎 Gestión de Alimentos
          </h2>
          <p className="text-gray-600 mt-1">
            Base de datos de alimentos con información nutricional
          </p>
        </div>
        <Button
          onClick={() => setImportModalOpen(true)}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Importar Alimentos
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700">Total Alimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Verificados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.verified}</div>
            <Progress 
              value={stats.total > 0 ? (stats.verified / stats.total) * 100 : 0} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Categorías</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.categories?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar alimentos..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1) }}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {stats.categories?.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={verifiedFilter} onValueChange={(v) => { setVerifiedFilter(v); setCurrentPage(1) }}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="verified">Verificados</SelectItem>
                <SelectItem value="unverified">No verificados</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { fetchFoods(); fetchStats() }}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Bulk actions */}
          {selectedFoods.length > 0 && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-amber-50 rounded-lg">
              <span className="text-sm text-amber-700 font-medium">
                {selectedFoods.length} seleccionados
              </span>
              <Button size="sm" variant="outline" onClick={() => handleBulkVerify(true)}>
                <Check className="h-4 w-4 mr-1" /> Verificar
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkVerify(false)}>
                <X className="h-4 w-4 mr-1" /> Desverificar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedFoods([])}>
                Cancelar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Food List */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : foods.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No se encontraron alimentos</p>
              <Button className="mt-4" onClick={() => setImportModalOpen(true)}>
                Importar alimentos
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {foods.map((food) => {
                const macros = getMacroPercentages(food)
                const isExpanded = expandedFood === food.id
                
                return (
                  <Collapsible
                    key={food.id}
                    open={isExpanded}
                    onOpenChange={() => setExpandedFood(isExpanded ? null : food.id)}
                  >
                    <div className={`border rounded-lg transition-all ${isExpanded ? 'border-amber-300 shadow-md' : 'border-gray-200'}`}>
                      <div className="flex items-center p-4 gap-4">
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
                        
                        <CollapsibleTrigger asChild>
                          <button className="flex-1 flex items-center gap-4 text-left hover:bg-gray-50 rounded p-2 -m-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{food.name}</span>
                                {food.is_verified && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    ✓ Verificado
                                  </Badge>
                                )}
                              </div>
                              {food.brand && (
                                <p className="text-sm text-gray-500 truncate">{food.brand}</p>
                              )}
                            </div>
                            
                            <div className="hidden md:flex items-center gap-6 text-sm">
                              <div className="text-center">
                                <div className="font-bold text-amber-600">{food.calories}</div>
                                <div className="text-xs text-gray-500">kcal</div>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-red-500">{food.protein}g</div>
                                <div className="text-xs text-gray-500">Prot</div>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-yellow-500">{food.carbs}g</div>
                                <div className="text-xs text-gray-500">Carbs</div>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-blue-500">{food.fat}g</div>
                                <div className="text-xs text-gray-500">Grasa</div>
                              </div>
                            </div>
                            
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                        </CollapsibleTrigger>
                      </div>
                      
                      <CollapsibleContent>
                        <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Info General */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                                📋 Información General
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Categoría</span>
                                  <span className="font-medium">{food.category || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Porción</span>
                                  <span className="font-medium">{food.serving_size}{food.serving_unit}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Marca</span>
                                  <span className="font-medium">{food.brand || '-'}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Macros */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                                💪 Macronutrientes
                              </h4>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                  <span className="text-sm flex-1">Proteínas</span>
                                  <span className="font-bold">{food.protein}g</span>
                                  <span className="text-xs text-gray-400">({macros.protein}%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                  <span className="text-sm flex-1">Carbohidratos</span>
                                  <span className="font-bold">{food.carbs}g</span>
                                  <span className="text-xs text-gray-400">({macros.carbs}%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                  <span className="text-sm flex-1">Grasas</span>
                                  <span className="font-bold">{food.fat}g</span>
                                  <span className="text-xs text-gray-400">({macros.fat}%)</span>
                                </div>
                                {/* Barra de macros */}
                                <div className="flex h-3 rounded-full overflow-hidden mt-2">
                                  <div className="bg-red-500" style={{ width: `${macros.protein}%` }}></div>
                                  <div className="bg-yellow-500" style={{ width: `${macros.carbs}%` }}></div>
                                  <div className="bg-blue-500" style={{ width: `${macros.fat}%` }}></div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Otros nutrientes */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                                🌿 Otros Nutrientes
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">🌾 Fibra</span>
                                  <span className="font-medium">{food.fiber}g</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">🍬 Azúcar</span>
                                  <span className="font-medium">{food.sugar}g</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">🧂 Sodio</span>
                                  <span className="font-medium">{food.sodium}mg</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleVerified(food.id, food.is_verified)}
                            >
                              {food.is_verified ? (
                                <><X className="h-4 w-4 mr-1" /> Desverificar</>
                              ) : (
                                <><Check className="h-4 w-4 mr-1" /> Verificar</>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteFood(food.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                            </Button>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-gray-600">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Modal */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-amber-500" />
              Importar Alimentos
            </DialogTitle>
            <DialogDescription>
              Importa alimentos desde OpenFoodFacts, una base de datos gratuita y colaborativa.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Término de búsqueda</Label>
              <Input
                placeholder="Ej: pollo, arroz, pasta..."
                value={importSearchTerm}
                onChange={(e) => setImportSearchTerm(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Busca alimentos por nombre en español o inglés
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Máximo de resultados</Label>
              <Select value={importMaxResults.toString()} onValueChange={(v) => setImportMaxResults(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 alimentos</SelectItem>
                  <SelectItem value="25">25 alimentos</SelectItem>
                  <SelectItem value="50">50 alimentos</SelectItem>
                  <SelectItem value="100">100 alimentos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
              <strong>💡 Sugerencias:</strong>
              <ul className="mt-1 space-y-1 list-disc list-inside">
                <li>Proteínas: pollo, atún, salmón, huevo</li>
                <li>Carbohidratos: arroz, pasta, pan, avena</li>
                <li>Lácteos: leche, yogur, queso</li>
                <li>Verduras: brócoli, espinaca, tomate</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImportFoods}
              disabled={importing || !importSearchTerm.trim()}
              className="bg-gradient-to-r from-amber-500 to-orange-500"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Importar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
