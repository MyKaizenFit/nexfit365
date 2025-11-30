# 🔧 Guía de Troubleshooting - Nex-Fit

## 📋 Resumen

Esta guía proporciona soluciones detalladas para los problemas más comunes que pueden surgir durante el desarrollo, despliegue y mantenimiento de Nex-Fit.

## 🚨 Problemas Críticos

### **1. Error 500 - Internal Server Error**

#### **Síntomas**
- La aplicación muestra error 500
- Los logs muestran excepciones no manejadas
- La aplicación no responde correctamente

#### **Diagnóstico**
```bash
# Verificar logs del backend
cd backend
tail -f logs/django.log

# Verificar estado de la base de datos
python manage.py check --database default

# Verificar migraciones
python manage.py showmigrations
```

#### **Soluciones Comunes**

**Problema: Migraciones pendientes**
```bash
# Aplicar migraciones
python manage.py migrate

# Si hay conflictos, crear migraciones
python manage.py makemigrations
python manage.py migrate
```

**Problema: Variables de entorno faltantes**
```bash
# Verificar variables de entorno
python manage.py check

# Configurar variables faltantes
export SECRET_KEY="your-secret-key"
export DATABASE_URL="your-database-url"
```

**Problema: Archivos estáticos no encontrados**
```bash
# Recolectar archivos estáticos
python manage.py collectstatic --noinput

# Verificar configuración de archivos estáticos
python manage.py check --deploy
```

### **2. Error 401 - Unauthorized**

#### **Síntomas**
- Usuarios no pueden iniciar sesión
- Tokens JWT inválidos
- Acceso denegado a endpoints protegidos

#### **Diagnóstico**
```bash
# Verificar configuración JWT
python manage.py shell
>>> from django.conf import settings
>>> print(settings.SIMPLE_JWT)

# Verificar tokens en el frontend
# Abrir DevTools > Application > Local Storage
# Verificar que los tokens estén presentes
```

#### **Soluciones Comunes**

**Problema: Token expirado**
```typescript
// Frontend: Implementar renovación automática
const refreshToken = async () => {
  try {
    const response = await fetch('/api/auth/refresh/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: localStorage.getItem('refresh_token') })
    })
    
    if (response.ok) {
      const data = await response.json()
      localStorage.setItem('access_token', data.access)
    }
  } catch (error) {
    // Redirigir al login
    window.location.href = '/auth'
  }
}
```

**Problema: Configuración CORS incorrecta**
```python
# backend/settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://mykaizenfit.vercel.app",
]

CORS_ALLOW_CREDENTIALS = True
```

### **3. Error 429 - Too Many Requests**

#### **Síntomas**
- Requests fallan con error 429
- Mensaje "Too many requests"
- Aplicación se vuelve lenta

#### **Diagnóstico**
```bash
# Verificar logs de rate limiting
grep "429" logs/django.log

# Verificar configuración de throttling
python manage.py shell
>>> from django.conf import settings
>>> print(settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'])
```

#### **Soluciones Comunes**

**Problema: Throttling muy restrictivo**
```python
# backend/settings.py
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_RATES': {
        'anon': '1000/hour',
        'user': '2000/hour',
        'login': '20/hour',
        'register': '10/hour',
    }
}
```

**Problema: Múltiples requests simultáneos**
```typescript
// Frontend: Implementar throttling
const throttledRequest = throttle(async (url: string) => {
  return await fetch(url)
}, 1000) // 1 segundo entre requests
```

## 🐛 Problemas de Frontend

### **1. Error de Módulos No Encontrados**

#### **Síntomas**
- Error "Module not found"
- Componentes no se importan correctamente
- Build falla

#### **Diagnóstico**
```bash
# Verificar estructura de archivos
ls -la frontend/app/
ls -la frontend/components/

# Verificar imports
grep -r "import.*from" frontend/app/
```

#### **Soluciones Comunes**

**Problema: Rutas de importación incorrectas**
```typescript
// ❌ Incorrecto
import { Button } from '../../../components/ui/button'

// ✅ Correcto
import { Button } from '@/components/ui/button'
```

