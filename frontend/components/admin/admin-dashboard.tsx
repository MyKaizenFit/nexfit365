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
  RefreshCw
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p className="mt-4 text-lg font-semibold text-gray-700">Error al cargar dashboard</p>
            <p className="text-sm text-gray-500 mt-2">{error}</p>
            <Button onClick={handleRefresh} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
            Dashboard de Administrador
          </h2>
          <p className="text-gray-600">Resumen general de la plataforma</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Users Stats */}
        <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {dashboardStats?.users?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats?.users?.active || 0} activos
            </p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Programas de Entrenamiento</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dashboardStats?.workouts?.total_programs || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats?.workouts?.active_programs || 0} activos
            </p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planes de Nutrición</CardTitle>
            <Utensils className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {dashboardStats?.nutrition?.total_plans || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats?.nutrition?.active_plans || 0} activos
            </p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notificaciones</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {dashboardStats?.notifications?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats?.notifications?.unread || 0} sin leer
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity and Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Actividad Reciente
            </CardTitle>
            <CardDescription>Últimas acciones en la plataforma</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recent Users */}
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center">
                <UserCheck className="h-4 w-4 mr-2 text-green-600" />
                Nuevos Usuarios
              </h4>
              <div className="space-y-2">
                {recentActivity?.recent_users?.slice(0, 3).map((user, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{user.email}</span>
                    <Badge variant="outline" className="text-xs">
                      {user.joined ? formatDistanceToNow(new Date(user.joined), { 
                        addSuffix: true, 
                        locale: es 
                      }) : 'Fecha no disponible'}
                    </Badge>
                  </div>
                )) || (
                  <p className="text-sm text-gray-500">No hay usuarios recientes</p>
                )}
              </div>
            </div>

            {/* Recent Workout Logs */}
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center">
                <Dumbbell className="h-4 w-4 mr-2 text-blue-600" />
                Entrenamientos Recientes
              </h4>
              <div className="space-y-2">
                {recentActivity?.recent_workout_logs?.slice(0, 3).map((log, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-gray-700">{log.user_email}</span>
                      <p className="text-xs text-gray-500">{log.program_name}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {log.date ? formatDistanceToNow(new Date(log.date), { 
                        addSuffix: true, 
                        locale: es 
                      }) : 'Fecha no disponible'}
                    </Badge>
                  </div>
                )) || (
                  <p className="text-sm text-gray-500">No hay entrenamientos recientes</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
              Estadísticas Rápidas
            </CardTitle>
            <CardDescription>Métricas clave de la plataforma</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {dashboardStats?.workouts?.total_logs || 0}
                </div>
                <p className="text-xs text-gray-600">Logs de Entrenamiento</p>
              </div>
              <div className="text-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {dashboardStats?.nutrition?.total_meal_logs || 0}
                </div>
                <p className="text-xs text-gray-600">Logs de Comidas</p>
              </div>
              <div className="text-center p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {dashboardStats?.progress?.total_photos || 0}
                </div>
                <p className="text-xs text-gray-600">Fotos de Progreso</p>
              </div>
              <div className="text-center p-3 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {dashboardStats?.progress?.total_weight_entries || 0}
                </div>
                <p className="text-xs text-gray-600">Registros de Peso</p>
              </div>
            </div>

            {/* User Role Distribution */}
            {userStats?.users_by_role && (
              <div>
                <h4 className="font-medium text-sm mb-2">Distribución por Rol</h4>
                <div className="space-y-2">
                  {userStats.users_by_role.map((role: { role: string; count: number }, index: number) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-gray-700">{role.role}</span>
                      <Badge variant="outline">{role.count} usuarios</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notification Types */}
            {notificationStats?.notifications_by_type && (
              <div>
                <h4 className="font-medium text-sm mb-2">Tipos de Notificaciones</h4>
                <div className="space-y-2">
                  {notificationStats.notifications_by_type.map((type, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-gray-700">{type.type}</span>
                      <Badge variant="outline">{type.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}