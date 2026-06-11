"use client"

import { useState, useEffect, useCallback, lazy, Suspense } from "react"
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
  Moon,
  Crown,
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
// DashboardEnhanced se carga de forma normal para evitar problemas de inicialización con auth
import { DashboardEnhanced } from "@/components/dashboard/dashboard-enhanced"
const ProgressDashboard = lazy(() => import("@/components/dashboard/progress-dashboard").then(module => ({ default: module.ProgressDashboard })))
const WorkoutSummary = lazy(() => import("./components/workout-summary").then(module => ({ default: module.WorkoutSummary })))
const WorkoutDashboardEnhanced = lazy(() => import("@/components/dashboard/workout-dashboard-enhanced").then(module => ({ default: module.WorkoutDashboardEnhanced })))
const Achievements = lazy(() => import("./components/achievements").then(module => ({ default: module.Achievements })))
const AchievementsDuolingo = lazy(() => import("./components/achievements-duolingo").then(module => ({ default: module.AchievementsDuolingo })))
const MobileNavigation = lazy(() => import("./components/mobile-navigation").then(module => ({ default: module.MobileNavigation })))
import { MobileHeader } from "./components/mobile-header"
const DayOneSheet = lazy(() => import("./components/day-one-sheet").then(module => ({ default: module.DayOneSheet })))
const SettingsPage = lazy(() => import("./components/settings-page").then(module => ({ default: module.default })))
const ProfilePanel = lazy(() => import("./components/profile-panel").then(module => ({ default: module.ProfilePanel })))
const NotificationsDropdown = lazy(() => import("./components/notifications-dropdown").then(module => ({ default: module.NotificationsDropdown })))
const WorkoutPlansDashboard = lazy(() => import("@/components/workout-plans-dashboard").then(module => ({ default: module.WorkoutPlansDashboard })))
const TipsShowcase = lazy(() => import("@/components/dashboard/tips-showcase").then(module => ({ default: module.TipsShowcase })))
const TipsBoard = lazy(() => import("@/components/tips/tips-board").then(module => ({ default: module.TipsBoard })))
const RecommendationsSection = lazy(() => import("@/components/recommendations/recommendations-section").then(module => ({ default: module.RecommendationsSection })))
const WellnessTracker = lazy(() => import("./components/wellness-tracker").then(module => ({ default: module.WellnessTracker })))
const BodyMeasurements = lazy(() => import("./components/body-measurements").then(module => ({ default: module.BodyMeasurements })))
const CoachingCTA = lazy(() => import("./components/coaching-cta").then(module => ({ default: module.CoachingCTA })))
const QuinzenalReview = lazy(() => import("./components/quinzenal-review").then(module => ({ default: module.QuinzenalReview })))
const SubscriptionStatusCard = lazy(() => import("./components/subscription-status-card").then(module => ({ default: module.SubscriptionStatusCard })))
const RecipeCommunity = lazy(() => import("./components/recipe-community").then(module => ({ default: module.RecipeCommunity })))

import { useAuth } from "@/contexts/auth-context"
import { useUserData } from "@/hooks/use-user-data"
import { useNotificationsEnhanced } from "@/hooks/use-notifications-enhanced"
import { ThemeToggle } from "@/components/theme-toggle"
import { DashboardSectionFallback, AchievementsSectionSkeleton, DayOneSectionSkeleton, FeedGridSkeleton, MealsSectionSkeleton, MeasurementsSectionSkeleton, ProfileSectionSkeleton, RecommendationsSectionSkeleton, SettingsSectionSkeleton, TipsSectionSkeleton, WellnessSectionSkeleton, WorkoutsSectionSkeleton } from "@/components/dashboard/dashboard-skeletons"

const menuItems = [
  { title: "Inicio", icon: Home, url: "dashboard", isActive: true },
  { title: "Día 1", icon: Target, url: "day-one" },
  { title: "Recomendaciones", icon: Sparkles, url: "recommendations" },
  { title: "Ayuda 1:1", icon: Crown, url: "coaching" },
  { title: "Consejos", icon: Heart, url: "tips" },
  { title: "Menús / Recetas", icon: ChefHat, url: "meals" },
  { title: "Team SK", icon: Camera, url: "recipe-community" },
  { title: "Entrenamientos", icon: Dumbbell, url: "workouts-3" },
  { title: "Bienestar", icon: Moon, url: "wellness" },
  { title: "Peso y Medidas", icon: TrendingUp, url: "measurements" },
  { title: "Mi Perfil", icon: User, url: "profile" },
  { title: "Logros", icon: Medal, url: "achievements" },
  { title: "Configuración", icon: Settings, url: "settings" },
]

