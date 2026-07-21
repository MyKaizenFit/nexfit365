"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { getAuthService } from "@/lib/auth-service"
import { isAdminJwtPayload, parseJwtPayload } from "@/lib/jwt"
import {
  Target,
  Users,
  Settings,
  ArrowRight,
  Home,
  TrendingUp,
  Award,
  Star,
  Heart,
  Activity,
  Calendar,
  BarChart3,
  ChefHat,
  Dumbbell,
  Sparkles,
  Trophy,
  Clock,
  Smartphone,
  Crown,
  CheckCircle2
} from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user } = useAuth()
  // Si está autenticado, no permitir permanecer en la home (/):
  // redirigir al dashboard o al panel admin según el rol.
  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) return

    // Si el usuario debe cambiar contraseña, respetar ese flujo primero
    if (user?.must_change_password) {
      window.location.replace('/auth/change-password')
      return
    }

    // Determinar si es admin (prioriza token si user aún no cargó)
    let isAdmin = false
    try {
      const authService = getAuthService()
      const accessToken = authService.getAccessToken()
      if (accessToken) {
        const payload = parseJwtPayload(accessToken)
        isAdmin = isAdminJwtPayload(payload)
      } else if (typeof document !== 'undefined') {
        isAdmin = document.cookie.split(';').some((c) => c.trim() === 'nf_is_admin=1')
      }
    } catch {
      // Ignorar: si falla token, caemos al chequeo por user
    }

    isAdmin =
      isAdmin ||
      !!(user && (user.is_superuser || user.is_staff || ((user as any).role || '').toLowerCase() === 'admin' || ((user as any).role || '').toLowerCase() === 'trainer'))

    if (isAdmin) {
      window.location.replace('/admin')
      return
    }

    // Usuarios normales: si el formulario inicial no está completo, ir al formulario;
    // si está completo, ir al dashboard.
    try {
      const formCompleted = localStorage.getItem('initial_form_completed')
      if (!formCompleted || formCompleted !== 'true') {
        window.location.replace('/initial-registration')
        return
      }
    } catch {
      // Si localStorage falla, ir al dashboard y el middleware decidirá si debe bloquear
    }

    window.location.replace('/dashboard')
  }, [isAuthenticated, isLoading, user])

  // Si está autenticado, el efecto anterior se encarga de redirigir.
  if (isAuthenticated && !isLoading) {
    return (
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto w-24 h-24 rounded-3xl overflow-hidden flex items-center justify-center mb-8 animate-pulse shadow-2xl">
            <Image src="/icono.png" alt="NEXFIT" width={96} height={96} quality={100} priority />
          </div>
          <h1 className="text-3xl font-bold mb-3 text-foreground">Redirigiendo...</h1>
          <p className="text-muted-foreground">Te estamos llevando a Inicio.</p>
        </div>
      </div>
    )
  }

  // Si no está autenticado, mostrar landing page de venta
  if (!isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background dark:bg-background">
        {/* Header Hero Mejorado */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white">
          <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
          <div className="relative max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="mx-auto w-28 h-28 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-8 animate-pulse">
                <Target className="w-16 h-16 text-white" />
              </div>
              <h1 className="text-6xl md:text-7xl font-extrabold mb-6 leading-tight">
                Alcanza tus Objetivos<br />
                <span className="text-yellow-300">con Nex-Fit</span>
              </h1>
              <p className="text-2xl md:text-3xl text-blue-100 max-w-4xl mx-auto leading-relaxed mb-8 font-light">
                La plataforma todo-en-uno que combina entrenamiento personalizado, nutrición inteligente y seguimiento avanzado para transformar tu vida
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4 mb-8">
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full border border-white/30">
                  <Star className="w-5 h-5 text-yellow-300" />
                  <span className="text-base font-semibold">100% Personalizado</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full border border-white/30">
                  <TrendingUp className="w-5 h-5 text-green-300" />
                  <span className="text-base font-semibold">Resultados Comprobados</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full border border-white/30">
                  <Heart className="w-5 h-5 text-red-300" />
                  <span className="text-base font-semibold">Salud Integral</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full border border-white/30">
                  <Smartphone className="w-5 h-5 text-blue-300" />
                  <span className="text-base font-semibold">Acceso 24/7</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button
                  size="lg"
                  type="button"
                  className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all duration-300 font-bold cursor-pointer"
                  onClick={() => router.push('/auth?register=true')}
                >
                  Comenzar Gratis <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  type="button"
                  variant="outline"
                  className="bg-white/10 backdrop-blur-sm border-2 border-white text-white hover:bg-white/20 hover:text-white text-lg px-8 py-6 font-bold cursor-pointer transition-all duration-300"
                  onClick={() => router.push('/auth')}
                >
                  Iniciar sesión
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          {/* Beneficios Principales */}
          <div className="mb-20">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold text-foreground mb-6">¿Por qué elegir Nex-Fit?</h2>
              <p className="text-2xl text-muted-foreground max-w-3xl mx-auto">
                La solución completa para transformar tu cuerpo y alcanzar el estilo de vida que siempre has querido
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
              <div className="text-center p-8 bg-card/80 dark:bg-card backdrop-blur-sm rounded-3xl border shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <Dumbbell className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4">Entrenamientos Personalizados</h3>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  Rutinas diseñadas específicamente para ti, adaptadas a tu nivel, objetivos y disponibilidad
                </p>
              </div>

              <div className="text-center p-8 bg-card/80 dark:bg-card backdrop-blur-sm rounded-3xl border shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <ChefHat className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4">Nutrición Inteligente</h3>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  Planes de alimentación personalizados con recetas deliciosas y seguimiento de macros preciso
                </p>
              </div>

              <div className="text-center p-8 bg-card/80 dark:bg-card backdrop-blur-sm rounded-3xl border shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <BarChart3 className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4">Seguimiento Avanzado</h3>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  Métricas detalladas, gráficos interactivos e insights que te ayudan a optimizar tu progreso
                </p>
              </div>

              <div className="text-center p-8 bg-card/80 dark:bg-card backdrop-blur-sm rounded-3xl border shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <Trophy className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4">Logros y Motivación</h3>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  Sistema de logros, recordatorios y motivación constante para mantenerte en el camino
                </p>
              </div>
            </div>
          </div>

          {/* Características Detalladas */}
          <div className="mb-20">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold text-foreground mb-6">Todo lo que necesitas en un solo lugar</h2>
              <p className="text-2xl text-muted-foreground max-w-3xl mx-auto">
                Una plataforma completa diseñada para maximizar tus resultados
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
              <div className="flex gap-6 p-8 bg-card/60 dark:bg-card backdrop-blur-sm rounded-3xl border shadow-lg">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Activity className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Seguimiento en Tiempo Real</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    Monitorea tus entrenamientos, peso, medidas y progreso fotográfico con herramientas avanzadas de análisis
                  </p>
                </div>
              </div>

              <div className="flex gap-6 p-8 bg-card/60 dark:bg-card backdrop-blur-sm rounded-3xl border shadow-lg">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Planes Adaptativos</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    Tu plan se ajusta automáticamente según tu progreso, preferencias y cambios en tus objetivos
                  </p>
                </div>
              </div>

              <div className="flex gap-6 p-8 bg-card/60 dark:bg-card backdrop-blur-sm rounded-3xl border shadow-lg">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Enfoque en Salud Integral</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    No solo entrenamiento: trabajamos en tu bienestar físico, mental y nutricional de forma holística
                  </p>
                </div>
              </div>

              <div className="flex gap-6 p-8 bg-card/60 dark:bg-card backdrop-blur-sm rounded-3xl border shadow-lg">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Ahorra Tiempo</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    Todo en un solo lugar: no necesitas múltiples apps. Planifica, entrena y come mejor desde una plataforma
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Planes y prueba gratuita */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                <Sparkles className="w-4 h-4" />
                Todos empiezan con 7 días de prueba gratuita
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Empieza gratis y elige cómo continuar</h2>
              <p className="text-xl text-muted-foreground max-w-4xl mx-auto">
                La app te da acceso inmediato a entrenamientos, recetas y herramientas de progreso. Si más adelante necesitas ayuda personalizada, dentro de la propia app podrás solicitar que evaluemos tu caso.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-card border shadow-xl">
                <CardContent className="p-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4">
                    <Smartphone className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">La App incluye</h3>
                  <ul className="space-y-3 text-muted-foreground">
                    {[
                      '+100 recetas de comida real',
                      '+50 recetas FAT convertidas a FIT',
                      '+300 ejercicios con técnica en vídeo',
                      '+100 entrenamientos adaptados a tu nivel',
                      'Comunidad y seguimiento de progreso',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-sm text-amber-700 font-medium">
                    Servicio estándar de app, sin seguimiento 1:1 incluido.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-xl">
                <CardContent className="p-6">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                    <Trophy className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Suscripción App</h3>
                  <p className="text-green-50 mb-4">Empieza sin riesgo y continúa con la opción que mejor te encaje.</p>
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-white/10 p-4 border border-white/20">
                      <p className="text-sm uppercase tracking-wide text-green-100">Prueba inicial</p>
                      <p className="text-3xl font-extrabold">7 días gratis</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-4 border border-white/20">
                      <p className="text-sm uppercase tracking-wide text-green-100">Mensual</p>
                      <p className="text-3xl font-extrabold">97€<span className="text-lg font-medium">/mes</span></p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-4 border border-white/20">
                      <p className="text-sm uppercase tracking-wide text-green-100">Anual</p>
                      <p className="text-3xl font-extrabold">990€<span className="text-lg font-medium">/año</span></p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-xl">
                <CardContent className="p-6">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                    <Crown className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">¿Necesitas ayuda personalizada?</h3>
                  <p className="text-violet-50 mb-4">
                    Dentro de la app podrás ver los beneficios de los planes 1:1 y enviarnos tu caso para valorar si podemos ayudarte.
                  </p>
                  <ul className="space-y-2 text-sm text-violet-50 mb-6">
                    <li>• Revisión semanal o quincenal</li>
                    <li>• Respuesta rápida</li>
                    <li>• Seguimiento real y 100% personalizado</li>
                    <li>• Evaluación previa de tu situación</li>
                  </ul>
                  <Button
                    size="lg"
                    className="w-full bg-white text-violet-700 hover:bg-violet-50 font-bold"
                    onClick={() => router.push('/auth?register=true')}
                  >
                    Empezar gratis <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* CTA Principal */}
          <div className="mb-20">
            <Card className="border-0 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white shadow-2xl overflow-hidden">
              <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }}></div>
              <CardContent className="p-16 text-center relative">
                <Sparkles className="w-20 h-20 mx-auto mb-8 text-yellow-300 animate-pulse" />
                <h2 className="text-5xl font-extrabold mb-6">Comienza tu transformación hoy</h2>
                <p className="text-2xl text-blue-100 mb-10 max-w-3xl mx-auto leading-relaxed">
                  Únete a miles de personas que ya están alcanzando sus objetivos. Tu mejor versión te está esperando.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                  <Button
                    size="lg"
                    className="bg-white text-blue-600 hover:bg-blue-50 text-xl px-10 py-7 shadow-2xl hover:shadow-3xl transition-all duration-300 font-bold"
                    onClick={() => router.push('/auth?register=true')}
                  >
                    Crear cuenta gratis <ArrowRight className="w-6 h-6 ml-2" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-transparent border-3 border-white text-white hover:bg-white/20 text-xl px-10 py-7 font-bold"
                    onClick={() => router.push('/auth')}
                  >
                    Ya tengo cuenta
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Estado de carga
  return (
    <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto w-24 h-24 rounded-3xl overflow-hidden flex items-center justify-center mb-8 animate-pulse shadow-2xl">
          <Image src="/icono.png" alt="NEXFIT" width={96} height={96} quality={100} priority />
        </div>
        <h1 className="text-4xl font-bold mb-4 text-foreground">
          Cargando <span className="text-orange-500">NEX</span><span className="text-muted-foreground">FIT</span>...
        </h1>
        <p className="text-muted-foreground text-lg mb-6">Preparando tu experiencia personalizada</p>
        <div className="flex justify-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-3 h-3 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  )
}
