# 🔄 Reiniciar Servicios para Aplicar Correcciones de Encoding

Si después de corregir el encoding sigues viendo caracteres mal codificados en la aplicación, sigue estos pasos:

## ✅ Pasos para Aplicar los Cambios

### 1. Reiniciar Backend (OBLIGATORIO)

El backend necesita reiniciarse para cargar los datos corregidos de la base de datos:

```bash
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml restart backend
```

O si prefieres reiniciar todos los servicios:

```bash
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml restart
```

### 2. Limpiar Caché de Redis

Redis puede estar cacheando los datos antiguos:

```bash
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec redis redis-cli FLUSHALL
```

### 3. Reiniciar Frontend (si está corriendo)

```bash
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml restart frontend
```

### 4. Limpiar Caché del Navegador

**IMPORTANTE:** El navegador puede estar cacheando los datos antiguos. Debes:

1. **Abrir las herramientas de desarrollador** (F12)
2. **Ir a la pestaña "Application" o "Almacenamiento"**
3. **Limpiar:**
   - Cache Storage
   - Local Storage
   - Session Storage
4. **O hacer un hard refresh:**
   - **Chrome/Edge:** `Ctrl + Shift + R` (Windows/Linux) o `Cmd + Shift + R` (Mac)
   - **Firefox:** `Ctrl + F5` (Windows/Linux) o `Cmd + Shift + R` (Mac)
   - **Safari:** `Cmd + Option + R`

### 5. Verificar que los Cambios se Aplicaron

```bash
# Verificar en la base de datos
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec db psql -U postgres -d mykaizenfit -c "SELECT name FROM workouts_exercise WHERE name LIKE '%Máquina%' OR name LIKE '%Glúteo%' LIMIT 5;"

# Verificar que el backend responde
curl http://localhost:8000/api/health/
```

## 🔍 Verificación Rápida

Ejecuta este comando para verificar que no hay problemas de encoding:

```bash
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec db psql -U postgres -d mykaizenfit -c "SELECT COUNT(*) as total, COUNT(CASE WHEN name LIKE '%├%' OR description LIKE '%├%' OR name LIKE '%??%' OR description LIKE '%??%' THEN 1 END) as problemas FROM workouts_exercise;"
```

**Debería mostrar:** `problemas = 0`

## 🚨 Si Aún Ves Problemas

1. **Verifica que los servicios estén corriendo:**
   ```bash
   COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps
   ```

2. **Revisa los logs del backend:**
   ```bash
   COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs backend --tail=50
   ```

3. **Verifica directamente en la base de datos:**
   ```bash
   COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec db psql -U postgres -d mykaizenfit -c "SELECT name, LEFT(description, 50) FROM workouts_exercise WHERE name LIKE '%Máquina%' LIMIT 3;"
   ```

4. **Si los datos en la BD están correctos pero la app muestra mal:**
   - Limpia completamente la caché del navegador
   - Prueba en modo incógnito/privado
   - Verifica que el backend esté sirviendo los datos correctos

## 📝 Notas

- Los cambios en la base de datos son **permanentes** y ya están aplicados
- El problema suele ser **caché** (Redis o navegador)
- Reiniciar el backend es **esencial** para que cargue los nuevos datos
- Limpiar la caché del navegador es **crítico** para ver los cambios

