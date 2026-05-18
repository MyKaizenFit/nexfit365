// middleware.ts
// Middleware para proteger rutas privadas y manejar autenticación

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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
  const { pathname } = request.nextUrl
  
  // Obtener token de autenticación desde cookies
  const accessToken = request.cookies.get('accessToken')?.value
  const refreshToken = request.cookies.get('refreshToken')?.value

  // Si el usuario ya está autenticado, no permitir acceso a la home (/)
  // y redirigir según su rol (admin -> /admin, usuario -> /dashboard o /initial-registration).
  if (pathname === '/' && accessToken) {
    try {
      // Tokens "offline_token_*" no son JWT; redirigir de forma segura
      if (!accessToken.includes('.')) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }

      const payload = JSON.parse(atob(accessToken.split('.')[1]))
      const userRole = (payload.role || '').toLowerCase()
      const isAdmin = payload.is_superuser || payload.is_staff || userRole === 'admin' || userRole === 'trainer'

      if (isAdmin) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }

      const formCompleted = request.cookies.get('initial_form_completed')?.value
      if (!formCompleted || formCompleted !== 'true') {
        return NextResponse.redirect(new URL('/initial-registration', request.url))
      }

      return NextResponse.redirect(new URL('/dashboard', request.url))
    } catch (error) {
      // Si no podemos decodificar el token, redirigir a dashboard por defecto
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }
  
  // Verificar si la ruta actual requiere autenticación
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )
  
  // Verificar si la ruta actual es solo para usuarios no autenticados
  const isPublicOnlyRoute = publicOnlyRoutes.some(route => 
    pathname.startsWith(route)
  )
  
  // Verificar si la ruta actual es solo para administradores
  const isAdminOnlyRoute = adminOnlyRoutes.some(route => 
    pathname.startsWith(route)
  )

  // Si no hay tokens y es una ruta protegida, redirigir al login
  if (isProtectedRoute && !accessToken) {
    const loginUrl = new URL('/auth', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Si hay tokens y es una ruta protegida (excepto el formulario inicial), verificar si el formulario está completo
  if (isProtectedRoute && accessToken && pathname !== '/initial-registration') {
    try {
      // Decodificar el token JWT para verificar el rol
      const payload = JSON.parse(atob(accessToken.split('.')[1]))
      const userRole = (payload.role || '').toLowerCase()
      const isAdmin = payload.is_superuser || payload.is_staff || userRole === 'admin' || userRole === 'trainer'
      
      // Los administradores no necesitan completar el formulario
      if (!isAdmin) {
        // Verificar si el formulario inicial está completo leyendo la cookie
        const formCompleted = request.cookies.get('initial_form_completed')?.value
        if (!formCompleted || formCompleted !== 'true') {
          // Si el formulario no está completo, redirigir al formulario de registro inicial
          return NextResponse.redirect(new URL('/initial-registration', request.url))
        }
      }
    } catch (error) {
      // Si hay error decodificando el token, permitir el acceso (ya que se valida en el backend)
    }
  }

  // Si hay tokens y es una ruta pública (como login), redirigir según el rol
  if (isPublicOnlyRoute && accessToken) {
    try {
      // Decodificar el token JWT para verificar el rol
      const payload = JSON.parse(atob(accessToken.split('.')[1]))
      // NO loguear payload del token por seguridad
      // Verificar roles de admin: superuser, staff, admin, trainer
      const userRole = (payload.role || '').toLowerCase()
      const isAdmin = payload.is_superuser || payload.is_staff || userRole === 'admin' || userRole === 'trainer'
      
      if (isAdmin) {
        // Si es admin, redirigir al panel de administrador
        return NextResponse.redirect(new URL('/admin', request.url))
      } else {
        // Verificar si el formulario inicial está completo leyendo la cookie
        const formCompleted = request.cookies.get('initial_form_completed')?.value
        if (!formCompleted || formCompleted !== 'true') {
          // Si el formulario no está completo, redirigir al formulario de registro inicial
          return NextResponse.redirect(new URL('/initial-registration', request.url))
        } else {
          // Si es usuario normal y el formulario está completo, redirigir al dashboard
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      }
    } catch (error) {
      // Si hay error decodificando el token, redirigir al dashboard por defecto
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Para rutas de administrador, verificar si el usuario es admin
  if (isAdminOnlyRoute && accessToken) {
    try {
      // Decodificar el token JWT para verificar el rol
      const payload = JSON.parse(atob(accessToken.split('.')[1]))
      // NO loguear payload del token por seguridad
      // Verificar roles de admin: superuser, staff, admin, trainer
      const userRole = (payload.role || '').toLowerCase()
      const isAdmin = payload.is_superuser || payload.is_staff || userRole === 'admin' || userRole === 'trainer'
      
      if (!isAdmin) {
        // Si no es admin, redirigir al dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url))
      } else {
      }
    } catch (error) {
      // Si hay error decodificando el token, redirigir al login
      return NextResponse.redirect(new URL('/auth', request.url))
    }
  }

  // Continuar con la request
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
