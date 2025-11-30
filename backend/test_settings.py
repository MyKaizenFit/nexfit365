"""
Configuración de pruebas para Django
"""
from backend.settings import *
from datetime import timedelta

# Usar base de datos en memoria para pruebas
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Deshabilitar cache para pruebas
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
    }
}

# Configuración de email para pruebas
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

# Configuración de archivos estáticos para pruebas
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'

# Configuración de logging para pruebas
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
}

# Configuración de CORS para pruebas
CORS_ALLOW_ALL_ORIGINS = True

# Configuración de JWT para pruebas
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=5),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': False,
}

# Configuración de DRF para pruebas
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'TEST_REQUEST_DEFAULT_FORMAT': 'json',
}

# Configuración de archivos de media para pruebas
MEDIA_ROOT = BASE_DIR / 'test_media'

# Configuración de sentry para pruebas (deshabilitado)
SENTRY_DSN = None
