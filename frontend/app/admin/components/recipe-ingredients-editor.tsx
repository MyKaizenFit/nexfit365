"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Trash2, Search, Calculator, X, GripVertical, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useAuth } from "@/contexts/auth-context"

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
}

interface RecipeIngredient {
  id: string
  food: string
  food_detail: Food
  quantity: number
  unit: string
  notes: string
  order: number
  calculated_macros: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
    sugar: number
    sodium: number
  }
}

interface Recipe {
  id: string
  name: string
  servings: number
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface RecipeIngredientsEditorProps {
  recipe: Recipe
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export function RecipeIngredientsEditor({ recipe, isOpen, onClose, onUpdate }: RecipeIngredientsEditorProps) {
  const { getAuthHeaders } = useAuth()
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([])
  const [foods, setFoods] = useState<Food[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Food[]>([])
  const [searching, setSearching] = useState(false)
  
  // Calcular totales
  const totals = ingredients.reduce((acc, ing) => {
    if (ing.calculated_macros) {
      acc.calories += ing.calculated_macros.calories
      acc.protein += ing.calculated_macros.protein
      acc.carbs += ing.calculated_macros.carbs
      acc.fat += ing.calculated_macros.fat
    }
    return acc
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 })
  
  // Calcular por porción
  const perServing = {
    calories: Math.round(totals.calories / (recipe.servings || 1)),
    protein: Math.round(totals.protein / (recipe.servings || 1) * 10) / 10,
    carbs: Math.round(totals.carbs / (recipe.servings || 1) * 10) / 10,
    fat: Math.round(totals.fat / (recipe.servings || 1) * 10) / 10,
  }

  // Cargar ingredientes
  const loadIngredients = useCallback(async () => {
    if (!recipe?.id) return
    
    setLoading(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(
        `${getApiUrl()}/api/nutrition/recipes/${recipe.id}/ingredients/`,
        { headers }
      )
      
      if (response.ok) {
        const data = await response.json()
        setIngredients(data)
      }
    } catch (error) {
      console.error('Error loading ingredients:', error)
    } finally {
      setLoading(false)
    }
  }, [recipe?.id, getAuthHeaders])

  // Buscar alimentos
  const searchFoods = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    
    setSearching(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(
        `${getApiUrl()}/api/nutrition/foods/?search=${encodeURIComponent(query)}&page_size=20`,
        { headers }
      )
      
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.results || data)
      }
    } catch (error) {
      console.error('Error searching foods:', error)
    } finally {
      setSearching(false)
    }
  }, [getAuthHeaders])

  // Añadir ingrediente
  const addIngredient = async (food: Food) => {
    setSaving(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(
        `${getApiUrl()}/api/nutrition/recipes/${recipe.id}/ingredients/`,
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            food_id: food.id,
            quantity: 100,
            unit: 'g',
            order: ingredients.length
          })
        }
      )
      
      if (response.ok) {
        toast({ title: "Ingrediente añadido", description: `${food.name} añadido a la receta` })
        loadIngredients()
        setSearchOpen(false)
        setSearchQuery("")
      } else {
        const error = await response.json()
        toast({ title: "Error", description: error.error || "No se pudo añadir el ingrediente", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // Actualizar cantidad de ingrediente
  const updateIngredientQuantity = async (ingredientId: string, quantity: number) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(
        `${getApiUrl()}/api/nutrition/recipes/${recipe.id}/ingredients/${ingredientId}/`,
        {
          method: 'PUT',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ quantity })
        }
      )
      
      if (response.ok) {
        loadIngredients()
      }
    } catch (error) {
      console.error('Error updating ingredient:', error)
    }
  }

  // Eliminar ingrediente
  const deleteIngredient = async (ingredientId: string) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(
        `${getApiUrl()}/api/nutrition/recipes/${recipe.id}/ingredients/${ingredientId}/`,
        {
          method: 'DELETE',
          headers
        }
      )
      
      if (response.ok) {
        toast({ title: "Ingrediente eliminado" })
        loadIngredients()
      }
    } catch (error) {
      console.error('Error deleting ingredient:', error)
    }
  }

  // Recalcular macros de la receta
  const recalculateMacros = async () => {
    setSaving(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(
        `${getApiUrl()}/api/nutrition/recipes/${recipe.id}/recalculate_macros/`,
        {
          method: 'POST',
          headers
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        toast({ 
          title: "Macros actualizados", 
          description: `Calorías: ${data.calories}, P: ${data.protein}g, C: ${data.carbs}g, G: ${data.fat}g` 
        })
        onUpdate()
      } else {
        const error = await response.json()
        toast({ title: "Error", description: error.message, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (isOpen && recipe?.id) {
      loadIngredients()
    }
  }, [isOpen, recipe?.id, loadIngredients])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchFoods(searchQuery)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchFoods])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🥗 Ingredientes de "{recipe?.name}"
          </DialogTitle>
          <DialogDescription>
            Añade alimentos de la base de datos para calcular macros automáticamente.
            Porciones: {recipe?.servings || 1}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumen de macros */}
          <Card className="bg-gradient-to-r from-orange-50 to-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Resumen Nutricional</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{totals.calories}</div>
                  <div className="text-xs text-muted-foreground">kcal total</div>
                  <div className="text-sm text-orange-500">{perServing.calories} /porción</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{totals.protein.toFixed(1)}g</div>
                  <div className="text-xs text-muted-foreground">Proteína total</div>
                  <div className="text-sm text-red-500">{perServing.protein}g /porción</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{totals.carbs.toFixed(1)}g</div>
                  <div className="text-xs text-muted-foreground">Carbos total</div>
                  <div className="text-sm text-amber-500">{perServing.carbs}g /porción</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{totals.fat.toFixed(1)}g</div>
                  <div className="text-xs text-muted-foreground">Grasa total</div>
                  <div className="text-sm text-blue-500">{perServing.fat}g /porción</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Buscar y añadir alimento */}
          <div className="flex gap-2">
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex-1 justify-start">
                  <Search className="mr-2 h-4 w-4" />
                  Buscar alimento para añadir...
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Buscar alimento..." 
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandList>
                    {searching && (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    )}
                    <CommandEmpty>No se encontraron alimentos</CommandEmpty>
                    <CommandGroup heading="Resultados">
                      {searchResults.map((food) => (
                        <CommandItem
                          key={food.id}
                          value={food.name}
                          onSelect={() => addIngredient(food)}
                          className="cursor-pointer"
                        >
                          <div className="flex flex-col flex-1">
                            <div className="font-medium">{food.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {food.brand && `${food.brand} • `}
                              {food.calories} kcal | P: {food.protein}g | C: {food.carbs}g | G: {food.fat}g
                            </div>
                          </div>
                          <Plus className="h-4 w-4 text-green-600" />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Lista de ingredientes */}
          <div className="space-y-2">
            <Label>Ingredientes ({ingredients.length})</Label>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : ingredients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <p>No hay ingredientes</p>
                <p className="text-sm">Busca y añade alimentos para calcular los macros automáticamente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ingredients.map((ingredient, index) => (
                  <Card key={ingredient.id} className="p-3">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      
                      <div className="flex-1">
                        <div className="font-medium">{ingredient.food_detail?.name}</div>
                        {ingredient.food_detail?.brand && (
                          <div className="text-xs text-muted-foreground">{ingredient.food_detail.brand}</div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={ingredient.quantity}
                          onChange={(e) => {
                            const newQuantity = parseFloat(e.target.value) || 0
                            // Actualizar localmente primero
                            setIngredients(prev => prev.map(ing => 
                              ing.id === ingredient.id 
                                ? { ...ing, quantity: newQuantity }
                                : ing
                            ))
                          }}
                          onBlur={(e) => {
                            const newQuantity = parseFloat(e.target.value) || 0
                            if (newQuantity !== ingredient.quantity) {
                              updateIngredientQuantity(ingredient.id, newQuantity)
                            }
                          }}
                          className="w-20 text-center"
                          min={0}
                        />
                        <span className="text-sm text-muted-foreground">{ingredient.unit}</span>
                      </div>
                      
                      <div className="text-right min-w-[120px]">
                        <div className="text-sm font-medium">
                          {ingredient.calculated_macros?.calories || 0} kcal
                        </div>
                        <div className="text-xs text-muted-foreground">
                          P: {ingredient.calculated_macros?.protein?.toFixed(1) || 0}g | 
                          C: {ingredient.calculated_macros?.carbs?.toFixed(1) || 0}g | 
                          G: {ingredient.calculated_macros?.fat?.toFixed(1) || 0}g
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteIngredient(ingredient.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button 
            onClick={recalculateMacros}
            disabled={saving || ingredients.length === 0}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Calculator className="mr-2 h-4 w-4" />
            )}
            Guardar macros en receta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