**Problema: Configuración de TypeScript**
```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### **2. Error de Hidratación**

#### **Síntomas**
- Warning de hidratación en consola
- Contenido parpadea al cargar
- Errores de SSR/SSG

#### **Diagnóstico**
```bash
# Verificar en DevTools
# Console > Warnings de hidratación
# Elements > Verificar diferencias entre servidor y cliente
```

#### **Soluciones Comunes**

**Problema: Contenido dinámico en SSR**
```typescript
// Usar useEffect para contenido dinámico
import { useEffect, useState } from 'react'

function DynamicComponent() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) return null
  
  return <div>Contenido dinámico</div>
}
```

**Problema: Fechas en diferentes zonas horarias**
```typescript
// Usar fecha consistente
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('es-ES', {
    timeZone: 'UTC'
  })
}
```

### **3. Error de Estado No Sincronizado**

#### **Síntomas**
- Estado no se actualiza correctamente
- Componentes no re-renderizan
- Datos inconsistentes

#### **Diagnóstico**
```bash
# Verificar en DevTools
# React DevTools > Components
# Verificar estado de hooks y contextos
```

#### **Soluciones Comunes**

**Problema: Estado no se actualiza**
```typescript
// Usar useCallback para funciones
const handleUpdate = useCallback((id: string, data: any) => {
  setItems(prev => prev.map(item => 
    item.id === id ? { ...item, ...data } : item
  ))
}, [])
```

**Problema: Contexto no se actualiza**
```typescript
// Verificar dependencias del contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  
  // Memoizar el valor del contexto
  const value = useMemo(() => ({
    user,
    setUser
  }), [user])
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
```

## 🗄️ Problemas de Base de Datos

### **1. Error de Conexión a Base de Datos**

#### **Síntomas**
- Error "connection refused"
- Timeout de conexión
- Aplicación no puede conectar a BD

#### **Diagnóstico**
```bash
# Verificar conexión
python manage.py dbshell

# Verificar variables de entorno
echo $DATABASE_URL

# Verificar estado de la base de datos
python manage.py check --database default
```

#### **Soluciones Comunes**

**Problema: URL de base de datos incorrecta**
```bash
# Verificar formato de URL
export DATABASE_URL="postgresql://user:password@host:port/database"

# Verificar SSL
export DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
```

**Problema: Credenciales incorrectas**
```bash
# Verificar credenciales
psql -h host -U user -d database

# Actualizar credenciales en variables de entorno
export DATABASE_URL="postgresql://newuser:newpassword@host:port/database"
```

### **2. Error de Migraciones**

#### **Síntomas**
- Error "relation does not exist"
- Migraciones fallan
- Esquema de BD inconsistente

#### **Diagnóstico**
```bash
# Verificar estado de migraciones
python manage.py showmigrations

# Verificar migraciones pendientes
python manage.py migrate --plan
```

#### **Soluciones Comunes**

**Problema: Migraciones conflictivas**
```bash
# Resetear migraciones (CUIDADO: Solo en desarrollo)
python manage.py migrate --fake-initial
python manage.py migrate

# O crear migraciones desde cero
python manage.py makemigrations --empty app_name
```

**Problema: Migraciones de datos fallan**
```python
# Crear migración de datos segura
from django.db import migrations

def migrate_data(apps, schema_editor):
    # Lógica de migración de datos
    pass

def reverse_migrate_data(apps, schema_editor):
    # Lógica de reversión
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('app_name', 'previous_migration'),
    ]
    
    operations = [
        migrations.RunPython(migrate_data, reverse_migrate_data),
    ]
```

### **3. Error de Performance de Base de Datos**

#### **Síntomas**
- Consultas lentas
- Timeout de consultas
- Alto uso de CPU en BD

#### **Diagnóstico**
```bash
# Verificar consultas lentas
python manage.py shell
>>> from django.db import connection
>>> print(connection.queries)

# Verificar índices
python manage.py dbshell
> \d+ table_name
```

#### **Soluciones Comunes**

**Problema: Consultas N+1**
```python
# Usar select_related y prefetch_related
workouts = WorkoutProgram.objects.select_related('created_by').prefetch_related('exercises')

# Usar prefetch_related para relaciones many-to-many
programs = WorkoutProgram.objects.prefetch_related('tags')
```

**Problema: Consultas sin índices**
```python
# Agregar índices en modelos
class WorkoutProgram(models.Model):
    name = models.CharField(max_length=200, db_index=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, db_index=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['created_by', 'is_public']),
            models.Index(fields=['difficulty']),
        ]
