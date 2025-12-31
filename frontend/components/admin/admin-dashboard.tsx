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
  Scale
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMemo } from "react"

export function AdminDashboard() {
  const { stats: dashboardStats, recentActivity, loading: dashboardLoading, error: dashboardError, refetch: refetchDashboard } = useAdminDashboard()
  const { stats: userStats, loading: userLoading, refetch: refetchUsers } = useAdminUsers()
  const { stats: notificationStats, loading: notificationLoading, refetch: refetchNotifications } = useAdminNotifications()

  const loading = dashboardLoading || userLoading || notificationLoading
  const error = dashboardError

  const handleRefresh = () => {
    refetchDashboard()
    refetchUsers()
    refetchNotifications()
  }

  // Calcular porcentajes y tendencias
  const statsWithTrends = useMemo(() => {
    if (!dashboardStats) return null

    // Usuarios: calcular porcentaje de activos sobre el total
    const totalUsers = dashboardStats.users?.total || 0
    const activeUsers = dashboardStats.users?.active || 0
    const activePercentage = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0

    // Programas de entrenamiento: calcular porcentaje de activos sobre el total (activos + inactivos)
    const totalWorkouts = dashboardStats.workouts?.total_programs || 0
    const activeWorkouts = dashboardStats.workouts?.active_programs || 0
    const activeWorkoutPercentage = totalWorkouts > 0 ? Math.round((activeWorkouts / totalWorkouts) * 100) : 0

    // Planes de nutrición: calcular porcentaje de activos sobre el total (activos + inactivos)
    const totalNutrition = dashboardStats.nutrition?.total_plans || 0
    const activeNutrition = dashboardStats.nutrition?.active_plans || 0
    const activeNutritionPercentage = totalNutrition > 0 ? Math.round((activeNutrition / totalNutrition) * 100) : 0

    // Notificaciones: calcular porcentaje de sin leer sobre el total
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

      {/* Main Stats Grid - Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Users Stats */}
        <StatCard
          title="Total Usuarios"
          value={dashboardStats?.users?.total || 0}
          subtitle={`${statsWithTrends?.users?.activePercentage || 0}% activos`}
          icon={Users}
          iconColor="text-blue-600"
          bgGradient="from-blue-50 to-cyan-50"
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
          bgGradient="from-green-50 to-emerald-50"
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
          bgGradient="from-orange-50 to-amber-50"
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
          bgGradient="from-purple-50 to-violet-50"
          trend={statsWithTrends?.notifications?.unreadPercentage || 0}
        >
          <div className="mt-2 text-xs text-muted-foreground">
            {dashboardStats?.notifications?.unread || 0} sin leer
          </div>
        </StatCard>
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
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <UserCheck className="h-4 w-4 text-blue-600" />
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
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <Dumbbell className="h-4 w-4 text-green-600" />
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
                        <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <Utensils className="h-4 w-4 text-orange-600" />
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

interface QuickStatCardProps {
  icon: React.ComponentType<{ className?: string }>
  value: number
  label: string
  color: "blue" | "green" | "orange" | "purple"
}

function QuickStatCard({ icon: Icon, value, label, color }: QuickStatCardProps) {
  const colorClasses = {
    blue: "from-blue-50 to-cyan-50 text-blue-600",
    green: "from-green-50 to-emerald-50 text-green-600",
    orange: "from-orange-50 to-amber-50 text-orange-600",
    purple: "from-purple-50 to-violet-50 text-purple-600",
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
