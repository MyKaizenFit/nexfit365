"use client"

import { useState, useEffect, lazy, Suspense } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Bell,
  Calendar,
  Camera,
  ChefHat,
  Dumbbell,
  Home,
  Medal,
  Settings,
  Target,
  TrendingUp,
  User,
  LogOut,
  Sparkles,
  Heart,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

// Lazy loading de componentes pesados para code splitting
const MealDashboard = lazy(() => import("@/components/dashboard/meal-dashboard").then(module => ({ default: module.MealDashboard })))
const DashboardEnhanced = lazy(() => import("@/components/dashboard/dashboard-enhanced").then(module => ({ default: module.DashboardEnhanced })))
const ProgressDashboard = lazy(() => import("@/components/dashboard/progress-dashboard").then(module => ({ default: module.ProgressDashboard })))
const WorkoutSummary = lazy(() => import("./components/workout-summary").then(module => ({ default: module.WorkoutSummary })))
const WorkoutDashboardEnhanced = lazy(() => import("@/components/dashboard/workout-dashboard-enhanced").then(module => ({ default: module.WorkoutDashboardEnhanced })))
const Achievements = lazy(() => import("./components/achievements").then(module => ({ default: module.Achievements })))
const AchievementsDuolingo = lazy(() => import("./components/achievements-duolingo").then(module => ({ default: module.AchievementsDuolingo })))
const MobileNavigation = lazy(() => import("./components/mobile-navigation").then(module => ({ default: module.MobileNavigation })))
const MobileHeader = lazy(() => import("./components/mobile-header").then(module => ({ default: module.MobileHeader })))
const DayOneSheet = lazy(() => import("./components/day-one-sheet").then(module => ({ default: module.DayOneSheet })))
const SettingsPage = lazy(() => import("./components/settings-page"))
const ProfilePanel = lazy(() => import("./components/profile-panel").then(module => ({ default: module.ProfilePanel })))
const NotificationsDropdown = lazy(() => import("./components/notifications-dropdown").then(module => ({ default: module.NotificationsDropdown })))
const WorkoutPlansDashboard = lazy(() => import("@/components/workout-plans-dashboard").then(module => ({ default: module.WorkoutPlansDashboard })))
const TipsShowcase = lazy(() => import("@/components/dashboard/tips-showcase").then(module => ({ default: module.TipsShowcase })))
const TipsBoard = lazy(() => import("@/components/tips/tips-board").then(module => ({ default: module.TipsBoard })))
const RecommendationsSection = lazy(() => import("@/components/recommendations/recommendations-section").then(module => ({ default: module.RecommendationsSection })))

import { useAuth } from "@/contexts/auth-context"
import { useUserData } from "@/hooks/use-user-data"
import { useUserProfile } from "@/hooks/use-user-profile"

