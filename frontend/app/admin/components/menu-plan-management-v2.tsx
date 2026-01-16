"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Label as FormLabel } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { fixEncoding } from "@/lib/encoding-fix"
import { Activity, ArrowDown, ArrowUp, CheckCircle, Copy, Flame, Loader2, MoreHorizontal, Pencil, Plus, Search, Trash2, User, XCircle } from "lucide-react"
import { NutritionTemplatePlanEditor } from "./nutrition-template-plan-editor"
import { MenuPlanTypeFilter, useAdminMenuPlans } from "@/hooks/use-admin-menu-plans"
import { useAuth } from "@/contexts/auth-context"
import { buildApiUrl } from "@/lib/api"
import { handle401AndRefresh } from "@/lib/fetch-with-auth"

type DayKey = "1" | "2" | "3" | "4" | "5" | "6" | "7"

interface AdminRecipe {
  id: string
  name: string
  category?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
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
  "1": "Lunes",
  "2": "Martes",
  "3": "Miércoles",
  "4": "Jueves",
  "5": "Viernes",
  "6": "Sábado",
  "7": "Domingo",
}

const MEAL_TYPES: Array<{ value: string; label: string }> = [
  { value: "breakfast", label: "Desayuno" },
  { value: "morning_snack", label: "Snack Mañana" },
  { value: "lunch", label: "Almuerzo" },
  { value: "afternoon_snack", label: "Snack Tarde" },
  { value: "dinner", label: "Cena" },
  { value: "evening_snack", label: "Snack Noche" },
  { value: "pre_workout", label: "Pre-Entreno" },
  { value: "post_workout", label: "Post-Entreno" },
]

function toNumber(value: unknown, fallback = 0) {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN
  return Number.isFinite(n) ? n : fallback
}

function getCategory(plan: { is_system: boolean; user_id?: number | null; is_template: boolean }) {
  if (plan.user_id) return "Usuario"
  if (plan.is_system) return "Sistema"
  if (plan.is_template) return "Plantilla"
  return "Plantilla"
}

function CategoryBadge({ plan }: { plan: { is_system: boolean; user_id?: number | null; is_template: boolean } }) {
  const cat = getCategory(plan)
  const variant = cat === "Usuario" ? "default" : cat === "Sistema" ? "secondary" : "outline"
  return <Badge variant={variant}>{cat}</Badge>
}

