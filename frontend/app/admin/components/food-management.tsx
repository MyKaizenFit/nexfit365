"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Search, Plus, RefreshCw, Download, Trash2, Check, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Loader2, Package, Filter, Eye, Pencil, FileUp, FileText } from "lucide-react"
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
import { getApiBaseUrl } from "@/lib/api"

const getApiUrl = getApiBaseUrl

interface Food {
  id: string
  name: string
  brand: string
  category: string
  equivalence_category?: string
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
  allergens?: string[]
  is_verified: boolean
  created_at: string
}

const ALLERGEN_OPTIONS = [
  { value: 'gluten', label: 'Gluten' },
  { value: 'dairy', label: 'Lacteos' },
  { value: 'eggs', label: 'Huevo' },
  { value: 'nuts', label: 'Frutos secos' },
  { value: 'soy', label: 'Soja' },
  { value: 'fish', label: 'Pescado' },
  { value: 'shellfish', label: 'Marisco' },
  { value: 'sesame', label: 'Sesamo' },
]

const EQUIVALENCE_OPTIONS = [
  { value: 'none', label: 'Sin grupo manual' },
  { value: 'carnes', label: 'Carnes' },
  { value: 'pescados', label: 'Pescados' },
  { value: 'marisco', label: 'Marisco' },
  { value: 'huevos', label: 'Huevos' },
  { value: 'arroz_cereales', label: 'Arroz / cereales / pasta' },
  { value: 'panes', label: 'Panes' },
  { value: 'legumbres', label: 'Legumbres' },
  { value: 'fruta', label: 'Fruta' },
  { value: 'verduras', label: 'Verduras' },
  { value: 'lacteos', label: 'Lacteos' },
  { value: 'frutos_secos', label: 'Frutos secos' },
  { value: 'grasas', label: 'Grasas' },
  { value: 'otros', label: 'Otros' },
]

const getEquivalenceLabel = (value?: string) =>
  EQUIVALENCE_OPTIONS.find((option) => option.value === value)?.label || value || '-'

const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  gluten: ['gluten', 'trigo', 'wheat', 'harina', 'pan', 'pasta', 'cebada', 'barley', 'centeno', 'rye', 'avena', 'oats', 'malta', 'malt'],
  dairy: ['leche', 'milk', 'queso', 'cheese', 'yogur', 'yogurt', 'mantequilla', 'butter', 'nata', 'cream', 'crema', 'lactosa', 'lactose', 'whey'],
  eggs: ['huevo', 'huevos', 'egg', 'eggs', 'mayonesa', 'mayo'],
  nuts: ['almendra', 'almond', 'nuez', 'walnut', 'avellana', 'hazelnut', 'pistacho', 'pistachio', 'cacahuete', 'cacahuate', 'peanut', 'mani', 'anacardo', 'cashew'],
  soy: ['soja', 'soy', 'soya', 'tofu', 'tempeh', 'edamame', 'miso'],
  fish: ['pescado', 'fish', 'atun', 'tuna', 'salmon', 'bacalao', 'merluza', 'trucha', 'sardina'],
  shellfish: ['marisco', 'shellfish', 'gamba', 'langostino', 'camaron', 'cangrejo', 'crab', 'langosta', 'lobster', 'mejillon', 'almeja', 'ostra'],
  sesame: ['sesamo', 'sesame', 'ajonjoli', 'tahini'],
}

const normalizeText = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const UNIT_BASED_UNITS = new Set(['ud', 'uds', 'u', 'unidad', 'unidades', 'unit', 'units', 'pieza', 'piezas', 'lata', 'latas'])

