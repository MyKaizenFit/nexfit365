"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast"
import { useAdminWorkoutPlans, WorkoutPlan, Exercise, WorkoutDay } from "@/hooks/use-admin-workout-plans"
import { authenticatedFetch } from "@/lib/api"
import {
  Dumbbell,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Crown,
  Star,
  Clock,
  Calendar,
  Users,
  Activity,
  Copy,
  UserPlus,
  GripVertical,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Download,
  Upload,
  Shield,
  ChevronUp,
  ChevronDown,
  X
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label as FormLabel } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fixEncoding } from "@/lib/encoding-fix"
import { WorkoutTemplatePlanEditor } from "./workout-template-plan-editor"

interface WorkoutImportStats {
  plans?: { created?: number; updated?: number; skipped?: number }
  days?: { created?: number; updated?: number; skipped?: number }
  exercises?: { created?: number; updated?: number; skipped?: number }
  substitutes?: { created?: number; updated?: number; skipped?: number }
}

interface WorkoutImportSummary {
  message?: string
  created: number
  updated: number
  skipped: number
  rejected: number
  error_count: number
  errors: string[]
  stats?: WorkoutImportStats
}

interface GroupedImportError {
  message: string
  count: number
}

function formatImportError(error: unknown): string {
  if (typeof error === "string") return error
  if (typeof error === "number" || typeof error === "boolean") return String(error)
  if (!error || typeof error !== "object") return "Error desconocido"

  const obj = error as Record<string, unknown>
  const rawMessage = obj.message || obj.error || obj.detail || obj.reason
  if (typeof rawMessage === "string" && rawMessage.trim()) return rawMessage

  const errors = Array.isArray(obj.errors)
    ? obj.errors
      .map((item) => (typeof item === "string" ? item : formatImportError(item)))
      .filter((msg) => !!msg && msg !== "Error desconocido")
    : []

  if (errors.length > 0) return errors.join(" | ")

  return JSON.stringify(error)
}

async function readImportError(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") || ""

  if (contentType.includes("application/json")) {
    try {
      const data = await response.json()
      const message = formatImportError(data)
      if (message && message !== "{}") return message
    } catch { }
  }

  const text = await response.text()
  if (text.trim()) return text

  if (response.status === 413) {
    return "El archivo es demasiado grande para subirlo. Reduce el tamaño del Excel o aumenta el límite del servidor."
  }

  if (response.status === 502 || response.status === 503 || response.status === 504) {
    return "El servidor ha cortado la importación antes de terminar. Suele pasar con Excel grandes o importaciones lentas."
  }

  return `Error al importar (HTTP ${response.status})`
}

function formatImportRequestError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message || ""
    if (message.toLowerCase().includes("failed to fetch")) {
      return "No se pudo conectar con el servidor durante la subida. Si el Excel es grande, probablemente se superó el límite o el tiempo máximo de importación."
    }
    return message
  }

  return "No se pudo importar"
}

function totalizeImportStats(stats?: WorkoutImportStats) {
  const plans = stats?.plans || {}
  const days = stats?.days || {}
  const exercises = stats?.exercises || {}
  const substitutes = stats?.substitutes || {}

  const created = (plans.created || 0) + (days.created || 0) + (exercises.created || 0) + (substitutes.created || 0)
  const updated = (plans.updated || 0) + (days.updated || 0) + (exercises.updated || 0) + (substitutes.updated || 0)
  const skipped = (plans.skipped || 0) + (days.skipped || 0) + (exercises.skipped || 0) + (substitutes.skipped || 0)

  return { created, updated, skipped }
}

function getNextCopyName(baseName: string, existingNames: string[]) {
  const normalized = baseName.trim()
  const namesSet = new Set(existingNames.map((n) => (n || "").trim().toLowerCase()))

  const firstCopy = `${normalized} (Copia)`
  if (!namesSet.has(firstCopy.toLowerCase())) return firstCopy

  let copyIndex = 2
  while (namesSet.has(`${normalized} (Copia ${copyIndex})`.toLowerCase())) {
    copyIndex += 1
  }

  return `${normalized} (Copia ${copyIndex})`
}

function normalizeDateLikeWorkoutText(value: unknown) {
  const text = String(value ?? "").trim()
  const isoDate = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T]00:00:00)?$/)
  if (isoDate) return `${Number(isoDate[3])}-${Number(isoDate[2])}`

  const slashDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(?:\d{2}|\d{4})$/)
  if (slashDate) return `${Number(slashDate[1])}-${Number(slashDate[2])}`

  return text
}

function cloneWorkoutDay(day: any, suffix: string) {
  return {
    ...day,
    id: `${Date.now()}-${suffix}`,
    exercises: Array.isArray(day?.exercises)
      ? day.exercises.map((exercise: any, index: number) => ({
          ...exercise,
          order: index,
        }))
      : [],
  }
}

function normalizeWorkoutDaysOrder(days: any[]) {
  return (Array.isArray(days) ? days : [])
    .filter(Boolean)
    .map((day, index) => ({
      ...day,
      day_number: index + 1,
      exercises: Array.isArray(day.exercises)
        ? day.exercises.map((exercise: any, exerciseIndex: number) => ({
            ...exercise,
            reps: normalizeDateLikeWorkoutText(exercise.reps || "10"),
            order: exerciseIndex,
          }))
        : [],
    }))
}

function normalizeWorkoutExercisesOrder(exercises: any[]) {
  return (Array.isArray(exercises) ? exercises : [])
    .filter(Boolean)
    .map((exercise, index) => ({
      ...exercise,
      order: index,
    }))
}

function getWorkoutExerciseOrder(exercise: any, fallback: number) {
  const rawOrder = exercise?.order_index ?? exercise?.order ?? fallback
  const order = Number(rawOrder)
  return Number.isFinite(order) ? order : fallback
}

