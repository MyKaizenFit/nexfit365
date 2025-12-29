# 🔧 Corrección de Problemas de Encoding UTF-8

Este documento describe las correcciones aplicadas para solucionar problemas de encoding en la base de datos.

## 📋 Problemas Identificados

1. **PostgreSQL no estaba configurado con UTF-8** en los contenedores Docker
2. **Scripts de exportación/importación** no especificaban encoding UTF-8
3. **Base de datos creada sin encoding UTF-8** explícito
4. **Datos existentes** con caracteres mal codificados (á, é, í, ó, ú, ñ, etc.)

## ✅ Correcciones Aplicadas

### 1. Configuración de PostgreSQL en Docker

**Archivos modificados:**
- `docker-compose.prod.yml`
- `docker-compose.dev.yml`

**Cambios:**
- Agregadas variables de entorno para forzar UTF-8:
  ```yaml
  POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=es_ES.UTF-8"
  LC_ALL: "es_ES.UTF-8"
  LANG: "es_ES.UTF-8"
  PGCLIENTENCODING: "UTF8"
  ```

**Efecto:** Las nuevas bases de datos se crearán automáticamente con UTF-8.

### 2. Scripts de Exportación/Importación

**Archivos modificados:**
- `scripts/deployment/export-dev-db.sh`
- `scripts/deployment/import-to-prod.sh`

**Cambios:**
- Exportación ahora usa: `pg_dump ... --encoding=UTF8` con `PGCLIENTENCODING=UTF8`
- Importación ahora usa: `psql` con `PGCLIENTENCODING=UTF8`
- Creación de base de datos ahora especifica: `CREATE DATABASE ... WITH ENCODING 'UTF8' LC_COLLATE='es_ES.UTF-8' LC_CTYPE='es_ES.UTF-8'`

**Efecto:** Los backups y restauraciones preservarán correctamente los caracteres UTF-8.

### 3. Servicio de Backup Automático

**Archivo modificado:**
- `docker-compose.prod.yml` (servicio `db-backup`)

**Cambios:**
- Agregado `PGCLIENTENCODING: UTF8`
- Agregado `--encoding=UTF8` a `POSTGRES_EXTRA_OPTS`

**Efecto:** Los backups automáticos usarán UTF-8.

### 4. Script de Corrección de Datos Existentes

**Archivo creado:**
- `scripts/deployment/fix-db-encoding.sh`

**Funcionalidad:**
- Verifica el encoding actual de la base de datos
- Crea un backup de seguridad antes de modificar
- Establece `client_encoding` a UTF8
- Ejecuta comandos de Django para corregir datos existentes
- Proporciona reporte del estado final

## 🚀 Cómo Aplicar las Correcciones

### Para Bases de Datos Nuevas

Si estás creando una nueva base de datos, simplemente:

1. **Reinicia los servicios** para aplicar la nueva configuración:
   ```bash
   # Producción
   COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml down
   COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d db
   
   # Desarrollo
   COMPOSE_PROJECT_NAME=nexfit-dev docker compose -f docker-compose.dev.yml down
   COMPOSE_PROJECT_NAME=nexfit-dev docker compose -f docker-compose.dev.yml up -d db
   ```

2. **Recrea la base de datos** (si es necesario):
   ```bash
   # La base de datos se creará automáticamente con UTF-8
   ```

### Para Bases de Datos Existentes

Si ya tienes una base de datos con datos, tienes dos opciones:

#### Opción A: Corrección de Datos Existentes (Recomendado si hay muchos datos)

1. **Ejecuta el script de corrección:**
   ```bash
   # Producción
   ./scripts/deployment/fix-db-encoding.sh --prod
   
   # Desarrollo
   ./scripts/deployment/fix-db-encoding.sh --dev
   ```

2. **Verifica los resultados** en la consola

3. **Prueba la aplicación** para asegurar que los caracteres se muestran correctamente

#### Opción B: Recrear la Base de Datos (Recomendado si hay pocos datos o es un entorno nuevo)

1. **Exporta los datos actuales:**
   ```bash
   ./scripts/deployment/export-dev-db.sh
   ```

2. **Elimina y recrea la base de datos:**
   ```bash
   # Producción
   COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec db psql -U postgres -c "DROP DATABASE IF EXISTS mykaizenfit;"
   COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec db psql -U postgres -c "CREATE DATABASE mykaizenfit WITH ENCODING 'UTF8' LC_COLLATE='es_ES.UTF-8' LC_CTYPE='es_ES.UTF-8' TEMPLATE template0;"
   ```

3. **Importa los datos:**
   ```bash
   ./scripts/deployment/import-to-prod.sh -f backups/dev_database_export_YYYYMMDD_HHMMSS.sql.gz
   ```

## 🔍 Verificación

### Verificar Encoding de la Base de Datos

```bash
# Producción
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec db psql -U postgres -d mykaizenfit -c "SELECT datname, pg_encoding_to_char(encoding) as encoding FROM pg_database WHERE datname = 'mykaizenfit';"

# Debería mostrar: UTF8
```

### Verificar Client Encoding

```bash
# Producción
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec db psql -U postgres -d mykaizenfit -c "SHOW client_encoding;"

# Debería mostrar: UTF8
```

### Verificar en la Aplicación

1. **Abre la aplicación** en el navegador
2. **Verifica que los caracteres especiales se muestren correctamente:**
   - á, é, í, ó, ú
   - ñ, Ñ
   - ü, Ü
   - Ejemplos: "Máquina", "Glúteo", "Piña", "César"

## 📝 Notas Importantes

1. **Backups:** Siempre se crea un backup antes de modificar datos existentes
2. **Django Settings:** Ya está configurado con UTF-8 en `backend/settings.py` (líneas 250-251)
3. **Frontend:** Ya tiene funciones de corrección de encoding en `frontend/lib/encoding-fix.ts`
4. **Middleware:** Ya existe middleware para asegurar UTF-8 en respuestas JSON (`backend/api/middleware.py`)

## 🆘 Solución de Problemas

### Si los caracteres aún se muestran mal después de la corrección:

1. **Verifica el encoding de la base de datos:**
   ```bash
   COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec db psql -U postgres -d mykaizenfit -c "SELECT datname, pg_encoding_to_char(encoding) as encoding FROM pg_database WHERE datname = 'mykaizenfit';"
   ```

2. **Si no es UTF8, recrea la base de datos:**
   - Sigue la Opción B arriba

3. **Verifica que Django esté usando UTF-8:**
   - Revisa `backend/backend/settings.py` líneas 250-251
   - Debe tener `"client_encoding": "UTF8"` en `DATABASES['default']['OPTIONS']`

4. **Limpia la caché del navegador:**
   - Ctrl+Shift+Delete (o Cmd+Shift+Delete en Mac)
   - Selecciona "Caché" y "Cookies"
   - Recarga la página

### Si necesitas restaurar un backup:

```bash
# Descomprimir y restaurar
gunzip < backups/encoding_fix_backup_prod_YYYYMMDD_HHMMSS.sql.gz | \
  COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit
```

## 📚 Referencias

- [PostgreSQL Character Set Support](https://www.postgresql.org/docs/current/multibyte.html)
- [Django Database Encoding](https://docs.djangoproject.com/en/stable/ref/databases/#postgresql-notes)
- Scripts de corrección existentes:
  - `backend/scripts/fix_utf8_comprehensive.py`
  - `backend/scripts/diagnose_utf8_issues.py`
  - `backend/accounts/management/commands/fix_users_utf8.py`

