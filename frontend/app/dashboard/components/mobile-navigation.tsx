"use client"
import { ChefHat, Dumbbell, Home, Target, User, Sparkles, Heart, Moon, Medal, Settings } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const mainMenuItems = [
  { title: "Inicio", icon: Home, url: "dashboard", badge: null },
  { title: "Menús / Recetas", icon: ChefHat, url: "meals", badge: null },
  { title: "Entrenamientos", icon: Dumbbell, url: "workouts-3", badge: null },
  { title: "Mi Perfil", icon: User, url: "profile", badge: null },
]

const moreMenuItems = [
  { title: "Día 1", icon: Target, url: "day-one", badge: null },
  { title: "Bienestar", icon: Moon, url: "wellness", badge: null },
  { title: "Logros", icon: Medal, url: "achievements", badge: null },
  { title: "Configuración", icon: Settings, url: "settings", badge: null },
]

interface MobileNavigationProps {
  selectedSection: string
  onSectionChange: (section: string, title: string) => void
}

import { useState } from "react"

export function MobileNavigation({ selectedSection, onSectionChange }: MobileNavigationProps) {
  const [showMore, setShowMore] = useState(false)
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-pb">
      {/* Backdrop blur */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-lg border-t border-white/20"></div>

      {/* Navigation items */}
      <nav className="relative responsive-flex items-center justify-center px-2 sm:px-4 py-2 sm:py-3 w-full safe-area-pl safe-area-pr">
        <div className="flex items-center justify-around w-full max-w-2xl mx-auto gap-1">
          {mainMenuItems.map((item, index) => {
            const IconComponent = item.icon
            const isActive = selectedSection === item.url
            return (
              <button
                key={item.url}
                onClick={() => onSectionChange(item.url, item.title)}
                className={cn(
                  "relative flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-300 group flex-1 min-w-0",
                  isActive
                    ? "bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-600 scale-105"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-slate-50",
                )}
                style={{ animationDelay: `${index * 50}ms` }}
                tabIndex={0}
                aria-label={item.title}
                title={item.title}
              >
                <div
                  className={cn(
                    "relative p-2 rounded-full transition-all duration-300 flex-shrink-0",
                    isActive
                      ? "bg-gradient-to-br from-teal-400 to-cyan-500 text-white shadow-lg animate-gentle-pulse"
                      : "group-hover:bg-gradient-to-br group-hover:from-gray-100 group-hover:to-slate-100 group-hover:scale-110",
                  )}
                >
                  <IconComponent className="h-5 w-5" />
                  {item.badge && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs animate-pulse bg-gradient-to-r from-rose-500 to-pink-500 border-0 text-white">
                      {item.badge}
                    </Badge>
                  )}
                </div>
                {/* Mostrar el texto SOLO si está activo */}
                <span
                  className={cn(
                    "text-[11px] font-medium mt-1 transition-all duration-300 truncate w-full text-center",
                    isActive ? "block text-teal-600" : "hidden"
                  )}
                >
                  {item.title}
                </span>
                {isActive && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full animate-in zoom-in-50 duration-300"></div>
                )}
              </button>
            )
          })}
          {/* Botón Más */}
          <div className="relative flex-1 min-w-0">
            <button
              onClick={() => setShowMore((v) => !v)}
              className={cn(
                "relative flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-300 group w-full min-w-0 text-gray-500 hover:text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-slate-50",
                showMore ? "bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-600 scale-105" : ""
              )}
              tabIndex={0}
              aria-label="Más"
              title="Más"
            >
              <span className="relative p-2 rounded-full transition-all duration-300 flex-shrink-0 bg-gradient-to-br from-gray-100 to-slate-100 group-hover:scale-110">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="4" cy="10" r="2" fill="currentColor" />
                  <circle cx="10" cy="10" r="2" fill="currentColor" />
                  <circle cx="16" cy="10" r="2" fill="currentColor" />
                </svg>
              </span>
              <span className={cn("text-[11px] font-medium mt-1 transition-all duration-300 truncate w-full text-center", showMore ? "block text-teal-600" : "hidden")}>Más</span>
            </button>
            {/* Menú desplegable */}
            {showMore && (
              <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 z-50 animate-in fade-in duration-200">
                {moreMenuItems.map((item) => {
                  const IconComponent = item.icon
                  return (
                    <button
                      key={item.url}
                      onClick={() => {
                        setShowMore(false)
                        onSectionChange(item.url, item.title)
                      }}
                      className={cn(
                        "flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 transition-all duration-200 rounded-xl"
                      )}
                      tabIndex={0}
                      aria-label={item.title}
                      title={item.title}
                    >
                      <IconComponent className="h-4 w-4" />
                      <span>{item.title}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </nav>
    </div>
  )
}
