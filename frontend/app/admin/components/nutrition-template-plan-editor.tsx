"use client"

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { buildApiUrl } from "@/lib/api"
import { fixEncoding } from "@/lib/encoding-fix"
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, Search } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { handle401AndRefresh } from "@/lib/fetch-with-auth"

type DayKey = "1" | "2" | "3" | "4" | "5" | "6" | "7"

export interface AdminRecipe {
  id: string
  name: string
  category?: string
  goal_category?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  prep_time_minutes?: number
  difficulty?: string
  image_url?: string
  diet_types?: string[]
  allergens?: string[]
}

interface MealRecipeOption {
  recipe_id: string
  display_order: number
  servings?: number
  custom_calories?: number
  custom_protein?: number
  custom_carbs?: number
  custom_fat?: number
}

interface PlanMealDraft {
  id?: string
  day_of_week: number
  name: string
  meal_type: string
  time: string
  calories: number
  protein: number
  carbs: number
  fat: number
  description: string
  order_index: number
  meal_recipes: MealRecipeOption[]
}

const DAY_LABELS: Record<DayKey, string> = {
  "1": "Lun",
  "2": "Mar",
  "3": "Mié",
  "4": "Jue",
  "5": "Vie",
  "6": "Sáb",
  "7": "Dom",
}

const MEAL_TYPES: Array<{ value: string; label: string }> = [
  { value: "breakfast", label: "Desayuno" },
  { value: "lunch", label: "Almuerzo" },
  { value: "snack", label: "Merienda" },
  { value: "dinner", label: "Cena" },
]

const RECIPE_CATEGORY_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "Desayuno", label: "Desayuno" },
  { value: "Almuerzo", label: "Comida" },
  { value: "Snack", label: "Snack" },
  { value: "Cena", label: "Cena" },
  { value: "Postre", label: "Postre" },
  { value: "Bebida", label: "Bebida" },
]

const FREE_FROM_OPTIONS = [
  { value: "gluten-free", label: "Sin gluten" },
  { value: "dairy-free", label: "Sin lactosa" },
  { value: "egg-free", label: "Sin huevo" },
  { value: "nut-free", label: "Sin frutos secos" },
  { value: "soy-free", label: "Sin soja" },
  { value: "fish-free", label: "Sin pescado" },
  { value: "shellfish-free", label: "Sin marisco" },
  { value: "sesame-free", label: "Sin sésamo" },
]

const normalizeFilterText = (value: string) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim()

const recipeMatchesCategoryFilter = (recipe: AdminRecipe, selectedCategory: string) => {
  if (selectedCategory === "all") return true

  const category = normalizeFilterText(recipe.category || "")
  const selected = normalizeFilterText(selectedCategory)

  if (selected === "almuerzo") {
    return category === "almuerzo" || category === "comida" || category === "lunch"
  }

  return category === selected
}

const recipeMatchesFreeFromFilters = (recipe: AdminRecipe, selectedFilters: string[]) => {
  if (!selectedFilters.length) return true
  const recipeDietTypes = (recipe.diet_types || []).map((item) => normalizeFilterText(item).replace(/\s+/g, '-'))
  return selectedFilters.every((filter) => recipeDietTypes.includes(filter))
}

function toNumber(value: unknown, fallback = 0) {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN
  return Number.isFinite(n) ? n : fallback
}

function formatRange(min: number, max: number, decimals = 0) {
  const round = (v: number) => Number(v.toFixed(decimals))
  const minVal = round(min)
  const maxVal = round(max)
  if (minVal === maxVal) return `${minVal}`
  return `${minVal}-${maxVal}`
}

function dayKeyFromMeal(meal: PlanMealDraft): DayKey {
  return meal.day_of_week ? (String(meal.day_of_week) as DayKey) : "1"
}

const UNSAVED_CHANGES_MESSAGE = "Hay cambios sin guardar. ¿Quieres salir sin guardar?"

function getRecipeId(value: any) {
  return String(value?.recipe?.id || value?.recipe_id || value?.id || "").trim()
}

