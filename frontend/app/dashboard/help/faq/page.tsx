"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, BookOpen, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { helpService, HelpSettings } from "@/lib/help-service"
import { toast } from "@/hooks/use-toast"

export default function FAQPage() {
  const router = useRouter()
  const [helpSettings, setHelpSettings] = useState<HelpSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    loadHelpSettings()
  }, [])

  const loadHelpSettings = async () => {
    try {
      setLoading(true)
      const settings = await helpService.getHelpSettings()
      setHelpSettings(settings)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar la configuración de ayuda",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // FAQ por defecto si no hay contenido configurado
  const defaultFAQs = [
    {
      question: "¿Cómo cambio mi contraseña?",
      answer: "Ve al apartado de configuración y entra en la pestaña “Seguridad”. Desde ahí podrás cambiar tu contraseña de forma rápida y segura para mantener protegida toda tu información dentro de la App.",
      category: "Cuenta"
    },
    {
      question: "¿Cómo actualizo mi perfil?",
      answer: "En la pestaña “Mi Perfil” podrás modificar toda tu información personal:\n- peso,\n- altura,\n- objetivos,\n- preferencias,\n- actividad,\n- y mucho más.\n\nMantener esta información actualizada es importante para que el sistema pueda adaptarse mejor a ti y seguir el método de la mejor manera posible.",
      category: "Cuenta"
    },
    {
      question: "¿Cómo funcionan los planes de entrenamiento?",
      answer: "Tus entrenamientos se organizan según tus objetivos, nivel, disponibilidad y el enfoque del método de Sara.\n\nLa idea no es darte simplemente una rutina cualquiera, sino seguir una estructura pensada para ayudarte a progresar de manera realista y sostenible.\n\nLas chicas VIP cuentan además con intervención directa de Sara, revisiones prioritarias y adaptaciones más personalizadas.",
      category: "Entrenamiento"
    },
    {
      question: "¿Puedo personalizar mi plan nutricional?",
      answer: "Sí. Conforme vayamos conociendo mejor tus preferencias, el menú será cada vez más personalizado, especialmente si te encuentras dentro del plan VIP.\n\nAdemás, puedes actualizar:\n- alergias,\n- intolerancias,\n- preferencias,\n- alimentos que no te gustan,\n- y otros detalles importantes desde tu perfil.\n\nLas chicas VIP también pueden solicitar recetas concretas y tienen prioridad a la hora de adaptar más el proceso nutricional.",
      category: "Nutrición"
    },
    {
      question: "¿Cómo registro mi progreso?",
      answer: "Puedes registrar peso, medidas, fotos y revisiones generales desde los apartados “Day 1” e “Inicio”.\n\nLa idea es que no tengas que guiarte solo por sensaciones, sino que puedas ver de manera clara todo lo que estás avanzando con el paso de las semanas.",
      category: "Progreso"
    },
    {
      question: "¿Qué son los logros?",
      answer: "Los logros están pensados para ayudarte a avanzar y mantener la constancia dentro del programa de una forma más visual.\n\nPorque ya sabes que lo importante no es lo que haces en un día, sino lo que acumulas con las semanas.",
      category: "Gamificación"
    },
    {
      question: "¿Cómo cancelo mi suscripción?",
      answer: "Puedes solicitar la cancelación de tu suscripción contactando con el equipo de soporte desde el apartado de ayuda o a través del canal indicado por Sara.\n\nTe indicaremos los pasos a seguir según el tipo de plan contratado y la forma de pago utilizada.",
      category: "Cuenta"
    },
    {
      question: "¿Están seguros mis datos?",
      answer: "Sí. Toda tu información se almacena de forma segura y protegida siguiendo las normativas de protección de datos correspondientes.\n\nTu privacidad y confianza son una prioridad dentro del sistema.",
      category: "Seguridad"
    }
  ]

  const faqs = helpSettings?.faq_content 
    ? parseFAQContent(helpSettings.faq_content) 
    : defaultFAQs

  const filteredFAQs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">Cargando...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
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

        <Card className="border shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <BookOpen className="h-8 w-8 text-blue-600" />
              Preguntas Frecuentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
              <Input
                placeholder="Buscar en las preguntas frecuentes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* FAQs */}
            {filteredFAQs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No se encontraron preguntas que coincidan con tu búsqueda.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFAQs.map((faq, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <CardTitle className="text-lg">{faq.question}</CardTitle>
                      {faq.category && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded inline-block mt-2">
                          {faq.category}
                        </span>
                      )}
                    </CardHeader>
                    <CardContent>
                      <FAQAnswer answer={faq.answer} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function parseFAQContent(content: string): Array<{question: string, answer: string, category?: string}> {
  // Si el contenido es HTML, intentar parsearlo
  // Por ahora, devolver un array vacío y usar los FAQs por defecto
  // En el futuro se puede implementar un parser más sofisticado
  try {
    // Intentar parsear como JSON
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) {
      return parsed
    }
  } catch {
    // Si no es JSON, intentar parsear HTML básico
    // Por ahora devolver vacío
  }
  return []
}

function FAQAnswer({ answer }: { answer: string }) {
  const blocks = answer.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean)

  return (
    <div className="space-y-3 text-muted-foreground leading-relaxed">
      {blocks.map((block, index) => {
        const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
        const isList = lines.length > 0 && lines.every((line) => line.startsWith('- '))

        if (isList) {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5">
              {lines.map((line, itemIndex) => (
                <li key={itemIndex}>{line.replace(/^- /, '')}</li>
              ))}
            </ul>
          )
        }

        return (
          <p key={index}>
            {block}
          </p>
        )
      })}
    </div>
  )
}





