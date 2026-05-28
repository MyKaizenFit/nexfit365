# NexFit365 - Sistema Integral de Fitness y Nutrición

[![Next.js](https://img.shields.io/badge/Next.js-14.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Django](https://img.shields.io/badge/Django-4.2-green?style=for-the-badge&logo=django)](https://django.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker)](https://docker.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=for-the-badge&logo=postgresql)](https://postgresql.org/)

## 🚀 Descripción

NexFit365 es una aplicación web moderna para la gestión integral de fitness y nutrición. Esta copia corresponde al entorno de **desarrollo** separado de producción.

## ✨ Características Principales

### Nutrición
- Planes de alimentación personalizados
- Biblioteca de recetas con información nutricional
- Seguimiento de macros y calorías
- Dashboard nutricional interactivo
- **Sistema de equivalencias multi-categoría**: cada alimento puede pertenecer a varias categorías de intercambio; las recomendaciones de sustitución buscan en todas ellas
- Categorías de equivalencia personalizables por el administrador (crear, editar, eliminar)

### Entrenamientos
- Programas de entrenamiento personalizables
- Biblioteca de ejercicios con videos
- Seguimiento de progreso y rendimiento
- Planes predeterminados y personalizados

### Progreso
- Métricas avanzadas y análisis
- Gráficos interactivos
- Historial completo de actividades
- Sistema de logros y gamificación

### Autenticación
- JWT seguro con tokens de acceso y renovación
- Roles de usuario (admin, trainer, user)
- Panel de administración completo

## Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   PostgreSQL    │
│   Next.js 14    │◄──►│   Django 4.2    │◄──►│   + Redis       │
│   Port: 3000    │    │   Port: 8000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                      │                      │
         └──────────────────────┴──────────────────────┘
                        Docker Compose (producción)
```

## Estructura del Proyecto

```
nexfit365/
├── frontend/                   # Aplicación Next.js
│   ├── app/                   # App Router
│   ├── components/            # Componentes React
│   ├── hooks/                 # Hooks personalizados
│   ├── lib/                   # Servicios y utilidades
│   └── docker.env.example     # Variables de entorno
│
├── backend/                    # API Django
│   ├── accounts/              # Gestión de usuarios
│   ├── nutrition/             # Nutrición y recetas
│   ├── workouts/              # Entrenamientos y ejercicios
│   ├── progress/              # Seguimiento de progreso
│   ├── achievements/          # Sistema de logros
│   ├── notifications/         # Notificaciones
│   ├── dashboard/             # Panel de admin
│   └── docker/                # Configuración Docker
│       └── backend.env.example
│
├── doc/                        # Documentación
│
├── docker-compose.dev.yml      # Configuración para desarrollo separado
└── .gitignore
```

## Inicio Rápido con Docker

### Prerrequisitos
- Docker y Docker Compose
- Git

### 1. Clonar y entrar en producción
```bash
cd /srv/mykaizenfit/pro
git checkout main
```

### 2. Levantar los servicios
```bash
docker compose -f docker-compose.prod.yml up -d
```

### 3. Acceder a la aplicación
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api
- **Backend API**: http://localhost:8000/api
- **Admin Django**: http://localhost:8000/admin
- **Postgres**: 127.0.0.1:5432

## Comandos Útiles

### Docker
```bash
# Ver logs
docker compose -f docker-compose.prod.yml logs -f

# Reiniciar un servicio
docker compose -f docker-compose.prod.yml restart backend

# Ejecutar migraciones
docker exec pro-backend-1 python manage.py migrate

# Crear superusuario
docker exec -it pro-backend-1 python manage.py createsuperuser

# Acceder al shell de Django
docker exec -it pro-backend-1 python manage.py shell

# Ver estado de los contenedores
docker compose -f docker-compose.prod.yml ps
```

### Base de datos
```bash
# Backup de la base de datos
docker exec pro-db-1 pg_dump -U postgres mykaizenfit > backup-prod.sql

# Restaurar backup
docker exec -i pro-db-1 psql -U postgres mykaizenfit < backup-prod.sql
```

## Entornos

Producción vive en `/srv/mykaizenfit/pro`, rama `main`, con datos en `/srv/mykaizenfit/pro/data`.

Desarrollo vive en `/srv/mykaizenfit/dev`, rama `dev`, con datos en `/srv/mykaizenfit/dev/data`.

## Desarrollo Local (sin Docker)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Estado del Proyecto

### Completado
- [x] Sistema de autenticación JWT
- [x] API REST para nutrición y entrenamientos
- [x] Dashboard de usuario funcional
- [x] Sistema de recetas y ejercicios
- [x] Interfaz moderna y responsiva
- [x] Dockerización completa
- [x] Sistema de equivalencias multi-categoría con CRUD de categorías personalizadas
- [x] Navegación móvil con auto-ocultado al hacer scroll
- [x] Categoría `panes` separada de `arroz_cereales`

### En Desarrollo
- [ ] Tests automatizados
- [ ] CI/CD pipeline
- [ ] Optimizaciones de rendimiento

## Documentación Adicional

- **`docker-compose.prod.yml`**: stack Docker de producción
- **`docker-compose.dev.yml`**: stack Docker de desarrollo
- **`scripts/deployment/`**: utilidades operativas de despliegue y mantenimiento
