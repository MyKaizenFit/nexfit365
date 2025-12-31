"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { User, Lock, Bell, HelpCircle, Settings, BookOpen, MessageCircle, FileText, Mail, ExternalLink, Info } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfilePanel } from "./profile-panel"
import { ChangePasswordPanel } from "./change-password-panel"
import { NotificationsPanel } from "./notifications-panel"
import { NutritionPlanHistoryUser } from "@/components/nutrition-plan-history-user"
import { PushNotificationsSetup } from "./push-notifications-setup"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { helpService, HelpSettings } from "@/lib/help-service"

const SettingsPage = () => {
  const router = useRouter()
  const [helpSettings, setHelpSettings] = useState<HelpSettings | null>(null)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    marketing: false,
  })

  useEffect(() => {
    loadHelpSettings()
  }, [])

  const loadHelpSettings = async () => {
    try {
      setLoadingSettings(true)
      const settings = await helpService.getHelpSettings()
      setHelpSettings(settings)
    } catch (error) {
      console.error('Error cargando configuración de ayuda:', error)
      // Usar valores por defecto si falla - ahora getHelpSettings ya devuelve valores por defecto
      const defaultSettings = await helpService.getHelpSettings()
      setHelpSettings(defaultSettings)
    } finally {
      setLoadingSettings(false)
    }
  }

  const handleNotificationChange = (type: string, checked: boolean) => {
    setNotifications((prev) => ({ ...prev, [type]: checked }))
    toast({
      title: "✅ Configuración actualizada",
      description: `Notificaciones ${type} ${checked ? "activadas" : "desactivadas"}`,
    })
  }

  const handleHelpAction = (action: string) => {
    if (!helpSettings) return

    switch (action) {
      case "faq":
        if (helpSettings.faq_url) {
          window.open(helpSettings.faq_url, '_blank')
        } else if (helpSettings.faq_enabled) {
          router.push('/dashboard/help/faq')
        } else {
          toast({
            title: "⚠️ No disponible",
            description: "Las preguntas frecuentes no están disponibles en este momento.",
            variant: "destructive",
          })
        }
        break
      case "contact":
        if (helpSettings.contact_enabled && helpSettings.contact_email) {
          window.location.href = `mailto:${helpSettings.contact_email}?subject=Soporte NexFit365`
        } else {
          toast({
            title: "⚠️ No disponible",
            description: "El contacto no está disponible en este momento.",
            variant: "destructive",
          })
        }
        break
      case "guides":
        if (helpSettings.guides_url) {
          window.open(helpSettings.guides_url, '_blank')
        } else if (helpSettings.guides_enabled) {
          router.push('/dashboard/help/guides')
        } else {
          toast({
            title: "⚠️ No disponible",
            description: "Las guías de usuario no están disponibles en este momento.",
            variant: "destructive",
          })
        }
        break
      case "report":
        if (helpSettings.report_enabled) {
          router.push('/dashboard/help/report')
        } else {
          toast({
            title: "⚠️ No disponible",
            description: "El formulario de reporte no está disponible en este momento.",
            variant: "destructive",
          })
        }
        break
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500 via-cyan-400 to-blue-400 p-6 sm:p-8 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Settings className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                  Configuración
                </h1>
                <p className="text-white/80 text-sm sm:text-base">
                  Personaliza tu experiencia y gestiona tu cuenta
                </p>
              </div>
            </div>

            {/* Mensaje informativo */}
            <div className="mt-4 p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
              <p className="text-white/90 text-sm sm:text-base flex items-center gap-2">
                <Settings className="h-5 w-5 text-cyan-300 flex-shrink-0" />
                <span>
                  Ajusta tus preferencias, seguridad y configuración según tus necesidades
                </span>
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto p-1 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <TabsTrigger
              value="profile"
              className="flex items-center gap-2 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Mi Perfil</span>
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="flex items-center gap-2 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
            >
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Seguridad</span>
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex items-center gap-2 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-500 data-[state=active]:text-white"
            >
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notificaciones</span>
            </TabsTrigger>
            <TabsTrigger
              value="help"
              className="flex items-center gap-2 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Ayuda</span>
            </TabsTrigger>
          </TabsList>

          {/* Mi Perfil Tab */}
          <TabsContent value="profile" className="space-y-6">
            <ProfilePanel />
            <NutritionPlanHistoryUser />
          </TabsContent>

          {/* Seguridad Tab */}
          <TabsContent value="security">
            <ChangePasswordPanel />
          </TabsContent>

          {/* Notificaciones Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <PushNotificationsSetup />
            <NotificationsPanel />
          </TabsContent>

          {/* Ayuda Tab */}
          <TabsContent value="help" className="space-y-4 md:space-y-6 max-w-full overflow-hidden">
            {/* Centro de Ayuda Principal */}
            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 max-w-full overflow-hidden">
              <CardHeader className="px-3 md:px-6 pt-3 md:pt-6 pb-2 md:pb-4 max-w-full">
                <CardTitle className="flex items-center gap-2 text-sm md:text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent max-w-full">
                  <HelpCircle className="h-4 w-4 md:h-6 md:w-6 text-blue-600 flex-shrink-0" />
                  <span className="truncate">Centro de Ayuda</span>
                </CardTitle>
                <CardDescription className="text-xs md:text-base mt-1 break-words">Encuentra respuestas y obtén soporte para cualquier duda</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 md:space-y-4 px-3 md:px-6 pb-3 md:pb-6 max-w-full overflow-hidden">
                {/* Acciones Rápidas */}
                {loadingSettings ? (
                  <div className="text-center py-8 text-gray-500 text-sm md:text-base">Cargando configuración...</div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 md:gap-4 max-w-full">
                    {helpSettings?.faq_enabled && (
                      <Button
                        variant="outline"
                        onClick={() => handleHelpAction("faq")}
                        className="h-auto p-2.5 md:p-5 flex flex-col items-start gap-2 md:gap-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 bg-white border-2 transition-all touch-manipulation active:scale-[0.98] w-full max-w-full overflow-hidden"
                      >
                        <div className="flex items-center gap-2 md:gap-3 w-full min-w-0 max-w-full">
                          <div className="p-1.5 md:p-3 bg-blue-100 rounded-lg flex-shrink-0">
                            <BookOpen className="h-4 w-4 md:h-6 md:w-6 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0 max-w-[calc(100%-60px)]">
                            <div className="font-semibold text-xs md:text-lg text-left text-gray-900 truncate">Preguntas Frecuentes</div>
                          </div>
                          <ExternalLink className="h-4 w-4 md:h-6 md:w-6 ml-1 text-gray-400 flex-shrink-0" />
                        </div>
                        <div className="text-xs md:text-base text-gray-600 text-left w-full break-words">Encuentra respuestas rápidas a las preguntas más comunes</div>
                      </Button>
                    )}
                    
                    {helpSettings?.contact_enabled && (
                      <Button
                        variant="outline"
                        onClick={() => handleHelpAction("contact")}
                        className="h-auto p-2.5 md:p-5 flex flex-col items-start gap-2 md:gap-3 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 bg-white border-2 transition-all touch-manipulation active:scale-[0.98] w-full max-w-full overflow-hidden"
                      >
                        <div className="flex items-center gap-2 md:gap-3 w-full min-w-0 max-w-full">
                          <div className="p-1.5 md:p-3 bg-green-100 rounded-lg flex-shrink-0">
                            <Mail className="h-4 w-4 md:h-6 md:w-6 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0 max-w-[calc(100%-60px)]">
                            <div className="font-semibold text-xs md:text-lg text-left text-gray-900 truncate">Contactar Soporte</div>
                          </div>
                          <ExternalLink className="h-4 w-4 md:h-6 md:w-6 ml-1 text-gray-400 flex-shrink-0" />
                        </div>
                        <div className="text-xs md:text-base text-gray-600 text-left w-full break-words">Habla directamente con nuestro equipo de soporte</div>
                      </Button>
                    )}
                    
                    {helpSettings?.guides_enabled && (
                      <Button
                        variant="outline"
                        onClick={() => handleHelpAction("guides")}
                        className="h-auto p-2.5 md:p-5 flex flex-col items-start gap-2 md:gap-3 hover:bg-gradient-to-r hover:from-purple-50 hover:to-violet-50 bg-white border-2 transition-all touch-manipulation active:scale-[0.98] w-full max-w-full overflow-hidden"
                      >
                        <div className="flex items-center gap-2 md:gap-3 w-full min-w-0 max-w-full">
                          <div className="p-1.5 md:p-3 bg-purple-100 rounded-lg flex-shrink-0">
                            <FileText className="h-4 w-4 md:h-6 md:w-6 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0 max-w-[calc(100%-60px)]">
                            <div className="font-semibold text-xs md:text-lg text-left text-gray-900 truncate">Guías de Usuario</div>
                          </div>
                          <ExternalLink className="h-4 w-4 md:h-6 md:w-6 ml-1 text-gray-400 flex-shrink-0" />
                        </div>
                        <div className="text-xs md:text-base text-gray-600 text-left w-full break-words">Aprende a usar todas las funciones de la aplicación</div>
                      </Button>
                    )}
                    
                    {helpSettings?.report_enabled && (
                      <Button
                        variant="outline"
                        onClick={() => handleHelpAction("report")}
                        className="h-auto p-2.5 md:p-5 flex flex-col items-start gap-2 md:gap-3 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 bg-white border-2 transition-all touch-manipulation active:scale-[0.98] w-full max-w-full overflow-hidden"
                      >
                        <div className="flex items-center gap-2 md:gap-3 w-full min-w-0 max-w-full">
                          <div className="p-1.5 md:p-3 bg-orange-100 rounded-lg flex-shrink-0">
                            <MessageCircle className="h-4 w-4 md:h-6 md:w-6 text-orange-600" />
                          </div>
                          <div className="flex-1 min-w-0 max-w-[calc(100%-60px)]">
                            <div className="font-semibold text-xs md:text-lg text-left text-gray-900 truncate">Reportar Problema</div>
                          </div>
                          <ExternalLink className="h-4 w-4 md:h-6 md:w-6 ml-1 text-gray-400 flex-shrink-0" />
                        </div>
                        <div className="text-xs md:text-base text-gray-600 text-left w-full break-words">Informa errores, bugs o problemas técnicos</div>
                      </Button>
                    )}
                  </div>
                )}

                {/* Preguntas Frecuentes */}
                <div className="pt-3 md:pt-6 border-t border-gray-200">
                  <h4 className="font-semibold text-sm md:text-lg mb-2 md:mb-4 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 md:h-6 md:w-6 text-blue-600 flex-shrink-0" />
                    <span className="truncate">Preguntas Frecuentes</span>
                  </h4>
                  <div className="space-y-2 md:space-y-4">
                    <div className="p-3 md:p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                      <h5 className="font-semibold text-sm md:text-lg text-gray-900 mb-1.5 md:mb-3">¿Cómo cambio mi contraseña?</h5>
                      <p className="text-xs md:text-base text-gray-600 leading-relaxed">
                        Ve a la pestaña "Seguridad" en esta misma página de configuración. Allí encontrarás la opción para cambiar tu contraseña de forma segura.
                      </p>
                    </div>
                    
                    <div className="p-4 md:p-5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                      <h5 className="font-semibold text-base md:text-lg text-gray-900 mb-2 md:mb-3">¿Cómo actualizo mi perfil?</h5>
                      <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                        En la pestaña "Mi Perfil" puedes editar toda tu información personal, incluyendo nombre, altura, peso, objetivos y más.
                      </p>
                    </div>
                    
                    <div className="p-4 md:p-5 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border-2 border-purple-200">
                      <h5 className="font-semibold text-base md:text-lg text-gray-900 mb-2 md:mb-3">¿Cómo funcionan los planes de entrenamiento?</h5>
                      <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                        Los planes de entrenamiento se asignan automáticamente según tus objetivos y nivel de actividad. Puedes verlos en la sección "Entrenamientos" del dashboard.
                      </p>
                    </div>
                    
                    <div className="p-4 md:p-5 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border-2 border-orange-200">
                      <h5 className="font-semibold text-base md:text-lg text-gray-900 mb-2 md:mb-3">¿Puedo personalizar mi plan nutricional?</h5>
                      <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                        Sí, los planes nutricionales se adaptan a tus preferencias dietéticas, alergias y objetivos. Actualiza tu perfil para que el plan se ajuste automáticamente.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Información de la App */}
                <div className="pt-3 md:pt-6 border-t border-gray-200">
                  <h4 className="font-semibold text-sm md:text-lg mb-2 md:mb-4 flex items-center gap-2">
                    <Info className="h-4 w-4 md:h-6 md:w-6 text-gray-600 flex-shrink-0" />
                    <span className="truncate">Información de la Aplicación</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                    <div className="p-3 md:p-5 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="text-xs md:text-base font-medium text-gray-700 mb-1 md:mb-2">Versión</div>
                      <div className="text-base md:text-xl font-semibold text-gray-900 truncate">
                        {helpSettings?.app_version || '2.1.0'}
                      </div>
                    </div>
                    <div className="p-3 md:p-5 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="text-xs md:text-base font-medium text-gray-700 mb-1 md:mb-2">Última actualización</div>
                      <div className="text-base md:text-xl font-semibold text-gray-900 truncate">
                        {helpSettings?.last_update_date || 'Diciembre 2024'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-4">
                    {helpSettings?.terms_url && (
                      <>
                        <Button
                          variant="link"
                          className="text-blue-600 hover:text-blue-700 p-0 h-auto"
                          onClick={() => window.open(helpSettings.terms_url!, '_blank')}
                        >
                          Términos de servicio
                        </Button>
                        {helpSettings.privacy_url && <span className="text-gray-400">•</span>}
                      </>
                    )}
                    {helpSettings?.privacy_url && (
                      <Button
                        variant="link"
                        className="text-blue-600 hover:text-blue-700 p-0 h-auto"
                        onClick={() => window.open(helpSettings.privacy_url!, '_blank')}
                      >
                        Política de privacidad
                      </Button>
                    )}
                  </div>
                </div>

                {/* Contacto Directo */}
                {helpSettings?.contact_enabled && (
                  <div className="pt-6 border-t">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        <Mail className="h-5 w-5 text-blue-600" />
                        ¿Necesitas más ayuda?
                      </h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Si no encuentras lo que buscas, nuestro equipo está aquí para ayudarte.
                      </p>
                      <Button
                        onClick={() => handleHelpAction("contact")}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Contactar Soporte
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default SettingsPage