export function WorkoutPlanManagement() {
  const editorRef = useRef<{ handleSave: () => Promise<void> }>(null)
  const {
    plans,
    exercises,
    stats,
    loading,
    error,
    currentPage,
    totalCount,
    totalPages,
    filters: serverFilters,
    updateFilters,
    changePage,
    createPlan,
    updatePlan,
    deletePlan,
    togglePlanActive,
    setAsDefault,
    bulkToggleActive,
    bulkDelete,
    fetchPlanDetail,
    refetch
  } = useAdminWorkoutPlans({ is_template: true })

  const [loadingDetail, setLoadingDetail] = useState(false)

  const [selectedPlans, setSelectedPlans] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all")
  const [goalFilter, setGoalFilter] = useState<string>("all")
  const [locationFilter, setLocationFilter] = useState<string>("all")
  const [userFilter, setUserFilter] = useState<string>("all")
  const [planTypeFilter, setPlanTypeFilter] = useState<string>("templates") // all | templates | users
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null)
  const [isViewMode, setIsViewMode] = useState(false) // Modo solo lectura
  const [isLoading, setIsLoading] = useState(false)
  const [copyingPlanId, setCopyingPlanId] = useState<string | null>(null)
  const [showAssignUserDialog, setShowAssignUserDialog] = useState(false)
  const [assignUserSourceId, setAssignUserSourceId] = useState<string | null>(null)
  const [assignUserTargetId, setAssignUserTargetId] = useState<string>("none")
  const [assigningToUser, setAssigningToUser] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importResult, setImportResult] = useState<WorkoutImportSummary | null>(null)

  // Estados para flujo de dos pasos (similar a menu-plan-management-v2)
  const [createStep, setCreateStep] = useState<"basic" | "exercises">("basic")
  const [showWorkoutEditor, setShowWorkoutEditor] = useState(false)
  const [workoutEditorPlanId, setWorkoutEditorPlanId] = useState<string | null>(null)

  const [usersList, setUsersList] = useState<Array<{ id: string; email: string }>>([])

  // Estados para edición de respaldos en planes existentes
  const [showSubstitutesDialog, setShowSubstitutesDialog] = useState(false)
  const [substitutesExerciseId, setSubstitutesExerciseId] = useState<string | null>(null)
  const [substitutesExerciseName, setSubstitutesExerciseName] = useState("")
  const [substitutes, setSubstitutes] = useState<any[]>([])
  const [loadingSubstitutes, setLoadingSubstitutes] = useState(false)
  const [substituteSearch, setSubstituteSearch] = useState("")

  // Ordenamiento (cliente - solo para los 50 planes cargados)
  const [sortColumn, setSortColumn] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Estados para el formulario de creación/edición
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    duration_weeks: 4,
    min_role_required: 'basic' as 'basic' | 'pro' | 'premium' | 'admin',
    estimated_duration_minutes: 60,
    assigned_users: [] as string[] // Array de IDs de usuarios (permite asignar a múltiples)
  })

  // Cargar usuarios para filtros/asignación
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const resp = await authenticatedFetch('admin/users/?page=1&page_size=500')
        if (!resp.ok) return
        const data = await resp.json()
        const results = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : [])
        const mapped = results
          .filter((u: any) => u && (u.id || u.pk) && u.email)
          .map((u: any) => ({ id: String(u.id || u.pk), email: String(u.email) }))
        setUsersList(mapped)
      } catch {
        // ignore
      }
    }
    loadUsers()
  }, [])

  const [workoutDays, setWorkoutDays] = useState<Array<{
    id: string
    day_name: string
    day_number: number
    is_rest_day: boolean
    notes: string
    exercises: Array<{
      exercise_id: string  // UUID
      exercise_name?: string  // Nombre para mostrar
      sets: number
      reps: string | number
      weight?: number
      duration?: number
      rest_time?: number
      notes: string
      order: number
      substitutes?: Array<{
        id: number
        substitute_id: string
        substitute_name: string
        category?: string
        priority: number
        notes: string
      }>
    }>
  }>>([
    {
      id: '1',
      day_name: 'Día 1 - Tren Superior',
      day_number: 1,
      is_rest_day: false,
      notes: '',
      exercises: []
    }
  ])

  // Estado para el selector múltiple de ejercicios
  const [selectedExercisesForDay, setSelectedExercisesForDay] = useState<{ [dayId: string]: string[] }>({})
  const [showExerciseSelector, setShowExerciseSelector] = useState<{ [dayId: string]: boolean }>({})

  // Estados para búsqueda y filtros de ejercicios
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState<{ [dayId: string]: string }>({})
  const [exerciseCategoryFilter, setExerciseCategoryFilter] = useState<{ [dayId: string]: string }>({})
  const [exerciseMuscleFilter, setExerciseMuscleFilter] = useState<{ [dayId: string]: string }>({})

  const workoutWeekGroups = useMemo(() => {
    const daysArray = Array.isArray(workoutDays) ? workoutDays.filter(Boolean) : []
    const groups: Array<{ weekIndex: number; days: typeof workoutDays }> = []
    for (let index = 0; index < daysArray.length; index += 7) {
      groups.push({
        weekIndex: Math.floor(index / 7),
        days: daysArray.slice(index, index + 7),
      })
    }
    return groups
  }, [workoutDays])

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

  // Aplicar filtros del servidor y ordenamiento local - asegurar que plans sea un array
  const plansArray = Array.isArray(plans) ? plans : []
  const filteredPlans = plansArray.filter((plan) => {
    if (!plan) return false
    // Filtro de ubicación (cliente porque no está en el backend)
    if (locationFilter !== "all") {
      const normalizedLocation = String((plan as any).location || '').toLowerCase()
      const isHome = normalizedLocation === 'home' || fixEncoding(plan.name || '').toLowerCase().includes('casa')
      const isGym = normalizedLocation === 'gym' || fixEncoding(plan.name || '').toLowerCase().includes('gimnasio')
      if (locationFilter === "home" && !isHome) return false
      if (locationFilter === "gym" && !isGym) return false
    }
    return true
  })

  // Ordenamiento - asegurar que filteredPlans sea un array
  const sortedPlans = Array.isArray(filteredPlans) ? [...filteredPlans].sort((a, b) => {
    if (!a || !b) return 0
    let aValue: any
    let bValue: any

    switch (sortColumn) {
      case 'name':
        aValue = (a.name || '').toLowerCase()
        bValue = (b.name || '').toLowerCase()
        break
      case 'role':
        // Usamos la columna "role" como "Categoría" (Sistema / Plantilla / Usuario)
        aValue = getPlanCategory(a)
        bValue = getPlanCategory(b)
        break
      case 'difficulty':
        aValue = a.difficulty || ''
        bValue = b.difficulty || ''
        break
      case 'duration':
        aValue = a.duration_weeks || 0
        bValue = b.duration_weeks || 0
        break
      case 'status':
        aValue = a.is_active ? 1 : 0
        bValue = b.is_active ? 1 : 0
        break
      default:
        return 0
    }

    if (typeof aValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    } else {
      return sortDirection === 'asc'
        ? (aValue - bValue)
        : (bValue - aValue)
    }
  }) : []

  // Usar todos los planes ordenados (ya vienen paginados del servidor)
  const currentPlans = sortedPlans

  // Función para cambiar el ordenamiento
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Aplicar filtros del servidor cuando cambian
  useEffect(() => {
    const normalizedServer = {
      search: serverFilters.search || '',
      difficulty: serverFilters.difficulty || 'all',
      goal: serverFilters.goal || 'all',
      min_role_required: serverFilters.min_role_required || 'all',
      user: serverFilters.user || 'all',
      is_template: serverFilters.is_template,
    }

    const desiredTemplateFilter =
      planTypeFilter === 'templates' ? true :
        planTypeFilter === 'users' ? false :
          undefined

    const filtersAlreadyApplied =
      normalizedServer.search === searchTerm &&
      normalizedServer.difficulty === difficultyFilter &&
      normalizedServer.goal === goalFilter &&
      normalizedServer.min_role_required === roleFilter &&
      normalizedServer.user === userFilter &&
      normalizedServer.is_template === desiredTemplateFilter

    if (filtersAlreadyApplied) {
      return
    }

    const newFilters = {
      search: searchTerm,
      difficulty: difficultyFilter,
      goal: goalFilter,
      min_role_required: roleFilter,
      user: userFilter !== 'all' ? userFilter : undefined,
      is_template: desiredTemplateFilter,
    }

    // Debounce para búsqueda
    if (searchTerm !== normalizedServer.search) {
      const timer = setTimeout(() => {
        updateFilters(newFilters)
      }, 500)
      return () => clearTimeout(timer)
    } else {
      updateFilters(newFilters)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, roleFilter, difficultyFilter, goalFilter, locationFilter, userFilter, planTypeFilter, serverFilters])

  function getPlanCategory(plan: any) {
    if (!plan) return "Desconocido"
    if (Array.isArray(plan.assigned_user_ids) && plan.assigned_user_ids.length > 0) return "Usuario"
    if (plan.user && !plan.is_template && !plan.is_system) return "Usuario"
    if (plan.is_system) return "Sistema"
    if (plan.is_template) return "Plantilla"
    return "Otro"
  }

  function getCategoryBadge(plan: any) {
    const category = getPlanCategory(plan)
    switch (category) {
      case "Usuario":
        return <Badge className="bg-teal-100 text-teal-800 border-0">Usuario</Badge>
      case "Sistema":
        return <Badge className="bg-purple-100 text-purple-800 border-0">Sistema</Badge>
      case "Plantilla":
        return <Badge className="bg-gray-100 text-gray-800 border-0">Plantilla</Badge>
      default:
        return <Badge variant="outline">{category}</Badge>
    }
  }

  function getPlanUserReference(plan: any) {
    return plan?.user_email || plan?.created_by_email || null
  }

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return <Badge className="bg-green-100 text-green-800 border-0">Principiante</Badge>
      case "intermediate":
        return <Badge className="bg-yellow-100 text-yellow-800 border-0">Intermedio</Badge>
      case "advanced":
        return <Badge className="bg-red-100 text-red-800 border-0">Avanzado</Badge>
      default:
        return <Badge variant="outline">{difficulty}</Badge>
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPlans(Array.isArray(currentPlans) ? currentPlans.map(plan => plan?.id).filter(Boolean) : [])
    } else {
      setSelectedPlans([])
    }
  }

  const handleSelectPlan = (planId: string, checked: boolean) => {
    if (checked) {
      setSelectedPlans(prev => {
        const prevArray = Array.isArray(prev) ? prev : []
        return [...prevArray, planId]
      })
    } else {
      setSelectedPlans(prev => {
        const prevArray = Array.isArray(prev) ? prev : []
        return prevArray.filter(id => id !== planId)
      })
    }
  }

  const handleToggleActive = async (planId: string) => {
    try {
      setIsLoading(true)
      await togglePlanActive(planId)
      toast({
        title: "✅ Estado actualizado",
        description: "El estado del plan ha sido actualizado correctamente",
      })
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al actualizar estado",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetAsDefault = async (planId: string) => {
    try {
      setIsLoading(true)
      await setAsDefault(planId)
      toast({
        title: "✅ Plan por defecto",
        description: "El plan ha sido establecido como por defecto",
      })
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al establecer plan por defecto",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (planId: string) => {
    try {
      setIsLoading(true)
      await deletePlan(planId)
      toast({
        title: "✅ Plan eliminado",
        description: "El plan ha sido eliminado correctamente",
      })
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al eliminar plan",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkToggleActive = async (isActive: boolean) => {
    if (selectedPlans.length === 0) {
      toast({
        title: "❌ Error",
        description: "Selecciona al menos un plan",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      await bulkToggleActive(selectedPlans, isActive)
      toast({
        title: "✅ Estados actualizados",
        description: `${selectedPlans.length} planes actualizados`,
      })
      setSelectedPlans([])
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al actualizar estados",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedPlans.length === 0) {
      toast({
        title: "❌ Error",
        description: "Selecciona al menos un plan",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      await bulkDelete(selectedPlans)
      toast({
        title: "✅ Planes eliminados",
        description: `${selectedPlans.length} planes eliminados`,
      })
      setSelectedPlans([])
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al eliminar planes",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // --- Exportación CSV y Excel ---
  const handleExportCSV = async () => {
    try {
      const response = await authenticatedFetch(`admin/workouts/workouts/export_csv/?t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Error al exportar CSV');
      }

      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = 'workout_plans_export.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: '✅ Exportación CSV', description: 'Archivo descargado correctamente.' });
    } catch (error) {
      toast({ title: '❌ Error', description: error instanceof Error ? error.message : 'No se pudo exportar el CSV', variant: 'destructive' });
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await authenticatedFetch(`admin/workouts/workouts/export_excel/?t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Error al exportar Excel');
      }

      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = 'workout_plans_export.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: '✅ Exportación Excel', description: 'Archivo descargado correctamente.' });
    } catch (error) {
      toast({ title: '❌ Error', description: error instanceof Error ? error.message : 'No se pudo exportar el Excel', variant: 'destructive' });
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportFile(file);
  };

  const handleImport = async () => {
    const file = importFile;
    if (!file) return;

    setImporting(true);

    try {
      const endpoint = (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))
        ? 'admin/workouts/workouts/import_excel/'
        : 'admin/workouts/workouts/import_csv/';

      const formData = new FormData();
      formData.append('file', file);

      // No enviar Content-Type manualmente: el navegador añade el boundary multipart
      const response = await authenticatedFetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await readImportError(response));
      }

      let data = null;
      try {
        data = await response.json();
      } catch { }

      const stats = (data?.stats && typeof data.stats === 'object') ? data.stats as WorkoutImportStats : undefined
      const totals = totalizeImportStats(stats)
      const planStats = stats?.plans
      const formattedErrors = Array.isArray(data?.errors) ? data.errors.map((e: unknown) => formatImportError(e)) : []

      setImportResult({
        message: data?.message || 'Importación completada',
        created: typeof planStats?.created === 'number' ? planStats.created : totals.created,
        updated: typeof planStats?.updated === 'number' ? planStats.updated : totals.updated,
        skipped: typeof planStats?.skipped === 'number' ? planStats.skipped : totals.skipped,
        rejected: formattedErrors.length,
        error_count: formattedErrors.length,
        errors: formattedErrors,
        stats,
      })

      refetch();
    } catch (error) {
      setImportResult(null)
      toast({
        title: '❌ Error',
        description: formatImportRequestError(error),
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
    }
  };

  // Funciones para manejar el formulario
  const handleFormChange = (field: string, value: any) => {
    if (isViewMode) return
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addWorkoutDay = () => {
    if (isViewMode) return
    const newDayNumber = workoutDays.length + 1
    setWorkoutDays(prev => normalizeWorkoutDaysOrder([...prev, {
      id: Date.now().toString(),
      day_name: `Día ${newDayNumber}`,
      day_number: newDayNumber,
      is_rest_day: false,
      notes: '',
      exercises: []
    }]))
  }

  const addWorkoutWeek = () => {
    if (isViewMode) return
    const currentLength = Array.isArray(workoutDays) ? workoutDays.length : 0
    const nextWeekNumber = Math.floor(currentLength / 7) + 1
    const newDays = Array.from({ length: 7 }, (_, index) => {
      const dayNumber = currentLength + index + 1
      return {
        id: `${Date.now()}-week-${nextWeekNumber}-${index}`,
        day_name: `Semana ${nextWeekNumber} - Día ${index + 1}`,
        day_number: dayNumber,
        is_rest_day: index > 2,
        notes: '',
        exercises: [],
      }
    })
    setWorkoutDays(prev => normalizeWorkoutDaysOrder([...(Array.isArray(prev) ? prev : []), ...newDays]))
    setFormData(prev => ({ ...prev, duration_weeks: Math.max(prev.duration_weeks || 1, nextWeekNumber) }))
  }

  const removeWorkoutDay = (dayId: string) => {
    if (isViewMode) return
    const daysArray = Array.isArray(workoutDays) ? workoutDays : []
    if (daysArray.length > 1) {
      setWorkoutDays(prev => {
        const prevArray = Array.isArray(prev) ? prev : []
        return normalizeWorkoutDaysOrder(prevArray.filter(day => day && day.id !== dayId))
      })
    }
  }

  const updateWorkoutDay = (dayId: string, field: string, value: any) => {
    if (isViewMode) return
    setWorkoutDays(prev => {
      const prevArray = Array.isArray(prev) ? prev : []
      return prevArray.map(day =>
        day && day.id === dayId ? { ...day, [field]: value } : day
      )
    })
  }

  const addExerciseToDay = (dayId: string, exerciseId: string) => {
    if (isViewMode) return
    const exercisesArray = Array.isArray(exercises) ? exercises : []
    const exercise = exercisesArray.find(e => String(e.id) === String(exerciseId))
    if (!exercise) return

    const workoutDaysArray = Array.isArray(workoutDays) ? workoutDays : []
    const targetDay = workoutDaysArray.find(d => d && d.id === dayId)
    const dayExercises = Array.isArray(targetDay?.exercises) ? targetDay.exercises : []

    const newExercise = {
      exercise_id: String(exerciseId),
      exercise_name: exercise.name,  // Guardar nombre para mostrar
      sets: 3,
      reps: '10',
      weight: 0,
      duration: 0,
      rest_time: 60,
      notes: '',
      order: dayExercises.length || 0
    }

    setWorkoutDays(prev => {
      const prevArray = Array.isArray(prev) ? prev : []
      return prevArray.map(day => {
        if (!day) return day
        if (day.id === dayId) {
          const exercisesArray = Array.isArray(day.exercises) ? day.exercises : []
          return { ...day, exercises: normalizeWorkoutExercisesOrder([...exercisesArray, newExercise]) }
        }
        return day
      })
    })
  }

  // Funciones para el selector múltiple de ejercicios
  const toggleExerciseSelector = (dayId: string) => {
    if (isViewMode) return
    setShowExerciseSelector(prev => ({
      ...prev,
      [dayId]: !prev[dayId]
    }))
  }

  const toggleExerciseSelection = (dayId: string, exerciseId: string) => {
    if (isViewMode) return
    setSelectedExercisesForDay(prev => {
      const current = Array.isArray(prev[dayId]) ? prev[dayId] : []
      const isSelected = Array.isArray(current) && current.includes(exerciseId)

      return {
        ...prev,
        [dayId]: isSelected
          ? (Array.isArray(current) ? current.filter(id => id !== exerciseId) : [])
          : [...(Array.isArray(current) ? current : []), exerciseId]
      }
    })
  }

  const addSelectedExercisesToDay = (dayId: string) => {
    if (isViewMode) return
    const selectedIds = Array.isArray(selectedExercisesForDay[dayId]) ? selectedExercisesForDay[dayId] : []
    if (selectedIds.length === 0) return

    setWorkoutDays(prev => {
      const prevArray = Array.isArray(prev) ? prev : []
      const exercisesArray = Array.isArray(exercises) ? exercises : []

      return prevArray.map(day => {
        if (!day || day.id !== dayId) return day

        const dayExercises = Array.isArray(day.exercises) ? day.exercises : []
        const newExercises = selectedIds
          .map((exerciseId, selectedIndex) => {
            const exercise = exercisesArray.find(e => String(e.id) === String(exerciseId))
            if (!exercise) return null

            return {
              exercise_id: String(exerciseId),
              exercise_name: exercise.name,
              sets: 3,
              reps: '10',
              weight: 0,
              duration: 0,
              rest_time: 60,
              notes: '',
              order: dayExercises.length + selectedIndex
            }
          })
          .filter(Boolean)

        return { ...day, exercises: normalizeWorkoutExercisesOrder([...dayExercises, ...newExercises]) }
      })
    })

    // Limpiar selección y cerrar selector
    setSelectedExercisesForDay(prev => ({
      ...prev,
      [dayId]: []
    }))
    setShowExerciseSelector(prev => ({
      ...prev,
      [dayId]: false
    }))
  }

  const clearExerciseSelection = (dayId: string) => {
    if (isViewMode) return
    setSelectedExercisesForDay(prev => ({
      ...prev,
      [dayId]: []
    }))
    setShowExerciseSelector(prev => ({
      ...prev,
      [dayId]: false
    }))
  }

  // Función para filtrar ejercicios según búsqueda y filtros
  const getFilteredExercises = (dayId: string) => {
    const exercisesArray = Array.isArray(exercises) ? exercises : []
    const searchTerm = (exerciseSearchTerm[dayId] || '').toLowerCase().trim()
    const categoryFilter = exerciseCategoryFilter[dayId] || 'all'
    const muscleFilter = exerciseMuscleFilter[dayId] || 'all'

    return exercisesArray.filter((exercise) => {
      if (!exercise) return false

      // Filtro por nombre (aplicar fixEncoding para comparación)
      if (searchTerm) {
        const exerciseName = fixEncoding(exercise.name || '').toLowerCase()
        if (!exerciseName.includes(searchTerm)) {
          return false
        }
      }

      // Filtro por categoría
      if (categoryFilter !== 'all' && exercise.category !== categoryFilter) {
        return false
      }

      // Filtro por músculos (aplicar fixEncoding para comparación)
      if (muscleFilter !== 'all') {
        const muscleGroups = Array.isArray(exercise.muscle_groups) ? exercise.muscle_groups : []
        const hasMuscle = muscleGroups.some(muscle => {
          const fixedMuscle = fixEncoding(muscle || '')
          return fixedMuscle.toLowerCase().includes(muscleFilter.toLowerCase())
        })
        if (!hasMuscle) {
          return false
        }
      }

      return true
    })
  }

  // Obtener categorías únicas de ejercicios
  const getUniqueCategories = () => {
    const exercisesArray = Array.isArray(exercises) ? exercises : []
    const categories = new Set<string>()
    exercisesArray.forEach(ex => {
      if (ex?.category) {
        categories.add(ex.category)
      }
    })
    return Array.from(categories).sort()
  }

  // Obtener músculos únicos de ejercicios
  const getUniqueMuscles = () => {
    const exercisesArray = Array.isArray(exercises) ? exercises : []
    const muscles = new Set<string>()
    exercisesArray.forEach(ex => {
      if (Array.isArray(ex?.muscle_groups)) {
        ex.muscle_groups.forEach(muscle => {
          if (muscle) muscles.add(muscle)
        })
      }
    })
    return Array.from(muscles).sort()
  }

  // Funciones para reordenar días
  const moveDayUp = (dayIndex: number) => {
    if (isViewMode) return
    if (dayIndex > 0) {
      setWorkoutDays(prev => {
        const newDays = [...prev]
        const temp = newDays[dayIndex]
        newDays[dayIndex] = newDays[dayIndex - 1]
        newDays[dayIndex - 1] = temp

        return normalizeWorkoutDaysOrder(newDays)
      })
    }
  }

  const moveDayDown = (dayIndex: number) => {
    if (isViewMode) return
    if (dayIndex < workoutDays.length - 1) {
      setWorkoutDays(prev => {
        const newDays = [...prev]
        const temp = newDays[dayIndex]
        newDays[dayIndex] = newDays[dayIndex + 1]
        newDays[dayIndex + 1] = temp

        return normalizeWorkoutDaysOrder(newDays)
      })
    }
  }

  const copyWorkoutWeek = (weekIndex: number) => {
    if (isViewMode) return
    setWorkoutDays(prev => {
      const prevArray = Array.isArray(prev) ? prev.filter(Boolean) : []
      const start = weekIndex * 7
      const weekDays = prevArray.slice(start, start + 7)
      if (weekDays.length === 0) return prevArray
      const copiedDays = weekDays.map((day, index) => cloneWorkoutDay(day, `copy-week-${weekIndex}-${index}`))
      const nextDays = [
        ...prevArray.slice(0, start + weekDays.length),
        ...copiedDays,
        ...prevArray.slice(start + weekDays.length),
      ]
      setFormData(current => ({ ...current, duration_weeks: Math.max(current.duration_weeks || 1, Math.ceil(nextDays.length / 7)) }))
      return normalizeWorkoutDaysOrder(nextDays)
    })
  }

  const moveWorkoutWeek = (weekIndex: number, direction: -1 | 1) => {
    if (isViewMode) return
    setWorkoutDays(prev => {
      const prevArray = Array.isArray(prev) ? prev.filter(Boolean) : []
      const groups = []
      for (let index = 0; index < prevArray.length; index += 7) {
        groups.push(prevArray.slice(index, index + 7))
      }
      const targetIndex = weekIndex + direction
      if (targetIndex < 0 || targetIndex >= groups.length) return prevArray
      const nextGroups = [...groups]
      const temp = nextGroups[weekIndex]
      nextGroups[weekIndex] = nextGroups[targetIndex]
      nextGroups[targetIndex] = temp
      return normalizeWorkoutDaysOrder(nextGroups.flat())
    })
  }

  const removeExerciseFromDay = (dayId: string, exerciseIndex: number) => {
    if (isViewMode) return
    setWorkoutDays(prev => {
      const prevArray = Array.isArray(prev) ? prev : []
      return prevArray.map(day => {
        if (!day) return day
        if (day.id === dayId) {
          const exercisesArray = Array.isArray(day.exercises) ? day.exercises : []
          return { ...day, exercises: normalizeWorkoutExercisesOrder(exercisesArray.filter((_, index) => index !== exerciseIndex)) }
        }
        return day
      })
    })
  }

  const moveExerciseInDay = (dayId: string, exerciseIndex: number, direction: -1 | 1) => {
    if (isViewMode) return
    setWorkoutDays(prev => {
      const prevArray = Array.isArray(prev) ? prev : []
      return prevArray.map(day => {
        if (!day || day.id !== dayId) return day

        const exercisesArray = Array.isArray(day.exercises) ? [...day.exercises] : []
        const targetIndex = exerciseIndex + direction
        if (targetIndex < 0 || targetIndex >= exercisesArray.length) return day

        const current = exercisesArray[exerciseIndex]
        exercisesArray[exerciseIndex] = exercisesArray[targetIndex]
        exercisesArray[targetIndex] = current

        return { ...day, exercises: normalizeWorkoutExercisesOrder(exercisesArray) }
      })
    })
  }

  const updateExerciseInDay = (dayId: string, exerciseIndex: number, field: string, value: any) => {
    if (isViewMode) return
    const safeValue = field === 'reps' ? normalizeDateLikeWorkoutText(value) : value
    setWorkoutDays(prev => {
      const prevArray = Array.isArray(prev) ? prev : []
      return prevArray.map(day => {
        if (!day) return day
        if (day.id === dayId) {
          const exercisesArray = Array.isArray(day.exercises) ? day.exercises : []
          return {
            ...day,
            exercises: exercisesArray.map((exercise, index) =>
              index === exerciseIndex ? { ...exercise, [field]: safeValue } : exercise
            )
          }
        }
        return day
      })
    })
  }

  const handleSubmitPlan = async (configureExercises: boolean = false) => {
    if (isViewMode) {
      toast({
        title: "ℹ️ Modo vista",
        description: "Este plan está abierto en solo lectura",
      })
      return
    }

    try {
      setIsLoading(true)

      // Si estamos editando, guardamos todo (info básica + días/ejercicios)
      if (editingPlan) {
        const currentUserId = (editingPlan as any).user_id || (editingPlan as any).user
        const shouldSendAssignedUsers = !currentUserId && formData.assigned_users.length > 0
        const planData = {
          ...formData,
          days: (Array.isArray(workoutDays) ? workoutDays : []).map(day => ({
            day_name: day.day_name,
            day_number: day.day_number,
            is_rest_day: day.is_rest_day,
            notes: day.notes,
            exercises: day.exercises
          })),
          ...(shouldSendAssignedUsers
            ? { assigned_user_ids: formData.assigned_users.map((id) => Number(id)).filter((id) => Number.isFinite(id)) }
            : {}),
        }
        await updatePlan(editingPlan.id, planData)
        toast({
          title: "✅ Plan actualizado",
          description: "El plan de entrenamiento ha sido actualizado correctamente",
        })
        resetForm()
        refetch()
      } else {
        const assignedUserIds = formData.assigned_users
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id))

        const planData = {
          name: formData.name,
          description: formData.description,
          difficulty: formData.difficulty,
          duration_weeks: formData.duration_weeks,
          min_role_required: formData.min_role_required,
          estimated_duration_minutes: formData.estimated_duration_minutes,
          assigned_user_ids: assignedUserIds,
          days: []
        }

        const created = await createPlan(planData)
        const assignedCount = Array.isArray(created?.created_user_program_ids)
          ? created.created_user_program_ids.length
          : assignedUserIds.length

        toast({
          title: assignedCount > 0 ? `✅ ${assignedCount} asignación(es) creada(s)` : "✅ Plantilla creada",
          description: configureExercises ? "Ahora configura los ejercicios." : "Creado correctamente.",
        })

        setShowCreateDialog(false)
        setCreateStep("basic")

        if (configureExercises) {
          const createdUserProgramIds = Array.isArray(created?.created_user_program_ids)
            ? created.created_user_program_ids
            : []

          if (createdUserProgramIds.length > 1) {
            toast({
              title: "ℹ️ Asignación múltiple completada",
              description: "Con múltiples usuarios, configura ejercicios editando cada plan asignado.",
            })
            resetForm()
            refetch()
            return
          }

          const targetPlanId = createdUserProgramIds.length === 1
            ? createdUserProgramIds[0]
            : created?.id
          if (targetPlanId) {
            setWorkoutEditorPlanId(String(targetPlanId))
            setShowWorkoutEditor(true)
          } else {
            resetForm()
            refetch()
          }
        } else {
          resetForm()
          refetch()
        }
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al guardar plan",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Nueva función para el flujo unificado: crear plan + ejercicios
  const handleSubmitCreatePlanWithExercises = async () => {
    try {
      setIsLoading(true)

      const assignedUserIds = formData.assigned_users
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id))

      // Este flujo abre un único editor, por lo que no es compatible con múltiples asignaciones.
      if (assignedUserIds.length > 1) {
        toast({
          title: "⚠️ Múltiples usuarios",
          description: "Para múltiples usuarios usa 'Crear Plan Básico' y luego edita cada plan asignado.",
          variant: "default"
        })
        return
      }

      // Crear el plan básico
      const planData = {
        name: formData.name,
        description: formData.description,
        difficulty: formData.difficulty,
        duration_weeks: formData.duration_weeks,
        min_role_required: formData.min_role_required,
        estimated_duration_minutes: formData.estimated_duration_minutes,
        assigned_user_ids: assignedUserIds,
        days: [] // Enviar los días vacíos por ahora
      }

      const created = await createPlan(planData)

      // Luego actualizar con ejercicios si el plan fue creado
      if (created?.id) {
        // Luego de que el editor guarde, cerramos el diálogo
        toast({
          title: "✅ Plan creado exitosamente",
          description: "El plan de entrenamiento ha sido creado con los ejercicios configurados.",
        })

        setShowCreateDialog(false)
        resetForm()
        refetch()
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al crear plan",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Función para manejar el botón "Siguiente" - crear plan básico y pasar a step 2
  const handleMoveToExercisesStep = async () => {
    try {
      setIsLoading(true)

      const assignedUserIds = formData.assigned_users
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id))

      if (assignedUserIds.length > 1) {
        toast({
          title: "⚠️ Múltiples usuarios",
          description: "Para múltiples usuarios usa 'Crear Plan Básico' y luego edita cada plan asignado.",
          variant: "default"
        })
        return
      }

      const planData = {
        name: formData.name,
        description: formData.description,
        difficulty: formData.difficulty,
        duration_weeks: formData.duration_weeks,
        min_role_required: formData.min_role_required,
        estimated_duration_minutes: formData.estimated_duration_minutes,
        assigned_user_ids: assignedUserIds,
        days: []
      }

      const created = await createPlan(planData)

      if (created?.id) {
        const targetPlanId = Array.isArray(created?.created_user_program_ids) && created.created_user_program_ids.length === 1
          ? created.created_user_program_ids[0]
          : created.id
        setWorkoutEditorPlanId(String(targetPlanId))
        setCreateStep("exercises")
        toast({
          title: "✅ Plan creado",
          description: "Ahora configura los ejercicios.",
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al crear plan",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Función para guardar los ejercicios y crear el plan completo
  const handleSaveExercisesAndCreate = async () => {
    try {
      setIsLoading(true)

      // Llamar al save del editor incrustado
      if (editorRef.current?.handleSave) {
        await editorRef.current.handleSave()
      }

      toast({
        title: "✅ Plan completado",
        description: "El plan de entrenamiento ha sido creado con éxito.",
      })

      setShowCreateDialog(false)
      resetForm()
      refetch()
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al guardar ejercicios",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditWorkout = async (planId: string) => {
    setWorkoutEditorPlanId(planId)
    setShowWorkoutEditor(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      difficulty: 'beginner',
      duration_weeks: 4,
      min_role_required: 'basic',
      estimated_duration_minutes: 60,
      assigned_users: [] // Limpiar array de usuarios
    })
    setWorkoutDays([{
      id: '1',
      day_name: 'Día 1 - Tren Superior',
      day_number: 1,
      is_rest_day: false,
      notes: '',
      exercises: []
    }])
    setSelectedExercisesForDay({})
    setShowExerciseSelector({})
    setShowCreateDialog(false)
    setEditingPlan(null)
    setCreateStep("basic")
    setShowWorkoutEditor(false)
    setWorkoutEditorPlanId(null)
  }

  // Función para cargar los detalles completos de un plan y abrir el editor
  const handleEditPlan = async (planId: string, viewOnly: boolean = false) => {
    try {
      setLoadingDetail(true)
      setIsViewMode(viewOnly) // Establecer modo vista
      const planDetail = await fetchPlanDetail(planId)

      if (planDetail) {
        // Cargar datos del formulario
        setFormData({
          name: fixEncoding(planDetail.name || ''),
          description: fixEncoding(planDetail.description || ''),
          difficulty: planDetail.difficulty || 'beginner',
          duration_weeks: planDetail.duration_weeks || 4,
          min_role_required: planDetail.min_role_required || 'basic',
          estimated_duration_minutes: planDetail.estimated_duration_minutes || 60,
          assigned_users: (
            Array.isArray((planDetail as any).assigned_user_ids) && (planDetail as any).assigned_user_ids.length > 0
              ? (planDetail as any).assigned_user_ids
              : ((planDetail as any).user_id ? [(planDetail as any).user_id] : [])
          ).map((id: number | string) => String(id))
        })

        // Convertir días del plan al formato del formulario
        if (planDetail.days && planDetail.days.length > 0) {
          const convertedDays = planDetail.days.map((day: any) => ({
            id: day.id || Date.now().toString(),
            day_name: day.name || day.day_name || `Día ${day.day_number}`,
            day_number: day.day_number || day.order_index || 1,
            is_rest_day: day.is_rest_day || false,
            notes: day.notes || '',
            exercises: (day.exercises || [])
              .slice()
              .sort((a: any, b: any) => getWorkoutExerciseOrder(a, 0) - getWorkoutExerciseOrder(b, 0))
              .map((ex: any, exerciseIndex: number) => {
              // Extraer datos del ejercicio (puede venir como objeto o ID)
              const exerciseObj = typeof ex.exercise === 'object' ? ex.exercise : null
              return {
                exercise_id: exerciseObj ? exerciseObj.id : (ex.exercise_id || ex.exercise),
                exercise_name: exerciseObj ? exerciseObj.name : '',  // Guardar nombre para mostrar
                sets: ex.sets || 3,
                reps: normalizeDateLikeWorkoutText(ex.reps || '10'),
                weight: ex.weight || 0,
                duration: ex.duration_seconds || 0,
                rest_time: ex.rest_seconds || 60,
                notes: ex.notes || '',
                order: exerciseIndex,
                substitutes: ex.substitutes || (exerciseObj?.substitutes || [])  // Preservar substitutes del ejercicio
              }
            })
          }))
          setWorkoutDays(convertedDays)
          // Si necesitas depurar, usa console.log o estructura el objeto correctamente
          // <-- removed stray closing parenthesis
        } else {
          setWorkoutDays([{
            id: '1',
            day_name: 'Día 1',
            day_number: 1,
            is_rest_day: false,
            notes: '',
            exercises: []
          }])
        }

        setEditingPlan(planDetail)
        toast({
          title: "✅ Plan cargado",
          description: `${planDetail.days?.length || 0} días con ejercicios cargados`,
        })
      } else {
        toast({
          title: "⚠️ Plan no encontrado",
          description: "El plan no existe o no se guardó correctamente. Se recargó la lista.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Error al cargar los detalles del plan",
        variant: "destructive",
      })
    } finally {
      setLoadingDetail(false)
    }
  }

  const openAssignUserDialog = (planId: string) => {
    setAssignUserSourceId(planId)
    setAssignUserTargetId("none")
    setShowAssignUserDialog(true)
  }

  const handleAssignToUser = async () => {
    if (!assignUserSourceId || assignUserTargetId === "none") return
    try {
      setAssigningToUser(true)
      const userId = Number(assignUserTargetId)
      await updatePlan(assignUserSourceId, { assigned_user_ids: [userId] })
      const userName = usersList.find((u) => u.id === assignUserTargetId)?.email || "usuario"
      toast({
        title: "✅ Plan asignado",
        description: `Se ha clonado y asignado la rutina a ${userName}`,
      })
      setShowAssignUserDialog(false)
    } catch (e) {
      toast({
        title: "❌ Error",
        description: e instanceof Error ? e.message : "No se pudo asignar la rutina",
        variant: "destructive",
      })
    } finally {
      setAssigningToUser(false)
    }
  }

  const handleCopyPlan = async (planId: string) => {
    try {
      setCopyingPlanId(planId)
      const planDetail = await fetchPlanDetail(planId)
      if (!planDetail) {
        throw new Error("No se pudo cargar la rutina origen")
      }

      const copiedName = getNextCopyName(
        fixEncoding(planDetail.name || "Rutina"),
        plansArray.map((p) => fixEncoding(p.name || ""))
      )
      const copiedDays = Array.isArray(planDetail.days)
        ? planDetail.days.map((day: any, dayIndex: number) => ({
            day_name: day.name || day.day_name || `Día ${day.day_number || 1}`,
            day_number: dayIndex + 1,
            day_of_week: day.day_of_week || undefined,
            is_rest_day: Boolean(day.is_rest_day),
            duration_minutes: day.duration_minutes || undefined,
            notes: day.notes || "",
            exercises: Array.isArray(day.exercises)
              ? day.exercises.map((ex: any, index: number) => ({
                  exercise_id: ex.exercise_id || ex.exercise?.id || ex.exercise,
                  sets: ex.sets || 3,
                  reps: ex.reps || "10",
                  weight: ex.weight || 0,
                  duration: ex.duration_seconds || ex.duration || 0,
                  rest_time: ex.rest_seconds || ex.rest_time || 60,
                  notes: ex.notes || "",
                  order: ex.order_index || ex.order || index + 1,
                  substitutes: Array.isArray(ex.substitutes)
                    ? ex.substitutes.map((sub: any) => ({
                        substitute_id: sub.substitute_id || sub.id,
                        priority: sub.priority || 1,
                        notes: sub.notes || "",
                      }))
                    : [],
                }))
              : [],
          }))
        : []
      const sourceUserId = planDetail.user_id || planDetail.user || undefined
      const isUserRoutine = Boolean(sourceUserId)

      const created = await createPlan({
        name: copiedName,
        description: fixEncoding(planDetail.description || ""),
        difficulty: planDetail.difficulty || "beginner",
        goal: (planDetail as any).goal || undefined,
        location: (planDetail as any).location || undefined,
        duration_weeks: planDetail.duration_weeks || 4,
        days_per_week: (planDetail as any).days_per_week || undefined,
        estimated_duration_minutes: planDetail.estimated_duration_minutes || 60,
        user: sourceUserId,
        is_active: isUserRoutine ? false : (planDetail.is_active ?? true),
        days: copiedDays,
      })

      toast({
        title: "✅ Copia creada",
        description: isUserRoutine
          ? "La rutina se duplicó como copia inactiva del mismo usuario."
          : "La rutina se duplicó correctamente.",
      })

      if (created?.id) {
        await handleEditPlan(String(created.id), false)
      } else {
        refetch()
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "No se pudo copiar la rutina",
        variant: "destructive",
      })
    } finally {
      setCopyingPlanId(null)
    }
  }

  // Funciones para manejar substitutes en planes existentes
  const openSubstitutesDialog = async (exerciseId: string, exerciseName: string) => {
    if (isViewMode) return
    try {
      setLoadingSubstitutes(true)
      setSubstitutesExerciseId(exerciseId)
      setSubstitutesExerciseName(exerciseName)
      setSubstituteSearch("")

      // Obtener substitutes existentes del ejercicio en el plan actual
      const currentExercise = workoutDays
        .flatMap(day => day.exercises)
        .find(ex => String(ex.exercise_id) === String(exerciseId))

      if (currentExercise?.substitutes) {
        setSubstitutes(currentExercise.substitutes)
      } else {
        setSubstitutes([])
      }

      setShowSubstitutesDialog(true)
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudieron cargar los substitutes",
        variant: "destructive",
      })
    } finally {
      setLoadingSubstitutes(false)
    }
  }

  const handleAddSubstitute = async (substituteId: string) => {
    try {
      if (!substitutesExerciseId) return

      // Validar límite de 3 substitutes
      if (substitutes.length >= 3) {
        toast({
          title: "⚠️ Límite alcanzado",
          description: "Un ejercicio no puede tener más de 3 ejercicios de respaldo",
          variant: "destructive",
        })
        return
      }

      const substituteExists = substitutes.some((s: any) =>
        String(s?.substitute_id ?? s?.id) === String(substituteId)
      )
      if (substituteExists) return

      const exercisesArray = Array.isArray(exercises) ? exercises : []
      const substituteExercise = exercisesArray.find((ex) => String(ex.id) === String(substituteId))
      if (!substituteExercise) {
        toast({
          title: "❌ Error",
          description: "No se encontró el ejercicio de respaldo seleccionado",
          variant: "destructive",
        })
        return
      }

      // Agregar al array local con prioridad
      const newSubstitute = {
        id: `sub-${Date.now()}-${substituteId}`,
        substitute_id: String(substituteExercise.id),
        substitute_name: substituteExercise.name,
        category: substituteExercise.category,
        priority: substitutes.length + 1
      }

      const updatedSubstitutes = [...substitutes, newSubstitute]
      setSubstitutes(updatedSubstitutes)

      // Actualizar en workoutDays
      setWorkoutDays(prev => {
        const prevArray = Array.isArray(prev) ? prev : []
        return prevArray.map(day => ({
          ...day,
          exercises: (day.exercises || []).map(ex =>
            String(ex.exercise_id) === String(substitutesExerciseId)
              ? { ...ex, substitutes: updatedSubstitutes }
              : ex
          )
        }))
      })

      setSubstituteSearch("")
      toast({
        title: "✅ Substituto agregado",
        description: `Ejercicio de respaldo agregado (${updatedSubstitutes.length}/3)`,
      })
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudo agregar el substituto",
        variant: "destructive",
      })
    }
  }

  const handleRemoveSubstitute = (substituteId: string) => {
    const updatedSubstitutes = substitutes
      .filter((s: any) => String(s?.substitute_id ?? s?.id) !== String(substituteId))
      .map((sub: any, idx: number) => ({
        ...sub,
        priority: idx + 1
      }))
    setSubstitutes(updatedSubstitutes)

    // Actualizar en workoutDays
    setWorkoutDays(prev => {
      const prevArray = Array.isArray(prev) ? prev : []
      return prevArray.map(day => ({
        ...day,
        exercises: (day.exercises || []).map(ex =>
          String(ex.exercise_id) === String(substitutesExerciseId)
            ? { ...ex, substitutes: updatedSubstitutes }
            : ex
        )
      }))
    })

    toast({
      title: "✅ Substituto eliminado",
      description: `Ejercicio de respaldo removido (${updatedSubstitutes.length}/3)`,
    })
  }

  const moveSubstituteUp = (index: number) => {
    if (index <= 0) return
    const newSubstitutes = [...substitutes]
      ;[newSubstitutes[index], newSubstitutes[index - 1]] = [newSubstitutes[index - 1], newSubstitutes[index]]

    // Actualizar prioridades
    newSubstitutes.forEach((sub, idx) => {
      sub.priority = idx + 1
    })

    setSubstitutes(newSubstitutes)

    // Actualizar en workoutDays
    setWorkoutDays(prev => {
      const prevArray = Array.isArray(prev) ? prev : []
      return prevArray.map(day => ({
        ...day,
        exercises: (day.exercises || []).map(ex =>
          String(ex.exercise_id) === String(substitutesExerciseId)
            ? { ...ex, substitutes: newSubstitutes }
            : ex
        )
      }))
    })
  }

  const moveSubstituteDown = (index: number) => {
    if (index >= substitutes.length - 1) return
    const newSubstitutes = [...substitutes]
      ;[newSubstitutes[index], newSubstitutes[index + 1]] = [newSubstitutes[index + 1], newSubstitutes[index]]

    // Actualizar prioridades
    newSubstitutes.forEach((sub, idx) => {
      sub.priority = idx + 1
    })

    setSubstitutes(newSubstitutes)

    // Actualizar en workoutDays
    setWorkoutDays(prev => {
      const prevArray = Array.isArray(prev) ? prev : []
      return prevArray.map(day => ({
        ...day,
        exercises: (day.exercises || []).map(ex =>
          String(ex.exercise_id) === String(substitutesExerciseId)
            ? { ...ex, substitutes: newSubstitutes }
            : ex
        )
      }))
    })
  }

  const availableForSubstitute = useMemo(() => {
    if (!substitutesExerciseId) return [] as Exercise[]

    const q = substituteSearch.trim().toLowerCase()
    const currentExerciseId = String(substitutesExerciseId)
    const usedSubstituteIds = new Set(
      substitutes.map((s: any) => String(s?.substitute_id ?? s?.id))
    )

    const exercisesArray = Array.isArray(exercises) ? exercises : []
    return exercisesArray.filter((ex) => {
      if (!ex) return false
      const exId = String(ex.id)
      if (exId === currentExerciseId) return false
      if (usedSubstituteIds.has(exId)) return false
      if (!q) return true
      return fixEncoding(ex.name || "").toLowerCase().includes(q)
    })
  }, [exercises, substitutesExerciseId, substituteSearch, substitutes])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando planes de entrenamiento...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <span className="ml-2 text-red-500">{error}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Card de Exportación/Importación */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>📁 Importar/Exportar Planes</CardTitle>
              <CardDescription>Gestiona tus planes de entrenamiento con archivos CSV o Excel</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleExportCSV}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
              <Button
                variant="outline"
                onClick={handleExportExcel}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar Excel
              </Button>
              <Button
                onClick={() => setShowImportDialog(true)}
                className="bg-blue-600 hover:bg-blue-700 gap-2"
              >
                <Upload className="h-4 w-4" />
                Importar CSV/Excel
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Dialog de importación mejorado */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>📥 Importar Planes de Entrenamiento</DialogTitle>
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
                onChange={e => {
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
                <strong>💡 Tip:</strong> El formato esperado incluye campos como: nombre, descripción, dificultad, duración en semanas y rol mínimo requerido.
              </p>
            </div>

            {importResult && (
              <div className="border rounded-lg p-4 space-y-3 text-sm">
                <p className="font-semibold text-green-700">Resultado de la importación</p>
                {importResult.message && (
                  <p className="text-xs text-muted-foreground">{importResult.message}</p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <p>✅ Creados: <strong>{importResult.created}</strong></p>
                  <p>🔄 Actualizados: <strong>{importResult.updated}</strong></p>
                  <p>⏭️ Omitidos: <strong>{importResult.skipped}</strong></p>
                  <p>⛔ Rechazados: <strong>{importResult.rejected}</strong></p>
                </div>

                {importResult.stats && (
                  <div className="text-xs border rounded-md p-2 bg-muted/40 space-y-1">
                    <p><strong>Planes:</strong> C {importResult.stats.plans?.created ?? 0} · A {importResult.stats.plans?.updated ?? 0} · O {importResult.stats.plans?.skipped ?? 0}</p>
                    <p><strong>Días:</strong> C {importResult.stats.days?.created ?? 0} · A {importResult.stats.days?.updated ?? 0} · O {importResult.stats.days?.skipped ?? 0}</p>
                    <p><strong>Ejercicios:</strong> C {importResult.stats.exercises?.created ?? 0} · A {importResult.stats.exercises?.updated ?? 0} · O {importResult.stats.exercises?.skipped ?? 0}</p>
                    <p><strong>Sustitutos:</strong> C {importResult.stats.substitutes?.created ?? 0} · A {importResult.stats.substitutes?.updated ?? 0} · O {importResult.stats.substitutes?.skipped ?? 0}</p>
                  </div>
                )}

                {groupedImportErrors.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-red-600 font-medium">Errores ({importResult.error_count}):</p>
                    <ul className="list-disc list-inside text-red-500 space-y-0.5 max-h-52 overflow-y-auto overflow-x-hidden pr-2 border border-red-100 rounded-md p-2 bg-red-50/40 text-xs">
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
            <Button variant="outline" onClick={() => { setShowImportDialog(false); setImportFile(null); setImportResult(null) }} disabled={importing}>Cerrar</Button>
            <Button onClick={handleImport} disabled={!importFile || importing} className="bg-blue-600 hover:bg-blue-700">
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {importing ? 'Importando...' : 'Importar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Planes de Entrenamiento</h2>
          <p className="text-muted-foreground">
            Administra las rutinas de entrenamiento disponibles para los usuarios
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white border-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Plan
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-6">
            <div>
              <FormLabel>Buscar</FormLabel>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar planes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <FormLabel>Rol Mínimo</FormLabel>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="basic">Básico</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <FormLabel>Dificultad</FormLabel>
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las dificultades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="beginner">Principiante</SelectItem>
                  <SelectItem value="intermediate">Intermedio</SelectItem>
                  <SelectItem value="advanced">Avanzado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <FormLabel>Objetivo</FormLabel>
              <Select value={goalFilter} onValueChange={setGoalFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los objetivos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="weight_loss">Pérdida de peso</SelectItem>
                  <SelectItem value="muscle_gain">Ganar músculo</SelectItem>
                  <SelectItem value="strength_building">Fuerza</SelectItem>
                  <SelectItem value="endurance">Resistencia</SelectItem>
                  <SelectItem value="general_fitness">Fitness general</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <FormLabel>Ubicación</FormLabel>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las ubicaciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="home">Casa</SelectItem>
                  <SelectItem value="gym">Gimnasio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <FormLabel>Tipo</FormLabel>
              <Select value={planTypeFilter} onValueChange={setPlanTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="templates">Plantillas</SelectItem>
                  <SelectItem value="users">Planes de usuario</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <FormLabel>Usuario</FormLabel>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {usersList.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FormLabel>Ordenar por</FormLabel>
              <Select value={sortColumn} onValueChange={(v) => setSortColumn(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nombre</SelectItem>
                  <SelectItem value="role">Categoría</SelectItem>
                  <SelectItem value="difficulty">Dificultad</SelectItem>
                  <SelectItem value="duration">Duración</SelectItem>
                  <SelectItem value="status">Estado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <FormLabel>Dirección</FormLabel>
              <Select value={sortDirection} onValueChange={(v) => setSortDirection(v as "asc" | "desc")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascendente</SelectItem>
                  <SelectItem value="desc">Descendente</SelectItem>
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
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedPlans.length} plan(es) seleccionado(s)
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleBulkToggleActive(true)}
                  className="bg-green-500 hover:bg-green-600 text-white"
                  disabled={isLoading}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Activar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkToggleActive(false)}
                  disabled={isLoading}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Desactivar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={isLoading}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Eliminar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans List - Mobile Cards / Desktop Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Planes de Entrenamiento</CardTitle>
            <div className="hidden md:flex items-center space-x-2">
              <Checkbox
                checked={selectedPlans.length === currentPlans.length && currentPlans.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                {selectedPlans.length > 0 ? `${selectedPlans.length} seleccionados` : 'Seleccionar todos'}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile View - Cards */}
          <div className="md:hidden space-y-3 p-3">
            {/* Select All Header */}
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedPlans.length === currentPlans.length && currentPlans.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium text-muted-foreground">
                  Seleccionar todos
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {selectedPlans.length} seleccionados
              </span>
            </div>

            {/* Plan Cards */}
            {Array.isArray(currentPlans) ? currentPlans.map((plan) => {
              if (!plan) return null
              return (
                <Card
                  key={plan.id}
                  className={`border-2 transition-all ${selectedPlans.includes(plan.id)
                      ? 'border-purple-500 bg-purple-50/50'
                      : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
                    }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedPlans.includes(plan.id)}
                        onCheckedChange={(checked) => handleSelectPlan(plan.id, checked as boolean)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-semibold text-base">
                                {fixEncoding(plan.name)}
                              </div>
                              {getCategoryBadge(plan)}
                              {plan.is_default && (
                                <Badge className="bg-yellow-100 text-yellow-800 border-0 text-xs">
                                  <Star className="h-3 w-3 mr-1" />
                                  Por defecto
                                </Badge>
                              )}
                            </div>
                            {plan.description && (
                              <div className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                {fixEncoding(plan.description)}
                              </div>
                            )}
                            {getPlanUserReference(plan) && getPlanCategory(plan) === 'Usuario' && (
                              <div className="text-xs text-muted-foreground mb-2">
                                Usuario: {getPlanUserReference(plan)}
                              </div>
                            )}
                            {plan.is_default && plan.default_conditions && Object.keys(plan.default_conditions).length > 0 && (
                              <div className="text-xs text-muted-foreground mb-2 p-2 bg-gray-50 rounded">
                                <span className="font-medium">Se asigna cuando: </span>
                                {Object.entries(plan.default_conditions).map(([key, value]) => {
                                  const keyNames: Record<string, string> = {
                                    'days_per_week': 'Días/semana',
                                    'difficulty': 'Dificultad',
                                    'goal': 'Objetivo',
                                    'min_role_required': 'Rol'
                                  }
                                  const valueNames: Record<string, any> = {
                                    'beginner': 'Principiante',
                                    'intermediate': 'Intermedio',
                                    'advanced': 'Avanzado',
                                    'weight_loss': 'Pérdida de peso',
                                    'muscle_gain': 'Ganancia muscular',
                                    'strength_building': 'Fuerza',
                                    'endurance': 'Resistencia',
                                    'general_fitness': 'Fitness general',
                                    'basic': 'Básico',
                                    'pro': 'Pro',
                                    'premium': 'Premium'
                                  }
                                  return `${keyNames[key] || key}: ${valueNames[value] || value}`
                                }).join(', ')}
                              </div>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleEditPlan(plan.id, true)}
                                disabled={loadingDetail}
                              >
                                {loadingDetail ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Eye className="h-4 w-4 mr-2" />
                                )}
                                Ver Detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEditPlan(plan.id, false)}
                                disabled={loadingDetail}
                              >
                                {loadingDetail ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Edit className="h-4 w-4 mr-2" />
                                )}
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCopyPlan(plan.id)} disabled={copyingPlanId !== null}>
                                {copyingPlanId === plan.id ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Copy className="h-4 w-4 mr-2" />
                                )}
                                Copiar rutina
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openAssignUserDialog(plan.id)} disabled={copyingPlanId !== null}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Asignar copia a usuario
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditWorkout(plan.id)}>
                                <Dumbbell className="h-4 w-4 mr-2" />
                                Editar Ejercicios
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(plan.id)}>
                                {plan.is_active ? (
                                  <>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Desactivar
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Activar
                                  </>
                                )}
                              </DropdownMenuItem>
                              {!plan.is_default && (
                                <DropdownMenuItem onClick={() => handleSetAsDefault(plan.id)}>
                                  <Crown className="h-4 w-4 mr-2" />
                                  Establecer como por defecto
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(plan.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {getCategoryBadge(plan)}
                          {getDifficultyBadge(plan.difficulty)}
                          {plan.is_active ? (
                            <Badge className="bg-green-100 text-green-800 border-0 text-xs">Activo</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800 border-0 text-xs">Inactivo</Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-2 border-t">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{plan.duration_weeks} semanas</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            <span>{(plan.training_days ?? plan.days_per_week ?? 0)} entrenamientos/semana</span>
                          </div>
                          {plan.estimated_duration_minutes && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{plan.estimated_duration_minutes} min/sesión</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            }) : null}
          </div>

          {/* Desktop View - Table */}
          <div className="hidden md:block rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th
                      className="p-3 text-left font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        Plan
                        {sortColumn === 'name' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                    </th>
                    <th
                      className="p-3 text-left font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                      onClick={() => handleSort('role')}
                    >
                      <div className="flex items-center gap-2">
                        Categoría
                        {sortColumn === 'role' && (
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
                      onClick={() => handleSort('duration')}
                    >
                      <div className="flex items-center gap-2">
                        Duración
                        {sortColumn === 'duration' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                    </th>
                    <th
                      className="p-3 text-left font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-2">
                        Estado
                        {sortColumn === 'status' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                    </th>
                    <th className="p-3 text-left font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(currentPlans) ? currentPlans.map((plan) => {
                    if (!plan) return null
                    return (
                      <tr key={plan.id} className="border-t hover:bg-muted/50">
                        <td className="p-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedPlans.includes(plan.id)}
                              onCheckedChange={(checked) => handleSelectPlan(plan.id, checked as boolean)}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="font-medium">{fixEncoding(plan.name)}</div>
                                {getCategoryBadge(plan)}
                                {plan.is_default && (
                                  <Badge className="bg-yellow-100 text-yellow-800 border-0" title="Plan por defecto">
                                    <Star className="h-3 w-3 mr-1" />
                                    Por defecto
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {plan.description
                                  ? (fixEncoding(plan.description).length > 50
                                    ? `${fixEncoding(plan.description).substring(0, 50)}...`
                                    : fixEncoding(plan.description))
                                  : 'Sin descripción'}
                              </div>
                              {getPlanUserReference(plan) && getPlanCategory(plan) === 'Usuario' && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Usuario: {getPlanUserReference(plan)}
                                </div>
                              )}
                              {plan.is_default && plan.default_conditions && Object.keys(plan.default_conditions).length > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Se asigna cuando: {Object.entries(plan.default_conditions).map(([key, value]) => {
                                    const keyNames: Record<string, string> = {
                                      'days_per_week': 'Días/semana',
                                      'difficulty': 'Dificultad',
                                      'goal': 'Objetivo',
                                      'min_role_required': 'Rol'
                                    }
                                    const valueNames: Record<string, any> = {
                                      'beginner': 'Principiante',
                                      'intermediate': 'Intermedio',
                                      'advanced': 'Avanzado',
                                      'weight_loss': 'Pérdida de peso',
                                      'muscle_gain': 'Ganancia muscular',
                                      'strength_building': 'Fuerza',
                                      'endurance': 'Resistencia',
                                      'general_fitness': 'Fitness general',
                                      'basic': 'Básico',
                                      'pro': 'Pro',
                                      'premium': 'Premium'
                                    }
                                    return `${keyNames[key] || key}: ${valueNames[value] || value}`
                                  }).join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">{getCategoryBadge(plan)}</td>
                        <td className="p-3">{getDifficultyBadge(plan.difficulty)}</td>
                        <td className="p-3">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 mr-1" />
                            {plan.duration_weeks} semanas
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Activity className="h-4 w-4 mr-1" />
                            {(plan.training_days ?? plan.days_per_week ?? 0)} entrenamientos/semana
                          </div>
                          {plan.estimated_duration_minutes && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Clock className="h-4 w-4 mr-1" />
                              {plan.estimated_duration_minutes} min/sesión
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          {plan.is_active ? (
                            <Badge className="bg-green-100 text-green-800 border-0">Activo</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800 border-0">Inactivo</Badge>
                          )}
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
                              <DropdownMenuItem
                                onClick={() => handleEditPlan(plan.id, true)}
                                className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50"
                                disabled={loadingDetail}
                              >
                                {loadingDetail ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Eye className="h-4 w-4 mr-2" />
                                )}
                                Ver Detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEditPlan(plan.id, false)}
                                className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-violet-50"
                                disabled={loadingDetail}
                              >
                                {loadingDetail ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Edit className="h-4 w-4 mr-2" />
                                )}
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleCopyPlan(plan.id)}
                                className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50"
                                disabled={copyingPlanId !== null}
                              >
                                {copyingPlanId === plan.id ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Copy className="h-4 w-4 mr-2" />
                                )}
                                Copiar rutina
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openAssignUserDialog(plan.id)}
                                className="hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50"
                                disabled={copyingPlanId !== null}
                              >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Asignar copia a usuario
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleActive(plan.id)}
                                className="hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50"
                              >
                                {plan.is_active ? (
                                  <>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Desactivar
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Activar
                                  </>
                                )}
                              </DropdownMenuItem>
                              {!plan.is_default && (
                                <DropdownMenuItem
                                  onClick={() => handleSetAsDefault(plan.id)}
                                  className="hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50"
                                >
                                  <Crown className="h-4 w-4 mr-2" />
                                  Establecer como por defecto
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(plan.id)}
                                className="hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  }) : null}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginación */}
          {totalCount > 50 && (
            <div className="border-t p-3 md:p-4">
              {/* Mobile View - Compact */}
              <div className="md:hidden space-y-3">
                <div className="text-xs text-center text-muted-foreground">
                  Página {currentPage} de {totalPages} • {totalCount} planes
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => changePage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="flex-1 text-xs"
                  >
                    <ArrowLeft className="h-3 w-3 mr-1" />
                    Anterior
                  </Button>
                  <div className="flex items-center gap-1 px-2">
                    {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage === 1) {
                        pageNum = i + 1;
                      } else if (currentPage === totalPages) {
                        pageNum = totalPages - 2 + i;
                      } else {
                        pageNum = currentPage - 1 + i;
                      }

                      if (pageNum < 1 || pageNum > totalPages) return null;

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => changePage(pageNum)}
                          className="w-8 h-8 p-0 text-xs"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => changePage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="flex-1 text-xs"
                  >
                    Siguiente
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>

              {/* Desktop View - Full */}
              <div className="hidden md:flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Mostrando {((currentPage - 1) * 50) + 1} - {Math.min(currentPage * 50, totalCount)} de {totalCount} planes
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => changePage(1)}
                    disabled={currentPage === 1}
                  >
                    Primera
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => changePage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>

                  {/* Números de página */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => changePage(pageNum)}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => changePage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => changePage(totalPages)}
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

      {/* Create/Edit Dialog - PASO 1: Información Básica */}
      {/* Unified Create Dialog - Flujo unificado con ambos pasos */}
      <Dialog open={showCreateDialog && !editingPlan} onOpenChange={(open) => {
        if (!open) {
          resetForm()
        }
      }}>
        <DialogContent className={createStep === "basic" ? "max-w-4xl max-h-[90vh] overflow-y-auto" : "max-w-6xl max-h-[90vh] overflow-y-auto"}>
          <DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>🏋️ Nuevo Plan de Entrenamiento</DialogTitle>
                  <DialogDescription>
                    Crea tu plan de forma sencilla con un flujo visual por pasos.
                  </DialogDescription>
                </div>
                <Badge variant="outline" className="text-sm">
                  {createStep === "basic" ? "Paso 1/2" : "Paso 2/2"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
                <button
                  type="button"
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${createStep === "basic"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                    }`}
                  onClick={() => setCreateStep("basic")}
                >
                  📝 Básicos
                </button>
                <button
                  type="button"
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${createStep === "exercises"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                    } ${!workoutEditorPlanId ? "opacity-60 cursor-not-allowed" : ""}`}
                  onClick={() => {
                    if (workoutEditorPlanId) setCreateStep("exercises")
                  }}
                >
                  💪 Ejercicios
                </button>
              </div>
            </div>
          </DialogHeader>

          {createStep === "basic" ? (
            // STEP 1: Información Básica
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FormLabel>Nombre del Plan *</FormLabel>
                    <Input
                      placeholder="Ej: Rutina de Fuerza para Principiantes"
                      value={formData.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                    />
                  </div>
                  <div>
                    <FormLabel>Dificultad *</FormLabel>
                    <Select value={formData.difficulty} onValueChange={(value) => handleFormChange('difficulty', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona la dificultad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Principiante</SelectItem>
                        <SelectItem value="intermediate">Intermedio</SelectItem>
                        <SelectItem value="advanced">Avanzado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <FormLabel>Descripción *</FormLabel>
                  <Textarea
                    placeholder="Describe el objetivo y características del plan..."
                    value={formData.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <FormLabel>Duración (semanas) *</FormLabel>
                    <Input
                      type="number"
                      placeholder="4"
                      value={formData.duration_weeks}
                      onChange={(e) => handleFormChange('duration_weeks', parseInt(e.target.value) || 4)}
                    />
                  </div>
                  <div>
                    <FormLabel>Duración Sesión (min)</FormLabel>
                    <Input
                      type="number"
                      placeholder="60"
                      value={formData.estimated_duration_minutes}
                      onChange={(e) => handleFormChange('estimated_duration_minutes', parseInt(e.target.value) || 60)}
                    />
                  </div>
                  <div>
                    <FormLabel>Rol Mínimo Requerido *</FormLabel>
                    <Select
                      value={formData.min_role_required}
                      onValueChange={(value) => handleFormChange('min_role_required', value)}
                      disabled={isViewMode}
                    >
                      <SelectTrigger disabled={isViewMode}>
                        <SelectValue placeholder="Selecciona el rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Básico</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <FormLabel>
                    Asignar a Usuarios (opcional)
                    {formData.assigned_users.length > 0 && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {formData.assigned_users.length} {formData.assigned_users.length === 1 ? 'usuario' : 'usuarios'}
                      </span>
                    )}
                  </FormLabel>
                  <div className="space-y-2">
                    <div className="border rounded-md p-2 max-h-48 overflow-y-auto">
                      <div className="space-y-1">
                        {usersList.map((u) => (
                          <div key={u.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                            <Checkbox
                              id={`user-${u.id}`}
                              checked={formData.assigned_users.includes(u.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  handleFormChange('assigned_users', [...formData.assigned_users, u.id])
                                } else {
                                  handleFormChange('assigned_users', formData.assigned_users.filter(id => id !== u.id))
                                }
                              }}
                            />
                            <label htmlFor={`user-${u.id}`} className="text-sm cursor-pointer flex-1">
                              {u.email}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    {formData.assigned_users.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFormChange('assigned_users', [])}
                        className="w-full text-xs"
                      >
                        Limpiar selección
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="p-3 text-center">
                    <div className="text-lg">📅</div>
                    <div className="text-xs text-muted-foreground">Semanas</div>
                    <div className="text-base font-bold">{formData.duration_weeks || 0}</div>
                  </CardContent>
                </Card>
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-3 text-center">
                    <div className="text-lg">⏱️</div>
                    <div className="text-xs text-muted-foreground">Sesión</div>
                    <div className="text-base font-bold">{formData.estimated_duration_minutes || 0}m</div>
                  </CardContent>
                </Card>
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardContent className="p-3 text-center">
                    <div className="text-lg">🎯</div>
                    <div className="text-xs text-muted-foreground">Dificultad</div>
                    <div className="text-base font-bold">
                      {formData.difficulty === "beginner" ? "Inicio" : formData.difficulty === "intermediate" ? "Medio" : "Avanz."}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-purple-200 bg-purple-50">
                  <CardContent className="p-3 text-center">
                    <div className="text-lg">👤</div>
                    <div className="text-xs text-muted-foreground">Tipo</div>
                    <div className="text-base font-bold">
                      {formData.assigned_users.length > 0 ? `${formData.assigned_users.length} Usuario${formData.assigned_users.length > 1 ? 's' : ''}` : "Plantilla"}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            // STEP 2: Configuración de Ejercicios
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-3">
                    <p className="text-sm font-semibold text-blue-800">📆 Semana completa</p>
                    <p className="text-xs text-blue-700">Configura Lunes a Domingo</p>
                  </CardContent>
                </Card>
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardContent className="p-3">
                    <p className="text-sm font-semibold text-emerald-800">🔀 Orden visual</p>
                    <p className="text-xs text-emerald-700">Reordena ejercicios con flechas</p>
                  </CardContent>
                </Card>
                <Card className="border-violet-200 bg-violet-50">
                  <CardContent className="p-3">
                    <p className="text-sm font-semibold text-violet-800">💤 Descanso automático</p>
                    <p className="text-xs text-violet-700">Días vacíos se guardan como descanso</p>
                  </CardContent>
                </Card>
              </div>

              <WorkoutTemplatePlanEditor
                ref={editorRef}
                planId={workoutEditorPlanId || 'new'}
                availableExercises={Array.isArray(exercises) ? exercises : []}
                onSaved={async () => {
                  // Handled by handleSaveExercisesAndCreate
                }}
                onClose={() => {
                  // Go back to step 1
                  setCreateStep("basic")
                }}
                isEmbedded={true}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            {createStep === "basic" ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleSubmitPlan(false)}
                  disabled={!formData.name || !formData.description || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear sin ejercicios
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleMoveToExercisesStep}
                  disabled={!formData.name || !formData.description || isLoading}
                  className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white border-0"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Siguiendo...
                    </>
                  ) : (
                    <>
                      Siguiente
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setCreateStep("basic")}
                >
                  <>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Atrás
                  </>
                </Button>
                <Button
                  onClick={handleSaveExercisesAndCreate}
                  disabled={!formData.name || !formData.description || isLoading}
                  className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white border-0"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Plan
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Edición completa de plan existente */}
      <Dialog open={!!editingPlan} onOpenChange={(open) => {
        if (!open) {
          resetForm()
          setIsViewMode(false) // Reset view mode
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isViewMode ? '👁️ Ver Detalles del Plan' : '✏️ Editar Plan de Entrenamiento'}
            </DialogTitle>
            <DialogDescription>
              {isViewMode
                ? 'Visualiza la información y ejercicios del plan (solo lectura)'
                : 'Modifica la información y ejercicios del plan'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Información básica */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <FormLabel>Nombre del Plan *</FormLabel>
                <Input
                  placeholder="Ej: Rutina de Fuerza para Principiantes"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  disabled={isViewMode}
                />
              </div>
              <div>
                <FormLabel>Dificultad *</FormLabel>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value) => handleFormChange('difficulty', value)}
                  disabled={isViewMode}
                >
                  <SelectTrigger disabled={isViewMode}>
                    <SelectValue placeholder="Selecciona la dificultad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Principiante</SelectItem>
                    <SelectItem value="intermediate">Intermedio</SelectItem>
                    <SelectItem value="advanced">Avanzado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <FormLabel>Descripción *</FormLabel>
              <Textarea
                placeholder="Describe el objetivo y características del plan..."
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                rows={3}
                disabled={isViewMode}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <FormLabel>Duración (semanas) *</FormLabel>
                <Input
                  type="number"
                  placeholder="4"
                  value={formData.duration_weeks}
                  onChange={(e) => handleFormChange('duration_weeks', parseInt(e.target.value) || 4)}
                  disabled={isViewMode}
                />
              </div>
              <div>
                <FormLabel>
                  Usuario Asignado
                  {editingPlan?.user_email && (
                    <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                      {editingPlan.user_email}
                    </span>
                  )}
                </FormLabel>
                <p className="text-xs text-muted-foreground mt-1">
                  {editingPlan?.user_email
                    ? "No se puede cambiar el usuario de un plan existente"
                    : "Este plan es una plantilla (no asignado a ningún usuario)"}
                </p>
              </div>
              <div>
                <FormLabel>Rol Mínimo Requerido *</FormLabel>
                <Select
                  value={formData.min_role_required}
                  onValueChange={(value) => handleFormChange('min_role_required', value)}
                  disabled={isViewMode}
                >
                  <SelectTrigger disabled={isViewMode}>
                    <SelectValue placeholder="Selecciona el rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Básico</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FormLabel>Duración por Sesión (min)</FormLabel>
                <Input
                  type="number"
                  placeholder="60"
                  value={formData.estimated_duration_minutes}
                  onChange={(e) => handleFormChange('estimated_duration_minutes', parseInt(e.target.value) || 60)}
                  disabled={isViewMode}
                />
              </div>
            </div>

            {/* Días de entrenamiento */}
            <div>
              <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <FormLabel className="text-lg font-semibold">Días de Entrenamiento</FormLabel>
                  <div className="text-xs text-muted-foreground">
                    {workoutWeekGroups.length} semana{workoutWeekGroups.length === 1 ? '' : 's'} · {workoutDays.length} día{workoutDays.length === 1 ? '' : 's'}
                  </div>
                </div>
                {!isViewMode && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addWorkoutDay}
                      className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Día
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addWorkoutWeek}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Agregar Semana
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {workoutWeekGroups.map(({ weekIndex, days }) => (
                  <section key={`week-${weekIndex}`} className="rounded-md border-2 border-blue-200 bg-blue-50/30">
                    <div className="flex flex-col gap-3 border-b border-blue-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 text-sm font-semibold text-white">
                          {weekIndex + 1}
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-blue-950">Semana {weekIndex + 1}</h3>
                          <p className="text-xs text-blue-800">
                            {days.length} día{days.length === 1 ? '' : 's'} · {days.reduce((total, day) => total + (Array.isArray(day?.exercises) ? day.exercises.length : 0), 0)} ejercicios
                          </p>
                        </div>
                      </div>
                      {!isViewMode && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => copyWorkoutWeek(weekIndex)}
                            className="h-8 border-blue-300 bg-white text-blue-800 hover:bg-blue-50"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => moveWorkoutWeek(weekIndex, -1)}
                            disabled={weekIndex === 0}
                            className="h-8 bg-white"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => moveWorkoutWeek(weekIndex, 1)}
                            disabled={weekIndex === workoutWeekGroups.length - 1}
                            className="h-8 bg-white"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 p-4">
                      {days.map((day, dayOffset) => {
                        if (!day) return null
                        const dayIndex = weekIndex * 7 + dayOffset
                        return (
                          <div key={day.id} className="rounded-md border-2 border-slate-300 bg-white shadow-sm">
                            <div className="border-b border-slate-200 px-4 py-3">
                              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div className="flex min-w-0 flex-1 items-center space-x-3">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <Input
                              value={day.day_name}
                              onChange={(e) => updateWorkoutDay(day.id, 'day_name', e.target.value)}
                              className="h-auto min-w-0 border-0 bg-transparent p-0 text-base font-semibold"
                              disabled={isViewMode}
                              type="text"
                              autoComplete="off"
                            />
                            <Checkbox
                              checked={day.is_rest_day}
                              onCheckedChange={(checked) => updateWorkoutDay(day.id, 'is_rest_day', checked)}
                              disabled={isViewMode}
                            />
                            <span className="text-sm text-muted-foreground">Día de descanso</span>
                          </div>
                          {!isViewMode && (
                            <div className="flex items-center space-x-2">
                              {/* Botones de reordenar */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => moveDayUp(dayIndex)}
                                disabled={dayIndex === 0}
                                className="h-8 w-8 p-0"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => moveDayDown(dayIndex)}
                                disabled={dayIndex === workoutDays.length - 1}
                                className="h-8 w-8 p-0"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                              {workoutDays.length > 1 && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => removeWorkoutDay(day.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4 p-4">
                        {!day.is_rest_day && (
                          <>
                            <div>
                              <FormLabel>Notas del día</FormLabel>
                              <Textarea
                                placeholder="Instrucciones especiales para este día..."
                                value={day.notes}
                                onChange={(e) => updateWorkoutDay(day.id, 'notes', e.target.value)}
                                rows={2}
                                disabled={isViewMode}
                                autoComplete="off"
                              />
                            </div>

                            {/* Selector múltiple de ejercicios */}
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <FormLabel>Agregar Ejercicios</FormLabel>
                                {!isViewMode && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => toggleExerciseSelector(day.id)}
                                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    {showExerciseSelector[day.id] ? 'Cancelar' : 'Seleccionar Ejercicios'}
                                  </Button>
                                )}
                              </div>

                              {/* Selector múltiple expandible */}
                              {showExerciseSelector[day.id] && (
                                <Card className="border border-green-200 bg-green-50">
                                  <CardContent className="pt-4">
                                    <div className="space-y-4">
                                      <div className="flex items-center justify-between">
                                        <FormLabel className="text-sm font-medium">
                                          Selecciona múltiples ejercicios:
                                        </FormLabel>
                                        <div className="text-sm text-muted-foreground">
                                          {selectedExercisesForDay[day.id]?.length || 0} seleccionados
                                        </div>
                                      </div>

                                      {/* Búsqueda y Filtros */}
                                      <div className="space-y-3">
                                        {/* Buscador por nombre */}
                                        <div className="relative">
                                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                          <Input
                                            placeholder="Buscar ejercicio por nombre..."
                                            value={exerciseSearchTerm[day.id] || ''}
                                            onChange={(e) => setExerciseSearchTerm(prev => ({
                                              ...prev,
                                              [day.id]: e.target.value
                                            }))}
                                            className="pl-9"
                                          />
                                        </div>

                                        {/* Filtros */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                          {/* Filtro por categoría */}
                                          <Select
                                            value={exerciseCategoryFilter[day.id] || 'all'}
                                            onValueChange={(value) => setExerciseCategoryFilter(prev => ({
                                              ...prev,
                                              [day.id]: value
                                            }))}
                                          >
                                            <SelectTrigger className="h-9">
                                              <SelectValue placeholder="Filtrar por categoría" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="all">Todas las categorías</SelectItem>
                                              {getUniqueCategories().map(category => (
                                                <SelectItem key={category} value={category}>
                                                  {fixEncoding(category)}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>

                                          {/* Filtro por músculo */}
                                          <Select
                                            value={exerciseMuscleFilter[day.id] || 'all'}
                                            onValueChange={(value) => setExerciseMuscleFilter(prev => ({
                                              ...prev,
                                              [day.id]: value
                                            }))}
                                          >
                                            <SelectTrigger className="h-9">
                                              <SelectValue placeholder="Filtrar por músculo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="all">Todos los músculos</SelectItem>
                                              {getUniqueMuscles().map(muscle => (
                                                <SelectItem key={muscle} value={muscle}>
                                                  {fixEncoding(muscle)}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        {/* Botón para limpiar filtros */}
                                        {(exerciseSearchTerm[day.id] || exerciseCategoryFilter[day.id] !== 'all' || exerciseMuscleFilter[day.id] !== 'all') && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                              setExerciseSearchTerm(prev => ({ ...prev, [day.id]: '' }))
                                              setExerciseCategoryFilter(prev => ({ ...prev, [day.id]: 'all' }))
                                              setExerciseMuscleFilter(prev => ({ ...prev, [day.id]: 'all' }))
                                            }}
                                            className="w-full text-xs"
                                          >
                                            <Filter className="h-3 w-3 mr-1" />
                                            Limpiar filtros
                                          </Button>
                                        )}
                                      </div>

                                      {/* Lista de ejercicios con checkboxes */}
                                      <div className="max-h-60 overflow-y-auto space-y-2">
                                        {getFilteredExercises(day.id).map((exercise) => {
                                          if (!exercise) return null
                                          const exerciseIdStr = String(exercise.id)
                                          const isSelected = Array.isArray(selectedExercisesForDay[day.id]) && selectedExercisesForDay[day.id].includes(exerciseIdStr)
                                          const dayExercises = Array.isArray(day.exercises) ? day.exercises : []
                                          const alreadyInDay = dayExercises.some(e => String(e.exercise_id) === exerciseIdStr)

                                          return (
                                            <div
                                              key={exerciseIdStr}
                                              className={`flex items-center space-x-3 p-2 rounded border ${alreadyInDay
                                                  ? 'bg-gray-100 border-gray-300'
                                                  : isSelected
                                                    ? 'bg-green-100 border-green-300'
                                                    : 'bg-white border-gray-200 hover:bg-gray-50'
                                                }`}
                                            >
                                              <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleExerciseSelection(day.id, exerciseIdStr)}
                                                disabled={alreadyInDay}
                                              />
                                              <div className="flex-1">
                                                <div className="font-medium text-sm">{fixEncoding(exercise.name)}</div>
                                                <div className="text-xs text-muted-foreground">
                                                  {fixEncoding(exercise.category)} • {exercise.muscle_groups?.map(m => fixEncoding(m)).join(', ')}
                                                </div>
                                              </div>
                                              {alreadyInDay && (
                                                <Badge variant="outline" className="text-xs">
                                                  Ya agregado
                                                </Badge>
                                              )}
                                            </div>
                                          )
                                        })}
                                      </div>

                                      {/* Mensaje si no hay resultados */}
                                      {getFilteredExercises(day.id).length === 0 && (
                                        <div className="text-center py-4 text-sm text-muted-foreground">
                                          No se encontraron ejercicios con los filtros aplicados
                                        </div>
                                      )}

                                      {/* Botones de acción */}
                                      <div className="flex gap-2 pt-2 border-t">
                                        <Button
                                          size="sm"
                                          onClick={() => addSelectedExercisesToDay(day.id)}
                                          disabled={!selectedExercisesForDay[day.id]?.length}
                                          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
                                        >
                                          <Plus className="h-4 w-4 mr-2" />
                                          Agregar Seleccionados
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => clearExerciseSelection(day.id)}
                                          disabled={!selectedExercisesForDay[day.id]?.length}
                                        >
                                          Limpiar Selección
                                        </Button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </div>

                            {/* Lista de ejercicios del día */}
                            {Array.isArray(day.exercises) && day.exercises.length > 0 && (
                              <div className="space-y-3">
                                <FormLabel>Ejercicios del día ({day.exercises.length})</FormLabel>
                                {day.exercises.map((exercise, exerciseIndex) => {
                                  // Buscar datos del ejercicio en el array de ejercicios disponibles
                                  const exercisesArray = Array.isArray(exercises) ? exercises : []
                                  const exerciseData = exercisesArray.find(e => String(e.id) === String(exercise.exercise_id))
                                  // Usar el nombre guardado si no se encuentra en el array
                                  const displayName = exerciseData?.name || exercise.exercise_name || 'Ejercicio'
                                  const displayCategory = exerciseData?.category || ''
                                  // Obtener substitutes del ejercicio
                                  const exerciseSubstitutes = exercise.substitutes || exerciseData?.substitutes || []
                                  const hasSubstitutes = Array.isArray(exerciseSubstitutes) && exerciseSubstitutes.length > 0
                                  return (
                                    <Card key={exerciseIndex} className={hasSubstitutes ? "border-2 border-amber-200 bg-amber-50/20" : "border border-gray-200"}>
                                      <CardContent className="pt-4">
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                              <h4 className="font-medium">{displayName}</h4>
                                              {hasSubstitutes && (
                                                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] px-1.5 py-0.5">
                                                  <Shield className="h-3 w-3 mr-1" />
                                                  {exerciseSubstitutes.length} respaldo{exerciseSubstitutes.length > 1 ? 's' : ''}
                                                </Badge>
                                              )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">{displayCategory}</p>
                                          </div>
                                          {!isViewMode && (
                                            <div className="flex items-center gap-1">
                                              <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => moveExerciseInDay(day.id, exerciseIndex, -1)}
                                                disabled={exerciseIndex === 0}
                                                className="h-8 w-8 p-0"
                                                title="Subir ejercicio"
                                                aria-label="Subir ejercicio"
                                              >
                                                <ArrowUp className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => moveExerciseInDay(day.id, exerciseIndex, 1)}
                                                disabled={exerciseIndex === day.exercises.length - 1}
                                                className="h-8 w-8 p-0"
                                                title="Bajar ejercicio"
                                                aria-label="Bajar ejercicio"
                                              >
                                                <ArrowDown className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                type="button"
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => removeExerciseFromDay(day.id, exerciseIndex)}
                                                className="h-8 w-8 p-0"
                                                title="Eliminar ejercicio"
                                                aria-label="Eliminar ejercicio"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          )}
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                          <div>
                                            <FormLabel className="text-xs">Series</FormLabel>
                                            <Input
                                              type="number"
                                              value={exercise.sets}
                                              onChange={(e) => updateExerciseInDay(day.id, exerciseIndex, 'sets', parseInt(e.target.value) || 0)}
                                              className="h-8"
                                              disabled={isViewMode}
                                            />
                                          </div>
                                          <div>
                                            <FormLabel className="text-xs">Repeticiones</FormLabel>
                                            <Input
                                              type="text"
                                              inputMode="text"
                                              autoComplete="off"
                                              placeholder="ej: 10 o 8-12"
                                              value={exercise.reps || ''}
                                              onChange={(e) => updateExerciseInDay(day.id, exerciseIndex, 'reps', e.target.value)}
                                              className="h-8"
                                              disabled={isViewMode}
                                            />
                                          </div>
                                          <div>
                                            <FormLabel className="text-xs">Peso (kg)</FormLabel>
                                            <Input
                                              type="text"
                                              inputMode="text"
                                              autoComplete="off"
                                              placeholder="ej: 50 o RPE 8"
                                              value={exercise.weight || ''}
                                              onChange={(e) => updateExerciseInDay(day.id, exerciseIndex, 'weight', e.target.value)}
                                              className="h-8"
                                              disabled={isViewMode}
                                            />
                                          </div>
                                          <div>
                                            <FormLabel className="text-xs">Descanso (seg)</FormLabel>
                                            <Input
                                              type="number"
                                              value={exercise.rest_time || ''}
                                              onChange={(e) => updateExerciseInDay(day.id, exerciseIndex, 'rest_time', parseInt(e.target.value) || 0)}
                                              className="h-8"
                                              disabled={isViewMode}
                                            />
                                          </div>
                                        </div>

                                        <div className="mt-3">
                                          <FormLabel className="text-xs">Notas del ejercicio</FormLabel>
                                          <Input
                                            type="text"
                                            inputMode="text"
                                            autoComplete="off"
                                            placeholder="Técnica, variaciones, etc..."
                                            value={exercise.notes}
                                            onChange={(e) => updateExerciseInDay(day.id, exerciseIndex, 'notes', e.target.value)}
                                            className="h-8"
                                            disabled={isViewMode}
                                          />
                                        </div>

                                        {/* Mostrar ejercicios de respaldo */}
                                        <div className="mt-4 pt-4 border-t border-amber-200">
                                          <div className="flex items-center justify-between mb-2">
                                            <FormLabel className="text-xs font-semibold text-amber-900 flex items-center gap-1">
                                              <Shield className="h-3.5 w-3.5" />
                                              Ejercicios de Respaldo ({exerciseSubstitutes.length}/3)
                                            </FormLabel>
                                            {!isViewMode && (
                                              <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="h-6 px-2 text-xs border-amber-300 hover:bg-amber-50"
                                                onClick={() => openSubstitutesDialog(exercise.exercise_id, exercise.exercise_name || 'Ejercicio')}
                                              >
                                                <Edit className="h-3 w-3 mr-1" />
                                                Editar
                                              </Button>
                                            )}
                                          </div>
                                          <div className="flex flex-wrap gap-2 mt-2">
                                            {exerciseSubstitutes.length > 0 ? (
                                              exerciseSubstitutes.map((substitute: any, subIndex: number) => (
                                                <Badge
                                                  key={subIndex}
                                                  variant="secondary"
                                                  className="bg-gradient-to-r from-amber-100 to-orange-100 text-amber-900 border border-amber-300 text-xs px-2 py-1"
                                                >
                                                  <Shield className="h-3 w-3 mr-1 inline" />
                                                  #{subIndex + 1} {substitute.substitute_name || substitute.name}
                                                  {substitute.notes && (
                                                    <span className="ml-1 text-[10px] opacity-70">({substitute.notes})</span>
                                                  )}
                                                </Badge>
                                              ))
                                            ) : (
                                              <p className="text-[10px] text-gray-500 italic">Sin ejercicios de respaldo configurados</p>
                                            )}
                                          </div>
                                          <p className="text-[10px] text-amber-700 mt-2 italic">
                                            El usuario puede usar estos ejercicios si no puede realizar el principal.
                                          </p>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  )
                                })}
                              </div>
                            )}
                          </>
                        )}

                        {day.is_rest_day && (
                          <div className="text-center py-8 text-muted-foreground">
                            <Calendar className="h-12 w-12 mx-auto mb-2" />
                            <p>Día de descanso activo</p>
                            <Textarea
                              placeholder="Actividades de recuperación recomendadas..."
                              value={day.notes}
                              onChange={(e) => updateWorkoutDay(day.id, 'notes', e.target.value)}
                              rows={3}
                              disabled={isViewMode}
                              autoComplete="off"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}

                {/* Botón para agregar día debajo de la lista */}
                {!isViewMode && (
                  <div className="flex flex-wrap justify-center gap-2 pt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addWorkoutDay}
                      className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Día
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addWorkoutWeek}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Agregar Semana
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              {isViewMode ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!isViewMode && (
              <Button
                onClick={() => handleSubmitPlan()}
                disabled={!formData.name || !formData.description || isLoading}
                className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white border-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    Actualizar Plan
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para asignar copia de plantilla a usuario */}
      <Dialog open={showAssignUserDialog} onOpenChange={setShowAssignUserDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-amber-500" />
              Asignar copia a usuario
            </DialogTitle>
            <DialogDescription>
              Clona esta plantilla y la asigna al usuario seleccionado como su plan de entrenamiento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <FormLabel className="text-sm font-medium">Usuario destino</FormLabel>
            <Select value={assignUserTargetId} onValueChange={setAssignUserTargetId}>
              <SelectTrigger><SelectValue placeholder="Selecciona un usuario" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecciona un usuario</SelectItem>
                {usersList.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignUserDialog(false)} disabled={assigningToUser}>
              Cancelar
            </Button>
            <Button
              onClick={handleAssignToUser}
              disabled={assigningToUser || assignUserTargetId === "none"}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
            >
              {assigningToUser ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Asignando...</>
              ) : (
                <><UserPlus className="h-4 w-4 mr-2" />Asignar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar substitutes */}
      <Dialog open={showSubstitutesDialog} onOpenChange={setShowSubstitutesDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-600" />
              Editar Ejercicios de Respaldo
            </DialogTitle>
            <DialogDescription>
              {substitutesExerciseName && `Para: ${substitutesExerciseName}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <FormLabel className="text-sm font-semibold flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" />
                Respaldos actuales ({substitutes.length}/3)
              </FormLabel>

              {loadingSubstitutes ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando respaldos...
                </div>
              ) : substitutes.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto mt-2">
                  {substitutes.map((substitute: any, idx: number) => (
                    <div
                      key={String(substitute?.substitute_id ?? substitute?.id ?? idx)}
                      className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded-md"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <Badge variant="secondary" className="bg-amber-100 text-amber-900">
                          #{idx + 1}
                        </Badge>
                        <div className="text-sm text-gray-700">
                          {fixEncoding(substitute.substitute_name || substitute.name || "Ejercicio")}
                          {substitute.category && (
                            <div className="text-xs text-muted-foreground">
                              {fixEncoding(substitute.category)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => moveSubstituteUp(idx)}
                          disabled={idx === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => moveSubstituteDown(idx)}
                          disabled={idx === substitutes.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRemoveSubstitute(String(substitute?.substitute_id ?? substitute?.id))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm mt-2 border border-dashed rounded-md">
                  Sin ejercicios de respaldo configurados
                </div>
              )}
            </div>

            {/* Mensaje si no hay substitutes */}
            {substitutes.length === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                Sin ejercicios de respaldo configurados
              </div>
            )}

            {/* Agregar nuevos substitutes (solo si hay espacio) */}
            {substitutes.length < 3 && (
              <div className="space-y-2 pt-4 border-t">
                <FormLabel className="text-sm font-semibold">
                  Agregar Ejercicio de Respaldo
                </FormLabel>
                <Input
                  type="text"
                  placeholder="Buscar ejercicio..."
                  value={substituteSearch}
                  onChange={(e) => setSubstituteSearch(e.target.value)}
                  className="text-sm"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 max-h-64 overflow-y-auto">
                  {availableForSubstitute.map((exerciseOption) => (
                    <Button
                      key={String(exerciseOption.id)}
                      type="button"
                      variant="outline"
                      className="justify-between h-auto py-2"
                      onClick={() => handleAddSubstitute(String(exerciseOption.id))}
                    >
                      <div className="text-left">
                        <div className="text-sm font-medium">{fixEncoding(exerciseOption.name || '')}</div>
                        {exerciseOption.category && (
                          <div className="text-xs text-muted-foreground">{fixEncoding(exerciseOption.category)}</div>
                        )}
                      </div>
                      <Plus className="h-4 w-4" />
                    </Button>
                  ))}
                </div>

                {availableForSubstitute.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    No hay más ejercicios disponibles con ese filtro.
                  </p>
                )}
              </div>
            )}

            {substitutes.length >= 3 && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-xs text-amber-700">
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  Has alcanzado el límite de 3 ejercicios de respaldo
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowSubstitutesDialog(false)
                setSubstituteSearch("")
              }}
            >
              Cerrar
            </Button>
            <Button
              type="button"
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
              onClick={() => {
                setShowSubstitutesDialog(false)
                setSubstituteSearch("")
                toast({
                  title: "✅ Cambios guardados",
                  description: "Los ejercicios de respaldo se actualizarán al guardar el plan",
                })
              }}
            >
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
