"use client"

// Evitar timeouts en renderizado RSC: forzar render dinámico
export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  User,
  Calendar,
  Activity,
  Award,
  ChefHat,
  Dumbbell,
  Camera,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  TrendingUp,
  Target,
  Ruler,
  Weight,
  Phone,
  Mail,
  MapPin,
  Dumbbell as DumbbellIcon,
  UtensilsCrossed,
  AlertCircle,
  Heart,
  Settings,
  Loader2,
  Bell,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast"
import { useAdminUserDetail, type UpdateUserProfileData } from "@/hooks/use-admin-user-detail"
import { NutritionPlanEditor } from "../../components/nutrition-plan-editor"
import { WorkoutProgramEditor } from "../../components/workout-program-editor"
import { ProgressPhotosCarousel } from "../../components/progress-photos-carousel"
import { UserNutritionSummary } from "../../components/user-nutrition-summary"
import { UserWorkoutSummary } from "../../components/user-workout-summary"
import { UserWeightHistory } from "../../components/user-weight-history"
import { UserWellnessPanel } from "../../components/user-wellness-panel"
import { UserNotifications } from "../../components/user-notifications"
import { UserProfileHistory } from "../../components/user-profile-history"
import { UserTodayPanels } from "../../components/user-today-panels"
import { UserProgressPanel } from "../../components/user-progress-panel"
import { fixEncoding, fixEncodingArray } from "@/lib/encoding-fix"

const DAYS_OF_WEEK = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 7, label: "Domingo" },
]

const EQUIPMENT_OPTIONS = [
  "Ninguno",
  "Mancuernas",
  "Barra y discos",
  "Máquinas de gimnasio",
  "Pesas rusas",
  "Bandas de resistencia",
  "TRX",
  "Pelota de ejercicio",
  "Colchoneta",
  "Bicicleta estática",
  "Cinta de correr",
]

const DIETARY_RESTRICTIONS_OPTIONS = [
  "Vegetariano",
  "Vegano",
  "Sin gluten",
  "Sin lactosa",
  "Paleo",
  "Keto",
  "Mediterráneo",
]