function mapMealRecipeOption(value: any, index: number): MealRecipeOption | null {
  const recipeId = getRecipeId(value)
  if (!recipeId) return null

  return {
    recipe_id: recipeId,
    display_order: toNumber(value?.display_order, index),
    servings: value?.servings != null ? toNumber(value.servings, 1) : 1,
    custom_calories: value?.custom_calories != null ? toNumber(value.custom_calories) : undefined,
    custom_protein: value?.custom_protein != null ? toNumber(value.custom_protein) : undefined,
    custom_carbs: value?.custom_carbs != null ? toNumber(value.custom_carbs) : undefined,
    custom_fat: value?.custom_fat != null ? toNumber(value.custom_fat) : undefined,
  }
}

function mapMealRecipeOptions(meal: any): MealRecipeOption[] {
  const detailedOptions = Array.isArray(meal?.meal_recipes) ? meal.meal_recipes : []
  const fallbackOptions = Array.isArray(meal?.suggested_recipes)
    ? meal.suggested_recipes
    : Array.isArray(meal?.suggested_recipes_ids)
      ? meal.suggested_recipes_ids.map((id: string | number) => ({ recipe_id: id }))
      : []

  const source = detailedOptions.length > 0 ? detailedOptions : fallbackOptions
  const seen = new Set<string>()

  return source
    .map((option: any, index: number) => mapMealRecipeOption(option, index))
    .filter((option: MealRecipeOption | null): option is MealRecipeOption => {
      if (!option || seen.has(option.recipe_id)) return false
      seen.add(option.recipe_id)
      return true
    })
    .map((option: MealRecipeOption, index: number) => ({ ...option, display_order: toNumber(option.display_order, index) }))
}

export const NutritionTemplatePlanEditor = forwardRef<
  { hasUnsavedChanges: () => boolean; confirmDiscardChanges: () => boolean },
  {
    planId: string
    availableRecipes: AdminRecipe[]
    onSaved: () => void | Promise<void>
    onClose: () => void
    onDirtyChange?: (hasUnsavedChanges: boolean) => void
  }
