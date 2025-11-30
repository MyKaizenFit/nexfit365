# 🏋️‍♂️ NexFit365 - Sistema Integral de Fitness y Nutrición

[![Next.js](https://img.shields.io/badge/Next.js-14.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Django](https://img.shields.io/badge/Django-4.2-green?style=for-the-badge&logo=django)](https://django.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker)](https://docker.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=for-the-badge&logo=postgresql)](https://postgresql.org/)

## 🚀 Descripción

NexFit365 es una aplicación web moderna para la gestión integral de fitness y nutrición. Combina un frontend Next.js con un backend Django, desplegada con Docker Compose para una experiencia de desarrollo y producción simplificada.

## ✨ Características Principales

### 🎯 **Nutrición**
- Plan de comidas personalizado con recetas
- Seguimiento de macros (proteínas, carbohidratos, grasas, calorías)
- Dashboard nutricional con métricas en tiempo real
- Catálogo de recetas con instrucciones detalladas

### 🏃‍♂️ **Entrenamientos**
- Programas de entrenamiento personalizables
- Biblioteca de ejercicios con videos
- Seguimiento de rutinas y progreso
- Planes por defecto y personalizados

### 📊 **Progreso**
- Métricas avanzadas de rendimiento
- Gráficos interactivos de evolución
- Sistema de logros y rachas
- Historial completo de actividades

### 🔐 **Autenticación**
- JWT seguro con tokens de acceso y renovación
- Roles de usuario (admin, trainer, user)
- Panel de administración completo

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Base de       │
│   Next.js 14    │◄──►│   Django 4.2    │◄──►│   Datos         │
│   TypeScript    │    │   Python 3.11   │    │   PostgreSQL 15 │
│   Tailwind CSS  │    │   DRF + JWT     │    │                 │
└────────┬────────┘    └────────┬────────┘    └─────────────────┘
         │                      │                      ▲
         │                      │                      │
         └──────────────────────┴──────────────────────┘
                           Docker Compose
```

### **Stack Tecnológico**

| Componente | Tecnología |
|------------|------------|
| Frontend | Next.js 14, TypeScript 5, Tailwind CSS, Shadcn/ui |
| Backend | Django 4.2, Django REST Framework, Simple JWT |
| Base de Datos | PostgreSQL 15 |
| Cache | Redis 7 |
| Containerización | Docker & Docker Compose |
| Servidor Web | Gunicorn (backend), Node.js (frontend) |

## 🚀 Inicio Rápido

### **Prerrequisitos**
- Docker y Docker Compose
- Git

### **1. Clonar el Repositorio**
```bash
git clone https://github.com/MyKaizenFit/nexfit365.git
cd nexfit365
```

### **2. Configurar Variables de Entorno**

Crear los archivos de configuración:

```bash
# Backend
cp backend/docker/backend.env.example backend/docker/backend.env

# Frontend  
cp frontend/docker.env.example frontend/docker.env
```

Editar con tus valores (especialmente `SECRET_KEY`, `POSTGRES_PASSWORD`, etc.)

### **3. Levantar con Docker Compose**

**Desarrollo:**
```bash
docker compose -f docker-compose.dev.yml up --build
```

**Producción:**
```bash
docker compose -f docker-compose.prod.yml up --build -d
```

### **4. Acceder a la Aplicación**

| Entorno | Frontend | Backend API | Admin Django |
|---------|----------|-------------|--------------|
| Dev | http://localhost:3001 | http://localhost:8001 | http://localhost:8001/admin |
| Prod | http://localhost:3000 | http://localhost:8000 | http://localhost:8000/admin |

## 📁 Estructura del Proyecto

```
nexfit365/
├── frontend/                 # Aplicación Next.js
│   ├── app/                 # App Router (páginas)
│   ├── components/          # Componentes React
│   ├── hooks/              # Hooks personalizados
│   ├── lib/                # Servicios y utilidades
│   ├── contexts/           # Contextos de React
│   ├── docker.env          # Variables de entorno
│   └── Dockerfile          # Imagen Docker
│
├── backend/                 # API Django
│   ├── accounts/           # Gestión de usuarios
│   ├── workouts/           # Entrenamientos y ejercicios
│   ├── nutrition/          # Nutrición, recetas y planes
│   ├── progress/           # Seguimiento de progreso
│   ├── achievements/       # Sistema de logros
│   ├── notifications/      # Notificaciones
│   ├── dashboard/          # Panel de administración
│   ├── api/                # Configuración API
│   ├── docker/             # Configuración Docker
│   │   └── backend.env     # Variables de entorno
│   └── Dockerfile          # Imagen Docker
│
├── doc/                     # Documentación
│   ├── backend/            # Docs del backend
│   ├── frontend/           # Docs del frontend
│   └── api/                # Especificaciones API
│
├── docker-compose.dev.yml   # Compose para desarrollo
├── docker-compose.prod.yml  # Compose para producción
└── .gitignore
```

## 🔧 Comandos Útiles

### **Docker**
```bash
# Ver logs
docker compose -f docker-compose.prod.yml logs -f

# Ver logs de un servicio específico
docker compose -f docker-compose.prod.yml logs -f backend

# Ejecutar comando en el backend
docker compose -f docker-compose.prod.yml exec backend python manage.py <comando>

# Crear superusuario
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# Aplicar migraciones
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Parar servicios
docker compose -f docker-compose.prod.yml down

# Parar y eliminar volúmenes (⚠️ borra datos)
docker compose -f docker-compose.prod.yml down -v
```

### **Base de Datos**
```bash
# Acceder a PostgreSQL
docker compose -f docker-compose.prod.yml exec db psql -U postgres -d mykaizenfit

# Backup de la base de datos
docker compose -f docker-compose.prod.yml exec db pg_dump -U postgres mykaizenfit > backup.sql

# Restaurar backup
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit
```

## 📊 Modelos de Datos

### **Usuarios** (`accounts`)
- `CustomUser` - Usuario con roles (admin, trainer, user)

### **Entrenamientos** (`workouts`)
- `Exercise` - Catálogo de ejercicios
- `WorkoutProgram` - Programas de entrenamiento
- `WorkoutDay` - Días de entrenamiento
- `WorkoutDayExercise` - Ejercicios asignados a cada día

### **Nutrición** (`nutrition`)
- `Recipe` - Recetas con ingredientes y macros
- `NutritionPlan` - Planes de nutrición
- `Meal` - Comidas del día
- `PlanMeal` - Relación plan-comida
- `MealLog` - Registro de comidas consumidas

## 🔐 Autenticación

La API usa JWT (JSON Web Tokens):

```bash
# Login
POST /api/auth/login/
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña"
}

# Respuesta
{
  "access": "eyJ...",
  "refresh": "eyJ..."
}

# Usar token
Authorization: Bearer eyJ...
```

## 📝 Variables de Entorno

### **Backend** (`backend/docker/backend.env`)
```bash
DEBUG=False
SECRET_KEY=tu-clave-secreta-muy-larga
POSTGRES_DB=mykaizenfit
POSTGRES_USER=postgres
POSTGRES_PASSWORD=tu-password-seguro
POSTGRES_HOST=db
ALLOWED_HOSTS=localhost,127.0.0.1,tu-dominio.com
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://tu-dominio.com
```

### **Frontend** (`frontend/docker.env`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_APP_NAME=NexFit365
NODE_ENV=production
```

## 🚀 Despliegue en Producción

1. **Configurar dominio** en Nginx/Apache
2. **SSL/TLS** con Let's Encrypt
3. **Variables de entorno** con valores de producción
4. **Levantar servicios**: `docker compose -f docker-compose.prod.yml up -d`

## 🧪 Testing

```bash
# Backend
docker compose exec backend python manage.py test

# Frontend
docker compose exec frontend npm run test
```

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
