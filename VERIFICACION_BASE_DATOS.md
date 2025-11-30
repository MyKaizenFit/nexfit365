# Verificación de Base de Datos - Nex-Fit

## Resumen

Este documento describe cómo verificar que la base de datos PostgreSQL está configurada correctamente y contiene los datos esperados.

## Configuración de la Base de Datos

### Variables de Entorno

La base de datos se configura mediante variables de entorno en:
- **Desarrollo**: `/srv/mykaizenfit/app/docker/backend.env`
- **Producción**: `/srv/mykaizenfit/app/docker/backend.env.production`

### Configuración Actual (Producción)

```env
DB_NAME=mykaizenfit
DB_USER=postgres
DB_PASSWORD=CHANGE_ME_DB_PASSWORD
DB_HOST=db
DB_PORT=5432
```

**Nota sobre puertos:**
- **Puerto interno (Docker)**: 5432 - Usado para comunicación entre contenedores
- **Puerto externo (Host)**: 5433 - Usado para conexiones desde fuera de Docker
- El backend se conecta usando `DB_HOST=db` (nombre del servicio), por lo que siempre usa el puerto interno 5432

## Estructura de la Base de Datos

### Apps Django y sus Modelos Principales

#### 1. **accounts** (Usuarios)
- `accounts_customuser` - Usuarios del sistema
- `accounts_defaultplanconfiguration` - Configuraciones de planes por defecto

#### 2. **nutrition** (Nutrición)
- `nutrition_food` - Alimentos
- `nutrition_recipe` - Recetas
- `nutrition_defaultnutritionplan` - Planes nutricionales por defecto
- `nutrition_defaultmeal` - Comidas por defecto
- `nutrition_dailymealselection` - Selecciones diarias de comidas

#### 3. **workouts** (Entrenamientos)
- `workouts_exercise` - Ejercicios
- `workouts_defaultworkoutprogram` - Programas de entrenamiento por defecto
- `workouts_defaultworkoutday` - Días de entrenamiento por defecto
- `workouts_workoutprogram` - Programas de entrenamiento de usuarios
- `workouts_workoutday` - Días de entrenamiento de usuarios
- `workouts_workoutdayexercise` - Ejercicios en días de entrenamiento

#### 4. **progress** (Progreso)
- `progress_progressentry` - Entradas de progreso
- `progress_progressphoto` - Fotos de progreso

#### 5. **notifications** (Notificaciones)
- `notifications_notification` - Notificaciones del sistema

#### 6. **achievements** (Logros)
- `achievements_achievement` - Logros disponibles
- `achievements_userachievement` - Logros de usuarios

#### 7. **api** (API)
- `api_plan` - Planes
- `api_subscription` - Suscripciones
- `api_classsession` - Sesiones de clase
- `api_booking` - Reservas
- `api_attendance` - Asistencias

#### 8. **dashboard** (Dashboard)
- Modelos de estadísticas y métricas

## Cómo Verificar la Base de Datos

### Opción 1: Script Python (Recomendado)

Ejecutar el script de verificación desde el contenedor:

```bash
docker compose exec backend python check_database.py
```

Este script verifica:
- ✅ Conexión a la base de datos
- ✅ Tablas existentes
- ✅ Migraciones aplicadas
- ✅ Conteo de registros por tabla
- ✅ Tamaño de la base de datos
- ✅ Índices

### Opción 2: Script SQL

Ejecutar el script SQL directamente en PostgreSQL:

```bash
# Desde el host
docker compose exec db psql -U postgres -d mykaizenfit -f /path/to/check_database.sql

# O conectarse directamente
docker compose exec db psql -U postgres -d mykaizenfit
```

Luego ejecutar el contenido de `check_database.sql`.

### Opción 3: Comandos Django

```bash
# Ver migraciones aplicadas
docker compose exec backend python manage.py showmigrations

# Verificar conexión
docker compose exec backend python manage.py dbshell

# Contar registros de un modelo específico
docker compose exec backend python manage.py shell
>>> from accounts.models import CustomUser
>>> CustomUser.objects.count()
```

## Verificaciones Importantes

### 1. Migraciones Aplicadas

Todas las migraciones deben estar aplicadas. Verificar con:

```bash
docker compose exec backend python manage.py showmigrations
```

Todas las líneas deben mostrar `[X]` (aplicada), no `[ ]` (pendiente).

### 2. Tablas Principales

Verificar que existen las tablas principales:

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

### 3. Usuarios

Verificar que hay al menos un usuario administrador:

```sql
SELECT email, is_superuser, is_staff, role FROM accounts_customuser WHERE is_superuser = true;
```

### 4. Datos de Ejercicios

Verificar que hay ejercicios en la base de datos:

```sql
SELECT COUNT(*) FROM workouts_exercise;
```

### 5. Planes Nutricionales

Verificar que hay planes nutricionales:

```sql
SELECT COUNT(*) FROM nutrition_defaultnutritionplan;
```

## Problemas Comunes y Soluciones

### Problema: No se puede conectar a la base de datos

**Solución:**
1. Verificar que el contenedor `db` está corriendo: `docker compose ps`
2. Verificar las variables de entorno en `backend.env` o `backend.env.production`
3. Verificar que `DB_HOST=db` (nombre del servicio en docker-compose)

### Problema: Migraciones pendientes

**Solución:**
```bash
docker compose exec backend python manage.py migrate
```

### Problema: Tablas no existen

**Solución:**
1. Aplicar migraciones: `docker compose exec backend python manage.py migrate`
2. Verificar que las apps están en `INSTALLED_APPS` en `settings.py`

### Problema: Base de datos vacía

**Solución:**
1. Verificar que los scripts de población de datos se han ejecutado
2. Revisar los comandos de management en las apps:
   - `accounts/management/commands/`
   - `nutrition/management/commands/`
   - `workouts/management/commands/`

## Comandos Útiles

### Ver logs del contenedor de base de datos
```bash
docker compose logs db
```

### Ver logs del backend
```bash
docker compose logs backend
```

### Reiniciar la base de datos (⚠️ CUIDADO: Borra datos)
```bash
docker compose down -v  # Elimina volúmenes
docker compose up -d
docker compose exec backend python manage.py migrate
```

### Backup de la base de datos
```bash
docker compose exec db pg_dump -U postgres mykaizenfit > backup.sql
```

### Restaurar backup
```bash
docker compose exec -T db psql -U postgres mykaizenfit < backup.sql
```

## Estado Actual de la Base de Datos

Para verificar el estado actual, ejecutar:

```bash
# Verificar contenedores
docker compose ps

# Verificar migraciones
docker compose exec backend python manage.py showmigrations

# Verificar conexión
docker compose exec backend python manage.py dbshell
```

## Notas Importantes

1. **Volúmenes Docker**: Los datos se almacenan en el volumen `postgres_data` definido en `docker-compose.yml`
2. **Backups Automáticos**: El servicio `db-backup` crea backups diarios a las 3 AM
3. **Permisos**: Asegúrate de que el usuario tiene permisos para acceder a Docker si ejecutas comandos desde el host

