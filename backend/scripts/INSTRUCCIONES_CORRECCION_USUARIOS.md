# 🔧 Instrucciones para Corregir Caracteres Especiales en Usuarios

## Problema
Los nombres de usuarios aparecen con caracteres mal codificados como `Mar??a Garc??a L??pez` en lugar de `María García López`.

## Soluciones Disponibles

### Opción 1: Comando de Django (Recomendado)

Este es el método más seguro y recomendado:

```bash
cd backend
python manage.py fix_users_utf8
```

Para ver qué se corregiría sin hacer cambios (modo dry-run):
```bash
python manage.py fix_users_utf8 --dry-run
```

### Opción 2: Script SQL Directo

Si prefieres ejecutar SQL directamente en PostgreSQL:

1. Conectarse a la base de datos:
```bash
psql -U tu_usuario -d tu_base_datos
```

2. Ejecutar el script:
```sql
\i scripts/fix_users_sql.sql
```

O copiar y pegar el contenido de `backend/scripts/fix_users_sql.sql` directamente en psql.

### Opción 3: Script Python Independiente

```bash
cd backend
python scripts/fix_users_utf8.py
```

**Nota:** Este método requiere que las variables de entorno estén configuradas correctamente.

## Verificación

Después de ejecutar cualquiera de los métodos anteriores, verifica que los cambios se aplicaron:

1. **Desde Django shell:**
```bash
python manage.py shell
```

```python
from accounts.models import CustomUser

# Ver usuarios con problemas (debería estar vacío)
users_with_issues = CustomUser.objects.filter(
    first_name__contains='??'
) | CustomUser.objects.filter(
    last_name__contains='??'
)
print(f"Usuarios con problemas: {users_with_issues.count()}")

# Ver algunos usuarios
for user in CustomUser.objects.all()[:5]:
    print(f"{user.email}: {user.first_name} {user.last_name}")
```

2. **Desde PostgreSQL:**
```sql
SELECT id, email, first_name, last_name 
FROM accounts_customuser 
WHERE first_name LIKE '%??%' OR last_name LIKE '%??%';
```

Si esta consulta no devuelve resultados, los usuarios fueron corregidos exitosamente.

## Si el Problema Persiste

Si después de ejecutar los scripts sigues viendo caracteres mal codificados:

1. **Verifica la codificación de la base de datos:**
```sql
SELECT datname, pg_encoding_to_char(encoding) as encoding 
FROM pg_database 
WHERE datname = current_database();
```

Debería mostrar `UTF8`. Si no, necesitarás recrear la base de datos con UTF-8.

2. **Verifica la configuración del frontend:**
   - Asegúrate de que el frontend esté configurado para usar UTF-8
   - Verifica que las respuestas del API incluyan `Content-Type: application/json; charset=utf-8`

3. **Verifica la configuración de Django:**
   - El archivo `backend/settings.py` ya está configurado para usar UTF-8
   - Verifica que las variables de entorno estén correctas

## Prevención de Problemas Futuros

Para evitar que vuelvan a aparecer estos problemas:

1. **Asegura que todas las conexiones usen UTF-8:**
   - La configuración en `settings.py` ya está correcta
   - Verifica que el cliente de PostgreSQL esté configurado para UTF-8

2. **Al insertar datos manualmente:**
   - Usa siempre UTF-8 al codificar texto
   - Verifica que los scripts de importación usen UTF-8

3. **En el frontend:**
   - Asegúrate de que las peticiones HTTP incluyan `Content-Type: application/json; charset=utf-8`
   - Verifica que el navegador esté configurado para usar UTF-8

## Soporte

Si después de seguir estos pasos el problema persiste, verifica:
- Los logs del servidor para errores de codificación
- La configuración del servidor web (nginx/apache) para UTF-8
- La configuración del cliente de base de datos




