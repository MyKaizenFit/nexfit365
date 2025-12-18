# 📋 Guía Manual: Copiar BD de Producción a Desarrollo

Esta guía te ayudará a copiar la base de datos de producción a desarrollo manualmente, conectándote directamente por SSH al servidor.

## 🔧 Requisitos Previos

- Acceso SSH al servidor (45.136.19.91)
- Docker corriendo localmente
- Contenedor de desarrollo activo

## 📝 Pasos a Seguir

### Paso 1: Conectarse al Servidor de Producción

Abre una terminal PowerShell y ejecuta:

```powershell
ssh root@45.136.19.91
```

Introduce tu contraseña cuando se te solicite.

### Paso 2: Buscar el Contenedor de BD de Producción

Una vez conectado al servidor, ejecuta:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(db|postgres)"
```

O para ver todos los contenedores:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

**Anota el nombre del contenedor de BD de producción** (probablemente algo como `nexfit-pro-db-1` o similar).

### Paso 3: Crear el Backup en el Servidor

Ejecuta este comando (reemplaza `<NOMBRE_CONTENEDOR>` con el nombre que anotaste):

```bash
docker exec <NOMBRE_CONTENEDOR> pg_dump -U postgres -F p mykaizenfit > /srv/mykaizenfit/pro/backup_prod_$(date +%Y%m%d_%H%M%S).sql
```

Por ejemplo, si el contenedor se llama `nexfit-pro-db-1`:

```bash
docker exec nexfit-pro-db-1 pg_dump -U postgres -F p mykaizenfit > /srv/mykaizenfit/pro/backup_prod_$(date +%Y%m%d_%H%M%S).sql
```

**Espera a que termine** (puede tardar varios minutos dependiendo del tamaño de la BD).

### Paso 4: Verificar que el Backup se Creó

```bash
ls -lh /srv/mykaizenfit/pro/backup_prod_*.sql | tail -1
```

Anota el nombre completo del archivo (por ejemplo: `backup_prod_20251213_143022.sql`).

### Paso 5: Salir del Servidor

```bash
exit
```

### Paso 6: Descargar el Backup a tu Máquina Local

En tu terminal PowerShell local (ya no en el servidor), ejecuta:

```powershell
# Asegúrate de estar en el directorio del proyecto
cd C:\Users\usuario\Documents\nexfit365

# Crear directorio de backups si no existe
New-Item -ItemType Directory -Path ./backups -Force

# Descargar el backup (reemplaza FECHA_HORA con el nombre del archivo que anotaste)
scp root@45.136.19.91:/srv/mykaizenfit/pro/backup_prod_FECHA_HORA.sql ./backups/
```

Por ejemplo:

```powershell
scp root@45.136.19.91:/srv/mykaizenfit/pro/backup_prod_20251213_143022.sql ./backups/
```

Te pedirá la contraseña SSH de nuevo.

### Paso 7: Detener el Backend de Desarrollo

```powershell
docker stop nexfit-dev-backend-1
```

### Paso 8: Eliminar y Recrear la BD de Desarrollo

```powershell
# Eliminar BD de desarrollo
docker exec nexfit-dev-db-1 psql -U postgres -c "DROP DATABASE IF EXISTS mykaizenfit_dev;"

# Crear nueva BD de desarrollo
docker exec nexfit-dev-db-1 psql -U postgres -c "CREATE DATABASE mykaizenfit_dev;"
```

### Paso 9: Restaurar el Backup en Desarrollo

```powershell
# Reemplaza FECHA_HORA con el nombre del archivo que descargaste
Get-Content ./backups/backup_prod_FECHA_HORA.sql | docker exec -i nexfit-dev-db-1 psql -U postgres -d mykaizenfit_dev
```

Por ejemplo:

```powershell
Get-Content ./backups/backup_prod_20251213_143022.sql | docker exec -i nexfit-dev-db-1 psql -U postgres -d mykaizenfit_dev
```

**Esto puede tardar varios minutos.** Espera a que termine.

### Paso 10: Reiniciar el Backend de Desarrollo

```powershell
docker start nexfit-dev-backend-1
```

### Paso 11: Verificar que Funcionó

```powershell
# Verificar que hay usuarios en la BD
docker exec nexfit-dev-db-1 psql -U postgres -d mykaizenfit_dev -c "SELECT COUNT(*) as total_usuarios FROM accounts_customuser;"

# Verificar que hay ejercicios
docker exec nexfit-dev-db-1 psql -U postgres -d mykaizenfit_dev -c "SELECT COUNT(*) as total_ejercicios FROM workouts_exercise;"
```

## ✅ Verificación Final

Si todo salió bien, deberías ver:
- ✅ Números mayores a 0 en los conteos
- ✅ Backend de desarrollo funcionando
- ✅ Puedes acceder a http://localhost:8001/admin y ver usuarios

## 🆘 Solución de Problemas

### Error: "No such file or directory"
- Verifica que el nombre del archivo de backup sea correcto
- Usa `ls -lh /srv/mykaizenfit/pro/backup_prod_*.sql` en el servidor para ver los archivos

### Error: "Permission denied"
- Verifica que tengas permisos en el servidor
- Asegúrate de estar usando `root` o un usuario con permisos

### Error al restaurar: "relation does not exist"
- Asegúrate de que el backup se descargó completamente
- Verifica el tamaño del archivo: debería ser de varios MB

### El backend no inicia
- Verifica los logs: `docker logs nexfit-dev-backend-1`
- Asegúrate de que la BD se restauró correctamente

## 📝 Notas Importantes

- ⚠️ **La BD de producción NO se modifica** - Solo se lee para hacer el backup
- ⚠️ **La BD de desarrollo se reemplaza completamente** - Todos los datos actuales se perderán
- ✅ El backup se guarda en `./backups/` por si necesitas restaurarlo manualmente más tarde
- 💾 El proceso completo puede tardar 10-30 minutos dependiendo del tamaño de la BD

