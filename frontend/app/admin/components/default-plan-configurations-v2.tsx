"use client"

import { useMemo, useState, type JSX } from "react"
import { Plus, RefreshCw, Settings, Target, Trash2, Edit, Eye, AlertCircle, Info, Filter, Search, X, Download, Upload, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
import { getAuthHeaders, buildApiUrl, CONFIGURATION_ENDPOINTS } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

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

type RulePreset = "especifica" | "balanceada" | "general" | "fallback"

const presetOptions: Array<{ id: RulePreset; label: string; description: string; order: number }> = [
  { id: "especifica", label: "Regla específica", description: "Para un perfil muy concreto", order: 1 },
  { id: "balanceada", label: "Regla balanceada", description: "Para casos habituales", order: 5 },
  { id: "general", label: "Regla general", description: "Cobertura amplia", order: 20 },
  { id: "fallback", label: "Fallback", description: "Último recurso", order: 99 },
]

const priorityToOrder = (priority: number): number => {
  const safe = Number.isFinite(priority) && priority > 0 ? priority : 100
  return Math.max(1, Math.ceil(safe / 10))
}

const orderToPriority = (order: number): number => {
  const normalized = Number.isFinite(order) ? Math.max(1, Math.floor(order)) : 10
  return normalized * 10
}

const getOrderVariant = (order: number): "default" | "secondary" | "outline" | "destructive" => {
  if (order <= 3) return "default"
  if (order <= 10) return "secondary"
  if (order <= 40) return "outline"
  return "secondary"
}

const goalOptions: PlanOption[] = [
  { id: "lose_weight", name: "Pérdida de peso" },
  { id: "gain_muscle", name: "Ganancia muscular" },
  { id: "body_recomposition", name: "Recomposición corporal" },
  { id: "maintain", name: "Mantenimiento" },
  { id: "performance", name: "Rendimiento deportivo" },
]

const locationOptions: PlanOption[] = [
  { id: "home", name: "Casa" },
  { id: "gym", name: "Gimnasio" },
  { id: "outdoor", name: "Aire libre" },
]

const activityOptions: PlanOption[] = [
  { id: "sedentary", name: "Sedentario" },
  { id: "light", name: "Ligero" },
  { id: "moderate", name: "Moderado" },
  { id: "active", name: "Activo" },
  { id: "very_active", name: "Muy activo" },
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
  applicationOrder: number
  rulePreset: RulePreset
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
    applicationOrder: priorityToOrder(DEFAULT_FORM.priority),
    rulePreset: "balanceada",
    dietaryInput: "",
    equipmentInput: "",
  })

  const [currentDialogTab, setCurrentDialogTab] = useState("general")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [configToDelete, setConfigToDelete] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [importing, setImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const { toast } = useToast()

  const getPresetForOrder = (order: number): RulePreset => {
    if (order <= 2) return "especifica"
    if (order <= 10) return "balanceada"
    if (order <= 40) return "general"
    return "fallback"
  }

  const handleOpenDialog = (mode: DialogMode, config?: DefaultPlanConfiguration) => {
    setCurrentDialogTab("general")
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
        applicationOrder: priorityToOrder(config.priority),
        rulePreset: getPresetForOrder(priorityToOrder(config.priority)),
        dietaryInput: formatList(config.dietary_restrictions),
        equipmentInput: formatList(config.equipment_keywords),
      })
    } else {
      setDialogState({
        open: true,
        mode: "create",
        targetId: null,
        form: DEFAULT_FORM,
        applicationOrder: priorityToOrder(DEFAULT_FORM.priority),
        rulePreset: "balanceada",
        dietaryInput: "",
        equipmentInput: "",
      })
    }
  }

  const handleCloseDialog = () => {
    if (saving) return
    setCurrentDialogTab("general")
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
      priority: orderToPriority(dialogState.applicationOrder),
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

    // Filtrar por orden de aplicación
    if (filterPriority !== "all") {
      filtered = filtered.filter(config => {
        const order = priorityToOrder(config.priority)
        if (filterPriority === "first") return order <= 3
        if (filterPriority === "middle") return order >= 4 && order <= 20
        if (filterPriority === "last") return order > 20
        return true
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

  const handleExportCSV = async () => {
    try {
      const url = buildApiUrl(`${CONFIGURATION_ENDPOINTS.DEFAULT_PLAN_CONFIGURATIONS}export-csv/`)
      const headers = getAuthHeaders()
      const response = await fetch(url, {
        credentials: 'include', method: 'GET', headers })
      if (!response.ok) throw new Error('Error al exportar')
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = 'default_plan_configurations.csv'
      a.click()
      URL.revokeObjectURL(objectUrl)
      toast({ title: 'CSV exportado correctamente' })
    } catch {
      toast({ title: 'Error al exportar CSV', variant: 'destructive' })
    }
  }

  const handleExportExcel = async () => {
    try {
      const url = buildApiUrl(`${CONFIGURATION_ENDPOINTS.DEFAULT_PLAN_CONFIGURATIONS}export-excel/`)
      const headers = getAuthHeaders()
      const response = await fetch(url, {
        credentials: 'include', method: 'GET', headers })
      if (!response.ok) throw new Error('Error al exportar')
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = 'default_plan_configurations.xlsx'
      a.click()
      URL.revokeObjectURL(objectUrl)
      toast({ title: 'Excel exportado correctamente' })
    } catch {
      toast({ title: 'Error al exportar Excel', variant: 'destructive' })
    }
  }

  const handleImport = async (format: 'csv' | 'excel') => {
    if (!importFile) return
    setImporting(true)
    try {
      const endpoint = format === 'csv' ? 'import-csv/' : 'import-excel/'
      const url = buildApiUrl(`${CONFIGURATION_ENDPOINTS.DEFAULT_PLAN_CONFIGURATIONS}${endpoint}`)
      const headers = getAuthHeaders()
      const formData = new FormData()
      formData.append('file', importFile)
      const response = await fetch(url, {
        credentials: 'include', method: 'POST', headers, body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Error al importar')
      toast({ title: data.message || 'Importación completada' })
      setShowImportDialog(false)
      setImportFile(null)
      refetch()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al importar'
      toast({ title: msg, variant: 'destructive' })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Exportar / Importar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Importar / Exportar</CardTitle>
          <CardDescription>Gestiona las configuraciones en bloque mediante CSV o Excel.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <Download className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setImportFile(null); setShowImportDialog(true) }}>
              <Upload className="mr-2 h-4 w-4" />
              Importar
            </Button>
          </div>
        </CardContent>
      </Card>

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
                ¿Cómo funciona el orden de aplicación?
              </p>
              <p className="text-xs md:text-sm text-blue-800">
                Las configuraciones se evalúan por orden. <strong>1 se evalúa antes que 20.</strong> Si un usuario cumple varias reglas, se aplica la de orden más bajo.
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
                <SelectValue placeholder="Filtrar por orden" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los órdenes</SelectItem>
                <SelectItem value="first">Primero (1-3)</SelectItem>
                <SelectItem value="middle">Intermedio (4-20)</SelectItem>
                <SelectItem value="last">Final (21+)</SelectItem>
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
            <div className="space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0">
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
            <div className="space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0">
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogState.mode === "create" ? "Nueva Configuración por Defecto" : "Editar Configuración"}
            </DialogTitle>
            <DialogDescription>
              {dialogState.mode === "create"
                ? "Completa los datos para crear una nueva regla de asignación automática"
                : "Modifica los datos de la configuración por defecto"}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={currentDialogTab} onValueChange={setCurrentDialogTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">📋 General</TabsTrigger>
              <TabsTrigger value="condiciones">🎯 Condiciones</TabsTrigger>
              <TabsTrigger value="planes">📦 Planes</TabsTrigger>
            </TabsList>

            {/* TAB 1: General */}
            <TabsContent value="general" className="space-y-4">
              <div>
                <Label className="font-semibold">Nombre *</Label>
                <Input
                  placeholder="Ej: Principiantes en Casa"
                  value={dialogState.form.name}
                  onChange={event => handleChange("name", event.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="font-semibold">Descripción</Label>
                <Textarea
                  placeholder="Describe cuándo se aplica esta configuración..."
                  value={dialogState.form.description ?? ""}
                  onChange={event => handleChange("description", event.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Tipo de regla *</Label>
                  <Select
                    value={dialogState.rulePreset}
                    onValueChange={value => {
                      const preset = presetOptions.find(item => item.id === value as RulePreset)
                      setDialogState(prev => ({
                        ...prev,
                        rulePreset: value as RulePreset,
                        applicationOrder: preset ? preset.order : prev.applicationOrder,
                      }))
                    }}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {presetOptions.map(option => (
                        <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {presetOptions.find(option => option.id === dialogState.rulePreset)?.description}
                  </p>
                </div>

                <div>
                  <Label className="font-semibold">Orden de aplicación *</Label>
                  <Input
                    type="number"
                    min={1}
                    max={999}
                    value={dialogState.applicationOrder}
                    onChange={event => {
                      const value = Number(event.target.value)
                      setDialogState(prev => ({
                        ...prev,
                        applicationOrder: Number.isFinite(value) && value > 0 ? value : 1,
                      }))
                    }}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">1 = se evalúa primero</p>
                </div>
              </div>

              <div>
                <Label className="font-semibold">Estado</Label>
                <div className="flex items-center justify-between rounded-md border p-3 mt-2">
                  <span className="text-sm">Configuración activa</span>
                  <Switch
                    checked={dialogState.form.is_active}
                    onCheckedChange={checked => handleChange("is_active", checked)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: Condiciones */}
            <TabsContent value="condiciones" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Objetivo principal</Label>
                  <SelectField
                    label=""
                    value={dialogState.form.main_goal}
                    options={goalOptions}
                    onChange={value => handleChange("main_goal", value)}
                  />
                </div>
                <div>
                  <Label className="font-semibold">Lugar de entrenamiento</Label>
                  <SelectField
                    label=""
                    value={dialogState.form.training_location}
                    options={locationOptions}
                    onChange={value => handleChange("training_location", value)}
                  />
                </div>
                <div>
                  <Label className="font-semibold">Nivel de actividad</Label>
                  <SelectField
                    label=""
                    value={dialogState.form.activity_level}
                    options={activityOptions}
                    onChange={value => handleChange("activity_level", value)}
                  />
                </div>
                <div>
                  <Label className="font-semibold">Género</Label>
                  <SelectField
                    label=""
                    value={dialogState.form.gender}
                    options={genderOptions}
                    onChange={value => handleChange("gender", value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Días mínimos de entrenamiento</Label>
                  <NumberField
                    label=""
                    value={dialogState.form.min_training_days_per_week}
                    onChange={value => handleChange("min_training_days_per_week", value)}
                  />
                </div>
                <div>
                  <Label className="font-semibold">Días máximos de entrenamiento</Label>
                  <NumberField
                    label=""
                    value={dialogState.form.max_training_days_per_week}
                    onChange={value => handleChange("max_training_days_per_week", value)}
                  />
                </div>
                <div>
                  <Label className="font-semibold">Edad mínima</Label>
                  <NumberField
                    label=""
                    value={dialogState.form.age_min}
                    onChange={value => handleChange("age_min", value)}
                  />
                </div>
                <div>
                  <Label className="font-semibold">Edad máxima</Label>
                  <NumberField
                    label=""
                    value={dialogState.form.age_max}
                    onChange={value => handleChange("age_max", value)}
                  />
                </div>
              </div>

              <div>
                <Label className="font-semibold">Restricciones alimentarias</Label>
                <Input
                  placeholder="vegano, sin gluten (separadas por comas)"
                  value={dialogState.dietaryInput}
                  onChange={event => setDialogState(prev => ({ ...prev, dietaryInput: event.target.value }))}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">💡 Separa cada restricción con una coma</p>
              </div>

              <div>
                <Label className="font-semibold">Equipamiento requerido</Label>
                <Input
                  placeholder="mancuernas, bandas (separados por comas)"
                  value={dialogState.equipmentInput}
                  onChange={event => setDialogState(prev => ({ ...prev, equipmentInput: event.target.value }))}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">💡 Separa cada equipo con una coma</p>
              </div>
            </TabsContent>

            {/* TAB 3: Planes */}
            <TabsContent value="planes" className="space-y-4">
              <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  Solo se listan plantillas válidas para asignación automática: activas, sin usuario
                  y que no sean del sistema. Prefiere las marcadas como <strong>[AUTO-DEFECTO]</strong>.
                </span>
              </div>
              {dialogState.mode === "edit" && dialogState.targetId && (() => {
                const config = configurations.find(c => c.id === dialogState.targetId)
                if (config?.has_valid_templates === false && config.templates_issue) {
                  return (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>{config.templates_issue} Selecciona nuevas plantillas antes de activar.</span>
                    </div>
                  )
                }
                return null
              })()}
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
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !dialogState.form.name.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? "Guardando..." : dialogState.mode === "create" ? "Crear Configuración" : "Actualizar Configuración"}
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

      {/* Diálogo de importación */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar configuraciones</DialogTitle>
            <DialogDescription>
              Selecciona un archivo CSV o Excel. Las configuraciones existentes (por nombre) se actualizarán; las nuevas se crearán.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Archivo (CSV o Excel)</Label>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              />
            </div>
            {importFile && (
              <p className="text-sm text-muted-foreground">Archivo seleccionado: {importFile.name}</p>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-1.5">
              <p>
                <strong>💡 Tip:</strong> Usa el mismo formato del export para actualizar reglas existentes por nombre o crear nuevas.
              </p>
              <p className="font-semibold">Columnas reconocidas:</p>
              <p>
                <strong>nombre</strong> / name · <strong>descripcion</strong> / description · <strong>prioridad</strong> / priority · <strong>orden_aplicacion</strong> / application_order · <strong>activo</strong>
              </p>
              <p>
                <strong>objetivo_principal</strong> · <strong>lugar_entrenamiento</strong> · <strong>nivel_actividad</strong> · <strong>genero</strong> · <strong>dias_min_entrenamiento</strong> · <strong>dias_max_entrenamiento</strong>
              </p>
              <p>
                <strong>edad_min</strong> · <strong>edad_max</strong> · <strong>restricciones_alimentarias</strong> · <strong>equipamiento</strong>
              </p>
              <p>
                <strong>plan_nutricion</strong> / <strong>plan_nutricion_id</strong> · <strong>programa_entrenamiento</strong> / <strong>programa_entrenamiento_id</strong>
              </p>
              <p className="text-blue-700/90">
                Puedes indicar el plan nutricional y el programa de entrenamiento por <strong>nombre</strong> o por <strong>ID</strong>.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowImportDialog(false)} disabled={importing}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={() => handleImport('csv')}
              disabled={importing || !importFile}
            >
              {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Importar CSV
            </Button>
            <Button
              onClick={() => handleImport('excel')}
              disabled={importing || !importFile}
            >
              {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Importar Excel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  const applicationOrder = priorityToOrder(configuration.priority)
  
  return (
    <Card className="border-2 border-gray-200 hover:border-purple-300 hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <div className="font-semibold text-base break-words">
                    {configuration.name}
                  </div>
                  <Badge 
                    variant={getOrderVariant(applicationOrder)} 
                    className="text-xs flex-shrink-0"
                    title={`Nivel de especificidad: ${specificityLevel} (${criteriaCount} criterios)`}
                  >
                    Orden {applicationOrder}
                  </Badge>
                  {configuration.has_valid_templates === false && (
                    <Badge variant="destructive" className="text-xs flex-shrink-0" title={configuration.templates_issue ?? undefined}>
                      Plantillas inválidas
                    </Badge>
                  )}
                </div>
                {configuration.description && (
                  <div className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {configuration.description}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button size="icon" variant="ghost" onClick={onEdit} className="h-8 w-8">
                  <Edit className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={onDelete} className="h-8 w-8 text-destructive hover:text-destructive">
                  <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </div>
            </div>
            
            {/* Tags compactos */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
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
            {configuration.has_valid_templates === false && configuration.templates_issue && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 mb-2 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{configuration.templates_issue}</span>
              </div>
            )}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Nutrición:</span>
                <Badge variant={configuration.default_nutrition_plan ? "default" : "outline"} className="text-xs">
                  {configuration.default_nutrition_plan?.name ?? "No asignado"}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Entrenamiento:</span>
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
              className="w-full text-xs mt-2"
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
              <div className="space-y-2 pt-2 border-t text-xs mt-2">
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
                    <span className="text-xs break-words">{configuration.dietary_restrictions.join(", ")}</span>
                  </div>
                )}
                {configuration.equipment_keywords?.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Equipamiento: </span>
                    <span className="text-xs break-words">{configuration.equipment_keywords.join(", ")}</span>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-muted-foreground pt-2 border-t">
                  <span className="text-xs">Creado: {new Date(configuration.created_at).toLocaleDateString()}</span>
                  <span className="text-xs">Actualizado: {new Date(configuration.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
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
