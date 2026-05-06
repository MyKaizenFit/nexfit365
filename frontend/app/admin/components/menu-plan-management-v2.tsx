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
import { Activity, ArrowDown, ArrowUp, CheckCircle, Copy, Download, Flame, Loader2, MoreHorizontal, Pencil, Plus, Search, Trash2, Upload, User, XCircle } from "lucide-react"
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
  goal_category?: string
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

interface ImportSummary {
  created?: number
  updated?: number
  skipped?: number
  rejected?: number
  error_count?: number
  errors?: string[]
}

interface GroupedImportError {
  message: string
  count: number
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
  { value: "lunch", label: "Almuerzo" },
  { value: "snack", label: "Merienda" },
  { value: "dinner", label: "Cena" },
]

const GOAL_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "lose_weight", label: "Perder peso" },
  { value: "gain_muscle", label: "Ganar músculo" },
  { value: "maintain", label: "Mantener peso" },
  { value: "body_recomposition", label: "Recomposición corporal" },
  { value: "performance", label: "Rendimiento deportivo" },
]

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

function formatImportError(error: unknown): string {
  if (typeof error === "string") return error
  if (typeof error === "number" || typeof error === "boolean") return String(error)
  if (!error || typeof error !== "object") return "Error desconocido"

  const e = error as Record<string, unknown>
  const structuredErrors = Array.isArray(e.errors)
    ? e.errors
        .map((item) => (typeof item === "string" ? item : formatImportError(item)))
        .filter((msg) => !!msg && msg !== "Error desconocido")
    : []

  const sheet = typeof e.sheet === "string" ? e.sheet : undefined
  const type = typeof e.type === "string" ? e.type : undefined
  const row = e.row ?? e.row_num ?? e.line ?? e.fila

  if (structuredErrors.length > 0) {
    const prefixParts: string[] = []
    if (sheet) prefixParts.push(sheet)
    if (type) prefixParts.push(type)
    if (row !== undefined && row !== null) prefixParts.push(`fila ${row}`)
    const prefix = prefixParts.length > 0 ? `${prefixParts.join(" · ")}: ` : ""
    return `${prefix}${structuredErrors.join(" | ")}`
  }

  const directMessage = e.message || e.error || e.detail || e.reason
  if (typeof directMessage === "string" && directMessage.trim()) return directMessage

  const field = e.field ?? e.column ?? e.campo
  const value = e.value ?? e.raw_value

  const parts: string[] = []
  if (row !== undefined && row !== null) parts.push(`Fila ${row}`)
  if (field !== undefined && field !== null) parts.push(`campo ${String(field)}`)
  if (value !== undefined && value !== null && String(value).trim()) parts.push(`valor ${String(value)}`)

  const fallback = JSON.stringify(error)
  if (parts.length > 0) return `${parts.join(" - ")}: ${fallback}`
  return fallback
}

function getCategory(plan: { is_system: boolean; user_id?: number | null; is_template: boolean; assigned_user_ids?: number[] }) {
  if ((plan.assigned_user_ids && plan.assigned_user_ids.length > 0) || plan.user_id) return "Usuario"
  if (plan.is_system) return "Sistema"
  if (plan.is_template) return "Plantilla"
  return "Plantilla"
}

function CategoryBadge({ plan }: { plan: { is_system: boolean; user_id?: number | null; is_template: boolean; assigned_user_ids?: number[] } }) {
  const cat = getCategory(plan)
  const variant = cat === "Usuario" ? "default" : cat === "Sistema" ? "secondary" : "outline"
  return <Badge variant={variant}>{cat}</Badge>
}

function getAssignedEmails(plan: { assigned_users?: Array<{ email: string }>; user_email?: string | null }) {
  if (Array.isArray(plan.assigned_users) && plan.assigned_users.length > 0) {
    return plan.assigned_users.map((u) => u.email)
  }
  return plan.user_email ? [plan.user_email] : []
}

