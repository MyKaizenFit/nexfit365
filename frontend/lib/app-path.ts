/**
 * Ruta base pública de NexFit.
 *
 * Producción nueva:
 *   NEXT_PUBLIC_BASE_PATH=/nexfit
 *
 * Desarrollo / despliegue antiguo:
 *   NEXT_PUBLIC_BASE_PATH=
 */
const normalizeBasePath = (value: string): string => {
  const trimmed = value.trim()

  if (!trimmed || trimmed === '/') {
    return ''
  }

  const normalized = trimmed.replace(/\/+$/, '')

  if (!normalized.startsWith('/')) {
    throw new Error('NEXT_PUBLIC_BASE_PATH debe estar vacío o empezar por /')
  }

  return normalized
}

export const APP_BASE_PATH = normalizeBasePath(
  process.env.NEXT_PUBLIC_BASE_PATH || ''
)

/**
 * Convierte una ruta interna de la aplicación a su ruta pública.
 *
 * appPath('/dashboard')
 *   -> /dashboard          sin basePath
 *   -> /nexfit/dashboard  con basePath=/nexfit
 *
 * Las URLs absolutas y enlaces especiales se mantienen intactos.
 */
export const appPath = (path = '/'): string => {
  if (
    /^https?:\/\//i.test(path) ||
    path.startsWith('mailto:') ||
    path.startsWith('tel:') ||
    path.startsWith('#')
  ) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  // Evitar duplicar el prefijo si la ruta ya lo contiene.
  if (
    APP_BASE_PATH &&
    (normalizedPath === APP_BASE_PATH ||
      normalizedPath.startsWith(`${APP_BASE_PATH}/`) ||
      normalizedPath.startsWith(`${APP_BASE_PATH}?`) ||
      normalizedPath.startsWith(`${APP_BASE_PATH}#`))
  ) {
    return normalizedPath
  }

  if (!APP_BASE_PATH) {
    return normalizedPath
  }

  if (normalizedPath === '/') {
    return `${APP_BASE_PATH}/`
  }

  return `${APP_BASE_PATH}${normalizedPath}`
}

/**
 * Comprueba rutas usando window.location.pathname sin depender
 * de si la aplicación está desplegada en / o en /nexfit.
 */
export const isAppPath = (pathname: string, path: string): boolean => {
  const pathOnly = path.split(/[?#]/, 1)[0] || '/'
  const target = appPath(pathOnly).replace(/\/$/, '')

  return pathname === target || pathname.startsWith(`${target}/`)
}
