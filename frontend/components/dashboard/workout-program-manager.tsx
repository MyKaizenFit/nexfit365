"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Pencil, Trash2, CheckCircle2, Loader2, RefreshCw, Dumbbell, Target, Calendar, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { workoutService, WorkoutProgram } from "@/lib/workout-service"

interface ProgramFormData {
  name: string
  description: string
  difficulty: string
  goal: string
  location: string
  duration_weeks: number | ""
  days_per_week: number | ""
  estimated_duration_minutes: number | ""
}

const EMPTY_FORM: ProgramFormData = {
  name: "",
  description: "",
  difficulty: "intermediate",
  goal: "muscle_gain",
  location: "gym",
  duration_weeks: "",
  days_per_week: 4,
  estimated_duration_minutes: 60,
}

const DIFFICULTY_OPTIONS = [
  { value: "beginner", label: "Principiante" },
  { value: "intermediate", label: "Intermedio" },
  { value: "advanced", label: "Avanzado" },
]

const GOAL_OPTIONS = [
  { value: "muscle_gain", label: "Ganar músculo" },
  { value: "weight_loss", label: "Pérdida de peso" },
  { value: "strength", label: "Fuerza" },
  { value: "endurance", label: "Resistencia" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "toning", label: "Tonificación" },
]

const LOCATION_OPTIONS = [
  { value: "gym", label: "Gimnasio" },
  { value: "home", label: "Casa" },
  { value: "outdoor", label: "Exterior" },
  { value: "anywhere", label: "Cualquier lugar" },
]