const normalizeUnit = (rawUnit: string) => {
  const normalized = normalizeText(rawUnit || '').replace(/\./g, '')
  const aliases: Record<string, string> = {
    gramos: 'g',
    gramo: 'g',
    gram: 'g',
    grams: 'g',
    kilogramo: 'kg',
    kilogramos: 'kg',
    litro: 'l',
    litros: 'l',
    unidad: 'ud',
    unidades: 'ud',
    unit: 'ud',
    units: 'ud',
    uds: 'ud',
  }
  return aliases[normalized] || normalized || 'g'
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

const IMPORT_STORE_OPTIONS = Object.entries(STORE_LABELS).filter(([value]) => value !== 'otro')

interface FoodStats {
  total: number
  verified: number
  categories: string[]
  stores: [string, string][]
}

interface FileImportResult {
  created: number
  updated: number
  skipped: number
  errors: string[]
  skippedDetails: { row: number; name: string | null; reason: string }[]
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

  // Modal CRUD manual
  const [foodModalOpen, setFoodModalOpen] = useState(false)
  const [editingFood, setEditingFood] = useState<Food | null>(null)
  const [savingFood, setSavingFood] = useState(false)
  const emptyForm = {
    name: '', brand: '', category: '', equivalence_category: 'none', store: '',
    calories: '', protein: '', carbs: '', fat: '',
    fiber: '', sugar: '', sodium: '', serving_size: '100', serving_unit: 'g',
    allergens: [] as string[],
    is_verified: false,
  }
  const [foodForm, setFoodForm] = useState(emptyForm)
  const [nutritionBasis, setNutritionBasis] = useState<'per_100' | 'per_unit'>('per_100')

  // Modal importar CSV/Excel
  const [fileImportOpen, setFileImportOpen] = useState(false)
  const [fileImporting, setFileImporting] = useState(false)
  const [fileImportResult, setFileImportResult] = useState<FileImportResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Modal de importar (flujo: buscar → preview → seleccionar → importar)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importSearchTerm, setImportSearchTerm] = useState("")
  const [importPage, setImportPage] = useState(1)
  const [importPageSize, setImportPageSize] = useState(20)
  const [importTotalCount, setImportTotalCount] = useState(0)
  const [importing, setImporting] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedToImport, setSelectedToImport] = useState<string[]>([])
  const [importCategory, setImportCategory] = useState("")
  const [importStore, setImportStore] = useState("none")
  const [importStoreFilter, setImportStoreFilter] = useState("all")
  const [importFilterText, setImportFilterText] = useState("")
  const [importFilterCategory, setImportFilterCategory] = useState("all")
  const [importFilterStore, setImportFilterStore] = useState("all")
  const [showImportFilters, setShowImportFilters] = useState(true)
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
  const handleSearchFoods = async (page = 1, resetFilters = true, pageSizeOverride?: number) => {
    if (!importSearchTerm.trim()) {
      toast({
        title: "Error",
        description: "Introduce un término de búsqueda",
        variant: "destructive"
      })
      return
    }

    if (!Number.isFinite(page)) {
      page = 1
    }

    const effectivePageSize = pageSizeOverride ?? importPageSize
    setSearching(true)
    setSearchResults([])
    setImportPage(page)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${getApiUrl()}/api/nutrition/foods/search_api/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          search_term: importSearchTerm,
          page,
          page_size: effectivePageSize,
          store: importStoreFilter === 'all' ? '' : importStoreFilter
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.results || [])
        setImportTotalCount(data.count || 0)
        if (data.page_size) {
          setImportPageSize(data.page_size)
        } else if (pageSizeOverride) {
          setImportPageSize(pageSizeOverride)
        }
        if (resetFilters) {
          setSelectedToImport([])
          setImportCategory(importSearchTerm.charAt(0).toUpperCase() + importSearchTerm.slice(1))
          setImportStore(importStoreFilter === 'all' ? 'none' : importStoreFilter)
          setImportFilterText("")
          setImportFilterCategory("all")
          setImportFilterStore("all")
          setShowImportFilters(true)
        }
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
      const foodsToImport = searchResults.filter((food) => {
        const code = getResultCode(food)
        return selectedToImport.includes(code)
      })
      
      const response = await fetch(`${getApiUrl()}/api/nutrition/foods/import_selected/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          foods: foodsToImport,
          category: importCategory,
          store: importStore === 'none' ? '' : importStore
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

  // ---- CRUD manual ----
  const openCreateModal = () => {
    setEditingFood(null)
    setFoodForm(emptyForm)
    setNutritionBasis('per_100')
    setFoodModalOpen(true)
  }

  const openEditModal = (food: Food) => {
    const normalizedUnit = normalizeUnit(food.serving_unit || 'g')
    const normalizedServingSize = Number(food.serving_size || 0)
    const inferredBasis: 'per_100' | 'per_unit' =
      UNIT_BASED_UNITS.has(normalizedUnit) && normalizedServingSize <= 10 ? 'per_unit' : 'per_100'

    setEditingFood(food)
    setFoodForm({
      name: food.name,
      brand: food.brand || '',
      category: food.category || '',
      equivalence_category: food.equivalence_category || 'none',
      store: food.store || '',
      calories: String(food.calories ?? ''),
      protein: String(food.protein ?? ''),
      carbs: String(food.carbs ?? ''),
      fat: String(food.fat ?? ''),
      fiber: String(food.fiber ?? ''),
      sugar: String(food.sugar ?? ''),
      sodium: String(food.sodium ?? ''),
      serving_size: String(food.serving_size ?? '100'),
      serving_unit: food.serving_unit || 'g',
      allergens: Array.isArray(food.allergens) ? food.allergens : [],
      is_verified: food.is_verified,
    })
    setNutritionBasis(inferredBasis)
    setFoodModalOpen(true)
  }

  const applyNutritionBasis = (basis: 'per_100' | 'per_unit') => {
    setNutritionBasis(basis)
    setFoodForm((prev) => {
      if (basis === 'per_100') {
        const unit = normalizeUnit(prev.serving_unit || 'g')
        const safeUnit = UNIT_BASED_UNITS.has(unit) ? 'g' : (unit || 'g')
        const safeSize = Number(prev.serving_size) > 0 ? prev.serving_size : '100'
        return {
          ...prev,
          serving_unit: safeUnit,
          serving_size: safeSize,
        }
      }

      const safeSize = Number(prev.serving_size) > 0 ? prev.serving_size : '1'
      return {
        ...prev,
        serving_unit: 'ud',
        serving_size: safeSize,
      }
    })
  }

  const inferredAllergens = useMemo(() => {
    const source = normalizeText(`${foodForm.name || ''} ${foodForm.brand || ''} ${foodForm.category || ''}`)
    const detected: string[] = []

    for (const option of ALLERGEN_OPTIONS) {
      const keywords = ALLERGEN_KEYWORDS[option.value] || []
      if (keywords.some((keyword) => source.includes(keyword))) {
        detected.push(option.value)
      }
    }

    return detected
  }, [foodForm.name, foodForm.brand, foodForm.category])

  const toggleAllergen = (allergen: string, checked: boolean) => {
    setFoodForm((prev) => {
      const current = Array.isArray(prev.allergens) ? prev.allergens : []
      if (checked) {
        if (current.includes(allergen)) return prev
        return { ...prev, allergens: [...current, allergen] }
      }
      return { ...prev, allergens: current.filter((item) => item !== allergen) }
    })
  }

  const handleSaveFood = async () => {
    if (!foodForm.name.trim()) {
      toast({ title: 'Error', description: 'El nombre es obligatorio', variant: 'destructive' })
      return
    }
    const normalizedUnit = normalizeUnit(foodForm.serving_unit || 'g')
    const servingSize = Number(foodForm.serving_size)

    if (!Number.isFinite(servingSize) || servingSize <= 0) {
      toast({ title: 'Error', description: 'El tamaño de porción debe ser mayor que 0', variant: 'destructive' })
      return
    }

    if (nutritionBasis === 'per_unit' && !UNIT_BASED_UNITS.has(normalizedUnit)) {
      toast({ title: 'Error', description: 'Si introduces macros por unidad, usa una unidad tipo ud/unidad/lata', variant: 'destructive' })
      return
    }

    if (nutritionBasis === 'per_100' && UNIT_BASED_UNITS.has(normalizedUnit) && servingSize <= 10) {
      toast({ title: 'Error', description: 'En modo por 100g/ml no uses unidad tipo ud con porción 1. Cambia a g/ml o ajusta el modo.', variant: 'destructive' })
      return
    }

    setSavingFood(true)
    try {
      const headers = await getAuthHeaders()
      const body = {
        name: foodForm.name.trim(),
        brand: foodForm.brand.trim(),
        category: foodForm.category.trim(),
        equivalence_category: foodForm.equivalence_category === 'none' ? '' : foodForm.equivalence_category,
        store: foodForm.store || '',
        calories: Number(foodForm.calories) || 0,
        protein: Number(foodForm.protein) || 0,
        carbs: Number(foodForm.carbs) || 0,
        fat: Number(foodForm.fat) || 0,
        fiber: Number(foodForm.fiber) || 0,
        sugar: Number(foodForm.sugar) || 0,
        sodium: Number(foodForm.sodium) || 0,
        serving_size: servingSize,
        serving_unit: normalizedUnit,
        allergens: (Array.isArray(foodForm.allergens) ? foodForm.allergens : []).filter(Boolean),
        is_verified: foodForm.is_verified,
      }
      const url = editingFood
        ? `${getApiUrl()}/api/nutrition/foods/${editingFood.id}/`
        : `${getApiUrl()}/api/nutrition/foods/`
      const method = editingFood ? 'PATCH' : 'POST'
      const response = await fetch(url, { method, headers, body: JSON.stringify(body) })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || err.name?.[0] || 'Error al guardar')
      }
      toast({ title: editingFood ? '✅ Alimento actualizado' : '✅ Alimento creado', description: foodForm.name })
      setFoodModalOpen(false)
      fetchFoods()
      fetchStats()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setSavingFood(false)
    }
  }

  // ---- Importar CSV/Excel ----
  const handleFileImport = async () => {
    if (!selectedFile) return
    setFileImporting(true)
    setFileImportResult(null)
    try {
      const fileName = selectedFile.name.toLowerCase()
      let importPath = ''

      if (fileName.endsWith('.csv')) {
        importPath = '/api/admin/nutrition/foods/import-csv/'
      } else if (fileName.endsWith('.xlsx')) {
        importPath = '/api/admin/nutrition/foods/import-excel/'
      } else {
        throw new Error('Formato no compatible. Usa un archivo .csv o .xlsx')
      }

      const authHeaders = await getAuthHeaders() as Record<string, string>
      const formData = new FormData()
      formData.append('file', selectedFile)
      // multipart — no enviar Content-Type manualmente
      const headers: Record<string, string> = {}
      if (authHeaders['Authorization']) headers['Authorization'] = authHeaders['Authorization']
      const response = await fetch(`${getApiUrl()}${importPath}`, {
        method: 'POST',
        headers,
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Error en la importación')

      const normalizedErrors: string[] = Array.isArray(data.errors)
        ? data.errors.map((err: any) => {
            if (typeof err === 'string') return err
            if (err && typeof err === 'object') {
              const name = err.name ? String(err.name) : ''
              const message = err.error ? String(err.error) : JSON.stringify(err)
              return name ? `${name}: ${message}` : message
            }
            return String(err)
          })
        : []

      setFileImportResult({
        created: data.created ?? data.imported ?? 0,
        updated: data.updated ?? 0,
        skipped: data.skipped ?? 0,
        errors: normalizedErrors,
        skippedDetails: Array.isArray(data.skipped_details)
          ? data.skipped_details.map((d: any) => ({
              row: d.row ?? '?',
              name: d.name ?? null,
              reason: d.reason ?? '',
            }))
          : [],
      })
      fetchFoods()
      fetchStats()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setFileImporting(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${getApiUrl()}/api/admin/nutrition/foods/download-template/`, { headers })
      if (!response.ok) throw new Error('Error al descargar')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'plantilla_alimentos.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast({ title: '✅ Plantilla descargada', description: 'plantilla_alimentos.xlsx' })
    } catch {
      toast({ title: 'Error', description: 'No se pudo descargar la plantilla', variant: 'destructive' })
    }
  }

  const handleExportExcel = async () => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${getApiUrl()}/api/admin/nutrition/foods/export-excel/`, { headers })
      if (!response.ok) throw new Error('Error al exportar')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'alimentos_export.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast({ title: '✅ Exportación Excel', description: 'alimentos_export.xlsx descargado.' })
    } catch {
      toast({ title: 'Error', description: 'No se pudo exportar el Excel', variant: 'destructive' })
    }
  }

  const resetImportModal = () => {
    setImportModalOpen(false)
    setImportSearchTerm("")
    setSearchResults([])
    setSelectedToImport([])
    setImportCategory("")
    setImportStore("none")
    setImportStoreFilter("all")
    setImportPage(1)
    setImportPageSize(20)
    setImportTotalCount(0)
    setImportFilterText("")
    setImportFilterCategory("all")
    setImportFilterStore("all")
    setShowImportFilters(true)
    setImportStep("search")
  }
  const getResultCode = (food: any): string => {
    return food.barcode || food.code || food.id || ""
  }

  const matchesResultStore = (food: any, storeValue: string): boolean => {
    if (!storeValue || storeValue === 'all') return true
    const storesText = (food.stores || "").toLowerCase()
    const storesTags = (food.stores_tags || []).map((tag: string) => tag.toLowerCase())
    const storeLabel = (STORE_LABELS[storeValue] || storeValue).toLowerCase()
    return storesText.includes(storeValue.toLowerCase())
      || storesText.includes(storeLabel)
      || storesTags.includes(storeValue.toLowerCase())
      || storesTags.includes(storeLabel)
  }

  const categoryOptions = useMemo(() => {
    const categories = searchResults
      .map((food) => (food.category || '').trim())
      .filter(Boolean)
    return Array.from(new Set(categories))
  }, [searchResults])

  const filteredResults = useMemo(() => {
    return searchResults.filter((food) => {
      if (food.already_exists) return false
      if (!matchesResultStore(food, importFilterStore)) return false
      if (importFilterCategory !== 'all') {
        const category = (food.category || "").toLowerCase()
        if (!category.includes(importFilterCategory.toLowerCase())) return false
      }
      if (!importFilterText.trim()) return true
      const term = importFilterText.trim().toLowerCase()
      const name = (food.name || "").toLowerCase()
      const brand = (food.brand || "").toLowerCase()
      const category = (food.category || "").toLowerCase()
      return name.includes(term) || brand.includes(term) || category.includes(term)
    })
  }, [searchResults, importFilterStore, importFilterText, importFilterCategory])

  const filteredCodes = useMemo(() => {
    return filteredResults.map(getResultCode).filter(Boolean)
  }, [filteredResults])

  const selectedFilteredCount = useMemo(() => {
    return filteredCodes.filter((code) => selectedToImport.includes(code)).length
  }, [filteredCodes, selectedToImport])

  const importTotalPages = useMemo(() => {
    if (!importTotalCount || !importPageSize) return 1
    return Math.max(1, Math.ceil(importTotalCount / importPageSize))
  }, [importTotalCount, importPageSize])

  const importRangeLabel = useMemo(() => {
    if (!filteredResults.length) return ""
    return `Mostrando ${filteredResults.length} de ${importPageSize} en esta pagina`
  }, [filteredResults.length, importPageSize])


  const toggleSelectFood = (code: string) => {
    setSelectedToImport(prev => 
      prev.includes(code) 
        ? prev.filter(c => c !== code)
        : [...prev, code]
    )
  }

  const selectAllResults = () => {
    const allFilteredSelected = filteredCodes.length > 0 && selectedFilteredCount === filteredCodes.length

    if (allFilteredSelected) {
      setSelectedToImport(selectedToImport.filter(code => !filteredCodes.includes(code)))
      return
    }

    const merged = new Set([...selectedToImport, ...filteredCodes])
    setSelectedToImport(Array.from(merged))
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
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExportExcel}>
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Exportar </span>Excel
          </Button>
          <Button variant="outline" onClick={() => setFileImportOpen(true)}>
            <FileUp className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Importar </span>CSV/Excel
          </Button>
          <Button variant="outline" onClick={() => setImportModalOpen(true)}>
            <Search className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Importar </span>API
          </Button>
          <Button
            onClick={openCreateModal}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Alimento
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20 dark:border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700">Total Alimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20 dark:border-green-500/20">
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
        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20 dark:border-blue-500/20">
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
            <div className="mt-4 flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg">
              <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">
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
                    <div className={`border rounded-lg transition-all ${isExpanded ? 'border-amber-300 dark:border-amber-700 shadow-md' : 'border-border'}`}>
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
                          <button className="flex-1 flex items-center gap-4 text-left hover:bg-muted/50 rounded p-2 -m-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{food.name}</span>
                                {food.is_verified && (
                                  <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                                    ✓ Verificado
                                  </Badge>
                                )}
                              </div>
                              {food.brand && (
                                <p className="text-sm text-muted-foreground truncate">{food.brand}</p>
                              )}
                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-foreground md:hidden">
                                <span className="px-2 py-0.5 bg-muted rounded">{food.calories} kcal</span>
                                <span className="px-2 py-0.5 bg-red-500/15 text-red-700 dark:text-red-400 rounded">P: {food.protein}g</span>
                                <span className="px-2 py-0.5 bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 rounded">C: {food.carbs}g</span>
                                <span className="px-2 py-0.5 bg-blue-500/15 text-blue-700 dark:text-blue-400 rounded">G: {food.fat}g</span>
                                {food.store && (
                                  <span className="px-2 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-400 rounded">
                                    {STORE_LABELS[food.store] || food.store}
                                  </span>
                                )}
                                {food.category && (
                                  <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 rounded">
                                    {food.category}
                                  </span>
                                )}
                                {food.equivalence_category && (
                                  <span className="px-2 py-0.5 bg-teal-500/15 text-teal-700 dark:text-teal-400 rounded">
                                    Eq: {getEquivalenceLabel(food.equivalence_category)}
                                  </span>
                                )}
                                {Array.isArray(food.allergens) && food.allergens.length > 0 && (
                                  <span className="px-2 py-0.5 bg-red-500/15 text-red-700 dark:text-red-400 rounded">
                                    {food.allergens.length} alergenos
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="hidden md:flex items-center gap-6 text-sm">
                              <div className="text-center">
                                <div className="font-bold text-amber-600">{food.calories}</div>
                                <div className="text-xs text-muted-foreground">kcal</div>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-red-500">{food.protein}g</div>
                                <div className="text-xs text-muted-foreground">Prot</div>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-yellow-500">{food.carbs}g</div>
                                <div className="text-xs text-muted-foreground">Carbs</div>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-blue-500">{food.fat}g</div>
                                <div className="text-xs text-muted-foreground">Grasa</div>
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
                        <div className="px-4 pb-4 border-t border-border pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Info General */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-foreground flex items-center gap-2">
                                📋 Información General
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Categoría</span>
                                  <span className="font-medium">{food.category || '-'}</span>
                                </div>
                                <div className="flex justify-between gap-3">
                                  <span className="text-muted-foreground">Equivalencia</span>
                                  <span className="font-medium text-right">{getEquivalenceLabel(food.equivalence_category)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Supermercado</span>
                                  <span className="font-medium">{food.store ? STORE_LABELS[food.store] || food.store : '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Porción</span>
                                  <span className="font-medium">{food.serving_size}{food.serving_unit}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Marca</span>
                                  <span className="font-medium">{food.brand || '-'}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block mb-1">Alergenos</span>
                                  {Array.isArray(food.allergens) && food.allergens.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {food.allergens.map((allergen) => (
                                        <Badge key={allergen} variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
                                          {ALLERGEN_OPTIONS.find((option) => option.value === allergen)?.label || allergen}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="font-medium">-</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Macros */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-foreground flex items-center gap-2">
                                💪 Macronutrientes
                              </h4>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                  <span className="text-sm flex-1">Proteínas</span>
                                  <span className="font-bold">{food.protein}g</span>
                                  <span className="text-xs text-muted-foreground">({macros.protein}%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                  <span className="text-sm flex-1">Carbohidratos</span>
                                  <span className="font-bold">{food.carbs}g</span>
                                  <span className="text-xs text-muted-foreground">({macros.carbs}%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                  <span className="text-sm flex-1">Grasas</span>
                                  <span className="font-bold">{food.fat}g</span>
                                  <span className="text-xs text-muted-foreground">({macros.fat}%)</span>
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
                              <h4 className="font-semibold text-foreground flex items-center gap-2">
                                🌿 Otros Nutrientes
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">🌾 Fibra</span>
                                  <span className="font-medium">{food.fiber}g</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">🍬 Azúcar</span>
                                  <span className="font-medium">{food.sugar}g</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">🧂 Sodio</span>
                                  <span className="font-medium">{food.sodium}mg</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
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
                              onClick={() => openEditModal(food)}
                            >
                              <Pencil className="h-4 w-4 mr-1" /> Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
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

      {/* ===== Modal Crear / Editar Alimento ===== */}
      <Dialog open={foodModalOpen} onOpenChange={(open) => { if (!open) setFoodModalOpen(false) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFood ? '✏️ Editar Alimento' : '➕ Nuevo Alimento'}</DialogTitle>
            <DialogDescription>
              {editingFood ? 'Modifica los datos del alimento.' : 'Rellena los campos para crear un nuevo alimento.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            {/* Nombre */}
            <div className="md:col-span-2 space-y-1">
              <Label>Nombre <span className="text-red-500">*</span></Label>
              <Input value={foodForm.name} onChange={(e) => setFoodForm(f => ({ ...f, name: e.target.value }))} placeholder="Pechuga de pollo" />
            </div>
            {/* Marca */}
            <div className="space-y-1">
              <Label>Marca</Label>
              <Input value={foodForm.brand} onChange={(e) => setFoodForm(f => ({ ...f, brand: e.target.value }))} placeholder="Hacendado" />
            </div>
            {/* Categoría */}
            <div className="space-y-1">
              <Label>Categoría</Label>
              <Input value={foodForm.category} onChange={(e) => setFoodForm(f => ({ ...f, category: e.target.value }))} placeholder="Carnes" />
            </div>
            {/* Supermercado */}
            <div className="space-y-1">
              <Label>Supermercado</Label>
              <Select value={foodForm.store || 'none'} onValueChange={(v) => setFoodForm(f => ({ ...f, store: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno</SelectItem>
                  {Object.entries(STORE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-2 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
              <div>
                <Label className="font-semibold">Grupo de equivalencia</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Este grupo decide con qué alimentos puede intercambiarse en las recetas.
                </p>
              </div>
              <Select
                value={foodForm.equivalence_category || 'none'}
                onValueChange={(value) => setFoodForm((form) => ({ ...form, equivalence_category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin grupo manual" />
                </SelectTrigger>
                <SelectContent>
                  {EQUIVALENCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Alergenos */}
            <div className="md:col-span-2 space-y-2 rounded-lg border border-red-100 bg-red-50/60 p-3">
              <div>
                <Label className="font-semibold">Alergenos del alimento</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Puedes marcarlos manualmente. Si el nombre/marca sugiere uno, te lo indicamos abajo.
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {ALLERGEN_OPTIONS.map((option) => {
                  const checked = Array.isArray(foodForm.allergens) && foodForm.allergens.includes(option.value)
                  const suggested = inferredAllergens.includes(option.value)
                  return (
                    <div
                      key={option.value}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer select-none ${suggested ? 'border-amber-300 bg-amber-50' : 'bg-white'}`}
                      onClick={() => toggleAllergen(option.value, !checked)}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => toggleAllergen(option.value, Boolean(value))}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span>{option.label}</span>
                    </div>
                  )
                })}
              </div>
              {inferredAllergens.length > 0 && (
                <p className="text-xs text-amber-700">
                  Sugeridos automaticamente: {inferredAllergens.join(', ')}
                </p>
              )}
            </div>
            {/* Porción */}
            <div className="space-y-1">
              <Label>Tamaño de porción</Label>
              <div className="flex gap-2">
                <Input type="number" min="0" value={foodForm.serving_size} onChange={(e) => setFoodForm(f => ({ ...f, serving_size: e.target.value }))} className="w-24" />
                <Input value={foodForm.serving_unit} onChange={(e) => setFoodForm(f => ({ ...f, serving_unit: e.target.value }))} placeholder="g" className="w-20" />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
              <div className="space-y-1">
                <Label className="font-semibold">Modo nutricional</Label>
                <p className="text-xs text-muted-foreground">
                  Define como has introducido los macros para este alimento.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={nutritionBasis === 'per_100' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => applyNutritionBasis('per_100')}
                >
                  Macros por 100g/ml
                </Button>
                <Button
                  type="button"
                  variant={nutritionBasis === 'per_unit' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => applyNutritionBasis('per_unit')}
                >
                  Macros por unidad
                </Button>
              </div>
              <p className="text-xs text-amber-800">
                {nutritionBasis === 'per_unit'
                  ? 'Ejemplo: 1 huevo M, 1 lata de atún, 1 manzana. Recomendado: porción 1 y unidad ud/lata.'
                  : 'Ejemplo: macros por 100g o 100ml. Recomendado: unidad g/ml y porción 100.'}
              </p>
            </div>

            <div className="md:col-span-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Valores por porción</p>
            </div>

            {/* Calorías */}
            <div className="space-y-1">
              <Label>Calorías (kcal)</Label>
              <Input type="number" min="0" value={foodForm.calories} onChange={(e) => setFoodForm(f => ({ ...f, calories: e.target.value }))} />
            </div>
            {/* Proteínas */}
            <div className="space-y-1">
              <Label>Proteínas (g)</Label>
              <Input type="number" min="0" step="0.1" value={foodForm.protein} onChange={(e) => setFoodForm(f => ({ ...f, protein: e.target.value }))} />
            </div>
            {/* Carbohidratos */}
            <div className="space-y-1">
              <Label>Carbohidratos (g)</Label>
              <Input type="number" min="0" step="0.1" value={foodForm.carbs} onChange={(e) => setFoodForm(f => ({ ...f, carbs: e.target.value }))} />
            </div>
            {/* Grasas */}
            <div className="space-y-1">
              <Label>Grasas (g)</Label>
              <Input type="number" min="0" step="0.1" value={foodForm.fat} onChange={(e) => setFoodForm(f => ({ ...f, fat: e.target.value }))} />
            </div>
            {/* Fibra */}
            <div className="space-y-1">
              <Label>Fibra (g)</Label>
              <Input type="number" min="0" step="0.1" value={foodForm.fiber} onChange={(e) => setFoodForm(f => ({ ...f, fiber: e.target.value }))} />
            </div>
            {/* Azúcar */}
            <div className="space-y-1">
              <Label>Azúcar (g)</Label>
              <Input type="number" min="0" step="0.1" value={foodForm.sugar} onChange={(e) => setFoodForm(f => ({ ...f, sugar: e.target.value }))} />
            </div>
            {/* Sodio */}
            <div className="space-y-1">
              <Label>Sodio (mg)</Label>
              <Input type="number" min="0" step="0.1" value={foodForm.sodium} onChange={(e) => setFoodForm(f => ({ ...f, sodium: e.target.value }))} />
            </div>
            {/* Verificado */}
            <div className="flex items-center gap-2 pt-4">
              <Checkbox id="is_verified" checked={foodForm.is_verified} onCheckedChange={(v) => setFoodForm(f => ({ ...f, is_verified: !!v }))} />
              <Label htmlFor="is_verified">Marcar como verificado</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFoodModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveFood} disabled={savingFood} className="bg-gradient-to-r from-amber-500 to-orange-500">
              {savingFood ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : editingFood ? 'Guardar cambios' : 'Crear alimento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Modal Importar CSV / Excel ===== */}
      <Dialog open={fileImportOpen} onOpenChange={(open) => { if (!open) { setFileImportOpen(false); setSelectedFile(null); setFileImportResult(null) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5 text-amber-500" />
              Importar CSV / Excel
            </DialogTitle>
            <DialogDescription>
              Carga un fichero .csv o .xlsx con los alimentos. Si el nombre ya existe se actualiza el registro.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <FileText className="h-4 w-4 mr-2" />
                Descargar plantilla Excel
              </Button>
              <span className="text-xs text-gray-500">Úsala como punto de partida</span>
            </div>

            <div className="space-y-1">
              <Label>Fichero (.csv o .xlsx)</Label>
              <Input
                type="file"
                accept=".xlsx,.csv"
                onChange={(e) => { setSelectedFile(e.target.files?.[0] || null); setFileImportResult(null) }}
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
              <p className="font-semibold">Columnas reconocidas (en inglés o español):</p>
              <p><strong>name</strong> / nombre · brand / marca · category / categoria · store / supermercado</p>
              <p><strong>equivalence_category</strong> / equivalencia: carnes,pescados,marisco,huevos,arroz_cereales,panes,legumbres,fruta,verduras,lacteos,frutos_secos,grasas,otros</p>
              <p><strong>calories</strong> / calorias · protein / proteina · carbs / carbohidratos · fat / grasa</p>
              <p>fiber / fibra · sugar / azucar · sodium / sodio · serving_size · serving_unit / unidad</p>
              <p><strong>allergens</strong> / alergenos: gluten,dairy,eggs,nuts,soy,fish,shellfish,sesame</p>
              <p className="mt-1">Los valores de <strong>store</strong> válidos: mercadona · carrefour · lidl · aldi · dia · alcampo · eroski · consum · hipercor · otro</p>
            </div>

            {fileImportResult && (
              <div className="border rounded-lg p-4 space-y-1 text-sm">
                <p className="font-semibold text-green-700">Resultado de la importación</p>
                <p>✅ Creados: <strong>{fileImportResult.created}</strong></p>
                <p>🔄 Actualizados: <strong>{fileImportResult.updated}</strong></p>
                <p>⏭️ Omitidos: <strong>{fileImportResult.skipped}</strong></p>
                {fileImportResult.skippedDetails.length > 0 && (
                  <div className="mt-2">
                    <p className="text-amber-700 font-medium">Detalle de omitidos ({fileImportResult.skippedDetails.length}):</p>
                    <ul className="list-disc list-inside text-amber-700 space-y-0.5 max-h-48 overflow-y-auto pr-2 border border-amber-200 rounded-md p-2 bg-amber-50/60 text-xs">
                      {fileImportResult.skippedDetails.map((d, i) => (
                        <li key={i}>
                          Fila {d.row}{d.name ? ` · ${d.name}` : ''}: {d.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {fileImportResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-red-600 font-medium">Errores ({fileImportResult.errors.length}):</p>
                    <ul className="list-disc list-inside text-red-500 space-y-0.5 max-h-64 overflow-y-auto pr-2 border border-red-100 rounded-md p-2 bg-red-50/40">
                      {fileImportResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setFileImportOpen(false); setSelectedFile(null); setFileImportResult(null) }}>Cerrar</Button>
            <Button
              onClick={handleFileImport}
              disabled={!selectedFile || fileImporting}
              className="bg-gradient-to-r from-amber-500 to-orange-500"
            >
              {fileImporting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importando...</> : <><FileUp className="h-4 w-4 mr-2" />Importar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Modal - Flujo de 2 pasos */}
      <Dialog open={importModalOpen} onOpenChange={(open) => { if (!open) resetImportModal() }}>
        <DialogContent className="w-full h-[100dvh] max-w-none rounded-none overflow-hidden md:h-auto md:max-w-2xl md:max-h-[85vh] md:rounded-lg md:overflow-hidden flex flex-col min-h-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-amber-500" />
              Importar Alimentos
              {importStep === "results" && (
                <Badge variant="secondary" className="ml-2">
                  {selectedFilteredCount} / {filteredResults.length} seleccionados
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
                    onClick={() => handleSearchFoods()}
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

              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label>Resultados por página</Label>
                  <Select value={importPageSize.toString()} onValueChange={(v) => setImportPageSize(parseInt(v))}>
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
                <div className="space-y-2">
                  <Label>Filtrar por supermercado</Label>
                  <Select value={importStoreFilter} onValueChange={setImportStoreFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {IMPORT_STORE_OPTIONS.map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="grid grid-cols-1 gap-3 py-2 md:grid-cols-[auto_1fr] md:items-center">
                <Button variant="ghost" size="sm" onClick={() => setImportStep("search")}>
                  ← Volver a buscar
                </Button>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-[auto_auto_1fr] md:items-center">
                  <Button variant="outline" size="sm" onClick={selectAllResults} className="w-full md:w-auto">
                    {filteredCodes.length > 0 && selectedFilteredCount === filteredCodes.length
                      ? 'Deseleccionar todos'
                      : 'Seleccionar todos'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowImportFilters((prev) => !prev)}
                    className="w-full md:w-auto"
                  >
                    {showImportFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
                  </Button>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={importPage <= 1}
                        onClick={() => handleSearchFoods(importPage - 1, false)}
                        className="h-8 w-8"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span>Página {importPage} de {importTotalPages}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={importPage >= importTotalPages}
                        onClick={() => handleSearchFoods(importPage + 1, false)}
                        className="h-8 w-8"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    {importRangeLabel && (
                      <span>{importRangeLabel}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto pb-4">
                {showImportFilters && (
                  <div className="grid grid-cols-1 gap-3 py-2 md:grid-cols-4 md:items-end">
                    <div className="space-y-2">
                      <Label>Buscar en resultados</Label>
                      <Input
                        placeholder="Nombre, marca o categoria"
                        value={importFilterText}
                        onChange={(e) => setImportFilterText(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Filtro categoria</Label>
                      <Select value={importFilterCategory} onValueChange={setImportFilterCategory}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {categoryOptions.map((category) => (
                            <SelectItem key={category} value={category.toLowerCase()}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Filtro supermercado</Label>
                      <Select value={importFilterStore} onValueChange={setImportFilterStore}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {IMPORT_STORE_OPTIONS.map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Resultados por pagina</Label>
                      <Select
                        value={importPageSize.toString()}
                        onValueChange={(v) => handleSearchFoods(1, false, parseInt(v))}
                      >
                        <SelectTrigger className="w-full">
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
                  </div>
                )}
                
                <div className="border rounded-lg">
                  {filteredResults.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      No se encontraron resultados
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredResults.map((food) => {
                        const code = getResultCode(food)
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
                                {food.stores && (
                                  <div className="text-xs text-gray-400">Tienda: {food.stores}</div>
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
            </div>
          )}

          {importStep === "results" && (
            <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-600 md:grid-cols-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700">Categoría de importación:</span>
                <span>{importCategory || 'Sin categoría'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700">Supermercado de importación:</span>
                <span>{importStore === 'none' ? 'Ninguno' : (STORE_LABELS[importStore] || importStore)}</span>
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
