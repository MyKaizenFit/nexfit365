"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowRight, CalendarDays, CheckCircle2, Crown, Loader2, Mail, MessageCircle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/contexts/auth-context"
import { buildApiUrl } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

interface CoachingPlan {
  id: string
  slug: string
  name: string
  duration_label: string
  tier: "basic" | "vip"
  summary: string
  benefits: string[]
  cta_text: string
}

interface InquiryResponse {
  id: string
  whatsapp_url: string
  mailto_url: string
  booking_url: string
  followup_whatsapp_url?: string
  followup_mailto_url?: string
  status?: string
  days_waiting?: number
  preferred_contact?: string
  created_at?: string
  plan?: CoachingPlan | null
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  contacted: "Contactado",
  scheduled: "Llamada agendada",
  qualified: "Cualificado",
  closed: "Cerrado",
}

const SOURCE_SCREEN_MAP: Record<string, string> = {
  "dashboard-home": "dashboard-home",
  dashboard: "dashboard-home",
  workouts: "workouts",
  meals: "meals",
  measurements: "measurements",
  "coaching-page": "coaching-page",
  landing: "landing",
}

const PLACEMENT_COPY: Record<string, { title: string; description: string; tags: string[] }> = {
  "dashboard-home": {
    title: "¿Quieres que valoremos tu caso y te ayudemos de forma personalizada?",
    description: "Cuéntanos tu situación en menos de un minuto y te guiamos hacia el plan 1:1 más adecuado.",
    tags: ["Valoración inicial", "Seguimiento real", "Plan hecho para ti"],
  },
  meals: {
    title: "Si con la nutrición te cuesta ser constante, podemos revisarlo contigo.",
    description: "Activa ayuda 1:1 y recibe una valoración para mejorar adherencia, organización y resultados.",
    tags: ["Nutrición", "Hábitos", "Seguimiento"],
  },
  workouts: {
    title: "¿Necesitas una estrategia de entreno más personalizada?",
    description: "Te ayudamos a adaptar el plan, mantener constancia y avanzar con seguimiento real.",
    tags: ["Entreno", "Constancia", "Revisión"],
  },
  measurements: {
    title: "Si tu progreso se ha frenado, podemos revisar tu caso contigo.",
    description: "Solicita una valoración 1:1 y detectamos qué ajustar para volver a avanzar.",
    tags: ["Progreso", "Análisis", "Ajustes"],
  },
  "coaching-page": {
    title: "Descubre qué plan 1:1 encaja contigo y da el siguiente paso.",
    description: "Elige el servicio más adecuado, envíanos tu caso y pasa a la llamada de valoración sin salir de la app.",
    tags: ["Evaluación", "Contacto directo", "Llamada"],
  },
  dashboard: {
    title: "¿Quieres que valoremos tu caso y te ayudemos de forma personalizada?",
    description: "Descubre qué plan 1:1 encaja contigo y envíanos tu situación en menos de un minuto.",
    tags: ["Valoración inicial", "Seguimiento real", "Plan hecho para ti"],
  },
}

interface CoachingCTAProps {
  fullPage?: boolean
  placement?: string
  cooldownHours?: number
}