export function WorkoutProgramManager() {
  const [programs, setPrograms] = useState<WorkoutProgram[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingProgram, setEditingProgram] = useState<WorkoutProgram | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<WorkoutProgram | null>(null)
  const [formData, setFormData] = useState<ProgramFormData>(EMPTY_FORM)

  const loadPrograms = useCallback(async () => {
    setLoading(true)
    try {
      const data = await workoutService.getPrograms()
      setPrograms(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPrograms() }, [loadPrograms])

  const openCreate = () => {
    setEditingProgram(null)
    setFormData(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (prog: WorkoutProgram) => {
    setEditingProgram(prog)
    setFormData({
      name: prog.name,
      description: prog.description || "",
      difficulty: prog.difficulty || "intermediate",
      goal: prog.goal || "muscle_gain",
      location: prog.location || "gym",
      duration_weeks: prog.duration_weeks ?? "",
      days_per_week: prog.days_per_week ?? 4,
      estimated_duration_minutes: prog.estimated_duration_minutes ?? 60,
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Nombre requerido", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        difficulty: formData.difficulty,
        goal: formData.goal,
        location: formData.location,
        duration_weeks: formData.duration_weeks !== "" ? Number(formData.duration_weeks) : undefined,
        days_per_week: formData.days_per_week !== "" ? Number(formData.days_per_week) : undefined,
        estimated_duration_minutes: formData.estimated_duration_minutes !== "" ? Number(formData.estimated_duration_minutes) : undefined,
      }

      let result: WorkoutProgram | null = null
      if (editingProgram) {
        result = await workoutService.updateProgram(editingProgram.id, payload)
      } else {
        result = await workoutService.createProgram(payload)
      }

      if (result) {
        toast({ title: editingProgram ? "Programa actualizado" : "Programa creado", description: `"${result.name}" guardado correctamente.` })
        setShowForm(false)
        loadPrograms()
      } else {
        toast({ title: "Error", description: "No se pudo guardar el programa.", variant: "destructive" })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (prog: WorkoutProgram) => {
    setDeletingId(prog.id)
    try {
      const ok = await workoutService.deleteProgram(prog.id)
      if (ok) {
        toast({ title: "Programa eliminado", description: `"${prog.name}" eliminado.` })
        setPrograms(prev => prev.filter(p => p.id !== prog.id))
      } else {
        toast({ title: "Error", description: "No se pudo eliminar.", variant: "destructive" })
      }
    } finally {
      setDeletingId(null)
      setConfirmDelete(null)
    }
  }

  const handleActivate = async (prog: WorkoutProgram) => {
    setActivatingId(prog.id)
    try {
      const ok = await workoutService.activateProgram(prog.id)
      if (ok) {
        toast({ title: "✅ Programa activado", description: `"${prog.name}" es ahora tu programa activo.` })
        setPrograms(prev => prev.map(p => ({ ...p, is_active: p.id === prog.id })))
      } else {
        toast({ title: "Error", description: "No se pudo activar.", variant: "destructive" })
      }
    } finally {
      setActivatingId(null)
    }
  }

  const field = (key: keyof ProgramFormData) => ({
    value: formData[key] as string | number,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFormData(prev => ({ ...prev, [key]: e.target.value })),
  })

  const diffColor = (d?: string) => {
    if (d === "beginner") return "bg-green-100 text-green-700 border-green-200"
    if (d === "advanced") return "bg-red-100 text-red-700 border-red-200"
    return "bg-blue-100 text-blue-700 border-blue-200"
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Mis programas de entrenamiento</h3>
            <p className="text-xs text-muted-foreground">Crea, edita y activa tus programas</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadPrograms} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nuevo programa
          </Button>
        </div>
      </div>

      {/* Lista de programas */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/70" />
        </div>
      ) : programs.length === 0 ? (
        <Card className="border-dashed border-2 border-border">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <Dumbbell className="w-7 h-7 text-blue-400" />
            </div>
            <p className="text-gray-700 font-medium">Sin programas de entrenamiento</p>
            <p className="text-sm text-muted-foreground mt-1">Crea tu primer programa personalizado</p>
            <Button size="sm" onClick={openCreate} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-3.5 w-3.5 mr-1" /> Crear programa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {programs.map((prog) => (
            <Card key={prog.id} className={`overflow-hidden transition-colors ${prog.is_active ? "border-blue-300 bg-blue-50/40" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground truncate">{prog.name}</span>
                      {prog.is_active && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">Activo</Badge>
                      )}
                      {prog.difficulty && (
                        <Badge variant="outline" className={`text-xs ${diffColor(prog.difficulty)}`}>
                          {DIFFICULTY_OPTIONS.find(d => d.value === prog.difficulty)?.label || prog.difficulty}
                        </Badge>
                      )}
                      {prog.is_system && (
                        <Badge variant="secondary" className="text-xs">Sistema</Badge>
                      )}
                    </div>
                    {prog.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{prog.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {prog.goal && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Target className="h-3 w-3 text-blue-400" />
                          <span>{GOAL_OPTIONS.find(g => g.value === prog.goal)?.label || prog.goal}</span>
                        </div>
                      )}
                      {prog.days_per_week && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 text-purple-400" />
                          <span>{prog.days_per_week} días/semana</span>
                        </div>
                      )}
                      {prog.estimated_duration_minutes && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 text-green-400" />
                          <span>{prog.estimated_duration_minutes} min</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!prog.is_active && !prog.is_system && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleActivate(prog)}
                        disabled={activatingId === prog.id}
                        className="text-xs text-green-700 border-green-200 hover:bg-green-50"
                      >
                        {activatingId === prog.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline ml-1">Activar</span>
                      </Button>
                    )}
                    {!prog.is_system && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(prog)} className="h-8 w-8">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setConfirmDelete(prog)}
                          disabled={deletingId === prog.id}
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          {deletingId === prog.id ? (
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

      {/* Dialog crear/editar */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProgram ? "Editar programa" : "Nuevo programa de entrenamiento"}</DialogTitle>
            <DialogDescription>
              {editingProgram ? `Modificando "${editingProgram.name}"` : "Crea un programa personalizado"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input placeholder="Ej: Fuerza 4 días PPL" {...field("name")} />
            </div>

            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea placeholder="Describe el programa..." {...field("description")} rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Dificultad</Label>
                <Select value={formData.difficulty} onValueChange={(v) => setFormData(p => ({ ...p, difficulty: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Objetivo</Label>
                <Select value={formData.goal} onValueChange={(v) => setFormData(p => ({ ...p, goal: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GOAL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Ubicación</Label>
              <Select value={formData.location} onValueChange={(v) => setFormData(p => ({ ...p, location: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOCATION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Días/semana</Label>
                <Input type="number" placeholder="4" {...field("days_per_week")} min={1} max={7} />
              </div>
              <div className="space-y-1.5">
                <Label>Duración (sem.)</Label>
                <Input type="number" placeholder="12" {...field("duration_weeks")} min={1} max={52} />
              </div>
              <div className="space-y-1.5">
                <Label>Min./sesión</Label>
                <Input type="number" placeholder="60" {...field("estimated_duration_minutes")} min={10} max={300} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingProgram ? "Guardar cambios" : "Crear programa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar programa?</DialogTitle>
            <DialogDescription>
              Esto eliminará permanentemente &quot;{confirmDelete?.name}&quot;.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmDelete && handleDelete(confirmDelete)} disabled={!!deletingId}>
              {deletingId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
