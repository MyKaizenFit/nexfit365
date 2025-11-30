# Cómo Verificar Usuarios en la Base de Datos

## Opción 1: Usar el Script SQL (Más Rápido)

He creado un script SQL específico para ver usuarios:

```bash
cd /srv/mykaizenfit/app
docker compose exec db psql -U postgres -d mykaizenfit -f ver_usuarios.sql
```

Este script muestra:
- Total de usuarios y estadísticas
- Listado completo de usuarios con todos sus datos
- Usuarios agrupados por rol
- Listado de administradores

## Opción 2: Usar el Script Python Existente

Ya existe un script en el proyecto:

```bash
docker compose exec backend python check_users.py
```

## Opción 3: Usar el Nuevo Script Python

He creado un script mejorado:

```bash
docker compose exec backend python ver_usuarios.py
```

## Opción 4: Consulta SQL Directa

```bash
# Ver todos los usuarios
docker compose exec db psql -U postgres -d mykaizenfit -c "
SELECT 
    email,
    first_name || ' ' || last_name as nombre,
    role,
    CASE WHEN is_superuser THEN 'Sí' ELSE 'No' END as admin,
    date_joined
FROM accounts_customuser
ORDER BY date_joined;
"

# Contar usuarios
docker compose exec db psql -U postgres -d mykaizenfit -c "
SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_superuser = true) as admins
FROM accounts_customuser;
"
```

## Opción 5: Usar Django Shell

```bash
docker compose exec backend python manage.py shell
```

Luego ejecuta:
```python
from accounts.models import CustomUser

# Ver todos los usuarios
users = CustomUser.objects.all()
print(f"Total: {users.count()}")

for user in users:
    print(f"{user.email} - {user.first_name} {user.last_name} - Rol: {user.role} - Admin: {user.is_superuser}")
```

## Usuarios Esperados

Según los scripts encontrados, deberías tener al menos:

1. **Usuario Administrador**: `admin@mykaizenfit.com`
   - Creado por: `create_admin_user.py`
   - Contraseña: `AdminNex-Fit123!`
   - Rol: ADMIN
   - is_superuser: True

2. **Usuarios de Prueba** (si se ejecutaron los scripts de test):
   - Creados por: `create_test_users.py` o `create_test_users_with_plans.py`

## Crear Usuario Administrador si No Existe

Si no hay usuarios, puedes crear uno:

```bash
docker compose exec backend python create_admin_user.py
```

## Archivos Creados

1. **`ver_usuarios.sql`** - Script SQL completo para ver usuarios
2. **`backend/ver_usuarios.py`** - Script Python mejorado para ver usuarios

## Ejemplo de Salida Esperada

```
========================================
  USUARIOS EN LA BASE DE DATOS
========================================

Total de usuarios: 3
Administradores: 1
Staff: 1
Verificados: 0
Activos: 3

Email: admin@mykaizenfit.com
  Nombre: Administrador Nex-Fit
  Rol: ADMIN
  Admin: Sí
  Staff: Sí
  Verificado: No
  Activo: Sí
  Fecha creación: 2025-01-XX XX:XX:XX
```