export function CoachingCTA({ fullPage = false, placement = "dashboard", cooldownHours = 48 }: CoachingCTAProps) {
  const { getAuthHeaders, user } = useAuth()
  const [open, setOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [plans, setPlans] = useState<CoachingPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>("")
  const [result, setResult] = useState<InquiryResponse | null>(null)
  const [existingInquiry, setExistingInquiry] = useState<InquiryResponse | null>(null)
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    goal: "",
    current_challenge: "",
    availability: "",
    preferred_contact: "both",
  })
  const storageKey = placement === "coaching-page"
    ? "coaching-cta-hidden-until:coaching-page"
    : "coaching-cta-hidden-until:global"

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      full_name: prev.full_name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim(),
      email: prev.email || user?.email || "",
      phone_number: prev.phone_number || ((user as any)?.phone_number ?? ""),
    }))
  }, [user])

  useEffect(() => {
    if (fullPage || typeof window === "undefined") {
      setIsVisible(true)
      return
    }

    const hiddenUntil = window.localStorage.getItem(storageKey)
    if (hiddenUntil && Number(hiddenUntil) > Date.now()) {
      setIsVisible(false)
      return
    }

    window.localStorage.removeItem(storageKey)
    setIsVisible(true)
  }, [fullPage, storageKey])

  useEffect(() => {
    const loadPlansAndHistory = async () => {
      try {
        setLoading(true)
        const headers = await getAuthHeaders()

        const [plansResponse, historyResponse] = await Promise.all([
          fetch(buildApiUrl("coaching/plans/"), { headers }),
          fetch(buildApiUrl("coaching/inquiries/mine/"), { headers }),
        ])

        if (!plansResponse.ok) throw new Error("No se pudieron cargar los planes")

        const plansData = await plansResponse.json()
        setPlans(plansData)
        if (plansData.length > 0) {
          setSelectedPlanId((current) => current || plansData[0].id)
        }

        if (historyResponse.ok) {
          const historyData = await historyResponse.json()
          const latestInquiry = Array.isArray(historyData) ? historyData[0] : null
          setExistingInquiry(latestInquiry || null)
          if (latestInquiry?.plan?.id) {
            setSelectedPlanId((current) => current || latestInquiry.plan.id)
          }
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo cargar la ayuda personalizada ahora mismo.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadPlansAndHistory()
  }, [getAuthHeaders])

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) || plans[0],
    [plans, selectedPlanId]
  )

  const placementContent = useMemo(
    () => PLACEMENT_COPY[placement] || PLACEMENT_COPY.dashboard,
    [placement]
  )

  const resetDialog = () => {
    setOpen(false)
    setResult(null)
  }

  const snoozeCTA = () => {
    if (fullPage || typeof window === "undefined") return

    const nextVisibleAt = Date.now() + cooldownHours * 60 * 60 * 1000
    window.localStorage.setItem(storageKey, String(nextVisibleAt))
    setIsVisible(false)
    toast({
      title: "Perfecto",
      description: "Ocultamos esta ayuda temporalmente para no saturarte.",
    })
  }

  const handleSubmit = async () => {
    if (!form.goal.trim()) {
      toast({
        title: "Objetivo requerido",
        description: "Cuéntanos al menos cuál es tu objetivo principal.",
        variant: "destructive",
      })
      return
    }

    if (form.preferred_contact === "email" && !form.email.trim()) {
      toast({
        title: "Email requerido",
        description: "Añade tu email para que podamos responderte por ese canal.",
        variant: "destructive",
      })
      return
    }

    if (form.preferred_contact === "whatsapp" && !form.phone_number.trim()) {
      toast({
        title: "WhatsApp requerido",
        description: "Añade tu teléfono para que podamos contactarte por WhatsApp.",
        variant: "destructive",
      })
      return
    }

    if (form.preferred_contact === "both" && !form.email.trim() && !form.phone_number.trim()) {
      toast({
        title: "Datos de contacto requeridos",
        description: "Añade al menos un email o un teléfono para poder responderte.",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl("coaching/inquiries/"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...form,
          plan_id: selectedPlan?.id || null,
          source_screen: SOURCE_SCREEN_MAP[placement] || "other",
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || data.error || "No se pudo enviar la solicitud")
      }

      setResult(data)
      setExistingInquiry(data)
      toast({
        title: "✅ Solicitud enviada",
        description: "Ya puedes abrir WhatsApp, email o ir directamente al paso de agendar llamada.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar tu solicitud",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const Wrapper = fullPage ? "div" : Card
  const wrapperProps = fullPage ? { className: "space-y-6" } : { className: "border-0 shadow-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 text-white overflow-hidden" }

  if (!fullPage && !isVisible) {
    return null
  }

  return (
    <>
      <Wrapper {...wrapperProps}>
        <CardContent className={fullPage ? "p-0" : "p-6 md:p-8"}>
          <div className={fullPage ? "rounded-3xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 p-6 md:p-8 text-white shadow-xl" : ""}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-3 max-w-2xl">
                <Badge className="bg-white/15 text-white border-border hover:bg-white/15">
                  <Sparkles className="mr-1 h-3.5 w-3.5" /> Servicio personalizado 1:1
                </Badge>
                <h3 className="text-2xl md:text-3xl font-bold leading-tight">
                  {placementContent.title}
                </h3>
                <p className="text-sm md:text-base text-white/90">
                  {placementContent.description}
                </p>
                <div className="flex flex-wrap gap-2 text-xs md:text-sm">
                  {placementContent.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-white/15 px-3 py-1">{tag}</span>
                  ))}
                </div>
                {existingInquiry && !result && (
                  <div className="rounded-2xl border border-border bg-white/10 p-3 text-sm text-white/95">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">Tu solicitud sigue activa</span>
                      <Badge className="border-border bg-white/15 text-white hover:bg-white/15">
                        {STATUS_LABELS[existingInquiry.status || "pending"] || existingInquiry.status || "Pendiente"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-white/85">
                      Puedes retomar el contacto o ir directamente a la llamada de valoración sin volver a empezar.
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <Button
                  size="lg"
                  onClick={() => setOpen(true)}
                  className="bg-white text-violet-700 hover:bg-violet-50 font-semibold shadow-lg"
                >
                  {existingInquiry ? "Retomar mi solicitud" : "Quiero que valoréis mi caso"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                {!fullPage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={snoozeCTA}
                    className="text-white/90 hover:bg-white/10 hover:text-white"
                  >
                    Recordármelo más tarde
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Wrapper>

      <Dialog open={open} onOpenChange={(next) => (!next ? resetDialog() : setOpen(next))}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" /> Ayuda personalizada 1:1
            </DialogTitle>
            <DialogDescription>
              Elige el plan que mejor encaje contigo y cuéntanos tu punto de partida para que podamos valorar tu caso con rapidez.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
          ) : result ? (
            <div className="space-y-4 py-4">
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-2 text-green-700 font-semibold">
                  <CheckCircle2 className="h-5 w-5" /> Solicitud registrada correctamente
                </div>
                <p className="mt-2 text-sm text-green-800">
                  Ya tienes preparado el mensaje para avisarnos de que quieres que evaluemos tu caso y puedes pasar al siguiente paso: agendar la llamada.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => window.open(result.whatsapp_url, "_blank")}
                >
                  <MessageCircle className="mr-2 h-4 w-4" /> Abrir WhatsApp
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(result.mailto_url, "_blank")}
                >
                  <Mail className="mr-2 h-4 w-4" /> Abrir email
                </Button>
                {result.booking_url && (
                  <Button
                    className="bg-violet-600 hover:bg-violet-700"
                    onClick={() => window.open(result.booking_url, "_blank")}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" /> Agendar llamada
                  </Button>
                )}
              </div>
              <div className="rounded-2xl border bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Próximos pasos recomendados</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-700">
                  <li>1. Abre WhatsApp o email para avisarnos de que quieres la valoración.</li>
                  <li>2. Reserva la llamada si ya quieres dejar el hueco cerrado.</li>
                  <li>3. El equipo retoma contigo el seguimiento según el canal que has elegido.</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-6 py-2">
              {existingInquiry && (
                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 space-y-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-violet-900">Ya tienes una solicitud abierta</p>
                      <p className="text-sm text-violet-700">
                        Estado actual: {STATUS_LABELS[existingInquiry.status || "pending"] || existingInquiry.status || "Pendiente"}
                        {existingInquiry.days_waiting ? ` · ${existingInquiry.days_waiting} días en seguimiento` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {existingInquiry.whatsapp_url && (
                        <Button type="button" size="sm" variant="outline" onClick={() => window.open(existingInquiry.whatsapp_url, "_blank")}>
                          <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
                        </Button>
                      )}
                      {existingInquiry.booking_url && (
                        <Button type="button" size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => window.open(existingInquiry.booking_url, "_blank")}>
                          <CalendarDays className="mr-1 h-4 w-4" /> Agendar
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-violet-700">Si tu situación ha cambiado, puedes reenviar el formulario debajo con más contexto.</p>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {plans.map((plan) => {
                  const isSelected = selectedPlan?.id === plan.id
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`rounded-2xl border p-4 text-left transition-all ${isSelected ? "border-violet-500 bg-violet-50 shadow-md" : "border-slate-200 hover:border-violet-300"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900">{plan.name}</span>
                        <Badge variant={plan.tier === "vip" ? "default" : "secondary"}>{plan.tier.toUpperCase()}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{plan.duration_label}</p>
                      {plan.summary && <p className="mt-2 text-sm text-slate-700">{plan.summary}</p>}
                    </button>
                  )
                })}
              </div>

              {selectedPlan && (
                <div className="rounded-2xl border bg-slate-50 p-4">
                  <h4 className="font-semibold text-slate-900 mb-3">Qué incluye {selectedPlan.name}</h4>
                  <ul className="space-y-2 text-sm text-slate-700">
                    {selectedPlan.benefits.map((benefit, index) => (
                      <li key={`${selectedPlan.id}-${index}`} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={form.full_name} onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))} placeholder="Tu nombre" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="tu@email.com" />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp / Teléfono</Label>
                  <Input value={form.phone_number} onChange={(e) => setForm((prev) => ({ ...prev, phone_number: e.target.value }))} placeholder="+34..." />
                </div>
                <div className="space-y-2">
                  <Label>Contacto preferido</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "whatsapp", label: "WhatsApp" },
                      { value: "email", label: "Email" },
                      { value: "both", label: "Ambos" },
                    ].map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={form.preferred_contact === option.value ? "default" : "outline"}
                        onClick={() => setForm((prev) => ({ ...prev, preferred_contact: option.value }))}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>¿Cuál es tu objetivo principal?</Label>
                  <Textarea value={form.goal} onChange={(e) => setForm((prev) => ({ ...prev, goal: e.target.value }))} placeholder="Ej: perder grasa, ganar músculo, volver a ser constante..." />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>¿Qué es lo que más te está frenando ahora?</Label>
                  <Textarea value={form.current_challenge} onChange={(e) => setForm((prev) => ({ ...prev, current_challenge: e.target.value }))} placeholder="Hábitos, tiempo, adherencia, ansiedad con la comida, organización..." />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Disponibilidad para llamada</Label>
                  <Input value={form.availability} onChange={(e) => setForm((prev) => ({ ...prev, availability: e.target.value }))} placeholder="Ej: tardes de lunes a jueves" />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={resetDialog}>Cerrar</Button>
            {!result && (
              <Button onClick={handleSubmit} disabled={submitting} className="bg-gradient-to-r from-violet-600 to-fuchsia-600">
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</> : selectedPlan?.cta_text || "Enviar"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
