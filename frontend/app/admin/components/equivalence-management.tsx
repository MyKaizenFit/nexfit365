"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { RefreshCw, Search, Shuffle, Check, Loader2, Plus } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { getApiBaseUrl } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"

const getApiUrl = getApiBaseUrl

const EQUIVALENCE_CATEGORIES = [
  { value: "carnes", label: "Carnes" },
  { value: "pescados", label: "Pescados" },
  { value: "marisco", label: "Marisco" },
  { value: "huevos", label: "Huevos" },
  { value: "arroz_cereales", label: "Arroz / cereales / pasta" },
  { value: "legumbres", label: "Legumbres" },
  { value: "fruta", label: "Fruta" },
  { value: "verduras", label: "Verduras" },
  { value: "lacteos", label: "Lacteos" },
  { value: "frutos_secos", label: "Frutos secos" },
  { value: "grasas", label: "Grasas" },
  { value: "otros", label: "Otros" },
]

interface Food {
  id: string
  name: string
  brand?: string
  category?: string
  equivalence_category?: string
  calories: number
  protein: number
  carbs: number
  fat: number
  serving_unit?: string
  is_verified?: boolean
  equivalence_groups?: EquivalenceGroup[]
}

interface EquivalenceGroup {
  id: string
  name: string
  slug: string
  description?: string
  is_active?: boolean
  foods_count?: number
}

