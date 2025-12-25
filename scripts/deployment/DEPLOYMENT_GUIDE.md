# 🚀 Guía Completa de Deployment a Producción

Esta guía explica el proceso completo para desplegar NexFit365 a producción, incluyendo la migración de la base de datos de desarrollo.

## 📋 Prerrequisitos

1. **Servidor de Producción:**
   - Docker y Docker Compose instalados
   - Acceso SSH al servidor
   - Espacio suficiente en disco

2. **Archivos Necesarios:**
   - Código del proyecto (clonado desde Git)
   - Archivos de configuración de entorno (`.env.production`, `backend.env.production`, etc.)
   - Backup de la base de datos de desarrollo

## 🔄 Proceso Completo

### Fase 1: Preparación en Desarrollo

#### 1.1. Verificar Estado del Código
```powershell
# Verificar que no hay cambios sin commitear
git status

# Verificar que todo está pusheado
git log origin/develop..HEAD
```

#### 1.2. Verificar Migraciones
```powershell
# Verificar que no hay migraciones pendientes
docker compose exec backend python manage.py makemigrations --check --dry-run

# Ver estado de migraciones
docker compose exec backend python manage.py showmigrations
```

#### 1.3. Exportar Base de Datos de Desarrollo
```powershell
# Ejecutar script de exportación
.\scripts\deployment\export-dev-db.ps1

# El archivo se guardará en: .\backups\dev_database_export_YYYYMMDD_HHMMSS.sql.gz
```

**Nota:** El script:
- Exporta toda la base de datos de desarrollo
- Comprime el archivo para reducir el tamaño
- Guarda el archivo en `.\backups\`

### Fase 2: Preparación en Producción

#### 2.1. Conectar al Servidor de Producción
```bash
ssh usuario@servidor-produccion
cd /srv/mykaizenfit/pro
```

#### 2.2. Clonar/Actualizar Código
```bash
# Si es la primera vez
git clone <url-del-repositorio> .

# Si ya existe
git pull origin develop
```

#### 2.3. Configurar Variables de Entorno

**Crear `.env.production` en la raíz:**
```bash
POSTGRES_DB=mykaizenfit
POSTGRES_USER=postgres
POSTGRES_PASSWORD=TU_CONTRASEÑA_SEGURA
REDIS_PASSWORD=TU_CONTRASEÑA_REDIS
```

**Configurar `docker/backend.env.production`:**
```bash
# Copiar desde el ejemplo
cp docker/backend.env.production.example docker/backend.env.production

# Editar y configurar:
# - SECRET_KEY (generar nuevo)
# - ALLOWED_HOSTS (tus dominios)
# - DB_PASSWORD (mismo que POSTGRES_PASSWORD)
# - CORS_ALLOWED_ORIGINS (tus dominios frontend)
```

**Configurar `frontend/docker.env.production`:**
```bash
NEXT_PUBLIC_API_URL=http://tu-dominio:8000/api
```

#### 2.4. Copiar Backup de Base de Datos

Copiar el archivo de backup desde desarrollo al servidor:
```bash
# Desde tu máquina local (PowerShell)
scp .\backups\dev_database_export_*.sql.gz usuario@servidor:/srv/mykaizenfit/pro/backups/
```

### Fase 3: Deployment

#### 3.1. Importar Base de Datos (Primera vez o actualización)

```powershell
# En el servidor de producción
.\scripts\deployment\import-to-prod.ps1 -BackupFile ".\backups\dev_database_export_YYYYMMDD_HHMMSS.sql.gz"
```

**⚠️ ADVERTENCIA:** Este script:
- Elimina la base de datos actual de producción
- Crea un backup antes de importar
- Importa la base de datos de desarrollo
- Ejecuta las migraciones automáticamente

#### 3.2. Ejecutar Deployment

**Opción A: Usar script automatizado**
```bash
./deploy.sh
```

**Opción B: Manual**
```bash
# 1. Construir imágenes
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml build --no-cache

# 2. Iniciar servicios
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d

# 3. Esperar a que los servicios estén listos
sleep 15

# 4. Ejecutar migraciones (si no se ejecutaron en el paso anterior)
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec backend python manage.py migrate --noinput

# 5. Recolectar archivos estáticos
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

### Fase 4: Verificación

#### 4.1. Verificar Servicios
```bash
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps
```

Todos los servicios deben estar "Up" y "healthy".

#### 4.2. Verificar Health Checks
```bash
# Backend
curl http://localhost:8000/api/health/

# Frontend
curl http://localhost:3000/
```

#### 4.3. Verificar Logs
```bash
# Ver logs de todos los servicios
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs -f

# Ver logs de un servicio específico
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs backend
```

#### 4.4. Probar Funcionalidades
- Acceder al frontend en el navegador
- Probar login
- Verificar que las APIs responden
- Probar funcionalidades críticas

## 🔄 Actualizaciones Futuras

Para actualizar producción después del primer deployment:

### 1. En Desarrollo
```powershell
# Hacer cambios y commitear
git add .
git commit -m "Descripción de cambios"
git push origin develop
```

### 2. En Producción
```bash
# Actualizar código
git pull origin develop

# Reconstruir y reiniciar servicios
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml build
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d

# Ejecutar migraciones si hay nuevas
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec backend python manage.py migrate --noinput
```

### 3. Si Necesitas Actualizar la Base de Datos

Si quieres sincronizar la BD de desarrollo a producción nuevamente:

```powershell
# En desarrollo: exportar
.\scripts\deployment\export-dev-db.ps1

# Copiar al servidor
scp .\backups\dev_database_export_*.sql.gz usuario@servidor:/srv/mykaizenfit/pro/backups/

# En producción: importar
.\scripts\deployment\import-to-prod.ps1 -BackupFile ".\backups\dev_database_export_YYYYMMDD_HHMMSS.sql.gz"
```

## 🛠️ Comandos Útiles

### Ver Estado de Servicios
```bash
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps
```

### Ver Logs
```bash
# Todos los servicios
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs -f

# Servicio específico
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs -f backend
```

### Reiniciar un Servicio
```bash
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml restart backend
```

### Detener Servicios
```bash
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml down
```

### Acceder al Shell del Backend
```bash
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec backend sh
```

### Ejecutar Comandos Django
```bash
# Migraciones
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Crear superusuario
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# Shell de Django
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec backend python manage.py shell
```

## ⚠️ Advertencias Importantes

1. **NUNCA ejecutes `docker compose down -v`** - Esto eliminaría los volúmenes y perderías los datos
2. **Siempre crea backups** antes de importar una nueva base de datos
3. **Verifica las variables de entorno** antes de cada deployment
4. **Prueba en desarrollo** antes de desplegar a producción
5. **Mantén backups regulares** de la base de datos de producción

## 🆘 Solución de Problemas

Ver sección de troubleshooting en `PRE_DEPLOYMENT_CHECKLIST.md`






