"use client"

import { useState, useEffect, lazy, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Users, Search, MoreHorizontal, Edit, Trash2, UserX, UserCheck, Download, Plus, ArrowLeft, ArrowRight, User, Settings, Dumbbell, Loader2, AlertCircle, Shield, Key, Crown, Star, Apple, Bell } from "lucide-react"
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
const NutritionManagement = lazy(() => import("./components/nutrition-management").then(module => ({ default: module.NutritionManagement })))
const NutritionPlanManagement = lazy(() => import("./components/nutrition-plan-management").then(module => ({ default: module.NutritionPlanManagement })))
const UserNutritionPlanManagement = lazy(() => import("./components/user-nutrition-plan-management").then(module => ({ default: module.UserNutritionPlanManagement })))
const DefaultPlanConfigurationsPanel = lazy(() => import("./components/default-plan-configurations").then(module => ({ default: module.DefaultPlanConfigurationsPanel })))
const NotificationsPanel = lazy(() => import("./components/notifications-panel").then(module => ({ default: module.AdminNotificationsPanel })))
const AdminDashboard = lazy(() => import("@/components/admin/admin-dashboard").then(module => ({ default: module.AdminDashboard })))

import { useAdminUsers, AdminUser } from "@/hooks/use-admin-users"
export default function AdminPage() {
  return (
    <AdminRouteGuard>
      <AdminPageContent />
    </AdminRouteGuard>
  )
}

