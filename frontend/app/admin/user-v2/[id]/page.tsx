"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  User,
  Calendar,
  Activity,
  ChefHat,
  Dumbbell,
  Camera,
  Edit,
  Save,
  X,
  TrendingUp,
  Target,
  Ruler,
  Weight,
  Phone,
  Mail,
  AlertCircle,
  Heart,
  Loader2,
  Bell,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { buildApiUrl } from "@/lib/api"
// Importar componente de edición de entrenamiento
import { WorkoutProgramEditor } from "../../components/workout-program-editor"
// Importar componente de edición de nutrición
import { NutritionPlanEditor } from "../../components/nutrition-plan-editor"
// Importar componentes de progreso e historial
import { UserProgressPanel } from "../../components/user-progress-panel"
import { UserProgressOverview } from "../../components/user-progress-overview"
import { WorkoutHistoryEnhanced } from "@/components/dashboard/workout-history-enhanced"
import { useAdminUserWorkouts } from "@/hooks/use-admin-user-workouts"
import { UserNotifications } from "../../components/user-notifications"

// ============================================================================
// TIPOS
// ============================================================================
interface UserData {
  id: number | string
  email: string
  first_name: string
  last_name: string
  phone_number?: string
  birth_date?: string
  age?: number
  gender?: string
  gender_display?: string
  height?: number
  weight?: number
  target_weight?: number
  bmi?: number
  role?: string
  role_display?: string
  is_active?: boolean
  main_goal?: string
  main_goal_display?: string
  activity_level?: string
  activity_level_display?: string
  training_location?: string
  training_location_display?: string
  training_days_per_week?: number
  training_days?: number[]
  equipment_available?: string[]
  dietary_restrictions?: string[]
  allergies?: string[]
  disliked_foods?: string
  medical_conditions?: string[]
  injuries_or_medical_issues?: string
  daily_streak?: number
  longest_streak?: number
  created_at_formatted?: string
  last_login_formatted?: string
  premium_alerts?: PremiumAlerts | null
  admin_calories_override?: number | null
  calculated_daily_calories?: number | null
}

interface PremiumAlerts {
  enabled: boolean
  unread_notifications: number
  recent_profile_changes: number
  recent_workout_feedback: number
  latest_workout_feedback: {
    date: string
    rating: number | null
    message: string | null
  } | null
  pending_total: number
  has_pending: boolean
}

// ============================================================================
// HELPERS - Funciones de utilidad seguras
// ============================================================================
function safeArray<T>(val: unknown): T[] {
  if (Array.isArray(val)) return val as T[]
  return []
}

function safeString(val: unknown, fallback = ""): string {
  if (typeof val === "string") return val
  if (typeof val === "number") return String(val)
  return fallback
}

