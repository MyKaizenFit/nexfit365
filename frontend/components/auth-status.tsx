// components/auth-status.tsx
// Componente para mostrar el estado de autenticación y probar la integración

"use client"

import { useAuth, useUser, useIsAdmin } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  LogOut, 
  User, 
  Shield, 
  Settings, 
  CheckCircle, 
  XCircle, 
  Mail, 
  UserCheck,
  Crown,
  Star
} from 'lucide-react'

export function AuthStatus() {
  const { isAuthenticated, isLoading, logout } = useAuth()
  const user = useUser()
  const isAdmin = useIsAdmin()

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto border-0 bg-white/80 backdrop-blur-sm shadow-xl">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mr-4"></div>
            <span className="text-lg text-gray-700 font-medium">Verificando autenticación...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isAuthenticated) {
    return (
      <Card className="w-full max-w-2xl mx-auto border-0 bg-white/80 backdrop-blur-sm shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-3">
            <User className="w-6 h-6 text-red-600" />
            No Autenticado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6 text-center">
            <Badge variant="secondary" className="px-4 py-2 text-base">
              Estado: No has iniciado sesión
            </Badge>
            <p className="text-gray-600 text-lg leading-relaxed">
              Para acceder a todas las funcionalidades de Nex-Fit, 
              necesitas iniciar sesión en tu cuenta personal.
            </p>
            <div className="pt-4">
              <Button 
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-3 text-lg"
                onClick={() => window.location.href = '/auth'}
              >
                Ir al Login <UserCheck className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-4xl mx-auto border-0 bg-white/80 backdrop-blur-sm shadow-xl">
      <CardHeader className="text-center pb-6">
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <CardTitle className="text-3xl font-bold text-gray-800 flex items-center justify-center gap-3">
          <User className="w-8 h-8 text-green-600" />
          Perfil de Usuario Activo
        </CardTitle>
        <p className="text-gray-600 text-lg mt-2">
          Tu cuenta está completamente verificada y lista para usar
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Estado de autenticación */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Badge variant="default" className="px-4 py-2 text-base bg-green-500 hover:bg-green-600">
              <CheckCircle className="w-4 h-4 mr-2" />
              Autenticado
            </Badge>
            {isAdmin && (
              <Badge variant="destructive" className="px-4 py-2 text-base flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Administrador
              </Badge>
            )}
            {user?.is_superuser && (
              <Badge variant="destructive" className="px-4 py-2 text-base flex items-center gap-2">
                <Star className="w-4 h-4" />
                Superusuario
              </Badge>
            )}
          </div>
          
          {/* Información del usuario */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Información Personal
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <div>
                    <span className="font-medium text-gray-700">Email:</span>
                    <span className="ml-2 text-gray-600">{user?.email}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                  <UserCheck className="w-5 h-5 text-green-600" />
                  <div>
                    <span className="font-medium text-gray-700">Nombre:</span>
                    <span className="ml-2 text-gray-600">
                      {user?.first_name} {user?.last_name}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                Permisos y Roles
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <div>
                    <span className="font-medium text-gray-700">Rol:</span>
                    <Badge variant="outline" className="ml-2">{user?.role}</Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                  <Settings className="w-5 h-5 text-orange-600" />
                  <div>
                    <span className="font-medium text-gray-700">Staff:</span>
                    <Badge variant={user?.is_staff ? "default" : "secondary"} className="ml-2">
                      {user?.is_staff ? "Sí" : "No"}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                  <Crown className="w-5 h-5 text-red-600" />
                  <div>
                    <span className="font-medium text-gray-700">Superusuario:</span>
                    <Badge variant={user?.is_superuser ? "destructive" : "secondary"} className="ml-2">
                      {user?.is_superuser ? "Sí" : "No"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200 text-blue-700 hover:text-blue-800 transition-all duration-300"
              onClick={() => window.location.href = '/dashboard'}
            >
              <Settings className="w-5 h-5 mr-2" />
              Ir al Dashboard
            </Button>
            <Button
              variant="destructive"
              size="lg"
              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
              onClick={logout}
            >
              <LogOut className="w-5 h-5 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
