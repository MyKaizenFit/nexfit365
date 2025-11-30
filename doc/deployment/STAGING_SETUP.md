# 🧪 Configuración de Staging/Pre-Producción - Nex-Fit

## 📋 Resumen

Este documento describe la configuración del ambiente de staging para Nex-Fit, donde se realizan pruebas antes del despliegue en producción.

## 🏗️ Arquitectura de Staging

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Base de       │
│   Vercel        │◄──►│   Render        │◄──►│   Datos Neon    │
│   Staging       │    │   Staging       │    │   Staging       │
│   Next.js 14    │    │   Django 5.2    │    │   PostgreSQL    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Monitoring    │    │   CI/CD         │    │   Test Data     │
│   Sentry        │    │   GitHub        │    │   Sample Data   │
│   Debug On      │    │   Actions       │    │   Development   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Configuración de Servicios

### **1. Backend en Render (Staging)**

#### **Archivo: backend/render.staging.yaml**
```yaml
services:
  - type: web
    name: mykaizenfit-backend-staging
    env: python
    plan: free
    buildCommand: |
      pip install -r requirements-prod.txt
      python manage.py collectstatic --noinput
      python manage.py migrate
      python manage.py populate_exercises_simple
      python manage.py populate_workout_templates
    startCommand: gunicorn backend.wsgi:application --bind 0.0.0.0:$PORT
```

#### **Variables de Entorno**
- `DEBUG=True` (para debugging en staging)
- `ALLOWED_HOSTS=mykaizenfit-backend-staging.onrender.com,localhost,127.0.0.1`
- `CORS_ALLOWED_ORIGINS=https://mykaizenfit-staging.vercel.app,http://localhost:3000`
- `DATABASE_URL` (automático desde Render)
- `REDIS_URL` (automático desde Render)
- `SECRET_KEY` (generado automáticamente)

#### **URL de Staging**
- Backend: `https://mykaizenfit-backend-staging.onrender.com`
- API: `https://mykaizenfit-backend-staging.onrender.com/api`

### **2. Frontend en Vercel (Staging)**

#### **Variables de Entorno**
- `NEXT_PUBLIC_API_URL=https://mykaizenfit-backend-staging.onrender.com/api`
- `NEXT_PUBLIC_APP_NAME=Nex-Fit (Staging)`
- `NEXT_PUBLIC_APP_VERSION=1.0.0-staging`
- `NEXT_PUBLIC_ENABLE_DEBUG=true`

#### **URL de Staging**
- Frontend: `https://mykaizenfit-staging.vercel.app`

### **3. Base de Datos (Staging)**

#### **Configuración**
- Servidor: Neon PostgreSQL (Staging)
- Base de datos: `mykaizenfit_staging`
- Usuario: `mykaizenfit_user_staging`

#### **Características**
- ✅ Datos de prueba se pueden eliminar
- ✅ Restauraciones frecuentes sin impacto
- ✅ Debug activado
- ✅ Logs detallados

## 🔄 CI/CD Pipeline para Staging

### **Workflow: .github/workflows/staging.yml**

#### **Trigger:**
- Push a la rama `dev`

#### **Etapas:**
1. **Backend Tests**
   - Setup Python 3.11
   - Instalar dependencias
   - Ejecutar migrations
   - Correr tests unitarios
   - Tests de integración

2. **Frontend Tests**
   - Setup Node.js 18
   - Instalar dependencias
   - Linting
   - Build de Next.js
   - Tests de componentes (cuando estén configurados)

3. **Deploy a Staging**
   - Deploy backend a Render (staging)
   - Deploy frontend a Vercel (staging)
   - Health checks

4. **Verificación**
   - Tests E2E básicos
   - Smoke tests
   - Notificación de éxito/fallo

## 📊 Monitoreo en Staging

### **Sentry (Debug Mode)**
- Captura todos los errores
- Stack traces completos
- Información de debugging

### **Logs**
- Backend: Logs detallados en Render
- Frontend: Logs de Vercel
- Nivel: DEBUG/INFO

### **Analytics**
- Analytics deshabilitado en staging
- Tracking de errores activo

## 🧪 Proceso de Pruebas

### **1. Pruebas Automáticas**

#### **Backend**
```bash
# Tests unitarios
python manage.py test nutrition.tests workouts.tests

# Tests de integración
python manage.py test --settings=test_settings_simple

# Coverage mínimo 80%
coverage run manage.py test
coverage report --fail-under=80
```

