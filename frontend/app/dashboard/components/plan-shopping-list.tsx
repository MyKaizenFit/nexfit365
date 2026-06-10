"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Loader2,
  ShoppingCart,
  RefreshCw,
  ListChecks,
  Search,
  Check,
  ChevronDown,
  Package,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { authenticatedFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

interface ShoppingItem {
  name: string
  quantity: number
  unit: string
  recipes: string[]
  category?: string
  variants?: string[]
  variant_note?: string | null
}

interface ShoppingListResponse {
  plan_name: string | null
  days: number
  items: ShoppingItem[]
  total_items: number
  message?: string
  stats?: {
    recipes_considered: number
    raw_lines: number
    merged_from: number
  }
}

function formatQuantity(quantity: number, unit: string) {
  const rounded = unit === "ud" ? Math.round(quantity) : Math.round(quantity * 10) / 10
  const labels: Record<string, string> = {
    g: "g",
    ml: "ml",
    ud: "ud",
  }
  return `${rounded} ${labels[unit] || unit}`
}

export function PlanShoppingList() {
  const [days, setDays] = useState("7")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<ShoppingListResponse | null>(null)
  const [search, setSearch] = useState("")
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

  const fetchList = async (windowDays: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await authenticatedFetch(`nutrition/shopping-list/?days=${windowDays}`)
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || `Error ${response.status}`)
      }
      setPayload(data)
      setChecked({})
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la lista de compra")
      setPayload(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList(days)
  }, [days])

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    const items = payload?.items || []
    if (!query) return items
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query) ||
        item.recipes.some((r) => r.toLowerCase().includes(query)),
    )
  }, [payload, search])

  const grouped = useMemo(() => {
    const map = new Map<string, ShoppingItem[]>()
    for (const item of filteredItems) {
      const category = item.category || "Otros"
      const list = map.get(category) || []
      list.push(item)
      map.set(category, list)
    }
    return Array.from(map.entries())
  }, [filteredItems])

  const checkedCount = useMemo(
    () => Object.values(checked).filter(Boolean).length,
    [checked],
  )

  const toggleItem = (key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: prev[category] === false,
    }))
  }

  const isCategoryOpen = (category: string) => expandedCategories[category] !== false

  return (
    <Card className="border shadow-xl overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-950/20 dark:to-card">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <ShoppingCart className="h-5 w-5 text-emerald-600 shrink-0" />
              Lista de la compra
            </CardTitle>
            <CardDescription className="text-xs md:text-sm mt-1">
              Solo la receta principal de cada comida (no todas las equivalencias). Productos similares agrupados.
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" className="shrink-0 h-9 w-9" onClick={() => fetchList(days)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-3">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-full sm:w-[160px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Próximos 3 días</SelectItem>
              <SelectItem value="7">Próximos 7 días</SelectItem>
              <SelectItem value="14">Próximos 14 días</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto..."
              className="pl-9 h-9"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {payload?.plan_name ? (
            <Badge variant="outline" className="text-xs font-normal">
              {payload.plan_name}
            </Badge>
          ) : null}
          {payload?.total_items ? (
            <Badge className="text-xs bg-emerald-600 hover:bg-emerald-600">
              {payload.total_items} productos
            </Badge>
          ) : null}
          {payload?.stats?.merged_from ? (
            <Badge variant="secondary" className="text-xs font-normal">
              {payload.stats.merged_from} duplicados agrupados
            </Badge>
          ) : null}
          {checkedCount > 0 ? (
            <Badge variant="outline" className="text-xs font-normal text-emerald-700 border-emerald-300">
              {checkedCount} en el carrito
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Preparando tu lista...
          </div>
        ) : error ? (
          <div className="text-sm text-red-600 py-4">{error}</div>
        ) : grouped.length === 0 ? (
          <div className="text-sm text-muted-foreground flex flex-col items-center gap-2 py-10">
            <ListChecks className="h-8 w-8 opacity-40" />
            {payload?.message || "No hay ingredientes para este periodo."}
          </div>
        ) : (
          <div className="space-y-3">
            {grouped.map(([category, items]) => {
              const open = isCategoryOpen(category)
              const categoryChecked = items.filter((item) => checked[`${category}::${item.name}::${item.unit}`]).length

              return (
                <div key={category} className="rounded-xl border bg-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Package className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="font-medium text-sm truncate">{category}</span>
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0">
                        {categoryChecked}/{items.length}
                      </Badge>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
                  </button>

                  {open ? (
                    <ul className="divide-y">
                      {items.map((item) => {
                        const itemKey = `${category}::${item.name}::${item.unit}`
                        const isChecked = Boolean(checked[itemKey])

                        return (
                          <li key={itemKey}>
                            <button
                              type="button"
                              onClick={() => toggleItem(itemKey)}
                              className={cn(
                                "flex w-full items-start gap-3 px-3 py-3 text-left transition-colors touch-manipulation active:bg-muted/50",
                                isChecked && "bg-emerald-50/60 dark:bg-emerald-950/20",
                              )}
                            >
                              <div
                                className={cn(
                                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                                  isChecked
                                    ? "border-emerald-600 bg-emerald-600 text-white"
                                    : "border-muted-foreground/40",
                                )}
                              >
                                {isChecked ? <Check className="h-3 w-3" /> : null}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p
                                    className={cn(
                                      "font-medium text-sm leading-snug",
                                      isChecked && "line-through text-muted-foreground",
                                    )}
                                  >
                                    {item.name}
                                  </p>
                                  <span
                                    className={cn(
                                      "shrink-0 rounded-md bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200",
                                      isChecked && "opacity-50",
                                    )}
                                  >
                                    {formatQuantity(item.quantity, item.unit)}
                                  </span>
                                </div>

                                {item.variant_note ? (
                                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                                    {item.variant_note}
                                  </p>
                                ) : null}

                                {item.recipes.length > 0 && !isChecked ? (
                                  <p className="text-[11px] text-muted-foreground/80 mt-1 truncate">
                                    {item.recipes.length === 1
                                      ? item.recipes[0]
                                      : `${item.recipes.length} recetas`}
                                  </p>
                                ) : null}
                              </div>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
