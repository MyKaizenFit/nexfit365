"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowLeft, ChevronRight, Copy, Download, Loader2, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { buildApiUrl, getAuthHeaders } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import type {
  RestWellnessAssessmentDetail,
  RestWellnessAssessmentSummary,
} from "@/lib/rest-wellness/types"
import { RestWellnessPriorityChart } from "@/app/dashboard/components/rest-wellness-priority-chart"

interface Props {
  userId: string
}

export function UserRestWellnessPanel({ userId }: Props) {
  const [items, setItems] = useState<RestWellnessAssessmentSummary[]>([])
  const [selected, setSelected] = useState<RestWellnessAssessmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`admin/progress/users/${userId}/rest-wellness/`), { headers })
      if (!response.ok) throw new Error("list")
      const data = await response.json()
      const rows = Array.isArray(data)
        ? data
        : Array.isArray((data as { results?: RestWellnessAssessmentSummary[] }).results)
          ? (data as { results: RestWellnessAssessmentSummary[] }).results
          : []
      setItems(rows)
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron cargar los formularios de descanso.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void loadList()
  }, [loadList])

  const openDetail = async (item: RestWellnessAssessmentSummary) => {
    setDetailLoading(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(
        buildApiUrl(`admin/progress/users/${userId}/rest-wellness/${item.id}/`),
        { headers },
      )
      if (!response.ok) throw new Error("detail")
      const data = (await response.json()) as RestWellnessAssessmentDetail
      setSelected(data)
    } catch {
      toast({
        title: "Error",
        description: "No se pudo abrir el análisis.",
        variant: "destructive",
      })
    } finally {
      setDetailLoading(false)
    }
  }

  const copyScript = async () => {
    if (!selected?.script) return
    try {
      await navigator.clipboard.writeText(selected.script)
      toast({ title: "Guión copiado" })
    } catch {
      toast({ title: "No se pudo copiar", variant: "destructive" })
    }
  }

  const downloadScript = () => {
    if (!selected?.script) return
    const blob = new Blob([selected.script], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `guion-descanso-${selected.name || userId}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (selected) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" className="gap-2 px-0" onClick={() => setSelected(null)}>
          <ArrowLeft className="h-4 w-4" />
          Volver al listado
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{selected.name}</CardTitle>
            <CardDescription>
              {format(new Date(selected.date), "d MMM yyyy, HH:mm", { locale: es })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {detailLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
              </div>
            ) : (
              <RestWellnessPriorityChart ranked={selected.ranked || []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Guión para el vídeo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="max-h-[480px] overflow-y-auto whitespace-pre-wrap rounded-xl border bg-muted/30 p-4 text-sm leading-relaxed">
              {selected.script}
            </pre>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void copyScript()} className="gap-2">
                <Copy className="h-4 w-4" />
                Copiar guión
              </Button>
              <Button variant="outline" onClick={downloadScript} className="gap-2">
                <Download className="h-4 w-4" />
                Descargar .txt
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Moon className="h-5 w-5 text-violet-500" />
          Formulario del Descanso
        </CardTitle>
        <CardDescription>
          Cuestionarios enviados por la usuaria. Aquí puedes ver el análisis y el guión base.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            Esta usuaria aún no ha completado el cuestionario de descanso.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void openDetail(item)}
                className="flex w-full items-center justify-between rounded-xl border bg-white p-4 text-left transition-colors hover:bg-slate-50"
              >
                <div>
                  <div className="font-semibold text-slate-900">
                    {format(new Date(item.date), "d MMM yyyy, HH:mm", { locale: es })}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {item.top_categories?.length
                      ? item.top_categories.slice(0, 3).join(", ")
                      : "Sin categorías prioritarias"}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-violet-500" />
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
