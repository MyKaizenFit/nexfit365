# 🚀 Scripts de Deployment a Producción

Este directorio contiene todos los scripts y documentación necesarios para desplegar NexFit365 a producción.

## 📁 Archivos

### Scripts

1. **`export-dev-db.sh`** - Exporta la base de datos de desarrollo (Linux)
   - Uso: `./scripts/deployment/export-dev-db.sh`
   - Genera un archivo `.sql.gz` en `./backups/`
   - Requiere que los servicios de desarrollo estén corriendo

2. **`export-dev-db.ps1`** - Exporta la base de datos de desarrollo (Windows/PowerShell)
   - Uso: `.\scripts\deployment\export-dev-db.ps1`
   - Genera un archivo `.sql.gz` en `.\backups\`

3. **`import-to-prod.sh`** - Importa una base de datos a producción (Linux)
   - Uso: `./scripts/deployment/import-to-prod.sh -f backups/archivo.sql.gz`
   - ⚠️ **ADVERTENCIA:** Reemplaza completamente la BD de producción

4. **`import-to-prod.ps1`** - Importa una base de datos a producción (Windows/PowerShell)
   - Uso: `.\scripts\deployment\import-to-prod.ps1 -BackupFile ".\backups\archivo.sql.gz"`
   - ⚠️ **ADVERTENCIA:** Reemplaza completamente la BD de producción

5. **`deploy-full.sh`** - Script maestro que ejecuta todo el proceso
   - Uso: `./scripts/deployment/deploy-full.sh`
   - Ejecuta: exportar BD → importar BD → desplegar app
   - Opciones: `--skip-export`, `--skip-import`, `--backup-file FILE`

6. **`deploy.sh`** - Script principal de deployment (en la raíz del proyecto)
   - Uso: `./deploy.sh`
   - Opciones: `--no-build`, `--skip-migrations`

### Documentación

1. **`PRE_DEPLOYMENT_CHECKLIST.md`** - Checklist completo antes de desplegar
   - Verifica código, migraciones, variables de entorno, etc.

2. **`DEPLOYMENT_GUIDE.md`** - Guía completa paso a paso
   - Proceso detallado desde desarrollo hasta producción

## 🚀 Proceso Rápido

### 1. En Desarrollo (Windows)

```powershell
# 1. Verificar que todo está commiteado
git status

# 2. Exportar base de datos
.\scripts\deployment\export-dev-db.ps1

# 3. Copiar archivo al servidor (ajusta la ruta)
scp .\backups\dev_database_export_*.sql.gz usuario@servidor:/srv/mykaizenfit/pro/backups/
```

### 2. En Producción (Linux)

**Opción A: Proceso completo automatizado (recomendado)**

```bash
# 1. Conectar al servidor
ssh usuario@servidor
cd /srv/mykaizenfit/pro

# 2. Actualizar código
git pull origin develop

# 3. Ejecutar proceso completo (exporta BD dev, importa en prod, despliega)
./scripts/deployment/deploy-full.sh

# O si ya tienes un backup:
./scripts/deployment/deploy-full.sh --skip-export --backup-file backups/dev/mykaizenfit_dev_20251218_163104.sql.gz
```

**Opción B: Proceso paso a paso**

```bash
# 1. Conectar al servidor
ssh usuario@servidor
cd /srv/mykaizenfit/pro

# 2. Actualizar código
git pull origin develop

# 3. Exportar base de datos de desarrollo (si los servicios están corriendo)
./scripts/deployment/export-dev-db.sh

# 4. Importar base de datos en producción
./scripts/deployment/import-to-prod.sh -f backups/dev_database_export_YYYYMMDD_HHMMSS.sql.gz

# 5. Ejecutar deployment
./deploy.sh

# O manualmente:
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml build --no-cache
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec backend python manage.py migrate --noinput
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

## ⚠️ Importante

- **Siempre** revisa `PRE_DEPLOYMENT_CHECKLIST.md` antes de desplegar
- **Siempre** crea un backup de producción antes de importar una nueva BD
- **NUNCA** ejecutes `docker compose down -v` en producción
- Verifica las variables de entorno antes de cada deployment

## 📚 Más Información

- Ver `DEPLOYMENT_GUIDE.md` para el proceso completo detallado
- Ver `PRE_DEPLOYMENT_CHECKLIST.md` para el checklist completo






