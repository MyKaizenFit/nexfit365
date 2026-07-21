"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, ChefHat, CloudMoon, Crown, Dumbbell, Heart, Home, Medal, Moon, Settings, Sparkles, Target, TrendingUp, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const mainMenuItems = [
  { title: "Inicio", icon: Home, url: "dashboard", badge: null },
  { title: "Menús / Recetas", icon: ChefHat, url: "meals", badge: null },
  { title: "Entrenamientos", icon: Dumbbell, url: "workouts-3", badge: null },
  { title: "Mi Perfil", icon: User, url: "profile", badge: null },
]

const moreMenuItems = [
  { title: "Día 1", icon: Target, url: "day-one", badge: null, premiumBlocked: false },
  { title: "Recomendaciones", icon: Sparkles, url: "recommendations", badge: null, premiumBlocked: true },
  { title: "Ayuda 1:1", icon: Crown, url: "coaching", badge: null, premiumBlocked: true },
  { title: "Team SK", icon: Camera, url: "recipe-community", badge: null, premiumBlocked: false },
  { title: "Consejos", icon: Heart, url: "tips", badge: null, premiumBlocked: false },
  { title: "Peso y Medidas", icon: TrendingUp, url: "measurements", badge: null, premiumBlocked: false },
  { title: "Bienestar", icon: Moon, url: "wellness", badge: null, premiumBlocked: false },
  { title: "Descanso", icon: CloudMoon, url: "rest-wellness", badge: null, premiumBlocked: false },
  { title: "Logros", icon: Medal, url: "achievements", badge: null, premiumBlocked: false },
  { title: "Configuración", icon: Settings, url: "settings", badge: null, premiumBlocked: false },
]

interface MobileNavigationProps {
  selectedSection: string
  onSectionChange: (section: string, title: string) => void
  isPremiumUser?: boolean
  canAccessRestWellness?: boolean
}

export function MobileNavigation({
  selectedSection,
  onSectionChange,
  isPremiumUser = false,
  canAccessRestWellness = false,
}: MobileNavigationProps) {
  const visibleMoreItems = moreMenuItems.filter((item) => {
    if (item.url === "rest-wellness" && !canAccessRestWellness) return false
    if (isPremiumUser && item.premiumBlocked) return false
    return true
  })
  const [showMore, setShowMore] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  const isMoreSectionActive = visibleMoreItems.some((item) => item.url === selectedSection)
  const activeMoreItem = visibleMoreItems.find((item) => item.url === selectedSection)

  // Auto-hide on scroll down, show on scroll up
  useEffect(() => {
    const scrollEl = document.getElementById("mobile-scroll-content")
    if (!scrollEl) return

    const handleScroll = () => {
      if (ticking.current) return
      ticking.current = true
      requestAnimationFrame(() => {
        const currentY = scrollEl.scrollTop
        if (currentY > lastScrollY.current + 8 && currentY > 60) {
          // Scrolling down: hide nav
          setIsVisible(false)
          setShowMore(false)
        } else if (currentY < lastScrollY.current - 8) {
          // Scrolling up: show nav
          setIsVisible(true)
        }
        lastScrollY.current = currentY
        ticking.current = false
      })
    }

    scrollEl.addEventListener("scroll", handleScroll, { passive: true })
    return () => scrollEl.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (menuRef.current && target && !menuRef.current.contains(target)) {
        setShowMore(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("touchstart", handlePointerDown)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("touchstart", handlePointerDown)
    }
  }, [])

  useEffect(() => {
    setShowMore(false)
  }, [selectedSection])

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 md:hidden safe-area-pb transition-transform duration-300 ease-in-out",
        isVisible ? "translate-y-0" : "translate-y-full"
      )}
    >      {showMore && (
        <button
          type="button"
          aria-label="Cerrar menú de navegación"
          onClick={() => setShowMore(false)}
          className="fixed inset-0 z-40 bg-black/5"
        />
      )}

      {/* Backdrop blur */}
      <div className="absolute inset-0 bg-background/90 backdrop-blur-lg border-t"></div>

      {/* Navigation items */}
      <nav className="relative z-50 responsive-flex items-center justify-center px-2 sm:px-4 py-2 sm:py-3 w-full safe-area-pl safe-area-pr">
        <div className="flex items-center justify-around w-full max-w-2xl mx-auto gap-1">
          {mainMenuItems.map((item, index) => {
            const IconComponent = item.icon
            const isActive = selectedSection === item.url
            return (
              <button
                key={item.url}
                type="button"
                onClick={() => onSectionChange(item.url, item.title)}
                className={cn(
                  "relative flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-300 group flex-1 min-w-0",
                  isActive
                    ? "bg-gradient-to-r bg-teal-500/15 text-teal-600 scale-105"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
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

          <div ref={menuRef} className="relative flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              className={cn(
                "relative flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-300 group w-full min-w-0 text-muted-foreground hover:text-foreground hover:bg-muted",
                showMore || isMoreSectionActive ? "bg-gradient-to-r bg-teal-500/15 text-teal-600 scale-105" : ""
              )}
              tabIndex={0}
              aria-label="Más"
              aria-expanded={showMore}
              title="Más"
            >
              <span className="relative p-2 rounded-full transition-all duration-300 flex-shrink-0 bg-gradient-to-br from-gray-100 to-slate-100 group-hover:scale-110">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="4" cy="10" r="2" fill="currentColor" />
                  <circle cx="10" cy="10" r="2" fill="currentColor" />
                  <circle cx="16" cy="10" r="2" fill="currentColor" />
                </svg>
              </span>
              <span
                className={cn(
                  "text-[11px] font-medium mt-1 transition-all duration-300 truncate w-full text-center",
                  showMore || isMoreSectionActive ? "block text-teal-600" : "hidden"
                )}
              >
                {showMore ? "Más" : activeMoreItem?.title ?? "Más"}
              </span>
            </button>

            {showMore && (
              <div className="absolute bottom-[calc(100%+0.5rem)] right-0 z-[60] w-44 max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                <div className="py-1">
                  {visibleMoreItems.map((item) => {
                    const IconComponent = item.icon
                    const isActive = selectedSection === item.url

                    return (
                      <button
                        key={item.url}
                        type="button"
                        onClick={() => {
                          setShowMore(false)
                          onSectionChange(item.url, item.title)
                        }}
                        className={cn(
                          "flex items-center gap-3 w-full px-4 py-3 text-sm text-left text-foreground hover:bg-muted transition-all duration-200",
                          isActive ? "bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-700 bg-teal-500/10" : ""
                        )}
                        tabIndex={0}
                        aria-label={item.title}
                        title={item.title}
                      >
                        <IconComponent className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
    </div>
  )
}
