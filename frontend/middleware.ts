// middleware.ts
// Middleware para proteger rutas privadas y manejar autenticación

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isAdminJwtPayload, isJwtExpired, parseJwtPayload } from '@/lib/jwt'
import { appHref, routePathname } from '@/lib/app-path'

const redirectTo = (request: NextRequest, path: string) =>
  NextResponse.redirect(appHref(request.url, path))

// Rutas que requieren autenticación
const protectedRoutes = [
  '/dashboard',
  '/admin',
  '/profile',
  '/workouts',
  '/nutrition',
  '/progress',
  '/achievements',
  '/recommendations',
  '/initial-registration',
]

// Rutas que solo pueden acceder usuarios no autenticados
const publicOnlyRoutes = [
  '/auth',
  '/login',
  '/register',
]

// Rutas que solo pueden acceder administradores
const adminOnlyRoutes = [
  '/admin',
]

export function middleware(request: NextRequest) {
  const pathname = routePathname(request.nextUrl.pathname)

  // Prefer JWT cookie (HttpOnly, readable by middleware). Fall back to session markers.
  const accessToken = request.cookies.get('accessToken')?.value
  const refreshToken = request.cookies.get('refreshToken')?.value
  const sessionMarker = request.cookies.get('nf_session')?.value === '1'
  const accessPayload = parseJwtPayload(accessToken)
  const hasUsableAccessToken = Boolean(
    (accessToken && accessPayload && !isJwtExpired(accessPayload)) || sessionMarker
  )
  const adminFromMarker = request.cookies.get('nf_is_admin')?.value === '1'

  // Si el usuario ya está autenticado, no permitir acceso a la home (/)
  // y redirigir según su rol (admin -> /admin, usuario -> /dashboard o /initial-registration).
  if (pathname === '/' && hasUsableAccessToken) {
    try {
      const isAdmin = isAdminJwtPayload(accessPayload) || adminFromMarker

      if (isAdmin) {
        return redirectTo(request, '/admin')
      }

      const formCompleted = request.cookies.get('initial_form_completed')?.value
      if (!formCompleted || formCompleted !== 'true') {
        return redirectTo(request, '/initial-registration')
      }

      return redirectTo(request, '/dashboard')
    } catch (error) {
      return redirectTo(request, '/dashboard')
    }
  }

  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  )

  const isPublicOnlyRoute = publicOnlyRoutes.some(route =>
    pathname.startsWith(route)
  )

  const isAdminOnlyRoute = adminOnlyRoutes.some(route =>
    pathname.startsWith(route)
  )

  if (isProtectedRoute && !hasUsableAccessToken) {
    if (refreshToken || sessionMarker) {
      return NextResponse.next()
    }

    const loginUrl = appHref(request.url, '/auth')
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isProtectedRoute && hasUsableAccessToken && pathname !== '/initial-registration') {
    try {
      const isAdmin = isAdminJwtPayload(accessPayload) || adminFromMarker

      if (!isAdmin) {
        const formCompleted = request.cookies.get('initial_form_completed')?.value
        if (!formCompleted || formCompleted !== 'true') {
          return redirectTo(request, '/initial-registration')
        }
      }
    } catch (error) {
      // Si hay error decodificando el token, permitir el acceso (ya que se valida en el backend)
    }
  }

  // EXCEPTION: never bounce away from /auth — stale HttpOnly JWTs caused
  // dashboard↔auth redirect loops that look like infinite loading.
  if (isPublicOnlyRoute && hasUsableAccessToken && !pathname.startsWith('/auth')) {
    try {
      const isAdmin = isAdminJwtPayload(accessPayload) || adminFromMarker

      if (isAdmin) {
        return redirectTo(request, '/admin')
      }

      const formCompleted = request.cookies.get('initial_form_completed')?.value
      if (!formCompleted || formCompleted !== 'true') {
        return redirectTo(request, '/initial-registration')
      }
      return redirectTo(request, '/dashboard')
    } catch (error) {
      return redirectTo(request, '/dashboard')
    }
  }

  if (isAdminOnlyRoute && hasUsableAccessToken) {
    try {
      const isAdmin = isAdminJwtPayload(accessPayload) || adminFromMarker

      if (!isAdmin) {
        return redirectTo(request, '/dashboard')
      }
    } catch (error) {
      return redirectTo(request, '/auth')
    }
  }

  return NextResponse.next()
}

// Configurar en qué rutas se ejecuta el middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sw.js (Service Worker)
     * - manifest.json (PWA manifest)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.json|public).*)',
  ],
}
