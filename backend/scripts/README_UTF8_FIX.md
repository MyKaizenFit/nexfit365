# 🔧 Solución de Problemas UTF-8 en la Base de Datos

Este documento explica cómo solucionar problemas de codificación UTF-8 en la base de datos PostgreSQL.

## 📋 Problemas Comunes

Los problemas de codificación UTF-8 suelen manifestarse como:
- Caracteres reemplazados por `??` (por ejemplo: `C??sar` en lugar de `César`)
- Caracteres mal codificados como `Ã³` en lugar de `ó`
- Textos con acentos que no se muestran correctamente

## 🛠️ Scripts Disponibles

### 1. Script de Diagnóstico (`diagnose_utf8_issues.py`)

Este script verifica la configuración de la base de datos y detecta problemas en los datos existentes.

**Uso:**
```bash
cd backend
python scripts/diagnose_utf8_issues.py
```

**Qué hace:**
- Verifica la codificación de la base de datos PostgreSQL
- Verifica la codificación del cliente (conexión actual)
- Busca problemas de codificación en todos los modelos
- Muestra un resumen de problemas encontrados

### 2. Script de Corrección Completo (`fix_utf8_comprehensive.py`)

Este script corrige automáticamente todos los problemas de codificación encontrados en los datos.

**Uso:**
```bash
cd backend
python scripts/fix_utf8_comprehensive.py
```

**Qué hace:**
- Verifica y corrige la configuración de la base de datos
- Corrige caracteres mal codificados en todos los modelos:
  - Exercises (nombre, descripción, instrucciones)
  - Recipes (nombre, descripción, instrucciones)
  - NutritionPlans (nombre, descripción)
  - PlanMeals (nombre, descripción)
  - WorkoutPrograms (nombre, descripción)
  - WorkoutDays (nombre, notas)
  - WellnessTips (título, resumen, contenido)
  - MotivationalTips (título, contenido)
  - FeedbackMessages (mensaje)
  - CustomUser (nombre, apellido)

**⚠️ IMPORTANTE:** Este script modifica los datos en la base de datos. Se recomienda hacer un backup antes de ejecutarlo.

### 3. Script de Corrección de Recetas (`fix_utf8_encoding.py`)

Script específico para corregir solo las recetas.

**Uso:**
```bash
cd backend
python scripts/fix_utf8_encoding.py
```

## 📝 Proceso Recomendado

### Paso 1: Diagnóstico

Primero, ejecuta el script de diagnóstico para identificar los problemas:

```bash
python scripts/diagnose_utf8_issues.py
```

Este script te mostrará:
- Si la base de datos está configurada correctamente
- Cuántos objetos tienen problemas de codificación
- Ejemplos de los problemas encontrados

### Paso 2: Backup (Recomendado)

Antes de corregir los datos, haz un backup de la base de datos:

```bash
# Ejemplo para PostgreSQL local
pg_dump -U tu_usuario -d tu_base_datos > backup_antes_correccion.sql

# O usando Django
python manage.py dumpdata > backup_antes_correccion.json
```

### Paso 3: Corrección

Ejecuta el script de corrección completo:

```bash
python scripts/fix_utf8_comprehensive.py
```

Este script mostrará el progreso y te informará cuántos objetos fueron corregidos.

### Paso 4: Verificación

Vuelve a ejecutar el script de diagnóstico para verificar que los problemas se hayan solucionado:

```bash
python scripts/diagnose_utf8_issues.py
```

## 🔧 Configuración de la Base de Datos

### Verificar Codificación de la Base de Datos

Si la base de datos no está usando UTF-8, necesitarás recrearla:

```sql
-- Conectarse a PostgreSQL
psql -U postgres

-- Verificar la codificación actual
SELECT datname, pg_encoding_to_char(encoding) as encoding 
FROM pg_database 
WHERE datname = 'tu_base_datos';

-- Si no es UTF8, crear una nueva base de datos con UTF-8
CREATE DATABASE tu_base_datos_nueva 
WITH ENCODING 'UTF8' 
LC_COLLATE='en_US.UTF-8' 
LC_CTYPE='en_US.UTF-8' 
TEMPLATE template0;

-- Migrar los datos (esto requiere un proceso de migración más complejo)
```

### Configuración en Django

La configuración de Django ya está optimizada para UTF-8 en `backend/settings.py`:

```python
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "OPTIONS": {
            "client_encoding": "UTF8",
            "options": "-c client_encoding=UTF8 -c lc_messages=en_US.UTF-8",
        },
        # ...
    }
}
```

## 🐛 Solución de Problemas

### Problema: La base de datos no está usando UTF-8

**Solución:** Recrear la base de datos con UTF-8 (ver sección anterior).

### Problema: Los caracteres siguen apareciendo mal después de la corrección

**Posibles causas:**
1. La aplicación cliente no está usando UTF-8
2. Los datos fueron insertados con codificación incorrecta
3. La base de datos necesita ser recreada

**Solución:**
1. Verificar que el frontend esté configurado para usar UTF-8
2. Verificar que todas las conexiones usen UTF-8
3. Ejecutar el script de diagnóstico nuevamente

### Problema: Error al ejecutar los scripts

**Solución:**
1. Asegúrate de estar en el directorio `backend`
2. Verifica que Django esté configurado correctamente
3. Verifica que tengas acceso a la base de datos
4. Revisa los logs de error para más detalles

## 📚 Referencias

- [PostgreSQL Character Set Support](https://www.postgresql.org/docs/current/multibyte.html)
- [Django Database Configuration](https://docs.djangoproject.com/en/stable/ref/settings/#databases)
- [Python Unicode HOWTO](https://docs.python.org/3/howto/unicode.html)

## ✅ Checklist de Verificación

- [ ] Script de diagnóstico ejecutado sin errores
- [ ] Backup de la base de datos creado
- [ ] Script de corrección ejecutado
- [ ] Verificación post-corrección realizada
- [ ] Base de datos configurada con UTF-8
- [ ] Django configurado para usar UTF-8
- [ ] Frontend configurado para usar UTF-8
- [ ] Nuevos datos se insertan correctamente con caracteres especiales






