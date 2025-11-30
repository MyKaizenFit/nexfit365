"use client"

import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Shield, Calendar, Mail, Phone, MapPin } from "lucide-react"

export function AdminProfile() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Perfil del Administrador
        </CardTitle>
        <CardDescription>
          Información personal y datos de acceso
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Información básica */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Nombre completo</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {user.first_name} {user.last_name}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Email</span>
            </div>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>

          {user.phone && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Teléfono</span>
              </div>
              <p className="text-sm text-muted-foreground">{user.phone}</p>
            </div>
          )}

          {user.date_of_birth && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Fecha de nacimiento</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {new Date(user.date_of_birth).toLocaleDateString('es-ES')}
              </p>
            </div>
          )}
        </div>

        {/* Información física */}
        {(user.height || user.weight) && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Información Física</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.height && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Altura</span>
                  <p className="text-sm text-muted-foreground">{user.height} cm</p>
                </div>
              )}
              {user.weight && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Peso</span>
                  <p className="text-sm text-muted-foreground">{user.weight} kg</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Roles y permisos */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Roles y Permisos</h4>
          <div className="flex flex-wrap gap-2">
            {user.is_superuser && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Super Usuario
              </Badge>
            )}
            {user.is_staff && (
              <Badge variant="default" className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Staff
              </Badge>
            )}
            {user.role && (
              <Badge variant="secondary">
                {user.role}
              </Badge>
            )}
          </div>
        </div>

        {/* Información de objetivos */}
        {(user.fitness_goals || user.activity_level) && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Objetivos y Actividad</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.fitness_goals && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Objetivo de fitness</span>
                  <p className="text-sm text-muted-foreground capitalize">
                    {typeof user.fitness_goals === 'string' 
                      ? user.fitness_goals.replace('_', ' ') 
                      : Array.isArray(user.fitness_goals) 
                        ? user.fitness_goals.join(', ')
                        : 'No especificado'}
                  </p>
                </div>
              )}
              {user.activity_level && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Nivel de actividad</span>
                  <p className="text-sm text-muted-foreground capitalize">
                    {user.activity_level}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Información médica */}
        {user.medical_conditions && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Información Médica</h4>
            <div className="space-y-2">
              <span className="text-sm font-medium">Condiciones médicas</span>
              <p className="text-sm text-muted-foreground">{user.medical_conditions}</p>
            </div>
          </div>
        )}

        {/* Contacto de emergencia */}
        {(user.emergency_contact_name || user.emergency_contact_phone) && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Contacto de Emergencia</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.emergency_contact_name && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Nombre</span>
                  <p className="text-sm text-muted-foreground">{user.emergency_contact_name}</p>
                </div>
              )}
              {user.emergency_contact_phone && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Teléfono</span>
                  <p className="text-sm text-muted-foreground">{user.emergency_contact_phone}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fechas importantes */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Fechas Importantes</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-sm font-medium">Miembro desde</span>
              <p className="text-sm text-muted-foreground">
                {new Date(user.date_joined).toLocaleDateString('es-ES')}
              </p>
            </div>
            {user.last_login && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Último acceso</span>
                <p className="text-sm text-muted-foreground">
                  {new Date(user.last_login).toLocaleDateString('es-ES')}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}