const PREMIUM_BLOCKED_SECTIONS = new Set(["recommendations", "coaching"])

function DashboardSectionSync({
  selectedSection,
  isPremiumUser,
  onSectionChange,
}: {
  selectedSection: string
  isPremiumUser: boolean
  onSectionChange: (section: string) => void
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const sectionParam = searchParams?.get("section")

    if (sectionParam && isPremiumUser && PREMIUM_BLOCKED_SECTIONS.has(sectionParam)) {
      onSectionChange("dashboard")
      router.replace("/dashboard", { scroll: false })
      return
    }

    if (sectionParam && sectionParam !== selectedSection) {
      onSectionChange(sectionParam)
    } else if (!sectionParam && selectedSection !== "dashboard") {
      onSectionChange("dashboard")
    }
  }, [searchParams, selectedSection, isPremiumUser, router, onSectionChange])

  return null
}

function DashboardContent() {
  const router = useRouter()
  const [selectedSection, setSelectedSection] = useState("dashboard")
  const { user, logout } = useAuth()
  const { userStats } = useUserData()
  const { unreadCount, refresh: refreshNotifications } = useNotificationsEnhanced()
  const userRole = (user?.role || "").toLowerCase()
  const isPremiumUser = userRole === "premium"
  const visibleMenuItems = isPremiumUser
    ? menuItems.filter((item) => !PREMIUM_BLOCKED_SECTIONS.has(item.url))
    : menuItems

  const handleMenuClick = useCallback((section: string, title: string) => {
    if (isPremiumUser && PREMIUM_BLOCKED_SECTIONS.has(section)) {
      setSelectedSection("dashboard")
      router.push("/dashboard", { scroll: false })
      return
    }

    setSelectedSection(section)
    if (section === "dashboard") {
      router.push("/dashboard", { scroll: false })
    } else {
      router.push(`/dashboard?section=${section}`, { scroll: false })
    }
  }, [router, isPremiumUser])

  useEffect(() => {
    const handleSectionChange = (event: Event) => {
      const section = (event as CustomEvent<{ section?: string }>).detail?.section
      if (!section) return
      handleMenuClick(section, section)
    }

    window.addEventListener("sectionChange", handleSectionChange)
    return () => window.removeEventListener("sectionChange", handleSectionChange)
  }, [handleMenuClick])

  const handleNotificationClick = () => {
    refreshNotifications()
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
                {!isPremiumUser ? (
                  <Suspense fallback={null}>
                    <SubscriptionStatusCard />
                  </Suspense>
                ) : null}
                <Suspense fallback={null}>
                  <QuinzenalReview />
                </Suspense>
                {!isPremiumUser ? (
                  <Suspense fallback={null}>
                    <CoachingCTA placement="dashboard-home" cooldownHours={48} />
                  </Suspense>
                ) : null}
                {!isPremiumUser ? (
                  <Suspense fallback={null}>
                    <RecommendationsSection />
                  </Suspense>
                ) : null}
                <Suspense fallback={null}>
                  <TipsShowcase />
                </Suspense>
              </div>



            </div>
          </div>
        )


      case "recommendations":
        if (isPremiumUser) {
          return (
            <div className="fade-in-stagger scroll-area h-full w-full relative">
              <div className="responsive-content p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 relative z-10">
                <DashboardEnhanced />
              </div>
            </div>
          )
        }
        return (
          <div className="fade-in-stagger scroll-area h-full w-full relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-amber-200/20 to-pink-200/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-sky-200/20 to-emerald-200/20 rounded-full blur-3xl animate-pulse delay-700"></div>
            </div>
            <div className="responsive-content p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 relative z-10">
              <Suspense fallback={<RecommendationsSectionSkeleton />}>
                <RecommendationsSection />
              </Suspense>
            </div>
          </div>
        )

      case "coaching":
        if (isPremiumUser) {
          return (
            <div className="fade-in-stagger scroll-area h-full w-full relative">
              <div className="responsive-content p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 relative z-10">
                <DashboardEnhanced />
              </div>
            </div>
          )
        }
        return (
          <div className="fade-in-stagger scroll-area h-full w-full relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-violet-200/20 to-fuchsia-200/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-orange-200/20 to-pink-200/20 rounded-full blur-3xl animate-pulse delay-700"></div>
            </div>
            <div className="responsive-content p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 relative z-10">
              <Suspense fallback={null}>
                <SubscriptionStatusCard />
              </Suspense>
              <Suspense fallback={null}>
                <CoachingCTA fullPage placement="coaching-page" />
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
              <Suspense fallback={<TipsSectionSkeleton />}>
                <TipsBoard />
              </Suspense>
            </div>
          </div>
        )

      case "recipe-community":
        return (
          <div className="fade-in-stagger scroll-area h-full w-full relative">
            <div className="responsive-content p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 relative z-10">
              <Suspense fallback={<FeedGridSkeleton count={4} />}>
                <RecipeCommunity />
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
              <div className="w-full space-y-4 sm:space-y-6">
                <Suspense fallback={<DashboardSectionFallback><MealsSectionSkeleton /></DashboardSectionFallback>}>
                  <MealDashboard />
                </Suspense>
                {!isPremiumUser ? (
                  <Suspense fallback={null}>
                    <CoachingCTA placement="meals" cooldownHours={48} />
                  </Suspense>
                ) : null}
              </div>
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
              <div className="w-full space-y-4 sm:space-y-6">
                <Suspense fallback={<DashboardSectionFallback><WorkoutsSectionSkeleton /></DashboardSectionFallback>}>
                  <WorkoutDashboardEnhanced />
                </Suspense>
                {!isPremiumUser ? (
                  <Suspense fallback={null}>
                    <CoachingCTA placement="workouts" cooldownHours={48} />
                  </Suspense>
                ) : null}
              </div>
            </div>
          </div>
        )

      case "wellness":
        return (
          <div className="fade-in-stagger scroll-area h-full w-full relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-200/20 to-purple-200/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-pink-200/20 to-indigo-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>
            <div className="responsive-content p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 relative z-10">
              <Suspense fallback={<DashboardSectionFallback><WellnessSectionSkeleton /></DashboardSectionFallback>}>
                <WellnessTracker />
              </Suspense>
            </div>
          </div>
        )

      case "measurements":
        return (
          <div className="fade-in-stagger scroll-area h-full w-full relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-teal-200/20 to-cyan-200/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-200/20 to-teal-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>
            <div className="responsive-content p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 relative z-10 space-y-4 sm:space-y-6">
              <Suspense fallback={<MeasurementsSectionSkeleton />}>
                <BodyMeasurements />
              </Suspense>
              {!isPremiumUser ? (
                <Suspense fallback={null}>
                  <CoachingCTA placement="measurements" cooldownHours={48} />
                </Suspense>
              ) : null}
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
              <Suspense fallback={<AchievementsSectionSkeleton />}>
                <AchievementsDuolingo />
              </Suspense>
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
              <Suspense fallback={<DayOneSectionSkeleton />}>
                <DayOneSheet />
              </Suspense>
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
              <Suspense fallback={<SettingsSectionSkeleton />}>
                <SettingsPage />
              </Suspense>
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
              <Suspense fallback={<ProfileSectionSkeleton />}>
                <ProfilePanel />
              </Suspense>
            </div>
          </div>
        )

      default:
        const currentMenuItem = visibleMenuItems.find((item) => item.url === selectedSection)
        const IconComponent = currentMenuItem?.icon || Home

        return (
          <div className="scroll-area h-full w-full relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-gray-200/20 to-slate-200/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-200/20 to-gray-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>
            <div className="responsive-content p-3 sm:p-4 lg:p-6 flex items-center justify-center min-h-full relative z-10">
              <Card className="responsive-card max-w-md border shadow-xl">
                <CardHeader className="text-center p-3 sm:p-4 lg:p-6">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 rounded-2xl flex items-center justify-center animate-bounce mb-4 shadow-lg">
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="flex items-center justify-center gap-2 text-sm sm:text-base lg:text-lg responsive-text bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent">
                    {currentMenuItem?.title || "Sección"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4 p-3 sm:p-4 lg:p-6 pt-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Esta sección está en desarrollo. Pronto tendrás acceso a todas las funcionalidades. ✨
                  </p>
                  <Button
                    onClick={() => handleMenuClick("dashboard", "Inicio")}
                    className="w-full text-sm bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white border-0"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Volver a Inicio
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="app-container bg-background min-h-screen">
      <Suspense fallback={null}>
        <DashboardSectionSync
          selectedSection={selectedSection}
          isPremiumUser={isPremiumUser}
          onSectionChange={setSelectedSection}
        />
      </Suspense>
      {/* Desktop Layout */}
      <div className="hidden md:flex h-full w-full">
        <SidebarProvider>
          <Sidebar className="flex-shrink-0 border shadow-xl">
            <SidebarHeader>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex aspect-square size-10 items-center justify-center rounded-xl flex-shrink-0 overflow-hidden">
                  <Image src="/icono.png" alt="NEXFIT" width={40} height={40} quality={100} />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                  <div className="flex items-center">
                    <span className="font-bold text-orange-500">NEX</span>
                    <span className="font-bold text-muted-foreground">FIT</span>
                  </div>
                  <span className="truncate text-xs text-muted-foreground">Inicio</span>
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel className="text-muted-foreground">Navegación</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibleMenuItems.map((item) => {
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
                            className={`transition-all duration-300 ${isDisabled
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:bg-muted"
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
                      <SidebarMenuButton className="cursor-pointer hover:bg-muted transition-all duration-300">
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
                    <DropdownMenuContent side="top" className="w-56 border shadow-xl bg-card/95 backdrop-blur-sm">
                      <DropdownMenuItem
                        onClick={() => handleMenuClick("profile", "Mi Perfil")}
                        className="hover:bg-muted"
                      >
                        <User className="mr-2 h-4 w-4" />
                        Mi Perfil
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleMenuClick("settings", "Configuración")}
                        className="hover:bg-muted"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Configuración
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={async () => {
                          await logout()
                        }}
                        className="hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Cerrar sesión
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>

          <SidebarInset className="flex flex-col h-full flex-1 min-w-0">
            {/* Desktop Header */}
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 w-full border bg-card/95 backdrop-blur-sm">
              <SidebarTrigger className="-ml-1 flex-shrink-0 hover:bg-muted rounded-lg transition-all duration-300" />
              <div className="responsive-flex flex-1 items-center justify-between min-w-0">
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg font-semibold responsive-text bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                    ¡Hola, {user?.first_name || 'Usuario'}! 👋
                  </h1>
                  <p className="text-sm text-muted-foreground responsive-text">
                    Día {userStats?.daysInTransformation || 1} de tu transformación ✨
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <ThemeToggle className="bg-card/80" />
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
                    <DropdownMenuContent align="end" className="w-56 border shadow-xl bg-card/95 backdrop-blur-sm">
                      <DropdownMenuItem
                        onClick={() => handleMenuClick("profile", "Mi Perfil")}
                        className="hover:bg-muted"
                      >
                        <User className="mr-2 h-4 w-4" />
                        Mi Perfil
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleMenuClick("settings", "Configuración")}
                        className="hover:bg-muted"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Configuración
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={async () => {
                          await logout()
                        }}
                        className="hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Cerrar sesión
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </header>

            {/* Desktop Main Content */}
            <main className="flex-1 min-h-0 w-full">
              {renderContent()}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden flex flex-col h-full w-full">
        {/* Mobile Header */}
        <MobileHeader
          notifications={unreadCount}
          onNotificationClick={handleNotificationClick}
          selectedSection={selectedSection}
        />

        {/* Mobile Main Content */}
        <main id="mobile-scroll-content" className="flex-1 min-h-0 w-full pt-0 pb-28 overflow-y-auto">
          {renderContent()}
        </main>

        {/* Mobile Bottom Navigation */}
        <Suspense fallback={<div className="h-20 bg-card border-t"></div>}>
          <MobileNavigation selectedSection={selectedSection} onSectionChange={handleMenuClick} isPremiumUser={isPremiumUser} />
        </Suspense>
      </div>
    </div>
  )
}

export default function Dashboard() {
  return <DashboardContent />
}