export default function UserDetailPage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  
  // Manejar params asíncrono (Next.js 15+)
  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolvedParams = params instanceof Promise ? await params : params
        if (resolvedParams?.id) {
          setUserId(resolvedParams.id)
        }
      } catch (err) {
        console.error('Error resolving params:', err)
      }
    }
    resolveParams()
  }, [params])
  
  const { user, loading, error, refetch, updateUser } = useAdminUserDetail(userId || "")
  const [isEditing, setIsEditing] = useState(false)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [localData, setLocalData] = useState<UpdateUserProfileData>({})

  // Inicializar datos locales cuando se carga el usuario
  useEffect(() => {
    if (user) {
      setLocalData({
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number || "",
        birth_date: user.birth_date ? user.birth_date.split("T")[0] : "",
        gender: user.gender as any,
        height: user.height || undefined,
        weight: user.weight || undefined,
        target_weight: user.target_weight || undefined,
        main_goal: user.main_goal as any,
        activity_level: user.activity_level as any,
        training_location: user.training_location as any,
        training_days_per_week: user.training_days_per_week || undefined,
        training_days: Array.isArray(user.training_days) ? user.training_days : [],
        equipment_available: Array.isArray(user.equipment_available) ? user.equipment_available : [],
        dietary_restrictions: Array.isArray(user.dietary_restrictions) ? user.dietary_restrictions : [],
        allergies: Array.isArray(user.allergies) ? user.allergies : [],
        disliked_foods: user.disliked_foods || "",
        medical_conditions: Array.isArray(user.medical_conditions) ? user.medical_conditions : [],
        injuries_or_medical_issues: user.injuries_or_medical_issues || "",
      })
    }
  }, [user])

  const handleSaveProfile = async () => {
    if (!user) return

    try {
      setSaving(true)
      await updateUser(localData)
      toast({
        title: "✅ Perfil actualizado",
        description: "Los cambios han sido guardados correctamente",
      })
      setIsEditing(false)
      setEditingSection(null)
      await refetch()
    } catch (err) {
      toast({
        title: "❌ Error",
        description: err instanceof Error ? err.message : "Error al guardar los cambios",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    if (user) {
      setLocalData({
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number || "",
        birth_date: user.birth_date ? user.birth_date.split("T")[0] : "",
        gender: user.gender as any,
        height: user.height || undefined,
        weight: user.weight || undefined,
        target_weight: user.target_weight || undefined,
        main_goal: user.main_goal as any,
        activity_level: user.activity_level as any,
        training_location: user.training_location as any,
        training_days_per_week: user.training_days_per_week || undefined,
        training_days: Array.isArray(user.training_days) ? user.training_days : [],
        equipment_available: Array.isArray(user.equipment_available) ? user.equipment_available : [],
        dietary_restrictions: Array.isArray(user.dietary_restrictions) ? user.dietary_restrictions : [],
        allergies: Array.isArray(user.allergies) ? user.allergies : [],
        disliked_foods: user.disliked_foods || "",
        medical_conditions: Array.isArray(user.medical_conditions) ? user.medical_conditions : [],
        injuries_or_medical_issues: user.injuries_or_medical_issues || "",
      })
    }
    setIsEditing(false)
    setEditingSection(null)
  }

  const toggleTrainingDay = (day: number) => {
    const currentDays = Array.isArray(localData.training_days) ? localData.training_days : []
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day].sort()
    setLocalData({ ...localData, training_days: newDays, training_days_per_week: newDays.length })
  }

  const toggleEquipment = (equipment: string) => {
    const current = Array.isArray(localData.equipment_available) ? localData.equipment_available : []
    const newEquipment = current.includes(equipment)
      ? current.filter((e) => e !== equipment)
      : [...current, equipment]
    setLocalData({ ...localData, equipment_available: newEquipment })
  }

  const toggleDietaryRestriction = (restriction: string) => {
    const current = Array.isArray(localData.dietary_restrictions) ? localData.dietary_restrictions : []
    const newRestrictions = current.includes(restriction)
      ? current.filter((r) => r !== restriction)
      : [...current, restriction]
    setLocalData({ ...localData, dietary_restrictions: newRestrictions })
  }

  const addAllergy = (allergy: string) => {
    if (!allergy.trim()) return
    const current = Array.isArray(localData.allergies) ? localData.allergies : []
    if (!current.includes(allergy.trim())) {
      setLocalData({ ...localData, allergies: [...current, allergy.trim()] })
    }
  }

  const removeAllergy = (allergy: string) => {
    const current = Array.isArray(localData.allergies) ? localData.allergies : []
    setLocalData({ ...localData, allergies: current.filter((a) => a !== allergy) })
  }

  const addMedicalCondition = (condition: string) => {
    if (!condition.trim()) return
    const current = Array.isArray(localData.medical_conditions) ? localData.medical_conditions : []
    if (!current.includes(condition.trim())) {
      setLocalData({ ...localData, medical_conditions: [...current, condition.trim()] })
    }
  }

  const removeMedicalCondition = (condition: string) => {
    const current = Array.isArray(localData.medical_conditions) ? localData.medical_conditions : []
    setLocalData({ ...localData, medical_conditions: current.filter((c) => c !== condition) })
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-teal-600" />
          <p className="text-muted-foreground">Cargando información del usuario...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-teal-600" />
          <p className="text-gray-600">Cargando datos del usuario...</p>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50 flex items-center justify-center">
        <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2">Error al cargar usuario</h2>
            <p className="text-gray-600 mb-4">{error || "Usuario no encontrado"}</p>
            <Button onClick={() => router.push("/admin")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al panel
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getStatusBadge = () => {
    if (!user.is_active) {
      return <Badge className="bg-red-100 text-red-800 border-0">Inactivo</Badge>
    }
    return <Badge className="bg-green-100 text-green-800 border-0">Activo</Badge>
  }

  const getPlanBadge = () => {
    const roleColors: Record<string, string> = {
      basic: "outline",
      premium: "bg-blue-100 text-blue-800 border-0",
      pro: "bg-purple-100 text-purple-800 border-0",
      admin: "bg-orange-100 text-orange-800 border-0",
    }
    return <Badge className={roleColors[user.role] || "outline"}>{user.role_display}</Badge>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50">
      {/* Header - Mobile Optimized */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-16 py-2">
            <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push("/admin")}
                className="hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 h-8 w-8 md:h-10 md:w-10 flex-shrink-0"
              >
                <ArrowLeft className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm md:text-xl font-semibold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent truncate">
                  {user.first_name} {user.last_name}
                </h1>
                <p className="text-xs md:text-sm text-gray-600 truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              {getStatusBadge()}
              {getPlanBadge()}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8">
        <Tabs defaultValue="overview" className="space-y-4 md:space-y-6">
          {/* Mobile: Scroll horizontal, Desktop: Grid */}
          <div className="md:hidden overflow-x-auto scrollbar-hide -mx-3 px-3">
            <TabsList className="inline-flex w-max h-auto p-1 bg-white/50 backdrop-blur-sm border-0 gap-1">
              <TabsTrigger
                value="overview"
                className="flex items-center gap-1 px-2 py-1.5 text-[10px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white whitespace-nowrap"
              >
                <User className="h-3 w-3" />
                <span>Perfil</span>
              </TabsTrigger>
              <TabsTrigger
                value="progress"
                className="flex items-center gap-1 px-2 py-1.5 text-[10px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-500 data-[state=active]:text-white whitespace-nowrap"
              >
                <TrendingUp className="h-3 w-3" />
                <span>Progreso</span>
              </TabsTrigger>
              <TabsTrigger
                value="nutrition"
                className="flex items-center gap-1 px-2 py-1.5 text-[10px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white whitespace-nowrap"
              >
                <ChefHat className="h-3 w-3" />
                <span>Nutrición</span>
              </TabsTrigger>
              <TabsTrigger
                value="workouts"
                className="flex items-center gap-1 px-2 py-1.5 text-[10px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-500 data-[state=active]:text-white whitespace-nowrap"
              >
                <Dumbbell className="h-3 w-3" />
                <span>Entren.</span>
              </TabsTrigger>
              <TabsTrigger
                value="photos"
                className="flex items-center gap-1 px-2 py-1.5 text-[10px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-500 data-[state=active]:text-white whitespace-nowrap"
              >
                <Camera className="h-3 w-3" />
                <span>Fotos</span>
              </TabsTrigger>
              <TabsTrigger
                value="achievements"
                className="flex items-center gap-1 px-2 py-1.5 text-[10px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-amber-500 data-[state=active]:text-white whitespace-nowrap"
              >
                <Award className="h-3 w-3" />
                <span>Logros</span>
              </TabsTrigger>
              <TabsTrigger
                value="wellness"
                className="flex items-center gap-1 px-2 py-1.5 text-[10px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white whitespace-nowrap"
              >
                <Activity className="h-3 w-3" />
                <span>Bienestar</span>
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="flex items-center gap-1 px-2 py-1.5 text-[10px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white whitespace-nowrap"
              >
                <Bell className="h-3 w-3" />
                <span>Notif.</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Desktop: Grid tradicional */}
          <TabsList className="hidden md:grid w-full grid-cols-4 lg:grid-cols-8 h-auto p-1 bg-white/50 backdrop-blur-sm border-0">
            <TabsTrigger
              value="overview"
              className="flex items-center gap-2 py-2 text-xs md:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white"
            >
              <User className="h-3 w-3 md:h-4 md:w-4" />
              <span>Perfil</span>
            </TabsTrigger>
            <TabsTrigger
              value="progress"
              className="flex items-center gap-2 py-2 text-xs md:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-500 data-[state=active]:text-white"
            >
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
              <span>Progreso</span>
            </TabsTrigger>
            <TabsTrigger
              value="nutrition"
              className="flex items-center gap-2 py-2 text-xs md:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white"
            >
              <ChefHat className="h-3 w-3 md:h-4 md:w-4" />
              <span>Nutrición</span>
            </TabsTrigger>
            <TabsTrigger
              value="workouts"
              className="flex items-center gap-2 py-2 text-xs md:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-500 data-[state=active]:text-white"
            >
              <Dumbbell className="h-3 w-3 md:h-4 md:w-4" />
              <span>Entrenamientos</span>
            </TabsTrigger>
            <TabsTrigger
              value="photos"
              className="flex items-center gap-2 py-2 text-xs md:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-500 data-[state=active]:text-white"
            >
              <Camera className="h-3 w-3 md:h-4 md:w-4" />
              <span>Fotos</span>
            </TabsTrigger>
            <TabsTrigger
              value="achievements"
              className="flex items-center gap-2 py-2 text-xs md:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-amber-500 data-[state=active]:text-white"
            >
              <Award className="h-3 w-3 md:h-4 md:w-4" />
              <span>Logros</span>
            </TabsTrigger>
            <TabsTrigger
              value="wellness"
              className="flex items-center gap-2 py-2 text-xs md:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white"
            >
              <Activity className="h-3 w-3 md:h-4 md:w-4" />
              <span>Bienestar</span>
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex items-center gap-2 py-2 text-xs md:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white"
            >
              <Bell className="h-3 w-3 md:h-4 md:w-4" />
              <span>Notificaciones</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - Perfil Completo */}
          <TabsContent value="overview" className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-end gap-2 mb-4">
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white border-0 w-full sm:w-auto text-sm"
                >
                  <Edit className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  Editar Perfil
                </Button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white border-0 w-full sm:w-auto text-sm"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                        Guardar cambios
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleCancelEdit} disabled={saving} className="w-full sm:w-auto text-sm">
                    <X className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                    Cancelar
                  </Button>
                </div>
              )}
            </div>

            <UserTodayPanels userId={user.id.toString()} />

            <UserProfileHistory userId={user.id.toString()} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Información Personal */}
              <Card className="lg:col-span-2 backdrop-blur-sm bg-white/80 border-0 shadow-xl">
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent flex items-center gap-2 text-base md:text-lg">
                    <User className="h-4 w-4 md:h-5 md:w-5" />
                    Información Personal
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">Datos básicos del usuario</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 md:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      {isEditing ? (
                        <Input
                          value={localData.first_name || ""}
                          onChange={(e) => setLocalData({ ...localData, first_name: e.target.value })}
                          className="border-2 border-gray-200 focus:border-teal-400"
                        />
                      ) : (
                        <p className="text-sm font-medium p-2 bg-gray-50 rounded-lg">{fixEncoding(user.first_name)}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Apellidos</Label>
                      {isEditing ? (
                        <Input
                          value={localData.last_name || ""}
                          onChange={(e) => setLocalData({ ...localData, last_name: e.target.value })}
                          className="border-2 border-gray-200 focus:border-teal-400"
                        />
                      ) : (
                        <p className="text-sm font-medium p-2 bg-gray-50 rounded-lg">{fixEncoding(user.last_name)}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </Label>
                      <p className="text-sm font-medium p-2 bg-gray-50 rounded-lg">{user.email}</p>
                      <p className="text-xs text-gray-500">El email no se puede modificar</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Teléfono
                      </Label>
                      {isEditing ? (
                        <Input
                          value={localData.phone_number || ""}
                          onChange={(e) => setLocalData({ ...localData, phone_number: e.target.value })}
                          className="border-2 border-gray-200 focus:border-teal-400"
                          placeholder="+34 600 000 000"
                        />
                      ) : (
                        <p className="text-sm font-medium p-2 bg-gray-50 rounded-lg">
                          {user.phone_number || "No especificado"}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Fecha de Nacimiento
                      </Label>
                      {isEditing ? (
                        <Input
                          type="date"
                          value={localData.birth_date || ""}
                          onChange={(e) => setLocalData({ ...localData, birth_date: e.target.value })}
                          className="border-2 border-gray-200 focus:border-teal-400"
                        />
                      ) : (
                        <p className="text-sm font-medium p-2 bg-gray-50 rounded-lg">
                          {user.birth_date
                            ? new Date(user.birth_date).toLocaleDateString("es-ES")
                            : "No especificada"}
                          {user.age && ` (${user.age} años)`}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Género</Label>
                      {isEditing ? (
                        <Select
                          value={localData.gender || ""}
                          onValueChange={(value) => setLocalData({ ...localData, gender: value as any })}
                        >
                          <SelectTrigger className="border-2 border-gray-200 focus:border-teal-400">
                            <SelectValue placeholder="Seleccionar género" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Masculino</SelectItem>
                            <SelectItem value="female">Femenino</SelectItem>
                            <SelectItem value="other">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm font-medium p-2 bg-gray-50 rounded-lg">
                          {user.gender_display || "No especificado"}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Estadísticas rápidas */}
              <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent flex items-center gap-2 text-base md:text-lg">
                    <Activity className="h-4 w-4 md:h-5 md:w-5" />
                    Estadísticas
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">Resumen del usuario</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 md:p-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Racha actual</span>
                      <span className="font-medium">{user.daily_streak || 0} días</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Racha más larga</span>
                      <span className="font-medium">{user.longest_streak || 0} días</span>
                    </div>
                    {user.bmi && (
                      <div className="flex justify-between text-sm">
                        <span>IMC</span>
                        <span className="font-medium">{user.bmi.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 space-y-2 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Registro: {user.created_at_formatted}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span>Último acceso: {user.last_login_formatted}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Datos Físicos */}
            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2 text-base md:text-lg">
                  <Ruler className="h-4 w-4 md:h-5 md:w-5" />
                  Datos Físicos
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">Medidas y objetivos físicos</CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Ruler className="h-4 w-4" />
                      Altura (cm)
                    </Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={localData.height || ""}
                        onChange={(e) =>
                          setLocalData({ ...localData, height: e.target.value ? parseFloat(e.target.value) : undefined })
                        }
                        className="border-2 border-gray-200 focus:border-blue-400"
                        placeholder="175"
                      />
                    ) : (
                      <p className="text-sm font-medium p-2 bg-gray-50 rounded-lg">
                        {user.height ? `${user.height} cm` : "No especificada"}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Weight className="h-4 w-4" />
                      Peso Actual (kg)
                    </Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={localData.weight || ""}
                        onChange={(e) =>
                          setLocalData({ ...localData, weight: e.target.value ? parseFloat(e.target.value) : undefined })
                        }
                        className="border-2 border-gray-200 focus:border-blue-400"
                        placeholder="70.5"
                      />
                    ) : (
                      <p className="text-sm font-medium p-2 bg-gray-50 rounded-lg">
                        {user.weight ? `${user.weight} kg` : "No especificado"}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Peso Objetivo (kg)
                    </Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={localData.target_weight || ""}
                        onChange={(e) =>
                          setLocalData({
                            ...localData,
                            target_weight: e.target.value ? parseFloat(e.target.value) : undefined,
                          })
                        }
                        className="border-2 border-gray-200 focus:border-blue-400"
                        placeholder="65.0"
                      />
                    ) : (
                      <p className="text-sm font-medium p-2 bg-gray-50 rounded-lg">
                        {user.target_weight ? `${user.target_weight} kg` : "No especificado"}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Objetivos y Preferencias de Fitness */}
            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Objetivos y Preferencias de Fitness
                </CardTitle>
                <CardDescription>Configuración de objetivos y preferencias de entrenamiento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Objetivo Principal</Label>
                    {isEditing ? (
                      <Select
                        value={localData.main_goal || ""}
                        onValueChange={(value) => setLocalData({ ...localData, main_goal: value as any })}
                      >
                        <SelectTrigger className="border-2 border-gray-200 focus:border-purple-400">
                          <SelectValue placeholder="Seleccionar objetivo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lose_weight">Perder peso</SelectItem>
                          <SelectItem value="gain_muscle">Ganar músculo</SelectItem>
                          <SelectItem value="body_recomposition">Recomposición corporal</SelectItem>
                          <SelectItem value="maintain">Mantener</SelectItem>
                          <SelectItem value="performance">Rendimiento</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm font-medium p-2 bg-gray-50 rounded-lg">
                        {user.main_goal_display || "No especificado"}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Nivel de Actividad</Label>
                    {isEditing ? (
                      <Select
                        value={localData.activity_level || ""}
                        onValueChange={(value) => setLocalData({ ...localData, activity_level: value as any })}
                      >
                        <SelectTrigger className="border-2 border-gray-200 focus:border-purple-400">
                          <SelectValue placeholder="Seleccionar nivel" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sedentary">Sedentario</SelectItem>
                          <SelectItem value="light">Ligero</SelectItem>
                          <SelectItem value="moderate">Moderado</SelectItem>
                          <SelectItem value="active">Activo</SelectItem>
                          <SelectItem value="very_active">Muy activo</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm font-medium p-2 bg-gray-50 rounded-lg">
                        {user.activity_level_display || "No especificado"}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Ubicación de Entrenamiento
                    </Label>
                    {isEditing ? (
                      <Select
                        value={localData.training_location || ""}
                        onValueChange={(value) => setLocalData({ ...localData, training_location: value as any })}
                      >
                        <SelectTrigger className="border-2 border-gray-200 focus:border-purple-400">
                          <SelectValue placeholder="Seleccionar ubicación" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="home">Casa</SelectItem>
                          <SelectItem value="gym">Gimnasio</SelectItem>
                          <SelectItem value="outdoor">Exterior</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm font-medium p-2 bg-gray-50 rounded-lg">
                        {user.training_location_display || "No especificada"}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Días de Entrenamiento por Semana</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        min="1"
                        max="7"
                        value={localData.training_days_per_week || ""}
                        onChange={(e) =>
                          setLocalData({
                            ...localData,
                            training_days_per_week: e.target.value ? parseInt(e.target.value) : undefined,
                          })
                        }
                        className="border-2 border-gray-200 focus:border-purple-400"
                      />
                    ) : (
                      <p className="text-sm font-medium p-2 bg-gray-50 rounded-lg">
                        {user.training_days_per_week || "No especificado"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Días de Entrenamiento */}
                <div className="space-y-2">
                  <Label>Días de Entrenamiento</Label>
                  {isEditing ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <div key={day.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`day-${day.value}`}
                            checked={Array.isArray(localData.training_days) && localData.training_days.includes(day.value)}
                            onCheckedChange={() => toggleTrainingDay(day.value)}
                          />
                          <Label
                            htmlFor={`day-${day.value}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {day.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(user.training_days) && user.training_days.length > 0 ? (
                        user.training_days.map((day) => {
                          const dayInfo = DAYS_OF_WEEK.find((d) => d.value === day)
                          return dayInfo ? (
                            <Badge key={day} variant="outline">
                              {dayInfo.label}
                            </Badge>
                          ) : null
                        })
                      ) : (
                        <p className="text-sm text-gray-500">No hay días seleccionados</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Equipamiento Disponible */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DumbbellIcon className="h-4 w-4" />
                    Equipamiento Disponible
                  </Label>
                  {isEditing ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                      {EQUIPMENT_OPTIONS.map((equipment) => (
                        <div key={equipment} className="flex items-center space-x-2">
                          <Checkbox
                            id={`equipment-${equipment}`}
                            checked={Array.isArray(localData.equipment_available) && localData.equipment_available.includes(equipment)}
                            onCheckedChange={() => toggleEquipment(equipment)}
                          />
                          <Label
                            htmlFor={`equipment-${equipment}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {equipment}
                          </Label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(user.equipment_available) && user.equipment_available.length > 0 ? (
                        fixEncodingArray(user.equipment_available).map((equipment) => (
                          <Badge key={equipment} variant="outline">
                            {equipment}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No hay equipamiento especificado</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Información Dietética */}
            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent flex items-center gap-2">
                  <UtensilsCrossed className="h-5 w-5" />
                  Información Dietética
                </CardTitle>
                <CardDescription>Restricciones dietéticas, alergias y preferencias alimentarias</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Restricciones Dietéticas */}
                <div className="space-y-2">
                  <Label>Restricciones Dietéticas</Label>
                  {isEditing ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {DIETARY_RESTRICTIONS_OPTIONS.map((restriction) => (
                        <div key={restriction} className="flex items-center space-x-2">
                          <Checkbox
                            id={`restriction-${restriction}`}
                            checked={Array.isArray(localData.dietary_restrictions) && localData.dietary_restrictions.includes(restriction)}
                            onCheckedChange={() => toggleDietaryRestriction(restriction)}
                          />
                          <Label
                            htmlFor={`restriction-${restriction}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {restriction}
                          </Label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(user.dietary_restrictions) && user.dietary_restrictions.length > 0 ? (
                        fixEncodingArray(user.dietary_restrictions).map((restriction) => (
                          <Badge key={restriction} className="bg-orange-100 text-orange-700 border-0">
                            {restriction}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No hay restricciones especificadas</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Alergias */}
                <div className="space-y-2">
                  <Label>Alergias</Label>
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(localData.allergies) ? localData.allergies.map((allergy) => (
                          <Badge
                            key={allergy}
                            variant="outline"
                            className="flex items-center gap-1 pr-1"
                          >
                            {allergy}
                            <button
                              onClick={() => removeAllergy(allergy)}
                              className="ml-1 hover:bg-red-100 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )) : null}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Añadir alergia (ej: nueces)"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addAllergy(e.currentTarget.value)
                              e.currentTarget.value = ""
                            }
                          }}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement
                            if (input) {
                              addAllergy(input.value)
                              input.value = ""
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(user.allergies) && user.allergies.length > 0 ? (
                        fixEncodingArray(user.allergies).map((allergy) => (
                          <Badge key={allergy} className="bg-red-100 text-red-700 border-0">
                            {fixEncoding(allergy)}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No hay alergias especificadas</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Alimentos que no le gustan */}
                <div className="space-y-2">
                  <Label>Alimentos que no le gustan</Label>
                  {isEditing ? (
                    <Textarea
                      value={localData.disliked_foods || ""}
                      onChange={(e) => setLocalData({ ...localData, disliked_foods: e.target.value })}
                      placeholder="Ej: brócoli, espinacas, etc."
                      className="border-2 border-gray-200 focus:border-orange-400"
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm font-medium p-2 bg-gray-50 rounded-lg">
                      {fixEncoding(user.disliked_foods) || "No especificado"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Información Médica */}
            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Información Médica
                </CardTitle>
                <CardDescription>Condiciones médicas, lesiones y otras consideraciones de salud</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Condiciones Médicas */}
                <div className="space-y-2">
                  <Label>Condiciones Médicas</Label>
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(localData.medical_conditions) ? localData.medical_conditions.map((condition) => (
                          <Badge
                            key={condition}
                            variant="outline"
                            className="flex items-center gap-1 pr-1"
                          >
                            {condition}
                            <button
                              onClick={() => removeMedicalCondition(condition)}
                              className="ml-1 hover:bg-red-100 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )) : null}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Añadir condición médica"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addMedicalCondition(e.currentTarget.value)
                              e.currentTarget.value = ""
                            }
                          }}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement
                            if (input) {
                              addMedicalCondition(input.value)
                              input.value = ""
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(user.medical_conditions) && user.medical_conditions.length > 0 ? (
                        fixEncodingArray(user.medical_conditions).map((condition) => (
                          <Badge key={condition} className="bg-red-100 text-red-700 border-0">
                            {fixEncoding(condition)}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No hay condiciones médicas especificadas</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Lesiones o Problemas Médicos */}
                <div className="space-y-2">
                  <Label>Lesiones o Problemas Médicos</Label>
                  {isEditing ? (
                    <Textarea
                      value={localData.injuries_or_medical_issues || ""}
                      onChange={(e) =>
                        setLocalData({ ...localData, injuries_or_medical_issues: e.target.value })
                      }
                      placeholder="Describe cualquier lesión o problema médico relevante"
                      className="border-2 border-gray-200 focus:border-red-400"
                      rows={4}
                    />
                  ) : (
                    <p className="text-sm font-medium p-2 bg-gray-50 rounded-lg whitespace-pre-wrap">
                      {fixEncoding(user.injuries_or_medical_issues) || "No especificado"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Progress Tab (placeholder temporal para evitar errores mientras depuramos) */}
          <TabsContent value="progress" className="space-y-6">
            <Card className="border border-emerald-100">
              <CardHeader>
                <CardTitle>Progreso</CardTitle>
                <CardDescription>Estamos cargando el nuevo panel.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Placeholder temporal para evitar errores de carga.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Nutrition Tab */}
          <TabsContent value="nutrition" className="space-y-6">
            <UserNutritionSummary userId={user.id.toString()} />
            <NutritionPlanEditor
              userId={user.id.toString()}
              onSave={() => {
                toast({
                  title: "✅ Plan guardado",
                  description: "El plan nutricional ha sido actualizado",
                })
              }}
            />
          </TabsContent>

          {/* Workouts Tab */}
          <TabsContent value="workouts" className="space-y-6">
            <UserWorkoutSummary userId={user.id.toString()} />
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

          {/* Photos Tab */}
          <TabsContent value="photos" className="space-y-6">
            <ProgressPhotosCarousel userId={user.id.toString()} />
          </TabsContent>

          {/* Achievements Tab - Se implementará después */}
          <TabsContent value="achievements" className="space-y-6">
            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Logros del Usuario</CardTitle>
                <CardDescription>Esta sección se implementará en la siguiente fase</CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>

          {/* Wellness Tab */}
          <TabsContent value="wellness" className="space-y-6">
            <UserWellnessPanel userId={user.id.toString()} />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <UserNotifications userId={user.id.toString()} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
