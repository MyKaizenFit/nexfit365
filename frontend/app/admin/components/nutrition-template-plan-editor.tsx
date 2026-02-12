"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { buildApiUrl } from "@/lib/api"
import { fixEncoding } from "@/lib/encoding-fix"
import { Loader2, Plus, Trash2, Search } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { handle401AndRefresh } from "@/lib/fetch-with-auth"

type DayKey = "1" | "2" | "3" | "4" | "5" | "6" | "7"

export interface AdminRecipe {
  id: string
  name: string
  category?: string
  goal_category?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  prep_time_minutes?: number
  difficulty?: string
  image_url?: string
}

interface MealRecipeOption {
  recipe_id: string
  display_order: number
  servings?: number
  custom_calories?: number
  custom_protein?: number
  custom_carbs?: number
  custom_fat?: number
}

interface PlanMealDraft {
  id?: string
  day_of_week: number
  name: string
  meal_type: string
  time: string
  calories: number
  protein: number
  carbs: number
  fat: number
  description: string
  order_index: number
  meal_recipes: MealRecipeOption[]
}

const DAY_LABELS: Record<DayKey, string> = {
  "1": "Lun",
  "2": "Mar",
  "3": "Mié",
  "4": "Jue",
  "5": "Vie",
  "6": "Sáb",
  "7": "Dom",
}

const MEAL_TYPES: Array<{ value: string; label: string }> = [
  { value: "breakfast", label: "Desayuno" },
  { value: "lunch", label: "Almuerzo" },
  { value: "snack", label: "Merienda" },
  { value: "dinner", label: "Cena" },
]

const GOAL_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "lose_weight", label: "Perder peso" },
  { value: "gain_muscle", label: "Ganar músculo" },
  { value: "maintain", label: "Mantener peso" },
  { value: "body_recomposition", label: "Recomposición corporal" },
  { value: "performance", label: "Rendimiento deportivo" },
]

function toNumber(value: unknown, fallback = 0) {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN
  return Number.isFinite(n) ? n : fallback
}

function formatRange(min: number, max: number, decimals = 0) {
  const round = (v: number) => Number(v.toFixed(decimals))
  const minVal = round(min)
  const maxVal = round(max)
  if (minVal === maxVal) return `${minVal}`
  return `${minVal}-${maxVal}`
}

function dayKeyFromMeal(meal: PlanMealDraft): DayKey {
  return meal.day_of_week ? (String(meal.day_of_week) as DayKey) : "1"
}