const menuItems = [
  { title: "Dashboard", icon: Home, url: "dashboard", isActive: true },
  { title: "Day 1", icon: Target, url: "day-one" },
  { title: "Recomendaciones", icon: Sparkles, url: "recommendations" },
  { title: "Consejos", icon: Heart, url: "tips" },
  { title: "Menús / Recetas", icon: ChefHat, url: "meals" },
  { title: "Entrenamientos", icon: Dumbbell, url: "workouts-3" },
  { title: "Mi Perfil", icon: User, url: "profile" },
  { title: "Logros", icon: Medal, url: "achievements" },
  { title: "Configuración", icon: Settings, url: "settings" },
]

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedSection, setSelectedSection] = useState("dashboard")
  const [notifications, setNotifications] = useState(3)
  const [userProfile, setUserProfile] = useState<any>(null)
  const { user, logout } = useAuth()
  const { userStats, loading: statsLoading } = useUserData()
  const { profile, loading: profileLoading } = useUserProfile()

  // Cargar datos del perfil del usuario
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user) {
        try {
          // Simular carga de datos del perfil (aquí iría la llamada real al backend)
          const mockProfile = {
            main_goal: 'lose_weight', // lose_weight, gain_muscle, body_recomposition
            activity_level: 'moderate', // sedentary, light, moderate, active, very_active
            training_location: 'home', // home, gym
            training_days_per_week: 4,
            allergies: 'nueces, mariscos',
            disliked_foods: 'brócoli, espinacas',
            height: 175,
            weight: 70,
            age: 28,
            gender: 'male'
          }
          setUserProfile(mockProfile)
        } catch (error) {
          console.error('Error cargando perfil del usuario:', error)
        }
      }
    }

    loadUserProfile()
  }, [user])

  useEffect(() => {
    const sectionParam = searchParams?.get("section")
    if (sectionParam && sectionParam !== selectedSection) {
      setSelectedSection(sectionParam)
    } else if (!sectionParam && selectedSection !== "dashboard") {
      setSelectedSection("dashboard")
    }
  }, [searchParams, selectedSection])

  const handleMenuClick = (section: string, title: string) => {
    setSelectedSection(section)
    if (section === "dashboard") {
      router.push("/dashboard", { scroll: false })
    } else {
      router.push(`/dashboard?section=${section}`, { scroll: false })
    }
  }

  const handleNotificationClick = () => {
    setNotifications(0)
    toast({
      title: "🔔 Notificaciones",
      description:
        "Tienes 3 notificaciones nuevas: Revisión pendiente, Nueva receta disponible, ¡Felicidades por tu progreso!",
    })
  }

  const renderContent = () => {
    switch (selectedSection) {
      case "dashboard":
        return (
          <div className="fade-in-stagger scroll-area h-full w-full relative">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-pink-200/20 to-rose-200/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-teal-200/20 to-cyan-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-violet-200/15 to-purple-200/15 rounded-full blur-3xl animate-pulse delay-500"></div>

              {/* Floating elements */}
              <div className="absolute top-20 left-20 w-3 h-3 bg-rose-300/40 rounded-full animate-bounce delay-300"></div>
              <div className="absolute top-40 right-32 w-2 h-2 bg-teal-300/40 rounded-full animate-bounce delay-700"></div>
              <div className="absolute bottom-32 left-32 w-4 h-4 bg-violet-300/40 rounded-full animate-bounce delay-1000"></div>
              <div className="absolute bottom-20 right-20 w-2 h-2 bg-pink-300/40 rounded-full animate-bounce delay-500"></div>
            </div>

            <div className="responsive-content p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 relative z-10">
              {/* Contenido Principal */}
              <div className="w-full space-y-4 sm:space-y-6 animate-in slide-in-from-bottom-8 duration-700 delay-400">
                <DashboardEnhanced />
                <Suspense fallback={null}>
                  <RecommendationsSection />
                </Suspense>
                <Suspense fallback={null}>
                  <TipsShowcase />
                </Suspense>
              </div>

              {/* Elementos móviles al final */}
              <div className="lg:hidden space-y-4 sm:space-y-6 animate-in slide-in-from-bottom-8 duration-700 delay-600">
                <div className="sm:hidden">
                  <Achievements />
                </div>
              </div>


            </div>
          </div>
        )

      case "progress":
        // Redirigir a Day 1 (ahora unificado)
        return (
          <div className="fade-in-stagger scroll-area h-full w-full relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-emerald-200/20 to-teal-200/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-200/20 to-indigo-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>
            <div className="responsive-content p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 relative z-10">
              <DayOneSheet />
            </div>
          </div>
        )

      case "recommendations":
        return (
          <div className="fade-in-stagger scroll-area h-full w-full relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-amber-200/20 to-pink-200/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-sky-200/20 to-emerald-200/20 rounded-full blur-3xl animate-pulse delay-700"></div>
            </div>
            <div className="responsive-content p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 relative z-10">
              <Suspense fallback={null}>
                <RecommendationsSection />
              </Suspense>
            </div>
          </div>
        )

      case "tips":
        return (
          <div className="fade-in-stagger scroll-area h-full w-full relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-200/20 to-pink-200/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-orange-200/20 to-rose-200/20 rounded-full blur-3xl animate-pulse delay-900"></div>
            </div>
            <div className="responsive-content p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 relative z-10">
              <Suspense fallback={null}>
                <TipsBoard />
              </Suspense>
            </div>
          </div>
        )

      case "meals":
        return (
          <div className="fade-in-stagger scroll-area h-full w-full relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-orange-200/20 to-red-200/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-yellow-200/20 to-orange-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>
            <div className="responsive-content p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 relative z-10">
              <div className="text-center space-y-4 animate-in slide-in-from-top-8 duration-700">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center animate-bounce">
                  <ChefHat className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  Tu Plan Nutricional 🍽️
                </h2>
              </div>
              <MealDashboard />
            </div>
          </div>
        )

      case "workouts-3":
        return (
          <div className="fade-in-stagger scroll-area h-full w-full relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-200/20 to-violet-200/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-200/20 to-purple-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>
            <div className="responsive-content p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 relative z-10">
              <div className="text-center space-y-4 animate-in slide-in-from-top-8 duration-700">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center animate-bounce">
                  <Dumbbell className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Entrenamientos 💪
                </h2>
                <p className="text-sm text-gray-600">Rutina completa con seguimiento y estadísticas</p>
              </div>
              <WorkoutDashboardEnhanced />
            </div>
          </div>
        )



      case "achievements":
        return (
          <div className="fade-in-stagger scroll-area h-full w-full relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-yellow-200/20 to-amber-200/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-orange-200/20 to-yellow-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>
            <div className="responsive-content p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 relative z-10">
              <div className="text-center space-y-4 animate-in slide-in-from-top-8 duration-700">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center animate-bounce">
                  <Medal className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                  Sistema de Recompensas 🎁
                </h2>
                <p className="text-sm text-gray-600">Completa objetivos diarios y gana recompensas</p>
              </div>
              <AchievementsDuolingo />
            </div>
          </div>
        )

      case "day-one":
        return (
          <div className="fade-in-stagger scroll-area h-full w-full relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-emerald-200/20 to-green-200/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-200/20 to-emerald-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>
            <div className="responsive-content p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 relative z-10">
              <div className="text-center space-y-4 animate-in slide-in-from-top-8 duration-700">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center animate-bounce">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  Day 1 🎯
                </h2>
              </div>
              <DayOneSheet />
            </div>
          </div>
        )

      case "settings":
        return (
          <div className="fade-in-stagger scroll-area h-full w-full relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-slate-200/20 to-gray-200/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-200/20 to-slate-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>
            <div className="responsive-content p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 relative z-10">
              <div className="text-center space-y-4 animate-in slide-in-from-top-8 duration-700">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 rounded-2xl flex items-center justify-center animate-bounce shadow-lg">
                  <Settings className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent">
                  Configuración ⚙️
                </h2>
              </div>
              <SettingsPage />
            </div>
          </div>
        )

      case "profile":
        return (
          <div className="fade-in-stagger scroll-area h-full w-full relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-200/20 to-blue-200/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-200/20 to-indigo-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>
            <div className="responsive-content p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 relative z-10">
              <ProfilePanel />
            </div>
          </div>
        )

      default:
        const currentMenuItem = menuItems.find((item) => item.url === selectedSection)
        const IconComponent = currentMenuItem?.icon || Home

        return (
          <div className="scroll-area h-full w-full relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-gray-200/20 to-slate-200/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-200/20 to-gray-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>
            <div className="responsive-content p-3 sm:p-4 lg:p-6 flex items-center justify-center min-h-full relative z-10">
              <Card className="responsive-card max-w-md backdrop-blur-sm bg-white/80 border-0 shadow-xl">
                <CardHeader className="text-center p-3 sm:p-4 lg:p-6">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 rounded-2xl flex items-center justify-center animate-bounce mb-4 shadow-lg">
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="flex items-center justify-center gap-2 text-sm sm:text-base lg:text-lg responsive-text bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent">
                    {currentMenuItem?.title || "Sección"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4 p-3 sm:p-4 lg:p-6 pt-0">
                  <p className="text-xs sm:text-sm text-gray-600">
                    Esta sección está en desarrollo. Pronto tendrás acceso a todas las funcionalidades. ✨
                  </p>
                  <Button
                    onClick={() => handleMenuClick("dashboard", "Dashboard")}
                    className="w-full text-sm bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white border-0"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Volver al Dashboard
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="app-container bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50 min-h-screen">
      {/* Desktop Layout */}
      <div className="hidden md:flex h-full w-full">
        <SidebarProvider>
          <Sidebar className="flex-shrink-0 backdrop-blur-sm bg-white/80 border-0 shadow-xl">
            <SidebarHeader>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex aspect-square size-10 items-center justify-center rounded-xl flex-shrink-0 overflow-hidden">
                  <Image src="/icono.png" alt="NEXFIT" width={40} height={40} quality={100} />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                  <div className="flex items-center">
                    <span className="font-bold text-orange-500">NEX</span>
                    <span className="font-bold text-gray-600">FIT</span>
                  </div>
                  <span className="truncate text-xs text-gray-500">Dashboard</span>
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel className="text-gray-600">Navegación</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {menuItems.map((item) => {
                      const IconComponent = item.icon
                      const isDisabled = 'disabled' in item && item.disabled === true
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            isActive={selectedSection === item.url}
                            onClick={() => {
                              if (isDisabled) {
                                toast({
                                  title: "🚧 Próximamente",
                                  description: `${item.title} estará disponible en próximas versiones.`,
                                })
                              } else {
                                handleMenuClick(item.url, item.title)
                              }
                            }}
                            className={`transition-all duration-300 ${
                              isDisabled 
                                ? "opacity-50 cursor-not-allowed" 
                                : "hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50"
                            }`}
                          >
                            <button 
                              className="w-full flex items-center gap-2 min-w-0"
                              disabled={isDisabled}
                            >
                              <IconComponent className="h-4 w-4" />
                              <span className="truncate">{item.title}</span>
                              {isDisabled && (
                                <span className="text-xs text-muted-foreground ml-auto">🚧</span>
                              )}
                            </button>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
              <SidebarMenu>
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton className="cursor-pointer hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 transition-all duration-300">
                        <Avatar className="h-6 w-6 flex-shrink-0 ring-2 ring-teal-200">
                          <AvatarImage 
                            src={
                              user?.profile_picture_url || 
                              user?.profile_picture || 
                              undefined
                            } 
                          />
                          <AvatarFallback className="bg-gradient-to-br from-teal-400 to-cyan-500 text-white text-xs">
                            {user?.first_name?.[0] || ''}{user?.last_name?.[0] || '' || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">
                          {user?.first_name && user?.last_name 
                            ? `${user.first_name} ${user.last_name}` 
                            : user?.first_name || 'Usuario'}
                        </span>
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="top" className="w-56 backdrop-blur-sm bg-white/90 border-0 shadow-xl">
                      <DropdownMenuItem
                        onClick={() => handleMenuClick("profile", "Mi Perfil")}
                        className="hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50"
                      >
                        <User className="mr-2 h-4 w-4" />
                        Mi Perfil
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleMenuClick("settings", "Configuración")}
                        className="hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Configuración
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={async () => {
                          try {
                            await logout()
                            toast({ title: "👋 Cerrar Sesión", description: "Sesión cerrada correctamente" })
                          } catch (error) {
                            toast({ 
                              title: "❌ Error", 
                              description: "Error al cerrar sesión",
                              variant: "destructive"
                            })
                          }
                        }}
                        className="hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Cerrar Sesión
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>

          <SidebarInset className="flex flex-col h-full flex-1 min-w-0">
            {/* Desktop Header */}
            <header className="flex h-16 shrink-0 items-center gap-2 border-b border-white/20 px-4 w-full backdrop-blur-sm bg-white/80">
              <SidebarTrigger className="-ml-1 flex-shrink-0 hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 rounded-lg transition-all duration-300" />
              <div className="responsive-flex flex-1 items-center justify-between min-w-0">
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg font-semibold responsive-text bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                    ¡Hola, {user?.first_name || 'Usuario'}! 👋
                  </h1>
                  <p className="text-sm text-gray-600 responsive-text">
                    Día {userStats?.daysInTransformation || 1} de tu transformación ✨
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Suspense fallback={<div className="w-10 h-10 animate-pulse bg-gray-200 rounded-full"></div>}>
                    <NotificationsDropdown />
                  </Suspense>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Avatar className="cursor-pointer hover:ring-4 hover:ring-teal-200 transition-all duration-300">
                        <AvatarImage 
                          src={
                            user?.profile_picture_url || 
                            user?.profile_picture || 
                            undefined
                          } 
                        />
                        <AvatarFallback className="bg-gradient-to-br from-teal-400 to-cyan-500 text-white">
                          {user?.first_name?.[0] || ''}{user?.last_name?.[0] || '' || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 backdrop-blur-sm bg-white/90 border-0 shadow-xl">
                      <DropdownMenuItem
                        onClick={() => handleMenuClick("profile", "Mi Perfil")}
                        className="hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50"
                      >
                        <User className="mr-2 h-4 w-4" />
                        Mi Perfil
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleMenuClick("settings", "Configuración")}
                        className="hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Configuración
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={async () => {
                          try {
                            await logout()
                            toast({ title: "👋 Cerrar Sesión", description: "Sesión cerrada correctamente" })
                          } catch (error) {
                            toast({ 
                              title: "❌ Error", 
                              description: "Error al cerrar sesión",
                              variant: "destructive"
                            })
                          }
                        }}
                        className="hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Cerrar Sesión
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </header>

            {/* Desktop Main Content */}
            <main className="flex-1 min-h-0 w-full">
              <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-2 animate-pulse">
                      <Image src="/icono.png" alt="NEXFIT" width={64} height={64} quality={100} />
                    </div>
                    <p className="text-gray-600">Cargando...</p>
                  </div>
                </div>
              }>
                {renderContent()}
              </Suspense>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden flex flex-col h-full w-full">
        {/* Mobile Header */}
        <Suspense fallback={<div className="h-16 bg-white border-b"></div>}>
          <MobileHeader
            notifications={notifications}
            onNotificationClick={handleNotificationClick}
            selectedSection={selectedSection}
          />
        </Suspense>

        {/* Mobile Main Content */}
        <main className="flex-1 min-h-0 w-full pb-20">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-2 animate-pulse">
                  <Image src="/icono.png" alt="NEXFIT" width={64} height={64} quality={100} />
                </div>
                <p className="text-gray-600">Cargando...</p>
              </div>
            </div>
          }>
            {renderContent()}
          </Suspense>
        </main>

        {/* Mobile Bottom Navigation */}
        <Suspense fallback={<div className="h-20 bg-white border-t"></div>}>
          <MobileNavigation selectedSection={selectedSection} onSectionChange={handleMenuClick} />
        </Suspense>
      </div>
    </div>
  )
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
