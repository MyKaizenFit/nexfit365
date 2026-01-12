# 🛡️ Sistema de Monitoreo y Alta Disponibilidad - Nex-Fit PRO

## 📋 Resumen

Este sistema garantiza que tu aplicación Nex-Fit PRO se mantenga funcionando 24/7 con:

- ✅ **Servicio systemd** - Inicia automáticamente al arrancar el servidor
- ✅ **Monitoreo automático** - Verifica servicios cada 5 minutos
- ✅ **Auto-recuperación** - Reinicia servicios caídos automáticamente
- ✅ **Timeouts optimizados** - Evita errores 504 Gateway Timeout
- ✅ **Recursos limitados** - Previene consumo excesivo de CPU/RAM

---

## 🚀 Instalación Rápida

### Paso 1: Ejecutar el script de instalación

```bash
cd /srv/mykaizenfit/pro
sudo ./scripts/install-monitoring.sh
```

Este script automáticamente:
1. Instala el servicio systemd
2. Configura el monitoreo automático (crontab)
3. Habilita inicio automático al arrancar el servidor
4. Configura archivos de logs

### Paso 2: Aplicar cambios a los contenedores

```bash
cd /srv/mykaizenfit/pro
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml down
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d --build
```

---

## 🔧 Configuración Manual (si prefieres no usar el script)

### 1. Instalar Servicio Systemd

```bash
sudo cp /srv/mykaizenfit/pro/nexfit-pro.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable nexfit-pro.service
sudo systemctl start nexfit-pro.service
```

### 2. Configurar Monitoreo Automático

Crear crontab:

```bash
sudo nano /etc/cron.d/nexfit-pro-monitoring
```

Contenido:

```cron
# Monitoreo Nex-Fit PRO
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Verificar servicios cada 5 minutos
*/5 * * * * root /srv/mykaizenfit/pro/scripts/check-services.sh >> /var/log/nexfit-check.log 2>&1
```

### 3. Crear archivo de logs

```bash
sudo touch /var/log/nexfit-check.log
sudo chmod 644 /var/log/nexfit-check.log
```

---

## 📊 Comandos Útiles

### Gestión del Servicio Systemd

```bash
# Ver estado
sudo systemctl status nexfit-pro

# Iniciar
sudo systemctl start nexfit-pro

# Detener
sudo systemctl stop nexfit-pro

# Reiniciar
sudo systemctl restart nexfit-pro

# Ver logs del servicio
sudo journalctl -u nexfit-pro -f

# Ver logs recientes
sudo journalctl -u nexfit-pro --since today
```

### Monitoreo y Logs

```bash
# Ver logs de monitoreo en tiempo real
tail -f /var/log/nexfit-check.log

# Verificación rápida de servicios
/srv/mykaizenfit/pro/scripts/quick-check.sh

# Ejecutar monitoreo manualmente
/srv/mykaizenfit/pro/scripts/check-services.sh

# Ver últimas 100 líneas de logs
tail -100 /var/log/nexfit-check.log
```

### Docker Compose (Gestión Manual)

```bash
cd /srv/mykaizenfit/pro

# Ver estado de contenedores
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps

# Ver logs de un servicio
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs -f backend

# Reiniciar un servicio específico
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml restart backend

# Rebuild y reiniciar todo
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d --build
```

---

## 🔍 Cambios Aplicados

### 1. **Timeouts en Nginx** ✅

**Archivo**: `backend/nginx.conf`

- API endpoints: **30s → 60s**
- Admin interface: **sin timeout → 60s**
- Default location: **sin timeout → 60s**

Esto previene errores 504 Gateway Timeout en queries complejas.

### 2. **Optimización de Gunicorn** ✅

**Archivo**: `docker-compose.prod.yml`

- Workers: **4 → 6**
- Threads: **2 → 3**
- Worker class: `gthread` (threads por worker)
- Max requests: `1000` (recicla workers automáticamente)
- Max requests jitter: `100` (previene reciclaje simultáneo)

### 3. **Límites de Recursos** ✅

**Backend**:
- CPU: 0.5 - 2.0 cores
- RAM: 512MB - 2GB

**PostgreSQL**:
- CPU: 0.25 - 1.5 cores
- RAM: 256MB - 1.5GB

**Redis**:
- CPU: 0.1 - 0.5 cores
- RAM: 128MB - 512MB
- Maxmemory: 512MB con política LRU

**Frontend**:
- CPU: 0.25 - 1.5 cores (ya configurado)
- RAM: 256MB - 2GB (ya configurado)

### 4. **Políticas de Reinicio** ✅

Todos los servicios tienen `restart: unless-stopped`:
- Se reinician automáticamente si fallan
- Se inician automáticamente al arrancar el servidor
- NO se reinician si se detienen manualmente

---

## 🎯 Beneficios

### Antes:
- ❌ Servicios se caían sin reiniciarse
- ❌ Error 504 en queries lentas
- ❌ Sin monitoreo automático
- ❌ Consumo de recursos sin límite

### Después:
- ✅ Servicios siempre disponibles 24/7
- ✅ Timeouts optimizados (sin errores 504)
- ✅ Monitoreo cada 5 minutos con auto-recuperación
- ✅ Recursos controlados y optimizados
- ✅ Logs centralizados en `/var/log/nexfit-check.log`

---

## 🆘 Troubleshooting

### El servicio systemd no arranca

```bash
# Ver logs detallados
sudo journalctl -u nexfit-pro -xe

# Verificar sintaxis del servicio
sudo systemd-analyze verify /etc/systemd/system/nexfit-pro.service

# Recargar y reintentar
sudo systemctl daemon-reload
sudo systemctl start nexfit-pro
```

### Los contenedores no se inician

```bash
# Ver logs de Docker
cd /srv/mykaizenfit/pro
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs

# Verificar variables de entorno
cat /srv/mykaizenfit/pro/docker/backend.env.production
```

### El monitoreo no funciona

```bash
# Verificar crontab
sudo cat /etc/cron.d/nexfit-pro-monitoring

# Ver logs de cron
sudo grep CRON /var/log/syslog | grep nexfit

# Ejecutar script manualmente para ver errores
sudo /srv/mykaizenfit/pro/scripts/check-services.sh
```

### Alto uso de CPU/RAM

```bash
# Ver uso actual
docker stats

# Ajustar límites en docker-compose.prod.yml
# Reducir workers de Gunicorn si es necesario
```

---

## 📝 Mantenimiento

### Logs

Los logs se acumulan en `/var/log/nexfit-check.log`. Para limpiarlos:

```bash
# Ver tamaño actual
ls -lh /var/log/nexfit-check.log

# Limpiar logs antiguos (mantener últimos 1000 líneas)
sudo tail -1000 /var/log/nexfit-check.log > /tmp/nexfit-check-temp.log
sudo mv /tmp/nexfit-check-temp.log /var/log/nexfit-check.log

# O simplemente vaciar
sudo truncate -s 0 /var/log/nexfit-check.log
```

### Backups

El servicio `db-backup` ya hace backups automáticos diarios a las 3 AM.

Ubicación: `/srv/mykaizenfit/pro/data/backups/`

---

## 🎉 ¡Todo Listo!

Tu aplicación ahora está configurada para funcionar 24/7 con:
- Inicio automático al arrancar el servidor
- Monitoreo continuo cada 5 minutos
- Auto-recuperación ante fallos
- Recursos optimizados
- Logs centralizados

**¡Ya no tendrás que preocuparte por que la aplicación se caiga!** 🚀
