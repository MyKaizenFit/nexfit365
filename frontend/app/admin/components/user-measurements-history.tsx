"use client"

import { useMemo } from "react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { Loader2, Ruler } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAdminUserMeasurements } from "@/hooks/use-admin-user-measurements"
import type { AdminBodyMeasurement } from "@/lib/admin-measurements-service"

interface Props {
  userId: string
}

const FIELDS: Array<{ key: keyof AdminBodyMeasurement; label: string }> = [
  { key: "chest", label: "Pecho" },
  { key: "waist", label: "Cintura" },
  { key: "hips", label: "Caderas" },
  { key: "arms", label: "Brazos" },
  { key: "thighs", label: "Muslos" },
  { key: "neck", label: "Cuello" },
  { key: "forearms", label: "Antebrazos" },
  { key: "calves", label: "Gemelos" },
]

function formatDate(value?: string) {
  if (!value) return "Sin fecha"
  try {
    return format(parseISO(value), "d MMM yyyy", { locale: es })
  } catch {
    return value
  }
}

function formatCm(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null
  return `${value} cm`
}

function sortNewestFirst(entries: AdminBodyMeasurement[]) {
  return [...entries].sort((a, b) => {
    const byDate = String(b.date || "").localeCompare(String(a.date || ""))
    if (byDate !== 0) return byDate
    return String(b.created_at || "").localeCompare(String(a.created_at || ""))
  })
}

export function UserMeasurementsHistory({ userId }: Props) {
  const { entries, count, loading, error, refetch } = useAdminUserMeasurements(userId)

  const sorted = useMemo(() => sortNewestFirst(entries), [entries])

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            Medidas corporales
          </CardTitle>
          <CardDescription>
            Historial registrado por la usuaria. Valores y unidades tal como se guardaron (cm).
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refrescar"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando medidas...
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Esta usuaria todavía no tiene medidas corporales registradas.
          </p>
        ) : (
          <div className="space-y-3">
            {count > sorted.length && (
              <p className="text-xs text-muted-foreground">
                Mostrando los {sorted.length} registros más recientes de {count}.
              </p>
            )}
            {sorted.map((entry) => {
              const values = FIELDS.map((field) => {
                const formatted = formatCm(entry[field.key] as string | number | null | undefined)
                return formatted ? { label: field.label, formatted } : null
              }).filter(Boolean) as Array<{ label: string; formatted: string }>

              return (
                <div key={entry.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{formatDate(entry.date)}</span>
                    <Badge variant="outline">{entry.date}</Badge>
                  </div>
                  {values.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin valores numéricos en este registro.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      {values.map((item) => (
                        <div key={item.label} className="flex justify-between gap-2">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium">{item.formatted}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {entry.notes ? (
                    <p className="text-xs text-muted-foreground">{entry.notes}</p>
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
