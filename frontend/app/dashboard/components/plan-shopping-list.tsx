"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, ShoppingCart, RefreshCw, ListChecks } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { authenticatedFetch } from "@/lib/api"

interface ShoppingItem {
  name: string
  quantity: number
  unit: string
  recipes: string[]
}

interface ShoppingListResponse {
  plan_name: string | null
  days: number
  items: ShoppingItem[]
  total_items: number
  message?: string
}

export function PlanShoppingList() {
  const [days, setDays] = useState("7")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<ShoppingListResponse | null>(null)

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

  const grouped = useMemo(() => {
    const items = payload?.items || []
    return items
  }, [payload])

  return (
    <Card className="border shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <ShoppingCart className="h-4 w-4 md:h-5 md:w-5 text-emerald-600" />
              Lista de compra del plan
            </CardTitle>
            <CardDescription>
              Ingredientes agregados desde tus recetas sugeridas
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchList(days)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecciona ventana" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Proximos 3 dias</SelectItem>
              <SelectItem value="7">Proximos 7 dias</SelectItem>
              <SelectItem value="14">Proximos 14 dias</SelectItem>
            </SelectContent>
          </Select>
          {payload?.plan_name ? <Badge variant="outline">{payload.plan_name}</Badge> : null}
          {payload?.total_items ? <Badge>{payload.total_items} items</Badge> : null}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Generando lista...
          </div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : grouped.length === 0 ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2 py-4">
            <ListChecks className="h-4 w-4" />
            No hay ingredientes para esta ventana.
          </div>
        ) : (
          <div className="space-y-2">
            {grouped.map((item) => (
              <div key={`${item.name}-${item.unit}`} className="rounded-lg border p-3 bg-card/60">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-sm md:text-base">{item.name}</p>
                  <Badge variant="secondary">{item.quantity} {item.unit}</Badge>
                </div>
                {item.recipes.length > 0 ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    Recetas: {item.recipes.slice(0, 3).join(", ")}{item.recipes.length > 3 ? ` +${item.recipes.length - 3}` : ""}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
