"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAdminDashboard } from "@/hooks/use-admin-dashboard"
import { useAdminUsers } from "@/hooks/use-admin-users"
import { useAdminNotifications } from "@/hooks/use-admin-notifications"
import {
  Users,
  UserCheck,
  UserX,
  Dumbbell,
  Utensils,
  TrendingUp,
  Bell,
  Calendar,
  Loader2,
  AlertCircle,
  RefreshCw,
  Activity,
  BarChart3,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Image as ImageIcon,
  Scale,
  Download,
  Gauge
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMemo, useState } from "react"
import { toast } from "@/hooks/use-toast"

export function AdminDashboard() {
  const { stats: dashboardStats, recentActivity, loading: dashboardLoading, error: dashboardError, refetch: refetchDashboard } = useAdminDashboard()
  const { users, stats: userStats, loading: userLoading, refetch: refetchUsers } = useAdminUsers()
  const { stats: notificationStats, automationSummary, loading: notificationLoading, refetch: refetchNotifications, runAutomation } = useAdminNotifications()
  const [sendingTemplate, setSendingTemplate] = useState<string | null>(null)

  const loading = dashboardLoading || userLoading || notificationLoading
  const error = dashboardError

  const handleRefresh = async () => {
    await Promise.all([refetchDashboard(), refetchUsers(), refetchNotifications()])
  }

  // Calcular porcentajes y tendencias
  const statsWithTrends = useMemo(() => {
    if (!dashboardStats) return null

    const totalUsers = dashboardStats.users?.total || 0
    const activeUsers = dashboardStats.users?.active || 0
    const activePercentage = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0

    const totalWorkouts = dashboardStats.workouts?.total_programs || 0
    const activeWorkouts = dashboardStats.workouts?.active_programs || 0
    const activeWorkoutPercentage = totalWorkouts > 0 ? Math.round((activeWorkouts / totalWorkouts) * 100) : 0

    const totalNutrition = dashboardStats.nutrition?.total_plans || 0
    const activeNutrition = dashboardStats.nutrition?.active_plans || 0
    const activeNutritionPercentage = totalNutrition > 0 ? Math.round((activeNutrition / totalNutrition) * 100) : 0

    const totalNotifications = dashboardStats.notifications?.total || 0
    const unreadNotifications = dashboardStats.notifications?.unread || 0
    const unreadPercentage = totalNotifications > 0 ? Math.round((unreadNotifications / totalNotifications) * 100) : 0

    return {
      users: { ...dashboardStats.users, activePercentage },
      workouts: { ...dashboardStats.workouts, activeWorkoutPercentage },
      nutrition: { ...dashboardStats.nutrition, activeNutritionPercentage },
      notifications: { ...dashboardStats.notifications, unreadPercentage }
    }
  }, [dashboardStats])

  const analyticsSummary = useMemo(() => {
    if (!dashboardStats) return null

    const totalUsers = dashboardStats.users?.total || 0
    const activeUsers = dashboardStats.users?.active || 0
    const totalWorkoutLogs = dashboardStats.workouts?.total_logs || 0
    const totalMealLogs = dashboardStats.nutrition?.total_meal_logs || 0
    const totalWeightEntries = dashboardStats.progress?.total_weight_entries || 0
    const totalPhotos = dashboardStats.progress?.total_photos || 0
    const unreadNotifications = dashboardStats.notifications?.unread || 0
    const totalNotifications = dashboardStats.notifications?.total || 0
    const newUsersLast7Days = userStats?.new_users_last_7_days || 0

    const activeRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0
    const workoutLogsPerActiveUser = activeUsers > 0 ? Number((totalWorkoutLogs / activeUsers).toFixed(1)) : 0
    const mealLogsPerActiveUser = activeUsers > 0 ? Number((totalMealLogs / activeUsers).toFixed(1)) : 0
    const progressEntriesPerActiveUser = activeUsers > 0 ? Number(((totalWeightEntries + totalPhotos) / activeUsers).toFixed(1)) : 0
    const unreadRate = totalNotifications > 0 ? Math.round((unreadNotifications / totalNotifications) * 100) : 0

    const engagementScore = Math.max(0, Math.min(100, Math.round(
      (activeRate * 0.45) +
      Math.min(workoutLogsPerActiveUser * 8, 25) +
      Math.min(mealLogsPerActiveUser * 4, 20) +
      Math.min(progressEntriesPerActiveUser * 3, 10)
    )))

    let statusLabel = "Estable"
    let statusTone: "healthy" | "warning" | "critical" = "warning"

    if (engagementScore >= 75 && unreadRate <= 15) {
      statusLabel = "Muy saludable"
      statusTone = "healthy"
    } else if (engagementScore < 50 || unreadRate >= 35) {
      statusLabel = "Requiere atención"
      statusTone = "critical"
    }

    const recommendations: string[] = []
    if (activeRate < 60) recommendations.push("Subir reactivación de usuarios con campañas o CTAs en áreas de bajo uso.")
    if (workoutLogsPerActiveUser < 2 || mealLogsPerActiveUser < 2) recommendations.push("Empujar adherencia en entreno y nutrición para elevar la recurrencia semanal.")
    if (unreadRate >= 25) recommendations.push("Revisar la cola de notificaciones pendientes para evitar pérdida de seguimiento.")
    if (progressEntriesPerActiveUser < 1) recommendations.push("Incentivar registros de peso y fotos para mejorar el reporting de resultados.")
    if (recommendations.length === 0) recommendations.push("La operación está equilibrada; ahora conviene seguir profundizando en automatización y cohortes.")

    return {
      activeUsers,
      totalUsers,
      activeRate,
      workoutLogsPerActiveUser,
      mealLogsPerActiveUser,
      progressEntriesPerActiveUser,
      unreadRate,
      unreadNotifications,
      engagementScore,
      newUsersLast7Days,
      statusLabel,
      statusTone,
      recommendations,
    }
  }, [dashboardStats, userStats])

  const cohortSummary = useMemo(() => {
    if (!users || users.length === 0) return []

    const formatter = new Intl.DateTimeFormat("es-ES", { month: "short", year: "numeric" })
    const grouped = users.reduce((acc, user) => {
      const sourceDate = user.created_at || user.date_joined
      const parsedDate = sourceDate ? new Date(sourceDate) : null
      if (!parsedDate || Number.isNaN(parsedDate.getTime())) return acc

      const key = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}`
      if (!acc[key]) {
        acc[key] = {
          key,
          label: formatter.format(parsedDate),
          total: 0,
          active: 0,
          withLogin: 0,
        }
      }

      acc[key].total += 1
      if (user.is_active) acc[key].active += 1
      if (user.last_login) acc[key].withLogin += 1
      return acc
    }, {} as Record<string, { key: string; label: string; total: number; active: number; withLogin: number }>)

    return Object.values(grouped)
      .sort((a, b) => b.key.localeCompare(a.key))
      .slice(0, 4)
      .map((item) => ({
        ...item,
        activeRate: item.total > 0 ? Math.round((item.active / item.total) * 100) : 0,
        loginRate: item.total > 0 ? Math.round((item.withLogin / item.total) * 100) : 0,
      }))
  }, [users])

  const usersNeedingReview = useMemo(() => {
    if (!users || users.length === 0) return 0

    const now = Date.now()
    const fourteenDays = 1000 * 60 * 60 * 24 * 14
    return users.filter((user) => {
      if (!user.is_active) return false
      if (!user.last_login) return true
      const lastLogin = new Date(user.last_login).getTime()
      return Number.isFinite(lastLogin) && now - lastLogin > fourteenDays
    }).length
  }, [users])

  const weeklyBrief = useMemo(() => {
    if (!analyticsSummary) return ""

    const recentCohort = cohortSummary[0]
    const lines = [
      `Resumen semanal NexFit365`,
      `• Activación actual: ${analyticsSummary.activeRate}% de usuarios activos.`,
      `• Engagement operativo: ${analyticsSummary.engagementScore}/100.`,
      `• Usuarios que conviene revisar: ${usersNeedingReview}.`,
      `• Notificaciones pendientes: ${analyticsSummary.unreadNotifications}.`,
    ]

    if (recentCohort) {
      lines.push(`• Cohorte más reciente (${recentCohort.label}): ${recentCohort.activeRate}% activa.`)
    }

    lines.push(`• Siguiente foco: ${analyticsSummary.recommendations[0]}`)

    return lines.join("\n")
  }, [analyticsSummary, cohortSummary, usersNeedingReview])

  const handleSendTemplate = async (template: "review" | "reactivation" | "progress" | "weekly-report") => {
    const templateMap = {
      review: { success: "Recordatorio de revisión enviado." },
      reactivation: { success: "Campaña de reactivación enviada." },
      progress: { success: "Solicitud de check-in enviada." },
      "weekly-report": { success: "Reporte semanal interno enviado." },
    }

    try {
      setSendingTemplate(template)
      const selected = templateMap[template]
      const result = await runAutomation(template)
      toast({
        title: "✅ Acción enviada",
        description: `${selected.success} Alcance: ${result?.targeted_users ?? result?.notifications_created ?? 0} usuarios.`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo lanzar la automatización.",
        variant: "destructive",
      })
    } finally {
      setSendingTemplate(null)
    }
  }

  const displayedWeeklyBrief = automationSummary?.weekly_brief || weeklyBrief

  const handleCopyWeeklyBrief = async () => {
    if (!displayedWeeklyBrief) return

    try {
      await navigator.clipboard.writeText(displayedWeeklyBrief)
      toast({ title: "✅ Resumen copiado", description: "El informe semanal ya está listo para pegar o reenviar." })
    } catch {
      toast({ title: "Error", description: "No se pudo copiar el resumen semanal.", variant: "destructive" })
    }
  }

  const handleExportReport = () => {
    if (!dashboardStats || !analyticsSummary) return

    const payload = {
      generated_at: new Date().toISOString(),
      executive_summary: analyticsSummary,
      weekly_brief: displayedWeeklyBrief,
      cohort_summary: cohortSummary,
      dashboard_stats: dashboardStats,
      user_stats: userStats,
      notification_stats: notificationStats,
      recent_activity: recentActivity,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `admin-report-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4 md:p-8">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-6 md:p-8">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-semibold text-foreground mb-2">Error al cargar dashboard</p>
            <p className="text-sm text-muted-foreground text-center mb-4">{error}</p>
            <Button onClick={handleRefresh} className="w-full sm:w-auto">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-cyan-600 bg-clip-text text-transparent">
            Dashboard de Administrador
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Resumen general de la plataforma
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            onClick={handleExportReport}
            variant="secondary"
            size="sm"
            className="w-full sm:w-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar informe
          </Button>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Main Stats Grid - Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Users Stats */}
        <StatCard
          title="Total Usuarios"
          value={dashboardStats?.users?.total || 0}
          subtitle={`${statsWithTrends?.users?.activePercentage || 0}% activos`}
          icon={Users}
          iconColor="text-blue-600"
          bgGradient="from-blue-500/15 to-cyan-500/15"
          trend={statsWithTrends?.users?.activePercentage || 0}
        >
          <div className="mt-2 text-xs text-muted-foreground">
            {dashboardStats?.users?.active || 0} activos • {dashboardStats?.users?.admins || 0} admins
          </div>
        </StatCard>

        <StatCard
          title="Programas de Entrenamiento"
          value={dashboardStats?.workouts?.total_programs || 0}
          subtitle={`${statsWithTrends?.workouts?.activeWorkoutPercentage || 0}% activos`}
          icon={Dumbbell}
          iconColor="text-green-600"
          bgGradient="from-green-500/15 to-emerald-500/15"
          trend={statsWithTrends?.workouts?.activeWorkoutPercentage || 0}
        >
          <div className="mt-2 text-xs text-muted-foreground">
            {dashboardStats?.workouts?.active_programs || 0} activos • {dashboardStats?.workouts?.total_logs || 0} logs
          </div>
        </StatCard>

        <StatCard
          title="Planes de Nutrición"
          value={dashboardStats?.nutrition?.total_plans || 0}
          subtitle={`${statsWithTrends?.nutrition?.activeNutritionPercentage || 0}% activos`}
          icon={Utensils}
          iconColor="text-orange-600"
          bgGradient="from-orange-500/15 to-amber-500/15"
          trend={statsWithTrends?.nutrition?.activeNutritionPercentage || 0}
        >
          <div className="mt-2 text-xs text-muted-foreground">
            {dashboardStats?.nutrition?.active_plans || 0} activos • {dashboardStats?.nutrition?.total_meal_logs || 0} comidas
          </div>
        </StatCard>

        <StatCard
          title="Notificaciones"
          value={dashboardStats?.notifications?.total || 0}
          subtitle={`${statsWithTrends?.notifications?.unreadPercentage || 0}% sin leer`}
          icon={Bell}
          iconColor="text-purple-600"
          bgGradient="from-purple-500/15 to-violet-500/15"
          trend={statsWithTrends?.notifications?.unreadPercentage || 0}
        >
          <div className="mt-2 text-xs text-muted-foreground">
            {dashboardStats?.notifications?.unread || 0} sin leer
          </div>
        </StatCard>
      </div>

      {analyticsSummary && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
          <Card className="xl:col-span-2 border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg md:text-xl bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
                    KPIs Ejecutivos
                  </CardTitle>
                  <CardDescription className="mt-1">Lectura rápida de engagement, seguimiento y carga operativa</CardDescription>
                </div>
                <Gauge className="h-5 w-5 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <InsightMetric
                label="Activación de usuarios"
                value={`${analyticsSummary.activeRate}%`}
                helper={`${analyticsSummary.activeUsers} activos de ${analyticsSummary.totalUsers}`}
                progress={analyticsSummary.activeRate}
                tone={analyticsSummary.activeRate >= 70 ? "healthy" : analyticsSummary.activeRate >= 50 ? "warning" : "critical"}
              />
              <InsightMetric
                label="Engagement global"
                value={`${analyticsSummary.engagementScore}/100`}
                helper={`${analyticsSummary.newUsersLast7Days} altas nuevas en 7 días`}
                progress={analyticsSummary.engagementScore}
                tone={analyticsSummary.engagementScore >= 75 ? "healthy" : analyticsSummary.engagementScore >= 50 ? "warning" : "critical"}
              />
              <InsightMetric
                label="Adherencia entreno"
                value={analyticsSummary.workoutLogsPerActiveUser}
                helper="logs por usuario activo"
                progress={Math.min(100, Math.round(analyticsSummary.workoutLogsPerActiveUser * 20))}
                tone={analyticsSummary.workoutLogsPerActiveUser >= 3 ? "healthy" : analyticsSummary.workoutLogsPerActiveUser >= 1.5 ? "warning" : "critical"}
              />
              <InsightMetric
                label="Seguimiento nutrición"
                value={analyticsSummary.mealLogsPerActiveUser}
                helper="registros por usuario activo"
                progress={Math.min(100, Math.round(analyticsSummary.mealLogsPerActiveUser * 20))}
                tone={analyticsSummary.mealLogsPerActiveUser >= 3 ? "healthy" : analyticsSummary.mealLogsPerActiveUser >= 1.5 ? "warning" : "critical"}
              />
              <InsightMetric
                label="Tracking de progreso"
                value={analyticsSummary.progressEntriesPerActiveUser}
                helper="entradas de peso y fotos por activo"
                progress={Math.min(100, Math.round(analyticsSummary.progressEntriesPerActiveUser * 20))}
                tone={analyticsSummary.progressEntriesPerActiveUser >= 2 ? "healthy" : analyticsSummary.progressEntriesPerActiveUser >= 1 ? "warning" : "critical"}
              />
              <InsightMetric
                label="Atención pendiente"
                value={`${analyticsSummary.unreadRate}%`}
                helper={`${analyticsSummary.unreadNotifications} notificaciones sin leer`}
                progress={analyticsSummary.unreadRate}
                tone={analyticsSummary.unreadRate <= 15 ? "healthy" : analyticsSummary.unreadRate <= 30 ? "warning" : "critical"}
              />
            </CardContent>
          </Card>

          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg md:text-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                    Informe Ejecutivo
                  </CardTitle>
                  <CardDescription className="mt-1">Estado operacional y próximas acciones</CardDescription>
                </div>
                <Badge
                  variant="outline"
                        className={
                    analyticsSummary.statusTone === "healthy"
                      ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                      : analyticsSummary.statusTone === "warning"
                        ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                        : "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                  }
                >
                  {analyticsSummary.statusLabel}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Lectura actual</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  La plataforma combina activación, adherencia y seguimiento en un score operativo de {analyticsSummary.engagementScore}/100.
                </p>
              </div>

              <div className="space-y-2">
                {analyticsSummary.recommendations.map((item, index) => (
                  <div key={`${item}-${index}`} className="rounded-lg border bg-background p-3 text-sm text-muted-foreground">
                    • {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        <Card className="border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg md:text-xl bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">
                  Retención por Cohorte
                </CardTitle>
                <CardDescription className="mt-1">Actividad actual de los últimos grupos de alta</CardDescription>
              </div>
              <Users className="h-5 w-5 text-sky-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {cohortSummary.length > 0 ? cohortSummary.map((cohort) => (
              <div key={cohort.key} className="rounded-xl border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground capitalize">{cohort.label}</p>
                    <p className="text-xs text-muted-foreground">{cohort.total} altas · {cohort.active} activas</p>
                  </div>
                  <Badge variant="outline">{cohort.activeRate}% activa</Badge>
                </div>
                <div className="mt-3 space-y-2">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Retención</span>
                      <span>{cohort.activeRate}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.max(6, cohort.activeRate)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Con último login</span>
                      <span>{cohort.loginRate}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.max(6, cohort.loginRate)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aún no hay datos suficientes para cohortes.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg md:text-xl bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  Automatizaciones Rápidas
                </CardTitle>
                <CardDescription className="mt-1">Plantillas listas para reactivar y acompañar usuarios</CardDescription>
              </div>
              <Bell className="h-5 w-5 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Resumen semanal</p>
              <p className="mt-2 whitespace-pre-line text-sm text-foreground">{displayedWeeklyBrief}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button variant="outline" onClick={handleCopyWeeklyBrief}>
                <Download className="h-4 w-4 mr-2" />
                Copiar resumen
              </Button>
              <Button variant="outline" onClick={() => handleSendTemplate("weekly-report")} disabled={sendingTemplate !== null}>
                {sendingTemplate === "weekly-report" ? "Enviando..." : "Enviar reporte interno"}
              </Button>
              <Button variant="outline" onClick={() => handleSendTemplate("review")} disabled={sendingTemplate !== null}>
                {sendingTemplate === "review"
                  ? "Enviando..."
                  : `Recordatorio revisión${automationSummary ? ` · ${automationSummary.segments.review_candidates ?? 0}` : ""}`}
              </Button>
              <Button variant="outline" onClick={() => handleSendTemplate("reactivation")} disabled={sendingTemplate !== null}>
                {sendingTemplate === "reactivation"
                  ? "Enviando..."
                  : `Reactivar usuarios${automationSummary ? ` · ${automationSummary.segments.reactivation_candidates ?? 0}` : ""}`}
              </Button>
              <Button variant="outline" onClick={() => handleSendTemplate("progress")} disabled={sendingTemplate !== null} className="sm:col-span-2">
                {sendingTemplate === "progress"
                  ? "Enviando..."
                  : `Pedir check-in${automationSummary ? ` · ${automationSummary.segments.progress_candidates ?? 0}` : ""}`}
              </Button>
            </div>

            <div className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300 space-y-1">
              <p>Ahora mismo hay {automationSummary?.segments?.review_candidates ?? usersNeedingReview} usuarios para revisión prioritaria.</p>
              <p>{automationSummary?.segments?.reactivation_candidates ?? 0} necesitan reactivación y {automationSummary?.segments?.progress_candidates ?? 0} deberían subir check-in.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity and Stats Grid - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Recent Activity */}
        <Card className="border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg md:text-xl bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Actividad Reciente
                </CardTitle>
                <CardDescription className="mt-1">Últimas acciones en la plataforma</CardDescription>
              </div>
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="users" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="users" className="text-xs sm:text-sm">
                  <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Usuarios</span>
                </TabsTrigger>
                <TabsTrigger value="workouts" className="text-xs sm:text-sm">
                  <Dumbbell className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Entrenamientos</span>
                </TabsTrigger>
                <TabsTrigger value="meals" className="text-xs sm:text-sm">
                  <Utensils className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Comidas</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="space-y-3">
                {recentActivity?.recent_users && recentActivity.recent_users.length > 0 ? (
                  recentActivity.recent_users.slice(0, 5).map((user, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                          <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.email}</p>
                          <p className="text-xs text-muted-foreground">Nuevo usuario</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0 ml-2">
                        {user.joined ? formatDistanceToNow(new Date(user.joined), {
                          addSuffix: true,
                          locale: es
                        }) : 'N/A'}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No hay usuarios recientes</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="workouts" className="space-y-3">
                {recentActivity?.recent_workout_logs && recentActivity.recent_workout_logs.length > 0 ? (
                  recentActivity.recent_workout_logs.slice(0, 5).map((log, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
                          <Dumbbell className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{log.user_email}</p>
                          <p className="text-xs text-muted-foreground truncate">{log.program_name}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0 ml-2">
                        {log.date ? formatDistanceToNow(new Date(log.date), {
                          addSuffix: true,
                          locale: es
                        }) : 'N/A'}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No hay entrenamientos recientes</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="meals" className="space-y-3">
                {recentActivity?.recent_meal_logs && recentActivity.recent_meal_logs.length > 0 ? (
                  recentActivity.recent_meal_logs.slice(0, 5).map((log, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                          <Utensils className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{log.user_email}</p>
                          <p className="text-xs text-muted-foreground truncate">{log.meal_name}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0 ml-2">
                        {log.date ? formatDistanceToNow(new Date(log.date), {
                          addSuffix: true,
                          locale: es
                        }) : 'N/A'}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <Utensils className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No hay comidas recientes</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg md:text-xl bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                  Estadísticas Rápidas
                </CardTitle>
                <CardDescription className="mt-1">Métricas clave de la plataforma</CardDescription>
              </div>
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <QuickStatCard
                icon={Dumbbell}
                value={dashboardStats?.workouts?.total_logs || 0}
                label="Logs de Entrenamiento"
                color="blue"
              />
              <QuickStatCard
                icon={Utensils}
                value={dashboardStats?.nutrition?.total_meal_logs || 0}
                label="Logs de Comidas"
                color="green"
              />
              <QuickStatCard
                icon={ImageIcon}
                value={dashboardStats?.progress?.total_photos || 0}
                label="Fotos de Progreso"
                color="orange"
              />
              <QuickStatCard
                icon={Scale}
                value={dashboardStats?.progress?.total_weight_entries || 0}
                label="Registros de Peso"
                color="purple"
              />
            </div>

            <div className="pt-4 border-t space-y-4">
              {/* User Role Distribution */}
              {userStats?.users_by_role && userStats.users_by_role.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    Distribución por Rol
                  </h4>
                  <div className="space-y-2">
                    {userStats.users_by_role.map((role: { role: string; count: number }, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <span className="text-sm capitalize text-foreground">{role.role}</span>
                        <Badge variant="secondary">{role.count} usuarios</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notification Types */}
              {notificationStats?.notifications_by_type && notificationStats.notifications_by_type.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <Bell className="h-4 w-4 text-purple-600" />
                    Tipos de Notificaciones
                  </h4>
                  <div className="space-y-2">
                    {notificationStats.notifications_by_type.map((type: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <span className="text-sm capitalize text-foreground">{type.type}</span>
                        <Badge variant="secondary">{type.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: number
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  bgGradient: string
  trend?: number
  children?: React.ReactNode
}

function StatCard({ title, value, subtitle, icon: Icon, iconColor, bgGradient, trend, children }: StatCardProps) {
  return (
    <Card className="border shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${bgGradient} flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl md:text-3xl font-bold text-foreground mb-1">
          {value.toLocaleString()}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{subtitle}</span>
          {trend !== undefined && (
            <Badge
              variant={trend >= 50 ? "default" : "secondary"}
              className="text-xs px-1.5 py-0"
            >
              {trend >= 50 ? (
                <ArrowUpRight className="h-3 w-3 mr-0.5" />
              ) : (
                <ArrowDownRight className="h-3 w-3 mr-0.5" />
              )}
              {trend}%
            </Badge>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

interface InsightMetricProps {
  label: string
  value: string | number
  helper: string
  progress: number
  tone: "healthy" | "warning" | "critical"
}

function InsightMetric({ label, value, helper, progress, tone }: InsightMetricProps) {
  const toneClasses = {
    healthy: "bg-emerald-500",
    warning: "bg-amber-500",
    critical: "bg-rose-500",
  }

  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground mt-1">{helper}</p>
        </div>
        <span className="text-lg font-bold text-foreground">{value}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${toneClasses[tone]}`} style={{ width: `${Math.max(6, Math.min(progress, 100))}%` }} />
      </div>
    </div>
  )
}

interface QuickStatCardProps {
  icon: React.ComponentType<{ className?: string }>
  value: number
  label: string
  color: "blue" | "green" | "orange" | "purple"
}

function QuickStatCard({ icon: Icon, value, label, color }: QuickStatCardProps) {
  const colorClasses = {
    blue: "from-blue-500/15 to-cyan-500/15 text-blue-600 dark:text-blue-400",
    green: "from-green-500/15 to-emerald-500/15 text-green-600 dark:text-green-400",
    orange: "from-orange-500/15 to-amber-500/15 text-orange-600 dark:text-orange-400",
    purple: "from-purple-500/15 to-violet-500/15 text-purple-600 dark:text-purple-400",
  }

  return (
    <div className={`p-3 md:p-4 rounded-lg bg-gradient-to-br ${colorClasses[color]} transition-transform hover:scale-105`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`h-5 w-5 ${colorClasses[color].split(' ')[2]}`} />
      </div>
      <div className="text-xl md:text-2xl font-bold text-foreground mb-1">
        {value.toLocaleString()}
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
