"""
Configuraciones de Escalabilidad para Django
Agregar a settings.py si es necesario
"""

# Connection Pooling
DATABASES = {
    'default': {
        'CONN_MAX_AGE': 600,  # Reutilizar conexiones 10min
        'OPTIONS': {
            'connect_timeout': 10,
            'options': '-c statement_timeout=30000'
        }
    }
}

# Cache desde redis_cache_config
# SESSION_ENGINE = 'django.contrib.sessions.backends.cache'

# Compresión GZip
MIDDLEWARE_GZIP = 'django.middleware.gzip.GZipMiddleware'

# Settings de seguridad
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
