# 🔧 Optimizaciones de Build para Reducir Consumo de Recursos

Este documento explica las optimizaciones aplicadas para limitar el consumo de recursos durante el build del frontend y evitar que el servidor se cuelgue.

## 📋 Cambios Aplicados

### 1. Límites de Recursos en docker-compose.prod.yml

Se agregaron límites de recursos al servicio frontend:

```yaml
deploy:
  resources:
    limits:
      cpus: '1.5'      # Máximo 1.5 CPUs
      memory: 2G       # Máximo 2GB RAM
    reservations:
      cpus: '0.25'     # Mínimo 0.25 CPU garantizado
      memory: 256M     # Mínimo 256MB RAM garantizado
```

**Efecto:** Docker limita el uso de CPU y memoria durante el build y runtime.

### 2. Reducción de Memoria de Node.js

En `frontend/Dockerfile`:
- **Antes:** `NODE_OPTIONS="--max-old-space-size=1536"` (1.5GB)
- **Ahora:** `NODE_OPTIONS="--max-old-space-size=1024"` (1GB)

**Efecto:** Node.js usa menos memoria durante el build, reduciendo el riesgo de colgar el servidor.

### 3. Limitación de Workers de Next.js

Se agregó `ENV NEXT_BUILD_WORKERS=1` en el Dockerfile.

**Efecto:** Next.js usa solo 1 worker durante el build, reduciendo significativamente el uso de CPU y memoria.

### 4. Memoria Compartida Limitada

Se agregó `shm_size: '256m'` en docker-compose.

**Efecto:** Limita la memoria compartida (/dev/shm) durante el build.

## 🚀 Cómo Usar

### Opción 1: Build Normal (con límites automáticos)

Los límites se aplican automáticamente cuando haces build normal:

```bash
COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml build frontend
```

### Opción 2: Script Optimizado (Recomendado)

Usa el script optimizado que aplica límites adicionales:

```bash
./scripts/deployment/build-frontend-low-resource.sh
```

Este script:
- Verifica recursos disponibles
- Limpia builds anteriores
- Aplica límites explícitos durante el build
- Reinicia el servicio automáticamente
- Verifica que todo funcione

### Opción 3: Build Manual con Límites Explícitos

Si necesitas más control:

```bash
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

COMPOSE_PROJECT_NAME=reposseparadosparaelhost \
  docker compose -f docker-compose.prod.yml build \
  --build-arg NODE_ENV=production \
  --memory=2g \
  --cpuset-cpus="0-1" \
  frontend
```

## 📊 Recursos Utilizados

### Antes de las Optimizaciones:
- **Memoria:** Sin límite (podía usar toda la RAM disponible)
- **CPU:** Sin límite (podía usar todos los cores)
- **Workers Next.js:** Automático (múltiples workers)
- **Riesgo:** Alto (servidor se colgaba frecuentemente)

### Después de las Optimizaciones:
- **Memoria:** Máximo 2GB (limitado por docker-compose)
- **Node.js:** Máximo 1GB (limitado por NODE_OPTIONS)
- **CPU:** Máximo 1.5 cores
- **Workers Next.js:** 1 worker (limitado)
- **Riesgo:** Bajo (recursos controlados)

## ⚙️ Ajustar Límites (si es necesario)

Si tu servidor tiene más o menos recursos, puedes ajustar los límites:

### En `docker-compose.prod.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'      # Aumentar si tienes más CPUs
      memory: 3G       # Aumentar si tienes más RAM
```

### En `frontend/Dockerfile`:

```dockerfile
# Aumentar si tienes más RAM disponible
ENV NODE_OPTIONS="--max-old-space-size=1536"  # 1.5GB
```

### En el script de build:

```bash
# Ajustar según tus CPUs disponibles
--cpuset-cpus="0-2"  # Usar CPUs 0, 1 y 2
--memory=3g          # Aumentar memoria permitida
```

## 🔍 Monitoreo Durante el Build

Puedes monitorear el uso de recursos durante el build:

```bash
# En otra terminal, mientras se hace el build:
watch -n 1 'docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"'
```

## ⚠️ Notas Importantes

1. **Tiempo de Build:** El build puede tardar más tiempo debido a los límites, pero es más seguro.

2. **Si el Build Falla por Memoria:**
   - Aumenta `--max-old-space-size` a 1280 o 1536
   - Aumenta `memory: 2G` a `3G` en docker-compose

3. **Si el Build es Muy Lento:**
   - Puedes aumentar `cpus: '1.5'` a `'2.0'` si tienes más CPUs disponibles
   - Pero mantén los límites para evitar colgar el servidor

4. **Build en Servidor Separado:**
   - Si el servidor es muy limitado, considera hacer el build en otra máquina
   - Exporta la imagen: `docker save reposseparadosparaelhost-frontend > frontend.tar`
   - Importa en producción: `docker load < frontend.tar`

## 📝 Verificación

Después del build, verifica que todo funcione:

```bash
# Verificar que el contenedor está corriendo
COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml ps frontend

# Verificar que responde
curl -I http://localhost:3000/

# Ver logs si hay problemas
COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml logs frontend --tail=50
```

## 🆘 Solución de Problemas

### Build falla por memoria:
```bash
# Aumentar memoria en docker-compose.prod.yml
memory: 3G  # en lugar de 2G
```

### Build muy lento:
```bash
# Aumentar CPUs disponibles
cpus: '2.0'  # en lugar de 1.5
```

### Servidor se cuelga igual:
```bash
# Reducir aún más los límites
memory: 1.5G
cpus: '1.0'
NODE_OPTIONS="--max-old-space-size=768"  # 768MB
```

