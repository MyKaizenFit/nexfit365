"use client"

import Image from "next/image"
import { useState, useEffect, useMemo, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Download, Upload, Loader2, Plus, Edit2, Trash2, Eye, X, Search, Clock, Users, ChefHat, Flame, Zap, Trophy, GripVertical, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Image as ImageIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { getApiBaseUrl } from "@/lib/api"

const getApiUrl = getApiBaseUrl

interface Food {
  id: string
  name: string
  brand?: string
  calories: number
  protein: number
  carbs: number
  fat: number
  category?: string
}

interface RecipeIngredient {
  id?: string
  food_id?: string
  food?: Food
  quantity: number
  unit: string
  notes?: string
  order?: number
  calculated_macros?: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber?: number
    sugar?: number
    sodium?: number
  }
}

interface Recipe {
  id: string
  name: string
  description?: string
  category?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  difficulty?: string
  instructions?: string
  recipe_ingredients?: RecipeIngredient[]
  image_url?: string
  image?: string
  diet_types?: string[]
  allergens?: string[]
  tags?: string[]
}

interface FormData {
  name: string
  description: string
  category: string
  difficulty: string
  instructions: string
  recipe_ingredients: RecipeIngredient[]
  image_url: string
  diet_types: string[]
}

interface RecipeImportResult {
  created: number
  updated: number
  skipped: number
  rejected: number
  message: string
  errors: string[]
  rejections: string[]
}

const isFatToFitRecipe = (recipe: Recipe) => {
  const haystack = [recipe.name, recipe.description, recipe.category]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return [
    'fat to fit',
    'fat-to-fit',
    'fat→fit',
    'fat2fit',
    'transformación',
    'transformacion'
  ].some((term) => haystack.includes(term))
}

const FREE_FROM_DIET_OPTIONS = [
  { value: 'gluten-free', label: 'Sin gluten' },
  { value: 'dairy-free', label: 'Sin lactosa' },
  { value: 'egg-free', label: 'Sin huevo' },
  { value: 'nut-free', label: 'Sin frutos secos' },
  { value: 'soy-free', label: 'Sin soja' },
  { value: 'fish-free', label: 'Sin pescado' },
  { value: 'shellfish-free', label: 'Sin marisco' },
  { value: 'sesame-free', label: 'Sin sésamo' },
]

const AUTO_FREE_FROM_KEYWORDS: Record<string, string[]> = {
  'gluten-free': ['gluten', 'trigo', 'wheat', 'harina', 'pasta', 'pan', 'cebada', 'barley', 'centeno', 'rye', 'avena', 'oats', 'malta', 'malt', 'semola', 'semolina', 'couscous', 'rebozado', 'empanado'],
  'dairy-free': ['leche', 'milk', 'queso', 'cheese', 'yogur', 'yogurt', 'mantequilla', 'butter', 'crema', 'cream', 'nata', 'whey', 'caseina', 'casein', 'lactosa', 'lactose'],
  'egg-free': ['huevo', 'huevos', 'egg', 'eggs', 'mayonesa', 'mayo', 'merengue'],
  'nut-free': ['almendra', 'almendras', 'almond', 'nuez', 'nueces', 'walnut', 'walnuts', 'avellana', 'avellanas', 'hazelnut', 'hazelnuts', 'pistacho', 'pistachios', 'cacahuate', 'cacahuetes', 'peanut', 'peanuts', 'mani', 'anacardo', 'cashew', 'cashews', 'macadamia', 'pecan', 'pecanas', 'pine nut', 'piñon', 'pinon'],
  'soy-free': ['soja', 'soy', 'soya', 'tofu', 'tempeh', 'edamame', 'miso', 'salsa de soja'],
  'fish-free': ['pescado', 'fish', 'salmon', 'atun', 'tuna', 'sardina', 'anchov', 'bacalao', 'trucha', 'merluza', 'caballa'],
  'shellfish-free': ['marisco', 'shellfish', 'gamba', 'gambas', 'langostino', 'langostinos', 'camaron', 'camarones', 'crab', 'cangrejo', 'lobster', 'langosta', 'mejillon', 'mejillones', 'almeja', 'almejas', 'ostra', 'ostras', 'scallop'],
  'sesame-free': ['sesamo', 'sesame', 'ajonjoli', 'ajonjolí', 'tahini'],
}

const normalizeFilterText = (value: string) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim()

const getRecipeIngredientTexts = (ingredients: RecipeIngredient[] = []) => {
  return ingredients
    .flatMap((ingredient) => [
      ingredient.food?.name || '',
      ingredient.food?.brand || '',
      ingredient.notes || '',
    ])
    .map((text) => normalizeFilterText(text))
    .filter(Boolean)
}

const getDetectedFreeFromFlags = (ingredients: RecipeIngredient[] = []) => {
  const texts = getRecipeIngredientTexts(ingredients)
  const detected = new Set<string>()

  for (const [dietType, keywords] of Object.entries(AUTO_FREE_FROM_KEYWORDS)) {
    const hasConflict = texts.some((text) => keywords.some((keyword) => text.includes(keyword)))
    if (hasConflict) {
      detected.add(dietType)
    }
  }

  return detected
}

const resolveRecipeDietTypes = (dietTypes: string[] = [], ingredients: RecipeIngredient[] = []) => {
  const selectedTypes = dietTypes.map((type) => normalizeFilterText(type).replace(/\s+/g, '-')).filter(Boolean)
  const detectedConflicts = getDetectedFreeFromFlags(ingredients)
  const preservedTypes = selectedTypes.filter((type) => !AUTO_FREE_FROM_KEYWORDS[type])
  const freeFromTypes = FREE_FROM_DIET_OPTIONS
    .map((option) => option.value)
    .filter((type) => selectedTypes.includes(type) && !detectedConflicts.has(type))

  return Array.from(new Set([...preservedTypes, ...freeFromTypes]))
}

const recipeHasAllSelectedFreeFrom = (recipe: Recipe, selectedTypes: string[]) => {
  if (!selectedTypes.length) return true
  const recipeTypes = (recipe.diet_types || []).map((type) => normalizeFilterText(type).replace(/\s+/g, '-'))
  return selectedTypes.every((type) => recipeTypes.includes(type))
}

const getNextCopyName = (baseName: string, existingNames: string[]) => {
  const trimmed = baseName.trim()
  const escapedBaseName = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const copyPattern = new RegExp(`^${escapedBaseName} \(Copia(?: (\\d+))?\)$`, 'i')
  let highest = 1

  existingNames.forEach((name) => {
    if (name === `${trimmed} (Copia)`) {
      highest = Math.max(highest, 2)
      return
    }

    const match = name.match(copyPattern)
    if (match) {
      const number = match[1] ? Number(match[1]) : 2
      highest = Math.max(highest, number)
    }
  })

  return highest <= 1 ? `${trimmed} (Copia)` : `${trimmed} (Copia ${highest})`
}

