# Cómo Ver el Contenido de la Base de Datos

Debido a restricciones de permisos, aquí tienes varias formas de ver el contenido de la base de datos:

## Opción 1: Usar el Script SQL (Recomendado)

He creado un script SQL completo que muestra todo el contenido de la base de datos.

### Ejecutar desde el host:
```bash
cd /srv/mykaizenfit/app
docker compose exec db psql -U postgres -d mykaizenfit -f /path/to/ver_contenido_db.sql
```

### O copiar el script al contenedor y ejecutarlo:
```bash
# Copiar el script al contenedor
docker compose cp ver_contenido_db.sql db:/tmp/ver_contenido_db.sql

# Ejecutarlo
docker compose exec db psql -U postgres -d mykaizenfit -f /tmp/ver_contenido_db.sql
```

### O ejecutar directamente:
```bash
docker compose exec db psql -U postgres -d mykaizenfit << EOF
\echo 'Verificando usuarios...'
SELECT email, first_name, last_name, role FROM accounts_customuser LIMIT 10;
\echo 'Verificando ejercicios...'
SELECT name, category FROM workouts_exercise LIMIT 10;
EOF
```

## Opción 2: Conectarse Interactivamente a PostgreSQL

```bash
# Conectarse al contenedor de la base de datos
docker compose exec db psql -U postgres -d mykaizenfit

# Una vez dentro, puedes ejecutar consultas:
\dt                    # Listar todas las tablas
\d accounts_customuser # Ver estructura de la tabla de usuarios
SELECT * FROM accounts_customuser LIMIT 10;
SELECT COUNT(*) FROM workouts_exercise;
\q                    # Salir
```

## Opción 3: Usar el Script Python desde el Backend

Si tienes acceso al contenedor del backend:

```bash
# Ejecutar el script de verificación
docker compose exec backend python check_database.py

# O usar el script de contenido detallado
docker compose exec backend python ver_contenido_db.py
```

## Opción 4: Consultas SQL Específicas

### Ver usuarios:
```bash
docker compose exec db psql -U postgres -d mykaizenfit -c "SELECT email, first_name, last_name, role, is_superuser FROM accounts_customuser;"
```

### Contar registros por tabla:
```bash
docker compose exec db psql -U postgres -d mykaizenfit -c "
SELECT 
    'accounts_customuser' as tabla, COUNT(*) as registros FROM accounts_customuser
UNION ALL
SELECT 'workouts_exercise', COUNT(*) FROM workouts_exercise
UNION ALL
SELECT 'nutrition_defaultnutritionplan', COUNT(*) FROM nutrition_defaultnutritionplan
UNION ALL
SELECT 'nutrition_recipe', COUNT(*) FROM nutrition_recipe
UNION ALL
SELECT 'workouts_defaultworkoutprogram', COUNT(*) FROM workouts_defaultworkoutprogram;
"
```

### Ver ejercicios:
```bash
docker compose exec db psql -U postgres -d mykaizenfit -c "SELECT name, category, muscle_groups FROM workouts_exercise LIMIT 20;"
```

### Ver planes nutricionales:
```bash
docker compose exec db psql -U postgres -d mykaizenfit -c "SELECT name, min_role_required, is_default FROM nutrition_defaultnutritionplan;"
```

## Opción 5: Exportar a Archivo

Para guardar el contenido en un archivo:

```bash
# Exportar todo el contenido a un archivo
docker compose exec db psql -U postgres -d mykaizenfit -f ver_contenido_db.sql > contenido_db.txt 2>&1

# O exportar solo una tabla
docker compose exec db psql -U postgres -d mykaizenfit -c "SELECT * FROM accounts_customuser;" > usuarios.txt
```

## Consultas Útiles Rápidas

### Ver todas las tablas:
```bash
docker compose exec db psql -U postgres -d mykaizenfit -c "\dt"
```

### Ver estructura de una tabla:
```bash
docker compose exec db psql -U postgres -d mykaizenfit -c "\d accounts_customuser"
```

### Ver tamaño de la base de datos:
```bash
docker compose exec db psql -U postgres -d mykaizenfit -c "SELECT pg_size_pretty(pg_database_size('mykaizenfit'));"
```

### Ver migraciones aplicadas:
```bash
docker compose exec db psql -U postgres -d mykaizenfit -c "SELECT app, name, applied FROM django_migrations ORDER BY applied DESC LIMIT 20;"
```

## Solución de Problemas

### Si no puedes conectarte:
1. Verifica que el contenedor está corriendo:
   ```bash
   docker compose ps
   ```

2. Verifica los logs:
   ```bash
   docker compose logs db
   ```

3. Verifica las variables de entorno:
   ```bash
   cat docker/backend.env.production | grep DB_
   ```

### Si la contraseña no funciona:
La contraseña está en:
- Desarrollo: `docker/backend.env` → `DB_PASSWORD=postgres`
- Producción: `docker/backend.env.production` → `DB_PASSWORD=CHANGE_ME_DB_PASSWORD`

## Archivos Creados

He creado los siguientes archivos para ayudarte:

1. **`ver_contenido_db.sql`** - Script SQL completo para ver todo el contenido
2. **`backend/check_database.py`** - Script Python para verificación técnica
3. **`backend/ver_contenido_db.py`** - Script Python para ver contenido detallado
4. **`VERIFICACION_BASE_DATOS.md`** - Documentación completa

## Ejemplo Completo

```bash
# 1. Verificar que los contenedores están corriendo
docker compose ps

# 2. Conectarse a la base de datos
docker compose exec db psql -U postgres -d mykaizenfit

# 3. Dentro de psql, ejecutar:
SELECT COUNT(*) FROM accounts_customuser;
SELECT COUNT(*) FROM workouts_exercise;
SELECT COUNT(*) FROM nutrition_defaultnutritionplan;
\q
```

