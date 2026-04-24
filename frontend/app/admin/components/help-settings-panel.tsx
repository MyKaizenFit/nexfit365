"use client"

import { useState, useEffect, useCallback } from "react"
import { HelpCircle, Save, Mail, BookOpen, FileText, AlertCircle, Info, Globe, ExternalLink, Loader2, Bug, Lightbulb, Monitor, Zap, CheckCircle2, Clock, RefreshCw, ChevronDown, ChevronUp, MessageSquare } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { buildApiUrl, getAuthHeaders } from "@/lib/api"
import { helpService, HelpSettings } from "@/lib/help-service"
import { useAuth } from "@/contexts/auth-context"
import { TipsBoard } from "@/components/tips/tips-board"

interface ProblemReport {
  id: number
  user_email: string
  user_name: string
  problem_type: string
  subject: string
  description: string
  steps_to_reproduce: string
  expected_behavior: string
  actual_behavior: string
  browser_info: string
  device_info: string
  url: string
  contact_email: string
  status: 'pending' | 'in_review' | 'resolved' | 'closed'
  admin_notes: string
  resolved_at: string | null
  resolved_by_email: string | null
  created_at: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  in_review: { label: 'En Revisión', color: 'bg-blue-100 text-blue-800' },
  resolved: { label: 'Resuelto', color: 'bg-green-100 text-green-800' },
  closed: { label: 'Cerrado', color: 'bg-gray-100 text-gray-700' },
}

const TYPE_ICON: Record<string, any> = {
  bug: Bug, feature: Lightbulb, ui: Monitor, performance: Zap, other: AlertCircle,
}

function ProblemReportsPanel() {
  const { getAuthHeaders: authHeaders } = useAuth()
  const [reports, setReports] = useState<ProblemReport[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [saving, setSaving] = useState<number | null>(null)
  const [adminNotes, setAdminNotes] = useState<Record<number, string>>({})
  const [statusFilter, setStatusFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const headers = await authHeaders()
      const res = await fetch(buildApiUrl('problem-reports/?ordering=-created_at'), { headers: headers as HeadersInit })
      if (res.ok) {
        const data = await res.json()
        setReports(data.results ?? data)
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar los reportes.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [authHeaders])

  useEffect(() => { load() }, [load])

  const handleUpdateStatus = async (id: number, status: string) => {
    setSaving(id)
    try {
      const headers = await authHeaders()
      const body: Record<string, any> = { status }
      if (adminNotes[id] !== undefined) body.admin_notes = adminNotes[id]

      const res = await fetch(buildApiUrl(`problem-reports/${id}/`), {
        method: 'PATCH',
        headers: { ...(headers as Record<string, string>), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const updated = await res.json()
        setReports(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r))
        toast({ title: '✅ Reporte actualizado' })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar.', variant: 'destructive' })
    } finally {
      setSaving(null)
    }
  }

  const filtered = statusFilter === 'all' ? reports : reports.filter(r => r.status === statusFilter)
  const pendingCount = reports.filter(r => r.status === 'pending').length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-orange-600" />
            Reportes Recibidos
            {pendingCount > 0 && (
              <Badge className="bg-orange-100 text-orange-800 ml-1">{pendingCount} pendientes</Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-1" />Actualizar
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          {['all', 'pending', 'in_review', 'resolved', 'closed'].map(s => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7"
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'Todos' : STATUS_LABELS[s]?.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No hay reportes{statusFilter !== 'all' ? ' con este estado' : ''}.</p>
        )}
        {!loading && filtered.map(r => {
          const Icon = TYPE_ICON[r.problem_type] || AlertCircle
          const st = STATUS_LABELS[r.status] || STATUS_LABELS.pending
          const isOpen = expanded === r.id
          return (
            <div key={r.id} className="border rounded-lg overflow-hidden">
              <button
                className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
                onClick={() => setExpanded(isOpen ? null : r.id)}
              >
                <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{r.subject}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {r.user_email || r.contact_email || 'Anónimo'} · {new Date(r.created_at).toLocaleDateString('es')}
                  </div>
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 flex-shrink-0" />}
              </button>

              {isOpen && (
                <div className="border-t p-3 space-y-3 bg-muted/10">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Descripción</p>
                    <p className="text-sm">{r.description}</p>
                  </div>
                  {r.steps_to_reproduce && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Pasos para reproducir</p>
                      <p className="text-sm whitespace-pre-wrap">{r.steps_to_reproduce}</p>
                    </div>
                  )}
                  {r.expected_behavior && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Comportamiento esperado</p>
                        <p className="text-sm">{r.expected_behavior}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Comportamiento actual</p>
                        <p className="text-sm">{r.actual_behavior}</p>
                      </div>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {r.browser_info && <p>Navegador: {r.browser_info}</p>}
                    {r.device_info && <p>Dispositivo: {r.device_info}</p>}
                    {r.url && <p>URL: {r.url}</p>}
                  </div>

                  {/* Gestión admin */}
                  <div className="border-t pt-3 space-y-2">
                    <Label className="text-xs">Notas del administrador</Label>
                    <Textarea
                      rows={2}
                      value={adminNotes[r.id] ?? r.admin_notes}
                      onChange={e => setAdminNotes(p => ({ ...p, [r.id]: e.target.value }))}
                      placeholder="Añade notas internas..."
                      className="text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <Select
                        value={r.status}
                        onValueChange={val => handleUpdateStatus(r.id, val)}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="in_review">En Revisión</SelectItem>
                          <SelectItem value="resolved">Resuelto</SelectItem>
                          <SelectItem value="closed">Cerrado</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        disabled={saving === r.id}
                        onClick={() => handleUpdateStatus(r.id, r.status)}
                      >
                        {saving === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Guardar notas'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="contact">Contacto</TabsTrigger>
          <TabsTrigger value="guides">Guías</TabsTrigger>
          <TabsTrigger value="tips">Tips</TabsTrigger>
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

        <TabsContent value="tips" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-600" />
                Gestión de tips y mensajes de bienestar
              </CardTitle>
              <CardDescription>
                Crea, edita, destaca, oculta o elimina consejos motivacionales visibles para los usuarios.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TipsBoard showCreateForm={true} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report Tab */}
        <TabsContent value="report" className="space-y-4">
          {/* Lista de reportes recibidos */}
          <ProblemReportsPanel />

          {/* Configuración del formulario */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Configuración del Formulario de Reportes
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

