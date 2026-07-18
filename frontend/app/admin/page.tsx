"use client"

import { useState, useEffect, lazy, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Users, Search, MoreHorizontal, Edit, Trash2, UserX, UserCheck, Download, Plus, ArrowLeft, ArrowRight, User, Settings, Dumbbell, Loader2, AlertCircle, Shield, Key, Crown, Star, Apple, Bell, LogOut, HelpCircle, Eye, Menu, X, Utensils, Camera, Shuffle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Importar AdminRouteGuard de forma eager para proteger la ruta
import { AdminRouteGuard } from "@/components/admin/admin-route-guard"

// Lazy loading de componentes pesados para code splitting
const NewUserForm = lazy(() => import("./components/new-user-form").then(module => ({ default: module.NewUserForm })))
const AdminProfile = lazy(() => import("./components/admin-profile").then(module => ({ default: module.AdminProfile })))
// Lazy loading de componentes pesados para code splitting
const ExerciseManagement = lazy(() => import("./components/exercise-management").then(module => ({ default: module.ExerciseManagement })))
const WorkoutPlanManagement = lazy(() => import("./components/workout-plan-management").then(module => ({ default: module.WorkoutPlanManagement })))
const RecipeManagement = lazy(() => import("./components/recipe-management").then(module => ({ default: module.RecipeManagement })))
const FoodManagement = lazy(() => import("./components/food-management").then(module => ({ default: module.FoodManagement })))
const EquivalenceManagement = lazy(() => import("./components/equivalence-management").then(module => ({ default: module.EquivalenceManagement })))
const MenuPlanManagementV2 = lazy(() => import("./components/menu-plan-management-v2").then(module => ({ default: module.MenuPlanManagementV2 })))
const UserNutritionPlanManagement = lazy(() => import("./components/user-nutrition-plan-management").then(module => ({ default: module.UserNutritionPlanManagement })))
const DefaultPlanConfigurationsPanel = lazy(() => import("./components/default-plan-configurations-v2").then(module => ({ default: module.DefaultPlanConfigurationsPanelV2 })))
const NotificationsPanel = lazy(() => import("./components/notifications-panel").then(module => ({ default: module.AdminNotificationsPanel })))
const HelpSettingsPanel = lazy(() => import("./components/help-settings-panel").then(module => ({ default: module.HelpSettingsPanel })))
const CoachingManagement = lazy(() => import("./components/coaching-management").then(module => ({ default: module.CoachingManagement })))
const AdminDashboard = lazy(() => import("@/components/admin/admin-dashboard").then(module => ({ default: module.AdminDashboard })))
const CommunityRecipesManagement = lazy(() => import("./components/community-recipes-management").then(module => ({ default: module.CommunityRecipesManagement })))

import { useAdminUsers, AdminUser } from "@/hooks/use-admin-users"
import { fixEncoding } from "@/lib/encoding-fix"
import { useAuth } from "@/contexts/auth-context"
import { buildApiUrl, getAuthHeaders } from "@/lib/api"

export default function AdminPage() {
  return (
    <AdminRouteGuard>
      <SafeAdminContent />
    </AdminRouteGuard>
  )
}

// Wrapper seguro que verifica permisos antes de renderizar el contenido
function SafeAdminContent() {
  const { user, isLoading } = useAuth()

  // Verificar permisos
  const userRole = (user?.role || '').toLowerCase()
  const isAdmin = user && (user.is_superuser || user.is_staff || userRole === 'admin' || userRole === 'trainer')

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg font-semibold text-foreground">Verificando permisos...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Solo renderizar AdminPageContent si es admin
  if (!isAdmin) {
    return null  // El AdminRouteGuard ya maneja la redirección
  }

  return <AdminPageContent />
}

function AdminPageContent() {
  const router = useRouter()
  const { logout } = useAuth()
  const {
    users,
    stats,
    loading,
    error,
    createUser,
    updateUser,
    bulkUpdateStatus,
    bulkDelete,
    changeUserRole,
    toggleUserVerification,
    resetUserPassword,
    bulkChangeRole,
    refetch
  } = useAdminUsers()

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/auth')
      toast({
        title: "✅ Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      })
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Error al cerrar sesión",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    const checkBirthdayAlerts = async () => {
      try {
        await fetch(buildApiUrl("notifications/send_birthday_alerts/"), {
          method: "POST",
          headers: getAuthHeaders(),
        })
      } catch {
      }
    }

    checkBirthdayAlerts()
  }, [])

  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [onlyPremiumWithPending, setOnlyPremiumWithPending] = useState(false)
  const [premiumAlertVisibility, setPremiumAlertVisibility] = useState({
    notifications: true,
    profileChanges: true,
    workoutFeedback: true,
  })
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [showNewUserForm, setShowNewUserForm] = useState(false)
  const [activeSection, setActiveSection] = useState<
    | 'dashboard'
    | 'users'
    | 'profile'
    | 'exercises'
    | 'workout-plans'
    | 'foods'
    | 'equivalences'
    | 'nutrition'
    | 'nutrition-plans'
    | 'user-nutrition-plans'
    | 'default-plan-configurations'
    | 'notifications'
    | 'community-recipes'
    | 'coaching'
    | 'help-settings'
  >('dashboard')
  const [isLoading, setIsLoading] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Estados para modales
  const [roleChangeModal, setRoleChangeModal] = useState<{ open: boolean; user: AdminUser | null; newRole: string }>({
    open: false,
    user: null,
    newRole: ''
  })
  const [passwordResetModal, setPasswordResetModal] = useState<{ open: boolean; user: AdminUser | null; newPassword: string }>({
    open: false,
    user: null,
    newPassword: ''
  })


  // Asegurar que users sea un array antes de filtrar
  const usersArray = Array.isArray(users) ? users : []

  const getVisiblePremiumAlertCount = (user: AdminUser) => {
    if (user.role !== 'premium' || !user.premium_alerts) return 0

    let total = 0
    if (premiumAlertVisibility.notifications) {
      total += user.premium_alerts.unread_notifications || 0
    }
    if (premiumAlertVisibility.profileChanges) {
      total += user.premium_alerts.recent_profile_changes || 0
    }
    if (premiumAlertVisibility.workoutFeedback) {
      total += user.premium_alerts.recent_workout_feedback || 0
    }

    return total
  }

  const premiumUsersWithVisibleAlerts = usersArray.filter((user) => getVisiblePremiumAlertCount(user) > 0).length
  const premiumVisibleAlertsTotal = usersArray.reduce((acc, user) => acc + getVisiblePremiumAlertCount(user), 0)

  const filteredUsers = usersArray.filter((user) => {
    if (!user) return false
    const matchesSearch =
      `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "active" && user.is_active) ||
      (statusFilter === "inactive" && !user.is_active)

    const matchesRole = roleFilter === "all" || user.role === roleFilter

    const matchesPremiumPending =
      !onlyPremiumWithPending ||
      (user.role === "premium" && getVisiblePremiumAlertCount(user) > 0)

    return matchesSearch && matchesStatus && matchesRole && matchesPremiumPending
  })

  // Calcular paginación
  const totalUsers = users.length
  const totalPages = Math.ceil(filteredUsers.length / 50) || 1
  const startIndex = (currentPage - 1) * 50
  const endIndex = startIndex + 50
  const currentUsers = filteredUsers.slice(startIndex, endIndex)

  const handleSelectUser = (userId: number) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSelectAll = () => {
    if (selectedUsers.length === currentUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(currentUsers.map((user) => user.id))
    }
  }

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, roleFilter, onlyPremiumWithPending])

  // Cerrar menú móvil cuando se cambia a desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) {
      toast({
        title: "❌ Error",
        description: "Selecciona al menos un usuario",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      switch (action) {
        case "activate":
          await bulkUpdateStatus(selectedUsers, true)
          toast({
            title: "✅ Usuarios activados",
            description: `${selectedUsers.length} usuarios han sido activados`,
          })
          break
        case "deactivate":
          await bulkUpdateStatus(selectedUsers, false)
          toast({
            title: "✅ Usuarios desactivados",
            description: `${selectedUsers.length} usuarios han sido desactivados`,
          })
          break
        case "delete":
          await bulkDelete(selectedUsers)
          toast({
            title: "🗑️ Usuarios eliminados",
            description: `${selectedUsers.length} usuarios han sido eliminados`,
          })
          break
      }
      setSelectedUsers([])
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleNavScroll = (direction: "left" | "right") => {
    const nav = document.getElementById("admin-nav-scroll")
    if (!nav) return
    const offset = direction === "left" ? -240 : 240
    nav.scrollBy({ left: offset, behavior: "smooth" })
  }

  const handleEditUser = (user: AdminUser) => {
    setEditingUser({ ...user })
    setIsEditDialogOpen(true)
  }

  const handleSaveUser = async () => {
    if (!editingUser) return

    setIsLoading(true)
    try {
      await updateUser(editingUser.id, {
        first_name: editingUser.first_name,
        last_name: editingUser.last_name,
        role: editingUser.role,
        is_active: editingUser.is_active,
        phone_number: editingUser.phone_number,
        birth_date: editingUser.birth_date,
        gender: editingUser.gender,
      })

      toast({
        title: "✅ Usuario actualizado",
        description: "Los cambios han sido guardados correctamente",
      })

      setIsEditDialogOpen(false)
      setEditingUser(null)
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al actualizar usuario",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangeRole = async (userId: number) => {
    const user = users.find(u => u.id === userId)
    if (user) {
      setRoleChangeModal({
        open: true,
        user: user,
        newRole: user.role
      })
    }
  }

  const handleToggleVerification = async (userId: number) => {
    try {
      setIsLoading(true)
      await toggleUserVerification(userId)
      toast({
        title: "✅ Verificación actualizada",
        description: "Estado de verificación actualizado correctamente",
      })
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al actualizar verificación",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (userId: number) => {
    const user = users.find(u => u.id === userId)
    if (user) {
      setPasswordResetModal({
        open: true,
        user: user,
        newPassword: ''
      })
    }
  }

  const confirmRoleChange = async () => {
    if (!roleChangeModal.user) return

    try {
      setIsLoading(true)
      await changeUserRole(roleChangeModal.user.id, roleChangeModal.newRole as any)
      toast({
        title: "✅ Rol actualizado",
        description: `El rol de ${fixEncoding(roleChangeModal.user.first_name)} ha sido cambiado a ${roleChangeModal.newRole}`,
      })
      setRoleChangeModal({ open: false, user: null, newRole: '' })
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al cambiar rol",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const confirmPasswordReset = async () => {
    if (!passwordResetModal.user || !passwordResetModal.newPassword) {
      toast({
        title: "❌ Error",
        description: "La contraseña no puede estar vacía",
        variant: "destructive",
      })
      return
    }

    if (passwordResetModal.newPassword.length < 8) {
      toast({
        title: "❌ Error",
        description: "La contraseña debe tener al menos 8 caracteres",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      await resetUserPassword(passwordResetModal.user.id, passwordResetModal.newPassword)
      toast({
        title: "✅ Contraseña actualizada",
        description: `La contraseña de ${fixEncoding(passwordResetModal.user.first_name)} ha sido cambiada`,
      })
      setPasswordResetModal({ open: false, user: null, newPassword: '' })
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al cambiar contraseña",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkRoleChange = async (newRole: 'basic' | 'pro' | 'premium' | 'admin') => {
    if (selectedUsers.length === 0) {
      toast({
        title: "❌ Error",
        description: "Selecciona al menos un usuario",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      await bulkChangeRole(selectedUsers, newRole)
      toast({
        title: "✅ Roles actualizados",
        description: `${selectedUsers.length} usuarios actualizados con rol ${newRole}`,
      })
      setSelectedUsers([])
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al cambiar roles",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUserAction = async (userId: number, action: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    setIsLoading(true)
    try {
      switch (action) {
        case "deactivate":
          await updateUser(userId, { is_active: false })
          toast({
            title: "✅ Usuario desactivado",
            description: `${fixEncoding(user.first_name)} ${fixEncoding(user.last_name)} ha sido desactivado`,
          })
          break
        case "activate":
          await updateUser(userId, { is_active: true })
          toast({
            title: "✅ Usuario activado",
            description: `${fixEncoding(user.first_name)} ${fixEncoding(user.last_name)} ha sido activado`,
          })
          break
        case "delete":
          await bulkDelete([userId])
          toast({
            title: "🗑️ Usuario eliminado",
            description: `${fixEncoding(user.first_name)} ${fixEncoding(user.last_name)} ha sido eliminado`,
          })
          break
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al realizar la acción",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (isActive: boolean) => {
    return isActive
      ? <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-0">Activo</Badge>
      : <Badge className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-0">Inactivo</Badge>
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 border-0">Admin</Badge>
      case "premium":
        return <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-0">Premium</Badge>
      case "pro":
        return <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-0">Plan de Prueba</Badge>
      case "basic":
        return <Badge variant="outline">Básico</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const renderPremiumAlerts = (user: AdminUser) => {
    if (user.role !== 'premium' || !user.premium_alerts) {
      return <span className="text-xs text-muted-foreground">Solo premium</span>
    }

    const visibleCount = getVisiblePremiumAlertCount(user)
    const feedback = user.premium_alerts.latest_workout_feedback

    if (visibleCount === 0) {
      return <Badge variant="outline">Sin alertas visibles</Badge>
    }

    return (
      <div className="space-y-1">
        <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-0">{visibleCount} alerta(s)</Badge>
        <div className="flex flex-wrap gap-1">
          {premiumAlertVisibility.notifications && user.premium_alerts.unread_notifications > 0 ? (
            <Badge variant="outline">Notificaciones: {user.premium_alerts.unread_notifications}</Badge>
          ) : null}
          {premiumAlertVisibility.profileChanges && user.premium_alerts.recent_profile_changes > 0 ? (
            <Badge variant="outline">Cambios perfil: {user.premium_alerts.recent_profile_changes}</Badge>
          ) : null}
          {premiumAlertVisibility.workoutFeedback && user.premium_alerts.recent_workout_feedback > 0 ? (
            <Badge variant="outline">Feedback entreno: {user.premium_alerts.recent_workout_feedback}</Badge>
          ) : null}
        </div>
        {premiumAlertVisibility.workoutFeedback && feedback ? (
          <p className="text-xs text-muted-foreground break-words" title={`${formatDate(feedback.date)}${feedback.rating ? ` · ${feedback.rating}/5` : ''}${feedback.message ? ` · ${feedback.message}` : ''}`}>
            Último feedback {formatDate(feedback.date)}
            {feedback.rating ? ` · ${feedback.rating}/5` : ''}
            {feedback.message ? ` · ${feedback.message}` : ''}
          </p>
        ) : null}
      </div>
    )
  }

  if (showNewUserForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 p-4">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Cargando formulario...</p>
            </div>
          </div>
        }>
          <NewUserForm
            onSave={async (userData) => {
              try {
                await createUser(userData)
                setShowNewUserForm(false)
                toast({
                  title: "✅ Usuario creado",
                  description: "El usuario ha sido creado exitosamente",
                })
              } catch (error) {
                toast({
                  title: "❌ Error",
                  description: error instanceof Error ? error.message : "Error al crear usuario",
                  variant: "destructive",
                })
              }
            }}
            onCancel={() => setShowNewUserForm(false)}
          />
        </Suspense>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg font-semibold text-foreground">Cargando datos de usuarios...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p className="mt-4 text-lg font-semibold text-foreground">Error al cargar datos</p>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
            <Button onClick={refetch} className="mt-4">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Botón hamburguesa para móvil */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                Panel de Administrador
              </h1>
              <p className="text-sm md:text-base text-muted-foreground hidden md:block">Gestiona usuarios y configuraciones del sistema</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            {activeSection === 'users' && (
              <Button
                onClick={() => setShowNewUserForm(true)}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 text-sm md:text-base"
                disabled={isLoading}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Nuevo Usuario</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 text-sm md:text-base"
              size="sm"
            >
              <LogOut className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
              <span className="sm:hidden">Salir</span>
            </Button>
          </div>
        </div>

        {/* Overlay para móvil cuando el menú está abierto */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar lateral para móvil */}
        <div
          className={`fixed top-0 left-0 h-full w-80 bg-gradient-to-br from-white via-gray-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out md:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          <div className="flex flex-col h-full">
            {/* Header del sidebar */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-slate-800 dark:to-slate-800">
              <div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  Panel Admin
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Menú de navegación</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(false)}
                className="hover:bg-gray-200 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navegación del sidebar */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {/* Botón Nuevo Usuario cuando estamos en la sección de usuarios */}
              {activeSection === 'users' && (
                <Button
                  onClick={() => {
                    setShowNewUserForm(true)
                    setIsMobileMenuOpen(false)
                  }}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 mb-2 shadow-md"
                  disabled={isLoading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Usuario
                </Button>
              )}
              {[
                { id: 'dashboard', label: 'Dashboard', icon: Settings, gradient: 'from-blue-500 to-cyan-500' },
                { id: 'users', label: 'Usuarios', icon: Users, gradient: 'from-blue-500 to-cyan-500' },
                { id: 'profile', label: 'Mi Perfil', icon: User, gradient: 'from-blue-500 to-cyan-500' },
                { id: 'exercises', label: 'Ejercicios', icon: Dumbbell, gradient: 'from-orange-500 to-red-500' },
                { id: 'workout-plans', label: 'Planes de Entrenamiento', icon: Dumbbell, gradient: 'from-purple-500 to-violet-500' },
                { id: 'foods', label: 'Alimentos', icon: Utensils, gradient: 'from-amber-500 to-orange-500' },
                { id: 'equivalences', label: 'Equivalencias', icon: Shuffle, gradient: 'from-emerald-500 to-teal-500' },
                { id: 'nutrition', label: 'Recetas', icon: Apple, gradient: 'from-green-500 to-emerald-500' },
                { id: 'community-recipes', label: 'Team SK', icon: Camera, gradient: 'from-teal-500 to-emerald-500' },
                { id: 'nutrition-plans', label: 'Planes de Menús', icon: Apple, gradient: 'from-orange-500 to-amber-500' },
                { id: 'user-nutrition-plans', label: 'Planes de Usuarios', icon: Users, gradient: 'from-blue-500 to-purple-500' },
                { id: 'default-plan-configurations', label: 'Config. por defecto', icon: Crown, gradient: 'from-teal-500 to-cyan-500' },
                { id: 'notifications', label: 'Notificaciones', icon: Bell, gradient: 'from-indigo-500 to-blue-500' },
                { id: 'coaching', label: 'Coaching 1:1', icon: Crown, gradient: 'from-violet-500 to-fuchsia-500' },
                { id: 'help-settings', label: 'Config. Ayuda', icon: HelpCircle, gradient: 'from-blue-500 to-indigo-500' },
              ].map((item) => {
                const IconComponent = item.icon
                const isActive = activeSection === item.id
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? 'default' : 'ghost'}
                    onClick={() => {
                      setActiveSection(item.id as any)
                      setIsMobileMenuOpen(false)
                    }}
                    className={`w-full justify-start gap-3 h-auto py-3 px-4 rounded-lg transition-all ${isActive
                        ? `bg-gradient-to-r ${item.gradient} text-white shadow-md`
                        : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'
                      }`}
                  >
                    <IconComponent className="h-5 w-5 flex-shrink-0" />
                    <span className="text-left font-medium">{item.label}</span>
                    {item.id === 'users' && premiumVisibleAlertsTotal > 0 ? (
                      <Badge className="ml-auto bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-0">
                        {premiumVisibleAlertsTotal}
                      </Badge>
                    ) : null}
                  </Button>
                )
              })}
            </div>

            {/* Footer del sidebar con botón de cerrar sesión */}
            <div className="border-t border-gray-200 dark:border-slate-700 p-4 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-slate-900 dark:to-slate-900">
              <Button
                variant="outline"
                onClick={() => {
                  handleLogout()
                  setIsMobileMenuOpen(false)
                }}
                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - Solo visible en desktop */}
        <div className="relative hidden md:flex items-center justify-center">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 absolute left-0 -translate-x-1/2 top-1/2 -translate-y-1/2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow hover:bg-gray-100 dark:hover:bg-slate-700 z-20"
            onClick={() => handleNavScroll("left")}
            aria-label="Desplazar navegación a la izquierda"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="w-full">
            <div className="relative rounded-2xl border border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/80 backdrop-blur-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-1 left-3 w-8 bg-gradient-to-r from-white/90 dark:from-slate-900/90 to-transparent rounded-l-2xl" />
              <div className="pointer-events-none absolute inset-y-1 right-3 w-8 bg-gradient-to-l from-white/90 dark:from-slate-900/90 to-transparent rounded-r-2xl" />
              <div className="px-12">
                <div
                  id="admin-nav-scroll"
                  className="flex overflow-x-auto scrollbar-hide py-1"
                >
                  <div className="flex space-x-1 min-w-max md:min-w-0">
                    <Button
                      variant={activeSection === 'dashboard' ? 'default' : 'ghost'}
                      onClick={() => setActiveSection('dashboard')}
                      className={`flex items-center gap-2 ${activeSection === 'dashboard'
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      <Settings className="h-4 w-4" />
                      Dashboard
                    </Button>
                    <Button
                      variant={activeSection === 'users' ? 'default' : 'ghost'}
                      onClick={() => setActiveSection('users')}
                      className={`flex items-center gap-2 ${activeSection === 'users'
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      <Users className="h-4 w-4" />
                      Usuarios
                      {premiumVisibleAlertsTotal > 0 ? (
                        <Badge className="ml-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-0">
                          {premiumVisibleAlertsTotal}
                        </Badge>
                      ) : null}
                    </Button>
                    <Button
                      variant={activeSection === 'profile' ? 'default' : 'ghost'}
                      onClick={() => setActiveSection('profile')}
                      className={`flex items-center gap-2 ${activeSection === 'profile'
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      <User className="h-4 w-4" />
                      Mi Perfil
                    </Button>
                    <Button
                      variant={activeSection === 'exercises' ? 'default' : 'ghost'}
                      onClick={() => setActiveSection('exercises')}
                      className={`flex items-center gap-2 ${activeSection === 'exercises'
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      <Dumbbell className="h-4 w-4" />
                      Ejercicios
                    </Button>
                    <Button
                      variant={activeSection === 'workout-plans' ? 'default' : 'ghost'}
                      onClick={() => setActiveSection('workout-plans')}
                      className={`flex items-center gap-2 ${activeSection === 'workout-plans'
                          ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      <Dumbbell className="h-4 w-4" />
                      Planes de Entrenamiento
                    </Button>
                    <Button
                      variant={activeSection === 'foods' ? 'default' : 'ghost'}
                      onClick={() => setActiveSection('foods')}
                      className={`flex items-center gap-2 ${activeSection === 'foods'
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      <Utensils className="h-4 w-4" />
                      Alimentos
                    </Button>
                    <Button
                      variant={activeSection === 'equivalences' ? 'default' : 'ghost'}
                      onClick={() => setActiveSection('equivalences')}
                      className={`flex items-center gap-2 ${activeSection === 'equivalences'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      <Shuffle className="h-4 w-4" />
                      Equivalencias
                    </Button>
                    <Button
                      variant={activeSection === 'nutrition' ? 'default' : 'ghost'}
                      onClick={() => setActiveSection('nutrition')}
                      className={`flex items-center gap-2 ${activeSection === 'nutrition'
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      <Apple className="h-4 w-4" />
                      Recetas
                    </Button>
                    <Button
                      variant={activeSection === 'community-recipes' ? 'default' : 'ghost'}
                      onClick={() => setActiveSection('community-recipes')}
                      className={`flex items-center gap-2 ${activeSection === 'community-recipes'
                          ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      <Camera className="h-4 w-4" />
                      Team SK
                    </Button>
                    <Button
                      variant={activeSection === 'nutrition-plans' ? 'default' : 'ghost'}
                      onClick={() => setActiveSection('nutrition-plans')}
                      className={`flex items-center gap-2 ${activeSection === 'nutrition-plans'
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      <Apple className="h-4 w-4" />
                      Planes de Menús
                    </Button>
                    <Button
                      variant={activeSection === 'user-nutrition-plans' ? 'default' : 'ghost'}
                      onClick={() => setActiveSection('user-nutrition-plans')}
                      className={`flex items-center gap-2 ${activeSection === 'user-nutrition-plans'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      <Users className="h-4 w-4" />
                      Planes de Usuarios
                    </Button>
                    <Button
                      variant={activeSection === 'default-plan-configurations' ? 'default' : 'ghost'}
                      onClick={() => setActiveSection('default-plan-configurations')}
                      className={`flex items-center gap-2 ${activeSection === 'default-plan-configurations'
                          ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      <Crown className="h-4 w-4" />
                      Config. por defecto
                    </Button>
                    <Button
                      variant={activeSection === 'notifications' ? 'default' : 'ghost'}
                      onClick={() => setActiveSection('notifications')}
                      className={`flex items-center gap-2 ${activeSection === 'notifications'
                          ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      <Bell className="h-4 w-4" />
                      Notificaciones
                    </Button>
                    <Button
                      variant={activeSection === 'coaching' ? 'default' : 'ghost'}
                      onClick={() => setActiveSection('coaching')}
                      className={`flex items-center gap-2 ${activeSection === 'coaching'
                          ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      <Crown className="h-4 w-4" />
                      Coaching 1:1
                    </Button>
                    <Button
                      variant={activeSection === 'help-settings' ? 'default' : 'ghost'}
                      onClick={() => setActiveSection('help-settings')}
                      className={`flex items-center gap-2 ${activeSection === 'help-settings'
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      <HelpCircle className="h-4 w-4" />
                      Config. Ayuda
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="hidden md:flex h-9 w-9 absolute right-0 translate-x-1/2 top-1/2 -translate-y-1/2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow hover:bg-gray-100 dark:hover:bg-slate-700 z-20"
            onClick={() => handleNavScroll("right")}
            aria-label="Desplazar navegación a la derecha"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Content based on active section */}
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Cargando contenido...</p>
            </div>
          </div>
        }>
          {activeSection === 'dashboard' ? (
            <AdminDashboard />
          ) : activeSection === 'profile' ? (
            <div className="flex justify-center">
              <AdminProfile />
            </div>
          ) : activeSection === 'exercises' ? (
            <ExerciseManagement />
          ) : activeSection === 'workout-plans' ? (
            <WorkoutPlanManagement />
          ) : activeSection === 'foods' ? (
            <FoodManagement />
          ) : activeSection === 'equivalences' ? (
            <EquivalenceManagement />
          ) : activeSection === 'nutrition' ? (
            <RecipeManagement />
          ) : activeSection === 'community-recipes' ? (
            <CommunityRecipesManagement />
          ) : activeSection === 'nutrition-plans' ? (
            <MenuPlanManagementV2 />
          ) : activeSection === 'user-nutrition-plans' ? (
            <UserNutritionPlanManagement />
          ) : activeSection === 'default-plan-configurations' ? (
            <DefaultPlanConfigurationsPanel />
          ) : activeSection === 'notifications' ? (
            <NotificationsPanel />
          ) : activeSection === 'coaching' ? (
            <CoachingManagement />
          ) : activeSection === 'help-settings' ? (
            <HelpSettingsPanel />
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                      {stats?.total_users || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Activos</CardTitle>
                    <UserCheck className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {stats?.active_users || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Admin</CardTitle>
                    <UserX className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {stats?.staff_users || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Nuevos (7 días)</CardTitle>
                    <Badge className="h-4 w-4 bg-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {stats?.new_users_last_7_days || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters and Actions */}
              <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                    Gestión de Usuarios
                  </CardTitle>
                  <CardDescription>Administra todos los usuarios de la plataforma</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Search and Filter */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar usuarios..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 border-2 border-border focus:border-purple-400"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-48 border-2 border-border focus:border-purple-400">
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">Activos</SelectItem>
                        <SelectItem value="inactive">Inactivos</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-full sm:w-48 border-2 border-border focus:border-purple-400">
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los roles</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="pro">Plan de Prueba</SelectItem>
                        <SelectItem value="basic">Básico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-lg border p-3 bg-orange-50/40 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">Alertas premium en panel de usuarios</p>
                        <p className="text-xs text-muted-foreground">
                          Usuarios premium con alertas visibles: {premiumUsersWithVisibleAlerts} · Alertas visibles totales: {premiumVisibleAlertsTotal}
                        </p>
                      </div>
                      {premiumVisibleAlertsTotal > 0 ? (
                        <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-0">Pendientes para revisión</Badge>
                      ) : (
                        <Badge variant="outline">Sin pendientes premium</Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-1">
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={onlyPremiumWithPending}
                          onCheckedChange={(checked) => setOnlyPremiumWithPending(checked === true)}
                        />
                        Mostrar solo premium con pendientes
                      </label>
                      {onlyPremiumWithPending ? <Badge variant="secondary">Filtro premium activo</Badge> : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={premiumAlertVisibility.notifications}
                          onCheckedChange={(checked) =>
                            setPremiumAlertVisibility((prev) => ({ ...prev, notifications: checked === true }))
                          }
                        />
                        Notificaciones nuevas
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={premiumAlertVisibility.profileChanges}
                          onCheckedChange={(checked) =>
                            setPremiumAlertVisibility((prev) => ({ ...prev, profileChanges: checked === true }))
                          }
                        />
                        Cambios de perfil (7 días)
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={premiumAlertVisibility.workoutFeedback}
                          onCheckedChange={(checked) =>
                            setPremiumAlertVisibility((prev) => ({ ...prev, workoutFeedback: checked === true }))
                          }
                        />
                        Valoración y mensaje entreno (14 días)
                      </label>
                    </div>
                  </div>

                  {/* Bulk Actions */}
                  {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200">
                      <span className="text-sm font-medium">{selectedUsers.length} usuario(s) seleccionado(s):</span>
                      <Button
                        size="sm"
                        onClick={() => handleBulkAction("activate")}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
                        disabled={isLoading}
                      >
                        <UserCheck className="h-3 w-3 mr-1" />
                        Activar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkAction("deactivate")}
                        className="hover:bg-red-500/10"
                        disabled={isLoading}
                      >
                        <UserX className="h-3 w-3 mr-1" />
                        Desactivar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkRoleChange("basic")}
                        className="hover:bg-muted"
                        disabled={isLoading}
                      >
                        <Crown className="h-3 w-3 mr-1" />
                        Básico
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkRoleChange("pro")}
                        className="hover:bg-blue-500/10"
                        disabled={isLoading}
                      >
                        <Star className="h-3 w-3 mr-1" />
                        Plan de Prueba
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkRoleChange("premium")}
                        className="hover:bg-yellow-500/10"
                        disabled={isLoading}
                      >
                        <Crown className="h-3 w-3 mr-1" />
                        Premium
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleBulkAction("delete")}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Eliminar
                      </Button>
                      <Button size="sm" variant="outline" disabled={isLoading}>
                        <Download className="h-3 w-3 mr-1" />
                        Exportar
                      </Button>
                    </div>
                  )}

                  {/* Users List - Mobile Cards / Desktop Table */}
                  <div className="border rounded-lg overflow-hidden relative" style={{ isolation: 'isolate' }}>
                    {/* Mobile View - Cards */}
                    <div className="md:hidden space-y-3 p-3">
                      {/* Select All Header */}
                      <div className="flex items-center justify-between pb-2 border-b">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedUsers.length === currentUsers.length && currentUsers.length > 0}
                            onCheckedChange={() => {
                              if (selectedUsers.length === currentUsers.length) {
                                setSelectedUsers([])
                              } else {
                                setSelectedUsers(currentUsers.map((user) => user.id))
                              }
                            }}
                          />
                          <span className="text-sm font-medium text-muted-foreground">
                            Seleccionar todos
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {selectedUsers.length} seleccionados
                        </span>
                      </div>

                      {/* User Cards */}
                      {currentUsers.map((user) => (
                        <Card
                          key={user.id}
                          className={`border-2 transition-all ${selectedUsers.includes(user.id)
                              ? 'border-purple-500 bg-purple-500/10'
                              : 'border-border hover:border-purple-300 hover:shadow-md'
                            }`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={selectedUsers.includes(user.id)}
                                onCheckedChange={() => handleSelectUser(user.id)}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-base mb-1 truncate">
                                      {fixEncoding(user.first_name)} {fixEncoding(user.last_name)}
                                    </div>
                                    <div className="text-sm text-muted-foreground truncate">
                                      {user.email}
                                    </div>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56">
                                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                      <DropdownMenuItem
                                        onClick={() => router.push(`/admin/user-v2/${user.id}`)}
                                      >
                                        <Eye className="h-4 w-4 mr-2" />
                                        Ver perfil completo
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Editar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleChangeRole(user.id)}>
                                        <Crown className="h-4 w-4 mr-2" />
                                        Cambiar Rol
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleToggleVerification(user.id)}>
                                        <Shield className="h-4 w-4 mr-2" />
                                        {user.is_verified ? 'Desverificar' : 'Verificar'}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleResetPassword(user.id)}>
                                        <Key className="h-4 w-4 mr-2" />
                                        Resetear Contraseña
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      {user.is_active ? (
                                        <DropdownMenuItem
                                          onClick={() => handleUserAction(user.id, "deactivate")}
                                          className="text-orange-600"
                                        >
                                          <UserX className="h-4 w-4 mr-2" />
                                          Desactivar
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem
                                          onClick={() => handleUserAction(user.id, "activate")}
                                          className="text-green-600"
                                        >
                                          <UserCheck className="h-4 w-4 mr-2" />
                                          Activar
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem
                                        onClick={() => handleUserAction(user.id, "delete")}
                                        className="text-red-600"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Eliminar
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  {getStatusBadge(user.is_active)}
                                  {getRoleBadge(user.role)}
                                  {user.is_verified ? (
                    <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-0 text-xs">Verificado</Badge>
                                  ) : (
                                    <Badge className="bg-muted text-muted-foreground border-0 text-xs">No verificado</Badge>
                                  )}
                                </div>

                                <div className="mb-2">
                                  {renderPremiumAlerts(user)}
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-2 border-t">
                                  <div>
                                    <span className="font-medium">Edad:</span> {user.age ? `${user.age} años` : 'N/A'}
                                  </div>
                                  <div>
                                    <span className="font-medium">Registro:</span> {formatDate(user.date_joined)}
                                  </div>
                                  <div>
                                    <span className="font-medium">Último acceso:</span> {user.last_login ? formatDate(user.last_login) : 'Nunca'}
                                  </div>
                                  <div>
                                    <span className="font-medium">Última edición:</span> {user.updated_at ? formatDate(user.updated_at) : '—'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Desktop View - Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="p-3 text-left">
                              <Checkbox
                                checked={selectedUsers.length === currentUsers.length && currentUsers.length > 0}
                                onCheckedChange={() => {
                                  if (selectedUsers.length === currentUsers.length) {
                                    setSelectedUsers([])
                                  } else {
                                    setSelectedUsers(currentUsers.map((user) => user.id))
                                  }
                                }}
                              />
                            </th>
                            <th className="p-3 text-left font-medium">Usuario</th>
                            <th className="p-3 text-left font-medium">Estado</th>
                            <th className="p-3 text-left font-medium">Rol</th>
                            <th className="p-3 text-left font-medium">Verificado</th>
                            <th className="p-3 text-left font-medium">Edad</th>
                            <th className="p-3 text-left font-medium">Fecha de registro</th>
                            <th className="p-3 text-left font-medium">Último acceso</th>
                            <th className="p-3 text-left font-medium">Última edición</th>
                            <th className="p-3 text-left font-medium">Alertas premium</th>
                            <th className="p-3 text-left font-medium">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentUsers.map((user) => (
                            <tr
                              key={user.id}
                              className="border-t hover:bg-muted/30 transition-all duration-200"
                            >
                              <td className="p-3">
                                <Checkbox
                                  checked={selectedUsers.includes(user.id)}
                                  onCheckedChange={() => handleSelectUser(user.id)}
                                />
                              </td>
                              <td className="p-3">
                                <div>
                                  <div className="font-medium">{fixEncoding(user.first_name)} {fixEncoding(user.last_name)}</div>
                                  <div className="text-sm text-muted-foreground">{user.email}</div>
                                </div>
                              </td>
                              <td className="p-3">{getStatusBadge(user.is_active)}</td>
                              <td className="p-3">{getRoleBadge(user.role)}</td>
                              <td className="p-3">
                                {user.is_verified
                                  ? <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-0">Sí</Badge>
                                  : <Badge className="bg-muted text-muted-foreground border-0">No</Badge>
                                }
                              </td>
                              <td className="p-3 text-sm text-muted-foreground">
                                {user.age ? `${user.age} años` : 'N/A'}
                              </td>
                              <td className="p-3 text-sm text-muted-foreground">{formatDate(user.date_joined)}</td>
                              <td className="p-3 text-sm text-muted-foreground">
                                {user.last_login ? formatDate(user.last_login) : 'Nunca'}
                              </td>
                              <td className="p-3 text-sm text-muted-foreground">
                                {user.updated_at ? formatDate(user.updated_at) : '—'}
                              </td>
                              <td className="p-3 text-sm">
                                {renderPremiumAlerts(user)}
                              </td>
                              <td className="p-3">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="hover:bg-purple-500/10">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="shadow-xl"
                                  >
                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                    <DropdownMenuItem
                                      onClick={() => router.push(`/admin/user-v2/${user.id}`)}
                                      className="hover:bg-muted"
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      Ver perfil completo ✨
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleEditUser(user)}
                                      className="hover:bg-muted"
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleChangeRole(user.id)}
                                      className="hover:bg-muted"
                                    >
                                      <Crown className="h-4 w-4 mr-2" />
                                      Cambiar Rol
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleToggleVerification(user.id)}
                                      className="hover:bg-muted"
                                    >
                                      <Shield className="h-4 w-4 mr-2" />
                                      {user.is_verified ? 'Desverificar' : 'Verificar'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleResetPassword(user.id)}
                                      className="hover:bg-muted"
                                    >
                                      <Key className="h-4 w-4 mr-2" />
                                      Resetear Contraseña
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {user.is_active ? (
                                      <DropdownMenuItem
                                        onClick={() => handleUserAction(user.id, "deactivate")}
                                        className="hover:bg-red-500/10"
                                      >
                                        <UserX className="h-4 w-4 mr-2" />
                                        Desactivar
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem
                                        onClick={() => handleUserAction(user.id, "activate")}
                                        className="hover:bg-green-500/10"
                                      >
                                        <UserCheck className="h-4 w-4 mr-2" />
                                        Activar
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      onClick={() => handleUserAction(user.id, "delete")}
                                      className="text-red-600 hover:bg-red-500/10"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Paginación */}
                  {totalPages > 0 && (
                    <div className="border-t p-3 md:p-4">
                      {/* Mobile View - Compact */}
                      <div className="md:hidden space-y-3">
                        <div className="text-xs text-center text-muted-foreground">
                          Página {currentPage} de {totalPages} • {filteredUsers.length} usuarios
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="flex-1 text-xs"
                          >
                            <ArrowLeft className="h-3 w-3 mr-1" />
                            Anterior
                          </Button>
                          <div className="flex items-center gap-1 px-2">
                            {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage === 1) {
                                pageNum = i + 1;
                              } else if (currentPage === totalPages) {
                                pageNum = totalPages - 2 + i;
                              } else {
                                pageNum = currentPage - 1 + i;
                              }

                              if (pageNum < 1 || pageNum > totalPages) return null;

                              return (
                                <Button
                                  key={pageNum}
                                  variant={currentPage === pageNum ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(pageNum)}
                                  className="w-8 h-8 p-0 text-xs"
                                >
                                  {pageNum}
                                </Button>
                              );
                            })}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="flex-1 text-xs"
                          >
                            Siguiente
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </div>

                      {/* Desktop View - Full */}
                      <div className="hidden md:flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Mostrando {((currentPage - 1) * 50) + 1} - {Math.min(currentPage * 50, filteredUsers.length)} de {filteredUsers.length} usuarios
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                          >
                            Primera
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                          >
                            Anterior
                          </Button>

                          {/* Números de página */}
                          {totalPages > 0 && (
                            <div className="flex items-center gap-1">
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                  pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                  pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                  pageNum = totalPages - 4 + i;
                                } else {
                                  pageNum = currentPage - 2 + i;
                                }

                                return (
                                  <Button
                                    key={pageNum}
                                    variant={currentPage === pageNum ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCurrentPage(pageNum)}
                                    className="w-10"
                                  >
                                    {pageNum}
                                  </Button>
                                );
                              })}
                            </div>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Siguiente
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                          >
                            Última
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Edit User Dialog */}
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-md border shadow-xl">
                  <DialogHeader>
                    <DialogTitle>Editar Usuario</DialogTitle>
                    <DialogDescription>Modifica la información del usuario seleccionado</DialogDescription>
                  </DialogHeader>
                  {editingUser && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-first-name">Nombre</Label>
                        <Input
                          id="edit-first-name"
                          value={editingUser.first_name}
                          onChange={(e) => setEditingUser({ ...editingUser, first_name: e.target.value })}
                          className="border-2 border-border focus:border-purple-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-phone">Teléfono</Label>
                        <Input
                          id="edit-phone"
                          value={editingUser.phone_number || ""}
                          onChange={(e) => setEditingUser({ ...editingUser, phone_number: e.target.value })}
                          className="border-2 border-border focus:border-purple-400"
                          placeholder="+34 600 000 000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-birth">Fecha de nacimiento</Label>
                        <Input
                          id="edit-birth"
                          type="date"
                          value={editingUser.birth_date ? editingUser.birth_date.split("T")[0] : ""}
                          onChange={(e) => setEditingUser({ ...editingUser, birth_date: e.target.value })}
                          className="border-2 border-border focus:border-purple-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-gender">Género</Label>
                        <Select
                          value={editingUser.gender || ""}
                          onValueChange={(value) =>
                            setEditingUser({ ...editingUser, gender: value })
                          }
                        >
                          <SelectTrigger className="border-2 border-border focus:border-purple-400">
                            <SelectValue placeholder="Selecciona género" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Masculino</SelectItem>
                            <SelectItem value="female">Femenino</SelectItem>
                            <SelectItem value="other">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-role">Rol</Label>
                        <Select
                          value={editingUser.role}
                          onValueChange={(value) =>
                            setEditingUser({ ...editingUser, role: value as "admin" | "basic" | "pro" | "premium" })
                          }
                        >
                          <SelectTrigger className="border-2 border-border focus:border-purple-400">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Usuario</SelectItem>
                            <SelectItem value="trainer">Entrenador</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="edit-active"
                          checked={editingUser.is_active}
                          onCheckedChange={(checked) =>
                            setEditingUser({ ...editingUser, is_active: checked as boolean })
                          }
                        />
                        <Label htmlFor="edit-active">Usuario activo</Label>
                      </div>
                    </div>
                  )}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveUser}
                      className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white border-0"
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Guardar cambios
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Modal para cambiar rol */}
              <Dialog open={roleChangeModal.open} onOpenChange={(open) => setRoleChangeModal(prev => ({ ...prev, open }))}>
                <DialogContent className="border shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-purple-600" />
                      Cambiar Rol de Usuario
                    </DialogTitle>
                    <DialogDescription>
                      Selecciona el nuevo rol para {fixEncoding(roleChangeModal.user?.first_name || '')} {fixEncoding(roleChangeModal.user?.last_name || '')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="role-select">Nuevo Rol</Label>
                      <Select
                        value={roleChangeModal.newRole}
                        onValueChange={(value) => setRoleChangeModal(prev => ({ ...prev, newRole: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un rol" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Básico</SelectItem>
                          <SelectItem value="pro">Plan de Prueba</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">Descripción del rol:</h4>
                      <p className="text-sm text-muted-foreground">
                        {roleChangeModal.newRole === 'basic' && 'Acceso básico a entrenamientos y nutrición'}
                        {roleChangeModal.newRole === 'pro' && 'Plan de prueba para validar acceso antes de pasar a Básico o Premium'}
                        {roleChangeModal.newRole === 'premium' && 'Acceso completo con entrenador personal y análisis avanzado'}
                        {roleChangeModal.newRole === 'admin' && 'Acceso total al sistema y panel de admin'}
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setRoleChangeModal({ open: false, user: null, newRole: '' })}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={confirmRoleChange}
                      className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white border-0"
                      disabled={isLoading || !roleChangeModal.newRole}
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Cambiar Rol
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Modal para resetear contraseña */}
              <Dialog open={passwordResetModal.open} onOpenChange={(open) => setPasswordResetModal(prev => ({ ...prev, open }))}>
                <DialogContent className="border shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5 text-blue-600" />
                      Resetear Contraseña
                    </DialogTitle>
                    <DialogDescription>
                      Establece una nueva contraseña para {fixEncoding(passwordResetModal.user?.first_name || '')} {fixEncoding(passwordResetModal.user?.last_name || '')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="new-password">Nueva Contraseña</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="Ingresa la nueva contraseña"
                        value={passwordResetModal.newPassword}
                        onChange={(e) => setPasswordResetModal(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="border-2 border-border focus:border-blue-400"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Mínimo 8 caracteres
                      </p>
                    </div>
                    <div className="bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
                      <p className="text-sm text-yellow-800 dark:text-yellow-400">
                        ⚠️ El usuario necesitará usar esta nueva contraseña para iniciar sesión.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPasswordResetModal({ open: false, user: null, newPassword: '' })}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={confirmPasswordReset}
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
                      disabled={isLoading || passwordResetModal.newPassword.length < 8}
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Cambiar Contraseña
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </Suspense>
      </div>
    </div>
  )
}
