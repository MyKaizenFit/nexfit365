# Configurar pg_hba.conf para crear la base de datos

Para crear la nueva base de datos sin tener la contraseña de `postgres`, necesitas configurar temporalmente PostgreSQL para permitir conexiones sin contraseña.

## Pasos:

### 1. Detener el servicio PostgreSQL

Abre PowerShell como Administrador y ejecuta:

```powershell
Stop-Service postgresql-x64-17
```

(Reemplaza `17` con tu versión de PostgreSQL si es diferente)

### 2. Editar pg_hba.conf

Abre el archivo `pg_hba.conf` en un editor de texto (como Notepad++ o VS Code):

**Ubicación típica:**
```
C:\Program Files\PostgreSQL\17\data\pg_hba.conf
```

**Busca la línea que dice:**
```
host    all             all             127.0.0.1/32            md5
```

**Cámbiala temporalmente a:**
```
host    all             all             127.0.0.1/32            trust
```

**También busca y cambia:**
```
host    all             all             ::1/128                 md5
```

**A:**
```
host    all             all             ::1/128                 trust
```

### 3. Guardar y reiniciar PostgreSQL

```powershell
Start-Service postgresql-x64-17
```

### 4. Ejecutar el script de creación

Ahora puedes ejecutar el script:

```powershell
cd "F:\Proyecto Sara Aitor\nexfit365\backend"
.\create_new_database_auto.ps1
```

### 5. IMPORTANTE: Revertir los cambios

**Después de crear la base de datos, vuelve a cambiar `trust` a `md5` en `pg_hba.conf` y reinicia PostgreSQL:**

```powershell
Stop-Service postgresql-x64-17
# Edita pg_hba.conf y cambia trust de vuelta a md5
Start-Service postgresql-x64-17
```

## Alternativa: Usar pgAdmin

Si tienes pgAdmin instalado, puedes:
1. Abrir pgAdmin
2. Conectarte a PostgreSQL (puede que necesites configurar la contraseña de postgres en pgAdmin)
3. Ejecutar estos comandos SQL manualmente:

```sql
CREATE USER nexfit_app WITH PASSWORD '$ydEt4Kdpe012oB$07tArRak';
CREATE DATABASE ddbb_nextfit OWNER nexfit_app;
GRANT ALL PRIVILEGES ON DATABASE ddbb_nextfit TO nexfit_app;
```

Luego ejecuta el script solo para restaurar los datos:

```powershell
cd "F:\Proyecto Sara Aitor\nexfit365\backend"
# Descomprimir backup
Expand-Archive -Path "..\backups\dev_database_export_20251224_142932.sql.zip" -DestinationPath "..\backups\tmp_restore" -Force

# Restaurar datos
$env:PGPASSWORD='$ydEt4Kdpe012oB$07tArRak'
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U nexfit_app -d ddbb_nextfit -f "..\backups\tmp_restore\dev_database_export_20251224_142932.sql"
```




