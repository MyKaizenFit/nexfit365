# Solución al Error JSON.parse en Login/Register

## Problema

Error: `JSON.parse: unexpected character at line 1 column 1 of the JSON data`

**Causa**: Django está devolviendo una página HTML de error (`DisallowedHost`) en lugar de JSON porque el dominio `api.nexfit365.dpdns.org` no estaba en `ALLOWED_HOSTS`.

## Solución Aplicada

### 1. Actualizado `ALLOWED_HOSTS` en `/srv/mykaizenfit/pro/docker/backend.env`:
```
ALLOWED_HOSTS=localhost,127.0.0.1,192.168.1.148,backend,45.136.19.91,api.nexfit365.dpdns.org,nexfit365.dpdns.org,www.nexfit365.dpdns.org
```

### 2. Actualizado `CORS_ALLOWED_ORIGINS` y `CSRF_TRUSTED_ORIGINS`:
```
CORS_ALLOWED_ORIGINS=...,https://nexfit365.dpdns.org,https://www.nexfit365.dpdns.org
CSRF_TRUSTED_ORIGINS=...,https://nexfit365.dpdns.org,https://www.nexfit365.dpdns.org
```

### 3. También actualizado en `backend.env.production` para producción

## Pasos para Aplicar la Solución

### 1. Reiniciar el backend para cargar las nuevas variables de entorno:

```bash
cd /srv/mykaizenfit/pro
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml restart backend
```

### 2. Verificar que funciona:

```bash
# Probar desde el servidor
curl -X POST http://127.0.0.1:8001/api/auth/register/ \
  -H "Content-Type: application/json" \
  -H "Host: api.nexfit365.dpdns.org" \
  -d '{"email":"test@test.com","password":"test123456","password_confirm":"test123456","first_name":"Test","last_name":"User"}'
```

Debería devolver JSON, no HTML.

### 3. Verificar desde el navegador:

- Abre `https://nexfit365.dpdns.org`
- Intenta hacer login o registrar un usuario
- Ya no debería aparecer el error de JSON.parse

## Verificación

Si el error persiste después de reiniciar:

1. **Verificar que el backend está usando el archivo correcto**:
   ```bash
   cd /srv/mykaizenfit/pro
   sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec backend env | grep ALLOWED_HOSTS
   ```

2. **Ver logs del backend**:
   ```bash
   sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs backend | tail -50
   ```

3. **Verificar que nginx está pasando el Host correcto**:
   - La configuración de nginx ya está correcta con `proxy_set_header Host $host;`

## Notas

- Los cambios se aplicaron tanto en `backend.env` (desarrollo) como en `backend.env.production` (producción)
- Después de reiniciar el backend, los cambios deberían aplicarse inmediatamente
- Si usas producción (`app`), también necesitarás actualizar `/srv/mykaizenfit/app/docker/backend.env.production`

