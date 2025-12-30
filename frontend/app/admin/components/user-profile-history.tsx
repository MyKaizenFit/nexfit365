"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, History } from "lucide-react"
import { useAdminUserProfileHistory } from "@/hooks/use-admin-user-profile-history"
import { Badge } from "@/components/ui/badge"

export function UserProfileHistory({ userId }: { userId: string }) {
  const { history, loading, error } = useAdminUserProfileHistory(userId)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-4 w-4" />
          Historial de perfil
        </CardTitle>
        <CardDescription>Últimas modificaciones conocidas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando historial...
          </div>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {!loading && (!history || !Array.isArray(history) || history.length === 0) && (
          <p className="text-sm text-muted-foreground">Sin registros disponibles.</p>
        )}
        {Array.isArray(history) && history.slice(0, 5).map((entry) => (
          <div key={entry.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>{entry.changed_by_email || "Sistema"}</span>
              <Badge variant="outline">{new Date(entry.created_at).toLocaleString("es-ES")}</Badge>
            </div>
            <div className="space-y-1">
              {Object.entries(entry.changes || {}).slice(0, 4).map(([field, diff]) => (
                <p key={field} className="text-xs text-muted-foreground">
                  <span className="font-semibold">{field}:</span> {String((diff as any).old ?? "—")} → {String((diff as any).new ?? "—")}
                </p>
              ))}
              {Object.keys(entry.changes || {}).length > 4 && (
                <p className="text-xs text-muted-foreground">…más cambios</p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

