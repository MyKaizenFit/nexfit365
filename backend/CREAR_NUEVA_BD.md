# 🔧 Crear Nueva Base de Datos ddbb_nextfit

Este documento explica cómo crear la nueva base de datos `ddbb_nextfit` y restaurar los datos desde el backup.

## 📋 Credenciales Generadas

Las siguientes credenciales han sido generadas automáticamente y ya están configuradas en el archivo `.env`:

- **Base de datos:** `ddbb_nextfit`
- **Usuario:** `nexfit_app`
- **Contraseña:** `CHANGE_ME_DB_PASSWORD`
- **Host:** `localhost`
- **Puerto:** `5432`

## 🚀 Pasos para Crear la Nueva Base de Datos

### Opción 1: Usar el Script Automático (Recomendado)

1. **Abre PowerShell como Administrador** (si es necesario para acceder a PostgreSQL)

2. **Navega al directorio del backend:**
   ```powershell
   cd "F:\Proyecto Sara Aitor\nexfit365\backend"
   ```

3. **Ejecuta el script:**
   ```powershell
   .\create_new_database.ps1
   ```

4. **Cuando te pida la contraseña de `postgres`:**
   - Si tienes la contraseña, introdúcela
   - Si no tienes contraseña, presiona Enter (intentará sin contraseña)
   - Si PostgreSQL está configurado con autenticación `trust` en `pg_hba.conf`, funcionará sin contraseña

El script hará automáticamente:
- ✅ Crear el usuario `nexfit_app`
- ✅ Crear la base de datos `ddbb_nextfit`
- ✅ Otorgar todos los permisos necesarios
- ✅ Descomprimir el backup `dev_database_export_20251224_142932.sql.zip`
- ✅ Restaurar todos los datos en la nueva base de datos

### Opción 2: Crear Manualmente (Si el script no funciona)

Si el script no funciona, puedes ejecutar estos comandos manualmente en `psql`:

1. **Conecta a PostgreSQL:**
   ```powershell
   "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d postgres
   ```

2. **Ejecuta estos comandos SQL:**
   ```sql
   -- Crear usuario
   CREATE USER nexfit_app WITH PASSWORD 'CHANGE_ME_DB_PASSWORD';
   
   -- Crear base de datos
   CREATE DATABASE ddbb_nextfit OWNER nexfit_app;
   
   -- Otorgar permisos
   GRANT ALL PRIVILEGES ON DATABASE ddbb_nextfit TO nexfit_app;
   
   -- Salir
   \q
   ```

3. **Descomprimir el backup:**
   ```powershell
   Expand-Archive -Path "..\backups\dev_database_export_20251224_142932.sql.zip" -DestinationPath "..\backups\tmp_restore" -Force
   ```

4. **Restaurar los datos:**
   ```powershell
   $env:PGPASSWORD='CHANGE_ME_DB_PASSWORD'
   "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U nexfit_app -d ddbb_nextfit -f "..\backups\tmp_restore\dev_database_export_20251224_142932.sql"
   ```

## ✅ Verificar que Todo Funciona

Después de crear la base de datos, verifica que todo funciona correctamente:

```powershell
cd "F:\Proyecto Sara Aitor\nexfit365\backend"
python manage.py migrate accounts
```

Si ves mensajes como "No migrations to apply" o "Applying migrations... OK", significa que la conexión funciona correctamente.

## 📝 Archivo .env

El archivo `.env` ya ha sido actualizado automáticamente con las nuevas credenciales:

```env
DB_NAME=ddbb_nextfit
DB_USER=nexfit_app
DB_PASSWORD=CHANGE_ME_DB_PASSWORD
DB_HOST=localhost
DB_PORT=5432
DB_SSLMODE=disable
```

## 🔍 Solución de Problemas

### Error: "la autentificación password falló"

Esto significa que PostgreSQL requiere contraseña. Tienes dos opciones:

1. **Configurar pg_hba.conf para permitir conexión sin contraseña temporalmente:**
   - Ubicación: `C:\Program Files\PostgreSQL\17\data\pg_hba.conf`
   - Cambia la línea que dice `host all all 127.0.0.1/32 md5` a `host all all 127.0.0.1/32 trust`
   - Reinicia el servicio PostgreSQL
   - Ejecuta el script
   - **IMPORTANTE:** Vuelve a cambiar a `md5` después

2. **Usar la contraseña de postgres** cuando el script la solicite

### Error: "database already exists"

Si la base de datos ya existe, puedes:
- Eliminarla primero: `DROP DATABASE ddbb_nextfit;`
- O usar un nombre diferente

### Error: "permission denied"

Asegúrate de estar usando un usuario con privilegios de superusuario (normalmente `postgres`)

## 📞 Soporte

Si tienes problemas, verifica:
1. Que PostgreSQL esté corriendo: `Get-Service postgresql*`
2. Que el archivo de backup exista en `backups/dev_database_export_20251224_142932.sql.zip`
3. Que tengas permisos para crear bases de datos en PostgreSQL


