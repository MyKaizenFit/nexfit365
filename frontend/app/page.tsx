"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { getAuthService } from "@/lib/auth-service"
import { PersonalizedRecommendations } from "@/components/personalized-recommendations"
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
  Smartphone
} from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user } = useAuth()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [showPersonalizedContent, setShowPersonalizedContent] = useState(false)

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
      if (accessToken && accessToken.includes('.') && !accessToken.startsWith('offline_token_')) {
        const payload = JSON.parse(atob(accessToken.split('.')[1]))
        isAdmin = !!(payload.is_superuser || payload.is_staff || payload.role === 'ADMIN' || payload.role === 'admin' || payload.role === 'trainer')
      }
    } catch {
      // Ignorar: si falla token, caemos al chequeo por user
    }

    isAdmin =
      isAdmin ||
      !!(user && (user.is_superuser || user.is_staff || user.role === 'ADMIN' || (user as any).role === 'admin' || (user as any).role === 'trainer'))

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

  // Cargar datos del perfil del usuario
  useEffect(() => {
    const loadUserProfile = async () => {
      if (isAuthenticated && user) {
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
          setShowPersonalizedContent(true)
        } catch (error) {
          console.error('Error cargando perfil del usuario:', error)
        }
      }
    }

    loadUserProfile()
  }, [isAuthenticated, user])

  // Si está autenticado, el efecto anterior se encarga de redirigir.
  if (isAuthenticated && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto w-24 h-24 rounded-3xl overflow-hidden flex items-center justify-center mb-8 animate-pulse shadow-2xl">
            <Image src="/icono.png" alt="NEXFIT" width={96} height={96} quality={100} priority />
          </div>
          <h1 className="text-3xl font-bold mb-3 text-gray-800">Redirigiendo...</h1>
          <p className="text-gray-600">Te estamos llevando a tu panel.</p>
        </div>
      </div>
    )
  }

  // Si no está autenticado, mostrar landing page de venta
  if (!isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
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
                <span className="text-yellow-300">con Nex-Fit</span> 🏋️‍♂️
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
                  Iniciar Sesión
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          {/* Beneficios Principales */}
          <div className="mb-20">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold text-gray-800 mb-6">¿Por qué elegir Nex-Fit?</h2>
              <p className="text-2xl text-gray-600 max-w-3xl mx-auto">
                La solución completa para transformar tu cuerpo y alcanzar el estilo de vida que siempre has querido
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
              <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-3xl border border-white/40 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <Dumbbell className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Entrenamientos Personalizados</h3>
                <p className="text-gray-600 leading-relaxed text-lg">
                  Rutinas diseñadas específicamente para ti, adaptadas a tu nivel, objetivos y disponibilidad
                </p>
              </div>

              <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-3xl border border-white/40 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <ChefHat className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Nutrición Inteligente</h3>
                <p className="text-gray-600 leading-relaxed text-lg">
                  Planes de alimentación personalizados con recetas deliciosas y seguimiento de macros preciso
                </p>
              </div>

              <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-3xl border border-white/40 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <BarChart3 className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Seguimiento Avanzado</h3>
                <p className="text-gray-600 leading-relaxed text-lg">
                  Métricas detalladas, gráficos interactivos e insights que te ayudan a optimizar tu progreso
                </p>
              </div>

              <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-3xl border border-white/40 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <Trophy className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Logros y Motivación</h3>
                <p className="text-gray-600 leading-relaxed text-lg">
                  Sistema de logros, recordatorios y motivación constante para mantenerte en el camino
                </p>
              </div>
            </div>
          </div>

          {/* Características Detalladas */}
          <div className="mb-20">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold text-gray-800 mb-6">Todo lo que necesitas en un solo lugar</h2>
              <p className="text-2xl text-gray-600 max-w-3xl mx-auto">
                Una plataforma completa diseñada para maximizar tus resultados
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
              <div className="flex gap-6 p-8 bg-white/60 backdrop-blur-sm rounded-3xl border border-white/40 shadow-lg">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Activity className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">Seguimiento en Tiempo Real</h3>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    Monitorea tus entrenamientos, peso, medidas y progreso fotográfico con herramientas avanzadas de análisis
                  </p>
                </div>
              </div>

              <div className="flex gap-6 p-8 bg-white/60 backdrop-blur-sm rounded-3xl border border-white/40 shadow-lg">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">Planes Adaptativos</h3>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    Tu plan se ajusta automáticamente según tu progreso, preferencias y cambios en tus objetivos
                  </p>
                </div>
              </div>

              <div className="flex gap-6 p-8 bg-white/60 backdrop-blur-sm rounded-3xl border border-white/40 shadow-lg">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">Enfoque en Salud Integral</h3>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    No solo fitness: trabajamos en tu bienestar físico, mental y nutricional de forma holística
                  </p>
                </div>
              </div>

              <div className="flex gap-6 p-8 bg-white/60 backdrop-blur-sm rounded-3xl border border-white/40 shadow-lg">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">Ahorra Tiempo</h3>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    Todo en un solo lugar: no necesitas múltiples apps. Planifica, entrena y come mejor desde una plataforma
                  </p>
                </div>
              </div>
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
                <h2 className="text-5xl font-extrabold mb-6">Comienza tu Transformación Hoy</h2>
                <p className="text-2xl text-blue-100 mb-10 max-w-3xl mx-auto leading-relaxed">
                  Únete a miles de personas que ya están alcanzando sus objetivos. Tu mejor versión te está esperando.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                  <Button 
                    size="lg"
                    className="bg-white text-blue-600 hover:bg-blue-50 text-xl px-10 py-7 shadow-2xl hover:shadow-3xl transition-all duration-300 font-bold"
                    onClick={() => router.push('/auth?register=true')}
                  >
                    Crear Cuenta Gratis <ArrowRight className="w-6 h-6 ml-2" />
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto w-24 h-24 rounded-3xl overflow-hidden flex items-center justify-center mb-8 animate-pulse shadow-2xl">
          <Image src="/icono.png" alt="NEXFIT" width={96} height={96} quality={100} priority />
        </div>
        <h1 className="text-4xl font-bold mb-4 text-gray-800">
          Cargando <span className="text-orange-500">NEX</span><span className="text-gray-600">FIT</span>...
        </h1>
        <p className="text-gray-600 text-lg mb-6">Preparando tu experiencia personalizada</p>
        <div className="flex justify-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-3 h-3 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  )
}
