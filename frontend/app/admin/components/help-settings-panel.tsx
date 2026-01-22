"use client"

import { useState, useEffect } from "react"
import { HelpCircle, Save, Mail, BookOpen, FileText, AlertCircle, Info, Globe, ExternalLink } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { buildApiUrl, getAuthHeaders } from "@/lib/api"
import { helpService, HelpSettings } from "@/lib/help-service"

export function HelpSettingsPanel() {
  const [settings, setSettings] = useState<HelpSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await helpService.getHelpSettings()
      setSettings(data)
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

  const saveSettings = async () => {
    if (!settings) return

    try {
      setSaving(true)
      const token = localStorage.getItem('access_token')
      
      // Obtener el ID de la configuración activa
      const response = await fetch(buildApiUrl('help-settings/'), {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
        },
      })

      const allSettings = await response.json()
      const activeSetting = Array.isArray(allSettings) 
        ? allSettings.find((s: HelpSettings) => s.is_active) 
        : allSettings

      const updateUrl = activeSetting 
        ? buildApiUrl(`help-settings/${activeSetting.id}/`)
        : buildApiUrl('help-settings/')

      const updateResponse = await fetch(updateUrl, {
        method: activeSetting ? 'PUT' : 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (!updateResponse.ok) {
        throw new Error('Error al guardar la configuración')
      }

      toast({
        title: "✅ Configuración guardada",
        description: "Los cambios se han guardado correctamente",
      })

      await loadSettings()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo guardar la configuración",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: keyof HelpSettings, value: any) => {
    if (!settings) return
    setSettings({ ...settings, [field]: value })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">Cargando configuración...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">No se pudo cargar la configuración</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <HelpCircle className="h-6 w-6 text-blue-600" />
            Configuración de Ayuda
          </CardTitle>
          <CardDescription>
            Gestiona las URLs, correos y contenido del sistema de ayuda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.is_active}
                onCheckedChange={(checked) => updateField('is_active', checked)}
              />
              <Label>Configuración Activa</Label>
            </div>
            <Button
              onClick={saveSettings}
              disabled={saving}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="faq" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="contact">Contacto</TabsTrigger>
          <TabsTrigger value="guides">Guías</TabsTrigger>
          <TabsTrigger value="report">Reportes</TabsTrigger>
        </TabsList>

        {/* FAQ Tab */}
        <TabsContent value="faq" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                Configuración de FAQ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Activar FAQ</Label>
                  <p className="text-sm text-gray-500">Mostrar la sección de preguntas frecuentes</p>
                </div>
                <Switch
                  checked={settings.faq_enabled}
                  onCheckedChange={(checked) => updateField('faq_enabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="faq_url">URL Externa de FAQ (Opcional)</Label>
                <Input
                  id="faq_url"
                  type="url"
                  placeholder="https://..."
                  value={settings.faq_url || ''}
                  onChange={(e) => updateField('faq_url', e.target.value || null)}
                />
                <p className="text-sm text-gray-500">
                  Si se especifica, redirigirá a esta URL en lugar de mostrar la página interna
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="faq_content">Contenido HTML de FAQ</Label>
                <Textarea
                  id="faq_content"
                  placeholder="Contenido HTML personalizado para la página de FAQ..."
                  value={settings.faq_content || ''}
                  onChange={(e) => updateField('faq_content', e.target.value || null)}
                  rows={10}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-gray-500">
                  Si se especifica contenido, se mostrará en lugar de las FAQs por defecto
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-green-600" />
                Configuración de Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Activar Contacto</Label>
                  <p className="text-sm text-gray-500">Permitir contacto por email</p>
                </div>
                <Switch
                  checked={settings.contact_enabled}
                  onCheckedChange={(checked) => updateField('contact_enabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_email">Email de Contacto</Label>
                <Input
                  id="contact_email"
                  type="email"
                  placeholder="soporte@nexfit365.com"
                  value={settings.contact_email}
                  onChange={(e) => updateField('contact_email', e.target.value)}
                />
                <p className="text-sm text-gray-500">
                  Email al que se enviarán las consultas de contacto
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Guides Tab */}
        <TabsContent value="guides" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Configuración de Guías de Usuario
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Activar Guías</Label>
                  <p className="text-sm text-gray-500">Mostrar la sección de guías de usuario</p>
                </div>
                <Switch
                  checked={settings.guides_enabled}
                  onCheckedChange={(checked) => updateField('guides_enabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guides_url">URL Externa de Guías (Opcional)</Label>
                <Input
                  id="guides_url"
                  type="url"
                  placeholder="https://..."
                  value={settings.guides_url || ''}
                  onChange={(e) => updateField('guides_url', e.target.value || null)}
                />
                <p className="text-sm text-gray-500">
                  Si se especifica, redirigirá a esta URL en lugar de mostrar la página interna
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guides_content">Contenido HTML de Guías</Label>
                <Textarea
                  id="guides_content"
                  placeholder="Contenido HTML personalizado para las guías..."
                  value={settings.guides_content || ''}
                  onChange={(e) => updateField('guides_content', e.target.value || null)}
                  rows={15}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-gray-500">
                  Si se especifica contenido, se mostrará en lugar de las guías por defecto
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report Tab */}
        <TabsContent value="report" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Configuración de Reportes de Problemas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Activar Reportes</Label>
                  <p className="text-sm text-gray-500">Permitir que los usuarios reporten problemas</p>
                </div>
                <Switch
                  checked={settings.report_enabled}
                  onCheckedChange={(checked) => updateField('report_enabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="report_email">Email para Reportes</Label>
                <Input
                  id="report_email"
                  type="email"
                  placeholder="soporte@nexfit365.com"
                  value={settings.report_email}
                  onChange={(e) => updateField('report_email', e.target.value)}
                />
                <p className="text-sm text-gray-500">
                  Email al que se enviarán los reportes de problemas
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="report_redirect_url">URL de Redirección (Opcional)</Label>
                <Input
                  id="report_redirect_url"
                  type="url"
                  placeholder="https://..."
                  value={settings.report_redirect_url || ''}
                  onChange={(e) => updateField('report_redirect_url', e.target.value || null)}
                />
                <p className="text-sm text-gray-500">
                  URL a donde redirigir después de enviar un reporte (dejar vacío para usar la página por defecto)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Información de la App */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-gray-600" />
            Información de la Aplicación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="app_version">Versión de la Aplicación</Label>
              <Input
                id="app_version"
                value={settings.app_version}
                onChange={(e) => updateField('app_version', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_update_date">Última Actualización</Label>
              <Input
                id="last_update_date"
                value={settings.last_update_date}
                onChange={(e) => updateField('last_update_date', e.target.value)}
                placeholder="Diciembre 2024"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="terms_url">URL de Términos de Servicio</Label>
              <Input
                id="terms_url"
                type="url"
                placeholder="https://..."
                value={settings.terms_url || ''}
                onChange={(e) => updateField('terms_url', e.target.value || null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="privacy_url">URL de Política de Privacidad</Label>
              <Input
                id="privacy_url"
                type="url"
                placeholder="https://..."
                value={settings.privacy_url || ''}
                onChange={(e) => updateField('privacy_url', e.target.value || null)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

