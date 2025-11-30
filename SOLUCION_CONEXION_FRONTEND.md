# Solución: Frontend no se conecta al Backend

## Problema Identificado

El backend funciona correctamente en `http://45.136.19.91:8000/api/`, pero el frontend no se está conectando.

## Causas Posibles

1. **El frontend está usando el archivo de desarrollo** (`docker.env`) en lugar del de producción (`docker.env.production`)
2. **El frontend necesita reconstruirse** para tomar las nuevas variables de entorno
3. **Problema con CORS** - aunque está configurado correctamente

## Solución

### Paso 1: Verificar qué archivo está usando el frontend

El `docker-compose.prod.yml` debería usar `docker.env.production`:

```yaml
frontend:
  env_file:
    - ./frontend/docker.env.production  # ✅ Correcto
```

### Paso 2: Verificar la URL en el archivo de producción

El archivo `frontend/docker.env.production` debe tener:

```env
NEXT_PUBLIC_API_URL=http://45.136.19.91:8000/api
```

✅ **Ya está configurado correctamente**

### Paso 3: Reconstruir el frontend

Las variables de entorno de Next.js (`NEXT_PUBLIC_*`) se inyectan en tiempo de **build**, no en tiempo de ejecución. Por lo tanto, necesitas reconstruir el contenedor:

```bash
cd /srv/mykaizenfit/app

# Opción 1: Reconstruir solo el frontend
docker compose -f docker-compose.prod.yml build frontend

# Opción 2: Reconstruir y reiniciar
docker compose -f docker-compose.prod.yml up -d --build frontend

# Opción 3: Reconstruir todo (si es necesario)
docker compose -f docker-compose.prod.yml up -d --build
```

### Paso 4: Verificar que las variables se cargaron

Después de reconstruir, verifica que el frontend tiene la variable correcta:

```bash
# Ver las variables de entorno del contenedor
docker compose -f docker-compose.prod.yml exec frontend env | grep NEXT_PUBLIC_API_URL
```

Debería mostrar: `NEXT_PUBLIC_API_URL=http://45.136.19.91:8000/api`

### Paso 5: Verificar CORS en el backend

El backend ya tiene CORS configurado para `http://45.136.19.91:3000` en `docker/backend.env.production`:

```env
CORS_ALLOWED_ORIGINS=http://45.136.19.91:3000,http://localhost:3000
```

✅ **Está correcto**

### Paso 6: Verificar logs del frontend

Si sigue sin funcionar, revisa los logs:

```bash
docker compose -f docker-compose.prod.yml logs frontend
```

Busca errores relacionados con:
- `NEXT_PUBLIC_API_URL`
- CORS
- Conexión al backend

## Problema Adicional en el Código

Hay un problema en `frontend/lib/api.ts` en la función `getApiBaseUrl()`:

```typescript
// Líneas 10-14 - Esto puede causar problemas
if (typeof window !== 'undefined') {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8000'  // ⚠️ Esto fuerza localhost incluso en producción
  }
}
```

**Solución**: Esta lógica debería respetar la variable de entorno primero. Pero como estás en producción con IP, no debería afectar.

## Verificación Rápida

1. **Backend funciona**: ✅ `http://45.136.19.91:8000/api/` funciona
2. **Frontend URL configurada**: ✅ `NEXT_PUBLIC_API_URL=http://45.136.19.91:8000/api`
3. **CORS configurado**: ✅ `http://45.136.19.91:3000` está permitido
4. **Frontend reconstruido**: ⚠️ **NECESITA HACERSE**

## Comandos para Ejecutar

```bash
# 1. Detener el frontend actual
docker compose -f docker-compose.prod.yml stop frontend

# 2. Reconstruir el frontend con las nuevas variables
docker compose -f docker-compose.prod.yml build --no-cache frontend

# 3. Iniciar el frontend
docker compose -f docker-compose.prod.yml up -d frontend

# 4. Verificar logs
docker compose -f docker-compose.prod.yml logs -f frontend
```

## Verificar en el Navegador

Después de reconstruir, abre la consola del navegador (F12) y verifica:

1. **Variable de entorno**: 
   ```javascript
   console.log(process.env.NEXT_PUBLIC_API_URL)
   ```
   Debería mostrar: `http://45.136.19.91:8000/api`

2. **URLs de las peticiones**: 
   Las peticiones deberían ir a `http://45.136.19.91:8000/api/...`

3. **Errores de CORS**: 
   Si ves errores de CORS, verifica que el backend tenga el origen correcto.

## Si Aún No Funciona

1. **Verificar que el frontend esté usando el archivo correcto**:
   ```bash
   cat frontend/docker.env.production | grep NEXT_PUBLIC_API_URL
   ```

2. **Verificar que el contenedor tenga la variable**:
   ```bash
   docker compose -f docker-compose.prod.yml exec frontend printenv | grep NEXT_PUBLIC
   ```

3. **Revisar la configuración de Next.js**:
   - Las variables `NEXT_PUBLIC_*` deben estar disponibles en el cliente
   - Se inyectan en tiempo de build
   - Si cambias el archivo `.env`, necesitas reconstruir

## Nota Importante

**Next.js inyecta las variables `NEXT_PUBLIC_*` en tiempo de BUILD, no en tiempo de ejecución.**

Esto significa que:
- Si cambias `docker.env.production` después de construir, **NO se aplicará**
- **DEBES reconstruir** el contenedor para que tome las nuevas variables
- Usa `--no-cache` si quieres asegurarte de que se reconstruye completamente

