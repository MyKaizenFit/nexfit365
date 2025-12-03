"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast"
import { useAdminWorkoutPlans, WorkoutPlan, Exercise, WorkoutDay } from "@/hooks/use-admin-workout-plans"
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
  ArrowDown
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
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
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
    estimated_duration_minutes: 60
  })
  
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

  // Aplicar filtros del servidor y ordenamiento local
  const filteredPlans = plans.filter((plan) => {
    // Filtro de ubicación (cliente porque no está en el backend)
    if (locationFilter !== "all") {
      const isHome = plan.name.toLowerCase().includes('casa')
      const isGym = plan.name.toLowerCase().includes('gimnasio')
      if (locationFilter === "home" && !isHome) return false
      if (locationFilter === "gym" && !isGym) return false
    }
    return true
  })
  
  // Ordenamiento
  const sortedPlans = [...filteredPlans].sort((a, b) => {
    let aValue: any
    let bValue: any
    
    switch (sortColumn) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'role':
        aValue = a.min_role_required
        bValue = b.min_role_required
        break
      case 'difficulty':
        aValue = a.difficulty
        bValue = b.difficulty
        break
      case 'duration':
        aValue = a.duration_weeks
        bValue = b.duration_weeks
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
  })
  
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
      location: locationFilter // Este se filtra en cliente
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
  }, [searchTerm, roleFilter, difficultyFilter, goalFilter, locationFilter])

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-purple-100 text-purple-800 border-0">Admin</Badge>
      case "premium":
        return <Badge className="bg-yellow-100 text-yellow-800 border-0">Premium</Badge>
      case "pro":
        return <Badge className="bg-blue-100 text-blue-800 border-0">Pro</Badge>
      case "basic":
        return <Badge variant="outline">Básico</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
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
      setSelectedPlans(currentPlans.map(plan => plan.id))
    } else {
      setSelectedPlans([])
    }
  }

  const handleSelectPlan = (planId: string, checked: boolean) => {
    if (checked) {
      setSelectedPlans(prev => [...prev, planId])
    } else {
      setSelectedPlans(prev => prev.filter(id => id !== planId))
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
    if (workoutDays.length > 1) {
      setWorkoutDays(prev => prev.filter(day => day.id !== dayId))
    }
  }

  const updateWorkoutDay = (dayId: string, field: string, value: any) => {
    setWorkoutDays(prev => prev.map(day => 
      day.id === dayId ? { ...day, [field]: value } : day
    ))
  }

  const addExerciseToDay = (dayId: string, exerciseId: string) => {
    const exercise = exercises.find(e => String(e.id) === String(exerciseId))
    if (!exercise) return

    const newExercise = {
      exercise_id: String(exerciseId),
      exercise_name: exercise.name,  // Guardar nombre para mostrar
      sets: 3,
      reps: '10',
      weight: 0,
      duration: 0,
      rest_time: 60,
      notes: '',
      order: workoutDays.find(d => d.id === dayId)?.exercises.length || 0
    }

    setWorkoutDays(prev => prev.map(day => 
      day.id === dayId 
        ? { ...day, exercises: [...day.exercises, newExercise] }
        : day
    ))
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
      const current = prev[dayId] || []
      const isSelected = current.includes(exerciseId)
      
      return {
        ...prev,
        [dayId]: isSelected 
          ? current.filter(id => id !== exerciseId)
          : [...current, exerciseId]
      }
    })
  }

  const addSelectedExercisesToDay = (dayId: string) => {
    const selectedIds = selectedExercisesForDay[dayId] || []
    
    selectedIds.forEach(exerciseId => {
      // Verificar si el ejercicio ya está en el día
      const day = workoutDays.find(d => d.id === dayId)
      const alreadyExists = day?.exercises.some(e => String(e.exercise_id) === String(exerciseId))
      
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
    setWorkoutDays(prev => prev.map(day => 
      day.id === dayId 
        ? { ...day, exercises: day.exercises.filter((_, index) => index !== exerciseIndex) }
        : day
    ))
  }

  const updateExerciseInDay = (dayId: string, exerciseIndex: number, field: string, value: any) => {
    setWorkoutDays(prev => prev.map(day => 
      day.id === dayId 
        ? {
            ...day, 
            exercises: day.exercises.map((exercise, index) => 
              index === exerciseIndex ? { ...exercise, [field]: value } : exercise
            )
          }
        : day
    ))
  }

  const handleSubmitPlan = async () => {
    try {
      setIsLoading(true)
      
      const planData = {
        ...formData,
        days: workoutDays.map(day => ({
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
        estimated_duration_minutes: 60
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
      estimated_duration_minutes: 60
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
          name: planDetail.name || '',
          description: planDetail.description || '',
          difficulty: planDetail.difficulty || 'beginner',
          duration_weeks: planDetail.duration_weeks || 4,
          min_role_required: planDetail.min_role_required || 'basic',
          estimated_duration_minutes: planDetail.estimated_duration_minutes || 60
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
          title: "❌ Error",
          description: "No se pudo cargar el plan",
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

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Planes de Entrenamiento</CardTitle>
            <div className="flex items-center space-x-2">
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
        <CardContent>
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
                        Rol
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
                  {currentPlans.map((plan) => (
                    <tr key={plan.id} className="border-t hover:bg-muted/50">
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={selectedPlans.includes(plan.id)}
                            onCheckedChange={(checked) => handleSelectPlan(plan.id, checked as boolean)}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="font-medium">{plan.name}</div>
                              {plan.is_default && (
                                <Badge className="bg-yellow-100 text-yellow-800 border-0" title="Plan por defecto">
                                  <Star className="h-3 w-3 mr-1" />
                                  Por defecto
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {plan.description 
                                ? (plan.description.length > 50 
                                    ? `${plan.description.substring(0, 50)}...` 
                                    : plan.description)
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
                      <td className="p-3">{getRoleBadge(plan.min_role_required)}</td>
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Paginación */}
          {totalCount > 50 && (
            <div className="border-t p-4 flex items-center justify-between">
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
                {workoutDays.map((day, dayIndex) => (
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

                                    {/* Lista de ejercicios con checkboxes */}
                                    <div className="max-h-60 overflow-y-auto space-y-2">
                                      {exercises.map((exercise) => {
                                        const exerciseIdStr = String(exercise.id)
                                        const isSelected = selectedExercisesForDay[day.id]?.includes(exerciseIdStr) || false
                                        const alreadyInDay = day.exercises.some(e => String(e.exercise_id) === exerciseIdStr)
                                        
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
                                              <div className="font-medium text-sm">{exercise.name}</div>
                                              <div className="text-xs text-muted-foreground">
                                                {exercise.category} • {exercise.muscle_groups?.join(', ')}
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
                          {day.exercises.length > 0 && (
                            <div className="space-y-3">
                              <FormLabel>Ejercicios del día ({day.exercises.length})</FormLabel>
                              {day.exercises.map((exercise, exerciseIndex) => {
                                // Buscar datos del ejercicio en el array de ejercicios disponibles
                                const exerciseData = exercises.find(e => String(e.id) === String(exercise.exercise_id))
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
                ))}
                
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
