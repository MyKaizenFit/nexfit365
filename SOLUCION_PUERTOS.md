# Solución: Problema de Puertos Ocupados

## 🔍 Problema Identificado

**El error persistía porque había otros contenedores Docker usando los puertos 3000 y 8000:**

- `reposseparadosparaelhost-frontend-1` estaba usando el puerto **3000**
- `reposseparadosparaelhost-backend-1` estaba usando el puerto **8000**
- `nexfit-pro-frontend-1` no podía iniciarse porque el puerto 3000 estaba ocupado
- Por eso siempre se servía el chunk viejo desde el contenedor antiguo

## ✅ Solución Aplicada

1. **Detener contenedores antiguos:**
   ```bash
   docker stop reposseparadosparaelhost-frontend-1
   docker stop reposseparadosparaelhost-backend-1
   ```

2. **Iniciar contenedores nuevos:**
   ```bash
   cd /srv/mykaizenfit/pro
   COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d
   ```

## 📋 Verificación

Después de aplicar la solución:

1. **Verificar qué contenedor está usando el puerto 3000:**
   ```bash
   docker ps --format "table {{.Names}}\t{{.Ports}}" | grep 3000
   ```
   Debe mostrar: `nexfit-pro-frontend-1`

2. **Verificar que el chunk nuevo está disponible:**
   ```bash
   curl -I http://localhost:3000/_next/static/chunks/8836-fb971e7197f8ca4a.js
   ```
   Debe devolver: `HTTP/1.1 200 OK`

3. **Verificar que el chunk viejo NO está disponible:**
   ```bash
   curl -I http://localhost:3000/_next/static/chunks/8836-283b29e2201483ee.js
   ```
   Debe devolver: `HTTP/1.1 404 Not Found`

## ⚠️ Prevención Futura

Para evitar este problema en el futuro:

1. **Antes de iniciar contenedores, verificar puertos:**
   ```bash
   netstat -tlnp | grep -E ":(3000|8000)" || ss -tlnp | grep -E ":(3000|8000)"
   ```

2. **Detener contenedores de otros proyectos antes de iniciar:**
   ```bash
   docker ps | grep -v nexfit-pro | awk '{print $1}' | xargs docker stop
   ```

3. **Usar COMPOSE_PROJECT_NAME consistentemente:**
   ```bash
   export COMPOSE_PROJECT_NAME=nexfit-pro
   docker compose -f docker-compose.prod.yml up -d
   ```

## 🔄 Si el Problema Persiste

Si después de esto el navegador sigue cargando el chunk viejo:

1. **Purgar caché de Cloudflare** (si usas Cloudflare)
2. **Limpiar Service Worker del navegador:**
   ```javascript
   // En consola del navegador:
   navigator.serviceWorker.getRegistrations().then(r => r.forEach(reg => reg.unregister()))
   caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
   ```
3. **Hard refresh:** Ctrl+Shift+R (o Cmd+Shift+R en Mac)

