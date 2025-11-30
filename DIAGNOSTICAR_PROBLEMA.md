# Diagnosticar Problema - Producción y Desarrollo

## 🔍 Verificar Estado de Producción (Puerto 3000)

### 1. Verificar contenedores de producción

```bash
cd /srv/mykaizenfit
# O si tienes el proyecto de producción en otra ruta, ve ahí
docker compose ps
```

### 2. Verificar si los servicios de producción están corriendo

```bash
# Ver todos los contenedores de Docker
docker ps

# Ver contenedores específicos de producción
docker ps | grep -E "(3000|8000)"
```

### 3. Verificar logs de producción

```bash
cd /srv/mykaizenfit
docker compose logs frontend --tail=50
docker compose logs backend --tail=50
```

---

## 🔍 Verificar Estado de Desarrollo (Puerto 3001)

### 1. Verificar contenedores de desarrollo

```bash
cd /srv/mykaizenfit/pro
COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml ps
```

### 2. Verificar logs de desarrollo

```bash
cd /srv/mykaizenfit/pro
docker compose -f docker-compose.prod.yml logs frontend --tail=50
docker compose -f docker-compose.prod.yml logs backend --tail=50
```

---

## 🚨 Soluciones Rápidas

### Si Producción (3000) No Está Funcionando:

```bash
cd /srv/mykaizenfit
# Verificar estado
docker compose ps

# Si están parados, levantarlos
docker compose up -d

# Si hay errores, ver logs
docker compose logs -f
```

### Si Desarrollo (3001) No Está Funcionando:

```bash
cd /srv/mykaizenfit/pro
# Verificar estado
docker compose -f docker-compose.prod.yml ps

# Si están parados, levantarlos
COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml up -d

# Si hay errores, ver logs
docker compose -f docker-compose.prod.yml logs -f
```

---

## 🔧 Verificar Puertos

```bash
# Ver qué está usando los puertos 3000 y 3001
netstat -tuln | grep -E ':(3000|3001|8000|8001)'
# O
ss -tuln | grep -E ':(3000|3001|8000|8001)'

# Ver procesos usando los puertos
sudo lsof -i :3000
sudo lsof -i :3001
sudo lsof -i :8000
sudo lsof -i :8001
```

---

## 🐛 Problemas Comunes

### 1. Los contenedores están parados

**Solución**: Levantarlos de nuevo
```bash
# Producción
cd /srv/mykaizenfit && docker compose up -d

# Desarrollo
cd /srv/mykaizenfit/pro && docker compose -f docker-compose.prod.yml up -d
```

### 2. Conflicto de puertos

**Solución**: Verificar qué está usando el puerto y detenerlo si es necesario

### 3. Errores en los logs

**Solución**: Revisar los logs específicos del servicio que falla

---

## 📝 Información para Reportar

Si necesitas ayuda, proporciona:

1. **Salida de este comando**:
   ```bash
   docker ps -a
   ```

2. **Salida de este comando**:
   ```bash
   docker compose ps
   cd /srv/mykaizenfit/pro && docker compose -f docker-compose.prod.yml ps
   ```

3. **Últimas líneas de logs**:
   ```bash
   docker compose logs --tail=100
   cd /srv/mykaizenfit/pro && docker compose -f docker-compose.prod.yml logs --tail=100
   ```

