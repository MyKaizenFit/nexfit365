"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Trash2, Save, ChefHat, Clock, Zap, Loader2, RefreshCw, Percent, BookOpen, Eye, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { buildApiUrl, getAuthHeaders } from "@/lib/api"
import { fixEncoding } from "@/lib/encoding-fix"
import { useAdminNutritionPlans } from "@/hooks/use-admin-nutrition-plans"

interface MealFood {
  food_id: string
  quantity: number
  food_name?: string
}

interface SuggestedRecipe {
  id: string
  name: string
  category?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  prep_time_minutes?: number
  difficulty?: string
  image_url?: string
}

interface Meal {
  id?: string
  name: string
  time: string
  calories: number
  protein: number
  carbs: number
  fat: number
  description: string
  order_index?: number
  meal_foods?: MealFood[]
  suggested_recipes?: SuggestedRecipe[]
}

interface NutritionPlan {
  id?: string
  name: string
  description: string
  daily_calories: number
  target_macros: {
    protein_percentage?: number
    carbs_percentage?: number
    fat_percentage?: number
    protein?: number
    carbs?: number
    fat?: number
  }
  meals: Meal[]
  is_active?: boolean
  start_date?: string
  end_date?: string
}

type MacroPercents = { protein: number; carbs: number; fat: number }

const DEFAULT_PERCENTS: MacroPercents = { protein: 30, carbs: 40, fat: 30 }

