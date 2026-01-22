#!/bin/bash

# Habilitar Escalabilidad del Sistema
# Redis caching, connection pooling, rate limiting

echo "🚀 HABILITANDO ESCALABILIDAD..."
echo ""

# 1. Crear archivo de configuración de Redis caching
echo "📦 Creando configuración de Redis caching..."
cat > /srv/mykaizenfit/pro/backend/redis_cache_config.py << 'REDIS'
"""
Redis Cache Configuration para Django
Mejora performance cacheando queries frecuentes
"""

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://redis:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
            'IGNORE_EXCEPTIONS': True,
        },
        'KEY_PREFIX': 'nexfit',
        'TIMEOUT': 300,  # 5 minutos por defecto
    },
    'sessions': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://redis:6379/2',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'sessions'
REDIS'

echo "✅ Redis cache config creado"
echo ""

# 2. Crear modelo de rate limiting
echo "🚦 Creando Rate Limiting..."
cat > /srv/mykaizenfit/pro/backend/rate_limiting.py << 'RATELIMIT'
"""
Rate Limiting usando Django-RateLimit
Previene abuso de API y DoS
"""

from django.core.cache import cache
from django.http import JsonResponse
from functools import wraps
from datetime import timedelta

def rate_limit(requests_per_minute=60):
    """
    Decorator para rate limiting basado en IP
    Default: 60 requests por minuto
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Obtener IP del cliente
            client_ip = get_client_ip(request)
            
            # Clave para cache
            cache_key = f'rl:{client_ip}:{request.path}'
            
            # Obtener contador
            request_count = cache.get(cache_key, 0)
            
            if request_count >= requests_per_minute:
                return JsonResponse({
                    'error': 'Rate limit exceeded',
                    'message': f'Máximo {requests_per_minute} requests por minuto'
                }, status=429)
            
            # Incrementar contador
            cache.set(cache_key, request_count + 1, 60)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

def get_client_ip(request):
    """Obtener IP del cliente (soporta proxies)"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip
RATELIMIT

echo "✅ Rate limiting creado"
echo ""

# 3. Crear archivo de optimización de Django
echo "⚙️  Creando optimizaciones de Django..."
cat > /srv/mykaizenfit/pro/backend/scalability_settings.py << 'SETTINGS'
"""
Configuraciones de Escalabilidad para Django
Agregar a settings.py
"""

# Database Connection Pooling
DATABASES = {
    'default': {
        # ... configuración existente ...
        'CONN_MAX_AGE': 600,  # Reutilizar conexiones por 10 min
        'OPTIONS': {
            'connect_timeout': 10,
            'options': '-c statement_timeout=30000'  # 30 segundos timeout
        }
    }
}

# Cache Configuration
from .redis_cache_config import CACHES, SESSION_ENGINE, SESSION_CACHE_ALIAS

# Compresión de respuestas
MIDDLEWARE = [
    'django.middleware.gzip.GZipMiddleware',  # Comprimir respuestas
    # ... otros middleware ...
]

# Caché de templates
TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'OPTIONS': {
        'loaders': [
            ('django.template.loaders.cached.Loader', [
                'django.template.loaders.filesystem.Loader',
                'django.template.loaders.app_directories.Loader',
            ]),
        ],
    },
}]

# Índices de base de datos útiles (ejecutar con script)
OPTIMIZED_INDEXES = [
    'idx_customuser_email',
    'idx_mealplan_user_date',
    'idx_recipe_created',
]

# Settings de seguridad + performance
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# CDN Configuration (si usas)
STATIC_URL = '/static/'
MEDIA_URL = '/media/'
SETTINGS

echo "✅ Configuraciones creadas"
echo ""

# 4. Crear script de monitoreo de performance
echo "📊 Creando monitor de performance..."
cat > /srv/mykaizenfit/pro/scripts/monitor-performance.sh << 'MONITOR'
#!/bin/bash

# Monitoreo de Performance del Sistema

COMPOSE_FILE="/srv/mykaizenfit/pro/docker-compose.prod.yml"
PROJECT="nexfit-pro"
LOG_FILE="/srv/mykaizenfit/pro/backups/performance.log"

echo "[$(date)] ========== REPORTE DE PERFORMANCE ==========" >> "$LOG_FILE"

# 1. Redis stats
echo "[$(date)] Redis Stats:" >> "$LOG_FILE"
COMPOSE_PROJECT_NAME=$PROJECT docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli INFO stats >> "$LOG_FILE" 2>&1 || echo "Redis no disponible" >> "$LOG_FILE"

# 2. DB Connections
echo "[$(date)] DB Connections:" >> "$LOG_FILE"
COMPOSE_PROJECT_NAME=$PROJECT docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;" >> "$LOG_FILE" 2>&1

# 3. Tabla de query performance
echo "[$(date)] Queries más lentas:" >> "$LOG_FILE"
COMPOSE_PROJECT_NAME=$PROJECT docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -d mykaizenfit -c "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;" >> "$LOG_FILE" 2>&1

# 4. CPU y Memoria
echo "[$(date)] System Resources:" >> "$LOG_FILE"
df -h >> "$LOG_FILE"
free -h >> "$LOG_FILE"

echo "[$(date)] ========== FIN REPORTE ==========" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
MONITOR

chmod +x /srv/mykaizenfit/pro/scripts/monitor-performance.sh
echo "✅ Monitor de performance creado"
echo ""

# 5. Guardar en logs
echo "[$(date)] ✅ ESCALABILIDAD HABILITADA" >> /srv/mykaizenfit/pro/backups/scalability.log
echo "[$(date)] Componentes instalados:" >> /srv/mykaizenfit/pro/backups/scalability.log
echo "  - Redis caching" >> /srv/mykaizenfit/pro/backups/scalability.log
echo "  - Rate limiting" >> /srv/mykaizenfit/pro/backups/scalability.log
echo "  - Connection pooling" >> /srv/mykaizenfit/pro/backups/scalability.log
echo "  - Response compression (gzip)" >> /srv/mykaizenfit/pro/backups/scalability.log
echo "  - Performance monitoring" >> /srv/mykaizenfit/pro/backups/scalability.log

echo "✅ Archivos de escalabilidad creados en /backend"
