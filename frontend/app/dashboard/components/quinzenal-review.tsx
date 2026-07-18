"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Calendar, CheckCircle, Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { buildApiUrl } from "@/lib/api"

interface QuinzenalStatus {
  days_until_review: number
  next_review_date: string
  last_review_sent_at: string | null
  review_sent_recently: boolean
  photos_last_15_days: number
  measurements_last_15_days: number
  needs_photos: boolean
  needs_measurements: boolean
  can_send: boolean
}

export function QuinzenalReview() {
  const { getAuthHeaders } = useAuth()
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [notes, setNotes] = useState("")
  const [status, setStatus] = useState<QuinzenalStatus | null>(null)

  const loadStatus = async () => {
    try {
      setLoading(true)
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl("progress-stats/quinzenal-review/"), {
        credentials: 'include', headers })
      if (response.status === 401 || response.status === 403) {
        setLoading(false)
        return
      }
      if (!response.ok) throw new Error("No se pudo cargar la revisión")
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar tu revisión quincenal.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const handleSendReview = async () => {
    if (!status?.can_send) {
      toast({
        title: "Revisión incompleta",
        description: "Completa los requisitos antes de enviar la revisión.",
        variant: "destructive",
      })
      return
    }

    try {
      setSending(true)
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl("progress-stats/quinzenal-review/submit/"), {
        credentials: 'include',
        method: "POST",
        headers,
        body: JSON.stringify({ notes }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || "No se pudo enviar la revisión")

      toast({
        title: "✅ Revisión enviada",
        description: "Tu solicitud ya ha sido enviada correctamente.",
      })

      setNotes("")
      await loadStatus()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar la revisión.",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const formatDate = (value?: string | null) => {
    if (!value) return "—"
    return new Date(value).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Revisión Quincenal
        </CardTitle>
        <CardDescription>Estado real de tu próxima evaluación con el equipo</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading || !status ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
          </div>
        ) : (
          <>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{status.days_until_review}</p>
              <p className="text-sm text-muted-foreground">días restantes</p>
              <p className="text-xs text-muted-foreground mt-1">Próxima revisión: {formatDate(status.next_review_date)}</p>
            </div>

            {(status.needs_photos || status.needs_measurements) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Pendiente:
                  {status.needs_photos && " subir fotos de progreso"}
                  {status.needs_photos && status.needs_measurements && " y"}
                  {status.needs_measurements && " registrar medidas corporales"}
                </AlertDescription>
              </Alert>
            )}

            {status.review_sent_recently && (
              <div className="p-4 bg-green-500/10 border border-green-200 dark:border-green-800/30 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
                  <CheckCircle className="h-4 w-4" /> Última revisión enviada
                </div>
                <p className="text-sm text-green-700 dark:text-green-400 mt-1">{formatDate(status.last_review_sent_at)}</p>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Preparación real para la revisión:</h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2">
                  <span>Fotos subidas en los últimos 15 días</span>
                  <span className={status.photos_last_15_days > 0 ? "text-green-600 font-semibold" : "text-amber-600 font-semibold"}>{status.photos_last_15_days}</span>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2">
                  <span>Medidas registradas en los últimos 15 días</span>
                  <span className={status.measurements_last_15_days > 0 ? "text-green-600 font-semibold" : "text-amber-600 font-semibold"}>{status.measurements_last_15_days}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Notas opcionales para tu revisión</h4>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Cuéntanos cómo te has sentido, bloqueos o dudas para esta revisión..."
              />
            </div>

            <Button
              className="w-full hover:scale-[1.01] transition-transform"
              disabled={!status.can_send || sending}
              onClick={handleSendReview}
            >
              {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando...</> : <><Send className="h-4 w-4 mr-2" />Enviar revisión</>}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