```

## 🔄 Problemas de Integración

### **1. Error de CORS**

#### **Síntomas**
- Error "CORS policy"
- Requests bloqueados
- No se pueden hacer requests entre dominios

#### **Diagnóstico**
```bash
# Verificar en DevTools
# Network > Ver requests bloqueados
# Console > Ver errores de CORS
```

#### **Soluciones Comunes**

**Problema: Configuración CORS incorrecta**
```python
# backend/settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://mykaizenfit.vercel.app",
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False
```

**Problema: Headers CORS faltantes**
```python
# Agregar headers personalizados
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
```

### **2. Error de Sincronización de Datos**

#### **Síntomas**
- Datos no se sincronizan entre frontend y backend
- Cambios se pierden
- Estado inconsistente

#### **Diagnóstico**
```bash
# Verificar en DevTools
# Network > Ver requests fallidos
# Console > Ver errores de sincronización
```

#### **Soluciones Comunes**

**Problema: Estado local no se actualiza**
```typescript
// Implementar sincronización bidireccional
const syncData = async () => {
  try {
    const response = await fetch('/api/data/')
    const data = await response.json()
    setLocalData(data)
  } catch (error) {
    console.error('Error syncing data:', error)
  }
}

// Sincronizar periódicamente
useEffect(() => {
  const interval = setInterval(syncData, 30000) // 30 segundos
  return () => clearInterval(interval)
}, [])
```

**Problema: Conflictos de datos**
```typescript
// Implementar resolución de conflictos
const handleDataConflict = (localData: any, serverData: any) => {
  // Usar timestamp para determinar la versión más reciente
  if (localData.updated_at > serverData.updated_at) {
    return localData
  } else {
    return serverData
  }
}
```

## 📊 Problemas de Performance

### **1. Aplicación Lenta**

#### **Síntomas**
- Tiempo de carga lento
- Interfaz no responsiva
- Alto uso de memoria

#### **Diagnóstico**
```bash
# Verificar en DevTools
# Performance > Grabar y analizar
# Memory > Verificar memory leaks
# Network > Verificar requests lentos
```

#### **Soluciones Comunes**

**Problema: Bundle size grande**
```bash
# Analizar bundle
npm run build
npx @next/bundle-analyzer

# Implementar code splitting
const LazyComponent = lazy(() => import('./LazyComponent'))
```

**Problema: Re-renders innecesarios**
```typescript
// Usar React.memo para componentes
const ExpensiveComponent = React.memo(({ data }: { data: any }) => {
  return <div>{data.name}</div>
})

// Usar useMemo para cálculos costosos
const expensiveValue = useMemo(() => {
  return heavyCalculation(data)
}, [data])
```

### **2. Memory Leaks**

#### **Síntomas**
- Uso de memoria creciente
- Aplicación se vuelve lenta
- Crashes por falta de memoria

#### **Diagnóstico**
```bash
# Verificar en DevTools
# Memory > Tomar heap snapshot
# Performance > Grabar y analizar
```

#### **Soluciones Comunes**

**Problema: Event listeners no se limpian**
```typescript
// Limpiar event listeners
useEffect(() => {
  const handleResize = () => {
    // Lógica de resize
  }
  
  window.addEventListener('resize', handleResize)
  
  return () => {
    window.removeEventListener('resize', handleResize)
  }
}, [])
```

**Problema: Timers no se limpian**
```typescript
// Limpiar timers
useEffect(() => {
  const timer = setInterval(() => {
    // Lógica del timer
  }, 1000)
  
  return () => {
    clearInterval(timer)
  }
}, [])
```

## 🚀 Problemas de Despliegue

### **1. Error de Build**

#### **Síntomas**
- Build falla en CI/CD
- Errores de compilación
- Dependencias faltantes

#### **Diagnóstico**
```bash
# Verificar logs de build
# Verificar dependencias
npm list
pip list

# Verificar variables de entorno
echo $NODE_ENV
echo $DATABASE_URL
```

#### **Soluciones Comunes**

**Problema: Dependencias faltantes**
```bash
# Instalar dependencias
npm install
pip install -r requirements.txt

