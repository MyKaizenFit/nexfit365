# 🏋️‍♂️ NexFit365 - Sistema Integral de Fitness y Nutrición

[![Next.js](https://img.shields.io/badge/Next.js-14.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Django](https://img.shields.io/badge/Django-4.2-green?style=for-the-badge&logo=django)](https://django.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker)](https://docker.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=for-the-badge&logo=postgresql)](https://postgresql.org/)

## 🚀 Descripción

NexFit365 es una aplicación web moderna para la gestión integral de fitness y nutrición. Combina un frontend Next.js con un backend Django en un **mono-repo** unificado, diseñado para facilitar el desarrollo y despliegue.

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
│   Port: 3000    │    │   Port: 8000    │    │   Port: 5432    │
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
├── docker-compose.prod.yml     # Configuración para producción
├── docker-compose.dev.yml      # Configuración para desarrollo
└── .gitignore
```

## 🚀 Inicio Rápido con Docker

### Prerrequisitos
- Docker y Docker Compose
- Git

### 1. Clonar el repositorio
```bash
git clone https://github.com/MyKaizenFit/nexfit365.git
cd nexfit365
```

### 2. Configurar variables de entorno
```bash
# Backend
cp backend/docker/backend.env.example backend/docker/backend.env
# Editar backend/docker/backend.env con tus valores

# Frontend
cp frontend/docker.env.example frontend/docker.env
# Editar frontend/docker.env con tus valores
```

### 3. Levantar los servicios

**Producción:**
```bash
POSTGRES_PASSWORD='tu_password' \
REDIS_PASSWORD='tu_password_redis' \
docker compose -f docker-compose.prod.yml up -d
```

**Desarrollo:**
```bash
docker compose -f docker-compose.dev.yml up -d
```

### 4. Acceder a la aplicación
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api
- **Admin Django**: http://localhost:8000/admin

## 🔧 Comandos Útiles

### Docker
```bash
# Ver logs
docker compose -f docker-compose.prod.yml logs -f

# Reiniciar un servicio
docker compose -f docker-compose.prod.yml restart backend

# Ejecutar migraciones
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Crear superusuario
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# Acceder al shell de Django
docker compose -f docker-compose.prod.yml exec backend python manage.py shell

# Ver estado de los contenedores
docker compose -f docker-compose.prod.yml ps
```

### Base de datos
```bash
# Backup de la base de datos
docker compose -f docker-compose.prod.yml exec db pg_dump -U postgres mykaizenfit > backup.sql

# Restaurar backup
docker compose -f docker-compose.prod.yml exec -T db psql -U postgres mykaizenfit < backup.sql
```

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

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'feat: nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT.

---

**Desarrollado con ❤️ por el equipo de NexFit365**

*Última actualización: Noviembre 2025*
