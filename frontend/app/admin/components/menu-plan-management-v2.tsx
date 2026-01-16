"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "@/hooks/use-toast"
import { fixEncoding } from "@/lib/encoding-fix"
import { Loader2, MoreHorizontal, Plus, Search, Trash2, Pencil, Copy, User, Flame } from "lucide-react"
import { NutritionTemplatePlanEditor } from "./nutrition-template-plan-editor"
import { MenuPlanTypeFilter, useAdminMenuPlans } from "@/hooks/use-admin-menu-plans"
import { buildApiUrl } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"

function getCategory(plan: { is_system: boolean; user_id?: number | null; is_template: boolean }) {
  if (plan.user_id) return "Usuario"
  if (plan.is_system) return "Sistema"
  if (plan.is_template) return "Plantilla"
  return "Plantilla"
}

function CategoryBadge({ plan }: { plan: { is_system: boolean; user_id?: number | null; is_template: boolean } }) {
  const cat = getCategory(plan)
  const variant = cat === "Usuario" ? "default" : cat === "Sistema" ? "secondary" : "outline"
  return <Badge variant={variant}>{cat}</Badge>
}

export function MenuPlanManagementV2() {
  const { plans, users, stats, loading, error, fetchPlans, fetchPlanDetail, createPlan, deletePlan, toggleActive } = useAdminMenuPlans()
  const { getAuthHeaders } = useAuth()

  const [search, setSearch] = useState("")
  const [type, setType] = useState<MenuPlanTypeFilter>("all")
  const [userFilter, setUserFilter] = useState<string>("all")

  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)

  const [showWeeklyEditor, setShowWeeklyEditor] = useState(false)
  const [weeklyPlanId, setWeeklyPlanId] = useState<string | null>(null)
  const [availableRecipes, setAvailableRecipes] = useState<any[]>([])

  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [duplicateSourceId, setDuplicateSourceId] = useState<string | null>(null)
  const [duplicateUserId, setDuplicateUserId] = useState<string>("none")

  const [form, setForm] = useState({
    name: "",
    description: "",
    daily_calories: 2000,
    protein: 30,
    carbs: 40,
    fat: 30,
    user_id: "none" as string,
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return plans.filter((p) => {
      const matchesSearch = !q || (p.name || "").toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q)
      const matchesUser = userFilter === "all" ? true : String(p.user_id || "") === String(userFilter)
      const matchesType =
        type === "all" ? true :
        type === "users" ? Boolean(p.user_id) :
        type === "system" ? Boolean(p.is_system) :
        /* templates */ (!p.user_id && !p.is_system)
      return matchesSearch && matchesUser && matchesType
    })
  }, [plans, search, type, userFilter])

  const openCreate = () => {
    setForm({
      name: "",
      description: "",
      daily_calories: 2000,
      protein: 30,
      carbs: 40,
      fat: 30,
      user_id: "none",
    })
    setShowCreate(true)
  }

  const loadRecipes = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(buildApiUrl("admin/nutrition/recipes/?page_size=500"), { headers })
      if (!res.ok) return
      const data = await res.json()
      const list = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : [])
      setAvailableRecipes(list)
    } catch {
      // ignore
    }
  }, [getAuthHeaders])

  useEffect(() => {
    loadRecipes()
  }, [loadRecipes])

  const handleCreate = async (configureWeekly: boolean) => {
    try {
      setCreating(true)
      const userId = form.user_id === "none" ? null : Number(form.user_id)
      const created = await createPlan({
        name: form.name.trim(),
        description: form.description,
        daily_calories: Number(form.daily_calories) || 0,
        percents: { protein: Number(form.protein) || 0, carbs: Number(form.carbs) || 0, fat: Number(form.fat) || 0 },
        user_id: userId,
      })
      toast({ title: "✅ Plan creado", description: configureWeekly ? "Ahora configura el menú semanal." : "Creado correctamente." })
      setShowCreate(false)
      await fetchPlans({ search, type, userId: userFilter })
      if (configureWeekly && created?.id) {
        setWeeklyPlanId(String(created.id))
        setShowWeeklyEditor(true)
      }
    } catch (e) {
      toast({ title: "❌ Error", description: e instanceof Error ? e.message : "No se pudo crear", variant: "destructive" })
    } finally {
      setCreating(false)
    }
  }

  const handleEditWeekly = async (planId: string) => {
    setWeeklyPlanId(planId)
    setShowWeeklyEditor(true)
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
        user_id: userId,
        meals: Array.isArray(detail.meals) ? detail.meals.map((m: any) => ({
          day_of_week: m.day_of_week ?? null,
          name: m.name,
          meal_type: m.meal_type,
          time: m.time,
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
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
      await fetchPlans({ search, type, userId: userFilter })
      if (created?.id) {
        setWeeklyPlanId(String(created.id))
        setShowWeeklyEditor(true)
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
      await fetchPlans({ search, type, userId: userFilter })
    } catch (e) {
      toast({ title: "❌ Error", description: e instanceof Error ? e.message : "No se pudo eliminar", variant: "destructive" })
    }
  }

  const handleToggleActive = async (planId: string, next: boolean) => {
    try {
      await toggleActive(planId, next)
      await fetchPlans({ search, type, userId: userFilter })
    } catch (e) {
      toast({ title: "❌ Error", description: e instanceof Error ? e.message : "No se pudo actualizar", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Planes de Menús (Nuevo)</h2>
          <p className="text-gray-600 mt-1">Plantillas, sistema y planes de usuario, con editor semanal de recetas.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Crear Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Total</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
            <Flame className="w-7 h-7 text-orange-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Activos</div>
              <div className="text-2xl font-bold">{stats.active}</div>
            </div>
            <Badge>Activo</Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-10" />
            </div>
            <div className="w-full md:w-56">
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="templates">Plantillas</SelectItem>
                  <SelectItem value="users">Usuarios</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-72">
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger><SelectValue placeholder="Usuario" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los usuarios</SelectItem>
                  {users.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={() => fetchPlans({ search, type, userId: userFilter })}
              disabled={loading}
            >
              Aplicar
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : error ? (
        <Card><CardContent className="p-6 text-red-600">{error}</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Card key={p.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-lg truncate">{fixEncoding(p.name)}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <CategoryBadge plan={p} />
                      {p.user_email && (
                        <Badge variant="outline" className="truncate max-w-[160px]">
                          <User className="w-3 h-3 mr-1" />
                          {p.user_email}
                        </Badge>
                      )}
                      {p.is_active ? <Badge>Activo</Badge> : <Badge variant="secondary">Inactivo</Badge>}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleEditWeekly(p.id)}>
                        <Pencil className="w-4 h-4 mr-2" /> Editar menú semanal
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openDuplicateDialog(p.id)}>
                        <Copy className="w-4 h-4 mr-2" /> Duplicar a usuario…
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(p.id, !p.is_active)}>
                        <Flame className="w-4 h-4 mr-2" /> {p.is_active ? "Desactivar" : "Activar"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDelete(p.id)} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-gray-600 line-clamp-2">{fixEncoding(p.description || "")}</div>
                <div className="text-sm"><b>Calorías:</b> {p.daily_calories} kcal</div>
                <div className="text-sm"><b>Proteína:</b> {p.protein_percentage}% · <b>Carbos:</b> {p.carbs_percentage}% · <b>Grasas:</b> {p.fat_percentage}%</div>
                <div className="text-xs text-gray-500">Comidas configuradas: {p.meals_count ?? "-"}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Crear */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Crear Plan de Menús (Nuevo)</DialogTitle>
            <DialogDescription>Crea una plantilla o un plan asignado a usuario, y luego configura el menú semanal.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Plan Mediterráneo" />
            </div>
            <div>
              <label className="text-sm font-medium">Calorías diarias</label>
              <Input type="number" value={form.daily_calories} onChange={(e) => setForm({ ...form, daily_calories: Number(e.target.value) || 0 })} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Asignar a usuario (opcional)</label>
              <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar (Plantilla)</SelectItem>
                  {users.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Descripción</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción..." />
            </div>
            <div className="md:col-span-2">
              <div className="text-sm font-medium mb-2">Macros (%)</div>
              <div className="grid grid-cols-3 gap-3">
                <div><Input type="number" value={form.protein} onChange={(e) => setForm({ ...form, protein: Number(e.target.value) || 0 })} /><div className="text-xs text-gray-500 mt-1">Proteína</div></div>
                <div><Input type="number" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: Number(e.target.value) || 0 })} /><div className="text-xs text-gray-500 mt-1">Carbos</div></div>
                <div><Input type="number" value={form.fat} onChange={(e) => setForm({ ...form, fat: Number(e.target.value) || 0 })} /><div className="text-xs text-gray-500 mt-1">Grasas</div></div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>Cerrar</Button>
            <Button variant="outline" onClick={() => handleCreate(true)} disabled={creating || !form.name.trim()}>
              {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creando...</> : "Crear y configurar menú"}
            </Button>
            <Button onClick={() => handleCreate(false)} disabled={creating || !form.name.trim()}>
              {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creando...</> : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editor semanal */}
      <Dialog open={showWeeklyEditor} onOpenChange={setShowWeeklyEditor}>
        <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar menú semanal</DialogTitle>
            <DialogDescription>Configura días/comidas y añade opciones de recetas.</DialogDescription>
          </DialogHeader>
          {weeklyPlanId ? (
            <NutritionTemplatePlanEditor
              planId={weeklyPlanId}
              availableRecipes={availableRecipes}
              onSaved={async () => {
                await fetchPlans({ search, type, userId: userFilter })
              }}
              onClose={() => setShowWeeklyEditor(false)}
            />
          ) : (
            <div className="text-sm text-muted-foreground">Selecciona un plan.</div>
          )}
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
    </div>
  )
}

