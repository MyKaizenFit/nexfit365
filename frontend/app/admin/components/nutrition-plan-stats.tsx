'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, TrendingUp, Users, Calendar, BarChart3, Activity, Download } from 'lucide-react'
import { buildApiUrl, getAuthHeaders } from '@/lib/api'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, Legend, ResponsiveContainer } from 'recharts'

interface PlanStats {
  total_user_plans: number
  active_user_plans: number
  inactive_user_plans: number
  users_with_active_plans: number
  recent_plans_7_days: number
  recent_plans_30_days: number
  calories_stats?: {
    average: number
    min: number
    max: number
  }
  most_popular_plans?: Array<{ name: string; count: number }>
  creation_timeline?: {
    last_24_hours: number
    last_7_days: number
    last_30_days: number
    last_90_days: number
  }
  top_users_by_plans?: Array<{ email: string; name: string; plan_count: number }>
  plan_changes?: {
    total_changes: number
    changes_by_admins: number
    changes_by_users: number
    changes_last_30_days: number
    most_changed_plans: Array<{ plan_name: string; change_count: number }>
    change_reasons: Array<{ reason: string; reason_display: string; count: number }>
  }
  calorie_distribution?: {
    low: number
    moderate: number
    high: number
    very_high: number
  }
}

interface UsageStats {
  total_default_plans: number
  active_default_plans: number
  plan_usage: Array<{
    plan_id: string
    plan_name: string
    daily_calories: number
    target_audience?: string
    min_role_required?: string
    users_count: number
    is_default: boolean
  }>
}

