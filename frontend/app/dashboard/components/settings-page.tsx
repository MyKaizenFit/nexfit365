"use client"

import { useState } from "react"
import { User, Lock, Bell, Moon, Sun, Palette, Globe, HelpCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfilePanel } from "./profile-panel"
import { ChangePasswordPanel } from "./change-password-panel"
import { NotificationsPanel } from "./notifications-panel"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"

const SettingsPage = () => {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [language, setLanguage] = useState("es")
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    marketing: false,
  })

  const handleDarkModeToggle = (checked: boolean) => {
    setIsDarkMode(checked)
    // Aplicar inmediatamente el modo oscuro
    if (checked) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
    toast({
      title: checked ? "🌙 Modo oscuro activado" : "☀️ Modo claro activado",
      description: "El tema se ha aplicado correctamente",
    })
  }

  const handleNotificationChange = (type: string, checked: boolean) => {
    setNotifications((prev) => ({ ...prev, [type]: checked }))
    toast({
      title: "✅ Configuración actualizada",
      description: `Notificaciones ${type} ${checked ? "activadas" : "desactivadas"}`,
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
            Configuración
          </h1>
          <p className="text-gray-600">Personaliza tu experiencia y gestiona tu cuenta</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto p-1 bg-white/50 backdrop-blur-sm border-0">
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
              value="appearance"
              className="flex items-center gap-2 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white"
            >
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Apariencia</span>
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
          <TabsContent value="profile">
            <ProfilePanel />
          </TabsContent>

          {/* Seguridad Tab */}
          <TabsContent value="security">
            <ChangePasswordPanel />
          </TabsContent>

          {/* Notificaciones Tab */}
          <TabsContent value="notifications">
            <NotificationsPanel />
          </TabsContent>

          {/* Apariencia Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  <Palette className="h-5 w-5" />
                  Personalización de Apariencia
                </CardTitle>
                <CardDescription>Configura el tema y la apariencia de la aplicación</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Modo Oscuro */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    {isDarkMode ? (
                      <Moon className="h-5 w-5 text-indigo-600" />
                    ) : (
                      <Sun className="h-5 w-5 text-yellow-600" />
                    )}
                    <div>
                      <Label htmlFor="dark-mode" className="text-base font-medium">
                        Modo Oscuro
                      </Label>
                      <p className="text-sm text-gray-600">Cambia entre tema claro y oscuro</p>
                    </div>
                  </div>
                  <Switch id="dark-mode" checked={isDarkMode} onCheckedChange={handleDarkModeToggle} />
                </div>

                {/* Idioma */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-600" />
                    <Label className="text-base font-medium">Idioma</Label>
                  </div>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="border-2 border-gray-200 focus:border-orange-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="pt">Português</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Configuraciones adicionales */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-800">Configuraciones de Visualización</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="animations">Animaciones</Label>
                      <Switch id="animations" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sounds">Sonidos de interfaz</Label>
                      <Switch id="sounds" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="high-contrast">Alto contraste</Label>
                      <Switch id="high-contrast" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ayuda Tab */}
          <TabsContent value="help" className="space-y-6">
            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  <HelpCircle className="h-5 w-5" />
                  Centro de Ayuda
                </CardTitle>
                <CardDescription>Encuentra respuestas y obtén soporte</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 bg-transparent"
                  >
                    <div className="font-medium">Preguntas Frecuentes</div>
                    <div className="text-sm text-gray-600">Encuentra respuestas rápidas</div>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 bg-transparent"
                  >
                    <div className="font-medium">Contactar Soporte</div>
                    <div className="text-sm text-gray-600">Habla con nuestro equipo</div>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-gradient-to-r hover:from-purple-50 hover:to-violet-50 bg-transparent"
                  >
                    <div className="font-medium">Guías de Usuario</div>
                    <div className="text-sm text-gray-600">Aprende a usar la app</div>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 bg-transparent"
                  >
                    <div className="font-medium">Reportar Problema</div>
                    <div className="text-sm text-gray-600">Informa errores o bugs</div>
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Información de la App</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Versión: 2.1.0</p>
                    <p>Última actualización: 20 Enero 2024</p>
                    <p>Términos de servicio • Política de privacidad</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default SettingsPage