export function EquivalenceManagement() {
  const { getAuthHeaders } = useAuth()
  const getAuthHeadersRef = useRef(getAuthHeaders)
  const [foods, setFoods] = useState<Food[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingFoodIds, setSavingFoodIds] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [submittedSearch, setSubmittedSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkCategory, setBulkCategory] = useState("arroz_cereales")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [groups, setGroups] = useState<EquivalenceGroup[]>([])
  const [groupFilter, setGroupFilter] = useState("all")
  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupDescription, setNewGroupDescription] = useState("")

  useEffect(() => {
    getAuthHeadersRef.current = getAuthHeaders
  }, [getAuthHeaders])

  const fetchFoods = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page_size: String(pageSize), page: String(currentPage) })
      if (submittedSearch) params.set("search", submittedSearch)
      if (categoryFilter !== "all") params.set("equivalence_category", categoryFilter)
      if (groupFilter !== "all") params.set("equivalence_groups", groupFilter)

      const headers = await getAuthHeadersRef.current()
      const response = await fetch(`${getApiUrl()}/api/nutrition/foods/?${params.toString()}`, { headers })
      if (!response.ok) throw new Error("No se pudieron cargar alimentos")
      const data = await response.json()
      setFoods(Array.isArray(data) ? data : data.results || [])
      setTotalCount(Array.isArray(data) ? data.length : data.count || 0)
      setSelectedIds([])
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar las equivalencias.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, currentPage, groupFilter, pageSize, submittedSearch])

  const fetchGroups = useCallback(async () => {
    try {
      const headers = await getAuthHeadersRef.current()
      const response = await fetch(`${getApiUrl()}/api/nutrition/food-equivalence-groups/?page_size=500`, { headers })
      if (!response.ok) throw new Error("No se pudieron cargar grupos")
      const data = await response.json()
      setGroups(Array.isArray(data) ? data : data.results || [])
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los grupos personalizados.", variant: "destructive" })
    }
  }, [])

  useEffect(() => {
    fetchFoods()
  }, [fetchFoods])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  const submitSearch = () => {
    const nextSearch = search.trim()
    if (nextSearch === submittedSearch && currentPage === 1) {
      fetchFoods()
      return
    }
    setCurrentPage(1)
    setSubmittedSearch(nextSearch)
  }

  const categoryLabel = useMemo(() => {
    return Object.fromEntries(EQUIVALENCE_CATEGORIES.map((category) => [category.value, category.label]))
  }, [])

  const updateFoodCategory = async (foodId: string, equivalenceCategory: string) => {
    const headers = await getAuthHeadersRef.current()
    const response = await fetch(`${getApiUrl()}/api/nutrition/foods/${foodId}/`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ equivalence_category: equivalenceCategory === "none" ? "" : equivalenceCategory }),
    })
    if (!response.ok) throw new Error("No se pudo actualizar")
  }

  const slugify = (value: string) => value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  const createGroup = async () => {
    if (!newGroupName.trim()) return
    setSaving(true)
    try {
      const headers = await getAuthHeadersRef.current()
      const response = await fetch(`${getApiUrl()}/api/nutrition/food-equivalence-groups/`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          name: newGroupName.trim(),
          slug: slugify(newGroupName.trim()),
          description: newGroupDescription.trim(),
          is_active: true,
        }),
      })
      if (!response.ok) throw new Error("No se pudo crear")
      setNewGroupName("")
      setNewGroupDescription("")
      await fetchGroups()
      toast({ title: "Grupo creado", description: "Ya puedes asignar alimentos a este grupo." })
    } catch (error) {
      toast({ title: "Error", description: "No se pudo crear el grupo.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const updateFoodGroups = async (food: Food, groupIds: string[]) => {
    setSavingFoodIds((current) => Array.from(new Set([...current, food.id])))
    try {
      const headers = await getAuthHeadersRef.current()
      const response = await fetch(`${getApiUrl()}/api/nutrition/foods/${food.id}/`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ equivalence_group_ids: groupIds }),
      })
      if (!response.ok) throw new Error("No se pudo actualizar")
      const groupMap = new Map(groups.map((group) => [group.id, group]))
      setFoods((current) => current.map((item) => item.id === food.id ? {
        ...item,
        equivalence_groups: groupIds.map((id) => groupMap.get(id)).filter(Boolean) as EquivalenceGroup[],
      } : item))
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron actualizar los grupos del alimento.", variant: "destructive" })
    } finally {
      setSavingFoodIds((current) => current.filter((id) => id !== food.id))
    }
  }

  const toggleFoodGroup = (food: Food, groupId: string) => {
    const currentIds = new Set((food.equivalence_groups || []).map((group) => group.id))
    if (currentIds.has(groupId)) currentIds.delete(groupId)
    else currentIds.add(groupId)
    updateFoodGroups(food, Array.from(currentIds))
  }

  const handleSingleUpdate = async (food: Food, equivalenceCategory: string) => {
    setSavingFoodIds((current) => Array.from(new Set([...current, food.id])))
    try {
      await updateFoodCategory(food.id, equivalenceCategory)
      setFoods((current) => current.map((item) => item.id === food.id ? { ...item, equivalence_category: equivalenceCategory === "none" ? "" : equivalenceCategory } : item))
      toast({ title: "Equivalencia actualizada", description: food.name })
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar el alimento.", variant: "destructive" })
    } finally {
      setSavingFoodIds((current) => current.filter((id) => id !== food.id))
    }
  }

  const handleBulkUpdate = async () => {
    if (selectedIds.length === 0) return
    setSaving(true)
    try {
      await Promise.all(selectedIds.map((id) => updateFoodCategory(id, bulkCategory)))
      setFoods((current) => current.map((item) => selectedIds.includes(item.id) ? { ...item, equivalence_category: bulkCategory } : item))
      toast({ title: "Equivalencias actualizadas", description: `${selectedIds.length} alimentos asignados a ${categoryLabel[bulkCategory]}` })
      setSelectedIds([])
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron actualizar todos los alimentos.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const toggleFood = (foodId: string) => {
    setSelectedIds((current) => current.includes(foodId) ? current.filter((id) => id !== foodId) : [...current, foodId])
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Equivalencias de Alimentos</h2>
          <p className="text-sm text-muted-foreground">Gestiona los grupos que usa el intercambio automático de ingredientes.</p>
        </div>
        <Button onClick={fetchFoods} variant="outline" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shuffle className="h-5 w-5 text-emerald-600" />
            Clasificacion para intercambios
          </CardTitle>
          <CardDescription>Si un alimento no tiene grupo manual, el sistema intentara inferirlo por nombre y categoria.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_220px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submitSearch()
                }}
                placeholder="Buscar alimento, marca o categoria..."
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(value) => { setCategoryFilter(value); setCurrentPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los grupos</SelectItem>
                {EQUIVALENCE_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={groupFilter} onValueChange={(value) => { setGroupFilter(value); setCurrentPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar grupo personalizado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los grupos personalizados</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={submitSearch} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Buscar
            </Button>
          </div>

          <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 md:grid-cols-[220px_1fr_auto]">
            <Input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Nuevo grupo: pan de molde" />
            <Input value={newGroupDescription} onChange={(e) => setNewGroupDescription(e.target.value)} placeholder="Descripcion opcional" />
            <Button onClick={createGroup} disabled={saving || !newGroupName.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              Crear grupo
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {groups.slice(0, 24).map((group) => (
              <Badge key={group.id} variant="outline" className="rounded-md">
                {group.name} {typeof group.foods_count === "number" ? `(${group.foods_count})` : ""}
              </Badge>
            ))}
          </div>

          <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>Mostrando {foods.length} de {totalCount} alimentos</span>
            <div className="flex items-center gap-2">
              <span>Por pagina</span>
              <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setCurrentPage(1) }}>
                <SelectTrigger className="h-9 w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-medium">{selectedIds.length} seleccionados</div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={bulkCategory} onValueChange={setBulkCategory}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EQUIVALENCE_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleBulkUpdate} disabled={saving || selectedIds.length === 0}>
                <Check className="mr-2 h-4 w-4" />
                Aplicar a seleccionados
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <div className="grid grid-cols-[44px_1fr_150px_220px_280px] bg-muted px-3 py-2 text-xs font-bold uppercase text-muted-foreground">
              <span />
              <span>Alimento</span>
              <span>Macros</span>
              <span>Categoria antigua</span>
              <span>Grupos personalizados</span>
            </div>
            <div className="divide-y">
              {loading ? (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Cargando alimentos...
                </div>
              ) : foods.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">No hay alimentos con esos filtros.</div>
              ) : foods.map((food) => {
                const isFoodSaving = savingFoodIds.includes(food.id)
                return (
                  <div key={food.id} className="grid grid-cols-[44px_1fr_150px_220px_280px] items-center gap-2 px-3 py-3">
                    <Checkbox checked={selectedIds.includes(food.id)} onCheckedChange={() => toggleFood(food.id)} />
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{food.name}</div>
                      <div className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground">
                        {food.brand ? <span>{food.brand}</span> : null}
                        {food.category ? <Badge variant="outline">{food.category}</Badge> : null}
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-muted-foreground">
                      <div>{food.calories} kcal</div>
                      <div>P {food.protein} · C {food.carbs} · G {food.fat}</div>
                    </div>
                    <Select value={food.equivalence_category || "none"} onValueChange={(value) => handleSingleUpdate(food, value)} disabled={saving || isFoodSaving}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin grupo manual" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin grupo manual</SelectItem>
                        {EQUIVALENCE_CATEGORIES.map((category) => (
                          <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto rounded-lg border bg-white p-2">
                      {groups.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Crea grupos para asignar alimentos.</span>
                      ) : groups.map((group) => {
                        const checked = Boolean(food.equivalence_groups?.some((item) => item.id === group.id))
                        return (
                          <button
                            key={group.id}
                            type="button"
                            onClick={() => toggleFoodGroup(food, group.id)}
                            disabled={saving || isFoodSaving}
                            className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition ${checked ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-500 hover:border-emerald-200"}`}
                          >
                            {group.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" disabled={currentPage === 1 || loading} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">Pagina {currentPage} de {totalPages}</span>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages || loading} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
                Siguiente
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
