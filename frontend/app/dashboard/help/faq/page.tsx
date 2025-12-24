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

  // FAQ por defecto si no hay contenido configurado
  const defaultFAQs = [
    {
      question: "¿Cómo cambio mi contraseña?",
      answer: "Ve a la pestaña 'Seguridad' en la página de configuración. Allí encontrarás la opción para cambiar tu contraseña de forma segura.",
      category: "Cuenta"
    },
    {
      question: "¿Cómo actualizo mi perfil?",
      answer: "En la pestaña 'Mi Perfil' puedes editar toda tu información personal, incluyendo nombre, altura, peso, objetivos y más.",
      category: "Cuenta"
    },
    {
      question: "¿Cómo funcionan los planes de entrenamiento?",
      answer: "Los planes de entrenamiento se asignan automáticamente según tus objetivos y nivel de actividad. Puedes verlos en la sección 'Entrenamientos' del dashboard.",
      category: "Entrenamiento"
    },
    {
      question: "¿Puedo personalizar mi plan nutricional?",
      answer: "Sí, los planes nutricionales se adaptan a tus preferencias dietéticas, alergias y objetivos. Actualiza tu perfil para que el plan se ajuste automáticamente.",
      category: "Nutrición"
    },
    {
      question: "¿Cómo registro mi progreso?",
      answer: "Puedes registrar tu progreso subiendo fotos y registrando tu peso en la sección 'Progreso' del dashboard. Esto te ayudará a visualizar tu evolución.",
      category: "Progreso"
    },
    {
      question: "¿Qué son los logros?",
      answer: "Los logros son recompensas que obtienes al completar objetivos y mantener tu consistencia. Puedes verlos en la sección 'Logros' del dashboard.",
      category: "Gamificación"
    },
    {
      question: "¿Cómo cancelo mi suscripción?",
      answer: "Puedes cancelar tu suscripción en cualquier momento desde la sección de configuración de tu cuenta. No se aplicarán cargos adicionales.",
      category: "Cuenta"
    },
    {
      question: "¿Los datos están seguros?",
      answer: "Sí, utilizamos encriptación de extremo a extremo y cumplimos con todas las normativas de protección de datos. Tu información está completamente segura.",
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
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">Cargando...</div>
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
              <BookOpen className="h-8 w-8 text-blue-600" />
              Preguntas Frecuentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Buscar en las preguntas frecuentes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* FAQs */}
            {filteredFAQs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No se encontraron preguntas que coincidan con tu búsqueda.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFAQs.map((faq, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <CardTitle className="text-lg">{faq.question}</CardTitle>
                      {faq.category && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded inline-block mt-2">
                          {faq.category}
                        </span>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">{faq.answer}</p>
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





