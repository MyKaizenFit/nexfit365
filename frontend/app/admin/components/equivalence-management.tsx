"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  RefreshCw, Search, Shuffle, Check, Loader2, Plus, Pencil,
  Trash2, FolderOpen, Settings
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { getApiBaseUrl } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"

const getApiUrl = getApiBaseUrl

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface EquivalenceCategory {
  id: number
  slug: string
  name: string
  description: string
  color: string
  icon: string
  is_system: boolean
  order: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const SWATCH_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
  "#0ea5e9", "#3b82f6", "#6366f1", "#a855f7", "#ec4899",
  "#78716c", "#6b7280",
]

function getCategoryColor(cat: EquivalenceCategory) {
  return cat.color || "#6366f1"
}

interface Food {
  id: string
  name: string
  brand?: string
  category?: string
  equivalence_category?: string
  equivalence_categories?: string[]
  calories: number
  protein: number
  carbs: number
  fat: number
  serving_unit?: string
  is_verified?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Category manager dialog
// ─────────────────────────────────────────────────────────────────────────────

interface CategoryDialogProps {
  open: boolean
  initial?: Partial<EquivalenceCategory>
  onClose: () => void
  onSave: (data: Partial<EquivalenceCategory>) => Promise<void>
  saving: boolean
}

function CategoryDialog({ open, initial, onClose, onSave, saving }: CategoryDialogProps) {
  const [name, setName] = useState(initial?.name ?? "")
  const [slug, setSlug] = useState(initial?.slug ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [color, setColor] = useState(initial?.color || "#6366f1")
  const [order, setOrder] = useState(initial?.order ?? 99)
  const isEdit = !!initial?.id

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "")
      setSlug(initial?.slug ?? "")
      setDescription(initial?.description ?? "")
      setColor(initial?.color || "#6366f1")
      setOrder(initial?.order ?? 99)
    }
  }, [open, initial])

  const autoSlug = (n: string) =>
    n.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 60)

  const handleNameChange = (n: string) => {
    setName(n)
    if (!isEdit) setSlug(autoSlug(n))
  }

  const handleSubmit = () => {
    if (!name.trim() || !slug.trim()) {
      toast({ title: "Error", description: "Nombre e identificador son obligatorios.", variant: "destructive" })
      return
    }
    onSave({ name: name.trim(), slug: slug.trim(), description, color, order })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Nombre <span className="text-red-500">*</span></Label>
            <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Ej: Carnes magras" />
          </div>
          <div className="space-y-1">
            <Label>Identificador (slug) <span className="text-red-500">*</span></Label>
            <Input
              value={slug} onChange={(e) => setSlug(autoSlug(e.target.value))}
              placeholder="carnes_magras" disabled={isEdit}
              className={isEdit ? "opacity-60" : ""}
            />
            <p className="text-xs text-muted-foreground">Solo letras, números y guion bajo. No se puede cambiar después.</p>
          </div>
          <div className="space-y-1">
            <Label>Descripción</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Descripción opcional..." />
          </div>
          <div className="space-y-1">
            <Label>Orden</Label>
            <Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} min={0} />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {SWATCH_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
              <input
                type="color" value={color} onChange={(e) => setColor(e.target.value)}
                className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0"
                title="Color personalizado"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full text-white text-sm font-bold"
              style={{ background: color }}
            >
              {name ? name[0].toUpperCase() : "?"}
            </span>
            <div>
              <p className="font-semibold text-sm">{name || "Vista previa"}</p>
              <p className="text-xs text-muted-foreground">{slug || "identificador"}</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            {isEdit ? "Guardar cambios" : "Crear categoría"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-category toggle cell
// ─────────────────────────────────────────────────────────────────────────────

interface MultiCategoryPickerProps {
  categories: EquivalenceCategory[]
  selected: string[]
  disabled?: boolean
  onChange: (slugs: string[]) => void
}

function MultiCategoryPicker({ categories, selected, disabled, onChange }: MultiCategoryPickerProps) {
  const toggle = (slug: string) => {
    if (disabled) return
    if (selected.includes(slug)) {
      onChange(selected.filter((s) => s !== slug))
    } else {
      onChange([...selected, slug])
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {categories.map((cat) => {
        const active = selected.includes(cat.slug)
        return (
          <button
            key={cat.slug}
            type="button"
            onClick={() => toggle(cat.slug)}
            disabled={disabled}
            title={cat.name}
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-all
              ${active
                ? "text-white shadow-sm"
                : "border border-border bg-muted/50 text-muted-foreground hover:bg-muted"
              }
              ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
            `}
            style={active ? { background: getCategoryColor(cat) } : {}}
          >
            {cat.name}
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function EquivalenceManagement() {
  const { getAuthHeaders } = useAuth()

  // ── Categories state ──────────────────────────────────────────────────────
  const [categories, setCategories] = useState<EquivalenceCategory[]>([])
  const [loadingCats, setLoadingCats] = useState(false)
  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<Partial<EquivalenceCategory> | undefined>(undefined)
  const [savingCat, setSavingCat] = useState(false)

  // ── Foods state ───────────────────────────────────────────────────────────
  const [foods, setFoods] = useState<Food[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [verifiedFilter, setVerifiedFilter] = useState("all")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkCategories, setBulkCategories] = useState<string[]>([])
  const [bulkMode, setBulkMode] = useState<"add" | "replace">("add")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [bulkSaving, setBulkSaving] = useState(false)

  // ── Load categories ───────────────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    setLoadingCats(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(
        `${getApiUrl()}/api/admin/nutrition/equivalence-categories/?page_size=200`,
        { headers }
      )
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCategories(Array.isArray(data) ? data : data.results || [])
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar las categorías.", variant: "destructive" })
    } finally {
      setLoadingCats(false)
    }
  }, [getAuthHeaders])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  // ── Load foods ────────────────────────────────────────────────────────────
  const fetchFoods = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page_size: String(pageSize), page: String(currentPage) })
      if (search.trim()) params.set("search", search.trim())
      if (categoryFilter !== "all") params.set("equivalence_category", categoryFilter)
      if (verifiedFilter !== "all") params.set("is_verified", verifiedFilter)
      const headers = await getAuthHeaders()
      const res = await fetch(`${getApiUrl()}/api/nutrition/foods/?${params.toString()}`, { headers })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setFoods(Array.isArray(data) ? data : data.results || [])
      setTotalCount(Array.isArray(data) ? data.length : data.count || 0)
      setSelectedIds([])
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar los alimentos.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, verifiedFilter, currentPage, getAuthHeaders, pageSize, search])

  useEffect(() => { fetchFoods() }, [fetchFoods])

  // useMemo used to keep the linter happy (categoryBySlug may be used in future)
  const _categoryBySlug = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.slug, c])),
    [categories]
  )
  void _categoryBySlug

  // ── Normalize food categories ─────────────────────────────────────────────
  const getFoodCategories = (food: Food): string[] => {
    if (Array.isArray(food.equivalence_categories) && food.equivalence_categories.length > 0) {
      return food.equivalence_categories
    }
    if (food.equivalence_category) return [food.equivalence_category]
    return []
  }

  // ── Update single food ────────────────────────────────────────────────────
  const updateFoodCategories = async (foodId: string, slugs: string[]) => {
    setSaving(foodId)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${getApiUrl()}/api/nutrition/foods/${foodId}/`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          equivalence_categories: slugs,
          equivalence_category: slugs[0] ?? "",
        }),
      })
      if (!res.ok) throw new Error()
      setFoods((prev) =>
        prev.map((f) =>
          f.id === foodId
            ? { ...f, equivalence_categories: slugs, equivalence_category: slugs[0] ?? "" }
            : f
        )
      )
    } catch {
      toast({ title: "Error", description: "No se pudo actualizar el alimento.", variant: "destructive" })
    } finally {
      setSaving(null)
    }
  }

  // ── Bulk update ───────────────────────────────────────────────────────────
  const handleBulkUpdate = async () => {
    if (selectedIds.length === 0 || bulkCategories.length === 0) return
    setBulkSaving(true)
    let success = 0
    try {
      await Promise.all(
        selectedIds.map(async (id) => {
          const food = foods.find((f) => f.id === id)
          if (!food) return
          const current = bulkMode === "add" ? getFoodCategories(food) : []
          const merged = Array.from(new Set([...current, ...bulkCategories]))
          const headers = await getAuthHeaders()
          const res = await fetch(`${getApiUrl()}/api/nutrition/foods/${id}/`, {
            method: "PATCH",
            headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify({ equivalence_categories: merged, equivalence_category: merged[0] ?? "" }),
          })
          if (res.ok) {
            success++
            setFoods((prev) =>
              prev.map((f) =>
                f.id === id ? { ...f, equivalence_categories: merged, equivalence_category: merged[0] ?? "" } : f
              )
            )
          }
        })
      )
      toast({ title: "Equivalencias actualizadas", description: `${success} alimento(s) actualizados.` })
      setSelectedIds([])
    } catch {
      toast({ title: "Error", description: "Error al actualizar en bloque.", variant: "destructive" })
    } finally {
      setBulkSaving(false)
    }
  }

  // ── Category CRUD ─────────────────────────────────────────────────────────
  const handleSaveCategory = async (data: Partial<EquivalenceCategory>) => {
    setSavingCat(true)
    try {
      const headers = await getAuthHeaders()
      const isEdit = !!editingCat?.id
      const url = isEdit
        ? `${getApiUrl()}/api/admin/nutrition/equivalence-categories/${editingCat!.slug}/`
        : `${getApiUrl()}/api/admin/nutrition/equivalence-categories/`
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(JSON.stringify(err))
      }
      toast({ title: isEdit ? "Categoría actualizada" : "Categoría creada", description: data.name })
      setCatDialogOpen(false)
      setEditingCat(undefined)
      await fetchCategories()
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Error desconocido", variant: "destructive" })
    } finally {
      setSavingCat(false)
    }
  }

  const handleDeleteCategory = async (cat: EquivalenceCategory) => {
    if (cat.is_system) {
      toast({ title: "No permitido", description: "Las categorías del sistema no pueden eliminarse.", variant: "destructive" })
      return
    }
    if (!confirm(`¿Eliminar la categoría "${cat.name}"?`)) return
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(
        `${getApiUrl()}/api/admin/nutrition/equivalence-categories/${cat.slug}/`,
        { method: "DELETE", headers }
      )
      if (!res.ok) throw new Error()
      toast({ title: "Categoría eliminada", description: cat.name })
      await fetchCategories()
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar.", variant: "destructive" })
    }
  }

  // ── Selection helpers ─────────────────────────────────────────────────────
  const toggleFood = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const toggleSelectAll = () =>
    setSelectedIds(selectedIds.length === foods.length ? [] : foods.map((f) => f.id))

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Equivalencias de Alimentos</h2>
          <p className="text-sm text-muted-foreground">Gestiona grupos de intercambio. Cada alimento puede tener múltiples categorías.</p>
        </div>
        <Button onClick={fetchFoods} variant="outline" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <Tabs defaultValue="foods">
        <TabsList className="mb-4">
          <TabsTrigger value="foods">
            <Shuffle className="mr-2 h-4 w-4" />
            Asignar a alimentos
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Settings className="mr-2 h-4 w-4" />
            Gestionar categorías
          </TabsTrigger>
        </TabsList>

        {/* ══ TAB: Assign to foods ══════════════════════════════════════════ */}
        <TabsContent value="foods">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shuffle className="h-5 w-5 text-emerald-600" />
                Clasificación para intercambios
              </CardTitle>
              <CardDescription>Un alimento puede tener varias categorías. El sistema buscará equivalentes en todas ellas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_200px_160px_auto]">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
                    placeholder="Buscar alimento, marca..."
                    className="pl-9"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1) }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los grupos</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.slug} value={cat.slug}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={verifiedFilter} onValueChange={(v) => { setVerifiedFilter(v); setCurrentPage(1) }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Verificación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="true">Verificados</SelectItem>
                    <SelectItem value="false">Sin verificar</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => { setCurrentPage(1); fetchFoods() }} disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Buscar
                </Button>
              </div>

              {/* Count + page size */}
              <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>Mostrando {foods.length} de {totalCount} alimentos</span>
                <div className="flex items-center gap-2">
                  <span>Por página</span>
                  <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1) }}>
                    <SelectTrigger className="h-9 w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["25", "50", "100", "200"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bulk action bar */}
              <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-sm font-medium">{selectedIds.length} seleccionados</span>
                  <div className="flex gap-2 flex-wrap">
                    <Select value={bulkMode} onValueChange={(v) => setBulkMode(v as "add" | "replace")}>
                      <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="add">Añadir categorías</SelectItem>
                        <SelectItem value="replace">Reemplazar</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={handleBulkUpdate}
                      disabled={bulkSaving || selectedIds.length === 0 || bulkCategories.length === 0}
                    >
                      {bulkSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                      Aplicar
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Categorías a aplicar en bloque:</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const active = bulkCategories.includes(cat.slug)
                    return (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() => setBulkCategories((prev) =>
                          active ? prev.filter((s) => s !== cat.slug) : [...prev, cat.slug]
                        )}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-all
                          ${active ? "text-white shadow-sm" : "border border-border bg-background text-muted-foreground hover:bg-muted"}`}
                        style={active ? { background: getCategoryColor(cat) } : {}}
                      >
                        {cat.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Foods table */}
              <div className="overflow-hidden rounded-lg border">
                <div className="grid grid-cols-[44px_1fr_100px_1fr] bg-muted px-3 py-2 text-xs font-bold uppercase text-muted-foreground gap-2">
                  <Checkbox
                    checked={foods.length > 0 && selectedIds.length === foods.length}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span>Alimento</span>
                  <span>Macros</span>
                  <span>Categorías de equivalencia</span>
                </div>
                <div className="divide-y">
                  {loading ? (
                    <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando alimentos...
                    </div>
                  ) : foods.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">No hay alimentos con esos filtros.</div>
                  ) : foods.map((food) => {
                    const foodCats = getFoodCategories(food)
                    const isSaving = saving === food.id
                    return (
                      <div key={food.id} className="grid grid-cols-[44px_1fr_100px_1fr] items-start gap-2 px-3 py-3">
                        <div className="pt-1">
                          <Checkbox checked={selectedIds.includes(food.id)} onCheckedChange={() => toggleFood(food.id)} />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{food.name}</div>
                          {(food.brand || food.category || food.is_verified !== undefined) && (
                            <div className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground">
                              {food.brand && <span>{food.brand}</span>}
                              {food.category && <Badge variant="outline">{food.category}</Badge>}
                              {food.is_verified && (
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">✓ Verificado</Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <div className="font-semibold">{food.calories} kcal</div>
                          <div>P{food.protein} C{food.carbs} G{food.fat}</div>
                        </div>
                        <div>
                          {isSaving ? (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Guardando...
                            </div>
                          ) : (
                            <MultiCategoryPicker
                              categories={categories}
                              selected={foodCats}
                              onChange={(slugs) => updateFoodCategories(food.id, slugs)}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" size="sm" disabled={currentPage === 1 || loading} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>Anterior</Button>
                  <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={currentPage >= totalPages || loading} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>Siguiente</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ TAB: Manage categories ════════════════════════════════════════ */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FolderOpen className="h-5 w-5 text-violet-600" />
                    Categorías de equivalencia
                  </CardTitle>
                  <CardDescription>Las categorías del sistema no pueden eliminarse pero sí editarse.</CardDescription>
                </div>
                <Button onClick={() => { setEditingCat(undefined); setCatDialogOpen(true) }} disabled={loadingCats}>
                  <Plus className="mr-2 h-4 w-4" /> Nueva categoría
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingCats ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando categorías...
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {categories.map((cat) => (
                    <div key={cat.slug} className="flex items-start gap-3 rounded-lg border bg-card p-3 shadow-sm">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold"
                        style={{ background: getCategoryColor(cat) }}
                      >
                        {cat.name[0].toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{cat.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{cat.slug}</p>
                        {cat.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{cat.description}</p>}
                        {cat.is_system && <Badge variant="outline" className="mt-1 text-[10px]">Sistema</Badge>}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          className="rounded p-1 hover:bg-muted transition-colors"
                          title="Editar"
                          onClick={() => { setEditingCat(cat); setCatDialogOpen(true) }}
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        {!cat.is_system && (
                          <button
                            type="button"
                            className="rounded p-1 hover:bg-destructive/10 transition-colors"
                            title="Eliminar"
                            onClick={() => handleDeleteCategory(cat)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category dialog */}
      <CategoryDialog
        open={catDialogOpen}
        initial={editingCat}
        onClose={() => { setCatDialogOpen(false); setEditingCat(undefined) }}
        onSave={handleSaveCategory}
        saving={savingCat}
      />
    </div>
  )
}