export function NutritionTemplatePlanEditor({
  planId,
  availableRecipes,
  onSaved,
  onClose,
}: {
  planId: string
  availableRecipes: AdminRecipe[]
  onSaved: () => void | Promise<void>
  onClose: () => void
}) {
  const { getAuthHeaders } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeDay, setActiveDay] = useState<DayKey>("1")

  const [meals, setMeals] = useState<PlanMealDraft[]>([])

  // selector recetas
  const [showRecipeSelector, setShowRecipeSelector] = useState(false)
  const [recipeSearch, setRecipeSearch] = useState("")
  const [recipeGoalFilter, setRecipeGoalFilter] = useState("all")
  const [targetMealIndex, setTargetMealIndex] = useState<number | null>(null)

  const recipesById = useMemo(() => {
    const map = new Map<string, AdminRecipe>()
    for (const r of availableRecipes) map.set(String(r.id), r)
    return map
  }, [availableRecipes])

  const computeRecipeMacros = useCallback((recipe: AdminRecipe | undefined | null, option?: MealRecipeOption) => {
    if (!recipe) return { calories: 0, protein: 0, carbs: 0, fat: 0 }
    const servings = option?.servings != null ? toNumber(option.servings, 1) : 1
    const calories = option?.custom_calories != null ? toNumber(option.custom_calories) : toNumber(recipe.calories) * servings
    const protein = option?.custom_protein != null ? toNumber(option.custom_protein) : toNumber(recipe.protein) * servings
    const carbs = option?.custom_carbs != null ? toNumber(option.custom_carbs) : toNumber(recipe.carbs) * servings
    const fat = option?.custom_fat != null ? toNumber(option.custom_fat) : toNumber(recipe.fat) * servings
    return { calories, protein, carbs, fat }
  }, [])

  const computeMealAverages = useCallback((meal: PlanMealDraft) => {
    const opts = Array.isArray(meal.meal_recipes) ? meal.meal_recipes : []
    const used = opts
      .map((o) => ({ o, r: recipesById.get(String(o.recipe_id)) }))
      .filter((x) => x.r)
      .map((x) => computeRecipeMacros(x.r!, x.o))
    if (used.length === 0) return { calories: 0, protein: 0, carbs: 0, fat: 0 }
    const sum = used.reduce(
      (acc, m) => ({
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
    return {
      calories: sum.calories / used.length,
      protein: sum.protein / used.length,
      carbs: sum.carbs / used.length,
      fat: sum.fat / used.length,
    }
  }, [computeRecipeMacros, recipesById])

  const computeMealRange = useCallback((meal: PlanMealDraft) => {
    const opts = Array.isArray(meal.meal_recipes) ? meal.meal_recipes : []
    const used = opts
      .map((o) => ({ o, r: recipesById.get(String(o.recipe_id)) }))
      .filter((x) => x.r)
      .map((x) => computeRecipeMacros(x.r!, x.o))
    if (used.length === 0) return null

    const pickRange = (key: "calories" | "protein" | "carbs" | "fat") => {
      const values = used.map((m) => m[key])
      return { min: Math.min(...values), max: Math.max(...values) }
    }

    return {
      calories: pickRange("calories"),
      protein: pickRange("protein"),
      carbs: pickRange("carbs"),
      fat: pickRange("fat"),
      count: used.length,
    }
  }, [computeRecipeMacros, recipesById])

  const filteredRecipes = useMemo(() => {
    const q = recipeSearch.trim().toLowerCase()
    return availableRecipes.filter((r) => {
      const matchesSearch = !q || (r.name || "").toLowerCase().includes(q)
      const matchesGoal = recipeGoalFilter === "all" || (r.goal_category || "") === recipeGoalFilter
      return matchesSearch && matchesGoal
    })
  }, [availableRecipes, recipeSearch, recipeGoalFilter])

  const mealsForDay = useMemo(() => {
    return meals
      .filter((m) => dayKeyFromMeal(m) === activeDay)
      .sort((a, b) => a.order_index - b.order_index)
  }, [meals, activeDay])

  const fetchJsonWithAuth = useCallback(async (url: string) => {
    let headers = await getAuthHeaders()
    let res = await fetch(buildApiUrl(url), { headers })
    if (res.status === 401) {
      const newHeaders = await handle401AndRefresh(getAuthHeaders)
      if (!newHeaders) throw new Error("Sesión expirada")
      headers = newHeaders
      res = await fetch(buildApiUrl(url), { headers })
    }
    if (!res.ok) throw new Error(`Error ${res.status}`)
    return await res.json()
  }, [getAuthHeaders])

  const patchJsonWithAuth = useCallback(async (url: string, body: any) => {
    let headers = await getAuthHeaders()
    let res = await fetch(buildApiUrl(url), {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.status === 401) {
      const newHeaders = await handle401AndRefresh(getAuthHeaders)
      if (!newHeaders) throw new Error("Sesión expirada")
      headers = newHeaders
      res = await fetch(buildApiUrl(url), {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.detail || errData.error || `Error ${res.status}`)
    }
    return await res.json().catch(() => null)
  }, [getAuthHeaders])

  const loadPlan = async () => {
    setLoading(true)
    try {
      const data = await fetchJsonWithAuth(`admin/nutrition/plans/${planId}/`)

      const incomingMeals = Array.isArray(data.meals) ? data.meals : []
      const mapped: PlanMealDraft[] = incomingMeals.map((m: any, idx: number) => {
        const mealRecipes = Array.isArray(m.meal_recipes) ? m.meal_recipes : []
        return {
          id: m.id ? String(m.id) : undefined,
          day_of_week: m.day_of_week ?? 1,
          name: fixEncoding(m.name || `Comida ${idx + 1}`),
          meal_type: m.meal_type || "lunch",
          time: m.time || "12:00",
          calories: toNumber(m.calories),
          protein: toNumber(m.protein),
          carbs: toNumber(m.carbs),
          fat: toNumber(m.fat),
          description: fixEncoding(m.description || ""),
          order_index: toNumber(m.order_index, idx + 1),
          meal_recipes: mealRecipes.map((mr: any, rIdx: number) => ({
            recipe_id: String(mr.recipe?.id || mr.recipe_id || ""),
            display_order: toNumber(mr.display_order, rIdx),
            servings: mr.servings != null ? toNumber(mr.servings, 1) : 1,
            custom_calories: mr.custom_calories != null ? toNumber(mr.custom_calories) : undefined,
            custom_protein: mr.custom_protein != null ? toNumber(mr.custom_protein) : undefined,
            custom_carbs: mr.custom_carbs != null ? toNumber(mr.custom_carbs) : undefined,
            custom_fat: mr.custom_fat != null ? toNumber(mr.custom_fat) : undefined,
          })).filter((x: any) => x.recipe_id),
        }
      })

      setMeals(mapped)
    } catch (e) {
      toast({
        title: "❌ Error",
        description: e instanceof Error ? e.message : "No se pudo cargar el plan",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId])

  const addMealForActiveDay = () => {
    const dayNum = Number(activeDay)
    const nextOrder =
      Math.max(
        0,
        ...meals.filter((m) => (m.day_of_week ?? null) === dayNum).map((m) => m.order_index || 0)
      ) + 1

    const newMeal: PlanMealDraft = {
      day_of_week: dayNum,
      name: `Comida ${nextOrder} (${DAY_LABELS[activeDay]})`,
      meal_type: "breakfast",
      time: "08:00",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      description: "",
      order_index: nextOrder,
      meal_recipes: [],
    }
    setMeals((prev) => [...prev, newMeal])
  }

  const updateMeal = (mealIdOrIndex: { id?: string; indexInMeals?: number }, patch: Partial<PlanMealDraft>) => {
    setMeals((prev) => {
      const next = [...prev]
      let idx = -1
      if (mealIdOrIndex.id) idx = next.findIndex((m) => m.id === mealIdOrIndex.id)
      if (idx === -1 && mealIdOrIndex.indexInMeals != null) idx = mealIdOrIndex.indexInMeals
      if (idx < 0) return prev
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }

  const removeMeal = (meal: PlanMealDraft) => {
    setMeals((prev) => prev.filter((m) => m !== meal))
  }

  const openRecipePicker = (meal: PlanMealDraft) => {
    const idx = meals.findIndex((m) => m === meal)
    if (idx < 0) return
    setTargetMealIndex(idx)
    setRecipeSearch("")
    setRecipeGoalFilter("all")
    setShowRecipeSelector(true)
  }

  const addRecipeToMeal = (recipe: AdminRecipe) => {
    if (targetMealIndex == null) return
    setMeals((prev) => {
      const next = [...prev]
      const meal = next[targetMealIndex]
      if (!meal) return prev
      const already = meal.meal_recipes.some((r) => String(r.recipe_id) === String(recipe.id))
      if (already) return prev
      const displayOrder = meal.meal_recipes.length
      meal.meal_recipes = [
        ...meal.meal_recipes,
        { recipe_id: String(recipe.id), display_order: displayOrder, servings: 1 },
      ]
      next[targetMealIndex] = { ...meal }
      return next
    })
  }

  const removeRecipeFromMeal = (meal: PlanMealDraft, recipeId: string) => {
    const idx = meals.findIndex((m) => m === meal)
    if (idx < 0) return
    setMeals((prev) => {
      const next = [...prev]
      const m = next[idx]
      if (!m) return prev
      const filtered = m.meal_recipes.filter((r) => String(r.recipe_id) !== String(recipeId))
      m.meal_recipes = filtered.map((r, i) => ({ ...r, display_order: i }))
      next[idx] = { ...m }
      return next
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const mealsPayload = meals.map((m) => ({
        day_of_week: m.day_of_week,
        name: m.name,
        meal_type: m.meal_type,
        time: m.time,
        description: m.description,
        order_index: toNumber(m.order_index, 1),
        // Mantener compatibilidad: el panel de usuario usa suggested_recipes para generar "opciones" (max 3).
        suggested_recipes_ids: m.meal_recipes.map((r) => r.recipe_id),
        // Y también guardamos las cantidades/orden en PlanMealRecipe.
        meal_recipes: m.meal_recipes.map((r) => ({
          recipe_id: r.recipe_id,
          servings: r.servings ?? 1,
          custom_calories: r.custom_calories,
          custom_protein: r.custom_protein,
          custom_carbs: r.custom_carbs,
          custom_fat: r.custom_fat,
          display_order: r.display_order ?? 0,
        })),
      }))

      await patchJsonWithAuth(`admin/nutrition/plans/${planId}/`, { meals: mealsPayload })

      toast({ title: "✅ Menú semanal guardado", description: "Se actualizaron los días/comidas y sus opciones." })
      await loadPlan()
      await onSaved()
    } catch (e) {
      toast({
        title: "❌ Error",
        description: e instanceof Error ? e.message : "No se pudo guardar",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Configura comidas por día y añade varias recetas como opciones (ej: 3 desayunos).
        </div>
        <Button onClick={addMealForActiveDay} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Añadir comida
        </Button>
      </div>

      <Tabs value={activeDay} onValueChange={(v) => setActiveDay(v as DayKey)}>
        <TabsList className="grid grid-cols-7">
          {(["1", "2", "3", "4", "5", "6", "7"] as DayKey[]).map((d) => (
            <TabsTrigger key={d} value={d} className="text-xs">
              {DAY_LABELS[d]}
            </TabsTrigger>
          ))}
        </TabsList>

        {(["1", "2", "3", "4", "5", "6", "7"] as DayKey[]).map((d) => (
          <TabsContent key={d} value={d} className="space-y-3">
            {mealsForDay.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  No hay comidas para este día. Usa “Añadir comida”.
                </CardContent>
              </Card>
            ) : (
              mealsForDay.map((meal) => {
                const computed = computeMealAverages(meal)
                const range = computeMealRange(meal)
                const recipeOptions = meal.meal_recipes
                  .slice()
                  .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                  .map((r) => recipesById.get(String(r.recipe_id)))
                  .filter(Boolean) as AdminRecipe[]

                return (
                  <Card key={`${meal.id || "new"}-${meal.name}-${meal.order_index}`} className="border">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <CardTitle className="text-sm">Comida #{meal.order_index}</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => removeMeal(meal)} title="Eliminar comida">
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Tipo</Label>
                          <Select
                            value={meal.meal_type}
                            onValueChange={(v) => updateMeal({ indexInMeals: meals.findIndex((m) => m === meal) }, { meal_type: v })}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MEAL_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Nombre</Label>
                          <Input
                            className="h-9"
                            value={meal.name}
                            onChange={(e) =>
                              updateMeal({ indexInMeals: meals.findIndex((m) => m === meal) }, { name: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Hora</Label>
                          <Input
                            className="h-9"
                            value={meal.time}
                            onChange={(e) =>
                              updateMeal({ indexInMeals: meals.findIndex((m) => m === meal) }, { time: e.target.value })
                            }
                            placeholder="08:00"
                          />
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {range ? (
                          <>
                            {range.count > 1 ? "Rango por opciones" : "Valores calculados"}: {formatRange(range.calories.min, range.calories.max)} kcal · P {formatRange(range.protein.min, range.protein.max, 1)} · C {formatRange(range.carbs.min, range.carbs.max, 1)} · G {formatRange(range.fat.min, range.fat.max, 1)}
                          </>
                        ) : (
                          <>Sin recetas, no hay macros calculados.</>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Opciones de receta (puedes añadir 3 o más)</Label>
                          <Button size="sm" variant="outline" onClick={() => openRecipePicker(meal)}>
                            <Plus className="h-4 w-4 mr-1" />
                            Añadir receta
                          </Button>
                        </div>

                        {meal.meal_recipes.length === 0 ? (
                          <div className="text-sm text-muted-foreground">Sin recetas seleccionadas.</div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {recipeOptions.map((r) => (
                              <div key={r.id} className="border rounded-md p-2 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium truncate">{fixEncoding(r.name)}</div>
                                  {r.goal_category && (
                                    <div className="mt-1">
                                      <Badge variant="secondary" className="text-[10px]">
                                        {GOAL_OPTIONS.find(option => option.value === r.goal_category)?.label || r.goal_category}
                                      </Badge>
                                    </div>
                                  )}
                                  <div className="text-xs text-muted-foreground">
                                    {toNumber(r.calories)} kcal · P {toNumber(r.protein)} · C {toNumber(r.carbs)} · G {toNumber(r.fat)}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeRecipeFromMeal(meal, String(r.id))}
                                  title="Quitar receta"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cerrar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar menú"
          )}
        </Button>
      </div>

      <Dialog open={showRecipeSelector} onOpenChange={setShowRecipeSelector}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Seleccionar receta</DialogTitle>
            <DialogDescription>Elige una receta ya creada para añadirla como opción.</DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar receta..."
              value={recipeSearch}
              onChange={(e) => setRecipeSearch(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-xs">Objetivo</Label>
            <Select value={recipeGoalFilter} onValueChange={setRecipeGoalFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                {GOAL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filteredRecipes.map((r) => (
              <Button
                key={r.id}
                variant="outline"
                className="justify-start h-auto whitespace-normal"
                onClick={() => {
                  addRecipeToMeal(r)
                  setShowRecipeSelector(false)
                }}
              >
                <div className="text-left">
                  <div className="font-medium text-sm">{fixEncoding(r.name)}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {r.category && (
                      <Badge variant="outline" className="text-[10px]">
                        {r.category}
                      </Badge>
                    )}
                    {r.goal_category && (
                      <Badge variant="secondary" className="text-[10px]">
                        {GOAL_OPTIONS.find(option => option.value === r.goal_category)?.label || r.goal_category}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {toNumber(r.calories)} kcal · P {toNumber(r.protein)} · C {toNumber(r.carbs)} · G {toNumber(r.fat)}
                  </div>
                </div>
              </Button>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecipeSelector(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

