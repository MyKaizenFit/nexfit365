# ✅ NexFit365 - Listo para Producción

## 📦 Estado Actual

### ✅ Migraciones
Todas las migraciones están aplicadas, incluyendo:
- ✅ `progress.0002_dailywellness` - Modelo para registro de bienestar diario

### ✅ Código
- ✅ Todos los cambios están commiteados y pusheados
- ✅ Nuevo apartado "Bienestar" implementado
- ✅ Historial de entrenamientos con PR, REM y tonelaje implementado

### ✅ Scripts de Deployment
- ✅ `scripts/deployment/export-dev-db.ps1` - Exportar BD de desarrollo
- ✅ `scripts/deployment/import-to-prod.ps1` - Importar BD a producción
- ✅ `scripts/deployment/PRE_DEPLOYMENT_CHECKLIST.md` - Checklist completo
- ✅ `scripts/deployment/DEPLOYMENT_GUIDE.md` - Guía detallada
- ✅ `scripts/deployment/README.md` - Resumen rápido

## 🚀 Pasos para Desplegar

### Paso 1: Exportar Base de Datos de Desarrollo

En tu máquina local (Windows):
```powershell
.\scripts\deployment\export-dev-db.ps1
```

Esto creará un archivo en `.\backups\dev_database_export_YYYYMMDD_HHMMSS.sql.gz`

### Paso 2: Preparar Servidor de Producción

1. **Conectar al servidor:**
   ```bash
   ssh usuario@servidor-produccion
   cd /srv/mykaizenfit/pro
   ```

2. **Clonar/Actualizar código:**
   ```bash
   git clone <url-repositorio> .  # Si es primera vez
   # O
   git pull origin develop        # Si ya existe
   ```

3. **Configurar variables de entorno:**
   - Crear `.env.production` en la raíz
   - Configurar `docker/backend.env.production`
   - Configurar `frontend/docker.env.production`

### Paso 3: Copiar Backup de Base de Datos

Desde tu máquina local:
```powershell
scp .\backups\dev_database_export_*.sql.gz usuario@servidor:/srv/mykaizenfit/pro/backups/
```

### Paso 4: Importar Base de Datos en Producción

En el servidor de producción:
```bash
# Opción 1: Usar script PowerShell (si tienes PowerShell en el servidor)
.\scripts\deployment\import-to-prod.ps1 -BackupFile ".\backups\dev_database_export_YYYYMMDD_HHMMSS.sql.gz"

# Opción 2: Manualmente
docker exec -i <db-container> dropdb -U postgres mykaizenfit
docker exec -i <db-container> createdb -U postgres mykaizenfit
gunzip -c backups/dev_database_export_*.sql.gz | docker exec -i <db-container> psql -U postgres -d mykaizenfit
```

### Paso 5: Ejecutar Deployment

```bash
# Usar script automatizado
./deploy.sh

# O manualmente
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml build --no-cache
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec backend python manage.py migrate --noinput
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

### Paso 6: Verificar

```bash
# Ver estado de servicios
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps

# Verificar health checks
curl http://localhost:8000/api/health/
curl http://localhost:3000/

# Ver logs
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs -f
```

## 📋 Checklist Pre-Deployment

Antes de desplegar, revisa:
- [ ] Todas las migraciones están aplicadas
- [ ] Variables de entorno configuradas
- [ ] Backup de BD de desarrollo exportado
- [ ] Backup de BD de producción creado (si ya existe)
- [ ] Código actualizado en el servidor
- [ ] Scripts de deployment disponibles

## 📚 Documentación Completa

- **Guía detallada:** `scripts/deployment/DEPLOYMENT_GUIDE.md`
- **Checklist completo:** `scripts/deployment/PRE_DEPLOYMENT_CHECKLIST.md`
- **Resumen rápido:** `scripts/deployment/README.md`

## ⚠️ Recordatorios Importantes

1. **NUNCA** ejecutes `docker compose down -v` en producción
2. **SIEMPRE** crea un backup antes de importar una nueva BD
3. **VERIFICA** las variables de entorno antes de cada deployment
4. **PRUEBA** en desarrollo antes de desplegar a producción

## 🆘 En Caso de Problemas

1. Revisa los logs: `docker compose -f docker-compose.prod.yml logs`
2. Verifica el estado: `docker compose -f docker-compose.prod.yml ps`
3. Consulta la documentación en `scripts/deployment/`

---

**Última actualización:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Rama:** develop
**Último commit:** $(git rev-parse --short HEAD)

