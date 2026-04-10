"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Send, AlertCircle, Bug, Lightbulb, Monitor, Zap, HelpCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { helpService, CreateProblemReportData } from "@/lib/help-service"
import { useAuth } from "@/contexts/auth-context"

export default function ReportProblemPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CreateProblemReportData>({
    problem_type: 'other',
    subject: '',
    description: '',
    steps_to_reproduce: '',
    expected_behavior: '',
    actual_behavior: '',
    browser_info: '',
    device_info: '',
    url: '',
    screenshot_url: '',
    contact_email: '',
  })

  useEffect(() => {
    // Obtener información del navegador y dispositivo automáticamente
    if (typeof window !== 'undefined') {
      const browserInfo = helpService.getBrowserInfo()
      setFormData(prev => ({
        ...prev,
        browser_info: browserInfo,
        device_info: `${window.screen.width}x${window.screen.height}`,
        url: window.location.href,
        contact_email: isAuthenticated && user && user.email ? user.email : '',
      }))
    }
  }, [isAuthenticated, user])

  const problemTypes = [
    { value: 'bug', label: 'Error/Bug', icon: Bug, color: 'red' },
    { value: 'feature', label: 'Solicitud de Funcionalidad', icon: Lightbulb, color: 'yellow' },
    { value: 'ui', label: 'Problema de Interfaz', icon: Monitor, color: 'blue' },
    { value: 'performance', label: 'Problema de Rendimiento', icon: Zap, color: 'orange' },
    { value: 'other', label: 'Otro', icon: HelpCircle, color: 'gray' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.subject.trim() || !formData.description.trim()) {
      toast({
        title: "Error",
        description: "Por favor completa el asunto y la descripción",
        variant: "destructive",
      })
      return
    }

    if (!isAuthenticated && !formData.contact_email?.trim()) {
      toast({
        title: "Error",
        description: "Por favor proporciona un email de contacto",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      await helpService.createProblemReport(formData)
      
      toast({
        title: "✅ Reporte enviado",
        description: "Tu reporte ha sido enviado exitosamente. Nos pondremos en contacto contigo pronto.",
      })

      // Redirigir después de un momento
      setTimeout(() => {
        router.push('/dashboard/settings')
      }, 2000)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo enviar el reporte. Por favor intenta de nuevo.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50 p-4">
      <div className="max-w-3xl mx-auto space-y-6">
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
              <AlertCircle className="h-8 w-8 text-orange-600" />
              Reportar un Problema
            </CardTitle>
            <CardDescription>
              Ayúdanos a mejorar la aplicación reportando errores o problemas que encuentres
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Tipo de Problema */}
              <div className="space-y-2">
                <Label htmlFor="problem_type">Tipo de Problema *</Label>
                <Select
                  value={formData.problem_type}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, problem_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {problemTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Asunto */}
              <div className="space-y-2">
                <Label htmlFor="subject">Asunto *</Label>
                <Input
                  id="subject"
                  placeholder="Describe brevemente el problema"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  required
                />
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label htmlFor="description">Descripción Detallada *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe el problema en detalle..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={5}
                  required
                />
              </div>

              {/* Pasos para Reproducir */}
              <div className="space-y-2">
                <Label htmlFor="steps_to_reproduce">Pasos para Reproducir el Problema</Label>
                <Textarea
                  id="steps_to_reproduce"
                  placeholder="1. Paso uno...&#10;2. Paso dos...&#10;3. Paso tres..."
                  value={formData.steps_to_reproduce}
                  onChange={(e) => setFormData(prev => ({ ...prev, steps_to_reproduce: e.target.value }))}
                  rows={4}
                />
              </div>

              {/* Comportamiento Esperado */}
              <div className="space-y-2">
                <Label htmlFor="expected_behavior">Comportamiento Esperado</Label>
                <Textarea
                  id="expected_behavior"
                  placeholder="Qué debería suceder..."
                  value={formData.expected_behavior}
                  onChange={(e) => setFormData(prev => ({ ...prev, expected_behavior: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Comportamiento Actual */}
              <div className="space-y-2">
                <Label htmlFor="actual_behavior">Comportamiento Actual</Label>
                <Textarea
                  id="actual_behavior"
                  placeholder="Qué está sucediendo realmente..."
                  value={formData.actual_behavior}
                  onChange={(e) => setFormData(prev => ({ ...prev, actual_behavior: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* URL */}
              <div className="space-y-2">
                <Label htmlFor="url">URL donde ocurrió el problema</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://..."
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                />
              </div>

              {/* Email de Contacto (solo si no está autenticado) */}
              {!isAuthenticated && (
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Email de Contacto *</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    placeholder="tu@email.com"
                    value={formData.contact_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                    required
                  />
                </div>
              )}

              {/* Información Técnica (oculta por defecto) */}
              <details className="space-y-2">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  Información Técnica (Opcional)
                </summary>
                <div className="mt-4 space-y-4 pl-4 border-l-2 border-gray-200">
                  <div className="space-y-2">
                    <Label htmlFor="browser_info">Información del Navegador</Label>
                    <Input
                      id="browser_info"
                      value={formData.browser_info}
                      onChange={(e) => setFormData(prev => ({ ...prev, browser_info: e.target.value }))}
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="device_info">Información del Dispositivo</Label>
                    <Input
                      id="device_info"
                      value={formData.device_info}
                      onChange={(e) => setFormData(prev => ({ ...prev, device_info: e.target.value }))}
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="screenshot_url">URL de Captura de Pantalla</Label>
                    <Input
                      id="screenshot_url"
                      type="url"
                      placeholder="https://..."
                      value={formData.screenshot_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, screenshot_url: e.target.value }))}
                    />
                  </div>
                </div>
              </details>

              {/* Botones */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
                >
                  {loading ? (
                    "Enviando..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar Reporte
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

