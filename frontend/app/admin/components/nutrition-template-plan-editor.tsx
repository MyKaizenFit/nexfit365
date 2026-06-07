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
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react"
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

type RecipeSelectorMode = "add" | "replace"
type CopySource =
  | { type: "meal"; meal: PlanMealDraft }
  | { type: "day"; day: DayKey }
  | null

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

function getMonthCalendarDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  const startDate = new Date(firstDay)
  startDate.setDate(firstDay.getDate() - mondayOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index)
    return date
  })
}

function dayKeyFromDate(date: Date): DayKey {
  return String(((date.getDay() + 6) % 7) + 1) as DayKey
}

function isSameCalendarDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
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
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => new Date())

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
  const [recipeSelectorMode, setRecipeSelectorMode] = useState<RecipeSelectorMode>("add")
  const [recipeSearch, setRecipeSearch] = useState("")
  const [recipeCategoryFilter, setRecipeCategoryFilter] = useState("all")
  const [recipeFreeFromFilters, setRecipeFreeFromFilters] = useState<string[]>([])
  const [targetMealIndex, setTargetMealIndex] = useState<number | null>(null)
  const [targetRecipeId, setTargetRecipeId] = useState<string | null>(null)
  const [copySource, setCopySource] = useState<CopySource>(null)
  const [copyTargetDays, setCopyTargetDays] = useState<DayKey[]>([])
  const [copyMode, setCopyMode] = useState<"append" | "replace">("append")

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

  const calendarDays = getMonthCalendarDays(calendarMonth)

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
    setTargetRecipeId(null)
    setRecipeSelectorMode("add")
    setRecipeSearch("")
    setRecipeCategoryFilter("all")
    setRecipeFreeFromFilters([])
    setShowRecipeSelector(true)
  }

  const openRecipeReplacePicker = (meal: PlanMealDraft, recipeId: string) => {
    const idx = meals.findIndex((m) => m === meal)
    if (idx < 0) return
    setTargetMealIndex(idx)
    setTargetRecipeId(recipeId)
    setRecipeSelectorMode("replace")
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

  const replaceRecipeInMeal = (recipe: AdminRecipe) => {
    if (targetMealIndex == null || !targetRecipeId) return
    updateUnsavedChanges(true)
    setMeals((prev) => {
      const meal = prev[targetMealIndex]
      if (!meal) return prev
      const replacementId = String(recipe.id)
      const already = meal.meal_recipes.some((r) => String(r.recipe_id) === replacementId)
      if (already && replacementId !== targetRecipeId) return prev

      return prev.map((item, index) => index === targetMealIndex
        ? {
            ...item,
            meal_recipes: item.meal_recipes.map((option) => String(option.recipe_id) === targetRecipeId
              ? {
                  recipe_id: replacementId,
                  display_order: option.display_order,
                  servings: option.servings ?? 1,
                }
              : option
            ),
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

  const moveRecipeInMeal = (meal: PlanMealDraft, recipeId: string, direction: "up" | "down") => {
    const idx = meals.findIndex((m) => m === meal)
    if (idx < 0) return
    updateUnsavedChanges(true)
    setMeals((prev) => {
      const currentMeal = prev[idx]
      if (!currentMeal) return prev
      const sorted = currentMeal.meal_recipes.slice().sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      const recipeIndex = sorted.findIndex((option) => String(option.recipe_id) === recipeId)
      const targetIndex = direction === "up" ? recipeIndex - 1 : recipeIndex + 1
      if (recipeIndex < 0 || targetIndex < 0 || targetIndex >= sorted.length) return prev

      const nextOptions = [...sorted]
      const temp = nextOptions[recipeIndex]
      nextOptions[recipeIndex] = nextOptions[targetIndex]
      nextOptions[targetIndex] = temp

      return prev.map((item, index) => index === idx
        ? { ...item, meal_recipes: nextOptions.map((option, order) => ({ ...option, display_order: order })) }
        : item
      )
    })
  }

  const openCopyMealDialog = (meal: PlanMealDraft) => {
    setCopySource({ type: "meal", meal })
    setCopyTargetDays([])
    setCopyMode("append")
  }

  const openCopyDayDialog = (day: DayKey) => {
    setCopySource({ type: "day", day })
    setCopyTargetDays([])
    setCopyMode("append")
  }

  const closeCopyDialog = () => {
    setCopySource(null)
    setCopyTargetDays([])
    setCopyMode("append")
  }

  const getNextMealOrder = (items: PlanMealDraft[], dayOfWeek: number) => (
    Math.max(0, ...items.filter((meal) => meal.day_of_week === dayOfWeek).map((meal) => meal.order_index || 0)) + 1
  )

  const cloneMealForDay = (meal: PlanMealDraft, dayOfWeek: number, orderIndex: number): PlanMealDraft => ({
    ...meal,
    id: undefined,
    day_of_week: dayOfWeek,
    order_index: orderIndex,
    meal_recipes: meal.meal_recipes.map((option, index) => ({ ...option, display_order: index })),
  })

  const applyCopy = () => {
    if (!copySource || copyTargetDays.length === 0) return
    updateUnsavedChanges(true)
    setMeals((prev) => {
      let next = [...prev]
      const targetNumbers = copyTargetDays.map((day) => Number(day))

      if (copySource.type === "meal") {
        for (const dayNumber of targetNumbers) {
          const orderIndex = getNextMealOrder(next, dayNumber)
          next.push(cloneMealForDay(copySource.meal, dayNumber, orderIndex))
        }
        return next
      }

      const sourceDayNumber = Number(copySource.day)
      const sourceMeals = prev
        .filter((meal) => meal.day_of_week === sourceDayNumber)
        .slice()
        .sort((a, b) => a.order_index - b.order_index)

      for (const dayNumber of targetNumbers) {
        if (copyMode === "replace") {
          next = next.filter((meal) => meal.day_of_week !== dayNumber)
        }
        let orderIndex = getNextMealOrder(next, dayNumber)
        for (const meal of sourceMeals) {
          next.push(cloneMealForDay(meal, dayNumber, orderIndex))
          orderIndex += 1
        }
      }
      return next
    })
    toast({ title: "✅ Copiado", description: "Las comidas/recetas se han duplicado en los días seleccionados." })
    closeCopyDialog()
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
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={() => openCopyDayDialog(activeDay)} size="sm" variant="outline" disabled={mealsForDay.length === 0}>
            Copiar día
          </Button>
          <Button onClick={addMealForActiveDay} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            Añadir comida
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Calendario mensual de nutrición</CardTitle>
              <div className="text-sm text-muted-foreground">
                Navega por el mes y selecciona un día para editar sus comidas y recetas.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[180px] text-center text-sm font-semibold capitalize">
                {calendarMonth.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2">
            {(["1", "2", "3", "4", "5", "6", "7"] as DayKey[]).map((day) => <div key={day}>{DAY_LABELS[day]}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date) => {
              const key = dayKeyFromDate(date)
              const dayMeals = meals.filter((meal) => dayKeyFromMeal(meal) === key)
              const recipeCount = dayMeals.reduce((total, meal) => total + meal.meal_recipes.length, 0)
              const isCurrentMonth = date.getMonth() === calendarMonth.getMonth()
              const isSelected = isSameCalendarDay(date, selectedCalendarDate)

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => {
                    setSelectedCalendarDate(date)
                    setActiveDay(key)
                  }}
                  className={`min-h-[82px] rounded-lg border p-2 text-left transition ${
                    isSelected ? "border-blue-500 bg-blue-50 shadow-sm" : "hover:border-blue-300 hover:bg-blue-50/40"
                  } ${isCurrentMonth ? "bg-white" : "bg-slate-50 text-muted-foreground"}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-semibold">{date.getDate()}</span>
                    <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-800">{dayMeals.length}</span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {dayMeals.length > 0 ? (
                      <>
                        <div className="truncate rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-800">
                          {dayMeals.length} comidas
                        </div>
                        <div className="truncate rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-800">
                          {recipeCount} recetas
                        </div>
                      </>
                    ) : (
                      <div className="text-[10px] text-muted-foreground">Sin comidas</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

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

                return (
                  <Card key={`${meal.id || "new"}-${meal.name}-${meal.order_index}`} className="border">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <CardTitle className="text-sm">Comida #{meal.order_index}</CardTitle>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openCopyMealDialog(meal)} title="Copiar comida a otros días">
                            Copiar
                          </Button>
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
                            {meal.meal_recipes
                              .slice()
                              .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                              .map((option, recipePosition) => {
                                const r = recipesById.get(String(option.recipe_id))
                                const recipeName = r ? fixEncoding(r.name) : `Receta ${option.recipe_id}`
                                const canMoveRecipeUp = recipePosition > 0
                                const canMoveRecipeDown = recipePosition < meal.meal_recipes.length - 1

                                return (
                              <div key={`${option.recipe_id}-${recipePosition}`} className="border rounded-md p-2 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium truncate">{recipeName}</div>
                                  {r?.category && (
                                    <div className="mt-1">
                                      <Badge variant="secondary" className="text-[10px]">
                                        {RECIPE_CATEGORY_OPTIONS.find(option => option.value === r.category)?.label || r.category}
                                      </Badge>
                                    </div>
                                  )}
                                  <div className="text-xs text-muted-foreground">
                                    {r ? (
                                      <>{toNumber(r.calories)} kcal · P {toNumber(r.protein)} · C {toNumber(r.carbs)} · G {toNumber(r.fat)}</>
                                    ) : (
                                      <>Receta no cargada en el catálogo actual</>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => moveRecipeInMeal(meal, String(option.recipe_id), "up")} disabled={!canMoveRecipeUp} title="Subir receta">
                                    <ArrowUp className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => moveRecipeInMeal(meal, String(option.recipe_id), "down")} disabled={!canMoveRecipeDown} title="Bajar receta">
                                    <ArrowDown className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => openRecipeReplacePicker(meal, String(option.recipe_id))} title="Sustituir receta">
                                    Sustituir
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeRecipeFromMeal(meal, String(option.recipe_id))}
                                    title="Quitar receta"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              </div>
                                )
                              })}
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
            <DialogTitle>{recipeSelectorMode === "replace" ? "Sustituir receta" : "Seleccionar receta"}</DialogTitle>
            <DialogDescription>
              {recipeSelectorMode === "replace"
                ? "Busca una receta y reemplaza la opción seleccionada sin reconstruir la comida."
                : "Busca una receta ya creada para añadirla como opción."}
            </DialogDescription>
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
                  if (recipeSelectorMode === "replace") {
                    replaceRecipeInMeal(r)
                  } else {
                    addRecipeToMeal(r)
                  }
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

      <Dialog open={copySource !== null} onOpenChange={(open) => {
        if (!open) closeCopyDialog()
      }}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {copySource?.type === "day" ? "Copiar bloque de comidas" : "Copiar comida"}
            </DialogTitle>
            <DialogDescription>
              Duplica {copySource?.type === "day" ? "todas las comidas y recetas del día" : "esta comida con sus recetas"} a otros días de la semana.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Días destino</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                {(["1", "2", "3", "4", "5", "6", "7"] as DayKey[]).map((day) => {
                  const disabled = copySource?.type === "day" && copySource.day === day
                  return (
                    <label key={day} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${disabled ? "opacity-50" : ""}`}>
                      <input
                        type="checkbox"
                        checked={copyTargetDays.includes(day)}
                        disabled={disabled}
                        onChange={(event) => {
                          setCopyTargetDays((prev) => {
                            if (event.target.checked) {
                              return prev.includes(day) ? prev : [...prev, day]
                            }
                            return prev.filter((value) => value !== day)
                          })
                        }}
                        className="h-4 w-4"
                      />
                      <span>{DAY_LABELS[day]}</span>
                    </label>
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCopyTargetDays((["1", "2", "3", "4", "5", "6", "7"] as DayKey[]).filter((day) => !(copySource?.type === "day" && copySource.day === day)))}
                >
                  Toda la semana
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setCopyTargetDays([])}>
                  Limpiar
                </Button>
              </div>
            </div>

            {copySource?.type === "day" ? (
              <div>
                <Label className="text-sm font-semibold">Modo de copia</Label>
                <Select value={copyMode} onValueChange={(value) => setCopyMode(value as "append" | "replace")}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="append">Añadir a lo existente</SelectItem>
                    <SelectItem value="replace">Reemplazar comidas del día destino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeCopyDialog}>Cancelar</Button>
            <Button onClick={applyCopy} disabled={copyTargetDays.length === 0}>Copiar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
})