function safeNumber(val: unknown, fallback = 0): number {
  if (typeof val === "number" && !isNaN(val)) return val
  if (typeof val === "string") {
    const parsed = parseFloat(val)
    if (!isNaN(parsed)) return parsed
  }
  return fallback
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function UserDetailPageV2({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { getAuthHeaders, isAuthenticated } = useAuth()

  // Estado para el userId resuelto
  const [userId, setUserId] = useState<string | null>(null)

  // Estado del usuario
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estado de edición
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [localData, setLocalData] = useState<Partial<UserData>>({})
  const [activeTab, setActiveTab] = useState("progress")
  const [alertExpanded, setAlertExpanded] = useState(false)

  // Estado para override de calorías admin
  const [caloriesOverrideInput, setCaloriesOverrideInput] = useState<string>("")
  const [savingCalories, setSavingCalories] = useState(false)

  // Hooks para datos adicionales
  const workouts = useAdminUserWorkouts(userId || "")

  // Debug: Log de datos de workouts
  useEffect(() => {
    if (userId) {
      // removed stray object literal
    }
  }, [userId, workouts.loading, workouts.error, workouts.logs, workouts.totals])

  // Resolver params (Next.js 15+ async params)
  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolved = await params
        if (resolved?.id) {
          setUserId(resolved.id)
        }
      } catch (err) {
        setError("Error al cargar la página")
      }
    }
    resolveParams()
  }, [params])

  // Función para cargar usuario
  const fetchUser = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)

      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`admin/users/${userId}/`), { headers })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Usuario no encontrado")
        }
        throw new Error(`Error ${response.status}`)
      }

      const data = await response.json()

      // Normalizar datos para evitar errores de tipo
      const normalized: UserData = {
        id: data.id,
        email: safeString(data.email),
        first_name: safeString(data.first_name),
        last_name: safeString(data.last_name),
        phone_number: safeString(data.phone_number),
        birth_date: safeString(data.birth_date),
        age: safeNumber(data.age),
        gender: safeString(data.gender),
        gender_display: safeString(data.gender_display),
        height: data.height ? safeNumber(data.height) : undefined,
        weight: data.weight ? safeNumber(data.weight) : undefined,
        target_weight: data.target_weight ? safeNumber(data.target_weight) : undefined,
        bmi: data.bmi ? safeNumber(data.bmi) : undefined,
        role: safeString(data.role),
        role_display: safeString(data.role_display),
        is_active: Boolean(data.is_active),
        main_goal: safeString(data.main_goal),
        main_goal_display: safeString(data.main_goal_display),
        activity_level: safeString(data.activity_level),
        activity_level_display: safeString(data.activity_level_display),
        training_location: safeString(data.training_location),
        training_location_display: safeString(data.training_location_display),
        training_days_per_week: data.training_days_per_week ? safeNumber(data.training_days_per_week) : undefined,
        training_days: safeArray<number>(data.training_days),
        equipment_available: safeArray<string>(data.equipment_available),
        dietary_restrictions: safeArray<string>(data.dietary_restrictions),
        allergies: safeArray<string>(data.allergies),
        disliked_foods: safeString(data.disliked_foods),
        medical_conditions: safeArray<string>(data.medical_conditions),
        injuries_or_medical_issues: safeString(data.injuries_or_medical_issues),
        daily_streak: safeNumber(data.daily_streak),
        longest_streak: safeNumber(data.longest_streak),
        created_at_formatted: safeString(data.created_at_formatted),
        last_login_formatted: safeString(data.last_login_formatted),
        premium_alerts: data.premium_alerts
          ? {
              enabled: Boolean(data.premium_alerts.enabled),
              unread_notifications: safeNumber(data.premium_alerts.unread_notifications),
              recent_profile_changes: safeNumber(data.premium_alerts.recent_profile_changes),
              recent_workout_feedback: safeNumber(data.premium_alerts.recent_workout_feedback),
              latest_workout_feedback: data.premium_alerts.latest_workout_feedback
                ? {
                    date: safeString(data.premium_alerts.latest_workout_feedback.date),
                    rating:
                      data.premium_alerts.latest_workout_feedback.rating == null
                        ? null
                        : safeNumber(data.premium_alerts.latest_workout_feedback.rating),
                    message:
                      data.premium_alerts.latest_workout_feedback.message == null
                        ? null
                        : safeString(data.premium_alerts.latest_workout_feedback.message),
                  }
                : null,
              pending_total: safeNumber(data.premium_alerts.pending_total),
              has_pending: Boolean(data.premium_alerts.has_pending),
            }
          : null,
        admin_calories_override: data.admin_calories_override != null ? safeNumber(data.admin_calories_override) : null,
        calculated_daily_calories: data.calculated_daily_calories != null ? safeNumber(data.calculated_daily_calories) : null,
      }

      setUser(normalized)
      setLocalData(normalized)
      // Inicializar el input con el valor actual del override (o vacío si no hay)
      setCaloriesOverrideInput(data.admin_calories_override != null ? String(data.admin_calories_override) : "")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      setError(message)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [userId, getAuthHeaders])

  // Cargar usuario cuando tenemos el ID
  useEffect(() => {
    if (userId && isAuthenticated) {
      fetchUser()
    }
  }, [userId, isAuthenticated, fetchUser])

  // Guardar cambios
  const handleSave = async () => {
    if (!user || !userId) return

    try {
      setSaving(true)

      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`admin/users/${userId}/`), {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(localData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Error ${response.status}`)
      }

      await fetchUser()
      setIsEditing(false)
      toast({
        title: "✅ Perfil actualizado",
        description: "Los cambios han sido guardados correctamente",
      })
    } catch (err) {
      toast({
        title: "❌ Error",
        description: err instanceof Error ? err.message : "Error al guardar",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Cancelar edición
  const handleCancel = () => {
    if (user) {
      setLocalData(user)
    }
    setIsEditing(false)
  }

  // Guardar override de calorías
  const handleSaveCaloriesOverride = async (clear = false) => {
    if (!userId) return
    try {
      setSavingCalories(true)
      const headers = await getAuthHeaders()
      const body = clear ? { admin_calories_override: null } : { admin_calories_override: caloriesOverrideInput ? parseInt(caloriesOverrideInput) : null }
      const response = await fetch(buildApiUrl(`admin/users/${userId}/`), {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.detail || `Error ${response.status}`)
      }
      await fetchUser()
      toast({ title: clear ? "✅ Override eliminado" : "✅ Calorías guardadas", description: clear ? "Se usará el cálculo automático" : "El override del admin ha sido aplicado" })
    } catch (err) {
      toast({ title: "❌ Error", description: err instanceof Error ? err.message : "Error al guardar", variant: "destructive" })
    } finally {
      setSavingCalories(false)
    }
  }

  // ============================================================================
  // RENDERIZADO CONDICIONAL
  // ============================================================================

  // Cargando params
  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    )
  }

  // Cargando datos
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-slate-600">Cargando datos del usuario...</p>
        </div>
      </div>
    )
  }

  // Error
  if (error || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2">Error al cargar usuario</h2>
            <p className="text-slate-600 mb-4">{error || "Usuario no encontrado"}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={fetchUser} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
              <Button onClick={() => router.push("/admin")} variant="default">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================
  const trainingDays = safeArray<number>(user.training_days)
  const equipment = safeArray<string>(user.equipment_available)
  const dietaryRestrictions = safeArray<string>(user.dietary_restrictions)
  const allergies = safeArray<string>(user.allergies)
  const medicalConditions = safeArray<string>(user.medical_conditions)
  const premiumAlerts = user.premium_alerts ?? null
  const premiumPendingTotal = user.role === "premium" ? premiumAlerts?.pending_total ?? 0 : 0

  const DAYS_MAP: Record<number, string> = {
    1: "Lunes",
    2: "Martes",
    3: "Miércoles",
    4: "Jueves",
    5: "Viernes",
    6: "Sábado",
    7: "Domingo",
  }

  // Mapa para días en formato string (del backend)
  const DAYS_STRING_MAP: Record<string, string> = {
    "monday": "Lunes",
    "tuesday": "Martes",
    "wednesday": "Miércoles",
    "thursday": "Jueves",
    "friday": "Viernes",
    "saturday": "Sábado",
    "sunday": "Domingo",
  }

  // Mapa para equipamiento
  const EQUIPMENT_MAP: Record<string, string> = {
    "dumbbells": "Mancuernas",
    "barbell": "Barra",
    "resistance_bands": "Bandas de resistencia",
    "bodyweight": "Peso corporal",
    "kettlebell": "Pesa rusa",
    "cable_machine": "Máquina de cables",
    "pull_up_bar": "Barra de dominadas",
    "bench": "Banco",
    "dumbbell": "Mancuerna",
    "machine": "Máquina",
    "smith_machine": "Máquina Smith",
    "trx": "TRX",
    "medicine_ball": "Balón medicinal",
    "yoga_mat": "Colchoneta de yoga",
    "foam_roller": "Rodillo de espuma",
    "jump_rope": "Cuerda de saltar",
    "bike": "Bicicleta",
    "treadmill": "Cinta de correr",
    "elliptical": "Elíptica",
    "rowing_machine": "Máquina de remo",
  }

  // Función para traducir día (acepta número o string)
  const translateDay = (day: number | string): string => {
    if (typeof day === "number") {
      return DAYS_MAP[day] || `Día ${day}`
    }
    const lowercaseDay = String(day).toLowerCase()
    return DAYS_STRING_MAP[lowercaseDay] || day
  }

  // Función para traducir equipamiento
  const translateEquipment = (eq: string): string => {
    const lowercaseEq = eq.toLowerCase()
    return EQUIPMENT_MAP[lowercaseEq] || eq
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header - Mobile Optimized */}
      <header className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-16 py-2">
            <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => router.push("/admin")}
                className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0"
              >
                <ArrowLeft className="h-3 w-3 md:h-5 md:w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm md:text-lg font-semibold text-slate-900 truncate">
                  {user.first_name} {user.last_name}
                </h1>
                <p className="text-xs md:text-sm text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              <Badge variant={user.is_active ? "default" : "destructive"} className="text-xs">
                {user.is_active ? "Activo" : "Inactivo"}
              </Badge>
              <Badge variant="outline" className="text-xs hidden sm:inline-flex">{user.role_display || user.role}</Badge>
              <Badge className="bg-indigo-100 text-indigo-700 border-0 text-xs hidden md:inline-flex">
                v2 ✨
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8">
        {/* Resumen rápido del usuario */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <CardContent className="p-2 md:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] md:text-xs text-indigo-600 font-medium mb-1 truncate">Peso Actual</p>
                  <p className="text-lg md:text-2xl font-bold text-indigo-900 truncate">{user.weight ? `${user.weight} kg` : "-"}</p>
                </div>
                <Weight className="h-5 w-5 md:h-8 md:w-8 text-indigo-400 flex-shrink-0 ml-1" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <CardContent className="p-2 md:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] md:text-xs text-emerald-600 font-medium mb-1 truncate">Peso Objetivo</p>
                  <p className="text-lg md:text-2xl font-bold text-emerald-900 truncate">{user.target_weight ? `${user.target_weight} kg` : "-"}</p>
                </div>
                <Target className="h-5 w-5 md:h-8 md:w-8 text-emerald-400 flex-shrink-0 ml-1" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-2 md:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] md:text-xs text-purple-600 font-medium mb-1 truncate">Racha Actual</p>
                  <p className="text-lg md:text-2xl font-bold text-purple-900 truncate">{user.daily_streak || 0} días</p>
                </div>
                <TrendingUp className="h-5 w-5 md:h-8 md:w-8 text-purple-400 flex-shrink-0 ml-1" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-2 md:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] md:text-xs text-orange-600 font-medium mb-1 truncate">IMC</p>
                  <p className="text-lg md:text-2xl font-bold text-orange-900 truncate">{user.bmi ? user.bmi.toFixed(1) : "-"}</p>
                </div>
                <Activity className="h-5 w-5 md:h-8 md:w-8 text-orange-400 flex-shrink-0 ml-1" />
              </div>
            </CardContent>
          </Card>
        </div>

        {user.role === "premium" ? (
          <Card className="mb-4 border-orange-200 bg-orange-50/50">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <button
                    className="w-full text-left group"
                    onClick={() => setAlertExpanded(v => !v)}
                    aria-expanded={alertExpanded}
                  >
                    <p className="text-sm font-semibold text-orange-900 flex items-center gap-1">
                      Alertas premium del usuario
                      <span className="text-orange-500 text-xs font-normal ml-1">{alertExpanded ? '▲ colapsar' : '▼ ver todo'}</span>
                    </p>
                    <p className="text-xs text-orange-800/80">
                      Pendientes: {premiumPendingTotal} · Notificaciones: {premiumAlerts?.unread_notifications ?? 0} · Cambios perfil: {premiumAlerts?.recent_profile_changes ?? 0} · Feedback entreno: {premiumAlerts?.recent_workout_feedback ?? 0}
                    </p>
                    {premiumAlerts?.latest_workout_feedback ? (
                      <p className={`text-xs text-orange-900/90 mt-1 ${alertExpanded ? '' : 'line-clamp-1'}`}>
                        Último feedback: {new Date(premiumAlerts.latest_workout_feedback.date).toLocaleDateString("es-ES")}
                        {premiumAlerts.latest_workout_feedback.rating != null ? ` · ${premiumAlerts.latest_workout_feedback.rating}/5` : ""}
                        {premiumAlerts.latest_workout_feedback.message ? ` · ${premiumAlerts.latest_workout_feedback.message}` : ""}
                      </p>
                    ) : null}
                  </button>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setActiveTab("notifications")}>Ver notificaciones</Button>
                  <Button size="sm" variant="outline" onClick={() => setActiveTab("activity")}>Ver actividad</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          {/* Mobile: Scroll horizontal */}
          <div className="md:hidden overflow-x-auto scrollbar-hide -mx-3 px-3">
            <TabsList className="inline-flex w-max h-auto p-1 bg-white rounded-lg shadow-sm gap-1">
              <TabsTrigger value="profile" className="flex items-center gap-1 px-2 py-1.5 text-[10px] whitespace-nowrap">
                <User className="h-3 w-3" />
                <span>Perfil</span>
              </TabsTrigger>
              <TabsTrigger value="fitness" className="flex items-center gap-1 px-2 py-1.5 text-[10px] whitespace-nowrap">
                <Dumbbell className="h-3 w-3" />
                <span>Fitness</span>
              </TabsTrigger>
              <TabsTrigger value="nutrition" className="flex items-center gap-1 px-2 py-1.5 text-[10px] whitespace-nowrap">
                <ChefHat className="h-3 w-3" />
                <span>Nutrición</span>
              </TabsTrigger>
              <TabsTrigger value="progress" className="flex items-center gap-1 px-2 py-1.5 text-[10px] whitespace-nowrap">
                <TrendingUp className="h-3 w-3" />
                <span>Progreso</span>
              </TabsTrigger>
              <TabsTrigger value="health" className="flex items-center gap-1 px-2 py-1.5 text-[10px] whitespace-nowrap">
                <Heart className="h-3 w-3" />
                <span>Salud</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-1 px-2 py-1.5 text-[10px] whitespace-nowrap">
                <Activity className="h-3 w-3" />
                <span>Actividad</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-1 px-2 py-1.5 text-[10px] whitespace-nowrap">
                <Bell className="h-3 w-3" />
                <span>Notif.</span>
                {premiumPendingTotal > 0 ? <Badge className="bg-orange-100 text-orange-800 border-0 text-[10px] px-1 py-0">{premiumPendingTotal}</Badge> : null}
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Desktop: Grid tradicional */}
          <TabsList className="hidden md:grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1 h-auto p-1 bg-white rounded-lg shadow-sm">
            <TabsTrigger value="profile" className="flex items-center gap-2 py-2 text-xs md:text-sm">
              <User className="h-3 w-3 md:h-4 md:w-4" />
              <span>Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="fitness" className="flex items-center gap-2 py-2 text-xs md:text-sm">
              <Dumbbell className="h-3 w-3 md:h-4 md:w-4" />
              <span>Fitness</span>
            </TabsTrigger>
            <TabsTrigger value="nutrition" className="flex items-center gap-2 py-2 text-xs md:text-sm">
              <ChefHat className="h-3 w-3 md:h-4 md:w-4" />
              <span>Nutrición</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2 py-2 text-xs md:text-sm">
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
              <span>Progreso</span>
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2 py-2 text-xs md:text-sm">
              <Heart className="h-3 w-3 md:h-4 md:w-4" />
              <span>Salud</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2 py-2 text-xs md:text-sm">
              <Activity className="h-3 w-3 md:h-4 md:w-4" />
              <span>Actividad</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2 py-2 text-xs md:text-sm">
              <Bell className="h-3 w-3 md:h-4 md:w-4" />
              <span>Notificaciones</span>
              {premiumPendingTotal > 0 ? <Badge className="bg-orange-100 text-orange-800 border-0 text-[10px] px-1 py-0">{premiumPendingTotal}</Badge> : null}
            </TabsTrigger>
          </TabsList>

          {/* ================================================================ */}
          {/* TAB: PERFIL */}
          {/* ================================================================ */}
          <TabsContent value="profile" className="space-y-4 md:space-y-6">
            {/* Botones de edición */}
            <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto text-sm">
                  <Edit className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  Editar Perfil
                </Button>
              ) : (
                <>
                  <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto text-sm">
                    {saving ? <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2 animate-spin" /> : <Save className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />}
                    {saving ? "Guardando..." : "Guardar"}
                  </Button>
                  <Button variant="outline" onClick={handleCancel} disabled={saving} className="w-full sm:w-auto text-sm">
                    <X className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                    Cancelar
                  </Button>
                </>
              )}
            </div>

            {/* Info personal */}
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <User className="h-4 w-4 md:h-5 md:w-5 text-indigo-600" />
                  Información Personal
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  <div>
                    <Label>Nombre</Label>
                    {isEditing ? (
                      <Input
                        value={safeString(localData.first_name)}
                        onChange={(e) => setLocalData({ ...localData, first_name: e.target.value })}
                      />
                    ) : (
                      <p className="mt-1 p-2 bg-slate-50 rounded">{user.first_name}</p>
                    )}
                  </div>
                  <div>
                    <Label>Apellidos</Label>
                    {isEditing ? (
                      <Input
                        value={safeString(localData.last_name)}
                        onChange={(e) => setLocalData({ ...localData, last_name: e.target.value })}
                      />
                    ) : (
                      <p className="mt-1 p-2 bg-slate-50 rounded">{user.last_name}</p>
                    )}
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Email
                    </Label>
                    <p className="mt-1 p-2 bg-slate-50 rounded text-slate-600">{user.email}</p>
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Teléfono
                    </Label>
                    {isEditing ? (
                      <Input
                        value={safeString(localData.phone_number)}
                        onChange={(e) => setLocalData({ ...localData, phone_number: e.target.value })}
                        placeholder="+34 600 000 000"
                      />
                    ) : (
                      <p className="mt-1 p-2 bg-slate-50 rounded">{user.phone_number || "No especificado"}</p>
                    )}
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Fecha de nacimiento
                    </Label>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={safeString(localData.birth_date).split("T")[0]}
                        onChange={(e) => setLocalData({ ...localData, birth_date: e.target.value })}
                      />
                    ) : (
                      <p className="mt-1 p-2 bg-slate-50 rounded">
                        {user.birth_date ? new Date(user.birth_date).toLocaleDateString("es-ES") : "No especificada"}
                        {user.age ? ` (${user.age} años)` : ""}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Género</Label>
                    {isEditing ? (
                      <Select
                        value={safeString(localData.gender)}
                        onValueChange={(v) => setLocalData({ ...localData, gender: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Masculino</SelectItem>
                          <SelectItem value="female">Femenino</SelectItem>
                          <SelectItem value="other">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="mt-1 p-2 bg-slate-50 rounded">{user.gender_display || "No especificado"}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Datos físicos */}
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Ruler className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                  Datos Físicos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                  <div>
                    <Label className="flex items-center gap-1">
                      <Ruler className="h-3 w-3" /> Altura (cm)
                    </Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={localData.height ?? ""}
                        onChange={(e) =>
                          setLocalData({ ...localData, height: e.target.value ? parseFloat(e.target.value) : undefined })
                        }
                      />
                    ) : (
                      <p className="mt-1 p-2 bg-slate-50 rounded">{user.height ? `${user.height} cm` : "No especificada"}</p>
                    )}
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      <Weight className="h-3 w-3" /> Peso actual (kg)
                    </Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={localData.weight ?? ""}
                        onChange={(e) =>
                          setLocalData({ ...localData, weight: e.target.value ? parseFloat(e.target.value) : undefined })
                        }
                      />
                    ) : (
                      <p className="mt-1 p-2 bg-slate-50 rounded">{user.weight ? `${user.weight} kg` : "No especificado"}</p>
                    )}
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      <Target className="h-3 w-3" /> Peso objetivo (kg)
                    </Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={localData.target_weight ?? ""}
                        onChange={(e) =>
                          setLocalData({
                            ...localData,
                            target_weight: e.target.value ? parseFloat(e.target.value) : undefined,
                          })
                        }
                      />
                    ) : (
                      <p className="mt-1 p-2 bg-slate-50 rounded">
                        {user.target_weight ? `${user.target_weight} kg` : "No especificado"}
                      </p>
                    )}
                  </div>
                </div>
                {user.bmi && (
                  <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
                    <p className="text-sm text-indigo-700">
                      <strong>IMC:</strong> {user.bmi.toFixed(1)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Estadísticas */}
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Activity className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                  Estadísticas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-4">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-2xl font-bold text-indigo-600">{user.daily_streak || 0}</p>
                    <p className="text-xs text-slate-500">Racha actual</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{user.longest_streak || 0}</p>
                    <p className="text-xs text-slate-500">Racha máxima</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm font-medium text-slate-700">{user.created_at_formatted || "-"}</p>
                    <p className="text-xs text-slate-500">Registro</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm font-medium text-slate-700">{user.last_login_formatted || "-"}</p>
                    <p className="text-xs text-slate-500">Último acceso</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Objetivos y Preferencias de Fitness */}
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Target className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
                  Objetivos y Preferencias de Fitness
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4 md:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <Label>Objetivo principal</Label>
                    <p className="mt-1 p-2 bg-slate-50 rounded">{user.main_goal_display || "No especificado"}</p>
                  </div>
                  <div>
                    <Label>Nivel de actividad</Label>
                    <p className="mt-1 p-2 bg-slate-50 rounded">{user.activity_level_display || "No especificado"}</p>
                  </div>
                  <div>
                    <Label>Ubicación de entrenamiento</Label>
                    <p className="mt-1 p-2 bg-slate-50 rounded">{user.training_location_display || "No especificada"}</p>
                  </div>
                  <div>
                    <Label>Días por semana</Label>
                    <p className="mt-1 p-2 bg-slate-50 rounded">{user.training_days_per_week || "No especificado"}</p>
                  </div>
                </div>

                <div>
                  <Label>Días de entrenamiento</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {trainingDays.length > 0 ? (
                      trainingDays.map((day) => (
                        <Badge key={day} variant="outline">
                          {translateDay(day)}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No especificados</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Equipamiento disponible</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {equipment.length > 0 ? (
                      equipment.map((eq) => (
                        <Badge key={eq} className="bg-blue-100 text-blue-700 border-0">
                          {translateEquipment(eq)}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No especificado</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Información Dietética */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5 text-orange-600" />
                  Información Dietética
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Restricciones dietéticas</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {dietaryRestrictions.length > 0 ? (
                      dietaryRestrictions.map((r) => (
                        <Badge key={r} className="bg-orange-100 text-orange-700 border-0">
                          {r}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">Ninguna</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Alergias</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {allergies.length > 0 ? (
                      allergies.map((a) => (
                        <Badge key={a} className="bg-red-100 text-red-700 border-0">
                          {a}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">Ninguna</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Alimentos que no le gustan</Label>
                  <p className="mt-1 p-2 bg-slate-50 rounded whitespace-pre-wrap">{user.disliked_foods || "No especificado"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Paneles temporalmente deshabilitados */}
            <Card>
              <CardHeader>
                <CardTitle>Actividad de Hoy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">Información de actividad del día actual</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================================================================ */}
          {/* TAB: FITNESS */}
          {/* ================================================================ */}
          <TabsContent value="fitness" className="space-y-6">
            {/* Resumen rápido de fitness */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-purple-600 font-medium mb-1">Días por semana</p>
                      <p className="text-2xl font-bold text-purple-900">{user.training_days_per_week || 0}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-purple-400" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-600 font-medium mb-1">Días seleccionados</p>
                      <p className="text-2xl font-bold text-blue-900">{trainingDays.length}</p>
                    </div>
                    <Dumbbell className="h-8 w-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-emerald-600 font-medium mb-1">Equipamiento</p>
                      <p className="text-2xl font-bold text-emerald-900">{equipment.length}</p>
                    </div>
                    <Target className="h-8 w-8 text-emerald-400" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-orange-600 font-medium mb-1">Objetivo</p>
                      <p className="text-sm font-bold text-orange-900 truncate">{user.main_goal_display || "-"}</p>
                    </div>
                    <Activity className="h-8 w-8 text-orange-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Información detallada de fitness */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  Objetivos y Preferencias de Fitness
                </CardTitle>
                <CardDescription>Información completa sobre los objetivos y preferencias de entrenamiento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm font-semibold">Objetivo principal</Label>
                    <p className="mt-1 p-2 bg-slate-50 rounded text-sm">{user.main_goal_display || "No especificado"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Nivel de actividad</Label>
                    <p className="mt-1 p-2 bg-slate-50 rounded text-sm">{user.activity_level_display || "No especificado"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Ubicación</Label>
                    <p className="mt-1 p-2 bg-slate-50 rounded text-sm">{user.training_location_display || "No especificada"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Días por semana</Label>
                    <p className="mt-1 p-2 bg-slate-50 rounded text-sm">{user.training_days_per_week || "No especificado"}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-2 block">Días de entrenamiento</Label>
                  <div className="flex flex-wrap gap-2">
                    {trainingDays.length > 0 ? (
                      trainingDays.map((day) => (
                        <Badge key={day} variant="outline" className="px-3 py-1">
                          {translateDay(day)}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 p-2 bg-slate-50 rounded">No especificados</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-2 block">Equipamiento disponible</Label>
                  <div className="flex flex-wrap gap-2">
                    {equipment.length > 0 ? (
                      equipment.map((eq) => (
                        <Badge key={eq} className="bg-blue-100 text-blue-700 border-blue-300 px-3 py-1">
                          {translateEquipment(eq)}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 p-2 bg-slate-50 rounded">No especificado</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Editor de plan de entrenamiento */}
            <WorkoutProgramEditor
              userId={user.id.toString()}
              onSave={() => {
                toast({
                  title: "✅ Programa guardado",
                  description: "El programa de entrenamientos ha sido actualizado",
                })
              }}
            />
          </TabsContent>

          {/* ================================================================ */}
          {/* TAB: NUTRICIÓN */}
          {/* ================================================================ */}
          <TabsContent value="nutrition" className="space-y-6">
            {/* Resumen rápido de nutrición */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-orange-600 font-medium mb-1">Restricciones</p>
                      <p className="text-2xl font-bold text-orange-900">{dietaryRestrictions.length}</p>
                    </div>
                    <ChefHat className="h-8 w-8 text-orange-400" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-red-600 font-medium mb-1">Alergias</p>
                      <p className="text-2xl font-bold text-red-900">{allergies.length}</p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-red-400" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-yellow-600 font-medium mb-1">Alimentos no gustan</p>
                      <p className="text-sm font-bold text-yellow-900 truncate">
                        {user.disliked_foods ? "Sí" : "No"}
                      </p>
                    </div>
                    <X className="h-8 w-8 text-yellow-400" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-green-600 font-medium mb-1">Estado</p>
                      <p className="text-sm font-bold text-green-900">Activo</p>
                    </div>
                    <Activity className="h-8 w-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Información detallada de nutrición */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5 text-orange-600" />
                  Información Dietética Completa
                </CardTitle>
                <CardDescription>Restricciones dietéticas, alergias y preferencias alimentarias</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base font-semibold mb-2 block">Restricciones dietéticas</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {dietaryRestrictions.length > 0 ? (
                      dietaryRestrictions.map((r) => (
                        <Badge key={r} className="bg-orange-100 text-orange-700 border-orange-300 px-3 py-1 text-sm">
                          {r}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 p-3 bg-slate-50 rounded-lg">No hay restricciones dietéticas registradas</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold mb-2 block">Alergias alimentarias</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {allergies.length > 0 ? (
                      allergies.map((a) => (
                        <Badge key={a} className="bg-red-100 text-red-700 border-red-300 px-3 py-1 text-sm">
                          {a}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 p-3 bg-slate-50 rounded-lg">No hay alergias registradas</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold mb-2 block">Alimentos que no le gustan</Label>
                  <div className="mt-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap min-h-[60px]">
                      {user.disliked_foods || "No hay alimentos que no le gusten registrados"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Override de calorías diarias */}
            <Card className="border-indigo-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-indigo-600" />
                  Calorías Diarias
                </CardTitle>
                <CardDescription>
                  Valor base aplicado por la app: plan activo si existe, o cálculo por perfil como fallback. Puedes fijar un valor personalizado que tendrá prioridad.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 font-medium mb-0.5">Objetivo base de la app</p>
                    <p className="text-xl font-bold text-slate-800">
                      {user.calculated_daily_calories ? `${user.calculated_daily_calories} kcal` : "—"}
                    </p>
                  </div>
                  {user.admin_calories_override ? (
                    <div className="flex-1">
                      <p className="text-xs text-indigo-600 font-medium mb-0.5">Override admin activo</p>
                      <p className="text-xl font-bold text-indigo-700">{user.admin_calories_override} kcal</p>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <p className="text-xs text-emerald-600 font-medium mb-0.5">Valor aplicado</p>
                      <p className="text-sm text-emerald-700 font-semibold">Objetivo base</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <Label className="text-xs font-medium mb-1.5 block">Fijar calorías manualmente (kcal)</Label>
                    <Input
                      type="number"
                      min={800}
                      max={6000}
                      step={50}
                      placeholder={user.calculated_daily_calories ? `Base: ${user.calculated_daily_calories}` : "Ej: 2200"}
                      value={caloriesOverrideInput}
                      onChange={(e) => setCaloriesOverrideInput(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSaveCaloriesOverride(false)}
                      disabled={savingCalories || !caloriesOverrideInput}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {savingCalories ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                      Guardar
                    </Button>
                    {user.admin_calories_override ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSaveCaloriesOverride(true)}
                        disabled={savingCalories}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Restablecer auto
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Editor de plan nutricional */}
            <NutritionPlanEditor
              userId={user.id.toString()}
              onSave={() => {
                toast({
                  title: "✅ Plan nutricional guardado",
                  description: "El plan nutricional ha sido actualizado",
                })
              }}
            />
          </TabsContent>

          {/* ================================================================ */}
          {/* TAB: PROGRESO */}
          {/* ================================================================ */}
          <TabsContent value="progress" className="space-y-6">
            <UserProgressOverview userId={userId} currentWeight={user.weight} targetWeight={user.target_weight} />

            {/* Panel completo de progreso con historial y gráficos */}
            {userId ? (
              <UserProgressPanel userId={userId} />
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600 mb-4" />
                    <p className="text-slate-500">Cargando ID de usuario...</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ================================================================ */}
          {/* TAB: SALUD */}
          {/* ================================================================ */}
          <TabsContent value="health" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-600" />
                  Información Médica Completa
                </CardTitle>
                <CardDescription>Condiciones médicas, lesiones y consideraciones de salud</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base font-semibold mb-2 block">Condiciones médicas</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {medicalConditions.length > 0 ? (
                      medicalConditions.map((c) => (
                        <Badge key={c} className="bg-red-100 text-red-700 border-red-300 px-3 py-1 text-sm">
                          {c}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 p-3 bg-slate-50 rounded-lg">No hay condiciones médicas registradas</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold mb-2 block">Lesiones o problemas médicos</Label>
                  <div className="mt-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap min-h-[100px]">
                      {user.injuries_or_medical_issues || "No hay lesiones o problemas médicos registrados"}
                    </p>
                  </div>
                </div>

                {/* Resumen de salud */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium mb-1">Altura</p>
                    <p className="text-lg font-bold text-blue-900">{user.height ? `${user.height} cm` : "No especificada"}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600 font-medium mb-1">Peso Actual</p>
                    <p className="text-lg font-bold text-green-900">{user.weight ? `${user.weight} kg` : "No especificado"}</p>
                  </div>
                  {user.bmi && (
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-xs text-purple-600 font-medium mb-1">Índice de Masa Corporal</p>
                      <p className="text-lg font-bold text-purple-900">{user.bmi.toFixed(1)}</p>
                    </div>
                  )}
                  {user.target_weight && (
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <p className="text-xs text-orange-600 font-medium mb-1">Peso Objetivo</p>
                      <p className="text-lg font-bold text-orange-900">{user.target_weight} kg</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================================================================ */}
          {/* TAB: ACTIVIDAD */}
          {/* ================================================================ */}
          <TabsContent value="activity" className="space-y-6">
            {/* Resumen de estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-indigo-600 font-medium mb-1">Racha Actual</p>
                      <p className="text-2xl font-bold text-indigo-900">{user.daily_streak || 0} días</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-indigo-400" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-green-600 font-medium mb-1">Racha Máxima</p>
                      <p className="text-2xl font-bold text-green-900">{user.longest_streak || 0} días</p>
                    </div>
                    <Activity className="h-8 w-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-purple-600 font-medium mb-1">Entrenamientos Totales</p>
                      <p className="text-2xl font-bold text-purple-900">{workouts.totals?.total_workouts || 0}</p>
                    </div>
                    <Dumbbell className="h-8 w-8 text-purple-400" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-600 font-medium mb-1">Esta Semana</p>
                      <p className="text-2xl font-bold text-blue-900">{workouts.totals?.completed_this_week || 0}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Historial de entrenamientos con gráficos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-purple-600" />
                  Historial de Entrenamientos
                </CardTitle>
                <CardDescription>
                  Historial completo de entrenamientos con gráficos y estadísticas. Desde aquí puedes modificar entrenamientos si es necesario.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!userId ? (
                  <div className="text-center py-12">
                    <AlertCircle className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                    <p className="text-slate-500">Esperando ID de usuario...</p>
                  </div>
                ) : workouts.loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                    <span className="ml-3 text-slate-600">Cargando historial de entrenamientos...</span>
                  </div>
                ) : workouts.error ? (
                  <div className="text-center py-12">
                    <AlertCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
                    <p className="text-red-600 mb-2 font-semibold">Error al cargar datos</p>
                    <p className="text-red-500 mb-4 text-sm">{workouts.error}</p>
                    <Button variant="outline" onClick={() => workouts.refetch()}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reintentar
                    </Button>
                  </div>
                ) : workouts.logs && Array.isArray(workouts.logs) && workouts.logs.length > 0 ? (
                  <div>
                    <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-green-700">
                        ✅ Se encontraron {workouts.logs.length} entrenamiento(s) registrado(s)
                      </p>
                    </div>
                    <WorkoutHistoryEnhanced 
                      workoutLogs={workouts.logs.map(log => ({
                        id: log.id,
                        user: userId || "",
                        workout_day: "",
                        date: log.date,
                        completed: log.completed || false,
                        notes: log.notes,
                        sets_completed: 0,
                        total_sets: 0,
                        duration_minutes: log.duration_minutes,
                        rating: log.rating,
                        exercises_data: [],
                      }))} 
                    />
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Dumbbell className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500 mb-2">El usuario aún no tiene entrenamientos registrados</p>
                    <p className="text-xs text-slate-400 mt-2">
                      Logs disponibles: {workouts.logs?.length || 0} | Estado: {workouts.loading ? "Cargando..." : "Completado"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Información de cuenta y actividad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-cyan-600" />
                    Información de Cuenta
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-cyan-50 rounded-lg">
                    <p className="text-xs text-cyan-600 font-medium mb-1">Fecha de registro</p>
                    <p className="text-lg font-semibold text-cyan-900">{user.created_at_formatted || "No disponible"}</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium mb-1">Último acceso</p>
                    <p className="text-lg font-semibold text-blue-900">{user.last_login_formatted || "Nunca"}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-600 font-medium mb-1">Estado de la cuenta</p>
                    <div className="mt-2">
                      <Badge variant={user.is_active ? "default" : "destructive"} className="text-sm">
                        {user.is_active ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    Detalles de Actividad
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                      <p className="text-xs text-purple-600 font-medium mb-1">Objetivo principal</p>
                      <p className="text-sm font-semibold text-purple-900">{user.main_goal_display || "No especificado"}</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                      <p className="text-xs text-blue-600 font-medium mb-1">Nivel de actividad</p>
                      <p className="text-sm font-semibold text-blue-900">{user.activity_level_display || "No especificado"}</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg">
                      <p className="text-xs text-emerald-600 font-medium mb-1">Días de entrenamiento/semana</p>
                      <p className="text-sm font-semibold text-emerald-900">{user.training_days_per_week || "No especificado"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ================================================================ */}
          {/* TAB: NOTIFICACIONES */}
          {/* ================================================================ */}
          <TabsContent value="notifications" className="space-y-6">
            {user.role === "premium" ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-blue-600" />
                    Alertas premium detectadas
                  </CardTitle>
                  <CardDescription>Resumen de señales priorizadas para revisión del usuario premium</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="rounded-lg border p-3 bg-white">
                      <p className="text-xs text-muted-foreground">Pendientes totales</p>
                      <p className="text-xl font-semibold">{premiumPendingTotal}</p>
                    </div>
                    <div className="rounded-lg border p-3 bg-white">
                      <p className="text-xs text-muted-foreground">No leídas</p>
                      <p className="text-xl font-semibold">{premiumAlerts?.unread_notifications ?? 0}</p>
                    </div>
                    <div className="rounded-lg border p-3 bg-white">
                      <p className="text-xs text-muted-foreground">Cambios de perfil</p>
                      <p className="text-xl font-semibold">{premiumAlerts?.recent_profile_changes ?? 0}</p>
                    </div>
                    <div className="rounded-lg border p-3 bg-white">
                      <p className="text-xs text-muted-foreground">Feedback entreno</p>
                      <p className="text-xl font-semibold">{premiumAlerts?.recent_workout_feedback ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <UserNotifications userId={user.id.toString()} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
