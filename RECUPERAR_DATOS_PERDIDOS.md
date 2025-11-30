# Recuperar Datos Perdidos de la Base de Datos

## ⚠️ ¿Qué Pasó?

Los datos se perdieron cuando cambiamos de **volúmenes Docker nombrados** a **bind mounts en /srv**:

1. **Antes**: Los datos estaban en un volumen Docker: `nexfit-pro_postgres_data_dev`
2. **Cambio**: Configuramos `docker-compose.prod.yml` para usar `/srv/mykaizenfit/pro/data/postgres`
3. **Problema**: Creamos un directorio **vacío** en `/srv/mykaizenfit/pro/data/postgres`
4. **Resultado**: Cuando reiniciamos, Postgres vio un directorio vacío y creó una **nueva base de datos vacía**, perdiendo los datos del volumen original

## 🔍 Verificar si los Datos Aún Existen

### Paso 1: Verificar si el volumen Docker original existe

```bash
sudo docker volume ls | grep postgres_data_dev
```

Si ves `nexfit-pro_postgres_data_dev`, **¡los datos todavía están ahí!**

### Paso 2: Verificar el contenido del volumen

```bash
# Ver dónde está montado el volumen
sudo docker volume inspect nexfit-pro_postgres_data_dev | grep Mountpoint

# Ver el contenido (reemplaza MOUNTPOINT con el valor anterior)
sudo ls -la /var/lib/docker/volumes/nexfit-pro_postgres_data_dev/_data/
```

## 🔄 Recuperar los Datos

### Opción 1: Si el volumen Docker todavía existe

```bash
cd /srv/mykaizenfit/pro

# 1. Detener los servicios
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml down

# 2. Hacer backup del directorio vacío actual (por si acaso)
sudo mv /srv/mykaizenfit/pro/data/postgres /srv/mykaizenfit/pro/data/postgres_empty_backup

# 3. Copiar datos del volumen Docker al directorio /srv
sudo docker run --rm \
  -v nexfit-pro_postgres_data_dev:/source:ro \
  -v /srv/mykaizenfit/pro/data:/target \
  alpine sh -c "cp -a /source/. /target/postgres/ && chown -R 999:999 /target/postgres"

# 4. Reiniciar servicios
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d
```

### Opción 2: Si tienes un backup de la base de datos

```bash
# Si tienes un backup SQL
cd /srv/mykaizenfit/pro
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit_dev < tu_backup.sql
```

## 🛡️ Cómo Evitar Perder Datos en el Futuro

### 1. **SIEMPRE hacer backup antes de cambios importantes**

```bash
# Backup de la base de datos antes de cambios
cd /srv/mykaizenfit/pro
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db pg_dump -U postgres mykaizenfit_dev > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. **Migrar datos ANTES de cambiar la configuración**

El orden correcto es:
1. ✅ Crear directorios en /srv
2. ✅ **MIGRAR datos del volumen al directorio** (usando el script)
3. ✅ **VERIFICAR que los datos están ahí**
4. ✅ Cambiar docker-compose.yml
5. ✅ Reiniciar servicios

### 3. **NUNCA usar `docker compose down -v`**

El flag `-v` elimina los volúmenes. **NUNCA** lo uses a menos que quieras eliminar datos:

```bash
# ❌ MAL - Elimina volúmenes y datos
docker compose down -v

# ✅ BIEN - Solo detiene contenedores, preserva volúmenes
docker compose down
```

### 4. **Verificar antes de reiniciar**

Antes de reiniciar después de cambiar volúmenes:

```bash
# Verificar que el directorio tiene datos
sudo ls -la /srv/mykaizenfit/pro/data/postgres/

# Deberías ver archivos como:
# - base/
# - global/
# - pg_wal/
# - etc.
```

### 5. **Usar el script de migración segura**

```bash
cd /srv/mykaizenfit/pro
sudo ./migrar_datos_seguro.sh
```

Este script:
- ✅ Verifica si hay datos existentes
- ✅ NO sobrescribe si ya hay datos
- ✅ Preserva los volúmenes originales

## 📋 Checklist para Cambios de Configuración

Antes de cambiar volúmenes o configuración de Docker:

- [ ] Hacer backup de la base de datos
- [ ] Verificar que el backup es válido
- [ ] Si cambias volúmenes, migrar datos ANTES
- [ ] Verificar que los datos están en el nuevo lugar
- [ ] Hacer cambios en docker-compose.yml
- [ ] Reiniciar servicios
- [ ] Verificar que todo funciona
- [ ] Mantener volúmenes Docker originales como backup por un tiempo

## 🔧 Script de Recuperación Automática

He creado `recuperar_datos_volumen.sh` que intenta recuperar automáticamente los datos del volumen Docker si existen.

