// lib/help-service.ts
// Servicio para gestionar configuración de ayuda y reportes de problemas

import { buildApiUrl, getAuthHeaders, handleApiResponse } from './api'
import { getAuthService } from './auth-service'

export interface HelpSettings {
  id: string
  faq_enabled: boolean
  faq_url: string | null
  faq_content: string | null
  contact_email: string
  contact_enabled: boolean
  guides_enabled: boolean
  guides_url: string | null
  guides_content: string | null
  report_enabled: boolean
  report_email: string
  report_redirect_url: string | null
  app_version: string
  last_update_date: string
  terms_url: string | null
  privacy_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProblemReport {
  id: string
  user?: string | null
  user_email?: string
  user_name?: string
  problem_type: 'bug' | 'feature' | 'ui' | 'performance' | 'other'
  subject: string
  description: string
  steps_to_reproduce?: string
  expected_behavior?: string
  actual_behavior?: string
  browser_info?: string
  device_info?: string
  url?: string
  screenshot_url?: string
  contact_email?: string
  status: 'pending' | 'in_review' | 'resolved' | 'closed'
  admin_notes?: string
  resolved_at?: string
  resolved_by?: string
  created_at: string
  updated_at: string
}

export interface CreateProblemReportData {
  problem_type: 'bug' | 'feature' | 'ui' | 'performance' | 'other'
  subject: string
  description: string
  steps_to_reproduce?: string
  expected_behavior?: string
  actual_behavior?: string
  browser_info?: string
  device_info?: string
  url?: string
  screenshot_url?: string
  contact_email?: string
}

class HelpService {
  /**
   * Obtener configuración activa de ayuda
   */
  async getHelpSettings(): Promise<HelpSettings> {
    try {
      const url = buildApiUrl('help-settings/active/')
      console.log('🔍 Obteniendo configuración de ayuda desde:', url)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })

      console.log('📡 Respuesta del servidor:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Error en respuesta:', errorText)
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const result = await handleApiResponse<HelpSettings>(response)
      
      if (result.error) {
        throw new Error(result.error)
      }

      if (!result.data) {
        throw new Error('No se recibieron datos de configuración de ayuda')
      }

      console.log('✅ Configuración obtenida:', result.data)
      return result.data
    } catch (error) {
      console.error('❌ Error obteniendo configuración de ayuda:', error)
      // Devolver configuración por defecto en caso de error
      return {
        id: '',
        faq_enabled: true,
        faq_url: null,
        faq_content: null,
        contact_email: 'soporte@nexfit365.com',
        contact_enabled: true,
        guides_enabled: true,
        guides_url: null,
        guides_content: null,
        report_enabled: true,
        report_email: 'soporte@nexfit365.com',
        report_redirect_url: null,
        app_version: '2.1.0',
        last_update_date: 'Diciembre 2024',
        terms_url: null,
        privacy_url: null,
        is_active: true,
        created_at: '',
        updated_at: '',
      }
    }
  }

  /**
   * Crear un reporte de problema
   */
  async createProblemReport(data: CreateProblemReportData): Promise<ProblemReport> {
    try {
      const authService = getAuthService()
      const token = authService.getAccessToken()
      
      const response = await fetch(buildApiUrl('problem-reports/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      })

      const result = await handleApiResponse<ProblemReport>(response)
      
      if (result.error) {
        throw new Error(result.error)
      }

      if (!result.data) {
        throw new Error('No se recibió confirmación del reporte')
      }

      return result.data
    } catch (error) {
      console.error('Error creando reporte de problema:', error)
      throw error
    }
  }

  /**
   * Obtener información del navegador y dispositivo
   */
  getBrowserInfo(): string {
    if (typeof window === 'undefined') return ''
    
    const ua = navigator.userAgent
    const browser = this.detectBrowser(ua)
    const os = this.detectOS(ua)
    
    return `${browser} - ${os}`
  }

  /**
   * Detectar navegador
   */
  private detectBrowser(ua: string): string {
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
    if (ua.includes('Edg')) return 'Edge'
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera'
    return 'Desconocido'
  }

  /**
   * Detectar sistema operativo
   */
  private detectOS(ua: string): string {
    if (ua.includes('Windows')) return 'Windows'
    if (ua.includes('Mac')) return 'macOS'
    if (ua.includes('Linux')) return 'Linux'
    if (ua.includes('Android')) return 'Android'
    if (ua.includes('iOS')) return 'iOS'
    return 'Desconocido'
  }
}

// Instancia singleton
export const helpService = new HelpService()

