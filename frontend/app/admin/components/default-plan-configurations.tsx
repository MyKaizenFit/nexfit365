"use client"

import { useMemo, useState, type JSX } from "react"
import { Plus, RefreshCw, Settings, Target, Trash2, Edit, Eye, ExternalLink } from "lucide-react"

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

const priorities = [1, 5, 10, 25, 50, 75, 100, 150, 200]

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

export function DefaultPlanConfigurationsPanel(): JSX.Element {
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

  const handleOpenDialog = (mode: DialogMode, config?: DefaultPlanConfiguration, initialForm?: UpsertDefaultPlanConfigurationPayload) => {
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
      const form = initialForm || DEFAULT_FORM
      setDialogState({
        open: true,
        mode: "create",
        targetId: null,
        form,
        dietaryInput: formatList(form.dietary_restrictions),
        equipmentInput: formatList(form.equipment_keywords),
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

  const handleDelete = async (configId: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta configuración?")) return
    try {
      await deleteConfiguration(configId)
    } catch {
      // El hook ya muestra el error
    }
  }

  const activeConfigurations = useMemo(
    () => configurations.filter(configuration => configuration.is_active),
    [configurations],
  )

  const inactiveConfigurations = useMemo(
    () => configurations.filter(configuration => !configuration.is_active),
    [configurations],
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Configuraciones por defecto</h2>
          <p className="text-sm text-muted-foreground">
            Define reglas para asignar planes de nutrición y entrenamiento de forma automática.
          </p>
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>¿Qué es la Prioridad?</strong> La prioridad determina el orden de evaluación. 
              <strong> Números más bajos = mayor prioridad</strong>. Si un usuario cumple varias reglas, 
              se aplicará la de menor número. Ejemplo: Prioridad 10 se evalúa antes que Prioridad 50.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={loading || saving}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Recargar
          </Button>
          <Button onClick={() => handleOpenDialog("create")} disabled={saving}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva configuración
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertIcon />
              Error al cargar configuraciones
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Sección de configuraciones activas e inactivas */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Activas ({activeConfigurations.length})
            </CardTitle>
            <CardDescription>Reglas actualmente habilitadas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeConfigurations.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay configuraciones activas.</p>
            )}
            {activeConfigurations.map(config => (
              <ConfigurationCard
                key={config.id}
                configuration={config}
                onEdit={() => handleOpenDialog("edit", config)}
                onDelete={() => handleDelete(config.id)}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Inactivas ({inactiveConfigurations.length})
            </CardTitle>
            <CardDescription>Reglas disponibles pero deshabilitadas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {inactiveConfigurations.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay configuraciones inactivas.</p>
            )}
            {inactiveConfigurations.map(config => (
              <ConfigurationCard
                key={config.id}
                configuration={config}
                onEdit={() => handleOpenDialog("edit", config)}
                onDelete={() => handleDelete(config.id)}
              />
            ))}
          </CardContent>
        </Card>
      </div>

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

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="priority">Prioridad</Label>
                <Select
                  value={String(dialogState.form.priority)}
                  onValueChange={value => handleChange("priority", Number(value))}
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Selecciona prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map(value => (
                      <SelectItem key={value} value={String(value)}>
                        {value}
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

            <div className="grid gap-4 md:grid-cols-2">
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

            <div className="grid gap-4 md:grid-cols-2">
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

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCloseDialog} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !dialogState.form.name.trim()}>
              {saving ? "Guardando..." : dialogState.mode === "create" ? "Crear configuración" : "Actualizar configuración"}
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
  const [showDetails, setShowDetails] = useState(false)
  
  return (
    <>
      <Card className="border-muted hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setShowDetails(true)}>
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2">
                {configuration.name}
                <Badge variant={configuration.is_active ? "default" : "secondary"} className="text-xs">
                  Prioridad {configuration.priority}
                </Badge>
              </CardTitle>
              <CardDescription>
                {configuration.description || "Sin descripción"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Button size="icon" variant="outline" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            {configuration.main_goal && (
              <Badge variant="secondary">
                Objetivo: {configuration.main_goal === 'lose_weight' ? 'Pérdida peso' : 
                          configuration.main_goal === 'gain_muscle' ? 'Ganancia músculo' :
                          configuration.main_goal === 'body_recomposition' ? 'Recomposición' : configuration.main_goal}
              </Badge>
            )}
            {configuration.training_location && (
              <Badge variant="outline">
                {configuration.training_location === 'home' ? 'Casa' : 
                 configuration.training_location === 'gym' ? 'Gimnasio' : 
                 configuration.training_location === 'outdoor' ? 'Aire libre' : configuration.training_location}
              </Badge>
            )}
            {configuration.activity_level && (
              <Badge variant="outline">
                {configuration.activity_level === 'sedentary' ? 'Sedentario' :
                 configuration.activity_level === 'light' ? 'Ligero' :
                 configuration.activity_level === 'moderate' ? 'Moderado' :
                 configuration.activity_level === 'active' ? 'Activo' :
                 configuration.activity_level === 'very_active' ? 'Muy activo' : configuration.activity_level}
              </Badge>
            )}
            {configuration.gender && (
              <Badge variant="outline">
                {configuration.gender === 'male' ? 'Masculino' :
                 configuration.gender === 'female' ? 'Femenino' : 'Otro'}
              </Badge>
            )}
          </div>

          <div className="grid gap-1">
            {(configuration.min_training_days_per_week || configuration.max_training_days_per_week) && (
              <span className="text-muted-foreground">
                Días de entrenamiento: {configuration.min_training_days_per_week ?? "?"} -{" "}
                {configuration.max_training_days_per_week ?? "?"}
              </span>
            )}
            {(configuration.age_min || configuration.age_max) && (
              <span className="text-muted-foreground">
                Edad objetivo: {configuration.age_min ?? "?"} - {configuration.age_max ?? "?"} años
              </span>
            )}
          </div>

          <Separator />

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Plan de nutrición:</span>
              <Badge variant={configuration.default_nutrition_plan ? "default" : "outline"}>
                {configuration.default_nutrition_plan?.name ?? "No asignado"}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Programa de entrenamiento:</span>
              <Badge variant={configuration.default_workout_program ? "default" : "outline"}>
                {configuration.default_workout_program?.name ?? "No asignado"}
              </Badge>
            </div>
          </div>

        {configuration.dietary_restrictions?.length > 0 && (
          <div className="grid gap-1">
            <span className="font-medium">Restricciones:</span>
            <div className="flex flex-wrap gap-2">
              {configuration.dietary_restrictions.map(item => (
                <Badge key={item} variant="outline">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {configuration.equipment_keywords?.length > 0 && (
          <div className="grid gap-1">
            <span className="font-medium">Equipamiento:</span>
            <div className="flex flex-wrap gap-2">
              {configuration.equipment_keywords.map(item => (
                <Badge key={item} variant="outline">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Creado: {new Date(configuration.created_at).toLocaleString()}</span>
        <span>Actualizado: {new Date(configuration.updated_at).toLocaleString()}</span>
      </CardFooter>
    </Card>

    <Dialog open={showDetails} onOpenChange={setShowDetails}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Detalles de: {configuration.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Información de la configuración */}
          <div className="grid gap-4">
            <div>
              <h3 className="font-semibold mb-2">Criterios de asignación</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {configuration.main_goal && (
                  <div>
                    <span className="text-muted-foreground">Objetivo:</span>
                    <Badge className="ml-2">
                      {configuration.main_goal === 'lose_weight' ? 'Pérdida de peso' : 
                       configuration.main_goal === 'gain_muscle' ? 'Ganancia muscular' :
                       configuration.main_goal === 'body_recomposition' ? 'Recomposición' : configuration.main_goal}
                    </Badge>
                  </div>
                )}
                {configuration.training_location && (
                  <div>
                    <span className="text-muted-foreground">Lugar:</span>
                    <Badge className="ml-2">
                      {configuration.training_location === 'home' ? 'Casa' : 
                       configuration.training_location === 'gym' ? 'Gimnasio' : 
                       configuration.training_location === 'outdoor' ? 'Aire libre' : configuration.training_location}
                    </Badge>
                  </div>
                )}
                {configuration.activity_level && (
                  <div>
                    <span className="text-muted-foreground">Actividad:</span>
                    <Badge className="ml-2">
                      {configuration.activity_level === 'sedentary' ? 'Sedentario' :
                       configuration.activity_level === 'light' ? 'Ligero' :
                       configuration.activity_level === 'moderate' ? 'Moderado' :
                       configuration.activity_level === 'active' ? 'Activo' :
                       configuration.activity_level === 'very_active' ? 'Muy activo' : configuration.activity_level}
                    </Badge>
                  </div>
                )}
                {configuration.gender && (
                  <div>
                    <span className="text-muted-foreground">Género:</span>
                    <Badge className="ml-2">
                      {configuration.gender === 'male' ? 'Masculino' :
                       configuration.gender === 'female' ? 'Femenino' : 'Otro'}
                    </Badge>
                  </div>
                )}
                {(configuration.min_training_days_per_week || configuration.max_training_days_per_week) && (
                  <div>
                    <span className="text-muted-foreground">Días entrenamiento:</span>
                    <Badge className="ml-2">
                      {configuration.min_training_days_per_week ?? "?"} - {configuration.max_training_days_per_week ?? "?"}
                    </Badge>
                  </div>
                )}
                {(configuration.age_min || configuration.age_max) && (
                  <div>
                    <span className="text-muted-foreground">Edad:</span>
                    <Badge className="ml-2">
                      {configuration.age_min ?? "?"} - {configuration.age_max ?? "?"} años
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Planes asignados */}
            <div>
              <h3 className="font-semibold mb-3">Planes asignados</h3>
              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      Plan de Nutrición
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onEdit(); setShowDetails(false); }}>
                        <Edit className="h-3 w-3 mr-1" />
                        Cambiar
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {configuration.default_nutrition_plan ? (
                      <div>
                        <p className="font-medium">{configuration.default_nutrition_plan.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          ID: {configuration.default_nutrition_plan.id}
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No hay plan de nutrición asignado</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      Programa de Entrenamiento
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onEdit(); setShowDetails(false); }}>
                        <Edit className="h-3 w-3 mr-1" />
                        Cambiar
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {configuration.default_workout_program ? (
                      <div>
                        <p className="font-medium">{configuration.default_workout_program.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          ID: {configuration.default_workout_program.id}
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No hay programa de entrenamiento asignado</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {configuration.description && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Descripción</h3>
                  <p className="text-sm text-muted-foreground">{configuration.description}</p>
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDetails(false)}>
            Cerrar
          </Button>
          <Button onClick={(e) => { e.stopPropagation(); onEdit(); setShowDetails(false); }}>
            <Edit className="h-4 w-4 mr-2" />
            Editar configuración
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
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

function AlertIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" x2="12" y1="9" y2="13" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  )
}

// Componente CombinationsGrid eliminado - ya no se usa