export function NutritionPlanStats() {
  const [stats, setStats] = useState<PlanStats | null>(null)
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Colores para gráficos
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
  
  // Función para exportar a CSV
  const exportToCSV = () => {
    if (!stats || !usageStats) return
    
    let csv = 'Estadísticas de Planes Nutricionales\n\n'
    
    // Estadísticas básicas
    csv += '=== ESTADÍSTICAS BÁSICAS ===\n'
    csv += `Total de Planes,${stats.total_user_plans}\n`
    csv += `Planes Activos,${stats.active_user_plans}\n`
    csv += `Planes Inactivos,${stats.inactive_user_plans}\n`
    csv += `Usuarios con Planes Activos,${stats.users_with_active_plans}\n`
    csv += `Nuevos Planes (7 días),${stats.recent_plans_7_days}\n`
    csv += `Nuevos Planes (30 días),${stats.recent_plans_30_days}\n\n`
    
    // Calorías
    if (stats.calories_stats) {
      csv += '=== ESTADÍSTICAS DE CALORÍAS ===\n'
      csv += `Promedio,${stats.calories_stats.average}\n`
      csv += `Mínimo,${stats.calories_stats.min}\n`
      csv += `Máximo,${stats.calories_stats.max}\n\n`
    }
    
    // Planes más populares
    if (stats.most_popular_plans) {
      csv += '=== PLANES MÁS POPULARES ===\n'
      csv += 'Nombre,Usuarios\n'
      stats.most_popular_plans.forEach(plan => {
        csv += `${plan.name},${plan.count}\n`
      })
      csv += '\n'
    }
    
    // Uso de planes por defecto
    if (usageStats?.plan_usage) {
      csv += '=== USO DE PLANES POR DEFECTO ===\n'
      csv += 'Plan,Calorías,Usuarios,Audiencia,Rol\n'
      usageStats.plan_usage.forEach(plan => {
        csv += `${plan.plan_name},${plan.daily_calories},${plan.users_count},${plan.target_audience || 'N/A'},${plan.min_role_required || 'N/A'}\n`
      })
    }
    
    // Crear blob y descargar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `nutrition-plan-stats-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      const headers = await getAuthHeaders()
      
      // Cargar estadísticas de planes de usuarios
      const statsResponse = await fetch(buildApiUrl('admin/nutrition/user-plans/stats/'), {
        headers
      })
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }
      
      // Cargar estadísticas de uso de planes por defecto
      const usageResponse = await fetch(buildApiUrl('admin/nutrition/user-plans/usage_stats/'), {
        headers
      })
      
      if (usageResponse.ok) {
        const usageData = await usageResponse.json()
        setUsageStats(usageData)
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Botón de exportación */}
      <div className="flex justify-end">
        <Button onClick={exportToCSV} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar a CSV
        </Button>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Planes</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_user_plans || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.active_user_plans || 0} activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios con Planes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.users_with_active_plans || 0}</div>
            <p className="text-xs text-muted-foreground">
              Con planes activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Últimos 7 Días</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.recent_plans_7_days || 0}</div>
            <p className="text-xs text-muted-foreground">
              Nuevos planes creados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cambios Totales</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.plan_changes?.total_changes || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.plan_changes?.changes_last_30_days || 0} últimos 30 días
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas de calorías */}
      {stats?.calories_stats && (
        <Card>
          <CardHeader>
            <CardTitle>Estadísticas de Calorías</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Promedio</div>
                <div className="text-2xl font-bold">{Math.round(stats.calories_stats.average)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Mínimo</div>
                <div className="text-2xl font-bold">{stats.calories_stats.min}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Máximo</div>
                <div className="text-2xl font-bold">{stats.calories_stats.max}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Planes más populares - Gráfico */}
      {stats?.most_popular_plans && stats.most_popular_plans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Planes Más Populares</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                usuarios: { label: "Usuarios", color: "hsl(var(--chart-1))" }
              }}
              className="h-[300px]"
            >
              <BarChart data={stats.most_popular_plans.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 10 }}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-usuarios)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
            <div className="mt-4 space-y-2">
              {stats.most_popular_plans.map((plan, index) => (
                <div key={plan.name} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{index + 1}</Badge>
                    <span className="font-medium text-sm">{plan.name}</span>
                  </div>
                  <Badge>{plan.count} usuarios</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uso de planes por defecto - Gráfico */}
      {usageStats && usageStats.plan_usage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uso de Planes por Defecto</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                usuarios: { label: "Usuarios", color: "hsl(var(--chart-2))" }
              }}
              className="h-[300px] mb-4"
            >
              <BarChart 
                data={usageStats.plan_usage.slice(0, 10)}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                  dataKey="plan_name" 
                  type="category"
                  width={150}
                  tick={{ fontSize: 10 }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="users_count" fill="var(--color-usuarios)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
            <div className="space-y-3">
              {usageStats.plan_usage.map((plan) => (
                <div key={plan.plan_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{plan.plan_name}</span>
                      {plan.is_default && (
                        <Badge variant="default" className="text-xs">Por defecto</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {plan.daily_calories} kcal/día
                      {plan.target_audience && ` • ${plan.target_audience}`}
                      {plan.min_role_required && ` • Rol: ${plan.min_role_required}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{plan.users_count}</div>
                    <div className="text-xs text-muted-foreground">usuarios</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distribución de calorías - Gráfico Pie */}
      {stats?.calorie_distribution && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Rangos de Calorías</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                low: { label: "Bajas (<1800)", color: "#3b82f6" },
                moderate: { label: "Moderadas (1800-2499)", color: "#10b981" },
                high: { label: "Altas (2500-2999)", color: "#f59e0b" },
                very_high: { label: "Muy Altas (≥3000)", color: "#ef4444" }
              }}
              className="h-[300px]"
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={[
                    { name: 'Bajas (<1800)', value: stats.calorie_distribution.low },
                    { name: 'Moderadas (1800-2499)', value: stats.calorie_distribution.moderate },
                    { name: 'Altas (2500-2999)', value: stats.calorie_distribution.high },
                    { name: 'Muy Altas (≥3000)', value: stats.calorie_distribution.very_high }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    stats.calorie_distribution.low,
                    stats.calorie_distribution.moderate,
                    stats.calorie_distribution.high,
                    stats.calorie_distribution.very_high
                  ].map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span>Bajas (&lt;1800)</span>
                <Badge>{stats.calorie_distribution.low}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Moderadas (1800-2499)</span>
                <Badge>{stats.calorie_distribution.moderate}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Altas (2500-2999)</span>
                <Badge>{stats.calorie_distribution.high}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Muy Altas (≥3000)</span>
                <Badge>{stats.calorie_distribution.very_high}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Razones de cambio - Gráfico */}
      {stats?.plan_changes?.change_reasons && stats.plan_changes.change_reasons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Razones de Cambio de Planes</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                cambios: { label: "Cambios", color: "hsl(var(--chart-3))" }
              }}
              className="h-[250px] mb-4"
            >
              <BarChart data={stats.plan_changes.change_reasons}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="reason_display"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 10 }}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-cambios)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
            <div className="space-y-2">
              {stats.plan_changes.change_reasons.map((reason) => (
                <div key={reason.reason} className="flex items-center justify-between p-2 border rounded-lg">
                  <span>{reason.reason_display}</span>
                  <Badge>{reason.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Línea temporal de creación */}
      {stats?.creation_timeline && (
        <Card>
          <CardHeader>
            <CardTitle>Línea Temporal de Creación de Planes</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                planes: { label: "Planes Creados", color: "hsl(var(--chart-1))" }
              }}
              className="h-[300px]"
            >
              <LineChart 
                data={[
                  { periodo: '24 horas', planes: stats.creation_timeline.last_24_hours },
                  { periodo: '7 días', planes: stats.creation_timeline.last_7_days },
                  { periodo: '30 días', planes: stats.creation_timeline.last_30_days },
                  { periodo: '90 días', planes: stats.creation_timeline.last_90_days }
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="planes" 
                  stroke="var(--color-planes)" 
                  strokeWidth={2}
                  dot={{ r: 6 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