function AdminPageContent() {
  const router = useRouter()
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
  
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [showNewUserForm, setShowNewUserForm] = useState(false)
  const [activeSection, setActiveSection] = useState<
    | 'dashboard'
    | 'users'
    | 'profile'
    | 'exercises'
    | 'workout-plans'
    | 'nutrition'
    | 'nutrition-plans'
    | 'user-nutrition-plans'
    | 'default-plan-configurations'
    | 'notifications'
  >('dashboard')
  const [isLoading, setIsLoading] = useState(false)
  
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


  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && user.is_active) ||
      (statusFilter === "inactive" && !user.is_active)
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    
    return matchesSearch && matchesStatus && matchesRole
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
  }, [searchTerm, statusFilter, roleFilter])

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
        is_active: editingUser.is_active
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
        description: `El rol de ${roleChangeModal.user.first_name} ha sido cambiado a ${roleChangeModal.newRole}`,
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
        description: `La contraseña de ${passwordResetModal.user.first_name} ha sido cambiada`,
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
            description: `${user.first_name} ${user.last_name} ha sido desactivado`,
          })
          break
        case "activate":
          await updateUser(userId, { is_active: true })
          toast({
            title: "✅ Usuario activado",
            description: `${user.first_name} ${user.last_name} ha sido activado`,
          })
          break
        case "delete":
          await bulkDelete([userId])
          toast({
            title: "🗑️ Usuario eliminado",
            description: `${user.first_name} ${user.last_name} ha sido eliminado`,
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
      ? <Badge className="bg-green-100 text-green-800 border-0">Activo</Badge>
      : <Badge className="bg-red-100 text-red-800 border-0">Inactivo</Badge>
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-purple-100 text-purple-800 border-0">Admin</Badge>
      case "premium":
        return <Badge className="bg-yellow-100 text-yellow-800 border-0">Premium</Badge>
      case "pro":
        return <Badge className="bg-blue-100 text-blue-800 border-0">Pro</Badge>
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

  if (showNewUserForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50 p-4">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="text-gray-600">Cargando formulario...</p>
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
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg font-semibold text-gray-700">Cargando datos de usuarios...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p className="mt-4 text-lg font-semibold text-gray-700">Error al cargar datos</p>
            <p className="text-sm text-gray-500 mt-2">{error}</p>
            <Button onClick={refetch} className="mt-4">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/auth")}
              className="hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                Panel de Administrador
              </h1>
              <p className="text-gray-600">Gestiona usuarios y configuraciones del sistema</p>
            </div>
          </div>
          {activeSection === 'users' && (
            <Button
              onClick={() => setShowNewUserForm(true)}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
              disabled={isLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Usuario
            </Button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="relative flex items-center justify-center">
          <Button
            variant="outline"
            size="icon"
            className="hidden md:flex h-9 w-9 absolute left-0 -translate-x-1/2 top-1/2 -translate-y-1/2 border border-gray-200 bg-white shadow hover:bg-gray-100 z-20"
            onClick={() => handleNavScroll("left")}
            aria-label="Desplazar navegación a la izquierda"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="w-full">
            <div className="relative rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-1 left-3 w-8 bg-gradient-to-r from-white/90 to-transparent rounded-l-2xl hidden md:block" />
              <div className="pointer-events-none absolute inset-y-1 right-3 w-8 bg-gradient-to-l from-white/90 to-transparent rounded-r-2xl hidden md:block" />
              <div className="px-12">
                <div
                  id="admin-nav-scroll"
                  className="flex overflow-x-auto scrollbar-hide py-1"
                >
                  <div className="flex space-x-1 min-w-max md:min-w-0">
                    <Button
                      variant={activeSection === 'dashboard' ? 'default' : 'ghost'}
                      onClick={() => setActiveSection('dashboard')}
                      className={`flex items-center gap-2 ${
                        activeSection === 'dashboard' 
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' 
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <Settings className="h-4 w-4" />
                      Dashboard
                    </Button>
                    <Button
                      variant={activeSection === 'users' ? 'default' : 'ghost'}
                      onClick={() => setActiveSection('users')}
                      className={`flex items-center gap-2 ${
                        activeSection === 'users' 
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' 
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      Usuarios
                    </Button>
                    <Button
                      variant={activeSection === 'profile' ? 'default' : 'ghost'}
                      onClick={() => setActiveSection('profile')}
                      className={`flex items-center gap-2 ${
                        activeSection === 'profile' 
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' 
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <User className="h-4 w-4" />
                      Mi Perfil
                    </Button>
                    <Button
                      variant={activeSection === 'exercises' ? 'default' : 'ghost'}
                      onClick={() => setActiveSection('exercises')}
                      className={`flex items-center gap-2 ${
                        activeSection === 'exercises' 
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' 
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <Dumbbell className="h-4 w-4" />
                      Ejercicios
                    </Button>
                    <Button
                      variant={activeSection === 'workout-plans' ? 'default' : 'ghost'}
                      onClick={() => setActiveSection('workout-plans')}
                      className={`flex items-center gap-2 ${
                        activeSection === 'workout-plans' 
                          ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white' 
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <Dumbbell className="h-4 w-4" />
                      Planes de Entrenamiento
                    </Button>
                    <Button
                      variant={activeSection === 'nutrition' ? 'default' : 'ghost'}
                      onClick={() => setActiveSection('nutrition')}
                      className={`flex items-center gap-2 ${
                        activeSection === 'nutrition' 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <Apple className="h-4 w-4" />
                      Recetas
                    </Button>
                    <Button
                      variant={activeSection === 'nutrition-plans' ? 'default' : 'ghost'}
                      onClick={() => setActiveSection('nutrition-plans')}
                      className={`flex items-center gap-2 ${
                        activeSection === 'nutrition-plans' 
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' 
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <Apple className="h-4 w-4" />
                      Planes de Menús
                    </Button>
                    <Button
                      variant={activeSection === 'user-nutrition-plans' ? 'default' : 'ghost'}
                      onClick={() => setActiveSection('user-nutrition-plans')}
                      className={`flex items-center gap-2 ${
                        activeSection === 'user-nutrition-plans' 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' 
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      Planes de Usuarios
                    </Button>
                    <Button
                      variant={activeSection === 'default-plan-configurations' ? 'default' : 'ghost'}
                      onClick={() => setActiveSection('default-plan-configurations')}
                      className={`flex items-center gap-2 ${
                        activeSection === 'default-plan-configurations'
                          ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <Crown className="h-4 w-4" />
                      Config. por defecto
                    </Button>
                    <Button
                      variant={activeSection === 'notifications' ? 'default' : 'ghost'}
                      onClick={() => setActiveSection('notifications')}
                      className={`flex items-center gap-2 ${
                        activeSection === 'notifications'
                          ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <Bell className="h-4 w-4" />
                      Notificaciones
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="hidden md:flex h-9 w-9 absolute right-0 translate-x-1/2 top-1/2 -translate-y-1/2 border border-gray-200 bg-white shadow hover:bg-gray-100 z-20"
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
              <p className="text-gray-600">Cargando contenido...</p>
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
          ) : activeSection === 'nutrition' ? (
            <NutritionManagement />
          ) : activeSection === 'nutrition-plans' ? (
            <NutritionPlanManagement />
          ) : activeSection === 'user-nutrition-plans' ? (
            <UserNutritionPlanManagement />
          ) : activeSection === 'default-plan-configurations' ? (
            <DefaultPlanConfigurationsPanel />
          ) : activeSection === 'notifications' ? (
            <NotificationsPanel />
          ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
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
              <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
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
              <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Administradores</CardTitle>
                  <UserX className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {stats?.staff_users || 0}
                  </div>
                </CardContent>
              </Card>
              <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
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
        <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
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
                      className="pl-10 border-2 border-gray-200 focus:border-purple-400"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48 border-2 border-gray-200 focus:border-purple-400">
                      <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Activos</SelectItem>
                      <SelectItem value="inactive">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full sm:w-48 border-2 border-gray-200 focus:border-purple-400">
                      <SelectValue placeholder="Filtrar por rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los roles</SelectItem>
                      <SelectItem value="admin">Administradores</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="basic">Básico</SelectItem>
                    </SelectContent>
                  </Select>
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
                  className="hover:bg-red-50"
                  disabled={isLoading}
                >
                  <UserX className="h-3 w-3 mr-1" />
                  Desactivar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkRoleChange("basic")}
                  className="hover:bg-gray-50"
                  disabled={isLoading}
                >
                  <Crown className="h-3 w-3 mr-1" />
                  Básico
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkRoleChange("pro")}
                  className="hover:bg-blue-50"
                  disabled={isLoading}
                >
                  <Star className="h-3 w-3 mr-1" />
                  Pro
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkRoleChange("premium")}
                  className="hover:bg-yellow-50"
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

            {/* Users Table */}
            <div className="border rounded-lg overflow-hidden backdrop-blur-sm bg-white/50">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-slate-50">
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
                      <th className="p-3 text-left font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="border-t hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-violet-50/50 transition-all duration-200"
                      >
                        <td className="p-3">
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={() => handleSelectUser(user.id)}
                          />
                        </td>
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{user.first_name} {user.last_name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </td>
                        <td className="p-3">{getStatusBadge(user.is_active)}</td>
                        <td className="p-3">{getRoleBadge(user.role)}</td>
                        <td className="p-3">
                          {user.is_verified 
                            ? <Badge className="bg-green-100 text-green-800 border-0">Sí</Badge>
                            : <Badge className="bg-gray-100 text-gray-800 border-0">No</Badge>
                          }
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {user.age ? `${user.age} años` : 'N/A'}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">{formatDate(user.date_joined)}</td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {user.last_login ? formatDate(user.last_login) : 'Nunca'}
                        </td>
                        <td className="p-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="hover:bg-purple-50">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="backdrop-blur-sm bg-white/90 border-0 shadow-xl"
                            >
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => handleEditUser(user)}
                                    className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50"
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleChangeRole(user.id)}
                                    className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-violet-50"
                                  >
                                    <Crown className="h-4 w-4 mr-2" />
                                    Cambiar Rol
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleToggleVerification(user.id)}
                                    className="hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50"
                                  >
                                    <Shield className="h-4 w-4 mr-2" />
                                    {user.is_verified ? 'Desverificar' : 'Verificar'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleResetPassword(user.id)}
                                    className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50"
                                  >
                                    <Key className="h-4 w-4 mr-2" />
                                    Resetear Contraseña
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {user.is_active ? (
                                    <DropdownMenuItem
                                      onClick={() => handleUserAction(user.id, "deactivate")}
                                      className="hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50"
                                    >
                                      <UserX className="h-4 w-4 mr-2" />
                                      Desactivar
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() => handleUserAction(user.id, "activate")}
                                      className="hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50"
                                    >
                                      <UserCheck className="h-4 w-4 mr-2" />
                                      Activar
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => handleUserAction(user.id, "delete")}
                                    className="text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50"
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
              <div className="border-t p-4 flex items-center justify-between">
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
            )}
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md backdrop-blur-sm bg-white/90 border-0 shadow-xl">
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
                      className="border-2 border-gray-200 focus:border-purple-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-last-name">Apellido</Label>
                    <Input
                      id="edit-last-name"
                      value={editingUser.last_name}
                      onChange={(e) => setEditingUser({ ...editingUser, last_name: e.target.value })}
                      className="border-2 border-gray-200 focus:border-purple-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-role">Rol</Label>
                    <Select
                      value={editingUser.role}
                      onValueChange={(value) =>
                        setEditingUser({ ...editingUser, role: value as "admin" | "basic" | "pro" | "premium" })
                      }
                    >
                      <SelectTrigger className="border-2 border-gray-200 focus:border-purple-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuario</SelectItem>
                        <SelectItem value="trainer">Entrenador</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
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
          <DialogContent className="backdrop-blur-sm bg-white/95 border-0 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-purple-600" />
                Cambiar Rol de Usuario
              </DialogTitle>
              <DialogDescription>
                Selecciona el nuevo rol para {roleChangeModal.user?.first_name} {roleChangeModal.user?.last_name}
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
                    <SelectItem value="basic">Usuario Básico</SelectItem>
                    <SelectItem value="pro">Usuario Pro</SelectItem>
                    <SelectItem value="premium">Usuario Premium</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Descripción del rol:</h4>
                <p className="text-sm text-gray-600">
                  {roleChangeModal.newRole === 'basic' && 'Acceso básico a entrenamientos y nutrición'}
                  {roleChangeModal.newRole === 'pro' && 'Acceso avanzado con entrenamientos ilimitados'}
                  {roleChangeModal.newRole === 'premium' && 'Acceso completo con entrenador personal y análisis avanzado'}
                  {roleChangeModal.newRole === 'admin' && 'Acceso total al sistema y panel de administración'}
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
          <DialogContent className="backdrop-blur-sm bg-white/95 border-0 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-600" />
                Resetear Contraseña
              </DialogTitle>
              <DialogDescription>
                Establece una nueva contraseña para {passwordResetModal.user?.first_name} {passwordResetModal.user?.last_name}
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
                  className="border-2 border-gray-200 focus:border-blue-400"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Mínimo 8 caracteres
                </p>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
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
