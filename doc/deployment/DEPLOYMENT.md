# 🚀 Guía de Despliegue - Nex-Fit

Esta guía te ayudará a desplegar Nex-Fit en producción usando diferentes plataformas.

## 📋 Prerrequisitos

- **Git** instalado
- **Node.js 18+** para el frontend
- **Python 3.11+** para el backend
- **PostgreSQL 15+** para la base de datos
- **Redis** para caché (opcional)
- **Docker** (opcional, para despliegue local)

## 🏗️ Arquitectura de Despliegue

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Vercel)      │◄──►│   (Render)      │◄──►│   (Neon/Render) │
│   Next.js 14    │    │   Django 4.2    │    │   PostgreSQL    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       ▼
         │              ┌─────────────────┐
         │              │   Redis         │
         │              │   (Cache)       │
         │              └─────────────────┘
         │
         ▼
┌─────────────────┐
│   CDN           │
│   (Vercel)      │
└─────────────────┘
```

## 🚀 Opciones de Despliegue

### 1. Despliegue Automático (Recomendado)

#### Usando Scripts de Despliegue

**Windows (PowerShell):**
```powershell
# Ejecutar tests
.\deploy.ps1 test

# Desplegar todo
.\deploy.ps1 all

# Solo backend
.\deploy.ps1 backend

# Solo frontend
.\deploy.ps1 frontend

# Con Docker
.\deploy.ps1 docker
```

**Linux/macOS (Bash):**
```bash
# Hacer ejecutable
chmod +x deploy.sh

# Ejecutar tests
./deploy.sh test

# Desplegar todo
./deploy.sh all

# Solo backend
./deploy.sh backend

# Solo frontend
./deploy.sh frontend

# Con Docker
./deploy.sh docker
```

### 2. Despliegue Manual

#### Backend en Render

1. **Crear cuenta en Render:**
   - Ve a [render.com](https://render.com)
   - Crea una cuenta gratuita

2. **Conectar repositorio:**
   - Conecta tu repositorio de GitHub
   - Selecciona el archivo `backend/render.yaml`

3. **Configurar variables de entorno:**
   ```env
   DEBUG=False
   SECRET_KEY=tu-clave-secreta-super-segura
   DATABASE_URL=postgres://usuario:password@host:puerto/database
   REDIS_URL=redis://usuario:password@host:puerto
   ALLOWED_HOSTS=tu-dominio.onrender.com
   CORS_ALLOWED_ORIGINS=https://tu-frontend.vercel.app
   ```

4. **Desplegar:**
   - Render detectará automáticamente la configuración
   - El despliegue tomará 5-10 minutos

#### Frontend en Vercel

1. **Crear cuenta en Vercel:**
   - Ve a [vercel.com](https://vercel.com)
   - Crea una cuenta gratuita

2. **Instalar Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

3. **Desplegar:**
   ```bash
   cd frontend
   vercel
   ```

4. **Configurar variables de entorno:**
   ```env
   NEXT_PUBLIC_API_URL=https://tu-backend.onrender.com/api
   NEXT_PUBLIC_APP_NAME=Nex-Fit
   NEXT_PUBLIC_APP_VERSION=1.0.0
   ```

#### Base de Datos en Neon

1. **Crear cuenta en Neon:**
   - Ve a [neon.tech](https://neon.tech)
   - Crea una cuenta gratuita

2. **Crear base de datos:**
   - Crea un nuevo proyecto
   - Copia la URL de conexión

3. **Configurar en Render:**
   - Usa la URL de Neon como `DATABASE_URL`

### 3. Despliegue con Docker

#### Despliegue Local

1. **Configurar variables de entorno:**
   ```bash
   cp env.production.example .env
   # Editar .env con tus valores
   ```

2. **Desplegar:**
   ```bash
   # Con script
   ./deploy.sh docker  # Linux/macOS
   .\deploy.ps1 docker  # Windows

   # O manualmente
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Acceder a la aplicación:**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000
   - API: http://localhost:8000/api

#### Despliegue en Servidor

1. **Preparar servidor:**
   ```bash
   # Instalar Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh

   # Instalar Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. **Clonar repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/mykaizenfit.git
   cd mykaizenfit
   ```

