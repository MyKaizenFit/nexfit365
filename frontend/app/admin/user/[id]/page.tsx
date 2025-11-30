"use client"

import { useState } from "react"
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
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { NutritionPlanEditor } from "../../components/nutrition-plan-editor"
import { WorkoutProgramEditor } from "../../components/workout-program-editor"
import { ProgressPhotosCarousel } from "../../components/progress-photos-carousel"

// Mock data - en producción vendría de la API
const mockUserData = {
  id: "1",
  name: "Juan Pérez",
  email: "juan.perez@email.com",
  status: "active",
  joinDate: "2024-01-15",
  lastLogin: "2024-01-20",
  plan: "premium",
  profile: {
    age: 28,
    height: 175,
    currentWeight: 72.5,
    targetWeight: 70,
    activityLevel: "moderate",
    goals: ["weight_loss", "muscle_gain"],
    allergies: ["nuts", "dairy"],
    preferences: ["vegetarian"],
  },
  progress: {
    daysActive: 45,
    weightHistory: [
      { date: "2024-01-01", weight: 75.2 },
      { date: "2024-01-08", weight: 74.8 },
      { date: "2024-01-15", weight: 74.1 },
      { date: "2024-01-22", weight: 73.5 },
      { date: "2024-01-29", weight: 72.5 },
    ],
    photos: [
      { id: "1", date: "2024-01-01", url: "/placeholder.svg?height=200&width=150", type: "front" },
      { id: "2", date: "2024-01-15", url: "/placeholder.svg?height=200&width=150", type: "side" },
      { id: "3", date: "2024-01-29", url: "/placeholder.svg?height=200&width=150", type: "back" },
    ],
  },
  mealPlan: {
    currentPlan: "weight_loss_premium",
    dailyCalories: 2200,
    macros: { protein: 150, carbs: 220, fat: 80 },
    meals: [
      { id: "1", name: "Desayuno", time: "08:00", calories: 450, description: "Avena con frutas y proteína" },
      { id: "2", name: "Media Mañana", time: "10:30", calories: 200, description: "Yogur griego con almendras" },
      { id: "3", name: "Almuerzo", time: "13:00", calories: 650, description: "Pollo con quinoa y vegetales" },
      { id: "4", name: "Merienda", time: "16:00", calories: 250, description: "Batido de proteínas" },
      { id: "5", name: "Cena", time: "19:30", calories: 500, description: "Salmón con brócoli" },
    ],
  },
  workouts: {
    currentProgram: "strength_building",
    weeklySchedule: [
      { day: "Lunes", workout: "Pecho y Tríceps", duration: 45, completed: true },
      { day: "Martes", workout: "Espalda y Bíceps", duration: 50, completed: true },
      { day: "Miércoles", workout: "Descanso", duration: 0, completed: true },
      { day: "Jueves", workout: "Piernas", duration: 60, completed: true },
      { day: "Viernes", workout: "Hombros", duration: 40, completed: false },
      { day: "Sábado", workout: "Cardio", duration: 30, completed: false },
      { day: "Domingo", workout: "Descanso", duration: 0, completed: false },
    ],
  },
  achievements: [
    { id: "1", name: "Primera Semana", description: "Completa tu primera semana", earned: true, date: "2024-01-22" },
    {
      id: "2",
      name: "Constancia",
      description: "7 días seguidos registrando comidas",
      earned: true,
      date: "2024-01-25",
    },
    { id: "3", name: "Guerrero", description: "10 entrenamientos completados", earned: false, date: null },
    { id: "4", name: "Transformación", description: "Pierde 5kg", earned: false, date: null },
  ],
}

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [userData, setUserData] = useState(mockUserData)
  const [isEditing, setIsEditing] = useState(false)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [showAddAchievement, setShowAddAchievement] = useState(false)
  const [newAchievement, setNewAchievement] = useState({ name: "", description: "" })

  const handleSaveProfile = () => {
    toast({
      title: "✅ Perfil actualizado",
      description: "Los cambios han sido guardados correctamente",
    })
    setIsEditing(false)
  }

  const handleAddAchievement = () => {
    if (!newAchievement.name || !newAchievement.description) {
      toast({
        title: "❌ Error",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      })
      return
    }

    const achievement = {
      id: Date.now().toString(),
      name: newAchievement.name,
      description: newAchievement.description,
      earned: false,
      date: null,
    }

    setUserData((prev) => ({
      ...prev,
      achievements: [...prev.achievements, achievement],
    }))

    setNewAchievement({ name: "", description: "" })
    setShowAddAchievement(false)

    toast({
      title: "✅ Logro añadido",
      description: "El nuevo logro ha sido creado correctamente",
    })
  }

  const handleToggleAchievement = (achievementId: string) => {
    setUserData((prev) => ({
      ...prev,
      achievements: prev.achievements.map((achievement) =>
        achievement.id === achievementId
          ? {
              ...achievement,
              earned: !achievement.earned,
              date: !achievement.earned ? new Date().toISOString().split("T")[0] : null,
            }
          : achievement,
      ),
    }))

    toast({
      title: "✅ Logro actualizado",
      description: "El estado del logro ha sido modificado",
    })
  }

  const handleDeleteAchievement = (achievementId: string) => {
    setUserData((prev) => ({
      ...prev,
      achievements: prev.achievements.filter((achievement) => achievement.id !== achievementId),
    }))

    toast({
      title: "🗑️ Logro eliminado",
      description: "El logro ha sido eliminado correctamente",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 border-0">Activo</Badge>
      case "suspended":
        return <Badge className="bg-red-100 text-red-800 border-0">Suspendido</Badge>
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800 border-0">Inactivo</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case "basic":
        return <Badge variant="outline">Básico</Badge>
      case "premium":
        return <Badge className="bg-blue-100 text-blue-800 border-0">Premium</Badge>
      case "pro":
        return <Badge className="bg-purple-100 text-purple-800 border-0">Pro</Badge>
      default:
        return <Badge variant="outline">{plan}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push("/admin")}
                className="hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  {userData.name}
                </h1>
                <p className="text-sm text-gray-600">Gestión completa del usuario</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(userData.status)}
              {getPlanBadge(userData.plan)}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 h-auto p-1 bg-white/50 backdrop-blur-sm border-0">
            <TabsTrigger
              value="overview"
              className="flex items-center gap-2 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
            <TabsTrigger
              value="progress"
              className="flex items-center gap-2 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-500 data-[state=active]:text-white"
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Progreso</span>
            </TabsTrigger>
            <TabsTrigger
              value="nutrition"
              className="flex items-center gap-2 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white"
            >
              <ChefHat className="h-4 w-4" />
              <span className="hidden sm:inline">Nutrición</span>
            </TabsTrigger>
            <TabsTrigger
              value="workouts"
              className="flex items-center gap-2 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-500 data-[state=active]:text-white"
            >
              <Dumbbell className="h-4 w-4" />
              <span className="hidden sm:inline">Entrenamientos</span>
            </TabsTrigger>
            <TabsTrigger
              value="photos"
              className="flex items-center gap-2 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-500 data-[state=active]:text-white"
            >
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Fotos</span>
            </TabsTrigger>
            <TabsTrigger
              value="achievements"
              className="flex items-center gap-2 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-amber-500 data-[state=active]:text-white"
            >
              <Award className="h-4 w-4" />
              <span className="hidden sm:inline">Logros</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Información Personal */}
              <Card className="lg:col-span-2 backdrop-blur-sm bg-white/80 border-0 shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                      Información Personal
                    </CardTitle>
                    <CardDescription>Datos básicos del usuario</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50"
                  >
                    {isEditing ? <Save className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre completo</Label>
                      {isEditing ? (
                        <Input
                          value={userData.name}
                          onChange={(e) => setUserData((prev) => ({ ...prev, name: e.target.value }))}
                          className="border-2 border-gray-200 focus:border-teal-400"
                        />
                      ) : (
                        <p className="text-sm font-medium p-2 bg-gray-50 rounded-lg">{userData.name}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      {isEditing ? (
                        <Input
                          type="email"
                          value={userData.email}
                          onChange={(e) => setUserData((prev) => ({ ...prev, email: e.target.value }))}
                          className="border-2 border-gray-200 focus:border-teal-400"
                        />
                      ) : (
                        <p className="text-sm font-medium p-2 bg-gray-50 rounded-lg">{userData.email}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Edad</Label>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={userData.profile.age}
                          onChange={(e) =>
                            setUserData((prev) => ({
                              ...prev,
                              profile: { ...prev.profile, age: Number.parseInt(e.target.value) },
                            }))
                          }
                          className="border-2 border-gray-200 focus:border-teal-400"
                        />
                      ) : (
                        <p className="text-sm font-medium p-2 bg-gray-50 rounded-lg">{userData.profile.age} años</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Altura</Label>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={userData.profile.height}
                          onChange={(e) =>
                            setUserData((prev) => ({
                              ...prev,
                              profile: { ...prev.profile, height: Number.parseInt(e.target.value) },
                            }))
                          }
                          className="border-2 border-gray-200 focus:border-teal-400"
                        />
                      ) : (
                        <p className="text-sm font-medium p-2 bg-gray-50 rounded-lg">{userData.profile.height} cm</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Peso actual</Label>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.1"
                          value={userData.profile.currentWeight}
                          onChange={(e) =>
                            setUserData((prev) => ({
                              ...prev,
                              profile: { ...prev.profile, currentWeight: Number.parseFloat(e.target.value) },
                            }))
                          }
                          className="border-2 border-gray-200 focus:border-teal-400"
                        />
                      ) : (
                        <p className="text-sm font-medium p-2 bg-gray-50 rounded-lg">
                          {userData.profile.currentWeight} kg
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Peso objetivo</Label>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.1"
                          value={userData.profile.targetWeight}
                          onChange={(e) =>
                            setUserData((prev) => ({
                              ...prev,
                              profile: { ...prev.profile, targetWeight: Number.parseFloat(e.target.value) },
                            }))
                          }
                          className="border-2 border-gray-200 focus:border-teal-400"
                        />
                      ) : (
                        <p className="text-sm font-medium p-2 bg-gray-50 rounded-lg">
                          {userData.profile.targetWeight} kg
                        </p>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={handleSaveProfile}
                        className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white border-0"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Guardar cambios
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Estadísticas rápidas */}
              <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                    Estadísticas
                  </CardTitle>
                  <CardDescription>Resumen del progreso</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Días activo</span>
                      <span className="font-medium">{userData.progress.daysActive}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Peso perdido</span>
                      <span className="font-medium text-green-600">
                        -{(userData.progress.weightHistory[0].weight - userData.profile.currentWeight).toFixed(1)} kg
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Progreso al objetivo</span>
                      <span className="font-medium">
                        {Math.round(
                          ((userData.progress.weightHistory[0].weight - userData.profile.currentWeight) /
                            (userData.progress.weightHistory[0].weight - userData.profile.targetWeight)) *
                            100,
                        )}
                        %
                      </span>
                    </div>
                  </div>

                  <Progress
                    value={
                      ((userData.progress.weightHistory[0].weight - userData.profile.currentWeight) /
                        (userData.progress.weightHistory[0].weight - userData.profile.targetWeight)) *
                      100
                    }
                    className="h-2"
                  />

                  <div className="pt-2 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Registro: {userData.joinDate}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span>Último acceso: {userData.lastLogin}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                    Evolución del Peso
                  </CardTitle>
                  <CardDescription>Historial de peso del usuario</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {userData.progress.weightHistory.map((entry, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200"
                      >
                        <span className="text-sm font-medium">{entry.date}</span>
                        <span className="text-sm font-bold text-emerald-700">{entry.weight} kg</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Objetivos y Metas
                  </CardTitle>
                  <CardDescription>Configuración de objetivos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Objetivos principales</Label>
                    <div className="flex flex-wrap gap-2">
                      {userData.profile.goals.map((goal) => (
                        <Badge
                          key={goal}
                          className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-0"
                        >
                          {goal === "weight_loss" ? "Pérdida de peso" : "Ganancia muscular"}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Nivel de actividad</Label>
                    <Select value={userData.profile.activityLevel}>
                      <SelectTrigger className="border-2 border-gray-200 focus:border-blue-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sedentary">Sedentario</SelectItem>
                        <SelectItem value="light">Ligero</SelectItem>
                        <SelectItem value="moderate">Moderado</SelectItem>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="very_active">Muy activo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Alergias</Label>
                    <div className="flex flex-wrap gap-2">
                      {userData.profile.allergies.map((allergy) => (
                        <Badge
                          key={allergy}
                          className="bg-gradient-to-r from-red-100 to-pink-100 text-red-700 border-0"
                        >
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Nutrition Tab */}
          <TabsContent value="nutrition" className="space-y-6">
            <NutritionPlanEditor
              userId={userData.id}
              onSave={() =>
                toast({ title: "✅ Plan guardado", description: "El plan nutricional ha sido actualizado" })
              }
            />
          </TabsContent>

          {/* Workouts Tab */}
          <TabsContent value="workouts" className="space-y-6">
            <WorkoutProgramEditor
              userId={userData.id}
              onSave={() =>
                toast({
                  title: "✅ Programa guardado",
                  description: "El programa de entrenamientos ha sido actualizado",
                })
              }
            />
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos" className="space-y-6">
            <ProgressPhotosCarousel userId={userData.id} />
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                    Logros del Usuario
                  </CardTitle>
                  <CardDescription>Gestiona los logros y recompensas</CardDescription>
                </div>
                <Button
                  onClick={() => setShowAddAchievement(true)}
                  className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white border-0"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir Logro
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {userData.achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="flex items-center justify-between p-4 border rounded-lg backdrop-blur-sm bg-white/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-full ${achievement.earned ? "bg-gradient-to-r from-yellow-400 to-amber-500" : "bg-gray-200"}`}
                      >
                        <Award className={`h-4 w-4 ${achievement.earned ? "text-white" : "text-gray-500"}`} />
                      </div>
                      <div>
                        <h5 className="font-medium">{achievement.name}</h5>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                        {achievement.earned && achievement.date && (
                          <p className="text-xs text-green-600">Obtenido el {achievement.date}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleAchievement(achievement.id)}
                        className="hover:bg-gradient-to-r hover:from-yellow-50 hover:to-amber-50"
                      >
                        {achievement.earned ? "Quitar" : "Otorgar"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAchievement(achievement.id)}
                        className="hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Achievement Dialog */}
      <Dialog open={showAddAchievement} onOpenChange={setShowAddAchievement}>
        <DialogContent className="backdrop-blur-sm bg-white/90 border-0 shadow-xl">
          <DialogHeader>
            <DialogTitle>Añadir Nuevo Logro</DialogTitle>
            <DialogDescription>Crea un nuevo logro para el usuario</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="achievement-name">Nombre del logro</Label>
              <Input
                id="achievement-name"
                value={newAchievement.name}
                onChange={(e) => setNewAchievement((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Primer mes completado"
                className="border-2 border-gray-200 focus:border-yellow-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="achievement-description">Descripción</Label>
              <Textarea
                id="achievement-description"
                value={newAchievement.description}
                onChange={(e) => setNewAchievement((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe qué debe hacer el usuario para obtener este logro"
                className="border-2 border-gray-200 focus:border-yellow-400"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAchievement(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddAchievement}
              className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white border-0"
            >
              Crear Logro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
