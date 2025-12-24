/**
 * Utilidad para limpiar la caché del usuario después de correcciones en el backend
 * Usar cuando se hayan corregido datos de usuarios en la base de datos
 */

import { apiCache } from './api-cache'
import { generateCacheKey } from './api-cache'
import { AUTH_ENDPOINTS } from './auth-service'

/**
 * Limpia toda la caché relacionada con el usuario
 */
export function clearUserCache() {
  // Limpiar caché del perfil
  const profileCacheKey = generateCacheKey('accounts/profile/')
  apiCache.delete(profileCacheKey)
  
  // Limpiar caché de auth-me
  const authCacheKey = generateCacheKey(AUTH_ENDPOINTS.ME)
  apiCache.delete(authCacheKey)
  
  // Limpiar caché de estadísticas del usuario
  const statsCacheKey = generateCacheKey('/user-stats/')
  apiCache.delete(statsCacheKey)
  
  // Limpiar localStorage relacionado con el usuario
  if (typeof window !== 'undefined') {
    localStorage.removeItem('userProfile')
    localStorage.removeItem('user_profile')
    localStorage.removeItem('initial_form_completed')
  }
  
  console.log('✅ Caché del usuario limpiada')
}

/**
 * Limpia toda la caché de la aplicación
 */
export function clearAllCache() {
  apiCache.clear()
  
  if (typeof window !== 'undefined') {
    localStorage.clear()
    sessionStorage.clear()
  }
  
  console.log('✅ Toda la caché limpiada')
}


