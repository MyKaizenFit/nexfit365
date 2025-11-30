# 🚀 Despliegue en Producción - Nex-Fit

## 📋 Resumen

Esta guía cubre el despliegue completo de Nex-Fit en producción, incluyendo configuración de servidores, CI/CD, monitoreo y mantenimiento.

## 🏗️ Arquitectura de Producción

### **Stack de Producción**
- **Frontend**: Vercel (Next.js)
- **Backend**: Render (Django)
- **Base de Datos**: Neon PostgreSQL
- **CDN**: Vercel Edge Network
- **Monitoreo**: Sentry + Vercel Analytics
- **CI/CD**: GitHub Actions

### **Diagrama de Arquitectura**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Base de       │
│   Vercel        │◄──►│   Render        │◄──►│   Datos Neon    │
│   Next.js 14    │    │   Django 4.2    │    │   PostgreSQL    │
│   TypeScript    │    │   Python 3.11   │    │   Production    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CDN Edge      │    │   Load Balancer │    │   Backup        │
│   Vercel        │    │   Render        │    │   Neon          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## ⚙️ Configuración de Servicios

### **1. Configuración de Vercel (Frontend)**

#### **vercel.json**
```json
{
  "version": 2,
  "name": "mykaizenfit",
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "frontend/$1"
    }
  ],
  "env": {
    "NEXT_PUBLIC_API_URL": "@api_url",
    "NEXT_PUBLIC_APP_NAME": "Nex-Fit",
    "NEXT_PUBLIC_SENTRY_DSN": "@sentry_dsn"
  },
  "functions": {
    "frontend/pages/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

#### **Variables de Entorno en Vercel**
```bash
# Configurar en Vercel Dashboard
NEXT_PUBLIC_API_URL=https://mykaizenfit-backend.onrender.com/api
NEXT_PUBLIC_APP_NAME=Nex-Fit
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://mykaizenfit.vercel.app
```

### **2. Configuración de Render (Backend)**

#### **render.yaml**
```yaml
# render.yaml
services:
  - type: web
    name: mykaizenfit-backend
    env: python
    plan: starter
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn backend.wsgi:application
    envVars:
      - key: DEBUG
        value: False
      - key: SECRET_KEY
        fromSecret: secret_key
      - key: DATABASE_URL
        fromSecret: database_url
      - key: ALLOWED_HOSTS
        value: mykaizenfit-backend.onrender.com,mykaizenfit.vercel.app
      - key: CORS_ALLOWED_ORIGINS
        value: https://mykaizenfit.vercel.app
      - key: SENTRY_DSN
        fromSecret: sentry_dsn
    healthCheckPath: /health/
    autoDeploy: true
    branch: main
```

#### **Dockerfile para Render**
```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1

# Start server
CMD ["gunicorn", "backend.wsgi:application", "--bind", "0.0.0.0:8000"]
```

### **3. Configuración de Neon (Base de Datos)**

#### **Variables de Entorno**
```bash
# Configurar en Neon Dashboard
DB_NAME=mykaizenfit_prod
DB_USER=mykaizenfit_user
DB_PASSWORD=your-secure-password
DB_HOST=ep-xxx-xxx.us-east-1.aws.neon.tech
DB_PORT=5432
DB_SSLMODE=require
```

#### **Configuración de Django para Producción**
```python
# backend/settings.py
import os
import dj_database_url

# Base de datos de producción
DATABASES = {
    'default': dj_database_url.parse(
        os.getenv('DATABASE_URL'),
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# Configuración de seguridad
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# CORS
CORS_ALLOWED_ORIGINS = [
    "https://mykaizenfit.vercel.app",
    "https://www.mykaizenfit.vercel.app",
]

# Archivos estáticos
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Cache
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.getenv('REDIS_URL', 'redis://localhost:6379/1'),
    }
}

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'logs/django.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
}
```

## 🔄 CI/CD Pipeline

### **1. GitHub Actions (.github/workflows/deploy.yml)**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: Install Backend Dependencies
      run: |
        cd backend
        python -m pip install --upgrade pip
        pip install -r requirements.txt
    
    - name: Install Frontend Dependencies
      run: |
        cd frontend
        npm ci
    
    - name: Run Backend Tests
      run: |
        cd backend
        python manage.py test --settings=test_settings
    
    - name: Run Frontend Tests
      run: |
        cd frontend
        npm test -- --coverage --watchAll=false
    
    - name: Run E2E Tests
      run: |
        cd frontend
        npm run test:e2e
    
    - name: Build Frontend
      run: |
        cd frontend
        npm run build
    
    - name: Upload Coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        files: ./backend/coverage.xml,./frontend/coverage/lcov.info
        flags: production
        name: production-coverage

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Render
      uses: johnbeynon/render-deploy-action@v0.0.8
      with:
        service-id: ${{ secrets.RENDER_SERVICE_ID }}
        api-key: ${{ secrets.RENDER_API_KEY }}

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        working-directory: ./frontend
```

### **2. Configuración de Secrets en GitHub**
```bash
# Configurar en GitHub Secrets
RENDER_SERVICE_ID=your-render-service-id
RENDER_API_KEY=your-render-api-key
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-vercel-org-id
VERCEL_PROJECT_ID=your-vercel-project-id
```

## 📊 Monitoreo y Logging

