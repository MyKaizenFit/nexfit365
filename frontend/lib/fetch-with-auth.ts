// lib/fetch-with-auth.ts
// Helper para manejar refresh de token cuando hay error 401

import { HeadersInit } from 'react'

/**
 * Helper para refrescar el token y obtener nuevos headers
 * Retorna los nuevos headers o null si no se pudo refrescar
 */
export async function handle401AndRefresh(getAuthHeaders: () => Promise<HeadersInit>): Promise<HeadersInit | null> {
  console.log('🔄 Token expirado, intentando refrescar...')
  
  try {
    const { authService } = await import('@/lib/auth-service')
    const refreshResult = await authService.refreshAccessToken()
    
    if (refreshResult.success && refreshResult.newToken) {
      console.log('✅ Token refrescado exitosamente')
      const newHeaders = await getAuthHeaders()
      return newHeaders
    } else {
      console.error('❌ No se pudo refrescar el token:', refreshResult.error)
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login'
      }
      return null
    }
  } catch (error) {
    console.error('Error al refrescar token:', error)
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
    return null
  }
}

