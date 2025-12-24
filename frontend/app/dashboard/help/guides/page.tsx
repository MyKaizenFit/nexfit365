"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, FileText, BookOpen, User, UtensilsCrossed, Dumbbell, TrendingUp, Award } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { helpService, HelpSettings } from "@/lib/help-service"
import { toast } from "@/hooks/use-toast"

export default function GuidesPage() {
  const router = useRouter()
  const [helpSettings, setHelpSettings] = useState<HelpSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHelpSettings()
  }, [])

  const loadHelpSettings = async () => {
    try {
      setLoading(true)
      const settings = await helpService.getHelpSettings()
      setHelpSettings(settings)
    } catch (error) {
      console.error('Error cargando configuración:', error)
      toast({
        title: "Error",
        description: "No se pudo cargar la configuración de ayuda",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const guides = [
    {
      id: "getting-started",
      title: "Primeros Pasos",
      icon: User,
      color: "blue",
      sections: [
        {
          title: "Crear tu cuenta",
          content: "Para comenzar, crea una cuenta con tu email y completa el formulario de registro inicial. Este formulario nos ayudará a personalizar tu experiencia."
        },
        {
          title: "Completar tu perfil",
          content: "Asegúrate de completar toda la información de tu perfil: altura, peso, objetivos, nivel de actividad y preferencias. Esta información es crucial para generar planes personalizados."
        },
        {
          title: "Explorar el dashboard",
          content: "El dashboard es tu centro de control. Aquí verás tus planes de entrenamiento y nutrición, tu progreso, logros y estadísticas."
        }
      ]
    },
    {
      id: "nutrition",
      title: "Nutrición",
      icon: UtensilsCrossed,
      color: "green",
      sections: [
        {
          title: "Entender tu plan nutricional",
          content: "Tu plan nutricional se genera automáticamente según tus objetivos y preferencias. Incluye recomendaciones de calorías, macronutrientes y comidas específicas."
        },
        {
          title: "Registrar tus comidas",
          content: "Puedes registrar tus comidas diarias en la sección de nutrición. Esto te ayudará a mantener un seguimiento preciso de tu consumo calórico y nutricional."
        },
        {
          title: "Ajustar tu plan",
          content: "Si necesitas ajustar tu plan nutricional, actualiza tu información en el perfil. El sistema recalculará automáticamente tus necesidades."
        }
      ]
    },
    {
      id: "workouts",
      title: "Entrenamientos",
      icon: Dumbbell,
      color: "purple",
      sections: [
        {
          title: "Tu programa de entrenamiento",
          content: "Cada usuario recibe un programa de entrenamiento personalizado basado en sus objetivos, nivel de actividad y equipamiento disponible."
        },
        {
          title: "Completar entrenamientos",
          content: "Marca tus entrenamientos como completados después de realizarlos. Puedes agregar notas sobre cómo te sentiste, dificultad y duración."
        },
        {
          title: "Ver ejercicios",
          content: "Cada ejercicio incluye instrucciones detalladas y videos demostrativos. Asegúrate de revisarlos antes de comenzar tu entrenamiento."
        }
      ]
    },
    {
      id: "progress",
      title: "Seguimiento de Progreso",
      icon: TrendingUp,
      color: "orange",
      sections: [
        {
          title: "Registrar tu peso",
          content: "Registra tu peso regularmente para ver tu progreso. El sistema generará gráficos que muestran tu evolución a lo largo del tiempo."
        },
        {
          title: "Subir fotos de progreso",
          content: "Las fotos de progreso son una excelente manera de visualizar tus cambios físicos. Sube fotos periódicamente para comparar tu evolución."
        },
        {
          title: "Revisar estadísticas",
          content: "En la sección de progreso puedes ver estadísticas detalladas: cambios de peso, porcentaje de grasa corporal, y más."
        }
      ]
    },
    {
      id: "achievements",
      title: "Logros y Gamificación",
      icon: Award,
      color: "yellow",
      sections: [
        {
          title: "Sistema de logros",
          content: "Gana logros completando objetivos y manteniendo tu consistencia. Cada logro te otorga puntos que puedes usar para desbloquear contenido adicional."
        },
        {
          title: "Rachas",
          content: "Mantén una racha de días consecutivos completando tus objetivos. Las rachas más largas te otorgan recompensas especiales."
        },
        {
          title: "Niveles",
          content: "Sube de nivel ganando puntos. Cada nivel desbloquea nuevas funciones y contenido exclusivo."
        }
      ]
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">Cargando...</div>
        </div>
      </div>
    )
  }

  // Si hay contenido HTML configurado, mostrarlo
  if (helpSettings?.guides_content) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          </div>
          <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-3xl">
                <FileText className="h-8 w-8 text-purple-600" />
                Guías de Usuario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: helpSettings.guides_content }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>

        <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <FileText className="h-8 w-8 text-purple-600" />
              Guías de Usuario
            </CardTitle>
            <CardDescription>
              Aprende a usar todas las funciones de NexFit365
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={guides[0].id} className="w-full">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
                {guides.map((guide) => (
                  <TabsTrigger key={guide.id} value={guide.id} className="flex items-center gap-2">
                    <guide.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{guide.title}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {guides.map((guide) => (
                <TabsContent key={guide.id} value={guide.id} className="mt-6 space-y-4">
                  <div className="space-y-4">
                    {guide.sections.map((section, index) => (
                      <Card key={index} className="border-l-4" style={{ borderLeftColor: `var(--color-${guide.color}-500)` }}>
                        <CardHeader>
                          <CardTitle className="text-lg">{section.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-600">{section.content}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}




