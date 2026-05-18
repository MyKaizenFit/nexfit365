"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface AdminRouteGuardProps {
  children: React.ReactNode
}

export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAdminAccess = async () => {
      // Esperar a que termine la carga de autenticación
      if (isLoading) {
        return
      }

      // Si no está autenticado, redirigir al login
      if (!isAuthenticated) {
        router.push('/auth')
        return
      }

      // Si no hay usuario pero está autenticado, esperar un poco más
      if (!user) {
        setIsChecking(true)
        return
      }

      // Si está autenticado pero no es admin, redirigir al dashboard
      // Verificar roles de admin: superuser, staff, admin, trainer
      const userRole = (user?.role || '').toLowerCase()
      const isAdmin = user && (user.is_superuser || user.is_staff || userRole === 'admin' || userRole === 'trainer')
      if (user && !isAdmin) {
        router.push('/dashboard')
        return
      }

      // Si es admin, permitir acceso
      if (isAdmin) {
        setIsChecking(false)
        return
      }

      setIsChecking(false)
    }

    checkAdminAccess()
  }, [user, isAuthenticated, isLoading, router])

  // Mostrar loading mientras se verifica
  if (isLoading || isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Verificando permisos...</h2>
            <p className="text-gray-600">Por favor espera mientras verificamos tu acceso al panel de administración.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Si no está autenticado o no es admin, mostrar mensaje de acceso denegado
  const userRole = (user?.role || '').toLowerCase()
  const isAdmin = user && (user.is_superuser || user.is_staff || userRole === 'admin' || userRole === 'trainer')
  if (!isAuthenticated || (user && !isAdmin)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acceso Denegado</h2>
            <p className="text-gray-600 mb-4">
              No tienes permisos para acceder al panel de administración.
            </p>
            <p className="text-sm text-gray-500">
              Solo los administradores pueden acceder a esta sección.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Si todo está bien, mostrar el contenido
  return <>{children}</>
}















