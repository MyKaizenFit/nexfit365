# 🔄 Instrucciones para Limpiar la Caché del Frontend

Después de corregir los caracteres especiales en la base de datos, es necesario limpiar la caché del frontend para que muestre los datos actualizados.

## Opción 1: Limpiar Caché del Navegador (Más Simple)

1. **Abre las herramientas de desarrollador** (F12)
2. **Ve a la pestaña "Application"** (o "Aplicación" en español)
3. **En el menú lateral, expande "Storage"** (o "Almacenamiento")
4. **Haz clic en "Clear site data"** (o "Limpiar datos del sitio")
5. **Marca todas las opciones**:
   - Cookies
   - Local Storage
   - Session Storage
   - Cache Storage
6. **Haz clic en "Clear site data"**
7. **Recarga la página** (Ctrl+F5 para forzar recarga sin caché)

## Opción 2: Limpiar Caché Manualmente desde la Consola

Abre la consola del navegador (F12) y ejecuta:

```javascript
// Limpiar localStorage
localStorage.clear()

// Limpiar sessionStorage
sessionStorage.clear()

// Limpiar caché del API (si está disponible)
if (window.apiCache) {
  window.apiCache.clear()
}

// Recargar la página
location.reload(true)
```

## Opción 3: Usar Modo Incógnito

1. Abre una ventana de incógnito (Ctrl+Shift+N)
2. Inicia sesión en la aplicación
3. Verifica que los nombres se muestren correctamente

## Opción 4: Forzar Recarga sin Caché

1. Presiona **Ctrl+Shift+R** (Windows/Linux) o **Cmd+Shift+R** (Mac)
2. Esto fuerza al navegador a recargar todos los recursos sin usar caché

## Verificación

Después de limpiar la caché, verifica que:

1. Los nombres de usuario se muestren correctamente (con acentos)
2. No aparezcan caracteres `??` en lugar de acentos
3. Los datos se carguen desde el servidor (revisa la pestaña Network en las herramientas de desarrollador)

## Si el Problema Persiste

Si después de limpiar la caché sigues viendo caracteres mal codificados:

1. **Verifica que el backend esté devolviendo datos correctos:**
   ```bash
   # Desde el contenedor del backend
   COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec backend python manage.py shell
   ```
   ```python
   from accounts.models import CustomUser
   user = CustomUser.objects.get(email='user@example.invalid')
   print(f"Nombre: {user.first_name} {user.last_name}")
   ```

2. **Verifica la respuesta del API:**
   - Abre las herramientas de desarrollador (F12)
   - Ve a la pestaña "Network"
   - Recarga la página
   - Busca la petición a `/api/me/` o `/api/accounts/profile/`
   - Verifica que la respuesta contenga los nombres correctos

3. **Verifica la codificación de la respuesta:**
   - En la pestaña Network, haz clic en la petición
   - Ve a la pestaña "Headers"
   - Verifica que `Content-Type` incluya `charset=utf-8`

## Prevención

Para evitar problemas futuros:

1. **Asegúrate de que todas las nuevas inserciones usen UTF-8**
2. **Verifica que el frontend siempre use UTF-8 al enviar datos**
3. **Configura el servidor web (nginx/apache) para usar UTF-8**