function formatAssignedLabel(emails: string[]) {
  if (emails.length === 0) return "—"
  if (emails.length <= 2) return emails.join(", ")
  return `${emails[0]}, ${emails[1]} +${emails.length - 2}`
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
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Create/Edit dialog (unificado)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)
  const [createStep, setCreateStep] = useState<"basic" | "week">("basic")

  // Editor semanal embebido en el dialog de edición (no necesita estado propio)
  const [availableRecipes, setAvailableRecipes] = useState<AdminRecipe[]>([])

  // Draft del constructor semanal (tipo planes de entrenamiento)
  const [draftActiveDay, setDraftActiveDay] = useState<DayKey>("1")
  const [draftMeals, setDraftMeals] = useState<PlanMealDraft[]>([])
  const [showRecipeSelector, setShowRecipeSelector] = useState(false)
  const [recipeSearch, setRecipeSearch] = useState("")
  const [recipeGoalFilter, setRecipeGoalFilter] = useState("all")
  const [targetMealIndex, setTargetMealIndex] = useState<number | null>(null)

  // Duplicar a usuario
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [duplicateSourceId, setDuplicateSourceId] = useState<string | null>(null)
  const [duplicateUserId, setDuplicateUserId] = useState<string>("none")

    // Export / Import
    const [importDialogOpen, setImportDialogOpen] = useState(false)
    const [importFile, setImportFile] = useState<File | null>(null)
    const [importing, setImporting] = useState(false)
    const [importResult, setImportResult] = useState<ImportSummary | null>(null)

  const groupedImportErrors = useMemo<GroupedImportError[]>(() => {
    if (!importResult?.errors || importResult.errors.length === 0) return []
    const grouped = new Map<string, number>()
    for (const rawMessage of importResult.errors) {
      const message = (rawMessage || '').trim()
      if (!message) continue
      grouped.set(message, (grouped.get(message) ?? 0) + 1)
    }
    return Array.from(grouped.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
  }, [importResult])

  const [editSummary, setEditSummary] = useState<{ calories: number; protein: number; carbs: number; fat: number } | null>(null)

  const [form, setForm] = useState({
    name: "",
    description: "",
    assigned_user_ids: [] as string[],
    portion_multiplier: 1.0,
  })

  const resetForm = useCallback(() => {
    setForm({
      name: "",
      description: "",
      assigned_user_ids: [],
      portion_multiplier: 1.0,
    })
    setCreateStep("basic")
    setDraftActiveDay("1")
    setDraftMeals([])
    setShowRecipeSelector(false)
    setRecipeSearch("")
    setTargetMealIndex(null)
    setEditSummary(null)
  }, [])

  const openCreate = () => {
    setEditingPlanId(null)
    resetForm()
    setShowCreateDialog(true)
  }

    const handleExport = async (type: 'csv' | 'excel') => {
      try {
        const headers = await getAuthHeaders()
        const url = `${buildApiUrl(`admin/nutrition/plans/export-${type}/`)}?t=${Date.now()}`
        const response = await fetch(url, { method: 'GET', headers, cache: 'no-store' })
        if (!response.ok) throw new Error(`Error ${response.status}`)
        const blob = await response.blob()
        const link = document.createElement('a')
        link.href = window.URL.createObjectURL(blob)
        link.download = type === 'csv' ? 'planes_menu_export.csv' : 'planes_menu_export.xlsx'
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
      setImportResult(null)
      try {
        const headers = await getAuthHeaders()
        const formDataObj = new FormData()
        formDataObj.append('file', importFile)
        const fileType = importFile.name.endsWith('.xlsx') || importFile.name.endsWith('.xls') ? 'excel' : 'csv'
        const url = buildApiUrl(`admin/nutrition/plans/import-${fileType}/`)
        const token = (headers as Record<string, string>)['Authorization']
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Authorization': token },
          body: formDataObj,
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(data?.detail || data?.error || `Error ${response.status}`)
        }

        setImportResult({
          created: data?.created ?? 0,
          updated: data?.updated ?? 0,
          skipped: data?.skipped ?? 0,
          rejected: data?.rejected ?? 0,
          error_count: typeof data?.error_count === 'number' ? data.error_count : undefined,
          errors: Array.isArray(data?.errors) ? data.errors.map((e: unknown) => formatImportError(e)) : [],
        })

        fetchPlans({ search: searchTerm, type: typeFilter, userId: userFilter })
      } catch (error) {
        toast({ title: '❌ Error', description: error instanceof Error ? error.message : 'No se pudo importar', variant: 'destructive' })
      } finally {
        setImporting(false)
      }
    }

  const loadRecipes = useCallback(async () => {
    try {
      let headers = await getAuthHeaders()
      let nextUrl: string | null = buildApiUrl("admin/nutrition/recipes/?page_size=500")
      const allRecipes: AdminRecipe[] = []
      while (nextUrl) {
        let res: Response = await fetch(nextUrl, { headers })
        if (res.status === 401) {
          const newHeaders = await handle401AndRefresh(getAuthHeaders)
          if (!newHeaders) return
          headers = newHeaders
          res = await fetch(nextUrl, { headers })
        }
        if (!res.ok) return
        const data: Record<string, unknown> = await res.json()
        const list = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : [])
        allRecipes.push(...list)
        nextUrl = (data.next as string) || null
      }
      setAvailableRecipes(allRecipes)
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

  const totalPages = Math.max(1, Math.ceil(sortedPlans.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPlans = sortedPlans.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, typeFilter, userFilter])

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
      const userIds = form.assigned_user_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))
      const derivedDailyCalories = Math.round(computedPlanAverages.calories || 0)
      const derivedPercents = {
        protein: Math.round(computedPlanAverages.proteinPct || 0),
        carbs: Math.round(computedPlanAverages.carbsPct || 0),
        fat: Math.round(computedPlanAverages.fatPct || 0),
      }

      const mealsPayload = draftMeals.map((m) => {
        return {
        day_of_week: m.day_of_week,
        name: m.name,
        meal_type: m.meal_type,
        time: m.time,
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
        user_ids: userIds,
        meals: mealsPayload,
        portion_multiplier: form.portion_multiplier,
      })
      toast({ title: "✅ Plan creado", description: configureWeekly ? "Ahora configura el menú semanal." : "Creado correctamente." })
      setShowCreateDialog(false)
      await fetchPlans({ search: searchTerm, type: typeFilter, userId: userFilter })
      if (configureWeekly && created?.id) {
        await openEdit(String(created.id))
        setCreateStep("week")
      }
    } catch (e) {
      toast({ title: "❌ Error", description: e instanceof Error ? e.message : "No se pudo crear", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleEditWeekly = async (planId: string) => {
    await openEdit(planId)
    setCreateStep("week")
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
        user_ids: [userId],
        meals: Array.isArray(detail.meals) ? detail.meals.map((m: any) => ({
          day_of_week: m.day_of_week ?? null,
          name: m.name,
          meal_type: m.meal_type,
          time: m.time,
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
        await openEdit(String(created.id))
        setCreateStep("week")
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
    if (checked) setSelectedPlans(currentPlans.map((p) => p.id))
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
      setCreateStep("basic")
      setEditingPlanId(planId)
      const detail = await fetchPlanDetail(planId)
      if (!detail) throw new Error("No se pudo cargar el plan")
      const assignedIds = Array.isArray(detail.assigned_user_ids) && detail.assigned_user_ids.length > 0
        ? detail.assigned_user_ids
        : (detail.user_id ? [detail.user_id] : [])
      setForm({
        name: fixEncoding(detail.name || ""),
        description: fixEncoding(detail.description || ""),
        assigned_user_ids: assignedIds.map((id) => String(id)),
        portion_multiplier: (detail as any).portion_multiplier ?? 1.0,
      })
      setEditSummary({
        calories: Number(detail.daily_calories) || 0,
        protein: Number((detail as any).protein_grams ?? detail.protein_grams ?? 0) || 0,
        carbs: Number((detail as any).carbs_grams ?? detail.carbs_grams ?? 0) || 0,
        fat: Number((detail as any).fat_grams ?? detail.fat_grams ?? 0) || 0,
      })
      setShowCreateDialog(true)
    } catch (e) {
      toast({ title: "❌ Error", description: e instanceof Error ? e.message : "No se pudo abrir", variant: "destructive" })
      setEditingPlanId(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingPlanId) return
    try {
      setSaving(true)
      const userIds = form.assigned_user_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))
      await updatePlan(editingPlanId, {
        name: form.name.trim(),
        description: form.description || "",
        assigned_user_ids: userIds,
        portion_multiplier: form.portion_multiplier,
      })
      toast({ title: "✅ Plan actualizado" })
      setShowCreateDialog(false)
      await fetchPlans({ search: searchTerm, type: typeFilter, userId: userFilter })
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

  const missingDraftDays = useMemo(() => {
    const days = [1, 2, 3, 4, 5, 6, 7]
    return days.filter((day) => !draftMeals.some((m) => m.day_of_week === day))
  }, [draftMeals])

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

  const normalizeDraftMealOrder = (items: PlanMealDraft[], dayOfWeek: number) => {
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

  const moveDraftMeal = (meal: PlanMealDraft, direction: "up" | "down") => {
    setDraftMeals((prev) => {
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

  const removeDraftMeal = (indexInDraftMeals: number) => {
    setDraftMeals((prev) => {
      const removed = prev[indexInDraftMeals]
      const next = prev.filter((_, i) => i !== indexInDraftMeals)
      return removed ? normalizeDraftMealOrder(next, removed.day_of_week) : next
    })
  }

  const openRecipePickerForDraftMeal = (draftIndex: number) => {
    setTargetMealIndex(draftIndex)
    setRecipeSearch("")
    setRecipeGoalFilter("all")
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

  const computeDayTotals = useCallback((day: number) => {
    const meals = draftMeals.filter((m) => m.day_of_week === day)
    const totals = meals.reduce(
      (acc, m) => {
        const base = computeMealAverages(m)
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
  }, [computeMealAverages, draftMeals])

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
    return availableRecipes.filter((r) => {
      const matchesSearch = !q || (r.name || "").toLowerCase().includes(q)
      const matchesGoal = recipeGoalFilter === "all" || (r.goal_category || "") === recipeGoalFilter
      return matchesSearch && matchesGoal
    })
  }, [availableRecipes, recipeSearch, recipeGoalFilter])

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
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl md:text-3xl font-bold tracking-tight">Planes de Men&#250;s</h2>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Administra planes como en &#8220;Planes de entrenamiento&#8221;: filtros, tabla y acciones masivas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Exportar </span>CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
            <Download className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Exportar </span>Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Importar</span>
          </Button>
          <Button onClick={openCreate} className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white border-0">
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Nuevo Plan</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>
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
            <div className="text-2xl font-bold">{sortedPlans.filter((p) => (!p.assigned_user_ids || p.assigned_user_ids.length === 0) && !p.user_id && !p.is_system).length}</div>
          </CardContent>
        </Card>
        <Card className="hidden lg:block">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">De usuario</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sortedPlans.filter((p) => (p.assigned_user_ids && p.assigned_user_ids.length > 0) || p.user_id).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-5 md:gap-4">
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
                  <SelectItem value="base">Base (sistema + plantillas)</SelectItem>
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

      {loading && plans.length === 0 ? (
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
              <CardTitle>Planes de Menús</CardTitle>
              <div className="hidden md:flex items-center space-x-2">
                <Checkbox
                  checked={selectedPlans.length === currentPlans.length && currentPlans.length > 0}
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
                    checked={selectedPlans.length === currentPlans.length && currentPlans.length > 0}
                    onCheckedChange={(v) => handleSelectAll(Boolean(v))}
                  />
                  <span className="text-sm font-medium text-muted-foreground">Seleccionar todos</span>
                </div>
                <span className="text-xs text-muted-foreground">{selectedPlans.length} seleccionados</span>
              </div>

              {currentPlans.map((p) => (
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
                            <span className="truncate">{formatAssignedLabel(getAssignedEmails(p))}</span>
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
                    {currentPlans.map((p) => (
                      <tr key={p.id} className="border-t hover:bg-muted/50">
                        <td className="p-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox checked={selectedPlans.includes(p.id)} onCheckedChange={(v) => handleSelectPlan(p.id, Boolean(v))} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="font-medium truncate max-w-[420px]">{fixEncoding(p.name)}</div>
                                <CategoryBadge plan={p} />
                                {getAssignedEmails(p).length > 0 && (
                                  <Badge variant="outline" className="truncate max-w-[220px]">
                                    <User className="w-3 h-3 mr-1" />
                                    {formatAssignedLabel(getAssignedEmails(p))}
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

            {sortedPlans.length > 0 && (
              <div className="border-t p-3 md:p-4">
                <div className="md:hidden space-y-3">
                  <div className="text-xs text-center text-muted-foreground">
                    Página {currentPage} de {totalPages} • {sortedPlans.length} planes
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="flex-1 text-xs"
                    >
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
                    </Button>
                  </div>
                </div>

                <div className="hidden md:flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {startIndex + 1} - {Math.min(endIndex, sortedPlans.length)} de {sortedPlans.length} planes
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Nombre</label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Plan Mediterráneo" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Asignar a usuarios (opcional)</label>
                    <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                      {users.length === 0 ? (
                        <div className="text-xs text-muted-foreground">No hay usuarios cargados.</div>
                      ) : (
                        users.map((u) => {
                          const checked = form.assigned_user_ids.includes(String(u.id))
                          return (
                            <label key={u.id} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => {
                                  const isChecked = Boolean(v)
                                  setForm((prev) => ({
                                    ...prev,
                                    assigned_user_ids: isChecked
                                      ? Array.from(new Set([...prev.assigned_user_ids, String(u.id)]))
                                      : prev.assigned_user_ids.filter((id) => id !== String(u.id)),
                                  }))
                                }}
                              />
                              <span className="truncate">{u.email}</span>
                            </label>
                          )
                        })
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">Si no seleccionas usuarios, se guarda como plantilla.</div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Descripción</label>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción..." rows={3} />
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm font-medium mb-2">Resumen diario estimado</div>
                    <div className="text-xs text-muted-foreground">
                      {computedPlanAverages.calories > 0 ? (
                        <div>
                          {Math.round(computedPlanAverages.calories)} kcal · P {Math.round(computedPlanAverages.protein)}g · C {Math.round(computedPlanAverages.carbs)}g · G {Math.round(computedPlanAverages.fat)}g
                        </div>
                      ) : (
                        <div>Añade recetas en la semana para calcular el total.</div>
                      )}
                    </div>
                  </div>
                  
                  {/* Multiplicador de porciones */}
                  <div className="md:col-span-2">
                    <div className="text-sm font-medium mb-2">Multiplicador de porciones</div>
                    <div className="flex items-center gap-4">
                      <Select 
                        value={form.portion_multiplier.toString()} 
                        onValueChange={(v) => setForm({ ...form, portion_multiplier: parseFloat(v) })}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.75">0.75x (Déficit alto)</SelectItem>
                          <SelectItem value="0.85">0.85x (Pérdida de peso)</SelectItem>
                          <SelectItem value="1.0">1.0x (Mantenimiento)</SelectItem>
                          <SelectItem value="1.1">1.1x (Ganancia leve)</SelectItem>
                          <SelectItem value="1.15">1.15x (Ganancia muscular)</SelectItem>
                          <SelectItem value="1.25">1.25x (Volumen)</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">
                        Ajusta las porciones de recetas según el objetivo
                      </span>
                    </div>
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
                    {draftMealsForDay.map((meal, mealPosition) => {
                      const draftIndex = draftMeals.findIndex((m) => m === meal)
                      const computed = computeMealAverages(meal)
                      const range = computeMealRange(meal)
                      const canMoveUp = mealPosition > 0
                      const canMoveDown = mealPosition < draftMealsForDay.length - 1
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
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={() => moveDraftMeal(meal, "up")} disabled={!canMoveUp} title="Subir comida">
                                  <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => moveDraftMeal(meal, "down")} disabled={!canMoveDown} title="Bajar comida">
                                  <ArrowDown className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => removeDraftMeal(draftIndex)} title="Eliminar comida">
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
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

                            <div className="text-xs text-muted-foreground">
                              {range ? (
                                <>
                                  {range.count > 1 ? "Rango por opciones" : "Valores calculados"}: {formatRange(range.calories.min, range.calories.max)} kcal · P {formatRange(range.protein.min, range.protein.max, 1)} · C {formatRange(range.carbs.min, range.carbs.max, 1)} · G {formatRange(range.fat.min, range.fat.max, 1)}
                                </>
                              ) : (
                                <>Sin recetas, no hay macros calculados.</>
                              )}
                            </div>

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
                                        {r.goal_category && (
                                          <div className="mt-1">
                                            <Badge variant="secondary" className="text-[10px]">
                                              {GOAL_OPTIONS.find(option => option.value === r.goal_category)?.label || r.goal_category}
                                            </Badge>
                                          </div>
                                        )}
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

                {missingDraftDays.length > 0 && (
                  <div className="text-xs text-amber-600">
                    Faltan comidas en: {missingDraftDays.map((d) => DAY_LABELS[String(d) as DayKey]).join(", ")}
                  </div>
                )}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button variant="outline" onClick={() => setCreateStep("basic")} className="h-11">← Volver</Button>
                  <Button onClick={() => handleCreate(false)} disabled={saving || !form.name.trim() || missingDraftDays.length > 0} className="h-11">
                    {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creando...</> : "Crear con semana"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            // Edición: tabs Datos / Comidas con editor semanal embebido
            <Tabs value={createStep} onValueChange={(v) => setCreateStep(v as any)}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="basic">Datos</TabsTrigger>
                <TabsTrigger value="week">Comidas</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Nombre</label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Plan Mediterráneo" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Asignar a usuarios (opcional)</label>
                    <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                      {users.length === 0 ? (
                        <div className="text-xs text-muted-foreground">No hay usuarios cargados.</div>
                      ) : (
                        users.map((u) => {
                          const checked = form.assigned_user_ids.includes(String(u.id))
                          return (
                            <label key={u.id} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => {
                                  const isChecked = Boolean(v)
                                  setForm((prev) => ({
                                    ...prev,
                                    assigned_user_ids: isChecked
                                      ? Array.from(new Set([...prev.assigned_user_ids, String(u.id)]))
                                      : prev.assigned_user_ids.filter((id) => id !== String(u.id)),
                                  }))
                                }}
                              />
                              <span className="truncate">{u.email}</span>
                            </label>
                          )
                        })
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">Si no seleccionas usuarios, se guarda como plantilla.</div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Descripción</label>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción..." rows={3} />
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm font-medium mb-2">Multiplicador de porciones</div>
                    <div className="flex items-center gap-4">
                      <Select
                        value={form.portion_multiplier.toString()}
                        onValueChange={(v) => setForm({ ...form, portion_multiplier: parseFloat(v) })}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.75">0.75x (Déficit alto)</SelectItem>
                          <SelectItem value="0.85">0.85x (Pérdida de peso)</SelectItem>
                          <SelectItem value="1.0">1.0x (Mantenimiento)</SelectItem>
                          <SelectItem value="1.1">1.1x (Ganancia leve)</SelectItem>
                          <SelectItem value="1.15">1.15x (Ganancia muscular)</SelectItem>
                          <SelectItem value="1.25">1.25x (Volumen)</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">
                        Ajusta las porciones de recetas según el objetivo
                      </span>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm font-medium mb-2">Resumen diario actual</div>
                    <div className="text-xs text-muted-foreground">
                      {editSummary ? (
                        <div>
                          {Math.round(editSummary.calories)} kcal · P {Math.round(editSummary.protein)}g · C {Math.round(editSummary.carbs)}g · G {Math.round(editSummary.fat)}g
                        </div>
                      ) : (
                        <div>Sin datos de macros.</div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="week">
                <NutritionTemplatePlanEditor
                  planId={editingPlanId!}
                  availableRecipes={availableRecipes}
                  onSaved={async () => {
                    await fetchPlans({ search: searchTerm, type: typeFilter, userId: userFilter })
                  }}
                  onClose={() => setShowCreateDialog(false)}
                />
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={saving}>Cerrar</Button>
            {editingPlanId ? (
              createStep === "basic" ? (
                <>
                  <Button variant="outline" onClick={() => setCreateStep("week")} disabled={saving}>
                    Editar comidas →
                  </Button>
                  <Button onClick={() => handleSaveEdit()} disabled={saving || !form.name.trim()}>
                    {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : "Guardar"}
                  </Button>
                </>
              ) : null
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

          <div>
            <FormLabel>Objetivo</FormLabel>
            <Select value={recipeGoalFilter} onValueChange={setRecipeGoalFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                {GOAL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  <div className="flex flex-wrap gap-1 mt-1">
                    {r.category && (
                      <Badge variant="outline" className="text-[10px]">
                        {r.category}
                      </Badge>
                    )}
                    {r.goal_category && (
                      <Badge variant="secondary" className="text-[10px]">
                        {GOAL_OPTIONS.find(option => option.value === r.goal_category)?.label || r.goal_category}
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

      {/* Import Dialog */}
      <Dialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          setImportDialogOpen(open)
          if (!open) {
            setImportFile(null)
            setImportResult(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>📥 Importar Planes de Menús</DialogTitle>
            <DialogDescription>
              Sube un archivo CSV o Excel para importar o actualizar planes. Los planes existentes se actualizarán si el nombre coincide.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <FormLabel className="font-semibold">Selecciona el archivo</FormLabel>
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
                <strong>💡 Tip:</strong> El formato esperado incluye campos como: nombre, descripción, objetivo, tipo_dieta, calorías_diarias, proteínas, carbohidratos, grasas, es_plantilla, activo...
              </p>
            </div>

            {importResult && (
              <div className="border rounded-lg p-4 space-y-1 text-sm">
                <p className="font-semibold text-green-700">Resultado de la importación</p>

                <p>✅ Creadas: <strong>{importResult.created ?? 0}</strong></p>
                <p>🔄 Actualizadas: <strong>{importResult.updated ?? 0}</strong></p>
                <p>⏭️ Omitidas: <strong>{importResult.skipped ?? 0}</strong></p>
                <p>⛔ Rechazadas: <strong>{importResult.rejected ?? 0}</strong></p>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-red-600 font-medium">Errores ({importResult.error_count ?? importResult.errors.length}):</p>
                    <ul className="list-disc list-inside text-red-500 space-y-0.5 max-h-56 overflow-y-auto overflow-x-hidden pr-2 border border-red-100 rounded-md p-2 bg-red-50/40 text-xs">
                      {groupedImportErrors.map((item, idx) => (
                        <li key={idx} className="break-words whitespace-normal">
                          {item.count > 1 ? `(${item.count}x) ` : ''}{item.message}
                        </li>
                      ))}
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

    </div>
  )
}
