"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CalendarDays, Crown, Download, Loader2, Mail, MessageCircle, RefreshCw, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/auth-context"
import { buildApiUrl } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

interface CoachingPlan {
  id: string
  name: string
  duration_label: string
  tier: string
}

interface CoachingInquiry {
  id: string
  full_name: string
  email: string
  phone_number: string
  goal: string
  current_challenge: string
  availability: string
  preferred_contact: string
  source_screen: string
  source_screen_display?: string
  status: string
  created_at: string
  whatsapp_url: string
  mailto_url: string
  booking_url: string
  followup_whatsapp_url: string
  followup_mailto_url: string
  needs_follow_up: boolean
  days_waiting: number
  plan: CoachingPlan | null
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  contacted: "Contactado",
  scheduled: "Llamada agendada",
  qualified: "Cualificado",
  closed: "Cerrado",
}

export function CoachingManagement() {
  const { getAuthHeaders } = useAuth()
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [inquiries, setInquiries] = useState<CoachingInquiry[]>([])

  const loadInquiries = async () => {
    try {
      setLoading(true)
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl("coaching/inquiries/"), {
        credentials: 'include', headers })
      if (!response.ok) throw new Error("No se pudieron cargar las solicitudes")
      const data = await response.json()
      setInquiries(data.results || data)
    } catch (error) {
      toast({ title: "Error", description: "No se pudo cargar el panel 1:1", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInquiries()
  }, [])

  const summary = useMemo(() => {
    const total = inquiries.length
    const pending = inquiries.filter((item) => item.status === "pending").length
    const contacted = inquiries.filter((item) => item.status === "contacted").length
    const scheduled = inquiries.filter((item) => item.status === "scheduled").length
    const qualified = inquiries.filter((item) => item.status === "qualified").length
    const closed = inquiries.filter((item) => item.status === "closed").length
    const followUp = inquiries.filter((item) => item.needs_follow_up).length
    const conversionRate = total > 0 ? Math.round(((qualified + closed) / total) * 100) : 0
    const followUpRate = total > 0 ? Math.round((followUp / total) * 100) : 0

    return {
      total,
      pending,
      contacted,
      scheduled,
      qualified,
      closed,
      followUp,
      conversionRate,
      followUpRate,
    }
  }, [inquiries])

  const contactChannelSummary = useMemo(() => {
    const items = [
      { label: "WhatsApp", value: "whatsapp" },
      { label: "Email", value: "email" },
      { label: "Ambos", value: "both" },
    ]

    return items.map((channel) => {
      const count = inquiries.filter((item) => item.preferred_contact === channel.value).length
      const percentage = inquiries.length > 0 ? Math.round((count / inquiries.length) * 100) : 0
      return { ...channel, count, percentage }
    })
  }, [inquiries])

  const sourceScreenSummary = useMemo(() => {
    const grouped = inquiries.reduce((acc, item) => {
      const key = item.source_screen_display || item.source_screen || "Otro"
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(grouped)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [inquiries])

  const planDemandSummary = useMemo(() => {
    const grouped = inquiries.reduce((acc, item) => {
      const key = item.plan?.name || "Sin plan definido"
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(grouped)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
  }, [inquiries])

  const exportReport = () => {
    const payload = {
      generated_at: new Date().toISOString(),
      summary,
      inquiries: inquiries.map((item) => ({
        full_name: item.full_name,
        email: item.email,
        phone_number: item.phone_number,
        preferred_contact: item.preferred_contact,
        source_screen: item.source_screen,
        source_screen_display: item.source_screen_display || item.source_screen,
        status: item.status,
        plan: item.plan?.name || null,
        needs_follow_up: item.needs_follow_up,
        days_waiting: item.days_waiting,
        created_at: item.created_at,
      })),
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `coaching-funnel-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      setSavingId(id)
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`coaching/inquiries/${id}/`), {
        credentials: 'include',
        method: "PATCH",
        headers,
        body: JSON.stringify({ status }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || "No se pudo actualizar")

      setInquiries((prev) => prev.map((item) => item.id === id ? { ...item, status: data.status } : item))
      toast({ title: "✅ Estado actualizado", description: "La solicitud se ha actualizado correctamente." })
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo actualizar", variant: "destructive" })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
            👑 Solicitudes Coaching 1:1
          </h2>
          <p className="text-sm text-gray-600 mt-1">Gestiona y filtra los casos que llegan desde la app.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportReport}>
            <Download className="mr-2 h-4 w-4" /> Exportar embudo
          </Button>
          <Button variant="outline" onClick={loadInquiries}>
            <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-7">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{summary.total}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-amber-700">Pendientes</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-amber-600">{summary.pending}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-blue-700">Contactados</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-blue-600">{summary.contacted}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-violet-700">Agendados</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-violet-600">{summary.scheduled}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-green-700">Cualificados</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-green-600">{summary.qualified}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-emerald-700">Cerrados</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-emerald-600">{summary.closed}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-orange-700">Conversión</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-orange-600">{summary.conversionRate}%</div><p className="text-xs text-gray-500 mt-1">seguimiento {summary.followUpRate}%</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Canales preferidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contactChannelSummary.map((channel) => (
              <div key={channel.value} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{channel.label}</span>
                  <span className="font-medium">{channel.count} · {channel.percentage}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.max(channel.percentage, channel.count > 0 ? 8 : 0)}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pantallas que convierten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sourceScreenSummary.length > 0 ? sourceScreenSummary.map((source) => (
              <div key={source.name} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span className="text-gray-700">{source.name}</span>
                <Badge variant="secondary">{source.count}</Badge>
              </div>
            )) : (
              <p className="text-sm text-gray-500">Aún no hay suficiente histórico por pantalla.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Planes más demandados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {planDemandSummary.length > 0 ? planDemandSummary.map((plan) => (
              <div key={plan.name} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span className="text-gray-700">{plan.name}</span>
                <Badge variant="secondary">{plan.count}</Badge>
              </div>
            )) : (
              <p className="text-sm text-gray-500">Aún no hay suficiente histórico comercial.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-violet-500" /></div>
      ) : inquiries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            Aún no hay solicitudes recibidas.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {inquiries.map((item) => (
            <Card key={item.id} className="border-gray-200 shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{item.full_name || item.email || "Solicitud sin nombre"}</h3>
                      <Badge variant="outline">{STATUS_LABELS[item.status] || item.status}</Badge>
                      {item.plan && <Badge className="bg-violet-100 text-violet-700 border-violet-200">{item.plan.name}</Badge>}
                      {item.needs_follow_up && <Badge className="bg-orange-100 text-orange-700 border-orange-200">Requiere seguimiento</Badge>}
                    </div>
                    <p className="text-sm text-gray-500">{item.email || "Sin email"} · {item.phone_number || "Sin teléfono"}</p>
                    <p className="text-xs text-gray-400">Preferencia de contacto: {item.preferred_contact}</p>
                    <p className="text-xs text-gray-400">Origen: {item.source_screen_display || item.source_screen || "No definido"}</p>
                    {item.needs_follow_up && <p className="text-xs font-medium text-orange-600">Lleva {item.days_waiting} días sin cierre.</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => window.open(item.whatsapp_url, "_blank")}>
                      <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => window.open(item.mailto_url, "_blank")}>
                      <Mail className="mr-1 h-4 w-4" /> Email
                    </Button>
                    {item.booking_url && (
                      <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => window.open(item.booking_url, "_blank")}>
                        <CalendarDays className="mr-1 h-4 w-4" /> Agenda
                      </Button>
                    )}
                  </div>
                </div>

                {item.needs_follow_up && (item.followup_whatsapp_url || item.followup_mailto_url) && (
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                    <div className="flex items-start gap-2 text-orange-800">
                      <AlertTriangle className="mt-0.5 h-4 w-4" />
                      <div>
                        <p className="text-sm font-semibold">Seguimiento recomendado</p>
                        <p className="text-xs">El lead sigue abierto. Puedes lanzar un mensaje de seguimiento en un clic.</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.followup_whatsapp_url && (
                        <Button size="sm" variant="outline" className="border-orange-300 text-orange-700" onClick={() => window.open(item.followup_whatsapp_url, "_blank")}>
                          <MessageCircle className="mr-1 h-4 w-4" /> Seguimiento WA
                        </Button>
                      )}
                      {item.followup_mailto_url && (
                        <Button size="sm" variant="outline" className="border-orange-300 text-orange-700" onClick={() => window.open(item.followup_mailto_url, "_blank")}>
                          <Mail className="mr-1 h-4 w-4" /> Seguimiento email
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Objetivo</p>
                    <p className="text-sm text-gray-700">{item.goal}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Bloqueo actual</p>
                    <p className="text-sm text-gray-700">{item.current_challenge || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Disponibilidad</p>
                    <p className="text-sm text-gray-700">{item.availability || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Actualizar estado</p>
                    <div className="flex gap-2">
                      <Select value={item.status} onValueChange={(value) => updateStatus(item.id, value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="contacted">Contactado</SelectItem>
                          <SelectItem value="scheduled">Llamada agendada</SelectItem>
                          <SelectItem value="qualified">Cualificado</SelectItem>
                          <SelectItem value="closed">Cerrado</SelectItem>
                        </SelectContent>
                      </Select>
                      {savingId === item.id && <Loader2 className="h-4 w-4 animate-spin self-center text-violet-500" />}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
