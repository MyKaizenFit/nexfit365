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
      const isAdmin = payload.is_superuser || payload.is_staff || payload.role === 'admin'
      
      // Los administradores no necesitan completar el formulario
      if (!isAdmin) {
        // Verificar si el formulario inicial está completo leyendo la cookie
        const formCompleted = request.cookies.get('initial_form_completed')?.value
        if (!formCompleted || formCompleted !== 'true') {
          // Si el formulario no está completo, redirigir al formulario de registro inicial
          console.log('🔒 Middleware - Bloqueando acceso: formulario pendiente, redirigiendo a /initial-registration')
          return NextResponse.redirect(new URL('/initial-registration', request.url))
        }
      }
    } catch (error) {
      // Si hay error decodificando el token, permitir el acceso (ya que se valida en el backend)
      console.error('Error decodificando token en middleware (protected route):', error)
    }
  }

  // Si hay tokens y es una ruta pública (como login), redirigir según el rol
  if (isPublicOnlyRoute && accessToken) {
    try {
      // Decodificar el token JWT para verificar el rol
      const payload = JSON.parse(atob(accessToken.split('.')[1]))
      console.log('🔍 Middleware - Payload del token:', payload)
      // Verificar tanto 'ADMIN' (mayúsculas) como 'admin' (minúsculas) para compatibilidad
      const isAdmin = payload.is_superuser || payload.is_staff || payload.role === 'ADMIN' || payload.role === 'admin'
      
      if (isAdmin) {
        // Si es admin, redirigir al panel de administrador
        console.log('🔀 Middleware - Redirigiendo a /admin (usuario administrador)')
        return NextResponse.redirect(new URL('/admin', request.url))
      } else {
        // Verificar si el formulario inicial está completo leyendo la cookie
        const formCompleted = request.cookies.get('initial_form_completed')?.value
        if (!formCompleted || formCompleted !== 'true') {
          // Si el formulario no está completo, redirigir al formulario de registro inicial
          console.log('🔀 Middleware - Redirigiendo a /initial-registration (formulario pendiente)')
          return NextResponse.redirect(new URL('/initial-registration', request.url))
        } else {
          // Si es usuario normal y el formulario está completo, redirigir al dashboard
          console.log('🔀 Middleware - Redirigiendo a /dashboard (usuario normal)')
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      }
    } catch (error) {
      // Si hay error decodificando el token, redirigir al dashboard por defecto
      console.error('Error decodificando token en middleware:', error)
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Para rutas de administrador, verificar si el usuario es admin
  if (isAdminOnlyRoute && accessToken) {
    try {
      // Decodificar el token JWT para verificar el rol
      const payload = JSON.parse(atob(accessToken.split('.')[1]))
      console.log('🔍 Middleware Admin - Payload del token:', payload)
      // Verificar tanto 'ADMIN' (mayúsculas) como 'admin' (minúsculas) para compatibilidad
      const isAdmin = payload.is_superuser || payload.is_staff || payload.role === 'ADMIN' || payload.role === 'admin'
      
      if (!isAdmin) {
        // Si no es admin, redirigir al dashboard
        console.log('🚫 Middleware - Usuario no es admin, redirigiendo a /dashboard')
        return NextResponse.redirect(new URL('/dashboard', request.url))
      } else {
        console.log('✅ Middleware - Usuario es admin, permitiendo acceso')
      }
    } catch (error) {
      // Si hay error decodificando el token, redirigir al login
      console.error('Error decodificando token en middleware admin:', error)
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
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