export function MenuPlanManagementV2() {
  const { plans, users, stats, loading, error, fetchPlans, fetchPlanDetail, createPlan, updatePlan, deletePlan, toggleActive } = useAdminMenuPlans()
  const { getAuthHeaders } = useAuth()

  // Filtros (similar a Planes de Entrenamiento)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<MenuPlanTypeFilter>("all")
  const [userFilter, setUserFilter] = useState<string>("all")

  // Ordenamiento (cliente, consistente con WorkoutPlanManagement)
  const [sortColumn, setSortColumn] = useState<"name" | "category" | "calories" | "status">("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Selección + bulk actions
  const [selectedPlans, setSelectedPlans] = useState<string[]>([])
  const [isBulkLoading, setIsBulkLoading] = useState(false)

  // Create/Edit dialog (unificado)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)
  const [createStep, setCreateStep] = useState<"basic" | "week">("basic")
  const [autoComputeMacros, setAutoComputeMacros] = useState(true)

  // Editor semanal (reutiliza NutritionTemplatePlanEditor)
  const [showWeeklyEditor, setShowWeeklyEditor] = useState(false)
  const [weeklyPlanId, setWeeklyPlanId] = useState<string | null>(null)
  const [availableRecipes, setAvailableRecipes] = useState<AdminRecipe[]>([])

  // Draft del constructor semanal (tipo planes de entrenamiento)
  const [draftActiveDay, setDraftActiveDay] = useState<DayKey>("1")
  const [draftMeals, setDraftMeals] = useState<PlanMealDraft[]>([])
  const [showRecipeSelector, setShowRecipeSelector] = useState(false)
  const [recipeSearch, setRecipeSearch] = useState("")
  const [targetMealIndex, setTargetMealIndex] = useState<number | null>(null)

  // Duplicar a usuario
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [duplicateSourceId, setDuplicateSourceId] = useState<string | null>(null)
  const [duplicateUserId, setDuplicateUserId] = useState<string>("none")

  const [form, setForm] = useState({
    name: "",
    description: "",
    daily_calories: 2000,
    protein: 30,
    carbs: 40,
    fat: 30,
    user_id: "none" as string,
  })

  const resetForm = useCallback(() => {
    setForm({
      name: "",
      description: "",
      daily_calories: 2000,
      protein: 30,
      carbs: 40,
      fat: 30,
      user_id: "none",
    })
    setCreateStep("basic")
    setDraftActiveDay("1")
    setDraftMeals([])
    setShowRecipeSelector(false)
    setRecipeSearch("")
    setTargetMealIndex(null)
    setAutoComputeMacros(true)
  }, [])

  const openCreate = () => {
    setEditingPlanId(null)
    resetForm()
    setShowCreateDialog(true)
  }

  const loadRecipes = useCallback(async () => {
    try {
      let headers = await getAuthHeaders()
      let res = await fetch(buildApiUrl("admin/nutrition/recipes/?page_size=500"), { headers })
      if (res.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) return
        headers = newHeaders
        res = await fetch(buildApiUrl("admin/nutrition/recipes/?page_size=500"), { headers })
      }
      if (!res.ok) return
      const data = await res.json()
      const list = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : [])
      setAvailableRecipes(list)
    } catch {
      // ignore
    }
  }, [getAuthHeaders])

  useEffect(() => {
    // Cargar recetas una vez para el editor semanal
    loadRecipes()
  }, [loadRecipes])

  // Aplicar filtros automáticamente (similar a useEffect de WorkoutPlanManagement)
  useEffect(() => {
    const filters = { search: searchTerm, type: typeFilter, userId: userFilter }
    if (searchTerm.trim().length > 0) {
      const t = setTimeout(() => {
        fetchPlans(filters)
      }, 400)
      return () => clearTimeout(t)
    }
    fetchPlans(filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, typeFilter, userFilter])

  const filteredPlans = useMemo(() => {
    // La lista ya viene filtrada del servidor; mantenemos un filtro defensivo (p. ej. por nombre) por consistencia UX.
    const q = searchTerm.trim().toLowerCase()
    return (Array.isArray(plans) ? plans : []).filter((p) => {
      const matchesSearch = !q || fixEncoding(p.name || "").toLowerCase().includes(q) || fixEncoding(p.description || "").toLowerCase().includes(q)
      return matchesSearch
    })
  }, [plans, searchTerm])

  const sortedPlans = useMemo(() => {
    const arr = Array.isArray(filteredPlans) ? [...filteredPlans] : []
    const getValue = (p: any) => {
      switch (sortColumn) {
        case "name":
          return fixEncoding(p.name || "").toLowerCase()
        case "category":
          return getCategory(p)
        case "calories":
          return Number(p.daily_calories) || 0
        case "status":
          return p.is_active ? 1 : 0
        default:
          return 0
      }
    }
    arr.sort((a, b) => {
      const av = getValue(a)
      const bv = getValue(b)
      if (typeof av === "string") {
        return sortDirection === "asc" ? av.localeCompare(String(bv)) : String(bv).localeCompare(av)
      }
      return sortDirection === "asc" ? (Number(av) - Number(bv)) : (Number(bv) - Number(av))
    })
    return arr
  }, [filteredPlans, sortColumn, sortDirection])

  const handleSort = (col: typeof sortColumn) => {
    if (sortColumn === col) setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortColumn(col)
      setSortDirection("asc")
    }
  }

  const handleCreate = async (configureWeekly: boolean) => {
    try {
      setSaving(true)
      const userId = form.user_id === "none" ? null : Number(form.user_id)
      const shouldAuto = autoComputeMacros && computedPlanAverages.calories > 0
      const derivedDailyCalories = shouldAuto ? Math.round(computedPlanAverages.calories) : (Number(form.daily_calories) || 0)
      const derivedPercents = shouldAuto
        ? {
            protein: Math.round(computedPlanAverages.proteinPct || 0),
            carbs: Math.round(computedPlanAverages.carbsPct || 0),
            fat: Math.round(computedPlanAverages.fatPct || 0),
          }
        : { protein: Number(form.protein) || 0, carbs: Number(form.carbs) || 0, fat: Number(form.fat) || 0 }

      const mealsPayload = draftMeals.map((m) => {
        const computed = autoComputeMacros ? computeMealAverages(m) : null
        return {
        day_of_week: m.day_of_week,
        name: m.name,
        meal_type: m.meal_type,
        time: m.time,
        calories: computed ? Math.round(toNumber(computed.calories)) : toNumber(m.calories),
        protein: computed ? Math.round(toNumber(computed.protein)) : toNumber(m.protein),
        carbs: computed ? Math.round(toNumber(computed.carbs)) : toNumber(m.carbs),
        fat: computed ? Math.round(toNumber(computed.fat)) : toNumber(m.fat),
        description: m.description || "",
        order_index: toNumber(m.order_index, 1),
        suggested_recipes_ids: m.meal_recipes.map((r) => r.recipe_id),
        meal_recipes: m.meal_recipes.map((r) => ({
          recipe_id: r.recipe_id,
          servings: r.servings ?? 1,
          custom_calories: r.custom_calories,
          custom_protein: r.custom_protein,
          custom_carbs: r.custom_carbs,
          custom_fat: r.custom_fat,
          display_order: r.display_order ?? 0,
        })),
        }
      })
      const created = await createPlan({
        name: form.name.trim(),
        description: form.description || "",
        daily_calories: derivedDailyCalories,
        percents: derivedPercents,
        user_id: userId,
        meals: mealsPayload,
      })
      toast({ title: "✅ Plan creado", description: configureWeekly ? "Ahora configura el menú semanal." : "Creado correctamente." })
      setShowCreateDialog(false)
      await fetchPlans({ search: searchTerm, type: typeFilter, userId: userFilter })
      if (configureWeekly && created?.id) {
        setWeeklyPlanId(String(created.id))
        setShowWeeklyEditor(true)
      }
    } catch (e) {
      toast({ title: "❌ Error", description: e instanceof Error ? e.message : "No se pudo crear", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleEditWeekly = async (planId: string) => {
    setWeeklyPlanId(planId)
    setShowWeeklyEditor(true)
  }

  const openDuplicateDialog = (planId: string) => {
    setDuplicateSourceId(planId)
    setDuplicateUserId("none")
    setShowDuplicateDialog(true)
  }

  const handleDuplicateToUser = async () => {
    if (!duplicateSourceId) return
    if (duplicateUserId === "none") {
      toast({ title: "❌ Error", description: "Selecciona un usuario destino", variant: "destructive" })
      return
    }
    const userId = Number(duplicateUserId)
    if (!Number.isFinite(userId) || userId <= 0) return
    try {
      setDuplicating(true)
      const detail = await fetchPlanDetail(duplicateSourceId)
      if (!detail) throw new Error("No se pudo cargar el plan origen")
      const created = await createPlan({
        name: `${detail.name} (${users.find(u => u.id === userId)?.email || "usuario"})`,
        description: detail.description || "",
        daily_calories: Number(detail.daily_calories) || 0,
        percents: { protein: Number(detail.protein_percentage) || 30, carbs: Number(detail.carbs_percentage) || 40, fat: Number(detail.fat_percentage) || 30 },
        user_id: userId,
        meals: Array.isArray(detail.meals) ? detail.meals.map((m: any) => ({
          day_of_week: m.day_of_week ?? null,
          name: m.name,
          meal_type: m.meal_type,
          time: m.time,
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
          description: m.description,
          order_index: m.order_index,
          suggested_recipes_ids: Array.isArray(m.suggested_recipes) ? m.suggested_recipes.map((r: any) => (typeof r === "object" ? r.id : r)) : [],
          meal_recipes: Array.isArray(m.meal_recipes) ? m.meal_recipes.map((mr: any) => ({
            recipe_id: mr.recipe?.id || mr.recipe_id,
            servings: mr.servings,
            custom_calories: mr.custom_calories,
            custom_protein: mr.custom_protein,
            custom_carbs: mr.custom_carbs,
            custom_fat: mr.custom_fat,
            display_order: mr.display_order,
          })) : [],
        })) : [],
      })
      toast({ title: "✅ Duplicado", description: "Plan duplicado y asignado al usuario." })
      setShowDuplicateDialog(false)
      await fetchPlans({ search: searchTerm, type: typeFilter, userId: userFilter })
      if (created?.id) {
        setWeeklyPlanId(String(created.id))
        setShowWeeklyEditor(true)
      }
    } catch (e) {
      toast({ title: "❌ Error", description: e instanceof Error ? e.message : "No se pudo duplicar", variant: "destructive" })
    } finally {
      setDuplicating(false)
    }
  }

  const handleDelete = async (planId: string) => {
    if (!confirm("¿Eliminar este plan?")) return
    try {
      await deletePlan(planId)
      toast({ title: "✅ Eliminado" })
      await fetchPlans({ search: searchTerm, type: typeFilter, userId: userFilter })
    } catch (e) {
      toast({ title: "❌ Error", description: e instanceof Error ? e.message : "No se pudo eliminar", variant: "destructive" })
    }
  }

  const handleToggleActive = async (planId: string, next: boolean) => {
    try {
      await toggleActive(planId, next)
      await fetchPlans({ search: searchTerm, type: typeFilter, userId: userFilter })
    } catch (e) {
      toast({ title: "❌ Error", description: e instanceof Error ? e.message : "No se pudo actualizar", variant: "destructive" })
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedPlans(sortedPlans.map((p) => p.id))
    else setSelectedPlans([])
  }

  const handleSelectPlan = (planId: string, checked: boolean) => {
    setSelectedPlans((prev) => {
      const arr = Array.isArray(prev) ? prev : []
      return checked ? Array.from(new Set([...arr, planId])) : arr.filter((id) => id !== planId)
    })
  }

  const handleBulkToggleActive = async (next: boolean) => {
    if (selectedPlans.length === 0) return
    try {
      setIsBulkLoading(true)
      await Promise.all(selectedPlans.map((id) => toggleActive(id, next)))
      toast({ title: "✅ Actualizado", description: `${selectedPlans.length} planes actualizados` })
      setSelectedPlans([])
      await fetchPlans({ search: searchTerm, type: typeFilter, userId: userFilter })
    } catch (e) {
      toast({ title: "❌ Error", description: e instanceof Error ? e.message : "No se pudieron actualizar", variant: "destructive" })
    } finally {
      setIsBulkLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedPlans.length === 0) return
    if (!confirm(`¿Eliminar ${selectedPlans.length} planes?`)) return
    try {
      setIsBulkLoading(true)
      await Promise.all(selectedPlans.map((id) => deletePlan(id)))
      toast({ title: "✅ Eliminados", description: `${selectedPlans.length} planes eliminados` })
      setSelectedPlans([])
      await fetchPlans({ search: searchTerm, type: typeFilter, userId: userFilter })
    } catch (e) {
      toast({ title: "❌ Error", description: e instanceof Error ? e.message : "No se pudieron eliminar", variant: "destructive" })
    } finally {
      setIsBulkLoading(false)
    }
  }

  const openEdit = async (planId: string) => {
    try {
      setLoadingDetail(true)
      setEditingPlanId(planId)
      const detail = await fetchPlanDetail(planId)
      if (!detail) throw new Error("No se pudo cargar el plan")
      setForm({
        name: fixEncoding(detail.name || ""),
        description: fixEncoding(detail.description || ""),
        daily_calories: Number(detail.daily_calories) || 0,
        protein: Number((detail as any).protein_percentage ?? detail.protein_percentage ?? 30) || 30,
        carbs: Number((detail as any).carbs_percentage ?? detail.carbs_percentage ?? 40) || 40,
        fat: Number((detail as any).fat_percentage ?? detail.fat_percentage ?? 30) || 30,
        user_id: detail.user_id ? String(detail.user_id) : "none",
      })
      setShowCreateDialog(true)
    } catch (e) {
      toast({ title: "❌ Error", description: e instanceof Error ? e.message : "No se pudo abrir", variant: "destructive" })
      setEditingPlanId(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleSaveEdit = async (configureWeekly: boolean) => {
    if (!editingPlanId) return
    try {
      setSaving(true)
      const userId = form.user_id === "none" ? null : Number(form.user_id)
      await updatePlan(editingPlanId, {
        name: form.name.trim(),
        description: form.description || "",
        daily_calories: Number(form.daily_calories) || 0,
        user_id: userId,
        // El backend calcula %/g según campos disponibles; para mantener consistente, mandamos porcentajes directos.
        protein_percentage: Number(form.protein) || 0,
        carbs_percentage: Number(form.carbs) || 0,
        fat_percentage: Number(form.fat) || 0,
      })
      toast({ title: "✅ Plan actualizado" })
      setShowCreateDialog(false)
      await fetchPlans({ search: searchTerm, type: typeFilter, userId: userFilter })
      if (configureWeekly) {
        setWeeklyPlanId(editingPlanId)
        setShowWeeklyEditor(true)
      }
    } catch (e) {
      toast({ title: "❌ Error", description: e instanceof Error ? e.message : "No se pudo guardar", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const draftMealsForDay = useMemo(() => {
    const dayNum = Number(draftActiveDay)
    return draftMeals.filter((m) => m.day_of_week === dayNum).sort((a, b) => a.order_index - b.order_index)
  }, [draftMeals, draftActiveDay])

  const addDraftMeal = () => {
    const dayNum = Number(draftActiveDay)
    const nextOrder = Math.max(0, ...draftMeals.filter((m) => m.day_of_week === dayNum).map((m) => m.order_index || 0)) + 1
    const newMeal: PlanMealDraft = {
      day_of_week: dayNum,
      name: `Comida ${nextOrder} (${DAY_LABELS[draftActiveDay]})`,
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
    setDraftMeals((prev) => [...prev, newMeal])
  }

  const updateDraftMeal = (indexInDraftMeals: number, patch: Partial<PlanMealDraft>) => {
    setDraftMeals((prev) => {
      const next = [...prev]
      if (!next[indexInDraftMeals]) return prev
      next[indexInDraftMeals] = { ...next[indexInDraftMeals], ...patch }
      return next
    })
  }

  const removeDraftMeal = (indexInDraftMeals: number) => {
    setDraftMeals((prev) => prev.filter((_, i) => i !== indexInDraftMeals))
  }

  const openRecipePickerForDraftMeal = (draftIndex: number) => {
    setTargetMealIndex(draftIndex)
    setRecipeSearch("")
    setShowRecipeSelector(true)
  }

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

  const computeDayTotals = useCallback((day: number) => {
    const meals = draftMeals.filter((m) => m.day_of_week === day)
    const totals = meals.reduce(
      (acc, m) => {
        const base = autoComputeMacros ? computeMealAverages(m) : { calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat }
        return {
          calories: acc.calories + toNumber(base.calories),
          protein: acc.protein + toNumber(base.protein),
          carbs: acc.carbs + toNumber(base.carbs),
          fat: acc.fat + toNumber(base.fat),
        }
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
    return totals
  }, [autoComputeMacros, computeMealAverages, draftMeals])

  const computedPlanAverages = useMemo(() => {
    // Promedio diario sobre los días que tengan al menos 1 comida
    const dayTotals = (["1", "2", "3", "4", "5", "6", "7"] as DayKey[])
      .map((d) => Number(d))
      .map((day) => ({ day, t: computeDayTotals(day) }))
      .filter((x) => (x.t.calories + x.t.protein + x.t.carbs + x.t.fat) > 0)

    if (dayTotals.length === 0) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0, proteinPct: 0, carbsPct: 0, fatPct: 0 }
    }

    const sum = dayTotals.reduce(
      (acc, x) => ({
        calories: acc.calories + x.t.calories,
        protein: acc.protein + x.t.protein,
        carbs: acc.carbs + x.t.carbs,
        fat: acc.fat + x.t.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
    const avg = {
      calories: sum.calories / dayTotals.length,
      protein: sum.protein / dayTotals.length,
      carbs: sum.carbs / dayTotals.length,
      fat: sum.fat / dayTotals.length,
    }

    const macroCalories = (avg.protein * 4) + (avg.carbs * 4) + (avg.fat * 9)
    const totalCalories = macroCalories > 0 ? macroCalories : avg.calories
    const proteinPct = totalCalories > 0 ? (avg.protein * 4 / totalCalories) * 100 : 0
    const carbsPct = totalCalories > 0 ? (avg.carbs * 4 / totalCalories) * 100 : 0
    const fatPct = totalCalories > 0 ? (avg.fat * 9 / totalCalories) * 100 : 0
    return { ...avg, proteinPct, carbsPct, fatPct }
  }, [computeDayTotals])

  const filteredRecipes = useMemo(() => {
    const q = recipeSearch.trim().toLowerCase()
    if (!q) return availableRecipes
    return availableRecipes.filter((r) => (r.name || "").toLowerCase().includes(q))
  }, [availableRecipes, recipeSearch])

  const addRecipeToDraftMeal = (recipe: AdminRecipe) => {
    if (targetMealIndex == null) return
    setDraftMeals((prev) => {
      const next = [...prev]
      const meal = next[targetMealIndex]
      if (!meal) return prev
      const already = meal.meal_recipes.some((r) => String(r.recipe_id) === String(recipe.id))
      if (already) return prev
      meal.meal_recipes = [...meal.meal_recipes, { recipe_id: String(recipe.id), display_order: meal.meal_recipes.length, servings: 1 }]
      next[targetMealIndex] = { ...meal }
      return next
    })
  }

  const removeRecipeFromDraftMeal = (draftIndex: number, recipeId: string) => {
    setDraftMeals((prev) => {
      const next = [...prev]
      const meal = next[draftIndex]
      if (!meal) return prev
      const filtered = meal.meal_recipes.filter((r) => String(r.recipe_id) !== String(recipeId))
      meal.meal_recipes = filtered.map((r, i) => ({ ...r, display_order: i }))
      next[draftIndex] = { ...meal }
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Planes de Menús (Nuevo)</h2>
          <p className="text-gray-600 mt-1">Administra planes como en “Planes de entrenamiento”: filtros, tabla y acciones masivas.</p>
        </div>
        <Button onClick={openCreate} className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white border-0">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Plan
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card className="hidden lg:block">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plantillas</CardTitle>
            <Badge variant="outline">Template</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sortedPlans.filter((p) => !p.user_id && !p.is_system).length}</div>
          </CardContent>
        </Card>
        <Card className="hidden lg:block">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">De usuario</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sortedPlans.filter((p) => Boolean(p.user_id)).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="p-5 md:p-4">
          <div className="grid gap-5 md:gap-4 md:grid-cols-6">
            <div className="md:col-span-2">
              <FormLabel>Buscar</FormLabel>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar planes..." className="pl-8" />
              </div>
            </div>
            <div>
              <FormLabel>Tipo</FormLabel>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="templates">Plantillas</SelectItem>
                  <SelectItem value="users">Planes de usuario</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <FormLabel>Usuario</FormLabel>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {users.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FormLabel>Ordenar</FormLabel>
              <Select value={sortColumn} onValueChange={(v) => setSortColumn(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nombre</SelectItem>
                  <SelectItem value="category">Categoría</SelectItem>
                  <SelectItem value="calories">Calorías</SelectItem>
                  <SelectItem value="status">Estado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedPlans.length > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-medium">{selectedPlans.length} plan(es) seleccionado(s)</span>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => handleBulkToggleActive(true)} disabled={isBulkLoading} className="h-11 bg-green-500 hover:bg-green-600 text-white">
                  <CheckCircle className="h-3 w-3 mr-1" /> Activar
                </Button>
                <Button variant="outline" onClick={() => handleBulkToggleActive(false)} disabled={isBulkLoading} className="h-11">
                  <XCircle className="h-3 w-3 mr-1" /> Desactivar
                </Button>
                <Button variant="destructive" onClick={handleBulkDelete} disabled={isBulkLoading} className="h-11">
                  <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando planes de menús...</span>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64 text-red-600">{error}</div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Planes de menús</CardTitle>
              <div className="hidden md:flex items-center space-x-2">
                <Checkbox
                  checked={selectedPlans.length === sortedPlans.length && sortedPlans.length > 0}
                  onCheckedChange={(v) => handleSelectAll(Boolean(v))}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedPlans.length > 0 ? `${selectedPlans.length} seleccionados` : "Seleccionar todos"}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile */}
            <div className="md:hidden space-y-4 p-4">
              <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedPlans.length === sortedPlans.length && sortedPlans.length > 0}
                    onCheckedChange={(v) => handleSelectAll(Boolean(v))}
                  />
                  <span className="text-sm font-medium text-muted-foreground">Seleccionar todos</span>
                </div>
                <span className="text-xs text-muted-foreground">{selectedPlans.length} seleccionados</span>
              </div>

              {sortedPlans.map((p) => (
                <Card
                  key={p.id}
                  className={`border-2 transition-all ${
                    selectedPlans.includes(p.id) ? "border-purple-500 bg-purple-50/50" : "border-gray-200 hover:border-purple-300 hover:shadow-md"
                  }`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <Checkbox checked={selectedPlans.includes(p.id)} onCheckedChange={(v) => handleSelectPlan(p.id, Boolean(v))} className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-semibold text-base truncate">{fixEncoding(p.name)}</div>
                              <CategoryBadge plan={p} />
                              {p.is_active ? (
                                <Badge className="bg-green-100 text-green-800 border-0 text-xs">Activo</Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-800 border-0 text-xs">Inactivo</Badge>
                              )}
                            </div>
                            {p.description && <div className="text-xs text-muted-foreground line-clamp-2">{fixEncoding(p.description)}</div>}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openEdit(p.id)} disabled={loadingDetail}>
                                {loadingDetail ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Pencil className="h-4 w-4 mr-2" />}
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditWeekly(p.id)}>
                                <Pencil className="h-4 w-4 mr-2" /> Editar menú semanal
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDuplicateDialog(p.id)}>
                                <Copy className="h-4 w-4 mr-2" /> Duplicar a usuario…
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(p.id, !p.is_active)}>
                                {p.is_active ? (
                                  <>
                                    <XCircle className="h-4 w-4 mr-2" /> Desactivar
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" /> Activar
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(p.id)} className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-2 border-t">
                          <div className="flex items-center gap-1">
                            <Flame className="h-3 w-3" />
                            <span>{p.daily_calories} kcal</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span className="truncate">{p.user_email || "—"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-3 text-left font-medium cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort("name")}>
                        <div className="flex items-center gap-2">
                          Plan
                          {sortColumn === "name" && (sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                        </div>
                      </th>
                      <th className="p-3 text-left font-medium cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort("category")}>
                        <div className="flex items-center gap-2">
                          Categoría
                          {sortColumn === "category" && (sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                        </div>
                      </th>
                      <th className="p-3 text-left font-medium cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort("calories")}>
                        <div className="flex items-center gap-2">
                          Calorías
                          {sortColumn === "calories" && (sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                        </div>
                      </th>
                      <th className="p-3 text-left font-medium cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort("status")}>
                        <div className="flex items-center gap-2">
                          Estado
                          {sortColumn === "status" && (sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                        </div>
                      </th>
                      <th className="p-3 text-left font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPlans.map((p) => (
                      <tr key={p.id} className="border-t hover:bg-muted/50">
                        <td className="p-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox checked={selectedPlans.includes(p.id)} onCheckedChange={(v) => handleSelectPlan(p.id, Boolean(v))} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="font-medium truncate max-w-[420px]">{fixEncoding(p.name)}</div>
                                <CategoryBadge plan={p} />
                                {p.user_email && (
                                  <Badge variant="outline" className="truncate max-w-[200px]">
                                    <User className="w-3 h-3 mr-1" />
                                    {p.user_email}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {p.description ? (fixEncoding(p.description).length > 60 ? `${fixEncoding(p.description).slice(0, 60)}...` : fixEncoding(p.description)) : "Sin descripción"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3"><CategoryBadge plan={p} /></td>
                        <td className="p-3">{p.daily_calories} kcal</td>
                        <td className="p-3">
                          {p.is_active ? <Badge className="bg-green-100 text-green-800 border-0">Activo</Badge> : <Badge className="bg-gray-100 text-gray-800 border-0">Inactivo</Badge>}
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
                              <DropdownMenuItem onClick={() => openEdit(p.id)} disabled={loadingDetail}>
                                {loadingDetail ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Pencil className="h-4 w-4 mr-2" />}
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditWeekly(p.id)}>
                                <Pencil className="h-4 w-4 mr-2" /> Editar menú semanal
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDuplicateDialog(p.id)}>
                                <Copy className="h-4 w-4 mr-2" /> Duplicar a usuario…
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(p.id, !p.is_active)}>
                                {p.is_active ? (
                                  <>
                                    <XCircle className="h-4 w-4 mr-2" /> Desactivar
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" /> Activar
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(p.id)} className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" /> Eliminar
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
          </CardContent>
        </Card>
      )}

      {/* Crear */}
      <Dialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          if (!open) {
            setEditingPlanId(null)
            resetForm()
          }
          setShowCreateDialog(open)
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlanId ? "Editar Plan de Menús" : "Crear Plan de Menús"}</DialogTitle>
            <DialogDescription>{editingPlanId ? "Modifica el plan y, si quieres, abre el editor semanal." : "Crea una plantilla o un plan asignado a usuario."}</DialogDescription>
          </DialogHeader>
          {!editingPlanId ? (
            <Tabs value={createStep} onValueChange={(v) => setCreateStep(v as any)}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="basic">Datos</TabsTrigger>
                <TabsTrigger value="week">Semana</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <Card className="border-dashed">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Cálculo automático de macros</div>
                      <Checkbox checked={autoComputeMacros} onCheckedChange={(v) => setAutoComputeMacros(Boolean(v))} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Si está activado, la media diaria de kcal/macros se calcula usando las recetas seleccionadas en la semana (media de opciones por comida).
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Nombre</label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Plan Mediterráneo" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Calorías diarias</label>
                    <Input
                      type="number"
                      value={autoComputeMacros && computedPlanAverages.calories > 0 ? Math.round(computedPlanAverages.calories) : form.daily_calories}
                      onChange={(e) => setForm({ ...form, daily_calories: Number(e.target.value) || 0 })}
                      disabled={autoComputeMacros && computedPlanAverages.calories > 0}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Asignar a usuario (opcional)</label>
                    <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin asignar (Plantilla)</SelectItem>
                        {users.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.email}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Descripción</label>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción..." rows={3} />
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm font-medium mb-2">Macros (%)</div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Input
                          type="number"
                          value={autoComputeMacros && computedPlanAverages.calories > 0 ? Math.round(computedPlanAverages.proteinPct) : form.protein}
                          onChange={(e) => setForm({ ...form, protein: Number(e.target.value) || 0 })}
                          disabled={autoComputeMacros && computedPlanAverages.calories > 0}
                        />
                        <div className="text-xs text-gray-500 mt-1">Proteína</div>
                      </div>
                      <div>
                        <Input
                          type="number"
                          value={autoComputeMacros && computedPlanAverages.calories > 0 ? Math.round(computedPlanAverages.carbsPct) : form.carbs}
                          onChange={(e) => setForm({ ...form, carbs: Number(e.target.value) || 0 })}
                          disabled={autoComputeMacros && computedPlanAverages.calories > 0}
                        />
                        <div className="text-xs text-gray-500 mt-1">Carbos</div>
                      </div>
                      <div>
                        <Input
                          type="number"
                          value={autoComputeMacros && computedPlanAverages.calories > 0 ? Math.round(computedPlanAverages.fatPct) : form.fat}
                          onChange={(e) => setForm({ ...form, fat: Number(e.target.value) || 0 })}
                          disabled={autoComputeMacros && computedPlanAverages.calories > 0}
                        />
                        <div className="text-xs text-gray-500 mt-1">Grasas</div>
                      </div>
                    </div>
                    {autoComputeMacros && computedPlanAverages.calories > 0 && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Media diaria estimada: {Math.round(computedPlanAverages.calories)} kcal · P {Math.round(computedPlanAverages.protein)}g · C {Math.round(computedPlanAverages.carbs)}g · G {Math.round(computedPlanAverages.fat)}g
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setCreateStep("week")}>
                    Configurar semana →
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="week" className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Configura la semana completa: añade comidas por día y selecciona varias recetas como opciones por cada comida (igual que en entrenos con ejercicios).
                </div>

                {autoComputeMacros && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Media diaria (calculada)</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      {computedPlanAverages.calories > 0 ? (
                        <div>
                          <div><b>{Math.round(computedPlanAverages.calories)} kcal</b></div>
                          <div>P {Math.round(computedPlanAverages.protein)}g · C {Math.round(computedPlanAverages.carbs)}g · G {Math.round(computedPlanAverages.fat)}g</div>
                          <div className="text-xs mt-1">P {Math.round(computedPlanAverages.proteinPct)}% · C {Math.round(computedPlanAverages.carbsPct)}% · G {Math.round(computedPlanAverages.fatPct)}%</div>
                        </div>
                      ) : (
                        <div>Añade recetas a la semana para calcular la media diaria.</div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Tabs value={draftActiveDay} onValueChange={(v) => setDraftActiveDay(v as DayKey)}>
                  {/* En móvil: 2 filas (sin scroll horizontal). En desktop: 7 columnas. */}
                  <TabsList className="grid grid-cols-4 sm:grid-cols-7 gap-2 h-auto">
                    {(["1","2","3","4","5","6","7"] as DayKey[]).map((d) => (
                      <TabsTrigger key={d} value={d} className="px-3 py-2 text-sm">
                        {DAY_LABELS[d].slice(0,3)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm font-medium">{DAY_LABELS[draftActiveDay]}</div>
                  <Button variant="outline" onClick={addDraftMeal} className="h-11">
                    <Plus className="h-4 w-4 mr-1" />
                    Añadir comida
                  </Button>
                </div>

                {draftMealsForDay.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-6 text-center text-sm text-muted-foreground">
                      No hay comidas para este día. Usa “Añadir comida”.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {draftMealsForDay.map((meal) => {
                      const draftIndex = draftMeals.findIndex((m) => m === meal)
                      const computed = autoComputeMacros ? computeMealAverages(meal) : null
                      const recipeOptions = meal.meal_recipes
                        .slice()
                        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                        .map((r) => recipesById.get(String(r.recipe_id)))
                        .filter(Boolean) as AdminRecipe[]

                      return (
                        <Card key={`${draftIndex}-${meal.order_index}`} className="border">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-3">
                              <CardTitle className="text-sm">Comida #{meal.order_index}</CardTitle>
                              <Button variant="ghost" size="icon" onClick={() => removeDraftMeal(draftIndex)} title="Eliminar comida">
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <FormLabel className="text-xs">Tipo</FormLabel>
                                <Select value={meal.meal_type} onValueChange={(v) => updateDraftMeal(draftIndex, { meal_type: v })}>
                                  <SelectTrigger className="h-11 text-sm"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {MEAL_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <FormLabel className="text-xs">Nombre</FormLabel>
                                <Input className="h-11" value={meal.name} onChange={(e) => updateDraftMeal(draftIndex, { name: e.target.value })} />
                              </div>
                              <div className="space-y-1">
                                <FormLabel className="text-xs">Hora</FormLabel>
                                <Input className="h-11" value={meal.time} onChange={(e) => updateDraftMeal(draftIndex, { time: e.target.value })} placeholder="08:00" />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="space-y-1">
                                <FormLabel className="text-xs">Kcal</FormLabel>
                                <Input type="number" className="h-11" value={meal.calories} onChange={(e) => updateDraftMeal(draftIndex, { calories: toNumber(e.target.value) })} />
                              </div>
                              <div className="space-y-1">
                                <FormLabel className="text-xs">Proteína (g)</FormLabel>
                                <Input type="number" className="h-11" value={meal.protein} onChange={(e) => updateDraftMeal(draftIndex, { protein: toNumber(e.target.value) })} />
                              </div>
                              <div className="space-y-1">
                                <FormLabel className="text-xs">Carbos (g)</FormLabel>
                                <Input type="number" className="h-11" value={meal.carbs} onChange={(e) => updateDraftMeal(draftIndex, { carbs: toNumber(e.target.value) })} />
                              </div>
                              <div className="space-y-1">
                                <FormLabel className="text-xs">Grasas (g)</FormLabel>
                                <Input type="number" className="h-11" value={meal.fat} onChange={(e) => updateDraftMeal(draftIndex, { fat: toNumber(e.target.value) })} />
                              </div>
                            </div>

                            {autoComputeMacros && computed && meal.meal_recipes.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                Calculado (media de opciones): {Math.round(computed.calories)} kcal · P {Math.round(computed.protein)} · C {Math.round(computed.carbs)} · G {Math.round(computed.fat)}
                              </div>
                            )}

                            <div className="space-y-1">
                              <FormLabel className="text-xs">Notas / descripción</FormLabel>
                              <Input className="h-11" value={meal.description} onChange={(e) => updateDraftMeal(draftIndex, { description: e.target.value })} placeholder="Opcional..." />
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <FormLabel className="text-xs">Opciones de receta (puedes añadir varias)</FormLabel>
                                <Button variant="outline" onClick={() => openRecipePickerForDraftMeal(draftIndex)} className="h-11">
                                  <Plus className="h-4 w-4 mr-1" /> Añadir receta
                                </Button>
                              </div>

                              {meal.meal_recipes.length === 0 ? (
                                <div className="text-sm text-muted-foreground">Sin recetas seleccionadas.</div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {recipeOptions.map((r) => (
                                    <div key={r.id} className="border rounded-md p-3 flex items-center justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="text-sm font-medium truncate">{fixEncoding(r.name)}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {toNumber(r.calories)} kcal · P {toNumber(r.protein)} · C {toNumber(r.carbs)} · G {toNumber(r.fat)}
                                        </div>
                                      </div>
                                      <Button variant="ghost" size="icon" onClick={() => removeRecipeFromDraftMeal(draftIndex, String(r.id))} title="Quitar receta">
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
                    })}
                  </div>
                )}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button variant="outline" onClick={() => setCreateStep("basic")} className="h-11">← Volver</Button>
                  <Button onClick={() => handleCreate(false)} disabled={saving || !form.name.trim()} className="h-11">
                    {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creando...</> : "Crear con semana"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            // Edición: mantenemos modal simple y el editor semanal separado
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Nombre</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Plan Mediterráneo" />
                </div>
                <div>
                  <label className="text-sm font-medium">Calorías diarias</label>
                  <Input type="number" value={form.daily_calories} onChange={(e) => setForm({ ...form, daily_calories: Number(e.target.value) || 0 })} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Asignar a usuario (opcional)</label>
                  <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar (Plantilla)</SelectItem>
                      {users.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Descripción</label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción..." rows={3} />
                </div>
                <div className="md:col-span-2">
                  <div className="text-sm font-medium mb-2">Macros (%)</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Input type="number" value={form.protein} onChange={(e) => setForm({ ...form, protein: Number(e.target.value) || 0 })} /><div className="text-xs text-gray-500 mt-1">Proteína</div></div>
                    <div><Input type="number" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: Number(e.target.value) || 0 })} /><div className="text-xs text-gray-500 mt-1">Carbos</div></div>
                    <div><Input type="number" value={form.fat} onChange={(e) => setForm({ ...form, fat: Number(e.target.value) || 0 })} /><div className="text-xs text-gray-500 mt-1">Grasas</div></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={saving}>Cerrar</Button>
            {editingPlanId ? (
              <>
                <Button variant="outline" onClick={() => handleSaveEdit(true)} disabled={saving || !form.name.trim()}>
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : "Guardar y editar menú"}
                </Button>
                <Button onClick={() => handleSaveEdit(false)} disabled={saving || !form.name.trim()}>
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : "Guardar"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => handleCreate(true)} disabled={saving || !form.name.trim()}>
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creando...</> : "Crear y configurar menú"}
                </Button>
                <Button onClick={() => handleCreate(false)} disabled={saving || !form.name.trim()}>
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creando...</> : "Crear"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editor semanal */}
      <Dialog open={showWeeklyEditor} onOpenChange={setShowWeeklyEditor}>
        <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar menú semanal</DialogTitle>
            <DialogDescription>Configura días/comidas y añade opciones de recetas.</DialogDescription>
          </DialogHeader>
          {weeklyPlanId ? (
            <NutritionTemplatePlanEditor
              planId={weeklyPlanId}
              availableRecipes={availableRecipes}
              onSaved={async () => {
                await fetchPlans({ search: searchTerm, type: typeFilter, userId: userFilter })
              }}
              onClose={() => setShowWeeklyEditor(false)}
            />
          ) : (
            <div className="text-sm text-muted-foreground">Selecciona un plan.</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Selector de recetas para el builder de creación */}
      <Dialog open={showRecipeSelector} onOpenChange={setShowRecipeSelector}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Seleccionar receta</DialogTitle>
            <DialogDescription>Elige una receta ya creada para añadirla como opción en la comida.</DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar receta..." value={recipeSearch} onChange={(e) => setRecipeSearch(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filteredRecipes.map((r) => (
              <Button
                key={r.id}
                variant="outline"
                className="justify-start h-auto whitespace-normal"
                onClick={() => {
                  addRecipeToDraftMeal(r)
                  setShowRecipeSelector(false)
                }}
              >
                <div className="text-left">
                  <div className="font-medium text-sm">{fixEncoding(r.name)}</div>
                  <div className="text-xs text-muted-foreground">
                    {toNumber(r.calories)} kcal · P {toNumber(r.protein)} · C {toNumber(r.carbs)} · G {toNumber(r.fat)}
                  </div>
                </div>
              </Button>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecipeSelector(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicar a usuario */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicar plan a usuario</DialogTitle>
            <DialogDescription>Clona el plan (incluye menú semanal) y lo asigna al usuario seleccionado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-sm font-medium">Usuario destino</div>
            <Select value={duplicateUserId} onValueChange={setDuplicateUserId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecciona un usuario</SelectItem>
                {users.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicateDialog(false)} disabled={duplicating}>Cancelar</Button>
            <Button onClick={handleDuplicateToUser} disabled={duplicating || duplicateUserId === "none"}>
              {duplicating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Duplicando...</> : "Duplicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

