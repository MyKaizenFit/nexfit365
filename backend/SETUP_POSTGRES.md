# 🔧 Configuración de PostgreSQL para NexFit365

## Opción 1: Usar el script automático

```bash
cd backend
python setup_postgres.py
```

El script te guiará para:
- Cambiar la contraseña del usuario `postgres`
- Crear un nuevo usuario y base de datos
- Actualizar el archivo `.env` automáticamente

## Opción 2: Configuración manual

### Paso 1: Conectar a PostgreSQL

Abre una terminal y conecta a PostgreSQL:

```bash
psql -U postgres
```

Si te pide contraseña y no la recuerdas, intenta:
- Dejar en blanco (si no tiene contraseña)
- `postgres` (contraseña por defecto común)
- Tu contraseña de Windows (si instalaste PostgreSQL con tu usuario)

### Paso 2A: Cambiar contraseña del usuario postgres

Si quieres usar el usuario `postgres` existente:

```sql
ALTER USER postgres WITH PASSWORD 'tu_nueva_contraseña';
```

### Paso 2B: Crear nuevo usuario y base de datos

Si prefieres crear un usuario nuevo:

```sql
-- Crear usuario
CREATE USER nexfit_user WITH PASSWORD 'tu_contraseña_segura';

-- Crear base de datos
CREATE DATABASE mykaizenfit_dev OWNER nexfit_user;

-- Dar permisos
GRANT ALL PRIVILEGES ON DATABASE mykaizenfit_dev TO nexfit_user;
```

### Paso 3: Actualizar archivo .env

Edita el archivo `backend/.env` y actualiza estas líneas:

```env
DB_NAME=mykaizenfit_dev
DB_USER=postgres          # o el nombre del usuario que creaste
DB_PASSWORD=tu_contraseña  # la contraseña que configuraste
DB_HOST=localhost
DB_PORT=5432
DB_SSLMODE=disable
```

## Opción 3: Resetear PostgreSQL completamente (Windows)

Si PostgreSQL está instalado como servicio de Windows:

1. **Detener el servicio:**
   ```powershell
   Stop-Service postgresql-x64-XX  # Reemplaza XX con tu versión
   ```

2. **Editar pg_hba.conf:**
   - Ubicación típica: `C:\Program Files\PostgreSQL\XX\data\pg_hba.conf`
   - Cambia `md5` o `scram-sha-256` a `trust` temporalmente:
   ```
   # TYPE  DATABASE        USER            ADDRESS                 METHOD
   host    all             all             127.0.0.1/32            trust
   ```

3. **Iniciar el servicio:**
   ```powershell
   Start-Service postgresql-x64-XX
   ```

4. **Conectar sin contraseña y cambiar:**
   ```bash
   psql -U postgres
   ```
   ```sql
   ALTER USER postgres WITH PASSWORD 'nueva_contraseña';
   ```

5. **Revertir pg_hba.conf** a `md5` o `scram-sha-256` y reiniciar.

## Verificar conexión

Después de configurar, prueba la conexión:

```bash
cd backend
python manage.py migrate accounts
```

Si funciona, verás algo como:
```
Operations to perform:
  Apply all migrations: accounts
Running migrations:
  Applying accounts.0002_profile_audit_log... OK
```

## Solución de problemas

### Error: "fe_sendauth: no password supplied"
- Verifica que `DB_PASSWORD` esté en el archivo `.env`
- Asegúrate de que no haya espacios extra en las variables

### Error: "connection refused"
- Verifica que PostgreSQL esté corriendo:
  ```powershell
  Get-Service postgresql*
  ```
- Si no está corriendo, inícialo:
  ```powershell
  Start-Service postgresql-x64-XX
  ```

### Error: "database does not exist"
- Crea la base de datos:
  ```sql
  CREATE DATABASE mykaizenfit_dev;
  ```

### Error: "permission denied"
- Asegúrate de que el usuario tenga permisos:
  ```sql
  GRANT ALL PRIVILEGES ON DATABASE mykaizenfit_dev TO tu_usuario;
  ```



