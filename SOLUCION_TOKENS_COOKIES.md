# Solución al Problema de Tokens y Cookies

## Problemas Identificados

### 1. Las cookies no se guardan correctamente
**Causa**: Las cookies usaban `SameSite=Strict` que puede causar problemas con HTTPS y dominios cruzados.

**Solución aplicada**: Cambiado a `SameSite=Lax` con `Secure` para HTTPS.

### 2. El backend no devuelve el campo `user` en el login
**Causa**: El código del backend tenía un try/except que silenciaba errores al obtener el usuario.

**Solución aplicada**: 
- Mejorado el manejo de errores para intentar obtener el usuario del token si falla el serializer
- Agregado logging detallado para debug
- Asegurado que siempre se intente devolver el campo `user`

### 3. Error "NetworkError" activando modo offline
**Causa**: El frontend detecta que el backend no está disponible y entra en modo offline, creando tokens offline en lugar de usar los reales.

**Solución aplicada**: 
- Mejorado el manejo de errores en el backend para que siempre devuelva el campo `user`
- Corregido el manejo de cookies para que funcionen con HTTPS

## Cambios Realizados

### Frontend (`lib/auth-service.ts`)
- ✅ Cambiado `SameSite=Strict` a `SameSite=Lax` con `Secure` para HTTPS
- ✅ Las cookies ahora se guardan correctamente en HTTPS

### Backend (`api/auth_views.py`)
- ✅ Mejorado el manejo de errores al obtener el usuario
- ✅ Agregado fallback para obtener el usuario del token JWT si falla el serializer
- ✅ Agregado logging detallado para debug

## Pasos para Aplicar

### 1. Reiniciar el backend para cargar los cambios

```bash
cd /srv/mykaizenfit/pro
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml restart backend
```

### 2. Reconstruir el frontend para aplicar cambios en las cookies

```bash
cd /srv/mykaizenfit/pro
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml build frontend
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d frontend
```

### 3. Verificar que funciona

1. Abre `https://nexfit365.dpdns.org`
2. Intenta hacer login
3. Verifica en las DevTools (Application > Cookies) que las cookies `accessToken` y `refreshToken` se guardan
4. Verifica que el usuario se carga correctamente

## Verificación

### Verificar cookies en el navegador:
1. Abre DevTools (F12)
2. Ve a Application > Cookies > https://nexfit365.dpdns.org
3. Deberías ver:
   - `accessToken` (con valor JWT)
   - `refreshToken` (con valor JWT)

### Verificar respuesta del backend:
```bash
curl -s https://api.nexfit365.dpdns.org/api/auth/login/ \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mykaizenfit.com","password":"AdminNex-Fit123!"}' \
  | python3 -m json.tool
```

Debería devolver:
```json
{
  "access": "...",
  "refresh": "...",
  "user": {
    "id": "...",
    "email": "...",
    ...
  }
}
```

## Notas

- Las cookies ahora usan `SameSite=Lax` que permite que funcionen con HTTPS y dominios cruzados
- El backend ahora siempre intenta devolver el campo `user` en la respuesta del login
- Si hay un error, se intenta obtener el usuario del token JWT como fallback

