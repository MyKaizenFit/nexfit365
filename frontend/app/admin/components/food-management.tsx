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
  store: string
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

// Mapeo de stores a nombres legibles
const STORE_LABELS: Record<string, string> = {
  'mercadona': 'Mercadona',
  'carrefour': 'Carrefour',
  'lidl': 'Lidl',
  'aldi': 'Aldi',
  'dia': 'Día',
  'alcampo': 'Alcampo',
  'eroski': 'Eroski',
  'consum': 'Consum',
  'hipercor': 'Hipercor',
  'otro': 'Otro',
}

interface FoodStats {
  total: number
  verified: number
  categories: string[]
  stores: [string, string][]
}

export function FoodManagement() {
  const [foods, setFoods] = useState<Food[]>([])
  const [stats, setStats] = useState<FoodStats>({ total: 0, verified: 0, categories: [], stores: [] })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [storeFilter, setStoreFilter] = useState("all")
  const [verifiedFilter, setVerifiedFilter] = useState("all")
  const [selectedFoods, setSelectedFoods] = useState<string[]>([])
  const [expandedFood, setExpandedFood] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 20

  // Modal de importar (flujo: buscar → preview → seleccionar → importar)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importSearchTerm, setImportSearchTerm] = useState("")
  const [importMaxResults, setImportMaxResults] = useState(20)
  const [importing, setImporting] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedToImport, setSelectedToImport] = useState<string[]>([])
  const [importCategory, setImportCategory] = useState("")
  const [importStore, setImportStore] = useState("")
  const [importStep, setImportStep] = useState<"search" | "results">("search")

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
      if (storeFilter !== 'all') params.append('store', storeFilter)
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
  }, [currentPage, searchTerm, categoryFilter, storeFilter, verifiedFilter, getAuthHeaders])

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

  // Paso 1: Buscar alimentos en OpenFoodFacts (preview)
  const handleSearchFoods = async () => {
    if (!importSearchTerm.trim()) {
      toast({
        title: "Error",
        description: "Introduce un término de búsqueda",
        variant: "destructive"
      })
      return
    }

    setSearching(true)
    setSearchResults([])
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${getApiUrl()}/api/nutrition/foods/search_api/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          search_term: importSearchTerm,
          max_results: importMaxResults
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.results || [])
        setSelectedToImport([])
        setImportCategory(importSearchTerm.charAt(0).toUpperCase() + importSearchTerm.slice(1))
        setImportStep("results")
        
        if (data.results?.length === 0) {
          toast({
            title: "Sin resultados",
            description: "No se encontraron alimentos con ese término",
          })
        }
      } else {
        const error = await response.json()
        throw new Error(error.detail || 'Error en la búsqueda')
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al buscar alimentos",
        variant: "destructive"
      })
    } finally {
      setSearching(false)
    }
  }

  // Paso 2: Importar alimentos seleccionados
  const handleImportSelected = async () => {
    if (selectedToImport.length === 0) {
      toast({
        title: "Error",
        description: "Selecciona al menos un alimento para importar",
        variant: "destructive"
      })
      return
    }

    setImporting(true)
    try {
      const headers = await getAuthHeaders()
      const foodsToImport = searchResults.filter(f => selectedToImport.includes(f.barcode))
      
      const response = await fetch(`${getApiUrl()}/api/nutrition/foods/import_selected/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          foods: foodsToImport,
          category: importCategory,
          store: importStore
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "✅ Importación completada",
          description: `${data.imported} alimentos importados, ${data.skipped} omitidos`,
        })
        resetImportModal()
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

  const resetImportModal = () => {
    setImportModalOpen(false)
    setImportSearchTerm("")
    setSearchResults([])
    setSelectedToImport([])
    setImportCategory("")
    setImportStore("")
    setImportStep("search")
  }

  const toggleSelectFood = (code: string) => {
    setSelectedToImport(prev => 
      prev.includes(code) 
        ? prev.filter(c => c !== code)
        : [...prev, code]
    )
  }

  const selectAllResults = () => {
    if (selectedToImport.length === searchResults.length) {
      setSelectedToImport([])
    } else {
      setSelectedToImport(searchResults.map(f => f.barcode || f.code || f.id))
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

  const getMacroPercentages = (food: Food): { protein: string, carbs: string, fat: string } => {
    // Calcular porcentaje basado en calorías, no en gramos
    // 1g proteína = 4 kcal, 1g carbos = 4 kcal, 1g grasa = 9 kcal
    const proteinCal = (Number(food.protein) || 0) * 4
    const carbsCal = (Number(food.carbs) || 0) * 4
    const fatCal = (Number(food.fat) || 0) * 9
    const totalCal = Number(food.calories) || 0

    // Si no hay calorías, usar la suma de macros como fallback
    const effectiveTotal = totalCal > 0 ? totalCal : (proteinCal + carbsCal + fatCal)

    if (effectiveTotal <= 0) {
      return { protein: '—', carbs: '—', fat: '—' }
    }

    const proteinPct = Math.round((proteinCal / effectiveTotal) * 100)
    const carbsPct = Math.round((carbsCal / effectiveTotal) * 100)
    const fatPct = Math.round((fatCal / effectiveTotal) * 100)

    // Verificar que no sean NaN
    return {
      protein: isNaN(proteinPct) ? '—' : String(proteinPct),
      carbs: isNaN(carbsPct) ? '—' : String(carbsPct),
      fat: isNaN(fatPct) ? '—' : String(fatPct)
    }
  }

  // Valores numéricos para la barra de progreso
  const getMacroBarWidths = (food: Food): { protein: number, carbs: number, fat: number } => {
    const proteinCal = (Number(food.protein) || 0) * 4
    const carbsCal = (Number(food.carbs) || 0) * 4
    const fatCal = (Number(food.fat) || 0) * 9
    const totalCal = Number(food.calories) || (proteinCal + carbsCal + fatCal)

    if (totalCal <= 0) return { protein: 0, carbs: 0, fat: 0 }

    return {
      protein: Math.round((proteinCal / totalCal) * 100) || 0,
      carbs: Math.round((carbsCal / totalCal) * 100) || 0,
      fat: Math.round((fatCal / totalCal) * 100) || 0
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
            <Select value={storeFilter} onValueChange={(v) => { setStoreFilter(v); setCurrentPage(1) }}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Supermercado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los supermercados</SelectItem>
                {stats.stores?.map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
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
                                  <span className="text-gray-500">Supermercado</span>
                                  <span className="font-medium">{food.store ? STORE_LABELS[food.store] || food.store : '-'}</span>
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
                                {(() => {
                                  const barWidths = getMacroBarWidths(food)
                                  return (
                                    <div className="flex h-3 rounded-full overflow-hidden mt-2">
                                      <div className="bg-red-500" style={{ width: `${barWidths.protein}%` }}></div>
                                      <div className="bg-yellow-500" style={{ width: `${barWidths.carbs}%` }}></div>
                                      <div className="bg-blue-500" style={{ width: `${barWidths.fat}%` }}></div>
                                    </div>
                                  )
                                })()}
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

      {/* Import Modal - Flujo de 2 pasos */}
      <Dialog open={importModalOpen} onOpenChange={(open) => { if (!open) resetImportModal() }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-amber-500" />
              Importar Alimentos
              {importStep === "results" && (
                <Badge variant="secondary" className="ml-2">
                  {selectedToImport.length} / {searchResults.length} seleccionados
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {importStep === "search" 
                ? "Busca alimentos en OpenFoodFacts para importarlos a tu base de datos."
                : "Selecciona los alimentos que deseas importar."}
            </DialogDescription>
          </DialogHeader>

          {importStep === "search" ? (
            // Paso 1: Búsqueda
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Término de búsqueda</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ej: pollo, arroz, tomate..."
                    value={importSearchTerm}
                    onChange={(e) => setImportSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchFoods()}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSearchFoods}
                    disabled={searching || !importSearchTerm.trim()}
                    className="bg-gradient-to-r from-amber-500 to-orange-500"
                  >
                    {searching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Busca alimentos por nombre en español o inglés
                </p>
              </div>

              <div className="space-y-2">
                <Label>Máximo de resultados</Label>
                <Select value={importMaxResults.toString()} onValueChange={(v) => setImportMaxResults(parseInt(v))}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 alimentos</SelectItem>
                    <SelectItem value="20">20 alimentos</SelectItem>
                    <SelectItem value="30">30 alimentos</SelectItem>
                    <SelectItem value="50">50 alimentos</SelectItem>
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
          ) : (
            // Paso 2: Resultados y selección
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between gap-4 py-2">
                <Button variant="ghost" size="sm" onClick={() => setImportStep("search")}>
                  ← Volver a buscar
                </Button>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="category">Categoría:</Label>
                    <Input
                      id="category"
                      value={importCategory}
                      onChange={(e) => setImportCategory(e.target.value)}
                      className="w-36"
                      placeholder="Categoría"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="store">Supermercado:</Label>
                    <Select value={importStore} onValueChange={setImportStore}>
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="(ninguno)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Ninguno</SelectItem>
                        {Object.entries(STORE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={selectAllResults}>
                  {selectedToImport.length === searchResults.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto border rounded-lg">
                {searchResults.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No se encontraron resultados
                  </div>
                ) : (
                  <div className="divide-y">
                    {searchResults.map((food) => {
                      const code = food.barcode || food.code || food.id
                      const isSelected = selectedToImport.includes(code)
                      return (
                        <div 
                          key={code}
                          className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${isSelected ? 'bg-amber-50' : ''}`}
                          onClick={() => toggleSelectFood(code)}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectFood(code)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{food.name}</div>
                              {food.brand && (
                                <div className="text-xs text-gray-500">{food.brand}</div>
                              )}
                              <div className="flex flex-wrap gap-2 mt-1 text-xs">
                                <span className="px-2 py-0.5 bg-gray-100 rounded">
                                  {food.calories || 0} kcal
                                </span>
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded">
                                  P: {food.protein?.toFixed(1) || 0}g
                                </span>
                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                                  C: {food.carbs?.toFixed(1) || 0}g
                                </span>
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                  G: {food.fat?.toFixed(1) || 0}g
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={resetImportModal}>
              Cancelar
            </Button>
            {importStep === "results" && (
              <Button
                onClick={handleImportSelected}
                disabled={importing || selectedToImport.length === 0}
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
                    Importar {selectedToImport.length} alimento{selectedToImport.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
