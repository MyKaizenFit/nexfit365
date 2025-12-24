# Cambiar Contraseña de Usuario nexfit_app - Instrucciones Manuales

## Nueva Contraseña
**Contraseña:** `gFMpSumu3XrOH6S6zHkH`

## Método 1: Usando psql con tu usuario actual

1. **Conecta a PostgreSQL con el usuario que tengas acceso:**
   ```powershell
   psql -U TU_USUARIO -d postgres
   ```
   (Reemplaza `TU_USUARIO` con el usuario que tengas, puede ser tu usuario de Windows o el que configuraste)

2. **Ejecuta este comando SQL:**
   ```sql
   ALTER USER nexfit_app WITH PASSWORD 'gFMpSumu3XrOH6S6zHkH';
   ```

3. **Verifica que funcionó:**
   ```sql
   \du nexfit_app
   ```

4. **Sal de psql:**
   ```sql
   \q
   ```

## Método 2: Si tienes pgAdmin

1. Abre pgAdmin
2. Conéctate a tu servidor PostgreSQL
3. Ve a: Login/Group Roles → nexfit_app → Properties → Definition
4. Cambia la contraseña a: `gFMpSumu3XrOH6S6zHkH`
5. Guarda los cambios

## Método 3: Configurar pg_hba.conf temporalmente

Si quieres usar el script automático:

1. **Edita pg_hba.conf:**
   - Ubicación: `C:\Program Files\PostgreSQL\17\data\pg_hba.conf`
   - Cambia `scram-sha-256` a `trust` en las líneas de conexión local

2. **Reinicia PostgreSQL:**
   ```powershell
   Stop-Service postgresql-x64-17
   Start-Service postgresql-x64-17
   ```

3. **Ejecuta el script:**
   ```powershell
   cd "F:\Proyecto Sara Aitor\nexfit365\backend"
   .\cambiar_contraseña_usuario.ps1
   ```

4. **IMPORTANTE: Revertir pg_hba.conf** después de cambiar la contraseña

## Verificación

Después de cambiar la contraseña, ejecuta:

```powershell
cd "F:\Proyecto Sara Aitor\nexfit365\backend"
python test_database_connection.py
```

Todas las pruebas deberían pasar.

## Credenciales Finales

- **DB_NAME:** `ddbb_nextfit`
- **DB_USER:** `nexfit_app`
- **DB_PASSWORD:** `gFMpSumu3XrOH6S6zHkH`
- **DB_HOST:** `localhost`
- **DB_PORT:** `5432`

El archivo `.env` ya está actualizado con estas credenciales.


