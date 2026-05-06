"use client"

import Image from "next/image"
import { Search, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useState } from "react"
import { NotificationsDropdown } from "./notifications-dropdown"
import { navigateToDashboardSection } from "@/lib/dashboard-navigation"

interface MobileHeaderProps {
  notifications: number
  onNotificationClick: () => void
  selectedSection: string
}

const sectionTitles: Record<string, string> = {
  dashboard: "Inicio",
  "day-one": "Día 1",
  meals: "Menús",
  "workouts-3": "Entrenamientos",
  profile: "Mi Perfil",
}

export function MobileHeader({ notifications, onNotificationClick, selectedSection }: MobileHeaderProps) {
  const router = useRouter()
  const { logout, user } = useAuth()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const handleProfileClick = () => {
    router.push('/dashboard/profile')
  }

  const handleSettingsClick = () => {
    router.push('/dashboard/settings')
  }

  const handleLogout = async () => {
    try {
      await logout()
      toast({ title: "👋 Cerrar sesión", description: "Sesión cerrada correctamente" })
      router.push('/auth')
    } catch (error) {
      toast({ title: "❌ Error", description: "Error al cerrar sesión" })
    }
  }

  const searchOptions = [
    { title: "Inicio", section: "dashboard", description: "Vista general de tu progreso" },
    { title: "Día 1", section: "day-one", description: "Tu punto de partida y transformación" },
    { title: "Menús", section: "meals", description: "Plan de comidas y nutrición" },
    { title: "Entrenamientos", section: "workouts-3", description: "Rutinas de ejercicio" },
    { title: "Mi Perfil", section: "profile", description: "Información personal" },
    { title: "Configuración", section: "settings", description: "Preferencias de la app" },
  ]

  const filteredOptions = searchOptions.filter(option =>
    option.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    option.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSearchSelect = (section: string) => {
    if (section === "settings") {
      router.push('/dashboard/settings')
    } else {
      navigateToDashboardSection(router, section)
    }
    setIsSearchOpen(false)
    setSearchQuery("")
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/20 backdrop-blur-lg bg-white/80 md:hidden safe-area-pt">
      <div className="responsive-flex h-16 items-center justify-between px-4 sm:px-6 w-full safe-area-pl safe-area-pr">
        {/* Left side - Logo/Title */}
        <div className="responsive-flex items-center gap-3 min-w-0 flex-1 pl-2">
          <div className="flex aspect-square size-9 sm:size-10 items-center justify-center rounded-xl flex-shrink-0 overflow-hidden">
            <Image src="/icono.png" alt="NEXFIT" width={40} height={40} quality={100} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-semibold responsive-text">
              {sectionTitles[selectedSection] ? (
                sectionTitles[selectedSection]
              ) : (
                <span>
                  <span className="text-orange-500">NEX</span>
                  <span className="text-gray-600">FIT</span>
                </span>
              )}
            </h1>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 pr-2">
          {/* Search button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 transition-all duration-300"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
          </Button>

          <div onClick={onNotificationClick} className="[&_button]:h-10 [&_button]:w-10 [&_button]:rounded-full">
            <NotificationsDropdown />
          </div>

          {/* Profile menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-9 w-9 cursor-pointer hover:ring-4 hover:ring-teal-200 transition-all duration-300 flex-shrink-0 ml-1">
                <AvatarImage
                  src={
                    user?.profile_picture_url ||
                    user?.profile_picture ||
                    undefined
                  }
                />
                <AvatarFallback className="text-sm font-medium bg-gradient-to-br from-teal-400 to-cyan-500 text-white">
                  {user?.first_name?.[0] || 'U'}{user?.last_name?.[0] || ''}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mr-2 backdrop-blur-sm bg-white/90 border-0 shadow-xl">
              <DropdownMenuItem
                onClick={handleProfileClick}
                className="hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50"
              >
                Mi Perfil
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleSettingsClick}
                className="hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50"
              >
                Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50"
              >
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Modal de búsqueda */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-teal-500/20 via-cyan-500/20 to-blue-500/20 backdrop-blur-sm">
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden border-2 border-teal-100">
              {/* Header del modal */}
              <div className="flex items-center justify-between p-4 border-b border-teal-100 bg-gradient-to-r from-teal-50 to-cyan-50">
                <h3 className="text-lg font-semibold">Buscar en la app</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsSearchOpen(false)
                    setSearchQuery("")
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Campo de búsqueda */}
              <div className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar secciones, funciones..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
              </div>

              {/* Resultados de búsqueda */}
              <div className="px-4 pb-4 max-h-96 overflow-y-auto">
                {searchQuery.trim() === "" ? (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Escribe para buscar secciones y funciones</p>
                  </div>
                ) : filteredOptions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No se encontraron resultados para "{searchQuery}"</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredOptions.map((option, index) => (
                      <button
                        key={option.section}
                        onClick={() => handleSearchSelect(option.section)}
                        className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-medium text-gray-900">{option.title}</div>
                        <div className="text-sm text-gray-500">{option.description}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