3. **Configurar y desplegar:**
   ```bash
   cp env.production.example .env
   # Editar .env
   docker-compose -f docker-compose.prod.yml up -d
   ```

## 🔧 Configuración Post-Despliegue

### 1. Configurar Dominio Personalizado

#### En Vercel (Frontend):
1. Ve a tu proyecto en Vercel
2. Settings → Domains
3. Agrega tu dominio personalizado
4. Configura los registros DNS

#### En Render (Backend):
1. Ve a tu servicio en Render
2. Settings → Custom Domains
3. Agrega tu dominio personalizado
4. Configura los registros DNS

### 2. Configurar SSL/HTTPS

- **Vercel:** SSL automático
- **Render:** SSL automático
- **Docker:** Configurar certificados en nginx.prod.conf

### 3. Configurar Monitoreo

#### Sentry (Opcional):
1. Crea cuenta en [sentry.io](https://sentry.io)
2. Crea un proyecto Django
3. Agrega la DSN a las variables de entorno

#### Logs:
- **Vercel:** Logs automáticos en dashboard
- **Render:** Logs automáticos en dashboard
- **Docker:** `docker-compose logs -f`

## 🧪 Testing en Producción

### 1. Tests Automáticos

Los tests se ejecutan automáticamente en GitHub Actions:

```yaml
# .github/workflows/deploy.yml
- name: Run tests
  run: |
    cd backend
    python manage.py test --settings=test_settings
```

### 2. Tests Manuales

```bash
# Backend
cd backend
python manage.py test --settings=test_settings

# Frontend
cd frontend
npm test -- --coverage --watchAll=false
```

## 📊 Monitoreo y Mantenimiento

### 1. Health Checks

- **Backend:** `GET /health`
- **Frontend:** Verificar carga de página
- **Database:** Verificar conexión

### 2. Logs

```bash
# Docker
docker-compose logs -f backend
docker-compose logs -f frontend

# Render
# Ver logs en dashboard

# Vercel
# Ver logs en dashboard
```

### 3. Backup de Base de Datos

```bash
# Neon (automático)
# Los backups son automáticos

# Manual
pg_dump $DATABASE_URL > backup.sql
```

## 🚨 Troubleshooting

### Problemas Comunes

1. **Error de CORS:**
   - Verificar `CORS_ALLOWED_ORIGINS` en backend
   - Verificar `NEXT_PUBLIC_API_URL` en frontend

2. **Error de base de datos:**
   - Verificar `DATABASE_URL`
   - Verificar conectividad de red

3. **Error de autenticación:**
   - Verificar `SECRET_KEY`
   - Verificar configuración de JWT

4. **Error de archivos estáticos:**
   - Verificar `STATIC_ROOT` y `MEDIA_ROOT`
   - Ejecutar `collectstatic`

### Comandos de Diagnóstico

```bash
# Verificar estado de servicios
docker-compose ps

# Ver logs de errores
docker-compose logs --tail=100

# Verificar conectividad
curl -I https://tu-backend.onrender.com/health
curl -I https://tu-frontend.vercel.app
```

## 📈 Escalabilidad

### 1. Backend (Render)
- Plan gratuito: 750 horas/mes
- Plan pago: Escalado automático

### 2. Frontend (Vercel)
- Plan gratuito: 100GB bandwidth/mes
- Plan pago: Escalado automático

### 3. Base de Datos (Neon)
- Plan gratuito: 0.5GB storage
- Plan pago: Escalado automático

## 🔐 Seguridad

### 1. Variables de Entorno
- Nunca commitees archivos `.env`
- Usa secretos en las plataformas de despliegue

### 2. HTTPS
- Configurado automáticamente en Vercel y Render
- Para Docker, configurar certificados SSL

### 3. Rate Limiting
- Configurado en nginx.prod.conf
- Configurado en Django settings

## 📞 Soporte

Si tienes problemas con el despliegue:

1. Revisa los logs de error
2. Verifica la configuración de variables de entorno
3. Consulta la documentación de las plataformas
4. Abre un issue en el repositorio

---

**¡Despliegue exitoso! 🎉**

Tu aplicación Nex-Fit debería estar funcionando en:
- Frontend: https://tu-frontend.vercel.app
- Backend: https://tu-backend.onrender.com
- API: https://tu-backend.onrender.com/api

