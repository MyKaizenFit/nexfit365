"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buildApiUrl } from "@/lib/api"
import { Loader2, Sparkles, Crown, CalendarDays } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"

interface MembershipStatus {
    status: "none" | "trial" | "active" | "expired" | "cancelled"
    plan: string
    role: string
    is_active: boolean
    trial_used: boolean
    can_start_trial: boolean
    days_remaining: number
    trial_started_at?: string | null
    ends_at?: string | null
}

const statusStyles: Record<string, string> = {
    none: "bg-slate-100 text-slate-800",
    trial: "bg-emerald-100 text-emerald-800",
    active: "bg-blue-100 text-blue-800",
    expired: "bg-amber-100 text-amber-800",
    cancelled: "bg-rose-100 text-rose-800",
}

const statusLabels: Record<string, string> = {
    none: "Sin membresía",
    trial: "Prueba activa",
    active: "Suscripción activa",
    expired: "Prueba expirada",
    cancelled: "Suscripción cancelada",
}

export function SubscriptionStatusCard() {
    const { getAuthHeaders } = useAuth()
    const [status, setStatus] = useState<MembershipStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [activating, setActivating] = useState(false)

    const loadStatus = async () => {
        try {
            setLoading(true)
            const headers = await getAuthHeaders()
            const response = await fetch(buildApiUrl("subscription-status/"), { headers })

            if (!response.ok) {
                throw new Error("No se pudo cargar el estado de la membresía")
            }

            const data = await response.json()
            setStatus(data)
        } catch (error) {
            toast({
                title: "⚠️ Membresía",
                description: error instanceof Error ? error.message : "No se pudo comprobar tu estado",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadStatus()
    }, [])

    const handleStartTrial = async () => {
        try {
            setActivating(true)
            const headers = await getAuthHeaders()
            const response = await fetch(buildApiUrl("start-free-trial/"), {
                method: "POST",
                headers,
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data?.detail || "No se pudo activar la prueba")
            }

            toast({
                title: "🎉 Prueba activada",
                description: "Ya tienes 7 días gratis activos para explorar la experiencia premium.",
            })

            setStatus({
                ...(status || {}),
                ...data,
                is_active: true,
                can_start_trial: false,
                trial_used: true,
            })
        } catch (error) {
            toast({
                title: "❌ Error",
                description: error instanceof Error ? error.message : "No se pudo activar la prueba gratuita",
                variant: "destructive",
            })
        } finally {
            setActivating(false)
        }
    }

    return (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 via-white to-cyan-50">
            <CardHeader>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Crown className="h-5 w-5 text-emerald-600" />
                            Prueba gratuita y acceso premium
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Activa tus 7 días gratis o revisa el estado de tu membresía actual.
                        </p>
                    </div>
                    <Badge className={status ? statusStyles[status.status] || statusStyles.none : statusStyles.none}>
                        {status ? statusLabels[status.status] || "Sin membresía" : "Cargando"}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Comprobando tu acceso...
                    </div>
                ) : (
                    <>
                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border bg-white/80 p-3">
                                <p className="text-xs text-muted-foreground">Plan mensual</p>
                                <p className="text-lg font-semibold">24,9€/mes</p>
                            </div>
                            <div className="rounded-xl border bg-white/80 p-3">
                                <p className="text-xs text-muted-foreground">Plan anual</p>
                                <p className="text-lg font-semibold">197€/año</p>
                            </div>
                        </div>

                        {status?.status === "trial" ? (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                                <div className="flex items-center gap-2 font-medium">
                                    <CalendarDays className="h-4 w-4" />
                                    Te quedan {status.days_remaining} día(s) de prueba.
                                </div>
                                <p className="mt-1 text-emerald-800">
                                    Aprovecha estos días para usar el seguimiento, la revisión quincenal y la ayuda personalizada.
                                </p>
                            </div>
                        ) : status?.status === "expired" ? (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                Tu prueba ya terminó. Puedes pasar a plan mensual o anual para mantener el acceso premium.
                            </div>
                        ) : (
                            <div className="rounded-xl border bg-white/80 p-3 text-sm text-slate-700">
                                Incluye seguimiento del progreso, comunicación más cercana y una experiencia premium dentro de la app.
                            </div>
                        )}

                        {status?.can_start_trial && (
                            <Button onClick={handleStartTrial} disabled={activating} className="w-full bg-emerald-600 hover:bg-emerald-700">
                                {activating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Activando prueba...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Activar 7 días gratis
                                    </>
                                )}
                            </Button>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    )
}
