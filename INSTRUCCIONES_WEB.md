# 🌐 Instrucciones para Arrancar la Web

## Problema: La web no responde en http://45.136.19.91:3001

## Solución Rápida

### Opción 1: Verificar el estado primero (Recomendado)

```bash
cd /srv/mykaizenfit/pro
./verificar_web.sh
```

Este script te mostrará:
- Estado de los contenedores
- Últimos logs del frontend y backend
- Si los puertos están escuchando
- Si hay problemas de conectividad

### Opción 2: Reiniciar todo directamente

```bash
cd /srv/mykaizenfit/pro
./reiniciar_web.sh
```

Este script:
- Detiene y elimina los contenedores
- Reinicia la base de datos y Redis
- Inicia el backend
- Inicia el frontend
- Muestra el estado final

## Pasos Manuales (si los scripts no funcionan)

### 1. Ver el estado actual

```bash
cd /srv/mykaizenfit/pro
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps
```

### 2. Ver los logs del frontend

```bash
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs frontend --tail=50
```

### 3. Ver los logs del backend

```bash
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs backend --tail=50
```

### 4. Reiniciar los servicios

```bash
# Detener todo
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml stop

# Eliminar contenedores
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml rm -f

# Iniciar todo de nuevo
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d --build
```

## Verificar que los puertos estén escuchando

```bash
# Verificar puerto 3001 (frontend)
sudo netstat -tlnp | grep 3001

# Verificar puerto 8001 (backend)
sudo netstat -tlnp | grep 8001
```

Deberías ver algo como:
```
tcp6       0      0 :::3001                 :::*                    LISTEN      12345/docker-proxy
tcp6       0      0 :::8001                 :::*                    LISTEN      12346/docker-proxy
```

## Problemas Comunes

### 1. El frontend no inicia porque el backend no está saludable

El frontend espera a que el backend esté saludable. Si el backend falla, el frontend no iniciará.

**Solución:**
```bash
# Primero arregla el backend
./solucionar_backend.sh

# Luego inicia el frontend
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d frontend
```

### 2. Los puertos no están escuchando

Si `netstat` no muestra los puertos, los contenedores no están corriendo o hay un problema con Docker.

**Solución:**
```bash
# Verificar que los contenedores estén corriendo
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps

# Si no están corriendo, iniciarlos
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d
```

### 3. Firewall bloqueando los puertos

Si los puertos están escuchando localmente pero no desde fuera, el firewall puede estar bloqueando.

**Solución para UFW:**
```bash
sudo ufw allow 3001/tcp
sudo ufw allow 8001/tcp
sudo ufw reload
```

**Solución para firewalld:**
```bash
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --permanent --add-port=8001/tcp
sudo firewall-cmd --reload
```

### 4. El frontend tarda mucho en iniciar

Next.js puede tardar varios minutos en compilar. Si ves en los logs que está compilando, espera.

**Ver logs en tiempo real:**
```bash
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs -f frontend
```

## URLs de Acceso

- **Frontend**: http://45.136.19.91:3001
- **Backend API**: http://45.136.19.91:8001
- **Health Check**: http://45.136.19.91:8001/api/health/

## Comandos Útiles

```bash
# Ver logs en tiempo real del frontend
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs -f frontend

# Ver logs en tiempo real del backend
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs -f backend

# Reiniciar solo el frontend
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml restart frontend

# Reiniciar solo el backend
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml restart backend

# Ver estado de todos los servicios
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps
```

