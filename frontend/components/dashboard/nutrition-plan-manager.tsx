"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Pencil, Trash2, CheckCircle2, Circle, Loader2, RefreshCw, ChefHat, Flame, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { nutritionService, NutritionPlan } from "@/lib/nutrition-service"

interface PlanFormData {
  name: string
  description: string
  daily_calories: number | ""
  protein_grams: number | ""
  carbs_grams: number | ""
  fat_grams: number | ""
  goal: string
  diet_type: string
  meals_per_day: number | ""
  duration_weeks: number | ""
}

const EMPTY_FORM: PlanFormData = {
  name: "",
  description: "",
  daily_calories: "",
  protein_grams: "",
  carbs_grams: "",
  fat_grams: "",
  goal: "maintenance",
  diet_type: "standard",
  meals_per_day: 4,
  duration_weeks: "",
}

const GOAL_OPTIONS = [
  { value: "weight_loss", label: "Pérdida de peso" },
  { value: "muscle_gain", label: "Ganar músculo" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "performance", label: "Rendimiento" },
  { value: "health", label: "Salud general" },
]

const DIET_OPTIONS = [
  { value: "standard", label: "Estándar" },
  { value: "vegetarian", label: "Vegetariana" },
  { value: "vegan", label: "Vegana" },
  { value: "keto", label: "Keto" },
  { value: "paleo", label: "Paleo" },
  { value: "mediterranean", label: "Mediterránea" },
  { value: "high_protein", label: "Alta proteína" },
]

