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
  } = useAdminWorkoutPlans()

  const [loadingDetail, setLoadingDetail] = useState(false)

  const [selectedPlans, setSelectedPlans] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all")
  const [goalFilter, setGoalFilter] = useState<string>("all")
  const [locationFilter, setLocationFilter] = useState<string>("all")
  const [userFilter, setUserFilter] = useState<string>("all")
  const [planTypeFilter, setPlanTypeFilter] = useState<string>("all") // all | templates | users
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null)
  const [isViewMode, setIsViewMode] = useState(false) // Modo solo lectura
  const [isLoading, setIsLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
   const [showImportDialog, setShowImportDialog] = useState(false)
  
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
  const [selectedExercisesForDay, setSelectedExercisesForDay] = useState<{[dayId: string]: string[]}>({})
  const [showExerciseSelector, setShowExerciseSelector] = useState<{[dayId: string]: boolean}>({})
  
  // Estados para búsqueda y filtros de ejercicios
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState<{[dayId: string]: string}>({})
  const [exerciseCategoryFilter, setExerciseCategoryFilter] = useState<{[dayId: string]: string}>({})
  const [exerciseMuscleFilter, setExerciseMuscleFilter] = useState<{[dayId: string]: string}>({})

  // Aplicar filtros del servidor y ordenamiento local - asegurar que plans sea un array
  const plansArray = Array.isArray(plans) ? plans : []
  const filteredPlans = plansArray.filter((plan) => {
    if (!plan) return false
    // Filtro de ubicación (cliente porque no está en el backend)
    if (locationFilter !== "all") {
      const isHome = fixEncoding(plan.name || '').toLowerCase().includes('casa')
      const isGym = fixEncoding(plan.name || '').toLowerCase().includes('gimnasio')
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
    const newFilters = {
      search: searchTerm,
      difficulty: difficultyFilter,
      goal: goalFilter,
      min_role_required: roleFilter,
      location: locationFilter, // Este se filtra en cliente
      user: userFilter !== 'all' ? userFilter : undefined,
      is_template:
        planTypeFilter === 'templates' ? true :
        planTypeFilter === 'users' ? false :
        undefined
    }
    
    // Debounce para búsqueda
    if (searchTerm !== serverFilters.search) {
      const timer = setTimeout(() => {
        updateFilters(newFilters)
      }, 500)
      return () => clearTimeout(timer)
    } else {
      updateFilters(newFilters)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, roleFilter, difficultyFilter, goalFilter, locationFilter, userFilter, planTypeFilter])

  function getPlanCategory(plan: any) {
    if (!plan) return "Desconocido"
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
      const response = await authenticatedFetch('admin/workouts/workouts/export_csv/', {
        method: 'GET',
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
      const response = await authenticatedFetch('admin/workouts/workouts/export_excel/', {
        method: 'GET',
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
        const errorText = await response.text();
        throw new Error(errorText || 'Error al importar');
      }
      
      let data = null;
      try {
        data = await response.json();
      } catch {}
      
      toast({
        title: '✅ Importación',
        description: data?.message || 'Planes importados correctamente.'
      });
      
      setImportFile(null);
      setShowImportDialog(false);
      refetch();
    } catch (error) {
      toast({ 
        title: '❌ Error', 
        description: error instanceof Error ? error.message : 'No se pudo importar', 
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
    setWorkoutDays(prev => [...prev, {
      id: Date.now().toString(),
      day_name: `Día ${newDayNumber}`,
      day_number: newDayNumber,
      is_rest_day: false,
      notes: '',
      exercises: []
    }])
  }

  const removeWorkoutDay = (dayId: string) => {
    if (isViewMode) return
    const daysArray = Array.isArray(workoutDays) ? workoutDays : []
    if (daysArray.length > 1) {
      setWorkoutDays(prev => {
        const prevArray = Array.isArray(prev) ? prev : []
        return prevArray.filter(day => day && day.id !== dayId)
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
          return { ...day, exercises: [...exercisesArray, newExercise] }
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
    
    selectedIds.forEach(exerciseId => {
      // Verificar si el ejercicio ya está en el día
      const workoutDaysArray = Array.isArray(workoutDays) ? workoutDays : []
      const day = workoutDaysArray.find(d => d && d.id === dayId)
      const dayExercises = Array.isArray(day?.exercises) ? day.exercises : []
      const alreadyExists = dayExercises.some(e => String(e.exercise_id) === String(exerciseId))
      
      if (!alreadyExists) {
        addExerciseToDay(dayId, exerciseId)
      }
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
        
        // Actualizar day_number
        return newDays.map((day, index) => ({
          ...day,
          day_number: index + 1
        }))
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
        
        // Actualizar day_number
        return newDays.map((day, index) => ({
          ...day,
          day_number: index + 1
        }))
      })
    }
  }

  const removeExerciseFromDay = (dayId: string, exerciseIndex: number) => {
    if (isViewMode) return
    setWorkoutDays(prev => {
      const prevArray = Array.isArray(prev) ? prev : []
      return prevArray.map(day => {
        if (!day) return day
        if (day.id === dayId) {
          const exercisesArray = Array.isArray(day.exercises) ? day.exercises : []
          return { ...day, exercises: exercisesArray.filter((_, index) => index !== exerciseIndex) }
        }
        return day
      })
    })
  }

  const updateExerciseInDay = (dayId: string, exerciseIndex: number, field: string, value: any) => {
    if (isViewMode) return
    setWorkoutDays(prev => {
      const prevArray = Array.isArray(prev) ? prev : []
      return prevArray.map(day => {
        if (!day) return day
        if (day.id === dayId) {
          const exercisesArray = Array.isArray(day.exercises) ? day.exercises : []
          return {
            ...day, 
            exercises: exercisesArray.map((exercise, index) => 
              index === exerciseIndex ? { ...exercise, [field]: value } : exercise
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
        const planData = {
          ...formData,
          // En modo edición, mantener el usuario original (no permitir cambio)
          user: editingPlan.user_id || undefined,
          assigned_users: undefined, // No enviar assigned_users en edición
          days: (Array.isArray(workoutDays) ? workoutDays : []).map(day => ({
            day_name: day.day_name,
            day_number: day.day_number,
            is_rest_day: day.is_rest_day,
            notes: day.notes,
            exercises: day.exercises
          }))
        }
        await updatePlan(editingPlan.id, planData)
        toast({
          title: "✅ Plan actualizado",
          description: "El plan de entrenamiento ha sido actualizado correctamente",
        })
        resetForm()
        refetch()
      } else {
        // Si NO hay usuarios seleccionados, crear como plantilla
        if (formData.assigned_users.length === 0) {
          const planData = {
            name: formData.name,
            description: formData.description,
            difficulty: formData.difficulty,
            duration_weeks: formData.duration_weeks,
            min_role_required: formData.min_role_required,
            estimated_duration_minutes: formData.estimated_duration_minutes,
            user: undefined, // Sin usuario = plantilla
            days: []
          }
          
          const created = await createPlan(planData)
          toast({
            title: "✅ Plantilla creada",
            description: configureExercises ? "Ahora configura los ejercicios." : "Creada correctamente.",
          })
          setShowCreateDialog(false)
          setCreateStep("basic")
          
          if (configureExercises && created?.id) {
            setWorkoutEditorPlanId(String(created.id))
            setShowWorkoutEditor(true)
          } else {
            resetForm()
            refetch()
          }
        } else {
          // Si HAY usuarios seleccionados, crear una copia del plan por cada uno
          const createdPlans: any[] = []
          
          for (const userId of formData.assigned_users) {
            const planData = {
              name: formData.name,
              description: formData.description,
              difficulty: formData.difficulty,
              duration_weeks: formData.duration_weeks,
              min_role_required: formData.min_role_required,
              estimated_duration_minutes: formData.estimated_duration_minutes,
              user: userId, // Asignar a este usuario específico
              days: []
            }
            
            try {
              const created = await createPlan(planData)
              createdPlans.push(created)
            } catch (error) {
              console.error(`Error creating plan for user ${userId}:`, error)
              // Continuar con los demás usuarios
            }
          }
          
          if (createdPlans.length > 0) {
            toast({
              title: `✅ ${createdPlans.length} plan(es) creado(s)`,
              description: `Se asignó el plan a ${createdPlans.length} usuario(s)`,
            })
            
            setShowCreateDialog(false)
            setCreateStep("basic")
            
            // Si solo se creó un plan y se quiere configurar ejercicios
            if (configureExercises && createdPlans.length === 1 && createdPlans[0]?.id) {
              setWorkoutEditorPlanId(String(createdPlans[0].id))
              setShowWorkoutEditor(true)
            } else if (configureExercises && createdPlans.length > 1) {
              toast({
                title: "ℹ️ Múltiples usuarios",
                description: "Para configurar ejercicios, edita cada plan individualmente",
                variant: "default"
              })
              resetForm()
              refetch()
            } else {
              resetForm()
              refetch()
            }
          } else {
            throw new Error("No se pudo crear ningún plan")
          }
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
      
      // Solo permitir este flujo si hay 0 o 1 usuario seleccionado
      if (formData.assigned_users.length > 1) {
        toast({
          title: "⚠️ Múltiples usuarios",
          description: "Para asignar a múltiples usuarios, usa 'Crear Plan Básico' y edita cada uno individualmente",
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
        user: formData.assigned_users.length === 1 ? formData.assigned_users[0] : undefined,
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

      // Solo permitir este flujo si hay 0 o 1 usuario seleccionado
      if (formData.assigned_users.length > 1) {
        toast({
          title: "⚠️ Múltiples usuarios",
          description: "Para asignar a múltiples usuarios, crea el plan primero y asigna luego",
          variant: "default"
        })
        setIsLoading(false)
        return
      }

      const planData = {
        name: formData.name,
        description: formData.description,
        difficulty: formData.difficulty,
        duration_weeks: formData.duration_weeks,
        min_role_required: formData.min_role_required,
        estimated_duration_minutes: formData.estimated_duration_minutes,
        user: formData.assigned_users.length === 1 ? formData.assigned_users[0] : undefined,
        days: []
      }

      const created = await createPlan(planData)

      if (created?.id) {
        setWorkoutEditorPlanId(String(created.id))
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
          assigned_users: [] // En modo edición no permitimos cambiar usuarios
        })
        
        // Convertir días del plan al formato del formulario
        if (planDetail.days && planDetail.days.length > 0) {
          const convertedDays = planDetail.days.map((day: any) => ({
            id: day.id || Date.now().toString(),
            day_name: day.name || day.day_name || `Día ${day.day_number}`,
            day_number: day.day_number || day.order_index || 1,
            is_rest_day: day.is_rest_day || false,
            notes: day.notes || '',
            exercises: (day.exercises || []).map((ex: any) => {
              // Extraer datos del ejercicio (puede venir como objeto o ID)
              const exerciseObj = typeof ex.exercise === 'object' ? ex.exercise : null
              return {
                exercise_id: exerciseObj ? exerciseObj.id : (ex.exercise_id || ex.exercise),
                exercise_name: exerciseObj ? exerciseObj.name : '',  // Guardar nombre para mostrar
                sets: ex.sets || 3,
                reps: ex.reps || '10',
                weight: ex.weight || 0,
                duration: ex.duration_seconds || 0,
                rest_time: ex.rest_seconds || 60,
                notes: ex.notes || '',
                order: ex.order_index || 0,
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
                 onChange={e => setImportFile(e.target.files?.[0] || null)}
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
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setShowImportDialog(false)} disabled={importing}>Cancelar</Button>
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
                  <SelectItem value="admin">Admin</SelectItem>
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
                  className={`border-2 transition-all ${
                    selectedPlans.includes(plan.id)
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
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    createStep === "basic"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setCreateStep("basic")}
                >
                  📝 Básicos
                </button>
                <button
                  type="button"
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    createStep === "exercises"
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
                        <SelectItem value="admin">Admin</SelectItem>
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
                    <SelectItem value="admin">Admin</SelectItem>
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
              <div className="flex items-center justify-between mb-4">
                <FormLabel className="text-lg font-semibold">Días de Entrenamiento</FormLabel>
                {!isViewMode && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={addWorkoutDay}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Día
                  </Button>
                )}
              </div>
              
              <div className="space-y-4">
                {Array.isArray(workoutDays) ? workoutDays.map((day, dayIndex) => {
                  if (!day) return null
                  return (
                  <Card key={day.id} className="border-2 border-purple-100">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <Input
                            value={day.day_name}
                            onChange={(e) => updateWorkoutDay(day.id, 'day_name', e.target.value)}
                            className="font-medium text-lg border-0 bg-transparent p-0 h-auto"
                            disabled={isViewMode}
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
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
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
                                            className={`flex items-center space-x-3 p-2 rounded border ${
                                              alreadyInDay 
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
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => removeExerciseFromDay(day.id, exerciseIndex)}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
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
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  )
                }) : null}
                
                {/* Botón para agregar día debajo de la lista */}
                <div className="flex justify-center pt-4">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={addWorkoutDay}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Nuevo Día
                  </Button>
                </div>
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
