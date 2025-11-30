# Levantar Aplicación de Desarrollo

## 🚀 Comando para Levantar

```bash
cd /srv/mykaizenfit/pro
COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml up -d
```

## 🌐 URLs de Acceso

Una vez levantados los servicios, accede a:

- **Frontend**: http://45.136.19.91:3001
- **Backend API**: http://45.136.19.91:8001/api
- **Admin Django**: http://45.136.19.91:8001/admin

## ✅ Verificar Estado

```bash
# Ver estado de contenedores
docker compose -f docker-compose.prod.yml ps

# Ver logs
docker compose -f docker-compose.prod.yml logs -f

# Ver logs de un servicio específico
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f backend
```

## 🔧 Configuración Aplicada

- **Puertos expuestos en todas las interfaces** (0.0.0.0) para acceso externo
- **Frontend configurado** para usar IP pública `45.136.19.91`
- **Backend configurado** con CORS y ALLOWED_HOSTS para la IP pública
- **Puertos separados** de producción para no interferir:
  - Frontend: 3001 (producción: 3000)
  - Backend: 8001 (producción: 8000)
  - DB: 5434 (producción: 5433)
  - Redis: 6380

## 🛑 Detener Servicios

```bash
docker compose -f docker-compose.prod.yml down
```

## 🔄 Reiniciar un Servicio

```bash
docker compose -f docker-compose.prod.yml restart frontend
docker compose -f docker-compose.prod.yml restart backend
```

