# Comandos para Reconstruir el Frontend

## Opción 1: Usar el Script Automático (Recomendado)

He creado un script que hace todo automáticamente:

```bash
cd /srv/mykaizenfit/app
./reconstruir_frontend.sh
```

Este script:
1. ✅ Verifica la configuración
2. ✅ Detiene el frontend actual
3. ✅ Reconstruye el frontend sin caché
4. ✅ Inicia el frontend
5. ✅ Muestra los logs

## Opción 2: Comandos Manuales

Si prefieres ejecutar los comandos manualmente:

```bash
cd /srv/mykaizenfit/app

# 1. Detener el frontend
docker compose -f docker-compose.prod.yml stop frontend

# 2. Reconstruir sin caché (importante: --no-cache asegura que toma las nuevas variables)
docker compose -f docker-compose.prod.yml build --no-cache frontend

# 3. Iniciar el frontend
docker compose -f docker-compose.prod.yml up -d frontend

# 4. Ver los logs para verificar que está funcionando
docker compose -f docker-compose.prod.yml logs -f frontend
```

## Verificar que Funcionó

### 1. Verificar que el contenedor está corriendo:
```bash
docker compose -f docker-compose.prod.yml ps frontend
```

### 2. Verificar que la variable de entorno se cargó:
```bash
docker compose -f docker-compose.prod.yml exec frontend printenv | grep NEXT_PUBLIC_API_URL
```

Debería mostrar: `NEXT_PUBLIC_API_URL=http://45.136.19.91:8000/api`

### 3. Verificar en el navegador:
1. Abre `http://45.136.19.91:3000`
2. Abre la consola del navegador (F12)
3. Ejecuta:
   ```javascript
   console.log(process.env.NEXT_PUBLIC_API_URL)
   ```
4. Debería mostrar: `http://45.136.19.91:8000/api`

### 4. Verificar que las peticiones van al backend correcto:
En la consola del navegador, en la pestaña "Network", las peticiones deberían ir a:
- `http://45.136.19.91:8000/api/...`

## Si Hay Problemas

### Ver logs detallados:
```bash
docker compose -f docker-compose.prod.yml logs frontend
```

### Reiniciar el frontend:
```bash
docker compose -f docker-compose.prod.yml restart frontend
```

### Verificar el archivo de configuración:
```bash
cat frontend/docker.env.production | grep NEXT_PUBLIC_API_URL
```

Debería mostrar: `NEXT_PUBLIC_API_URL=http://45.136.19.91:8000/api`

## Tiempo Estimado

- **Reconstrucción**: 3-10 minutos (depende de la velocidad de descarga de dependencias)
- **Inicio**: 10-30 segundos

## Nota Importante

⚠️ **Las variables `NEXT_PUBLIC_*` se inyectan en tiempo de BUILD**

Esto significa que:
- Si cambias `docker.env.production` después de construir, **NO se aplicará**
- **DEBES reconstruir** el contenedor para que tome las nuevas variables
- Usa `--no-cache` para asegurarte de que se reconstruye completamente