export function RecipeManagement() {
  const { getAuthHeaders } = useAuth()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [foods, setFoods] = useState<Food[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingFoods, setLoadingFoods] = useState(false)

  // Dialogs
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)

  // Files and forms
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<RecipeImportResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [recipeTypeFilter, setRecipeTypeFilter] = useState<string>('all')
  const [freeFromFilters, setFreeFromFilters] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [sortColumn, setSortColumn] = useState<'name' | 'category' | 'calories' | 'difficulty'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([])
  const [copyingRecipeId, setCopyingRecipeId] = useState<string | null>(null)
  const itemsPerPage = 25

  // Editing/Creating
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    category: '',
    difficulty: '',
    instructions: '',
    recipe_ingredients: [],
    image_url: '',
    diet_types: [],
  })

  // Nuevo: input para URL de imagen
  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, image_url: e.target.value }))
  }
  const [ingredientSearch, setIngredientSearch] = useState('')
  const [ingredientInputValue, setIngredientInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [ingredientCategory, setIngredientCategory] = useState('')
  const [ingredientCaloriesFilter, setIngredientCaloriesFilter] = useState('')
  const [ingredientProteinFilter, setIngredientProteinFilter] = useState('')
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [imageUrlValidating, setImageUrlValidating] = useState(false)
  const [imageUrlError, setImageUrlError] = useState('')
  const [imageUrlSuccess, setImageUrlSuccess] = useState(false)

  const resolveRecipeImageSrc = (imageUrl?: string, imagePath?: string) => {
    const direct = (imageUrl || '').trim()
    if (direct) {
      if (direct.startsWith('http://') || direct.startsWith('https://') || direct.startsWith('data:')) {
        return direct
      }

      if (direct.startsWith('/')) {
        return `${getApiUrl()}${direct}`
      }

      // Ignore bare filenames or malformed values stored in image_url.
      // Those should not be treated as frontend routes.
    }

    const path = (imagePath || '').trim()
    if (!path) {
      return ''
    }

    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    return `${getApiUrl()}${normalizedPath}`
  }

  const fetchRecipes = async () => {
    setLoading(true)
    try {
      const headers = await getAuthHeaders()
      const timestamp = new Date().getTime()
      let nextUrl: string | null = `${getApiUrl()}/api/admin/nutrition/recipes/?cache=${timestamp}&page_size=500`
      const allRecipes: Recipe[] = []

      while (nextUrl) {
        const response: Response = await fetch(nextUrl, {
          method: 'GET',
          headers: headers,
        })

        if (!response.ok) {
          // Algunas respuestas devuelven 404 "Invalid page" para page=2.
          // Lo tratamos como fin de paginacion para no romper la carga.
          if (response.status === 404 && nextUrl.includes('page=')) {
            break
          }
          if (response.status === 401) {
            toast({ title: "Error", description: "No autorizado. Por favor, inicia sesión nuevamente.", variant: "destructive" })
            setRecipes([])
            return
          }
          throw new Error(`Error ${response.status}`)
        }

        const data: Record<string, unknown> = await response.json()
        if (Array.isArray(data)) {
          allRecipes.push(...data)
          nextUrl = null
        } else {
          allRecipes.push(...((data.results as Recipe[]) || []))
          nextUrl = (data.next as string) || null
        }
      }

      setRecipes(allRecipes)
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "No se pudieron cargar las recetas", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const fetchFoods = async () => {
    setLoadingFoods(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${getApiUrl()}/api/admin/nutrition/foods/list-for-recipes/`, {
        method: 'GET',
        headers: headers,
      })
      if (response.ok) {
        const data = await response.json()
        setFoods(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los ingredientes", variant: "destructive" })
    } finally {
      setLoadingFoods(false)
    }
  }

  useEffect(() => {
    fetchRecipes()
    fetchFoods()
  }, [])

  const calculateMacros = (ingredients: RecipeIngredient[]) => {
    let totalCals = 0, totalProt = 0, totalCarbs = 0, totalFat = 0
    ingredients.forEach((ing) => {
      if (ing.food) {
        const ratio = ing.quantity / 100
        totalCals += ing.food.calories * ratio
        totalProt += ing.food.protein * ratio
        totalCarbs += ing.food.carbs * ratio
        totalFat += ing.food.fat * ratio
      }
    })
    return { calories: Math.round(totalCals), protein: Math.round(totalProt * 100) / 100, carbs: Math.round(totalCarbs * 100) / 100, fat: Math.round(totalFat * 100) / 100 }
  }

  const handleExport = async (type: 'csv' | 'excel') => {
    try {
      const headers = await getAuthHeaders()
      const url = `${getApiUrl()}/api/admin/nutrition/recipes/export-${type}/?t=${Date.now()}`
      const response = await fetch(url, { method: 'GET', headers: headers, cache: 'no-store' })
      if (!response.ok) throw new Error(`Error ${response.status}`)

      const contentType = response.headers.get('content-type') || ''
      const expectedType = type === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv'
      const isValidType = contentType.includes(expectedType) || (type === 'csv' && contentType.includes('application/csv'))

      if (!isValidType) {
        const errorBody = await response.text().catch(() => '')
        throw new Error(errorBody || 'El servidor no devolvió un archivo válido para descargar')
      }

      const blob = await response.blob()
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(blob)
      link.download = type === 'csv' ? 'recipes_export.csv' : 'recipes_export.xlsx'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(link.href)
      toast({ title: `✅ Exportación ${type.toUpperCase()}`, description: 'Archivo descargado correctamente.' })
    } catch (error) {
      toast({ title: '❌ Error', description: error instanceof Error ? error.message : 'No se pudo exportar', variant: 'destructive' })
    }
  }

  const handleImport = async () => {
    if (!importFile) return
    setImporting(true)
    try {
      const headers = await getAuthHeaders()
      const formDataObj = new FormData()
      formDataObj.append('file', importFile)
      const fileType = importFile.name.endsWith('.xlsx') || importFile.name.endsWith('.xls') ? 'excel' : 'csv'
      const url = `${getApiUrl()}/api/admin/nutrition/recipes/import-${fileType}/`

      const token = (headers as Record<string, string>)['Authorization']
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': token },
        body: formDataObj,
      })
      let data: any = null
      try {
        data = await response.json()
      } catch {
        data = null
      }

      if (!response.ok) {
        throw new Error(data?.detail || data?.error || `Error ${response.status}`)
      }

      setImportResult({
        created: data?.created ?? 0,
        updated: data?.updated ?? 0,
        skipped: data?.skipped ?? 0,
        rejected: data?.rejected ?? data?.rejection_count ?? 0,
        message: data?.message || 'Importación completada',
        errors: Array.isArray(data?.errors) ? data.errors.map((e: any) => String(e)) : [],
        rejections: Array.isArray(data?.rejections) ? data.rejections.map((e: any) => String(e)) : [],
      })

      toast({ title: '✅ Importación', description: data?.message || 'Recetas importadas correctamente.' })
      fetchRecipes()
    } catch (error) {
      toast({ title: '❌ Error', description: error instanceof Error ? error.message : 'No se pudo importar', variant: 'destructive' })
    } finally {
      setImporting(false)
    }
  }

  const handleOpenCreate = () => {
    setEditingRecipe(null)
    setFormData({ name: '', description: '', category: '', difficulty: '', instructions: '', recipe_ingredients: [], image_url: '', diet_types: [] })
    setIngredientInputValue('')
    setShowSuggestions(false)
    setImageUrlInput('')
    setSelectedImageFile(null)
    setImageUrlError('')
    setImageUrlSuccess(false)
    setCreateDialogOpen(true)
  }

  const handleOpenEdit = (recipe: Recipe) => {
    const normalizedIngredients = (recipe.recipe_ingredients || []).map((ing, index) => {
      const food = ing.food || (ing.food_id ? foods.find((f) => f.id === ing.food_id) : undefined)
      return {
        ...ing,
        food,
        quantity: Number(ing.quantity) || 0,
        unit: ing.unit || 'g',
        order: typeof ing.order === 'number' ? ing.order : index,
      }
    })

    setEditingRecipe(recipe)
    setFormData({
      name: recipe.name || '',
      description: recipe.description || '',
      category: recipe.category || '',
      difficulty: recipe.difficulty || '',
      instructions: recipe.instructions || '',
      recipe_ingredients: normalizedIngredients,
      image_url: recipe.image_url || '',
      diet_types: Array.isArray(recipe.diet_types) ? recipe.diet_types : [],
    })
    setIngredientInputValue('')
    setShowSuggestions(false)
    setImageUrlInput(recipe.image_url || '')
    setSelectedImageFile(null)
    setImageUrlError('')
    setImageUrlSuccess(false)
    setEditDialogOpen(true)
  }

  const handleOpenView = (recipe: Recipe) => {
    setEditingRecipe(recipe)
    setViewDialogOpen(true)
  }

  const handleCopyRecipe = async (recipe: Recipe) => {
    if (!recipe.id) return

    setCopyingRecipeId(recipe.id)
    try {
      const headers = await getAuthHeaders()
      const nextName = getNextCopyName(recipe.name, recipes.map((item) => item.name))
      const response = await fetch(`${getApiUrl()}/api/admin/nutrition/recipes/`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nextName,
          description: recipe.description || '',
          category: recipe.category || '',
          difficulty: recipe.difficulty || '',
          instructions: recipe.instructions || '',
          calories: recipe.calories || 0,
          protein: recipe.protein || 0,
          carbs: recipe.carbs || 0,
          fat: recipe.fat || 0,
          servings: 1,
          diet_types: Array.isArray(recipe.diet_types) ? recipe.diet_types : [],
          allergens: Array.isArray(recipe.allergens) ? recipe.allergens : [],
          tags: Array.isArray(recipe.tags) ? recipe.tags : [],
          image_url: recipe.image_url || '',
          recipe_ingredients: (recipe.recipe_ingredients || []).map((ingredient, index) => ({
            food_id: ingredient.food?.id || ingredient.food_id,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            notes: ingredient.notes || '',
            order: typeof ingredient.order === 'number' ? ingredient.order : index,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}`)
      }

      const createdRecipe = await response.json()
      toast({ title: '✅ Copiada', description: 'La receta se duplicó correctamente.' })
      setEditingRecipe(createdRecipe)
      setFormData({
        name: createdRecipe.name || nextName,
        description: createdRecipe.description || '',
        category: createdRecipe.category || '',
        difficulty: createdRecipe.difficulty || '',
        instructions: createdRecipe.instructions || '',
        recipe_ingredients: Array.isArray(createdRecipe.recipe_ingredients) ? createdRecipe.recipe_ingredients : [],
        image_url: createdRecipe.image_url || '',
        diet_types: Array.isArray(createdRecipe.diet_types) ? createdRecipe.diet_types : [],
      })
      setEditDialogOpen(true)
      setCreateDialogOpen(false)
      fetchRecipes()
    } catch (error) {
      toast({ title: '❌ Error', description: error instanceof Error ? error.message : 'No se pudo copiar la receta', variant: 'destructive' })
    } finally {
      setCopyingRecipeId(null)
    }
  }

  const handleAddIngredient = (food: Food) => {
    const newIngredient: RecipeIngredient = {
      food_id: food.id,
      food: food,
      quantity: 100,
      unit: 'g',
      order: formData.recipe_ingredients.length,
    }
    setFormData({
      ...formData,
      recipe_ingredients: [...formData.recipe_ingredients, newIngredient],
    })
    setIngredientInputValue('')
    setShowSuggestions(false)
  }

  const isIngredientValid = (ingredient: RecipeIngredient): boolean => {
    if (!ingredient.food) return false
    return foods.some(f => f.id === ingredient.food?.id)
  }

  const handleIngredientInputChange = (value: string) => {
    setIngredientInputValue(value)
    setShowSuggestions(true)
  }

  const getAutocompleteSuggestions = (): Food[] => {
    if (!ingredientInputValue.trim()) return []
    const query = ingredientInputValue.toLowerCase()
    return foods
      .filter(food =>
        food.name.toLowerCase().includes(query) ||
        (food.brand && food.brand.toLowerCase().includes(query))
      )
      .slice(0, 8)
  }

  const handleRemoveIngredient = (index: number) => {
    setFormData({
      ...formData,
      recipe_ingredients: formData.recipe_ingredients.filter((_, i) => i !== index),
    })
  }

  const handleUpdateIngredientQuantity = (index: number, quantity: number) => {
    const updated = [...formData.recipe_ingredients]
    updated[index].quantity = quantity
    setFormData({ ...formData, recipe_ingredients: updated })
  }

  const handleUpdateIngredientUnit = (index: number, unit: string) => {
    const updated = [...formData.recipe_ingredients]
    updated[index].unit = unit
    setFormData({ ...formData, recipe_ingredients: updated })
  }

  const handleUpdateIngredientNotes = (index: number, notes: string) => {
    const updated = [...formData.recipe_ingredients]
    updated[index].notes = notes
    setFormData({ ...formData, recipe_ingredients: updated })
  }

  const getIngredientComputedMacros = (ingredient: RecipeIngredient) => {
    if (ingredient.calculated_macros) {
      return ingredient.calculated_macros
    }

    if (!ingredient.food) {
      return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      }
    }

    const ratio = (Number(ingredient.quantity) || 0) / 100
    return {
      calories: Math.round((ingredient.food.calories || 0) * ratio),
      protein: Math.round((ingredient.food.protein || 0) * ratio * 100) / 100,
      carbs: Math.round((ingredient.food.carbs || 0) * ratio * 100) / 100,
      fat: Math.round((ingredient.food.fat || 0) * ratio * 100) / 100,
    }
  }

  const handleSaveRecipe = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'El nombre es requerido', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const headers = await getAuthHeaders()
      const macros = calculateMacros(formData.recipe_ingredients)

      const payload = {
        name: formData.name,
        description: formData.description || '',
        category: formData.category || '',
        difficulty: formData.difficulty || '',
        instructions: formData.instructions || '',
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        servings: 1,
        diet_types: resolveRecipeDietTypes(formData.diet_types, formData.recipe_ingredients),
        recipe_ingredients: formData.recipe_ingredients.map((ing) => ({
          food_id: ing.food?.id || ing.food_id,
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes || '',
          order: ing.order || 0,
        })),
      }

      const url = editingRecipe
        ? `${getApiUrl()}/api/admin/nutrition/recipes/${editingRecipe.id}/`
        : `${getApiUrl()}/api/admin/nutrition/recipes/`

      const method = editingRecipe ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        if (response.status === 404 && editingRecipe) {
          // La receta puede haber sido eliminada/reimportada y su ID ya no existir.
          await fetchRecipes()
          setEditDialogOpen(false)
          setEditingRecipe(null)
          throw new Error('La receta ya no existe con ese ID (se recargó el listado). Abre la receta de nuevo e inténtalo.')
        }

        const errorText = await response.text()
        throw new Error(errorText || `Error ${response.status}`)
      }

      toast({
        title: '✅ Éxito',
        description: editingRecipe ? 'Receta actualizada correctamente' : 'Receta creada correctamente',
      })
      setCreateDialogOpen(false)
      setEditDialogOpen(false)
      fetchRecipes()
    } catch (error) {
      toast({ title: '❌ Error', description: error instanceof Error ? error.message : 'No se pudo guardar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRecipe = async (recipe: Recipe) => {
    if (!recipe.id) return
    if (!window.confirm(`¿Estás seguro que deseas eliminar "${recipe.name}"?`)) return

    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${getApiUrl()}/api/admin/nutrition/recipes/${recipe.id}/`, {
        method: 'DELETE',
        headers: headers,
      })
      if (!response.ok) throw new Error(`Error ${response.status}`)
      toast({ title: '✅ Eliminado', description: 'Receta eliminada correctamente' })
      fetchRecipes()
    } catch (error) {
      toast({ title: '❌ Error', description: error instanceof Error ? error.message : 'No se pudo eliminar', variant: 'destructive' })
    }
  }

  const handleUpdateImageUrl = async () => {
    if (!editingRecipe?.id || !imageUrlInput.trim()) {
      setImageUrlError('Por favor ingresa una URL de imagen válida')
      return
    }

    setImageUrlValidating(true)
    setImageUrlError('')
    setImageUrlSuccess(false)

    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${getApiUrl()}/api/admin/nutrition/recipes/${editingRecipe.id}/set-image-url/`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrlInput }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `Error ${response.status}`)
      }

      const data = await response.json()
      setFormData({ ...formData, image_url: data.image_url || imageUrlInput })
      setImageUrlSuccess(true)

      // Actualizar la receta en la lista
      setEditingRecipe({ ...editingRecipe, image_url: data.image_url || imageUrlInput })

      toast({
        title: '✅ Imagen actualizada',
        description: 'La URL de la imagen ha sido guardada correctamente',
      })

      // Auto-limpiar el mensaje de éxito después de 3 segundos
      setTimeout(() => setImageUrlSuccess(false), 3000)
    } catch (error) {
      setImageUrlError(error instanceof Error ? error.message : 'No se pudo actualizar la imagen')
      toast({
        title: '❌ Error',
        description: error instanceof Error ? error.message : 'No se pudo actualizar la imagen',
        variant: 'destructive',
      })
    } finally {
      setImageUrlValidating(false)
    }
  }

  const handleUploadImageFile = async () => {
    if (!editingRecipe?.id) {
      setImageUrlError('Primero guarda la receta y luego sube la imagen')
      return
    }

    if (!selectedImageFile) {
      setImageUrlError('Selecciona un archivo de imagen')
      return
    }

    setImageUploading(true)
    setImageUrlError('')
    setImageUrlSuccess(false)

    try {
      const headers = await getAuthHeaders()
      const authToken = (headers as Record<string, string>)['Authorization']
      const formDataFile = new FormData()
      formDataFile.append('image', selectedImageFile)

      const response = await fetch(`${getApiUrl()}/api/admin/nutrition/recipes/${editingRecipe.id}/upload-image/`, {
        method: 'POST',
        headers: authToken ? { Authorization: authToken } : undefined,
        body: formDataFile,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `Error ${response.status}`)
      }

      const data = await response.json()
      const resolvedImage = resolveRecipeImageSrc(data.image_url, data.image)

      setImageUrlInput(resolvedImage)
      setFormData({ ...formData, image_url: resolvedImage })
      setEditingRecipe({ ...editingRecipe, image_url: resolvedImage, image: data.image || editingRecipe.image })
      setSelectedImageFile(null)
      setImageUrlSuccess(true)

      toast({
        title: '✅ Imagen subida',
        description: 'La imagen del archivo se guardó correctamente',
      })

      await fetchRecipes()
      setTimeout(() => setImageUrlSuccess(false), 3000)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo subir la imagen'
      setImageUrlError(message)
      toast({
        title: '❌ Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setImageUploading(false)
    }
  }

  const foodCategories = Array.from(
    new Set(foods.map((food) => food.category).filter((category) => category && category.trim()))
  ).sort()

  const filteredFoods = foods.filter((food) => {
    const search = ingredientSearch.trim().toLowerCase()
    const matchesSearch = !search ||
      food.name.toLowerCase().includes(search) ||
      (food.brand && food.brand.toLowerCase().includes(search))
    const matchesCategory = !ingredientCategory || food.category === ingredientCategory

    // Filtro por calorías
    let matchesCalories = true
    if (ingredientCaloriesFilter === 'bajo') matchesCalories = food.calories < 100
    else if (ingredientCaloriesFilter === 'medio') matchesCalories = food.calories >= 100 && food.calories < 300
    else if (ingredientCaloriesFilter === 'alto') matchesCalories = food.calories >= 300

    // Filtro por proteína
    let matchesProtein = true
    if (ingredientProteinFilter === 'bajo') matchesProtein = food.protein < 5
    else if (ingredientProteinFilter === 'medio') matchesProtein = food.protein >= 5 && food.protein < 15
    else if (ingredientProteinFilter === 'alto') matchesProtein = food.protein >= 15

    return matchesSearch && matchesCategory && matchesCalories && matchesProtein
  })

  const uniqueRecipeCategories = useMemo(
    () => Array.from(new Set(recipes.map((recipe) => recipe.category).filter((category) => category && category.trim()))) as string[],
    [recipes]
  )

  const uniqueRecipeDifficulties = useMemo(
    () => Array.from(new Set(recipes.map((recipe) => recipe.difficulty).filter((difficulty) => difficulty && difficulty.trim()))) as string[],
    [recipes]
  )

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      const normalizedSearch = searchTerm.trim().toLowerCase()
      const matchesSearch = !normalizedSearch ||
        recipe.name.toLowerCase().includes(normalizedSearch) ||
        (recipe.description || '').toLowerCase().includes(normalizedSearch)

      const matchesCategory = categoryFilter === 'all' || recipe.category === categoryFilter
      const matchesDifficulty = difficultyFilter === 'all' || recipe.difficulty === difficultyFilter
      const matchesType =
        recipeTypeFilter === 'all' ||
        (recipeTypeFilter === 'fat-to-fit' && isFatToFitRecipe(recipe)) ||
        (recipeTypeFilter === 'general' && !isFatToFitRecipe(recipe))
      const matchesFreeFrom = recipeHasAllSelectedFreeFrom(recipe, freeFromFilters)

      return matchesSearch && matchesCategory && matchesDifficulty && matchesType && matchesFreeFrom
    })
  }, [recipes, searchTerm, categoryFilter, difficultyFilter, recipeTypeFilter, freeFromFilters])

  const sortedRecipes = useMemo(() => {
    const recipesToSort = [...filteredRecipes]
    recipesToSort.sort((a, b) => {
      let aValue: string | number = ''
      let bValue: string | number = ''

      if (sortColumn === 'name') {
        aValue = (a.name || '').toLowerCase()
        bValue = (b.name || '').toLowerCase()
      }

      if (sortColumn === 'category') {
        aValue = (a.category || '').toLowerCase()
        bValue = (b.category || '').toLowerCase()
      }

      if (sortColumn === 'difficulty') {
        aValue = (a.difficulty || '').toLowerCase()
        bValue = (b.difficulty || '').toLowerCase()
      }

      if (sortColumn === 'calories') {
        aValue = a.calories || 0
        bValue = b.calories || 0
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      return sortDirection === 'asc'
        ? Number(aValue) - Number(bValue)
        : Number(bValue) - Number(aValue)
    })

    return recipesToSort
  }, [filteredRecipes, sortColumn, sortDirection])

  const handleSort = (column: 'name' | 'category' | 'calories' | 'difficulty') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
      return
    }

    setSortColumn(column)
    setSortDirection('asc')
  }

  const handleSelectRecipe = (recipeId: string, checked: boolean) => {
    setSelectedRecipes((prev) => {
      if (checked) return [...prev, recipeId]
      return prev.filter((id) => id !== recipeId)
    })
  }

  const handleSelectAllRecipes = (checked: boolean) => {
    if (checked) {
      setSelectedRecipes(currentRecipes.map((recipe) => recipe.id))
      return
    }
    setSelectedRecipes([])
  }

  const totalPages = Math.max(1, Math.ceil(sortedRecipes.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentRecipes = sortedRecipes.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, categoryFilter, difficultyFilter, recipeTypeFilter, freeFromFilters])

  const macros = calculateMacros(formData.recipe_ingredients)

  return (
    <div className="space-y-8">
      {/* ...existing code... */}
      {/* Campo para URL de imagen de receta (solo admins) */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">URL de imagen (visible para usuarios)</label>
        <input
          type="url"
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="https://..."
          value={formData.image_url}
          onChange={handleImageUrlChange}
        />
        {formData.image_url && (
          <Image src={formData.image_url} alt="Preview" width={320} height={160} className="mt-2 max-h-40 rounded shadow w-auto" />
        )}
        <p className="text-xs text-gray-500">Pega aquí la URL de la imagen. Se mostrará a los usuarios en el dashboard.</p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle>📁 Importar/Exportar Recetas</CardTitle>
              <CardDescription>Gestiona tus recetas con archivos CSV o Excel</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('csv')}
                className="gap-1.5"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar </span>CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('excel')}
                className="gap-1.5"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar </span>Excel
              </Button>
              <Button
                size="sm"
                onClick={() => setImportDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 gap-1.5"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Importar </span>CSV/Excel
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Header con botón Nueva Receta */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl md:text-3xl font-bold tracking-tight">Gestión de Recetas</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Administra todas las recetas disponibles en el sistema
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700 self-start sm:self-auto flex-shrink-0">
          <Plus className="mr-2 h-4 w-4" /> Nueva Receta
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[220px]">
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
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {uniqueRecipeCategories.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las dificultades</SelectItem>
                {uniqueRecipeDifficulties.map((difficulty) => (
                  <SelectItem key={difficulty} value={difficulty}>{difficulty}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={recipeTypeFilter} onValueChange={setRecipeTypeFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Tipo de receta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="fat-to-fit">Solo FAT→FIT</SelectItem>
                <SelectItem value="general">Solo generales</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Libre de</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {FREE_FROM_DIET_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <Checkbox
                    checked={freeFromFilters.includes(option.value)}
                    onCheckedChange={(checked) => {
                      setFreeFromFilters((prev) => {
                        if (checked) {
                          return prev.includes(option.value) ? prev : [...prev, option.value]
                        }
                        return prev.filter((item) => item !== option.value)
                      })
                    }}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de recetas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Listado de Recetas</CardTitle>
              <CardDescription>Vista completa de todas las recetas creadas</CardDescription>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Checkbox
                checked={selectedRecipes.length === currentRecipes.length && currentRecipes.length > 0}
                onCheckedChange={(checked) => handleSelectAllRecipes(Boolean(checked))}
              />
              <span className="text-sm text-muted-foreground">
                {selectedRecipes.length > 0 ? `${selectedRecipes.length} seleccionadas` : 'Seleccionar todos'}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No hay recetas que coincidan con los filtros</div>
          ) : (
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
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
                        onClick={() => handleSort('calories')}
                      >
                        <div className="flex items-center gap-2">
                          Calorías
                          {sortColumn === 'calories' && (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th className="p-3 text-left font-medium">Estado</th>
                      <th className="p-3 text-left font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRecipes.map((recipe) => (
                      <tr
                        key={recipe.id}
                        className={`border-t hover:bg-muted/50 ${selectedRecipes.includes(recipe.id) ? 'bg-purple-50/50' : ''}`}
                      >
                        <td className="p-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedRecipes.includes(recipe.id)}
                              onCheckedChange={(checked) => handleSelectRecipe(recipe.id, Boolean(checked))}
                            />
                            <div className="h-12 w-12 rounded-md overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                              {resolveRecipeImageSrc(recipe.image_url, recipe.image) ? (
                                <img
                                  src={resolveRecipeImageSrc(recipe.image_url, recipe.image)}
                                  alt={recipe.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <ImageIcon className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="font-medium">{recipe.name}</div>
                                {isFatToFitRecipe(recipe) && (
                                  <Badge className="bg-pink-100 text-pink-800 border-0">FAT→FIT</Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {recipe.description
                                  ? (recipe.description.length > 60 ? `${recipe.description.substring(0, 60)}...` : recipe.description)
                                  : 'Sin descripción'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge className="bg-slate-100 text-slate-800 border-0">{recipe.category || 'Sin categoría'}</Badge>
                        </td>
                        <td className="p-3">
                          {recipe.difficulty === 'Fácil' && <Badge className="bg-green-100 text-green-800 border-0">Fácil</Badge>}
                          {recipe.difficulty === 'Medio' && <Badge className="bg-yellow-100 text-yellow-800 border-0">Medio</Badge>}
                          {recipe.difficulty === 'Difícil' && <Badge className="bg-red-100 text-red-800 border-0">Difícil</Badge>}
                          {!recipe.difficulty && <Badge className="bg-gray-100 text-gray-800 border-0">Sin definir</Badge>}
                          {recipe.difficulty && !['Fácil', 'Medio', 'Difícil'].includes(recipe.difficulty) && (
                            <Badge className="bg-blue-100 text-blue-800 border-0">{recipe.difficulty}</Badge>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Flame className="h-4 w-4 mr-1" />
                            {recipe.calories || 0} kcal
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge className="bg-green-100 text-green-800 border-0">Activo</Badge>
                        </td>
                        <td className="p-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenView(recipe)}>
                                <Eye className="mr-2 h-4 w-4" /> Ver
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenEdit(recipe)}>
                                <Edit2 className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCopyRecipe(recipe)} disabled={copyingRecipeId === recipe.id}>
                                {copyingRecipeId === recipe.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                Copiar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteRecipe(recipe)} className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredRecipes.length > 0 && (
                <div className="border-t p-3 md:p-4">
                  <div className="md:hidden space-y-3">
                    <div className="text-xs text-center text-muted-foreground">
                      Página {currentPage} de {totalPages} • {filteredRecipes.length} recetas
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

                  <div className="hidden md:flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Mostrando {startIndex + 1} - {Math.min(endIndex, sortedRecipes.length)} de {sortedRecipes.length} recetas
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
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (currentPage <= 3) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = currentPage - 2 + i
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
                          )
                        })}
                      </div>
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Importar */}
      {/* Dialog de importación mejorado */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>📥 Importar Recetas</DialogTitle>
            <DialogDescription>
              Sube un archivo CSV o Excel para importar o actualizar recetas. Las recetas existentes se actualizarán si el nombre coincide.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-semibold">Selecciona el archivo</Label>
              <Input
                type="file"
                accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={(e) => {
                  setImportFile(e.target.files?.[0] || null)
                  setImportResult(null)
                }}
                disabled={importing}
                className="mt-2"
              />
              {importFile && (
                <div className="text-sm text-green-600 mt-2">
                  ✓ Archivo seleccionado: <strong>{importFile.name}</strong> ({(importFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                <strong>💡 Tip:</strong> El formato esperado incluye campos como: nombre, descripción, categoría, dificultad, calorías, proteína, carbohidratos, grasa e ingredientes.
              </p>
            </div>

            {importResult && (
              <div className="border rounded-lg p-4 space-y-1 text-sm">
                <p className="font-semibold text-green-700">Resultado de la importación</p>
                <p>✅ Creadas: <strong>{importResult.created}</strong></p>
                <p>🔄 Actualizadas: <strong>{importResult.updated}</strong></p>
                <p>⏭️ Omitidas: <strong>{importResult.skipped}</strong></p>
                <p>⛔ Rechazadas: <strong>{importResult.rejected}</strong></p>

                {importResult.rejections.length > 0 && (
                  <div className="mt-2">
                    <p className="text-amber-700 font-medium">Motivos de rechazo ({importResult.rejections.length}):</p>
                    <ul className="list-disc list-inside text-amber-700 space-y-0.5 max-h-48 overflow-y-auto pr-2 border border-amber-200 rounded-md p-2 bg-amber-50/50 text-xs">
                      {importResult.rejections.map((reason, idx) => <li key={idx}>{reason}</li>)}
                    </ul>
                  </div>
                )}

                {importResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-red-600 font-medium">Errores ({importResult.errors.length}):</p>
                    <ul className="list-disc list-inside text-red-500 space-y-0.5 max-h-48 overflow-y-auto pr-2 border border-red-100 rounded-md p-2 bg-red-50/40 text-xs">
                      {importResult.errors.map((reason, idx) => <li key={idx}>{reason}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportFile(null); setImportResult(null) }} disabled={importing}>Cerrar</Button>
            <Button onClick={handleImport} disabled={!importFile || importing} className="bg-blue-600 hover:bg-blue-700">
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {importing ? 'Importando...' : 'Importar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Ver */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecipe?.name}</DialogTitle>
          </DialogHeader>
          {editingRecipe && (
            <div className="space-y-4">
              {/* Imagen */}
              {resolveRecipeImageSrc(editingRecipe.image_url, editingRecipe.image) && (
                <div className="rounded-lg overflow-hidden border border-gray-200 shadow-md">
                  <img
                    src={resolveRecipeImageSrc(editingRecipe.image_url, editingRecipe.image)}
                    alt={editingRecipe.name}
                    className="w-full h-48 object-cover"
                    onError={() => {
                      // Error loading image
                    }}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Categoría:</strong> {editingRecipe.category || '-'}
                </div>
                <div>
                  <strong>Dificultad:</strong> {editingRecipe.difficulty || '-'}
                </div>
                <div>
                  <strong>Calorías:</strong> {editingRecipe.calories || '-'}
                </div>
                <div>
                  <strong>Proteína:</strong> {editingRecipe.protein}g
                </div>
                <div>
                  <strong>Carbos:</strong> {editingRecipe.carbs}g
                </div>
                <div>
                  <strong>Grasa:</strong> {editingRecipe.fat}g
                </div>
              </div>
              {editingRecipe.description && (
                <div>
                  <strong>Descripción:</strong>
                  <p className="mt-2 text-sm text-muted-foreground">{editingRecipe.description}</p>
                </div>
              )}
              {editingRecipe.recipe_ingredients && editingRecipe.recipe_ingredients.length > 0 && (
                <div>
                  <strong>Ingredientes:</strong>
                  <div className="mt-2 space-y-2">
                    {editingRecipe.recipe_ingredients.map((ing, idx) => {
                      const ratio = (Number(ing.quantity) || 0) / 100
                      const kcal = ing.food ? Math.round((ing.food.calories || 0) * ratio) : 0
                      const protein = ing.food ? Math.round((ing.food.protein || 0) * ratio * 100) / 100 : 0
                      const carbs = ing.food ? Math.round((ing.food.carbs || 0) * ratio * 100) / 100 : 0
                      const fat = ing.food ? Math.round((ing.food.fat || 0) * ratio * 100) / 100 : 0

                      return (
                        <div key={idx} className="rounded-md border border-gray-200 p-2 bg-gray-50/70">
                          <p className="text-sm font-medium">
                            {ing.quantity}{ing.unit} de {ing.food ? ing.food.name : 'Desconocido'}
                            {ing.notes && ` (${ing.notes})`}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {kcal} kcal • P: {protein.toFixed(2)} g • C: {carbs.toFixed(2)} g • G: {fat.toFixed(2)} g
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {editingRecipe.instructions && (
                <div>
                  <strong>Instrucciones:</strong>
                  <p className="mt-2 text-sm text-muted-foreground">{editingRecipe.instructions}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewDialogOpen(false)}>Cerrar</Button>
            {editingRecipe && (
              <Button
                onClick={() => {
                  setViewDialogOpen(false)
                  handleOpenEdit(editingRecipe)
                }}
                className="bg-blue-600"
              >
                <Edit2 className="mr-2 h-4 w-4" /> Editar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Crear/Editar - INTERFAZ MEJORADA */}
      <Dialog open={createDialogOpen || editDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setCreateDialogOpen(false)
          setEditDialogOpen(false)
        }
      }}>
        <DialogContent className="w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-2xl">{editingRecipe ? '✏️ Editar Receta' : '🍳 Nueva Receta'}</DialogTitle>
            <DialogDescription>Crea o edita tu receta de forma sencilla</DialogDescription>
          </DialogHeader>

          {/* TABS para PC / Acordeones para Móvil */}
          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue="basicos" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="basicos" className="text-xs sm:text-sm">📝 Básicos</TabsTrigger>
                <TabsTrigger value="ingredientes" className="text-xs sm:text-sm">🥘 Ingredientes</TabsTrigger>
                <TabsTrigger value="instrucciones" className="text-xs sm:text-sm">📖 Pasos</TabsTrigger>
                <TabsTrigger value="preview" className="text-xs sm:text-sm">👁️ Vista Previa</TabsTrigger>
              </TabsList>

              {/* TAB 1: Datos Básicos */}
              <TabsContent value="basicos" className="space-y-4 px-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold text-sm">Nombre *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej: Pechuga de pollo al ajillo"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="font-semibold text-sm">Categoría</Label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 font-sans"
                    >
                      <option value="">Selecciona...</option>
                      {[
                        { val: 'Desayuno', label: 'Desayuno' },
                        { val: 'Almuerzo', label: 'Almuerzo' },
                        { val: 'Cena', label: 'Cena' },
                        { val: 'Snack', label: 'Snack' },
                        { val: 'Postre', label: 'Postre' },
                        { val: 'Bebida', label: 'Bebida' }
                      ].map((cat) => (
                        <option key={cat.val} value={cat.val}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="font-semibold text-sm">Dificultad</Label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 font-sans"
                    >
                      <option value="">Selecciona...</option>
                      {[
                        { val: 'Fácil', label: 'Fácil' },
                        { val: 'Medio', label: 'Medio' },
                        { val: 'Difícil', label: 'Difícil' }
                      ].map((dif) => (
                        <option key={dif.val} value={dif.val}>{dif.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Info rápida mejorada */}
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">⏱️ Tiempo preparación (min)</Label>
                    <Input
                      type="number"
                      placeholder="Ej: 20"
                      min="0"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="font-semibold text-sm">Descripción</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ej: Una deliciosa pechuga a base de ajillo fresco y limón."
                    className="mt-1 min-h-24"
                  />
                </div>

                <div className="rounded-lg border border-dashed border-orange-200 bg-orange-50/60 p-4 space-y-3">
                  <div>
                    <Label className="font-semibold text-sm">Checks libres de alérgenos</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Marca las etiquetas que aplican. Si un ingrediente entra en conflicto, el check se quitará al guardar.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {FREE_FROM_DIET_OPTIONS.map((option) => {
                      const isChecked = resolveRecipeDietTypes(formData.diet_types, formData.recipe_ingredients).includes(option.value)
                      return (
                        <label key={option.value} className="flex items-center gap-2 rounded-md bg-white border px-3 py-2 text-sm shadow-sm">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              setFormData((prev) => {
                                const nextDietTypes = new Set(prev.diet_types.map((item) => normalizeFilterText(item).replace(/\s+/g, '-')))
                                if (checked) {
                                  nextDietTypes.add(option.value)
                                } else {
                                  nextDietTypes.delete(option.value)
                                }

                                return {
                                  ...prev,
                                  diet_types: Array.from(nextDietTypes),
                                }
                              })
                            }}
                          />
                          <span>{option.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* Sección de Imagen URL */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ImageIcon className="h-5 w-5 text-orange-600" />
                    <Label className="font-semibold text-sm">🖼️ Imagen de la Receta</Label>
                  </div>

                  {/* Preview de imagen */}
                  {(formData.image_url || imageUrlInput) && (
                    <div className="mb-4 rounded-lg overflow-hidden border border-orange-200 bg-orange-50 p-2">
                      <img
                        src={formData.image_url || imageUrlInput}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded"
                        onError={() => {
                          // Imagen no se puede cargar
                        }}
                      />
                    </div>
                  )}

                  <div className="space-y-2 mb-4">
                    <Label className="font-semibold text-sm">Subir archivo (JPG, PNG, WEBP)</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => setSelectedImageFile(e.target.files?.[0] || null)}
                        disabled={imageUploading || !editingRecipe}
                        className="text-sm"
                      />
                      <Button
                        onClick={handleUploadImageFile}
                        disabled={imageUploading || !selectedImageFile || !editingRecipe}
                        className="bg-orange-600 hover:bg-orange-700 whitespace-nowrap"
                        size="sm"
                      >
                        {imageUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Subiendo...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-1" />
                            Subir archivo
                          </>
                        )}
                      </Button>
                    </div>
                    {!editingRecipe && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                        Guarda la receta primero para habilitar la subida de archivo.
                      </p>
                    )}
                  </div>

                  {/* Input para URL */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          value={imageUrlInput}
                          onChange={(e) => {
                            setImageUrlInput(e.target.value)
                            setImageUrlError('')
                          }}
                          placeholder="https://drive.google.com/uc?id=...&export=download"
                          className={`text-sm ${imageUrlError ? 'border-red-500' : ''}`}
                        />
                      </div>
                      <Button
                        onClick={handleUpdateImageUrl}
                        disabled={imageUrlValidating || !imageUrlInput.trim()}
                        className="bg-orange-600 hover:bg-orange-700 whitespace-nowrap"
                        size="sm"
                      >
                        {imageUrlValidating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Validando...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-1" />
                            Guardar
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Mensajes de error/éxito */}
                    {imageUrlError && (
                      <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700 flex items-start gap-2">
                        <span className="mt-0.5">❌</span>
                        <span>{imageUrlError}</span>
                      </div>
                    )}

                    {imageUrlSuccess && (
                      <div className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-700 flex items-start gap-2">
                        <span className="mt-0.5">✅</span>
                        <span>Imagen actualizada correctamente</span>
                      </div>
                    )}

                    {/* Info sobre fuentes permitidas */}
                    <div className="bg-blue-50 border border-blue-200 rounded p-2">
                      <p className="text-xs text-blue-700">
                        <strong>💡 Fuentes permitidas:</strong> Google Drive, Imgur, CloudFlare Images o cualquier URL pública de imagen (JPEG, PNG, WebP, GIF)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cards rápidas de info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t">
                  {[
                    { icon: '🔥', label: 'Calorías', value: macros.calories },
                    { icon: '💪', label: 'Proteína', value: `${macros.protein.toFixed(1)}g` },
                    { icon: '🍞', label: 'Carbos', value: `${macros.carbs.toFixed(1)}g` },
                    { icon: '🧈', label: 'Grasa', value: `${macros.fat.toFixed(1)}g` },
                  ].map((macro, idx) => (
                    <div key={idx} className="bg-gradient-to-br from-orange-50 to-yellow-50 p-3 rounded-lg text-center border border-orange-200">
                      <div className="text-2xl">{macro.icon}</div>
                      <p className="text-xs text-gray-600 mt-1">{macro.label}</p>
                      <p className="font-semibold text-sm mt-1">{macro.value}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* TAB 2: Ingredientes con búsqueda mejorada */}
              <TabsContent value="ingredientes" className="space-y-4 px-1">
                <div className="space-y-3">
                  <div className="rounded-lg border border-orange-200 bg-orange-50/70 p-3">
                    <p className="text-xs text-orange-900">
                      <strong>Como se calculan las calorias:</strong> para cada ingrediente se usa la formula
                      {' '}<span className="font-mono">kcal = (cantidad / 100) x kcal_por_100g</span>. La receta suma todos los ingredientes y luego divide por porciones.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <div className="rounded-lg border bg-white p-3">
                      <p className="text-xs text-gray-500">Ingredientes</p>
                      <p className="text-lg font-semibold">{formData.recipe_ingredients.length}</p>
                    </div>
                    <div className="rounded-lg border bg-white p-3">
                      <p className="text-xs text-gray-500">Calorias totales</p>
                      <p className="text-lg font-semibold">{macros.calories} kcal</p>
                    </div>
                    <div className="rounded-lg border bg-white p-3">
                      <p className="text-xs text-gray-500">Proteina</p>
                      <p className="text-lg font-semibold">{macros.protein.toFixed(1)} g</p>
                    </div>
                    <div className="rounded-lg border bg-white p-3">
                      <p className="text-xs text-gray-500">Carbos</p>
                      <p className="text-lg font-semibold">{macros.carbs.toFixed(1)} g</p>
                    </div>
                    <div className="rounded-lg border bg-white p-3">
                      <p className="text-xs text-gray-500">Grasa</p>
                      <p className="text-lg font-semibold">{macros.fat.toFixed(1)} g</p>
                    </div>
                  </div>

                  {/* INPUT CON AUTOCOMPLETE */}
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">🔍 Buscar y agregar ingrediente</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        value={ingredientInputValue}
                        onChange={(e) => handleIngredientInputChange(e.target.value)}
                        onFocus={() => ingredientInputValue && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        placeholder="Escribe nombre del alimento..."
                        className="pl-10"
                      />

                      {/* DROPDOWN CON SUGERENCIAS */}
                      {showSuggestions && getAutocompleteSuggestions().length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-lg z-50">
                          {getAutocompleteSuggestions().map((food) => (
                            <button
                              key={food.id}
                              onClick={() => {
                                handleAddIngredient(food)
                              }}
                              className="w-full text-left flex items-center gap-3 p-3 hover:bg-orange-50 border-b last:border-b-0 transition"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{food.name}</p>
                                {food.brand && <p className="text-xs text-gray-500">{food.brand}</p>}
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {food.calories} cal/100g • P:{food.protein}g • C:{food.carbs}g • F:{food.fat}g
                                </p>
                              </div>
                              <Plus className="h-4 w-4 text-orange-600 flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}

                      {showSuggestions && ingredientInputValue && getAutocompleteSuggestions().length === 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3 z-50 text-center text-sm text-gray-500">
                          Sin resultados
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ingredientes seleccionados */}
                {formData.recipe_ingredients.length > 0 && (
                  <div className="space-y-2 pt-4 border-t">
                    <h4 className="font-semibold text-sm">📦 Ingredientes seleccionados ({formData.recipe_ingredients.length})</h4>
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {formData.recipe_ingredients.map((ing, idx) => {
                        const isValid = isIngredientValid(ing)
                        const ingredientMacros = getIngredientComputedMacros(ing)
                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border group hover:shadow-md transition ${isValid
                              ? 'bg-orange-50 border-orange-200'
                              : 'bg-red-100 border-red-400'
                              }`}
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium truncate">{ing.food?.name || 'Ingrediente desconocido'}</p>
                                    {!isValid && (
                                      <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded text-nowrap">⚠️ No existe</span>
                                    )}
                                  </div>
                                  <p className={`text-xs mt-0.5 ${isValid ? 'text-gray-600' : 'text-red-700'}`}>
                                    {ing.food?.calories || '?'} cal/100g
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveIngredient(idx)}
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                <div>
                                  <Label className="text-xs text-gray-600">Cantidad</Label>
                                  <Input
                                    type="number"
                                    value={ing.quantity}
                                    min={0}
                                    step={1}
                                    onChange={(e) => handleUpdateIngredientQuantity(idx, parseFloat(e.target.value) || 0)}
                                    className={`h-8 text-xs ${!isValid ? 'border-red-400' : ''}`}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-600">Unidad</Label>
                                  <select
                                    value={ing.unit || 'g'}
                                    onChange={(e) => handleUpdateIngredientUnit(idx, e.target.value)}
                                    className="w-full h-8 px-2 border border-gray-300 rounded-md text-xs"
                                  >
                                    <option value="g">g</option>
                                    <option value="ml">ml</option>
                                    <option value="ud">ud</option>
                                    <option value="cda">cda</option>
                                    <option value="cdta">cdta</option>
                                  </select>
                                </div>
                                <div className="md:col-span-2">
                                  <Label className="text-xs text-gray-600">Notas</Label>
                                  <Input
                                    value={ing.notes || ''}
                                    onChange={(e) => handleUpdateIngredientNotes(idx, e.target.value)}
                                    placeholder="Ej: picado, cocido, sin sal"
                                    className="h-8 text-xs"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                <div className="rounded bg-white border p-2">
                                  <p className="text-gray-500">Calorias</p>
                                  <p className="font-semibold">{ingredientMacros.calories || 0} kcal</p>
                                </div>
                                <div className="rounded bg-white border p-2">
                                  <p className="text-gray-500">Proteina</p>
                                  <p className="font-semibold">{Number(ingredientMacros.protein || 0).toFixed(2)} g</p>
                                </div>
                                <div className="rounded bg-white border p-2">
                                  <p className="text-gray-500">Carbos</p>
                                  <p className="font-semibold">{Number(ingredientMacros.carbs || 0).toFixed(2)} g</p>
                                </div>
                                <div className="rounded bg-white border p-2">
                                  <p className="text-gray-500">Grasa</p>
                                  <p className="font-semibold">{Number(ingredientMacros.fat || 0).toFixed(2)} g</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* TAB 3: Instrucciones paso a paso */}
              <TabsContent value="instrucciones" className="space-y-4 px-1">
                <div>
                  <Label className="font-semibold text-sm">📖 Modo de preparación</Label>
                  <Textarea
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    placeholder="Describe los pasos:
1. Precalienta el horno...
2. Mezcla los ingredientes...
3. Hornea a..."
                    className="mt-2 min-h-40 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">💡 Tip: Usa números o viñetas para cada paso</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700">
                    <strong>Consejo:</strong> Las instrucciones claras y bien organizadas ayudan a otros a preparar mejor tu receta
                  </p>
                </div>
              </TabsContent>

              {/* TAB 4: Vista Previa */}
              <TabsContent value="preview" className="space-y-4 px-1">
                <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
                  <CardHeader>
                    <CardTitle className="text-xl">{formData.name || 'Tu Receta'}</CardTitle>
                    <CardDescription>{formData.description || 'Sin descripción'}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Imagen vista previa */}
                    {(formData.image_url || imageUrlInput) && (
                      <div className="rounded-lg overflow-hidden border border-orange-300 shadow-md">
                        <img
                          src={formData.image_url || imageUrlInput}
                          alt={formData.name || 'Receta'}
                          className="w-full h-48 object-cover"
                          onError={() => {
                            // Error loading image
                          }}
                        />
                      </div>
                    )}

                    {/* Datos rápidos */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { icon: '🔥', label: 'Calorías', value: macros.calories },
                        { icon: '💪', label: 'Proteína', value: `${macros.protein.toFixed(1)}g` },
                        { icon: '🍞', label: 'Carbos', value: `${macros.carbs.toFixed(1)}g` },
                        { icon: '🧈', label: 'Grasa', value: `${macros.fat.toFixed(1)}g` },
                      ].map((macro, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-lg text-center shadow-sm border border-orange-200">
                          <div className="text-2xl">{macro.icon}</div>
                          <p className="text-xs text-gray-600 mt-1">{macro.label}</p>
                          <p className="font-bold text-lg mt-1">{macro.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Ingredientes resumido */}
                    {formData.recipe_ingredients.length > 0 && (
                      <div className="border-t pt-4">
                        <h4 className="font-semibold text-sm mb-2">Ingredientes ({formData.recipe_ingredients.length})</h4>
                        <ul className="space-y-1 text-sm">
                          {formData.recipe_ingredients.map((ing, idx) => (
                            <li key={idx} className="flex justify-between">
                              <span>{ing.food?.name}</span>
                              <span className="text-gray-600">{ing.quantity}{ing.unit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Instrucciones resumidas */}
                    {formData.instructions && (
                      <div className="border-t pt-4">
                        <h4 className="font-semibold text-sm mb-2">Instrucciones</h4>
                        <p className="text-sm whitespace-pre-wrap text-gray-700">{formData.instructions}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer con botones */}
          <DialogFooter className="flex-shrink-0 pt-4 border-t mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false)
                setEditDialogOpen(false)
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveRecipe} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingRecipe ? '💾 Actualizar' : '✨ Crear Receta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