#### **Frontend**
```bash
# Linting
npm run lint

# Tests unitarios (cuando estén configurados)
npm run test

# Build
npm run build
```

### **2. Pruebas Manuales**

#### **Checklist de Staging**
- [ ] Login/Logout funcionan
- [ ] Registro de usuarios funcional
- [ ] Dashboard carga correctamente
- [ ] CRUD de planes nutricionales
- [ ] CRUD de ejercicios y rutinas
- [ ] Subida de fotos de progreso
- [ ] Sistema de notificaciones
- [ ] Logros y badges
- [ ] Búsqueda y filtros
- [ ] Responsive design
- [ ] Performance aceptable
- [ ] Sin errores en consola

### **3. Pruebas de Integración**

#### **Flujos Principales**
1. **Onboarding**
   - Registro → Formulario inicial → Asignación de plan

2. **Gestión de Ejercicios**
   - Ver ejercicios → Iniciar rutina → Completar ejercicio

3. **Gestión de Nutrición**
   - Ver plan actual → Cambiar plan → Seleccionar comidas

4. **Progreso**
   - Subir foto → Ver historial → Estadísticas

## 🚨 Troubleshooting

### **Problemas Comunes**

#### **Backend no responde**
```bash
# Verificar logs
- Render Dashboard → Logs del servicio
- Verificar DATABASE_URL
- Verificar REDIS_URL
```

#### **Frontend no conecta con backend**
```bash
# Verificar variables
- Vercel Dashboard → Environment Variables
- NEXT_PUBLIC_API_URL correcto
- CORS configurado en backend
```

#### **Migrations fallan**
```bash
# Reset database (staging)
- Render Dashboard → PostgreSQL → Reset
- Volver a ejecutar migrations
```

## 📝 Mantenimiento

### **Datos de Prueba**

#### **Scripts de Población**
```bash
# Ejecutar en Render (build command)
python manage.py populate_exercises_simple
python manage.py populate_workout_templates
python manage.py create_sample_nutrition_plans
```

### **Actualizaciones**

#### **Proceso**
1. Commit cambios en `dev`
2. Push a GitHub
3. CI/CD automático
4. Deploy a staging
5. Pruebas manuales
6. Si OK → Merge a `main` → Producción

### **Resets**

#### **Reset de Base de Datos**
```bash
# En Render (Staging)
1. Drop database
2. Recrear database
3. Migrations automáticos en build
```

## 🔐 Seguridad

### **Diferencias con Producción**
- ✅ DEBUG=True (staging) vs False (prod)
- ✅ Logs detallados (staging) vs resumidos (prod)
- ✅ Datos de prueba (staging) vs producción (prod)
- ✅ Acceso de desarrollo (staging) vs restringido (prod)

### **Credenciales**
- Usar credenciales de prueba separadas
- No usar credenciales de producción en staging
- Rotar credenciales frecuentemente

## 📞 Soporte

### **Contacto**
- Slack: #staging-deploys
- Email: staging@mykaizenfit.com

### **Horario**
- Staging disponible 24/7
- Deploys manuales: Lunes-Viernes 9AM-6PM
- Deploys automáticos: Siempre activo

## ✅ Checklist de Configuración

### **Backend**
- [ ] render.staging.yaml configurado
- [ ] Variables de entorno en Render
- [ ] Database creada y configurada
- [ ] Redis configurado
- [ ] Health checks activos
- [ ] Sentry configurado (opcional)

### **Frontend**
- [ ] Vercel staging environment creado
- [ ] Variables de entorno configuradas
- [ ] Build exitoso
- [ ] Domain configurado
- [ ] Analytics deshabilitado

### **CI/CD**
- [ ] Workflow staging.yml funcional
- [ ] Tests pasando
- [ ] Deploy automático activo
- [ ] Notificaciones configuradas

### **Monitoreo**
- [ ] Sentry configurado
- [ ] Logs accesibles
- [ ] Alertas configuradas

## 🎯 Próximos Pasos

1. **Configurar Sentry** para staging (opcional)
2. **Implementar E2E Tests** con Playwright
3. **Configurar Analytics** de Vercel
4. **Setup de load testing** con k6
5. **Documentar** procesos de rollback

