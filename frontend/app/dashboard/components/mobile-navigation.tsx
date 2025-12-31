"use client"
import { ChefHat, Dumbbell, Home, Target, User, Sparkles, Heart, Moon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const mobileMenuItems = [
  { title: "Inicio", icon: Home, url: "dashboard", badge: null },
  { title: "Day 1", icon: Target, url: "day-one", badge: null },
  { title: "Comidas", icon: ChefHat, url: "meals", badge: null },
  { title: "Entrenar", icon: Dumbbell, url: "workouts-3", badge: null },
  { title: "Bienestar", icon: Moon, url: "wellness", badge: null },
  // TODO: Activar en versiones posteriores
  // { title: "Inspiración", icon: Sparkles, url: "recommendations", badge: null },
  // { title: "Consejos", icon: Heart, url: "tips", badge: null },
  { title: "Perfil", icon: User, url: "profile", badge: null },
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
      <nav className="relative responsive-flex items-center justify-center px-6 sm:px-8 py-3 w-full safe-area-pl safe-area-pr">
        <div className="flex items-center justify-between w-full max-w-md mx-auto">
          {mobileMenuItems.map((item, index) => {
            const IconComponent = item.icon
            const isActive = selectedSection === item.url

            return (
              <button
                key={item.url}
                onClick={() => onSectionChange(item.url, item.title)}
                className={cn(
                  "relative flex flex-col items-center justify-center p-2 sm:p-3 rounded-xl transition-all duration-300 group",
                  isActive
                    ? "bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-600 scale-105"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-slate-50",
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Icon container */}
                <div
                  className={cn(
                    "relative p-2.5 rounded-full transition-all duration-300 flex-shrink-0",
                    isActive
                      ? "bg-gradient-to-br from-teal-400 to-cyan-500 text-white shadow-lg animate-gentle-pulse"
                      : "group-hover:bg-gradient-to-br group-hover:from-gray-100 group-hover:to-slate-100 group-hover:scale-110",
                  )}
                >
                  <IconComponent className="h-5 w-5" />

                  {/* Badge */}
                  {item.badge && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs animate-pulse bg-gradient-to-r from-rose-500 to-pink-500 border-0 text-white">
                      {item.badge}
                    </Badge>
                  )}
                </div>

                {/* Label - Solo visible en tablets+ */}
                <span
                  className={cn(
                    "text-xs font-medium mt-1.5 transition-all duration-300 responsive-text hidden sm:block",
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
