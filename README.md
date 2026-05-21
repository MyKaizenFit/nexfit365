# 🏋️‍♂️ NexFit365 - Sistema Integral de Fitness y Nutrición

_Test commit automático: verificación de push y autor correcto (IagoPL)_

[![Next.js](https://img.shields.io/badge/Next.js-14.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Django](https://img.shields.io/badge/Django-4.2-green?style=for-the-badge&logo=django)](https://django.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker)](https://docker.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=for-the-badge&logo=postgresql)](https://postgresql.org/)

## 🚀 Descripción

NexFit365 es una aplicación web moderna para la gestión integral de fitness y nutrición. Esta copia corresponde al entorno de **desarrollo** separado de producción.

## ✨ Características Principales

### 🍽️ Nutrición
- Planes de alimentación personalizados
- Biblioteca de recetas con información nutricional
- Seguimiento de macros y calorías
- Dashboard nutricional interactivo

### 🏃‍♂️ Entrenamientos
- Programas de entrenamiento personalizables
- Biblioteca de ejercicios con videos
- Seguimiento de progreso y rendimiento
- Planes predeterminados y personalizados

### 📊 Progreso
- Métricas avanzadas y análisis
- Gráficos interactivos
- Historial completo de actividades
- Sistema de logros y gamificación

### 🔐 Autenticación
- JWT seguro con tokens de acceso y renovación
- Roles de usuario (admin, trainer, user)
- Panel de administración completo

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   PostgreSQL    │
│   Next.js 14    │◄──►│   Django 4.2    │◄──►│   + Redis       │
│   Port: 3001    │    │   Port: 8001    │    │   Port: 5434    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                      │                      │
         └──────────────────────┴──────────────────────┘
                        Docker Compose
```

## 📁 Estructura del Proyecto

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

## 🚀 Inicio Rápido con Docker

### Prerrequisitos
- Docker y Docker Compose
- Git

### 1. Entrar en el repositorio dev
```bash
cd /srv/mykaizenfit/dev
git checkout dev
```

### 2. Levantar los servicios
```bash
COMPOSE_PROJECT_NAME=mykaizenfit-dev docker compose -f docker-compose.dev.yml up -d
```

### 3. Acceder a la aplicación
- **Frontend dev**: http://localhost:3001
- **Backend API dev**: http://localhost:8001/api
- **Admin Django dev**: http://localhost:8001/admin
- **Postgres dev**: 127.0.0.1:5434

## 🔧 Comandos Útiles

### Docker
```bash
# Ver logs
COMPOSE_PROJECT_NAME=mykaizenfit-dev docker compose -f docker-compose.dev.yml logs -f

# Reiniciar un servicio
COMPOSE_PROJECT_NAME=mykaizenfit-dev docker compose -f docker-compose.dev.yml restart backend

# Ejecutar migraciones
COMPOSE_PROJECT_NAME=mykaizenfit-dev docker compose -f docker-compose.dev.yml exec backend python manage.py migrate

# Crear superusuario
COMPOSE_PROJECT_NAME=mykaizenfit-dev docker compose -f docker-compose.dev.yml exec backend python manage.py createsuperuser

# Acceder al shell de Django
COMPOSE_PROJECT_NAME=mykaizenfit-dev docker compose -f docker-compose.dev.yml exec backend python manage.py shell

# Ver estado de los contenedores
COMPOSE_PROJECT_NAME=mykaizenfit-dev docker compose -f docker-compose.dev.yml ps
```

### Base de datos
```bash
# Backup de la base de datos
COMPOSE_PROJECT_NAME=mykaizenfit-dev docker compose -f docker-compose.dev.yml exec db pg_dump -U postgres mykaizenfit_dev > backup-dev.sql

# Restaurar backup
COMPOSE_PROJECT_NAME=mykaizenfit-dev docker compose -f docker-compose.dev.yml exec -T db psql -U postgres mykaizenfit_dev < backup-dev.sql
```

## 🔄 Separación de Entornos

Desarrollo vive en `/srv/mykaizenfit/dev`, rama `dev`, con datos en `/srv/mykaizenfit/dev/data`.

Producción vive en `/srv/mykaizenfit/pro`, rama `main`, con datos en `/srv/mykaizenfit/pro/data`.

## 🛠️ Desarrollo Local (sin Docker)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

### Frontend
```bash
cd frontend
npm install  # o pnpm install
npm run dev
```

## 📊 Estado del Proyecto

### ✅ Completado
- [x] Sistema de autenticación JWT
- [x] API REST para nutrición y entrenamientos
- [x] Dashboard de usuario funcional
- [x] Sistema de recetas y ejercicios
- [x] Interfaz moderna y responsiva
- [x] Dockerización completa
- [x] Modelos de BD simplificados y unificados

### 🔄 En Desarrollo
- [ ] Tests automatizados
- [ ] CI/CD pipeline
- [ ] Optimizaciones de rendimiento

## 📚 Documentación Adicional

- **`docker-compose.dev.yml`**: stack Docker de desarrollo
