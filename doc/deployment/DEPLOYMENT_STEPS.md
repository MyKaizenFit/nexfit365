# 🚀 Pasos para Desplegar Nex-Fit en Producción

## 📋 Prerrequisitos

- [ ] Cuenta en [Render.com](https://render.com) (gratuita)
- [ ] Cuenta en [Vercel.com](https://vercel.com) (gratuita)
- [ ] Repositorio en GitHub con el código
- [ ] Node.js 18+ instalado localmente
- [ ] Python 3.11+ instalado localmente

## 🎯 Paso 1: Preparar el Repositorio

### 1.1 Verificar archivos de configuración
```bash
# Verificar que existan estos archivos:
ls backend/render.yaml
ls frontend/vercel.json
ls .github/workflows/deploy.yml
```

### 1.2 Hacer commit de todos los cambios
```bash
git add .
git commit -m "feat: configuración completa para despliegue en producción"
git push origin main
```

## 🎯 Paso 2: Desplegar Backend en Render

### 2.1 Crear cuenta en Render
1. Ve a [render.com](https://render.com)
2. Crea una cuenta gratuita
3. Conecta tu cuenta de GitHub

### 2.2 Crear nuevo servicio
1. Haz clic en "New +"
2. Selecciona "Blueprint"
3. Conecta tu repositorio de GitHub
4. Selecciona el archivo `backend/render.yaml`

### 2.3 Configurar variables de entorno
Render configurará automáticamente:
- `DATABASE_URL` (PostgreSQL)
- `REDIS_URL` (Redis)
- `SECRET_KEY` (generado automáticamente)

Variables adicionales que puedes configurar:
- `CORS_ALLOWED_ORIGINS`: `https://mykaizenfit.vercel.app,https://mykaizenfit.com`
- `CORS_ALLOW_CREDENTIALS`: `True`

### 2.4 Desplegar
1. Haz clic en "Apply"
2. Render comenzará el despliegue automáticamente
3. El proceso tomará 5-10 minutos
4. Anota la URL del backend: `https://mykaizenfit-backend.onrender.com`

## 🎯 Paso 3: Desplegar Frontend en Vercel

### 3.1 Crear cuenta en Vercel
1. Ve a [vercel.com](https://vercel.com)
2. Crea una cuenta gratuita
3. Conecta tu cuenta de GitHub

### 3.2 Crear nuevo proyecto
1. Haz clic en "New Project"
2. Importa tu repositorio de GitHub
3. Configura el proyecto:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 3.3 Configurar variables de entorno
En la sección "Environment Variables":
- `NEXT_PUBLIC_API_URL`: `https://mykaizenfit-backend.onrender.com/api`
- `NEXT_PUBLIC_APP_NAME`: `Nex-Fit`
- `NEXT_PUBLIC_APP_VERSION`: `1.0.0`
- `NEXT_PUBLIC_APP_DESCRIPTION`: `Tu compañero de fitness personal`

### 3.4 Desplegar
1. Haz clic en "Deploy"
2. Vercel comenzará el despliegue automáticamente
3. El proceso tomará 2-3 minutos
4. Anota la URL del frontend: `https://mykaizenfit.vercel.app`

## 🎯 Paso 4: Verificar el Despliegue

### 4.1 Verificar Backend
```bash
# Health check
curl https://mykaizenfit-backend.onrender.com/health

# API endpoints
curl https://mykaizenfit-backend.onrender.com/api/
curl https://mykaizenfit-backend.onrender.com/api/exercises/
```

### 4.2 Verificar Frontend
1. Abre https://mykaizenfit.vercel.app
2. Verifica que la página cargue correctamente
3. Prueba el login/registro
4. Verifica que las llamadas a la API funcionen

### 4.3 Verificar Integración
1. Registra un nuevo usuario
2. Inicia sesión
3. Verifica que el dashboard cargue
4. Prueba crear una rutina de ejercicios
5. Verifica que las fotos de progreso se suban

## 🎯 Paso 5: Configurar Dominio Personalizado (Opcional)

### 5.1 Backend en Render
1. Ve a tu servicio en Render
2. Settings → Custom Domains
3. Agrega tu dominio: `api.mykaizenfit.com`
4. Configura los registros DNS:
   ```
   CNAME api.mykaizenfit.com mykaizenfit-backend.onrender.com
   ```

### 5.2 Frontend en Vercel
1. Ve a tu proyecto en Vercel
2. Settings → Domains
3. Agrega tu dominio: `mykaizenfit.com`
4. Configura los registros DNS:
   ```
   A mykaizenfit.com 76.76.19.61
   CNAME www.mykaizenfit.com mykaizenfit.vercel.app
   ```

## 🎯 Paso 6: Configurar Monitoreo (Opcional)

### 6.1 Sentry para Backend
1. Crea cuenta en [sentry.io](https://sentry.io)
2. Crea un proyecto Django
3. Copia la DSN
4. Agrega la variable `SENTRY_DSN` en Render

### 6.2 Sentry para Frontend
1. Crea un proyecto Next.js en Sentry
2. Copia la DSN
3. Agrega la variable `NEXT_PUBLIC_SENTRY_DSN` en Vercel

## 🎯 Paso 7: Configurar CI/CD (Opcional)

### 7.1 GitHub Actions
El archivo `.github/workflows/deploy.yml` ya está configurado para:
- Ejecutar tests automáticamente
- Desplegar en Render y Vercel
- Configurar variables de entorno

### 7.2 Configurar secretos
En GitHub → Settings → Secrets and variables → Actions:
- `RENDER_API_KEY`: Tu API key de Render
- `VERCEL_TOKEN`: Tu token de Vercel
- `VERCEL_ORG_ID`: Tu organización de Vercel
- `VERCEL_PROJECT_ID`: Tu proyecto de Vercel

## 🎯 Paso 8: Verificación Final

### 8.1 Checklist de Funcionalidades
- [ ] Usuario puede registrarse
- [ ] Usuario puede iniciar sesión
- [ ] Dashboard carga correctamente
- [ ] Rutinas de ejercicios se crean
- [ ] Fotos de progreso se suben
- [ ] Notificaciones funcionan
- [ ] Panel de administrador funciona
- [ ] API responde correctamente
- [ ] CORS está configurado
- [ ] SSL está habilitado

### 8.2 Performance
- [ ] Página carga en menos de 3 segundos
- [ ] API responde en menos de 1 segundo
- [ ] Imágenes se optimizan automáticamente
- [ ] CSS/JS se minifican

### 8.3 Seguridad
- [ ] HTTPS está habilitado
- [ ] Headers de seguridad están configurados
- [ ] CORS está configurado correctamente
- [ ] Variables de entorno están protegidas

## 🎯 Paso 9: Mantenimiento

### 9.1 Monitoreo
- Revisa los logs regularmente
- Configura alertas de error
- Monitorea el uso de recursos

### 9.2 Actualizaciones
- Actualiza dependencias regularmente
- Despliega cambios en horarios de bajo tráfico
- Haz backup de la base de datos antes de cambios importantes

### 9.3 Escalabilidad
- Render: Plan gratuito → Plan pago cuando sea necesario
- Vercel: Plan gratuito → Plan pago cuando sea necesario
- Base de datos: Neon escala automáticamente

## 🚨 Troubleshooting

### Problemas Comunes

1. **Error de CORS**
   - Verificar `CORS_ALLOWED_ORIGINS` en Render
   - Verificar `NEXT_PUBLIC_API_URL` en Vercel

2. **Error de base de datos**
   - Verificar `DATABASE_URL` en Render
   - Verificar conectividad de red

3. **Error de autenticación**
   - Verificar `SECRET_KEY` en Render
   - Verificar configuración de JWT

4. **Error de archivos estáticos**
   - Verificar `STATIC_ROOT` en Render
   - Ejecutar `collectstatic` manualmente

### Comandos de Diagnóstico

```bash
# Verificar estado del backend
curl -I https://mykaizenfit-backend.onrender.com/health

# Verificar API
curl https://mykaizenfit-backend.onrender.com/api/exercises/

# Verificar frontend
curl -I https://mykaizenfit.vercel.app
```

## 🎉 ¡Despliegue Completado!

Tu aplicación Nex-Fit debería estar funcionando en:
- **Frontend**: https://mykaizenfit.vercel.app
- **Backend**: https://mykaizenfit-backend.onrender.com
- **API**: https://mykaizenfit-backend.onrender.com/api

¡Felicidades! 🚀

