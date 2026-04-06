// lib/fetch-with-auth.ts
// Helper para manejar refresh de token cuando hay error 401

/**
 * Helper para refrescar el token y obtener nuevos headers
 * Retorna los nuevos headers o null si no se pudo refrescar
 */
export async function handle401AndRefresh(getAuthHeaders: () => Promise<HeadersInit>): Promise<HeadersInit | null> {
  
  try {
    const { getAuthService } = await import('@/lib/auth-service')
    const authService = getAuthService()
    const refreshResult = await authService.refreshAccessToken()
    
    if (refreshResult.success && refreshResult.newToken) {
      const newHeaders = await getAuthHeaders()
      return newHeaders
    } else {
      if (typeof window !== 'undefined') {
        window.location.href = '/auth'
      }
      return null
    }
  } catch (error) {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth'
    }
    return null
  }
}

