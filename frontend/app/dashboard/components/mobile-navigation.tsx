"use client"
import { ChefHat, Dumbbell, Home, Target, User, Sparkles, Heart, Moon, Medal, Settings } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const mobileMenuItems = [
  { title: "Dashboard", icon: Home, url: "dashboard", badge: null },
  { title: "Day 1", icon: Target, url: "day-one", badge: null },
  { title: "Menús / Recetas", icon: ChefHat, url: "meals", badge: null },
  { title: "Entrenamientos", icon: Dumbbell, url: "workouts-3", badge: null },
  { title: "Bienestar", icon: Moon, url: "wellness", badge: null },
  { title: "Mi Perfil", icon: User, url: "profile", badge: null },
  { title: "Logros", icon: Medal, url: "achievements", badge: null },
  { title: "Configuración", icon: Settings, url: "settings", badge: null },
]

interface MobileNavigationProps {
  selectedSection: string
  onSectionChange: (section: string, title: string) => void
}

export function MobileNavigation({ selectedSection, onSectionChange }: MobileNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-pb">
      {/* Backdrop blur */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-lg border-t border-white/20"></div>

      {/* Navigation items */}
      <nav className="relative responsive-flex items-center justify-center px-2 sm:px-4 py-2 sm:py-3 w-full safe-area-pl safe-area-pr">
        <div className="flex items-center justify-around w-full max-w-2xl mx-auto gap-1">
          {mobileMenuItems.map((item, index) => {
            const IconComponent = item.icon
            const isActive = selectedSection === item.url

            return (
              <button
                key={item.url}
                onClick={() => onSectionChange(item.url, item.title)}
                className={cn(
                  "relative flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg transition-all duration-300 group flex-1 min-w-0",
                  isActive
                    ? "bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-600 scale-105"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-slate-50",
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Icon container */}
                <div
                  className={cn(
                    "relative p-1.5 sm:p-2 rounded-full transition-all duration-300 flex-shrink-0",
                    isActive
                      ? "bg-gradient-to-br from-teal-400 to-cyan-500 text-white shadow-lg animate-gentle-pulse"
                      : "group-hover:bg-gradient-to-br group-hover:from-gray-100 group-hover:to-slate-100 group-hover:scale-110",
                  )}
                >
                  <IconComponent className="h-4 w-4 sm:h-5 sm:w-5" />

                  {/* Badge */}
                  {item.badge && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs animate-pulse bg-gradient-to-r from-rose-500 to-pink-500 border-0 text-white">
                      {item.badge}
                    </Badge>
                  )}
                </div>

                {/* Label - Oculto en móvil, solo visible en tablets+ */}
                <span
                  className={cn(
                    "text-[10px] sm:text-xs font-medium mt-0.5 sm:mt-1 transition-all duration-300 truncate w-full text-center hidden md:block",
                    isActive ? "text-teal-600" : "text-gray-500",
                  )}
                >
                  {item.title}
                </span>

                {/* Active indicator */}
                {isActive && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full animate-in zoom-in-50 duration-300"></div>
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
