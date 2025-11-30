# Cómo Preservar los Datos Existentes en DEV

## ⚠️ IMPORTANTE: Los Datos NO se Eliminarán

La configuración actual **PRESERVA** todos los datos existentes. Aquí te explico cómo funciona:

## Configuración Actual

El `docker-compose.prod.yml` ahora está configurado para usar:
- `/srv/mykaizenfit/pro/data/postgres` para la base de datos
- `/srv/mykaizenfit/pro/data/redis` para Redis
- `/srv/mykaizenfit/pro/data/staticfiles` para archivos estáticos
- `/srv/mykaizenfit/pro/data/media` para archivos de media

## ¿Qué Pasa con los Datos Existentes?

### Si tienes datos en volúmenes Docker:
1. **Los volúmenes Docker NO se eliminan automáticamente**
2. El script `migrar_datos_seguro.sh` copia los datos del volumen al directorio `/srv`
3. Si el directorio `/srv/mykaizenfit/pro/data/postgres` ya tiene datos, **NO se sobrescriben**

### Si ya tienes datos en `/srv/mykaizenfit/pro/data/postgres`:
1. **Los datos se mantienen intactos**
2. Docker usará esos datos directamente
3. No se toca nada

## Proceso Seguro

### Paso 1: Verificar datos existentes
```bash
# Ver si hay datos en el directorio
ls -la /srv/mykaizenfit/pro/data/postgres/

# Ver si hay volúmenes Docker
sudo docker volume ls | grep postgres_data_dev
```

### Paso 2: Migración segura (opcional)
Si tienes datos en volúmenes Docker y quieres migrarlos:
```bash
cd /srv/mykaizenfit/pro
sudo ./migrar_datos_seguro.sh
```

Este script:
- ✅ Verifica si hay datos existentes
- ✅ NO sobrescribe datos existentes
- ✅ Solo copia si el directorio está vacío
- ✅ Preserva los volúmenes Docker originales

### Paso 3: Reiniciar servicios
```bash
cd /srv/mykaizenfit/pro
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml down
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d
```

**Nota**: El comando `down` detiene los contenedores pero **NO elimina los volúmenes** a menos que uses `-v`. Como no usamos `-v`, los datos se preservan.

## Verificación Post-Migración

Después de reiniciar, verifica que los datos estén intactos:

```bash
# Verificar que la base de datos tiene datos
cd /srv/mykaizenfit/pro
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec db psql -U postgres -d mykaizenfit_dev -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

## Backup Adicional (Recomendado)

Antes de cualquier cambio, haz un backup:

```bash
cd /srv/mykaizenfit/pro
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec db pg_dump -U postgres mykaizenfit_dev > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Resumen

✅ **Los datos NO se eliminan**
✅ **Los volúmenes Docker se mantienen como backup**
✅ **La migración es segura y reversible**
✅ **Puedes verificar todo antes de continuar**