# Verificar package-lock.json
rm package-lock.json
npm install
```

**Problema: Variables de entorno faltantes**
```bash
# Configurar variables de entorno
export NODE_ENV=production
export DATABASE_URL=your-database-url
export SECRET_KEY=your-secret-key
```

### **2. Error de Despliegue**

#### **Síntomas**
- Despliegue falla
- Aplicación no se inicia
- Errores de configuración

#### **Diagnóstico**
```bash
# Verificar logs de despliegue
# Verificar configuración
# Verificar recursos disponibles
```

#### **Soluciones Comunes**

**Problema: Configuración incorrecta**
```yaml
# vercel.json
{
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/.next",
  "installCommand": "cd frontend && npm install"
}
```

**Problema: Recursos insuficientes**
```yaml
# render.yaml
services:
  - type: web
    name: mykaizenfit-backend
    plan: starter
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn backend.wsgi:application
```

## 🔍 Herramientas de Debugging

### **1. Logging**

#### **Frontend**
```typescript
// Configurar logging
import { logger } from '@/lib/logger'

logger.info('User action', { userId: user.id, action: 'login' })
logger.error('API error', { error: error.message, url: '/api/workouts/' })
```

#### **Backend**
```python
# Configurar logging
import logging

logger = logging.getLogger(__name__)

logger.info('User action', extra={
    'user_id': user.id,
    'action': 'login',
    'ip_address': request.META.get('REMOTE_ADDR')
})
```

### **2. Monitoreo**

#### **Sentry (Error Tracking)**
```typescript
// Frontend
import * as Sentry from '@sentry/nextjs'

Sentry.captureException(error)
Sentry.captureMessage('User action', 'info')
```

```python
# Backend
import sentry_sdk

sentry_sdk.capture_exception(exception)
sentry_sdk.capture_message('User action', level='info')
```

### **3. Profiling**

#### **Frontend**
```bash
# Profiling de performance
npm run build
npx @next/bundle-analyzer

# Profiling de runtime
# Chrome DevTools > Performance
```

#### **Backend**
```bash
# Profiling de Django
pip install django-debug-toolbar

# Profiling de base de datos
python manage.py shell
>>> from django.db import connection
>>> print(connection.queries)
```

## 📋 Checklist de Troubleshooting

### **Problemas Comunes**
- [ ] Verificar logs de aplicación
- [ ] Verificar variables de entorno
- [ ] Verificar conexión a base de datos
- [ ] Verificar migraciones
- [ ] Verificar archivos estáticos
- [ ] Verificar configuración CORS
- [ ] Verificar tokens JWT
- [ ] Verificar rate limiting
- [ ] Verificar memoria y CPU
- [ ] Verificar red y conectividad

### **Problemas de Frontend**
- [ ] Verificar imports y rutas
- [ ] Verificar configuración TypeScript
- [ ] Verificar hidratación SSR
- [ ] Verificar estado de componentes
- [ ] Verificar event listeners
- [ ] Verificar timers y intervals
- [ ] Verificar bundle size
- [ ] Verificar re-renders
- [ ] Verificar memory leaks
- [ ] Verificar performance

### **Problemas de Backend**
- [ ] Verificar configuración Django
- [ ] Verificar middleware
- [ ] Verificar serializers
- [ ] Verificar views y URLs
- [ ] Verificar permisos
- [ ] Verificar autenticación
- [ ] Verificar throttling
- [ ] Verificar cache
- [ ] Verificar tasks (Celery)
- [ ] Verificar logs

### **Problemas de Base de Datos**
- [ ] Verificar conexión
- [ ] Verificar credenciales
- [ ] Verificar migraciones
- [ ] Verificar índices
- [ ] Verificar consultas
- [ ] Verificar performance
- [ ] Verificar locks
- [ ] Verificar transacciones
- [ ] Verificar backup
- [ ] Verificar logs

## 📞 Contacto y Soporte

### **Recursos de Ayuda**
- **Documentación**: `doc/` directory
- **Logs**: `backend/logs/` directory
- **Issues**: GitHub Issues
- **Discord**: [Link al servidor]
- **Email**: soporte@mykaizenfit.com

### **Escalación de Problemas**
1. **Nivel 1**: Consultar esta guía
2. **Nivel 2**: Buscar en GitHub Issues
3. **Nivel 3**: Contactar al equipo de desarrollo
4. **Nivel 4**: Escalar a arquitecto de sistema

---

*Guía de Troubleshooting v1.0 - Nex-Fit*  
*Última actualización: Diciembre 2024*
