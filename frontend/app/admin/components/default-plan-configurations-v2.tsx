"use client"

import { useMemo, useState, type JSX } from "react"
import { Plus, RefreshCw, Settings, Target, Trash2, Edit, Eye, AlertCircle, Info, Filter, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { UpsertDefaultPlanConfigurationPayload, DefaultPlanConfiguration, PlanOption } from "@/types"
import { useDefaultPlanConfigurations } from "@/hooks/use-default-plan-configurations"
import { SearchablePlanSelect } from "./searchable-plan-select"

type DialogMode = "create" | "edit"

const DEFAULT_FORM: UpsertDefaultPlanConfigurationPayload = {
  name: "",
  description: "",
  priority: 100,
  is_active: true,
  main_goal: null,
  training_location: null,
  activity_level: null,
  gender: null,
  min_training_days_per_week: null,
  max_training_days_per_week: null,
  age_min: null,
  age_max: null,
  dietary_restrictions: [],
  equipment_keywords: [],
  default_nutrition_plan_id: null,
  default_workout_program_id: null,
}

const parseList = (value: string): string[] =>
  value
    .split(",")
    .map(item => item.trim())
    .filter(Boolean)

const formatList = (items?: string[]): string => (items && items.length ? items.join(", ") : "")

const safeNumber = (value: string): number | null => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

// Prioridades con descripciones claras
const priorityOptions = [
  { value: 10, label: "Muy Específica", description: "Gimnasio + Actividad + Objetivo" },
  { value: 20, label: "Específica", description: "Gimnasio + Objetivo" },
  { value: 30, label: "Moderada", description: "Objetivo + Actividad" },
  { value: 50, label: "General", description: "Solo Objetivo" },
  { value: 100, label: "Muy General", description: "Fallback - Sin criterios" },
  { value: 150, label: "Personalizada", description: "Valor personalizado" },
  { value: 200, label: "Último Recurso", description: "Solo si no hay otra opción" },
]

// Helper para obtener la descripción de la prioridad
const getPriorityLabel = (priority: number): string => {
  const option = priorityOptions.find(p => p.value === priority)
  if (option) return `${option.value} - ${option.label}`
  
  if (priority < 20) return `${priority} - Muy Específica`
  if (priority < 50) return `${priority} - Específica`
  if (priority < 100) return `${priority} - Moderada`
  if (priority < 150) return `${priority} - General`
  return `${priority} - Muy General`
}

const getPriorityVariant = (priority: number): "default" | "secondary" | "outline" | "destructive" => {
  if (priority < 20) return "default"
  if (priority < 50) return "secondary"
  if (priority < 100) return "outline"
  return "secondary"
}

const goalOptions: PlanOption[] = [
  { id: "weight_loss", name: "Pérdida de peso" },
  { id: "muscle_gain", name: "Ganancia muscular" },
  { id: "maintenance", name: "Mantenimiento" },
  { id: "performance", name: "Rendimiento deportivo" },
]

const locationOptions: PlanOption[] = [
  { id: "home", name: "Casa" },
  { id: "gym", name: "Gimnasio" },
  { id: "outdoor", name: "Aire libre" },
]

const activityOptions: PlanOption[] = [
  { id: "beginner", name: "Principiante" },
  { id: "intermediate", name: "Intermedio" },
  { id: "advanced", name: "Avanzado" },
]

const genderOptions: PlanOption[] = [
  { id: "female", name: "Femenino" },
  { id: "male", name: "Masculino" },
  { id: "other", name: "Otro / No especificado" },
]

interface ConfigDialogState {
  open: boolean
  mode: DialogMode
  targetId: string | null
  form: UpsertDefaultPlanConfigurationPayload
  dietaryInput: string
  equipmentInput: string
}

export function DefaultPlanConfigurationsPanelV2(): JSX.Element {
  const {
    configurations,
    nutritionPlans,
    workoutPrograms,
    loading,
    loadingNutritionPlans,
    loadingWorkoutPrograms,
    saving,
    error,
    refetch,
    createConfiguration,
    updateConfiguration,
    deleteConfiguration,
  } = useDefaultPlanConfigurations()

  const [dialogState, setDialogState] = useState<ConfigDialogState>({
    open: false,
    mode: "create",
    targetId: null,
    form: DEFAULT_FORM,
    dietaryInput: "",
    equipmentInput: "",
  })

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [configToDelete, setConfigToDelete] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterPriority, setFilterPriority] = useState<string>("all")

  const handleOpenDialog = (mode: DialogMode, config?: DefaultPlanConfiguration) => {
    if (mode === "edit" && config) {
      setDialogState({
        open: true,
        mode,
        targetId: config.id,
        form: {
          name: config.name,
          description: config.description,
          priority: config.priority,
          is_active: config.is_active,
          main_goal: config.main_goal ?? null,
          training_location: config.training_location ?? null,
          activity_level: config.activity_level ?? null,
          gender: config.gender ?? null,
          min_training_days_per_week: config.min_training_days_per_week,
          max_training_days_per_week: config.max_training_days_per_week,
          age_min: config.age_min,
          age_max: config.age_max,
          dietary_restrictions: config.dietary_restrictions ?? [],
          equipment_keywords: config.equipment_keywords ?? [],
          default_nutrition_plan_id: config.default_nutrition_plan?.id ?? null,
          default_workout_program_id: config.default_workout_program?.id ?? null,
        },
        dietaryInput: formatList(config.dietary_restrictions),
        equipmentInput: formatList(config.equipment_keywords),
      })
    } else {
      setDialogState({
        open: true,
        mode: "create",
        targetId: null,
        form: DEFAULT_FORM,
        dietaryInput: "",
        equipmentInput: "",
      })
    }
  }

  const handleCloseDialog = () => {
    if (saving) return
    setDialogState(prev => ({
      ...prev,
      open: false,
    }))
  }

  const handleChange = (field: keyof UpsertDefaultPlanConfigurationPayload, value: string | number | boolean | null) => {
    setDialogState(prev => ({
      ...prev,
      form: {
        ...prev.form,
        [field]: value,
      },
    }))
  }

  const handleSubmit = async () => {
    const payload: UpsertDefaultPlanConfigurationPayload = {
      ...dialogState.form,
      priority: Number(dialogState.form.priority) || 100,
      min_training_days_per_week: safeNumber(String(dialogState.form.min_training_days_per_week ?? "")),
      max_training_days_per_week: safeNumber(String(dialogState.form.max_training_days_per_week ?? "")),
      age_min: safeNumber(String(dialogState.form.age_min ?? "")),
      age_max: safeNumber(String(dialogState.form.age_max ?? "")),
      dietary_restrictions: parseList(dialogState.dietaryInput),
      equipment_keywords: parseList(dialogState.equipmentInput),
    }

    try {
      if (dialogState.mode === "create") {
        await createConfiguration(payload)
      } else if (dialogState.targetId) {
        await updateConfiguration(dialogState.targetId, payload)
      }
      handleCloseDialog()
    } catch {
      // El hook ya muestra el error
    }
  }

  const handleDeleteClick = (configId: string) => {
    setConfigToDelete(configId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!configToDelete) return
    try {
      await deleteConfiguration(configToDelete)
      setDeleteDialogOpen(false)
      setConfigToDelete(null)
    } catch {
      // El hook ya muestra el error
    }
  }

  // Deduplicación por ID para evitar duplicados (usando Map para mejor rendimiento)
  const uniqueConfigurations = useMemo(() => {
    const uniqueMap = new Map<string, DefaultPlanConfiguration>()
    for (const config of configurations) {
      if (config && config.id) {
        const id = String(config.id)
        if (!uniqueMap.has(id)) {
          uniqueMap.set(id, config)
        }
      }
    }
    const unique = Array.from(uniqueMap.values())
    if (unique.length !== configurations.length) {
      console.warn(`[DefaultPlanConfigurationsPanelV2] ⚠️ Se encontraron ${configurations.length - unique.length} duplicados, eliminados`)
    }
    return unique
  }, [configurations])

  const activeConfigurations = useMemo(() => {
    return uniqueConfigurations.filter(config => config.is_active)
  }, [uniqueConfigurations])

  const inactiveConfigurations = useMemo(() => {
    return uniqueConfigurations.filter(config => !config.is_active)
  }, [uniqueConfigurations])

  // Filtrado y búsqueda
  const filteredConfigurations = useMemo(() => {
    let filtered = uniqueConfigurations

    // Filtrar por búsqueda
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(config =>
        config.name.toLowerCase().includes(search) ||
        (config.description && config.description.toLowerCase().includes(search)) ||
        (config.main_goal && config.main_goal.toLowerCase().includes(search))
      )
    }

    // Filtrar por prioridad
    if (filterPriority !== "all") {
      const priorityNum = Number(filterPriority)
      filtered = filtered.filter(config => {
        if (filterPriority === "low") return config.priority < 50
        if (filterPriority === "medium") return config.priority >= 50 && config.priority < 100
        if (filterPriority === "high") return config.priority >= 100
        return config.priority === priorityNum
      })
    }

    return filtered
  }, [uniqueConfigurations, searchTerm, filterPriority])

  const filteredActive = useMemo(() => {
    return filteredConfigurations.filter(config => config.is_active)
  }, [filteredConfigurations])

  const filteredInactive = useMemo(() => {
    return filteredConfigurations.filter(config => !config.is_active)
  }, [filteredConfigurations])

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header móvil-friendly */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex-1 space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Configuraciones por defecto</h2>
          <p className="text-sm text-muted-foreground">
            Define reglas para asignar planes de nutrición y entrenamiento de forma automática.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => refetch()} 
            disabled={loading || saving}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Recargar</span>
          </Button>
          <Button 
            onClick={() => handleOpenDialog("create")} 
            disabled={saving}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva configuración
          </Button>
        </div>
      </div>

      {/* Info box responsive */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-blue-900">
                ¿Qué es la Prioridad?
              </p>
              <p className="text-xs md:text-sm text-blue-800">
                La prioridad determina el orden de evaluación. <strong>Números más bajos = mayor prioridad.</strong> Si un usuario cumple varias reglas, se aplicará la de menor número. Ejemplo: Prioridad 10 se evalúa antes que Prioridad 50.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              Error al cargar configuraciones
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {loading && configurations.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Cargando configuraciones...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros y búsqueda - Mobile friendly */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-lg">Filtros</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las prioridades</SelectItem>
                <SelectItem value="low">Alta (10-49)</SelectItem>
                <SelectItem value="medium">Media (50-99)</SelectItem>
                <SelectItem value="high">Baja (100+)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs para móvil - mejor organización */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span>Activas</span>
            <Badge variant="secondary" className="ml-1">
              {filteredActive.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="inactive" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Inactivas</span>
            <Badge variant="secondary" className="ml-1">
              {filteredInactive.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {filteredActive.length === 0 && !loading ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm font-medium text-muted-foreground">
                  {searchTerm || filterPriority !== "all" 
                    ? "No hay configuraciones activas que coincidan con los filtros." 
                    : "No hay configuraciones activas."}
                </p>
                {(searchTerm || filterPriority !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setSearchTerm("")
                      setFilterPriority("all")
                    }}
                  >
                    Limpiar filtros
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredActive.map(config => (
                <ConfigurationCard
                  key={config.id}
                  configuration={config}
                  onEdit={() => handleOpenDialog("edit", config)}
                  onDelete={() => handleDeleteClick(config.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          {filteredInactive.length === 0 && !loading ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm font-medium text-muted-foreground">
                  {searchTerm || filterPriority !== "all"
                    ? "No hay configuraciones inactivas que coincidan con los filtros."
                    : "No hay configuraciones inactivas."}
                </p>
                {(searchTerm || filterPriority !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setSearchTerm("")
                      setFilterPriority("all")
                    }}
                  >
                    Limpiar filtros
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredInactive.map(config => (
                <ConfigurationCard
                  key={config.id}
                  configuration={config}
                  onEdit={() => handleOpenDialog("edit", config)}
                  onDelete={() => handleDeleteClick(config.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de creación/edición */}
      <Dialog open={dialogState.open} onOpenChange={open => (open ? null : handleCloseDialog())}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {dialogState.mode === "create" ? "Crear configuración por defecto" : "Editar configuración"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                placeholder="Regla para principiantes - Home"
                value={dialogState.form.name}
                onChange={event => handleChange("name", event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Describe cuándo se aplica esta configuración..."
                value={dialogState.form.description ?? ""}
                onChange={event => handleChange("description", event.target.value)}
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="priority">
                  Nivel de Especificidad
                  <span className="text-xs text-muted-foreground ml-2 block sm:inline">
                    (Menor número = Más específica)
                  </span>
                </Label>
                <Select
                  value={String(dialogState.form.priority)}
                  onValueChange={value => handleChange("priority", Number(value))}
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Selecciona nivel de especificidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map(option => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        <div className="flex flex-col">
                          <span className="font-medium">{option.value} - {option.label}</span>
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="is_active">Estado</Label>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-sm">Configuración activa</span>
                  <Switch
                    id="is_active"
                    checked={dialogState.form.is_active}
                    onCheckedChange={checked => handleChange("is_active", checked)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Objetivo principal"
                value={dialogState.form.main_goal}
                options={goalOptions}
                onChange={value => handleChange("main_goal", value)}
              />
              <SelectField
                label="Lugar de entrenamiento"
                value={dialogState.form.training_location}
                options={locationOptions}
                onChange={value => handleChange("training_location", value)}
              />
              <SelectField
                label="Nivel de actividad"
                value={dialogState.form.activity_level}
                options={activityOptions}
                onChange={value => handleChange("activity_level", value)}
              />
              <SelectField
                label="Género"
                value={dialogState.form.gender}
                options={genderOptions}
                onChange={value => handleChange("gender", value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                label="Días mínimos de entrenamiento"
                value={dialogState.form.min_training_days_per_week}
                onChange={value => handleChange("min_training_days_per_week", value)}
              />
              <NumberField
                label="Días máximos de entrenamiento"
                value={dialogState.form.max_training_days_per_week}
                onChange={value => handleChange("max_training_days_per_week", value)}
              />
              <NumberField
                label="Edad mínima"
                value={dialogState.form.age_min}
                onChange={value => handleChange("age_min", value)}
              />
              <NumberField
                label="Edad máxima"
                value={dialogState.form.age_max}
                onChange={value => handleChange("age_max", value)}
              />
            </div>

            <SearchablePlanSelect
              label="Plan de nutrición por defecto"
              value={dialogState.form.default_nutrition_plan_id ?? null}
              options={nutritionPlans}
              onChange={(value) => handleChange("default_nutrition_plan_id", value)}
              placeholder="Selecciona un plan de nutrición..."
              emptyMessage="No se encontraron planes de nutrición."
              loading={loadingNutritionPlans}
            />

            <SearchablePlanSelect
              label="Programa de entrenamiento por defecto"
              value={dialogState.form.default_workout_program_id ?? null}
              options={workoutPrograms}
              onChange={(value) => handleChange("default_workout_program_id", value)}
              placeholder="Selecciona un programa de entrenamiento..."
              emptyMessage="No se encontraron programas de entrenamiento."
              loading={loadingWorkoutPrograms}
            />

            <div className="grid gap-2">
              <Label htmlFor="dietary">Restricciones alimentarias (separadas por comas)</Label>
              <Input
                id="dietary"
                placeholder="vegan, gluten-free"
                value={dialogState.dietaryInput}
                onChange={event => setDialogState(prev => ({ ...prev, dietaryInput: event.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="equipment">Equipamiento (separado por comas)</Label>
              <Input
                id="equipment"
                placeholder="mancuernas, bandas"
                value={dialogState.equipmentInput}
                onChange={event => setDialogState(prev => ({ ...prev, equipmentInput: event.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleCloseDialog} disabled={saving} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !dialogState.form.name.trim()} className="w-full sm:w-auto">
              {saving ? "Guardando..." : dialogState.mode === "create" ? "Crear configuración" : "Actualizar configuración"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar configuración?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La configuración será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface ConfigurationCardProps {
  configuration: DefaultPlanConfiguration
  onEdit: () => void
  onDelete: () => void
}

function ConfigurationCard({ configuration, onEdit, onDelete }: ConfigurationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const criteriaCount = [
    configuration.main_goal,
    configuration.training_location,
    configuration.activity_level,
    configuration.gender,
    configuration.min_training_days_per_week !== null,
    configuration.max_training_days_per_week !== null,
    configuration.age_min !== null,
    configuration.age_max !== null,
  ].filter(Boolean).length
  
  const specificityLevel = criteriaCount >= 3 ? "Muy Específica" : criteriaCount >= 2 ? "Específica" : criteriaCount >= 1 ? "Moderada" : "General"
  
  return (
    <Card className="border-muted hover:border-primary/50 transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base md:text-lg flex items-start gap-2 flex-wrap mb-2">
              <span className="break-words">{configuration.name}</span>
              <Badge 
                variant={getPriorityVariant(configuration.priority)} 
                className="text-xs flex-shrink-0"
                title={`Nivel de especificidad: ${specificityLevel} (${criteriaCount} criterios)`}
              >
                {getPriorityLabel(configuration.priority)}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs md:text-sm line-clamp-2">
              {configuration.description || "Sin descripción"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button size="icon" variant="ghost" onClick={onEdit} className="h-8 w-8">
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onDelete} className="h-8 w-8 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Tags compactos */}
        <div className="flex flex-wrap items-center gap-1.5">
          {configuration.main_goal && (
            <Badge variant="secondary" className="text-xs">
              {goalOptions.find(g => g.id === configuration.main_goal)?.name || configuration.main_goal}
            </Badge>
          )}
          {configuration.training_location && (
            <Badge variant="outline" className="text-xs">
              {locationOptions.find(l => l.id === configuration.training_location)?.name || configuration.training_location}
            </Badge>
          )}
          {configuration.activity_level && (
            <Badge variant="outline" className="text-xs">
              {activityOptions.find(a => a.id === configuration.activity_level)?.name || configuration.activity_level}
            </Badge>
          )}
          {configuration.gender && (
            <Badge variant="outline" className="text-xs">
              {genderOptions.find(g => g.id === configuration.gender)?.name || configuration.gender}
            </Badge>
          )}
        </div>

        {/* Planes asignados - siempre visibles */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground text-xs">Nutrición:</span>
            <Badge variant={configuration.default_nutrition_plan ? "default" : "outline"} className="text-xs">
              {configuration.default_nutrition_plan?.name ?? "No asignado"}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground text-xs">Entrenamiento:</span>
            <Badge variant={configuration.default_workout_program ? "default" : "outline"} className="text-xs">
              {configuration.default_workout_program?.name ?? "No asignado"}
            </Badge>
          </div>
        </div>

        {/* Botón para expandir/colapsar detalles */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-xs"
        >
          {isExpanded ? (
            <>
              <X className="h-3 w-3 mr-1" />
              Ocultar detalles
            </>
          ) : (
            <>
              <Eye className="h-3 w-3 mr-1" />
              Ver detalles
            </>
          )}
        </Button>

        {/* Detalles expandibles */}
        {isExpanded && (
          <div className="space-y-2 pt-2 border-t text-xs">
            {(configuration.min_training_days_per_week || configuration.max_training_days_per_week) && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Días entrenamiento:</span>
                <span>{configuration.min_training_days_per_week ?? "?"} - {configuration.max_training_days_per_week ?? "?"}</span>
              </div>
            )}
            {(configuration.age_min || configuration.age_max) && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Edad:</span>
                <span>{configuration.age_min ?? "?"} - {configuration.age_max ?? "?"} años</span>
              </div>
            )}
            {configuration.dietary_restrictions?.length > 0 && (
              <div>
                <span className="text-muted-foreground">Restricciones: </span>
                <span className="text-xs">{configuration.dietary_restrictions.join(", ")}</span>
              </div>
            )}
            {configuration.equipment_keywords?.length > 0 && (
              <div>
                <span className="text-muted-foreground">Equipamiento: </span>
                <span className="text-xs">{configuration.equipment_keywords.join(", ")}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground pt-2 border-t">
              <span>Creado: {new Date(configuration.created_at).toLocaleDateString()}</span>
              <span>Actualizado: {new Date(configuration.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface SelectFieldProps {
  label: string
  value: string | null | undefined
  options: PlanOption[]
  onChange: (value: string | null) => void
}

const EMPTY_SELECT_VALUE = "__EMPTY_OPTION__"

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Select
        value={value ?? EMPTY_SELECT_VALUE}
        onValueChange={selected => {
          onChange(selected === EMPTY_SELECT_VALUE ? null : selected)
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecciona una opción" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={EMPTY_SELECT_VALUE}>Cualquiera</SelectItem>
          {options.map(option => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

interface NumberFieldProps {
  label: string
  value: number | null | undefined
  onChange: (value: number | null) => void
}

function NumberField({ label, value, onChange }: NumberFieldProps) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input
        type="number"
        value={value ?? ""}
        onChange={event => {
          const raw = event.target.value
          onChange(raw === "" ? null : Number(raw))
        }}
        min={0}
      />
    </div>
  )
}
