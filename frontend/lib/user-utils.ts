// lib/user-utils.ts
// Utilidades para trabajar con usuarios

/**
 * Obtiene las iniciales de un usuario
 */
export function getUserInitials(firstName?: string, lastName?: string): string {
  const first = (firstName || '').charAt(0).toUpperCase()
  const last = (lastName || '').charAt(0).toUpperCase()
  return (first + last) || 'U'
}

/**
 * Obtiene el nombre completo del usuario
 */
export function getUserFullName(firstName?: string, lastName?: string): string {
  return `${firstName || ''} ${lastName || ''}`.trim() || 'Usuario'
}

/**
 * Obtiene la URL de la foto de perfil o null si no existe
 */
export function getProfilePictureUrl(profilePicture?: string, profilePictureUrl?: string): string | null {
  if (profilePictureUrl) {
    return profilePictureUrl
  }
  if (profilePicture) {
    // Si es una URL completa, devolverla tal cual
    if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
      return profilePicture
    }
    // Si es una ruta relativa, construir la URL completa usando la variable de entorno
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    if (!apiUrl) {
      console.error('❌ NEXT_PUBLIC_API_URL no está configurada')
      return profilePicture
    }
    // Remover /api del final si está presente
    const baseUrl = apiUrl.replace(/\/api\/?$/, '')
    return `${baseUrl}${profilePicture.startsWith('/') ? '' : '/'}${profilePicture}`
  }
  return null
}