### **1. Configuración de Sentry**
```python
# backend/sentry.py
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.celery import CeleryIntegration

sentry_sdk.init(
    dsn=os.getenv('SENTRY_DSN'),
    integrations=[
        DjangoIntegration(auto_enabling_instrumentations=True),
        RedisIntegration(),
        CeleryIntegration(),
    ],
    traces_sample_rate=0.1,
    send_default_pii=True,
    environment=os.getenv('ENVIRONMENT', 'production'),
)
```

### **2. Configuración de Vercel Analytics**
```typescript
// frontend/lib/analytics.ts
import { Analytics } from '@vercel/analytics/react'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Analytics />
    </>
  )
}
```

### **3. Health Checks**
```python
# backend/health/views.py
from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache
import redis

def health_check(request):
    """Health check endpoint"""
    health_status = {
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
        'services': {}
    }
    
    # Check database
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        health_status['services']['database'] = 'healthy'
    except Exception as e:
        health_status['services']['database'] = f'unhealthy: {str(e)}'
        health_status['status'] = 'unhealthy'
    
    # Check cache
    try:
        cache.set('health_check', 'ok', 10)
        cache.get('health_check')
        health_status['services']['cache'] = 'healthy'
    except Exception as e:
        health_status['services']['cache'] = f'unhealthy: {str(e)}'
        health_status['status'] = 'unhealthy'
    
    return JsonResponse(health_status)
```

## 🔒 Seguridad en Producción

### **1. Configuración de Seguridad**
```python
# backend/settings.py
# Configuración de seguridad
SECRET_KEY = os.getenv('SECRET_KEY')
DEBUG = False
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '').split(',')

# HTTPS
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Headers de seguridad
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Cookies seguras
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True

# Rate limiting
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        'login': '10/hour',
        'register': '5/hour',
    }
}
```

### **2. Configuración de CORS**
```python
# backend/settings.py
CORS_ALLOWED_ORIGINS = [
    "https://mykaizenfit.vercel.app",
    "https://www.mykaizenfit.vercel.app",
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False
```

## 📈 Optimización de Performance

### **1. Configuración de CDN**
```typescript
// frontend/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['mykaizenfit-backend.onrender.com'],
    formats: ['image/webp', 'image/avif'],
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  httpAgentOptions: {
    keepAlive: true,
  },
}

module.exports = nextConfig
```

### **2. Configuración de Cache**
```python
# backend/settings.py
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.getenv('REDIS_URL'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'mykaizenfit',
        'TIMEOUT': 300,
    }
}

# Cache de sesiones
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
```

## 🔧 Mantenimiento y Actualizaciones

### **1. Scripts de Mantenimiento**
```bash
# scripts/maintenance.sh
#!/bin/bash

# Backup de base de datos
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Limpieza de logs antiguos
find logs/ -name "*.log" -mtime +30 -delete

# Limpieza de archivos temporales
find /tmp -name "mykaizenfit_*" -mtime +7 -delete

# Verificación de salud
curl -f https://mykaizenfit-backend.onrender.com/health/ || exit 1
```

### **2. Monitoreo de Performance**
```python
# backend/middleware.py
import time
import logging
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)

class PerformanceMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request.start_time = time.time()
    
    def process_response(self, request, response):
        if hasattr(request, 'start_time'):
            duration = time.time() - request.start_time
            if duration > 1.0:  # Log requests slower than 1 second
                logger.warning(f"Slow request: {request.path} took {duration:.2f}s")
        return response
```

## 📋 Checklist de Despliegue

### **Pre-Despliegue**
- [ ] Tests unitarios pasando
- [ ] Tests de integración pasando
- [ ] Tests E2E pasando
- [ ] Cobertura de código > 80%
- [ ] Variables de entorno configuradas
- [ ] Secrets configurados
- [ ] Base de datos migrada
- [ ] Archivos estáticos recolectados

### **Despliegue**
- [ ] Backend desplegado en Render
- [ ] Frontend desplegado en Vercel
- [ ] Base de datos conectada
- [ ] Health checks funcionando
- [ ] CORS configurado correctamente
- [ ] SSL/HTTPS funcionando
- [ ] Monitoreo configurado

### **Post-Despliegue**
- [ ] Smoke tests ejecutados
- [ ] Performance verificada
- [ ] Logs monitoreados
- [ ] Alertas configuradas
- [ ] Backup programado
- [ ] Documentación actualizada

## 🚨 Troubleshooting

### **Problemas Comunes**

#### **Error 500 en Backend**
```bash
# Verificar logs
curl https://mykaizenfit-backend.onrender.com/health/

# Verificar base de datos
python manage.py dbshell

# Verificar migraciones
python manage.py showmigrations
```

#### **Error de CORS**
```python
# Verificar configuración
CORS_ALLOWED_ORIGINS = [
    "https://mykaizenfit.vercel.app",
]
```

#### **Error de Base de Datos**
```bash
# Verificar conexión
python manage.py check --database default

# Aplicar migraciones
python manage.py migrate
```

## 📞 Soporte y Contacto

### **Enlaces de Producción**
- **Frontend**: https://mykaizenfit.vercel.app
- **Backend**: https://mykaizenfit-backend.onrender.com
- **API Docs**: https://mykaizenfit-backend.onrender.com/api/docs/
- **Admin**: https://mykaizenfit-backend.onrender.com/admin/

### **Monitoreo**
- **Sentry**: https://sentry.io/organizations/mykaizenfit/
- **Vercel Analytics**: https://vercel.com/analytics
- **Render Dashboard**: https://dashboard.render.com/

---

*Documentación de Despliegue en Producción v1.0 - Nex-Fit*  
*Última actualización: Diciembre 2024*
