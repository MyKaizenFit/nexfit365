"use client"

import { useState, useEffect } from "react"
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
  ArrowRight
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

export function WorkoutPlanManagement() {
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
  const [isLoading, setIsLoading] = useState(false)

  const [usersList, setUsersList] = useState<Array<{ id: string; email: string }>>([])
  
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
    user: '' // opcional: si se setea, se crea/edita como plan de usuario
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

  // Funciones para manejar el formulario
  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addWorkoutDay = () => {
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
    const daysArray = Array.isArray(workoutDays) ? workoutDays : []
    if (daysArray.length > 1) {
      setWorkoutDays(prev => {
        const prevArray = Array.isArray(prev) ? prev : []
        return prevArray.filter(day => day && day.id !== dayId)
      })
    }
  }

  const updateWorkoutDay = (dayId: string, field: string, value: any) => {
    setWorkoutDays(prev => {
      const prevArray = Array.isArray(prev) ? prev : []
      return prevArray.map(day => 
        day && day.id === dayId ? { ...day, [field]: value } : day
      )
    })
  }

  const addExerciseToDay = (dayId: string, exerciseId: string) => {
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
    setShowExerciseSelector(prev => ({
      ...prev,
      [dayId]: !prev[dayId]
    }))
  }

  const toggleExerciseSelection = (dayId: string, exerciseId: string) => {
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

  const handleSubmitPlan = async () => {
    try {
      setIsLoading(true)
      
      const planData = {
        ...formData,
        days: (Array.isArray(workoutDays) ? workoutDays : []).map(day => ({
          day_name: day.day_name,
          day_number: day.day_number,
          is_rest_day: day.is_rest_day,
          notes: day.notes,
          exercises: day.exercises
        }))
      }

      if (editingPlan) {
        await updatePlan(editingPlan.id, planData)
        toast({
          title: "✅ Plan actualizado",
          description: "El plan de entrenamiento ha sido actualizado correctamente",
        })
      } else {
        await createPlan(planData)
        toast({
          title: "✅ Plan creado",
          description: "El plan de entrenamiento ha sido creado correctamente",
        })
      }

      // Reset form
      setFormData({
        name: '',
        description: '',
        difficulty: 'beginner',
        duration_weeks: 4,
        min_role_required: 'basic',
        estimated_duration_minutes: 60,
        user: ''
      })
      setWorkoutDays([{
        id: '1',
        day_name: 'Día 1 - Tren Superior',
        day_number: 1,
        is_rest_day: false,
        notes: '',
        exercises: []
      }])
      setShowCreateDialog(false)
      setEditingPlan(null)
      
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

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      difficulty: 'beginner',
      duration_weeks: 4,
      min_role_required: 'basic',
      estimated_duration_minutes: 60,
      user: ''
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
  }

  // Función para cargar los detalles completos de un plan y abrir el editor
  const handleEditPlan = async (planId: string) => {
    try {
      setLoadingDetail(true)
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
          user: planDetail.user ? String(planDetail.user) : ''
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
                order: ex.order_index || 0
              }
            })
          }))
          setWorkoutDays(convertedDays)
          console.log('📋 Días cargados:', convertedDays.map(d => ({ 
            name: d.day_name, 
            exercises: d.exercises.map(e => e.exercise_name || e.exercise_id)
          })))
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
      console.error('Error loading plan detail:', error)
      toast({
        title: "❌ Error",
        description: "Error al cargar los detalles del plan",
        variant: "destructive",
      })
    } finally {
      setLoadingDetail(false)
    }
  }

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestión de Planes de Entrenamiento</h2>
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

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Planes</CardTitle>
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_programs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Planes Activos</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_programs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recientes</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recent_programs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Por Rol</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(stats.programs_by_role || {}).length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                                onClick={() => handleEditPlan(plan.id)}
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
                                onClick={() => handleEditPlan(plan.id)}
                                disabled={loadingDetail}
                              >
                                {loadingDetail ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Edit className="h-4 w-4 mr-2" />
                                )}
                                Editar
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
                              onClick={() => handleEditPlan(plan.id)}
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
                              onClick={() => handleEditPlan(plan.id)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || !!editingPlan} onOpenChange={(open) => {
        if (!open) {
          resetForm()
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? 'Editar Plan de Entrenamiento' : 'Crear Nuevo Plan de Entrenamiento'}
            </DialogTitle>
            <DialogDescription>
              {editingPlan ? 'Modifica la información del plan de entrenamiento' : 'Crea una nueva rutina de entrenamiento usando los ejercicios disponibles'}
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
            
            <div className="grid gap-4 md:grid-cols-4">
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
                <FormLabel>Asignar a Usuario (opcional)</FormLabel>
                <Select value={formData.user || 'none'} onValueChange={(value) => handleFormChange('user', value === 'none' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Plantilla (sin usuario)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Plantilla (sin usuario)</SelectItem>
                    {usersList.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FormLabel>Rol Mínimo Requerido *</FormLabel>
                <Select value={formData.min_role_required} onValueChange={(value) => handleFormChange('min_role_required', value)}>
                  <SelectTrigger>
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
                />
              </div>
            </div>

            {/* Días de entrenamiento */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <FormLabel className="text-lg font-semibold">Días de Entrenamiento</FormLabel>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={addWorkoutDay}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Día
                </Button>
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
                          />
                          <Checkbox
                            checked={day.is_rest_day}
                            onCheckedChange={(checked) => updateWorkoutDay(day.id, 'is_rest_day', checked)}
                          />
                          <span className="text-sm text-muted-foreground">Día de descanso</span>
                        </div>
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
                            />
                          </div>

                          {/* Selector múltiple de ejercicios */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <FormLabel>Agregar Ejercicios</FormLabel>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleExerciseSelector(day.id)}
                                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                {showExerciseSelector[day.id] ? 'Cancelar' : 'Seleccionar Ejercicios'}
                              </Button>
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
                                return (
                                  <Card key={exerciseIndex} className="border border-gray-200">
                                    <CardContent className="pt-4">
                                      <div className="flex items-center justify-between mb-3">
                                        <div>
                                          <h4 className="font-medium">{displayName}</h4>
                                          <p className="text-sm text-muted-foreground">{displayCategory}</p>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => removeExerciseFromDay(day.id, exerciseIndex)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div>
                                          <FormLabel className="text-xs">Series</FormLabel>
                                          <Input
                                            type="number"
                                            value={exercise.sets}
                                            onChange={(e) => updateExerciseInDay(day.id, exerciseIndex, 'sets', parseInt(e.target.value) || 0)}
                                            className="h-8"
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
                                          />
                                        </div>
                                        <div>
                                          <FormLabel className="text-xs">Descanso (seg)</FormLabel>
                                          <Input
                                            type="number"
                                            value={exercise.rest_time || ''}
                                            onChange={(e) => updateExerciseInDay(day.id, exerciseIndex, 'rest_time', parseInt(e.target.value) || 0)}
                                            className="h-8"
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
                                        />
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
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmitPlan}
              disabled={!formData.name || !formData.description || isLoading}
              className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white border-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editingPlan ? 'Actualizando...' : 'Creando...'}
                </>
              ) : (
                <>
                  {editingPlan ? 'Actualizar' : 'Crear'} Plan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