export function NutritionPlanManager() {
  const [plans, setPlans] = useState<NutritionPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState<NutritionPlan | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [savingPlan, setSavingPlan] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<NutritionPlan | null>(null)
  const [formData, setFormData] = useState<PlanFormData>(EMPTY_FORM)

  const loadPlans = useCallback(async () => {
    setLoading(true)
    try {
      const data = await nutritionService.getUserPlans()
      setPlans(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  const openCreate = () => {
    setEditingPlan(null)
    setFormData(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (plan: NutritionPlan) => {
    setEditingPlan(plan)
    const macros = (plan as any)
    setFormData({
      name: plan.name,
      description: (plan as any).description || "",
      daily_calories: plan.daily_calories ?? "",
      protein_grams: macros.protein_grams ?? macros.target_macros?.protein ?? "",
      carbs_grams: macros.carbs_grams ?? macros.target_macros?.carbs ?? "",
      fat_grams: macros.fat_grams ?? macros.target_macros?.fat ?? "",
      goal: (plan as any).goal || "maintenance",
      diet_type: (plan as any).diet_type || "standard",
      meals_per_day: (plan as any).meals_per_day ?? 4,
      duration_weeks: (plan as any).duration_weeks ?? "",
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Nombre requerido", description: "Introduce un nombre para el plan.", variant: "destructive" })
      return
    }
    setSavingPlan(true)
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        daily_calories: Number(formData.daily_calories) || 2000,
        protein_grams: formData.protein_grams !== "" ? Number(formData.protein_grams) : undefined,
        carbs_grams: formData.carbs_grams !== "" ? Number(formData.carbs_grams) : undefined,
        fat_grams: formData.fat_grams !== "" ? Number(formData.fat_grams) : undefined,
        goal: formData.goal,
        diet_type: formData.diet_type,
        meals_per_day: formData.meals_per_day !== "" ? Number(formData.meals_per_day) : undefined,
        duration_weeks: formData.duration_weeks !== "" ? Number(formData.duration_weeks) : undefined,
      }

      let result: NutritionPlan | null = null
      if (editingPlan) {
        result = await nutritionService.updatePlan(editingPlan.id, payload)
      } else {
        result = await nutritionService.createPlan(payload)
      }

      if (result) {
        toast({ title: editingPlan ? "Plan actualizado" : "Plan creado", description: `"${result.name}" guardado correctamente.` })
        setShowForm(false)
        loadPlans()
      } else {
        toast({ title: "Error", description: "No se pudo guardar el plan.", variant: "destructive" })
      }
    } finally {
      setSavingPlan(false)
    }
  }

  const handleDelete = async (plan: NutritionPlan) => {
    setDeletingId(plan.id)
    try {
      const ok = await nutritionService.deletePlan(plan.id)
      if (ok) {
        toast({ title: "Plan eliminado", description: `"${plan.name}" ha sido eliminado.` })
        setPlans(prev => prev.filter(p => p.id !== plan.id))
      } else {
        toast({ title: "Error", description: "No se pudo eliminar el plan.", variant: "destructive" })
      }
    } finally {
      setDeletingId(null)
      setConfirmDelete(null)
    }
  }

  const handleActivate = async (plan: NutritionPlan) => {
    setActivatingId(plan.id)
    try {
      const ok = await nutritionService.activatePlan(plan.id)
      if (ok) {
        toast({ title: "✅ Plan activado", description: `"${plan.name}" es ahora tu plan activo.` })
        setPlans(prev => prev.map(p => ({ ...p, is_active: p.id === plan.id })))
      } else {
        toast({ title: "Error", description: "No se pudo activar el plan.", variant: "destructive" })
      }
    } finally {
      setActivatingId(null)
    }
  }

  const field = (key: keyof PlanFormData) => ({
    value: formData[key] as string | number,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFormData(prev => ({ ...prev, [key]: e.target.value })),
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
            <ChefHat className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Mis planes de nutrición</h3>
            <p className="text-xs text-gray-500">Crea, edita y activa tus planes</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadPlans} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nuevo plan
          </Button>
        </div>
      </div>

      {/* Lista de planes */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : plans.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center mb-4">
              <ChefHat className="w-7 h-7 text-orange-400" />
            </div>
            <p className="text-gray-700 font-medium">Sin planes de nutrición</p>
            <p className="text-sm text-gray-500 mt-1">Crea tu primer plan personalizado</p>
            <Button size="sm" onClick={openCreate} className="mt-4 bg-orange-500 hover:bg-orange-600 text-white">
              <Plus className="h-3.5 w-3.5 mr-1" /> Crear plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <Card key={plan.id} className={`overflow-hidden transition-colors ${plan.is_active ? "border-orange-300 bg-orange-50/40" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 truncate">{plan.name}</span>
                      {plan.is_active && (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">Activo</Badge>
                      )}
                      {(plan as any).is_system && (
                        <Badge variant="secondary" className="text-xs">Sistema</Badge>
                      )}
                    </div>
                    {(plan as any).description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{(plan as any).description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Flame className="h-3 w-3 text-orange-400" />
                        <span>{plan.daily_calories ?? "—"} kcal</span>
                      </div>
                      {(plan as any).goal && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Target className="h-3 w-3 text-blue-400" />
                          <span>{GOAL_OPTIONS.find(g => g.value === (plan as any).goal)?.label || (plan as any).goal}</span>
                        </div>
                      )}
                      {(plan as any).meals_per_day && (
                        <span className="text-xs text-gray-500">{(plan as any).meals_per_day} comidas/día</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!plan.is_active && !(plan as any).is_system && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleActivate(plan)}
                        disabled={activatingId === plan.id}
                        className="text-xs text-green-700 border-green-200 hover:bg-green-50"
                      >
                        {activatingId === plan.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline ml-1">Activar</span>
                      </Button>
                    )}
                    {!(plan as any).is_system && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(plan)} className="h-8 w-8">
                          <Pencil className="h-3.5 w-3.5 text-gray-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setConfirmDelete(plan)}
                          disabled={deletingId === plan.id}
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          {deletingId === plan.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog crear/editar plan */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Editar plan" : "Nuevo plan de nutrición"}</DialogTitle>
            <DialogDescription>
              {editingPlan ? `Modificando "${editingPlan.name}"` : "Crea un plan personalizado para tus objetivos"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input placeholder="Ej: Plan pérdida de peso verano" {...field("name")} />
            </div>

            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea placeholder="Describe el objetivo del plan..." {...field("description")} rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Objetivo</Label>
                <Select value={formData.goal} onValueChange={(v) => setFormData(p => ({ ...p, goal: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GOAL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de dieta</Label>
                <Select value={formData.diet_type} onValueChange={(v) => setFormData(p => ({ ...p, diet_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIET_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Calorías diarias *</Label>
                <Input type="number" placeholder="2000" {...field("daily_calories")} min={500} max={8000} />
              </div>
              <div className="space-y-1.5">
                <Label>Comidas por día</Label>
                <Input type="number" placeholder="4" {...field("meals_per_day")} min={1} max={8} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-gray-500">Macros (g/día) — opcional</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs text-blue-600">Proteína</Label>
                  <Input type="number" placeholder="150" {...field("protein_grams")} min={0} />
                </div>
                <div>
                  <Label className="text-xs text-amber-600">Carbos</Label>
                  <Input type="number" placeholder="200" {...field("carbs_grams")} min={0} />
                </div>
                <div>
                  <Label className="text-xs text-red-500">Grasa</Label>
                  <Input type="number" placeholder="65" {...field("fat_grams")} min={0} />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Duración (semanas) — opcional</Label>
              <Input type="number" placeholder="12" {...field("duration_weeks")} min={1} max={52} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={savingPlan}>Cancelar</Button>
            <Button onClick={handleSave} disabled={savingPlan} className="bg-orange-500 hover:bg-orange-600 text-white">
              {savingPlan ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingPlan ? "Guardar cambios" : "Crear plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmar eliminación */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar plan?</DialogTitle>
            <DialogDescription>
              Esta acción eliminará permanentemente &quot;{confirmDelete?.name}&quot;. No se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              disabled={!!deletingId}
            >
              {deletingId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