>(function NutritionTemplatePlanEditor({
  planId,
  availableRecipes,
  onSaved,
  onClose,
  onDirtyChange,
}, ref) {
  const { getAuthHeaders } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeDay, setActiveDay] = useState<DayKey>("1")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [loadedMealsCount, setLoadedMealsCount] = useState(0)

  const [meals, setMeals] = useState<PlanMealDraft[]>([])

  const updateUnsavedChanges = useCallback((value: boolean) => {
    setHasUnsavedChanges(value)
    onDirtyChange?.(value)
  }, [onDirtyChange])

  const confirmDiscardChanges = useCallback(() => {
    return !hasUnsavedChanges || window.confirm(UNSAVED_CHANGES_MESSAGE)
  }, [hasUnsavedChanges])

  useImperativeHandle(ref, () => ({
    hasUnsavedChanges: () => hasUnsavedChanges,
    confirmDiscardChanges,
  }), [confirmDiscardChanges, hasUnsavedChanges])

  // selector recetas
  const [showRecipeSelector, setShowRecipeSelector] = useState(false)
  const [recipeSearch, setRecipeSearch] = useState("")
  const [recipeCategoryFilter, setRecipeCategoryFilter] = useState("all")
  const [recipeFreeFromFilters, setRecipeFreeFromFilters] = useState<string[]>([])
  const [targetMealIndex, setTargetMealIndex] = useState<number | null>(null)

  const recipesById = useMemo(() => {
    const map = new Map<string, AdminRecipe>()
    for (const r of availableRecipes) map.set(String(r.id), r)
    return map
  }, [availableRecipes])

  const computeRecipeMacros = useCallback((recipe: AdminRecipe | undefined | null, option?: MealRecipeOption) => {
    if (!recipe) return { calories: 0, protein: 0, carbs: 0, fat: 0 }
    const servings = option?.servings != null ? toNumber(option.servings, 1) : 1
    const calories = option?.custom_calories != null ? toNumber(option.custom_calories) : toNumber(recipe.calories) * servings
    const protein = option?.custom_protein != null ? toNumber(option.custom_protein) : toNumber(recipe.protein) * servings
    const carbs = option?.custom_carbs != null ? toNumber(option.custom_carbs) : toNumber(recipe.carbs) * servings
    const fat = option?.custom_fat != null ? toNumber(option.custom_fat) : toNumber(recipe.fat) * servings
    return { calories, protein, carbs, fat }
  }, [])

  const computeMealAverages = useCallback((meal: PlanMealDraft) => {
    const opts = Array.isArray(meal.meal_recipes) ? meal.meal_recipes : []
    const used = opts
      .map((o) => ({ o, r: recipesById.get(String(o.recipe_id)) }))
      .filter((x) => x.r)
      .map((x) => computeRecipeMacros(x.r!, x.o))
    if (used.length === 0) return { calories: 0, protein: 0, carbs: 0, fat: 0 }
    const sum = used.reduce(
      (acc, m) => ({
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
    return {
      calories: sum.calories / used.length,
      protein: sum.protein / used.length,
      carbs: sum.carbs / used.length,
      fat: sum.fat / used.length,
    }
  }, [computeRecipeMacros, recipesById])

  const computeMealRange = useCallback((meal: PlanMealDraft) => {
    const opts = Array.isArray(meal.meal_recipes) ? meal.meal_recipes : []
    const used = opts
      .map((o) => ({ o, r: recipesById.get(String(o.recipe_id)) }))
      .filter((x) => x.r)
      .map((x) => computeRecipeMacros(x.r!, x.o))
    if (used.length === 0) return null

    const pickRange = (key: "calories" | "protein" | "carbs" | "fat") => {
      const values = used.map((m) => m[key])
      return { min: Math.min(...values), max: Math.max(...values) }
    }

    return {
      calories: pickRange("calories"),
      protein: pickRange("protein"),
      carbs: pickRange("carbs"),
      fat: pickRange("fat"),
      count: used.length,
    }
  }, [computeRecipeMacros, recipesById])

  const filteredRecipes = useMemo(() => {
    const q = recipeSearch.trim().toLowerCase()
    return availableRecipes.filter((r) => {
      const matchesSearch = !q || (r.name || "").toLowerCase().includes(q)
      const matchesCategory = recipeMatchesCategoryFilter(r, recipeCategoryFilter)
      const matchesFreeFrom = recipeMatchesFreeFromFilters(r, recipeFreeFromFilters)
      return matchesSearch && matchesCategory && matchesFreeFrom
    })
  }, [availableRecipes, recipeSearch, recipeCategoryFilter, recipeFreeFromFilters])

  const mealsForDay = useMemo(() => {
    return meals
      .filter((m) => dayKeyFromMeal(m) === activeDay)
      .sort((a, b) => a.order_index - b.order_index)
  }, [meals, activeDay])

  const fetchJsonWithAuth = useCallback(async (url: string) => {
    let headers = await getAuthHeaders()
    let res = await fetch(buildApiUrl(url), { headers })
    if (res.status === 401) {
      const newHeaders = await handle401AndRefresh(getAuthHeaders)
      if (!newHeaders) throw new Error("Sesión expirada")
      headers = newHeaders
      res = await fetch(buildApiUrl(url), { headers })
    }
    if (!res.ok) throw new Error(`Error ${res.status}`)
    return await res.json()
  }, [getAuthHeaders])

  const patchJsonWithAuth = useCallback(async (url: string, body: any) => {
    let headers = await getAuthHeaders()
    let res = await fetch(buildApiUrl(url), {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.status === 401) {
      const newHeaders = await handle401AndRefresh(getAuthHeaders)
      if (!newHeaders) throw new Error("Sesión expirada")
      headers = newHeaders
      res = await fetch(buildApiUrl(url), {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.detail || errData.error || `Error ${res.status}`)
    }
    return await res.json().catch(() => null)
  }, [getAuthHeaders])

  const loadPlan = async () => {
    setLoading(true)
    try {
      const data = await fetchJsonWithAuth(`admin/nutrition/plans/${planId}/`)

      const incomingMeals = Array.isArray(data.meals) ? data.meals : []
      const mapped: PlanMealDraft[] = incomingMeals.map((m: any, idx: number) => {
        return {
          id: m.id ? String(m.id) : undefined,
          day_of_week: m.day_of_week ?? 1,
          name: fixEncoding(m.name || `Comida ${idx + 1}`),
          meal_type: m.meal_type || "lunch",
          time: m.time || "12:00",
          calories: toNumber(m.calories),
          protein: toNumber(m.protein),
          carbs: toNumber(m.carbs),
          fat: toNumber(m.fat),
          description: fixEncoding(m.description || ""),
          order_index: toNumber(m.order_index, idx + 1),
          meal_recipes: mapMealRecipeOptions(m),
        }
      })

      setMeals(mapped)
      setLoadedMealsCount(mapped.length)
      updateUnsavedChanges(false)
    } catch (e) {
      toast({
        title: "❌ Error",
        description: e instanceof Error ? e.message : "No se pudo cargar el plan",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId])

  useEffect(() => {
    if (!hasUnsavedChanges) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasUnsavedChanges])

  const addMealForActiveDay = () => {
    const dayNum = Number(activeDay)
    const nextOrder =
      Math.max(
        0,
        ...meals.filter((m) => (m.day_of_week ?? null) === dayNum).map((m) => m.order_index || 0)
      ) + 1

    const newMeal: PlanMealDraft = {
      day_of_week: dayNum,
      name: `Comida ${nextOrder} (${DAY_LABELS[activeDay]})`,
      meal_type: "breakfast",
      time: "08:00",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      description: "",
      order_index: nextOrder,
      meal_recipes: [],
    }
    setMeals((prev) => [...prev, newMeal])
    updateUnsavedChanges(true)
  }

  const updateMeal = (mealIdOrIndex: { id?: string; indexInMeals?: number }, patch: Partial<PlanMealDraft>) => {
    updateUnsavedChanges(true)
    setMeals((prev) => {
      const next = [...prev]
      let idx = -1
      if (mealIdOrIndex.id) idx = next.findIndex((m) => m.id === mealIdOrIndex.id)
      if (idx === -1 && mealIdOrIndex.indexInMeals != null) idx = mealIdOrIndex.indexInMeals
      if (idx < 0) return prev
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }

  const normalizeMealOrder = (items: PlanMealDraft[], dayOfWeek: number) => {
    const dayMeals = items
      .filter((m) => m.day_of_week === dayOfWeek)
      .slice()
      .sort((a, b) => a.order_index - b.order_index)

    const orderByMeal = new Map<PlanMealDraft, number>()
    dayMeals.forEach((meal, index) => orderByMeal.set(meal, index + 1))

    return items.map((meal) => {
      const nextOrder = orderByMeal.get(meal)
      return nextOrder ? { ...meal, order_index: nextOrder } : meal
    })
  }

  const moveMeal = (meal: PlanMealDraft, direction: "up" | "down") => {
    updateUnsavedChanges(true)
    setMeals((prev) => {
      const dayMeals = prev
        .filter((m) => m.day_of_week === meal.day_of_week)
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
      const currentIndex = dayMeals.findIndex((m) => m === meal)
      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1

      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= dayMeals.length) return prev

      const current = dayMeals[currentIndex]
      const target = dayMeals[targetIndex]

      return prev.map((item) => {
        if (item === current) return { ...item, order_index: target.order_index }
        if (item === target) return { ...item, order_index: current.order_index }
        return item
      })
    })
  }

  const removeMeal = (meal: PlanMealDraft) => {
    setMeals((prev) => normalizeMealOrder(prev.filter((m) => m !== meal), meal.day_of_week))
    updateUnsavedChanges(true)
  }

  const openRecipePicker = (meal: PlanMealDraft) => {
    const idx = meals.findIndex((m) => m === meal)
    if (idx < 0) return
    setTargetMealIndex(idx)
    setRecipeSearch("")
    setRecipeCategoryFilter("all")
    setRecipeFreeFromFilters([])
    setShowRecipeSelector(true)
  }

  const addRecipeToMeal = (recipe: AdminRecipe) => {
    if (targetMealIndex == null) return
    updateUnsavedChanges(true)
    setMeals((prev) => {
      const meal = prev[targetMealIndex]
      if (!meal) return prev
      const already = meal.meal_recipes.some((r) => String(r.recipe_id) === String(recipe.id))
      if (already) return prev
      const displayOrder = meal.meal_recipes.length
      return prev.map((item, index) => index === targetMealIndex
        ? {
            ...item,
            meal_recipes: [
              ...item.meal_recipes,
              { recipe_id: String(recipe.id), display_order: displayOrder, servings: 1 },
            ],
          }
        : item
      )
    })
  }

  const removeRecipeFromMeal = (meal: PlanMealDraft, recipeId: string) => {
    const idx = meals.findIndex((m) => m === meal)
    if (idx < 0) return
    updateUnsavedChanges(true)
    setMeals((prev) => {
      const m = prev[idx]
      if (!m) return prev
      const filtered = m.meal_recipes.filter((r) => String(r.recipe_id) !== String(recipeId))
      return prev.map((item, index) => index === idx
        ? { ...item, meal_recipes: filtered.map((r, i) => ({ ...r, display_order: i })) }
        : item
      )
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      if (loadedMealsCount > 0 && meals.length === 0) {
        throw new Error("No se puede guardar un menú vacío sobre un plan que ya tenía comidas.")
      }
      if (loadedMealsCount > 0 && meals.length < loadedMealsCount && !window.confirm("Este guardado tiene menos comidas que el plan cargado. Si continúas, se reemplazará el menú semanal con menos comidas. ¿Quieres continuar?")) {
        return
      }

      const mealsPayload = meals.map((m) => ({
        day_of_week: m.day_of_week,
        name: m.name,
        meal_type: m.meal_type,
        time: m.time,
        description: m.description,
        order_index: toNumber(m.order_index, 1),
        // Mantener compatibilidad: el panel de usuario usa suggested_recipes para generar "opciones" (max 3).
        suggested_recipes_ids: m.meal_recipes.map((r) => r.recipe_id),
        // Y también guardamos las cantidades/orden en PlanMealRecipe.
        meal_recipes: m.meal_recipes.map((r) => ({
          recipe_id: r.recipe_id,
          servings: r.servings ?? 1,
          custom_calories: r.custom_calories,
          custom_protein: r.custom_protein,
          custom_carbs: r.custom_carbs,
          custom_fat: r.custom_fat,
          display_order: r.display_order ?? 0,
        })),
      }))

      await patchJsonWithAuth(`admin/nutrition/plans/${planId}/`, { meals: mealsPayload })

      toast({ title: "✅ Menú semanal guardado", description: "Se actualizaron los días/comidas y sus opciones." })
      await loadPlan()
      updateUnsavedChanges(false)
      await onSaved()
    } catch (e) {
      toast({
        title: "❌ Error",
        description: e instanceof Error ? e.message : "No se pudo guardar",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Configura comidas por día y añade varias recetas como opciones (ej: 3 desayunos).
        </div>
        <Button onClick={addMealForActiveDay} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Añadir comida
        </Button>
      </div>

      <Tabs value={activeDay} onValueChange={(v) => setActiveDay(v as DayKey)}>
        <TabsList className="grid grid-cols-7">
          {(["1", "2", "3", "4", "5", "6", "7"] as DayKey[]).map((d) => (
            <TabsTrigger key={d} value={d} className="text-xs">
              {DAY_LABELS[d]}
            </TabsTrigger>
          ))}
        </TabsList>

        {(["1", "2", "3", "4", "5", "6", "7"] as DayKey[]).map((d) => (
          <TabsContent key={d} value={d} className="space-y-3">
            {mealsForDay.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  No hay comidas para este día. Usa “Añadir comida”.
                </CardContent>
              </Card>
            ) : (
              mealsForDay.map((meal, mealPosition) => {
                const computed = computeMealAverages(meal)
                const range = computeMealRange(meal)
                const canMoveUp = mealPosition > 0
                const canMoveDown = mealPosition < mealsForDay.length - 1
                const recipeOptions = meal.meal_recipes
                  .slice()
                  .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                  .map((r) => recipesById.get(String(r.recipe_id)))
                  .filter(Boolean) as AdminRecipe[]

                return (
                  <Card key={`${meal.id || "new"}-${meal.name}-${meal.order_index}`} className="border">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <CardTitle className="text-sm">Comida #{meal.order_index}</CardTitle>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => moveMeal(meal, "up")} disabled={!canMoveUp} title="Subir comida">
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => moveMeal(meal, "down")} disabled={!canMoveDown} title="Bajar comida">
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => removeMeal(meal)} title="Eliminar comida">
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Tipo</Label>
                          <Select
                            value={meal.meal_type}
                            onValueChange={(v) => updateMeal({ indexInMeals: meals.findIndex((m) => m === meal) }, { meal_type: v })}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MEAL_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Nombre</Label>
                          <Input
                            className="h-9"
                            value={meal.name}
                            onChange={(e) =>
                              updateMeal({ indexInMeals: meals.findIndex((m) => m === meal) }, { name: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Hora</Label>
                          <Input
                            className="h-9"
                            value={meal.time}
                            onChange={(e) =>
                              updateMeal({ indexInMeals: meals.findIndex((m) => m === meal) }, { time: e.target.value })
                            }
                            placeholder="08:00"
                          />
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {range ? (
                          <>
                            {range.count > 1 ? "Rango por opciones" : "Valores calculados"}: {formatRange(range.calories.min, range.calories.max)} kcal · P {formatRange(range.protein.min, range.protein.max, 1)} · C {formatRange(range.carbs.min, range.carbs.max, 1)} · G {formatRange(range.fat.min, range.fat.max, 1)}
                          </>
                        ) : (
                          <>Sin recetas, no hay macros calculados.</>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Opciones de receta (puedes añadir 3 o más)</Label>
                          <Button size="sm" variant="outline" onClick={() => openRecipePicker(meal)}>
                            <Plus className="h-4 w-4 mr-1" />
                            Añadir receta
                          </Button>
                        </div>

                        {meal.meal_recipes.length === 0 ? (
                          <div className="text-sm text-muted-foreground">Sin recetas seleccionadas.</div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {recipeOptions.map((r) => (
                              <div key={r.id} className="border rounded-md p-2 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium truncate">{fixEncoding(r.name)}</div>
                                  {r.category && (
                                    <div className="mt-1">
                                      <Badge variant="secondary" className="text-[10px]">
                                        {RECIPE_CATEGORY_OPTIONS.find(option => option.value === r.category)?.label || r.category}
                                      </Badge>
                                    </div>
                                  )}
                                  <div className="text-xs text-muted-foreground">
                                    {toNumber(r.calories)} kcal · P {toNumber(r.protein)} · C {toNumber(r.carbs)} · G {toNumber(r.fat)}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeRecipeFromMeal(meal, String(r.id))}
                                  title="Quitar receta"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          variant="outline"
          onClick={() => {
            if (!confirmDiscardChanges()) return
            updateUnsavedChanges(false)
            onClose()
          }}
          disabled={saving}
        >
          Cerrar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar menú"
          )}
        </Button>
      </div>

      <Dialog open={showRecipeSelector} onOpenChange={setShowRecipeSelector}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Seleccionar receta</DialogTitle>
            <DialogDescription>Elige una receta ya creada para añadirla como opción.</DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar receta..."
              value={recipeSearch}
              onChange={(e) => setRecipeSearch(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-xs">Categoría</Label>
            <Select value={recipeCategoryFilter} onValueChange={setRecipeCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                {RECIPE_CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Libre de</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {FREE_FROM_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={recipeFreeFromFilters.includes(option.value)}
                    onChange={(event) => {
                      setRecipeFreeFromFilters((prev) => {
                        if (event.target.checked) {
                          return prev.includes(option.value) ? prev : [...prev, option.value]
                        }
                        return prev.filter((value) => value !== option.value)
                      })
                    }}
                    className="h-4 w-4"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filteredRecipes.map((r) => (
              <Button
                key={r.id}
                variant="outline"
                className="justify-start h-auto whitespace-normal"
                onClick={() => {
                  addRecipeToMeal(r)
                  setShowRecipeSelector(false)
                }}
              >
                <div className="text-left">
                  <div className="font-medium text-sm">{fixEncoding(r.name)}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {r.category && (
                      <Badge variant="outline" className="text-[10px]">
                        {r.category}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {toNumber(r.calories)} kcal · P {toNumber(r.protein)} · C {toNumber(r.carbs)} · G {toNumber(r.fat)}
                  </div>
                </div>
              </Button>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecipeSelector(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
})