const toNumber = (value: unknown, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

const computePercentsFromGrams = (grams: { protein?: number; carbs?: number; fat?: number }, calories: number): MacroPercents => {
  const kcal = Math.max(calories || 0, 1)
  const proteinPct = Math.round(((toNumber(grams.protein) * 4) / kcal) * 1000) / 10
  const carbsPct = Math.round(((toNumber(grams.carbs) * 4) / kcal) * 1000) / 10
  const fatPct = Math.round(((toNumber(grams.fat) * 9) / kcal) * 1000) / 10

  // Si todo es 0, usar default
  if (!proteinPct && !carbsPct && !fatPct) {
    return DEFAULT_PERCENTS
  }

  return {
    protein: proteinPct,
    carbs: carbsPct,
    fat: fatPct,
  }
}

const computeGramsFromPercents = (percents: MacroPercents, calories: number) => {
  const kcal = Math.max(calories || 0, 1)
  return {
    protein: Math.round((kcal * (percents.protein / 100)) / 4),
    carbs: Math.round((kcal * (percents.carbs / 100)) / 4),
    fat: Math.round((kcal * (percents.fat / 100)) / 9),
  }
}

export function NutritionPlanEditor({ userId, onSave }: { userId: string; onSave: () => void }) {
  const [plan, setPlan] = useState<NutritionPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [macroPercents, setMacroPercents] = useState<MacroPercents>(DEFAULT_PERCENTS)
  const [availablePlans, setAvailablePlans] = useState<Array<{ id: string; name: string }>>([])
  const [selectedPlan, setSelectedPlan] = useState<string>("")
  const [assigning, setAssigning] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null)
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [loadingRecipe, setLoadingRecipe] = useState(false)
  const [availableRecipes, setAvailableRecipes] = useState<SuggestedRecipe[]>([])
  const [loadingRecipes, setLoadingRecipes] = useState(false)
  const [selectedMealForRecipe, setSelectedMealForRecipe] = useState<number | null>(null)
  const [showRecipeSelector, setShowRecipeSelector] = useState(false)
  
  const { fetchRecipes } = useAdminNutritionPlans()

  // Cargar plan y planes precreados
  useEffect(() => {
    loadUserPlan()
    loadDefaultPlans()
    loadAvailableRecipes()
  }, [userId])

  const loadAvailableRecipes = async () => {
    try {
      setLoadingRecipes(true)
      const recipes = await fetchRecipes()
      setAvailableRecipes(recipes.map((r: any) => ({
        id: String(r.id),
        name: fixEncoding(r.name || ""),
        category: r.category,
        calories: toNumber(r.calories),
        protein: toNumber(r.protein),
        carbs: toNumber(r.carbs),
        fat: toNumber(r.fat),
        prep_time_minutes: toNumber(r.prep_time_minutes),
        difficulty: r.difficulty,
        image_url: r.image_url,
      })))
    } catch (err) {
      console.error("Error cargando recetas:", err)
      toast({
        title: "Error",
        description: "No se pudieron cargar las recetas disponibles",
        variant: "destructive",
      })
    } finally {
      setLoadingRecipes(false)
    }
  }

  const loadDefaultPlans = async () => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl("admin/nutrition/default-plans/"), { headers })
      if (!response.ok) return
      const data = await response.json()
      const plans = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
      setAvailablePlans(plans.filter((p: any) => p?.is_active).map((p: any) => ({ id: String(p.id), name: fixEncoding(p.name || "Plan") })))
    } catch (err) {
      console.warn("No se pudieron cargar planes por defecto", err)
    }
  }

  const pickBestPlan = (plans: any[]) => {
    if (!Array.isArray(plans) || plans.length === 0) return null
    const active = plans.find((p: any) => p?.is_active)
    if (active) return active
    const sorted = [...plans].sort((a: any, b: any) => {
      const aDate = new Date(a?.start_date || a?.created_at || 0).getTime()
      const bDate = new Date(b?.start_date || b?.created_at || 0).getTime()
      return bDate - aDate
    })
    return sorted[0]
  }

  const loadUserPlan = async () => {
    try {
      setLoading(true)
      setError(null)

      const headers = await getAuthHeaders()
      
      // Intentar usar endpoint de admin primero
      console.log("🍽️ [NutritionPlanEditor] Cargando plan para usuario:", userId)
      let response = await fetch(buildApiUrl(`admin/nutrition/users/${userId}/plan/`), { headers })
      
      if (response.ok) {
        const adminData = await response.json()
        console.log("🍽️ [NutritionPlanEditor] Respuesta admin:", adminData)
        const planData = adminData.plan
        
        if (planData) {
          console.log("🍽️ [NutritionPlanEditor] Plan encontrado, obteniendo detalle:", planData.id)
          // Obtener detalle completo del plan usando el ViewSet de admin
          const detailResponse = await fetch(buildApiUrl(`admin/nutrition/plans/${planData.id}/`), { headers })
          if (!detailResponse.ok) {
            console.error("🍽️ [NutritionPlanEditor] Error obteniendo detalle:", detailResponse.status)
            throw new Error("Error al cargar detalle del plan")
          }
          const detail = await detailResponse.json()
          console.log("🍽️ [NutritionPlanEditor] Detalle cargado:", detail)
          
          // Continuar con el procesamiento del detalle
          processPlanDetail(detail)
          return
        } else {
          console.log("🍽️ [NutritionPlanEditor] No hay plan activo, usando fallback")
        }
      } else {
        console.warn("🍽️ [NutritionPlanEditor] Endpoint admin falló:", response.status, "usando fallback")
      }
      
      // Fallback: usar endpoint público
      response = await fetch(buildApiUrl(`nutrition/plans/?user=${userId}`), { headers })
      if (!response.ok) throw new Error("Error al cargar el plan del usuario")

      const data = await response.json()
      const plans = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
      const userPlan = pickBestPlan(plans)

      if (userPlan) {
        const detailResponse = await fetch(buildApiUrl(`nutrition/plans/${userPlan.id}/`), { headers })
        if (!detailResponse.ok) throw new Error("Error al cargar detalle del plan")
        const detail = await detailResponse.json()
        
        processPlanDetail(detail)
      } else {
        // No hay plan, crear uno nuevo
        setMacroPercents(DEFAULT_PERCENTS)
        const grams = computeGramsFromPercents(DEFAULT_PERCENTS, 2000)
        setPlan({
          name: "Nuevo Plan Nutricional",
          description: "Plan nutricional personalizado",
          daily_calories: 2000,
          target_macros: {
            ...grams,
            protein_percentage: DEFAULT_PERCENTS.protein,
            carbs_percentage: DEFAULT_PERCENTS.carbs,
            fat_percentage: DEFAULT_PERCENTS.fat,
          },
          meals: [],
        })
      }
    } catch (err) {
      console.error("Error cargando plan:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
      toast({
        title: "Error",
        description: "No se pudo cargar el plan del usuario",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const processPlanDetail = (detail: any) => {
    const meals = (Array.isArray(detail.meals) ? detail.meals : []).map((meal: any, index: number) => ({
      id: meal.id,
      name: fixEncoding(meal.name || `Comida ${index + 1}`),
      time: meal.time || "12:00",
      calories: toNumber(meal.calories),
      protein: toNumber(meal.protein),
      carbs: toNumber(meal.carbs),
      fat: toNumber(meal.fat),
      description: fixEncoding(meal.description || ""),
      order_index: meal.order_index || index + 1,
      meal_foods: Array.isArray(meal.meal_foods)
        ? meal.meal_foods.map((f: any) => ({
            food_id: String(f.food_id || ""),
            quantity: toNumber(f.quantity, 0),
            food_name: fixEncoding(f.food_name || ""),
          }))
        : [],
      suggested_recipes: Array.isArray(meal.suggested_recipes)
        ? meal.suggested_recipes.map((r: any) => ({
            id: String(r.id),
            name: fixEncoding(r.name || ""),
            category: r.category,
            calories: toNumber(r.calories),
            protein: toNumber(r.protein),
            carbs: toNumber(r.carbs),
            fat: toNumber(r.fat),
            prep_time_minutes: toNumber(r.prep_time_minutes),
            difficulty: r.difficulty,
            image_url: r.image_url,
          }))
        : [],
    }))

    const grams = {
      protein: toNumber(detail.target_macros?.protein || detail.protein_grams),
      carbs: toNumber(detail.target_macros?.carbs || detail.carbs_grams),
      fat: toNumber(detail.target_macros?.fat || detail.fat_grams),
    }

    const percentsFromApi = {
      protein: toNumber(detail.target_macros?.protein_percentage),
      carbs: toNumber(detail.target_macros?.carbs_percentage),
      fat: toNumber(detail.target_macros?.fat_percentage),
    }

    const percents =
      percentsFromApi.protein || percentsFromApi.carbs || percentsFromApi.fat
        ? percentsFromApi
        : computePercentsFromGrams(grams, toNumber(detail.daily_calories, 2000))

    setMacroPercents({
      protein: percents.protein || DEFAULT_PERCENTS.protein,
      carbs: percents.carbs || DEFAULT_PERCENTS.carbs,
      fat: percents.fat || DEFAULT_PERCENTS.fat,
    })

    setPlan({
      id: detail.id,
      name: fixEncoding(detail.name || "Plan Nutricional"),
      description: fixEncoding(detail.description || ""),
      daily_calories: toNumber(detail.daily_calories, 2000),
      target_macros: {
        protein: grams.protein,
        carbs: grams.carbs,
        fat: grams.fat,
        protein_percentage: percents.protein,
        carbs_percentage: percents.carbs,
        fat_percentage: percents.fat,
      },
      meals,
      is_active: detail.is_active,
      start_date: detail.start_date,
      end_date: detail.end_date,
    })
  }

  const mealsArray = useMemo(() => (Array.isArray(plan?.meals) ? plan!.meals : []), [plan])

  const updatePlanState = (partial: Partial<NutritionPlan>) => {
    setPlan((prev) => (prev ? { ...prev, ...partial } : prev))
  }

  const addMeal = () => {
    if (!plan) return
    const newMeal: Meal = {
      name: "Nueva Comida",
      time: "12:00",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      description: "",
      order_index: mealsArray.length + 1,
      meal_foods: [],
    }
    updatePlanState({ meals: [...mealsArray, newMeal] })
  }

  const updateMeal = (mealIndex: number, updates: Partial<Meal>) => {
    if (!plan) return
    const updated = mealsArray.map((meal, idx) => (idx === mealIndex ? { ...meal, ...updates } : meal))
    updatePlanState({ meals: updated })
  }

  const deleteMeal = (mealIndex: number) => {
    if (!plan) return
    const updated = mealsArray.filter((_, idx) => idx !== mealIndex)
    updatePlanState({ meals: updated })
  }

  const addIngredient = (mealIndex: number) => {
    if (!plan) return
    const meal = mealsArray[mealIndex]
    if (!meal) return
    const newFood: MealFood = { food_id: "", food_name: "", quantity: 100 }
    updateMeal(mealIndex, { meal_foods: [...(Array.isArray(meal.meal_foods) ? meal.meal_foods : []), newFood] })
  }

  const updateIngredient = (mealIndex: number, foodIndex: number, updates: Partial<MealFood>) => {
    if (!plan) return
    const meal = mealsArray[mealIndex]
    if (!meal || !Array.isArray(meal.meal_foods)) return
    const updatedFoods = meal.meal_foods.map((food, idx) => (idx === foodIndex ? { ...food, ...updates } : food))
    updateMeal(mealIndex, { meal_foods: updatedFoods })
  }

  const removeIngredient = (mealIndex: number, foodIndex: number) => {
    if (!plan) return
    const meal = mealsArray[mealIndex]
    if (!meal || !Array.isArray(meal.meal_foods)) return
    const updatedFoods = meal.meal_foods.filter((_, idx) => idx !== foodIndex)
    updateMeal(mealIndex, { meal_foods: updatedFoods })
  }

  const addSuggestedRecipe = (mealIndex: number, recipe: SuggestedRecipe) => {
    if (!plan) return
    const meal = mealsArray[mealIndex]
    if (!meal) return
    const currentRecipes = Array.isArray(meal.suggested_recipes) ? meal.suggested_recipes : []
    // Verificar si ya existe
    if (currentRecipes.some(r => r.id === recipe.id)) {
      toast({
        title: "Receta ya agregada",
        description: "Esta receta ya está en la lista de opciones",
        variant: "default",
      })
      return
    }
    updateMeal(mealIndex, { suggested_recipes: [...currentRecipes, recipe] })
    setShowRecipeSelector(false)
    setSelectedMealForRecipe(null)
  }

  const removeSuggestedRecipe = (mealIndex: number, recipeId: string) => {
    if (!plan) return
    const meal = mealsArray[mealIndex]
    if (!meal || !Array.isArray(meal.suggested_recipes)) return
    const updatedRecipes = meal.suggested_recipes.filter(r => r.id !== recipeId)
    updateMeal(mealIndex, { suggested_recipes: updatedRecipes })
  }

  const openRecipeSelector = (mealIndex: number) => {
    setSelectedMealForRecipe(mealIndex)
    setShowRecipeSelector(true)
  }

  // Función para cargar y mostrar receta completa
  const viewRecipe = async (foodId: string) => {
    if (!foodId || foodId.trim() === '') {
      toast({
        title: "Sin ID de receta",
        description: "Este ingrediente no tiene un ID de receta asociado",
        variant: "destructive"
      })
      return
    }

    try {
      setLoadingRecipe(true)
      const headers = await getAuthHeaders()
      
      // Intentar cargar desde endpoint admin primero
      let response = await fetch(buildApiUrl(`admin/nutrition/recipes/${foodId}/`), {
        headers
      })

      if (!response.ok) {
        // Si falla, intentar endpoint público
        response = await fetch(buildApiUrl(`nutrition/recipes/${foodId}/`), {
          headers
        })
      }

      if (response.ok) {
        const recipe = await response.json()
        setSelectedRecipe(recipe)
        setShowRecipeModal(true)
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast({
          title: "Error",
          description: errorData.detail || errorData.error || "No se pudo cargar la receta",
          variant: "destructive"
        })
      }
    } catch (err) {
      console.error('Error cargando receta:', err)
      toast({
        title: "Error",
        description: "Error al cargar la receta",
        variant: "destructive"
      })
    } finally {
      setLoadingRecipe(false)
    }
  }

  const handlePercentsChange = (field: keyof MacroPercents, value: number) => {
    if (!plan) return
    const newPercents = { ...macroPercents, [field]: value }
    const grams = computeGramsFromPercents(newPercents, plan.daily_calories)
    setMacroPercents(newPercents)
    updatePlanState({
      target_macros: {
        ...plan.target_macros,
        ...grams,
        protein_percentage: newPercents.protein,
        carbs_percentage: newPercents.carbs,
        fat_percentage: newPercents.fat,
      },
    })
  }

  const handleGramsChange = (field: "protein" | "carbs" | "fat", value: number) => {
    if (!plan) return
    const grams = {
      protein: field === "protein" ? value : toNumber(plan.target_macros.protein),
      carbs: field === "carbs" ? value : toNumber(plan.target_macros.carbs),
      fat: field === "fat" ? value : toNumber(plan.target_macros.fat),
    }
    const percents = computePercentsFromGrams(grams, plan.daily_calories)
    setMacroPercents(percents)
    updatePlanState({
      target_macros: {
        ...plan.target_macros,
        ...grams,
        protein_percentage: percents.protein,
        carbs_percentage: percents.carbs,
        fat_percentage: percents.fat,
      },
    })
  }

  const handleDailyCaloriesChange = (value: number) => {
    if (!plan) return
    const grams = computeGramsFromPercents(macroPercents, value)
    updatePlanState({
      daily_calories: value,
      target_macros: {
        ...plan.target_macros,
        ...grams,
      },
    })
  }

  const handleSave = async () => {
    if (!plan) return
    try {
      setSaving(true)
      setError(null)
      const headers = await getAuthHeaders()

      const planData = {
        user_id: userId,
        name: plan.name,
        description: plan.description,
        daily_calories: toNumber(plan.daily_calories),
        protein_grams: toNumber(plan.target_macros.protein),
        carbs_grams: toNumber(plan.target_macros.carbs),
        fat_grams: toNumber(plan.target_macros.fat),
        meals_per_day: mealsArray.length || 5,
        is_active: plan.is_active !== false,
        meals: mealsArray.map((meal, index) => ({
          id: meal.id,
          name: meal.name,
          time: meal.time,
          calories: toNumber(meal.calories),
          protein: toNumber(meal.protein),
          carbs: toNumber(meal.carbs),
          fat: toNumber(meal.fat),
          description: meal.description,
          order_index: meal.order_index || index + 1,
          meal_foods: Array.isArray(meal.meal_foods)
            ? meal.meal_foods.map((f) => ({
                food_id: f.food_id,
                quantity: toNumber(f.quantity, 0),
                food_name: f.food_name,
              }))
            : [],
        })),
      }

      console.log("🍽️ [NutritionPlanEditor] Guardando plan:", planData)

      // Usar endpoint de admin para guardar
      let response: Response
      if (plan.id) {
        // Actualizar plan existente usando admin endpoint
        response = await fetch(buildApiUrl(`admin/nutrition/plans/${plan.id}/`), {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(planData),
        })
      } else {
        // Crear nuevo plan usando admin endpoint
        response = await fetch(buildApiUrl("admin/nutrition/plans/"), {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(planData),
        })
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.error || "Error al guardar el plan")
      }

      const saved = await response.json()
      console.log("🍽️ [NutritionPlanEditor] Plan guardado:", saved)
      
      const savedPlanId = saved.id || plan.id
      
      // Actualizar las recetas sugeridas de cada comida
      if (savedPlanId) {
        for (let i = 0; i < mealsArray.length; i++) {
          const meal = mealsArray[i]
          if (!meal.id) {
            console.warn(`🍽️ [NutritionPlanEditor] Comida ${i} no tiene ID, omitiendo actualización de recetas`)
            continue
          }
          
          const suggestedRecipeIds = Array.isArray(meal.suggested_recipes) 
            ? meal.suggested_recipes.map(r => r.id)
            : []
          
          // Actualizar la comida con las recetas sugeridas
          const mealUpdateResponse = await fetch(buildApiUrl(`admin/nutrition/meals/${meal.id}/`), {
            method: "PATCH",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              suggested_recipes_ids: suggestedRecipeIds,
            }),
          })
          
          if (!mealUpdateResponse.ok) {
            console.warn(`🍽️ [NutritionPlanEditor] Error actualizando recetas de comida ${meal.id}:`, mealUpdateResponse.status)
          } else {
            console.log(`🍽️ [NutritionPlanEditor] Recetas actualizadas para comida ${meal.id}:`, suggestedRecipeIds)
          }
        }
      }
      
      // Recargar el plan para asegurar que tenemos los datos actualizados
      await loadUserPlan()
      
      toast({ 
        title: "✅ Plan nutricional guardado", 
        description: "Los cambios han sido aplicados al usuario de forma individual" 
      })
      
      if (!plan.id && saved.id) {
        updatePlanState({ id: saved.id })
      }
      onSave()
    } catch (err) {
      console.error("Error guardando plan:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
      toast({
        title: "❌ Error",
        description: err instanceof Error ? err.message : "No se pudo guardar el plan",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAssignPlan = async () => {
    if (!selectedPlan) return
    try {
      setAssigning(true)
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl("admin/nutrition/change-user-plan/"), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, default_plan_id: selectedPlan }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "No se pudo asignar el plan")
      }
      toast({ title: "✅ Plan asignado", description: "Se aplicó el plan seleccionado al usuario" })
      await loadUserPlan()
    } catch (err) {
      toast({
        title: "❌ Error al asignar",
        description: err instanceof Error ? err.message : "No se pudo asignar el plan",
        variant: "destructive",
      })
    } finally {
      setAssigning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-muted-foreground">Cargando plan nutricional...</p>
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No se pudo cargar el plan del usuario</p>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>
    )
  }

  const totalMacros = mealsArray.reduce(
    (acc, meal) => ({
      calories: acc.calories + toNumber(meal.calories),
      protein: acc.protein + toNumber(meal.protein),
      carbs: acc.carbs + toNumber(meal.carbs),
      fat: acc.fat + toNumber(meal.fat),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )

  const formatMacro = (value: number | string): string => {
    const numValue = typeof value === "string" ? parseFloat(value) : value
    if (isNaN(numValue) || !isFinite(numValue)) return "0"
    const rounded = Math.round(numValue * 100) / 100
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-xl">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              <ChefHat className="h-6 w-6" />
              Plan nutricional del usuario
            </CardTitle>
            <CardDescription>
              {plan.id 
                ? `Plan actual: ${fixEncoding(plan.name)} - Edita este plan individual del usuario (los cambios solo afectan a este usuario)`
                : "El usuario no tiene plan asignado. Crea uno nuevo o asigna uno existente."
              }
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadUserPlan} className="gap-2" disabled={loading || saving}>
              <RefreshCw className="h-4 w-4" />
              Recargar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar cambios
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Label>Nombre del plan</Label>
            <Input value={fixEncoding(plan.name)} onChange={(e) => updatePlanState({ name: e.target.value })} />
            <Label>Descripción</Label>
            <Textarea value={fixEncoding(plan.description)} onChange={(e) => updatePlanState({ description: e.target.value })} rows={3} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Calorías diarias objetivo</Label>
                <Input
                  type="number"
                  value={plan.daily_calories}
                  onChange={(e) => handleDailyCaloriesChange(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Plan activo</Label>
                <Input readOnly value={plan.is_active ? "Sí" : "No"} className="bg-muted" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Asignar plan pre-creado</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger className="sm:col-span-2">
                  <SelectValue placeholder="Selecciona un plan existente" />
                </SelectTrigger>
                <SelectContent>
                  {availablePlans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="secondary" onClick={handleAssignPlan} disabled={!selectedPlan || assigning} className="w-full">
                {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4 mr-2" />}
                Asignar
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Esto aplicará un plan ya creado al usuario y recargará los datos para seguir editando de forma individual.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Macros y porcentajes */}
      <Card className="border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Percent className="h-5 w-5" />
            Objetivos de macros
          </CardTitle>
          <CardDescription>Calcula automáticamente por porcentajes y ajusta gramos a mano</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Proteínas (%)</Label>
                <Input
                  type="number"
                  value={macroPercents.protein}
                  onChange={(e) => handlePercentsChange("protein", Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label>Carbohidratos (%)</Label>
                <Input type="number" value={macroPercents.carbs} onChange={(e) => handlePercentsChange("carbs", Number(e.target.value) || 0)} />
              </div>
              <div>
                <Label>Grasas (%)</Label>
                <Input type="number" value={macroPercents.fat} onChange={(e) => handlePercentsChange("fat", Number(e.target.value) || 0)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Los porcentajes recalculan automáticamente los gramos en función de las calorías diarias.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Proteínas (g)</Label>
              <Input
                type="number"
                value={plan.target_macros.protein || 0}
                onChange={(e) => handleGramsChange("protein", Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Carbohidratos (g)</Label>
              <Input type="number" value={plan.target_macros.carbs || 0} onChange={(e) => handleGramsChange("carbs", Number(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Grasas (g)</Label>
              <Input type="number" value={plan.target_macros.fat || 0} onChange={(e) => handleGramsChange("fat", Number(e.target.value) || 0)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen de totales */}
      <Card className="border border-gray-100 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Totales actuales del plan (comidas del día)</CardTitle>
          <CardDescription>Usando únicamente las comidas del plan actual, no las últimas 5.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-semibold">{formatMacro(totalMacros.calories)}</div>
            <p className="text-muted-foreground text-sm">kcal</p>
          </div>
          <div>
            <div className="text-2xl font-semibold text-blue-600">{formatMacro(totalMacros.protein)}g</div>
            <p className="text-muted-foreground text-sm">Proteínas</p>
          </div>
          <div>
            <div className="text-2xl font-semibold text-green-600">{formatMacro(totalMacros.carbs)}g</div>
            <p className="text-muted-foreground text-sm">Carbos</p>
          </div>
          <div>
            <div className="text-2xl font-semibold text-amber-600">{formatMacro(totalMacros.fat)}g</div>
            <p className="text-muted-foreground text-sm">Grasas</p>
          </div>
        </CardContent>
      </Card>

      {/* Comidas y platos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Comidas del día (editable por plato e ingredientes)</h3>
          <Button onClick={addMeal} className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Añadir comida
          </Button>
        </div>

        {mealsArray.length === 0 && (
          <Card className="border border-dashed text-center py-8">
            <p className="text-muted-foreground">No hay comidas en el plan</p>
            <Button onClick={addMeal} className="mt-3">
              Añadir primera comida
            </Button>
          </Card>
        )}

        {mealsArray.map((meal, index) => (
          <Card key={meal.id || index} className="shadow-md border border-gray-100">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Comida #{index + 1}</CardTitle>
                <span className="text-sm text-muted-foreground">{fixEncoding(meal.name)}</span>
              </div>
              <Button variant="ghost" size="icon" className="text-red-600" onClick={() => deleteMeal(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Nombre</Label>
                  <Input value={fixEncoding(meal.name)} onChange={(e) => updateMeal(index, { name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Hora</Label>
                  <Input type="time" value={meal.time} onChange={(e) => updateMeal(index, { time: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Calorías</Label>
                  <Input
                    type="number"
                    value={toNumber(meal.calories)}
                    onChange={(e) => updateMeal(index, { calories: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Proteínas (g)</Label>
                  <Input
                    type="number"
                    value={toNumber(meal.protein)}
                    onChange={(e) => updateMeal(index, { protein: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Carbohidratos (g)</Label>
                  <Input type="number" value={toNumber(meal.carbs)} onChange={(e) => updateMeal(index, { carbs: Number(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1">
                  <Label>Grasas (g)</Label>
                  <Input type="number" value={toNumber(meal.fat)} onChange={(e) => updateMeal(index, { fat: Number(e.target.value) || 0 })} />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Descripción / notas</Label>
                <Textarea value={fixEncoding(meal.description)} onChange={(e) => updateMeal(index, { description: e.target.value })} rows={2} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Platos / ingredientes</Label>
                  <Button variant="outline" size="sm" onClick={() => addIngredient(index)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Añadir ingrediente
                  </Button>
                </div>

                {Array.isArray(meal.meal_foods) && meal.meal_foods.length > 0 ? (
                  <div className="space-y-2">
                    {meal.meal_foods.map((food, fIndex) => (
                      <div key={fIndex} className="grid grid-cols-12 gap-2 items-center">
                        <Input
                          className="col-span-6"
                          placeholder="Nombre del alimento/plato"
                          value={fixEncoding(food.food_name || "")}
                          onChange={(e) => updateIngredient(index, fIndex, { food_name: e.target.value })}
                        />
                        <Input
                          className="col-span-3"
                          type="number"
                          placeholder="Cantidad (g)"
                          value={toNumber(food.quantity, 0)}
                          onChange={(e) => updateIngredient(index, fIndex, { quantity: Number(e.target.value) || 0 })}
                        />
                        <Input
                          className="col-span-2"
                          placeholder="ID ref."
                          value={food.food_id}
                          onChange={(e) => updateIngredient(index, fIndex, { food_id: e.target.value })}
                        />
                        {food.food_id && food.food_id.trim() !== '' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-blue-600 col-span-1" 
                            onClick={() => viewRecipe(food.food_id)}
                            title="Ver receta completa"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="text-red-600 col-span-1" onClick={() => removeIngredient(index, fIndex)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Añade ingredientes para este plato.</p>
                )}
              </div>

              {/* Recetas sugeridas */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label>Opciones de recetas (vistas en panel de usuario)</Label>
                  <Button variant="outline" size="sm" onClick={() => openRecipeSelector(index)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Añadir receta
                  </Button>
                </div>

                {Array.isArray(meal.suggested_recipes) && meal.suggested_recipes.length > 0 ? (
                  <div className="space-y-2">
                    {meal.suggested_recipes.map((recipe) => (
                      <div key={recipe.id} className="flex items-center gap-3 p-3 border rounded-lg bg-orange-50/50">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{fixEncoding(recipe.name)}</span>
                            {recipe.category && (
                              <Badge variant="secondary" className="text-xs">{fixEncoding(recipe.category)}</Badge>
                            )}
                            {recipe.difficulty && (
                              <Badge variant="outline" className="text-xs">{recipe.difficulty}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {recipe.calories && <span>{recipe.calories} kcal</span>}
                            {recipe.protein && <span>P: {recipe.protein}g</span>}
                            {recipe.carbs && <span>C: {recipe.carbs}g</span>}
                            {recipe.fat && <span>G: {recipe.fat}g</span>}
                            {recipe.prep_time_minutes && <span><Clock className="h-3 w-3 inline mr-1" />{recipe.prep_time_minutes} min</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-blue-600 h-8 w-8" 
                            onClick={() => viewRecipe(recipe.id)}
                            title="Ver receta completa"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-600 h-8 w-8" 
                            onClick={() => removeSuggestedRecipe(index, recipe.id)}
                            title="Eliminar receta"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Añade recetas para que el usuario pueda elegir opciones.</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de receta completa */}
      {showRecipeModal && selectedRecipe && (
        <RecipeDetailModal recipe={selectedRecipe} onClose={() => { setShowRecipeModal(false); setSelectedRecipe(null) }} />
      )}

      {/* Dialog para seleccionar receta */}
      <Dialog open={showRecipeSelector} onOpenChange={setShowRecipeSelector}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Seleccionar receta para añadir</DialogTitle>
            <DialogDescription>
              Selecciona una receta de la lista para añadirla como opción para esta comida
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {loadingRecipes ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-muted-foreground">Cargando recetas...</span>
              </div>
            ) : availableRecipes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay recetas disponibles</p>
            ) : (
              availableRecipes.map((recipe) => {
                const meal = selectedMealForRecipe !== null ? mealsArray[selectedMealForRecipe] : null
                const isAlreadyAdded = meal?.suggested_recipes?.some(r => r.id === recipe.id) || false
                
                return (
                  <div
                    key={recipe.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      isAlreadyAdded 
                        ? 'bg-gray-100 opacity-60 cursor-not-allowed' 
                        : 'hover:bg-orange-50 hover:border-orange-300'
                    }`}
                    onClick={() => !isAlreadyAdded && selectedMealForRecipe !== null && addSuggestedRecipe(selectedMealForRecipe, recipe)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{fixEncoding(recipe.name)}</span>
                          {recipe.category && (
                            <Badge variant="secondary" className="text-xs">{fixEncoding(recipe.category)}</Badge>
                          )}
                          {isAlreadyAdded && (
                            <Badge variant="outline" className="text-xs">Ya agregada</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {recipe.calories && <span>{recipe.calories} kcal</span>}
                          {recipe.protein && <span>P: {recipe.protein}g</span>}
                          {recipe.carbs && <span>C: {recipe.carbs}g</span>}
                          {recipe.fat && <span>G: {recipe.fat}g</span>}
                          {recipe.prep_time_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {recipe.prep_time_minutes} min
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRecipeSelector(false); setSelectedMealForRecipe(null) }}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Componente modal para mostrar detalles completos de una receta
interface RecipeDetailModalProps {
  recipe: any
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
          return { name: fixEncoding(ing), amount: null, unit: null }
        }
        if (typeof ing === 'object' && ing !== null) {
          return {
            name: fixEncoding(ing.name || ing.ingredient || 'Ingrediente'),
            amount: ing.amount || ing.quantity || null,
            unit: ing.unit || 'g'
          }
        }
        return { name: fixEncoding(String(ing)), amount: null, unit: null }
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
                  <DialogTitle className="text-2xl font-bold">{fixEncoding(recipe.name || 'Receta sin nombre')}</DialogTitle>
                  <DialogDescription className="text-sm text-gray-600 mt-1">
                    {fixEncoding(recipe.description || 'Sin descripción')}
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
                  <Badge variant="secondary">{fixEncoding(recipe.category)}</Badge>
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
                      <p className="text-gray-700 flex-1">{fixEncoding(instruction.trim())}</p>
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
