# 🏋️‍♂️ Nex-Fit - Sistema Integral de Fitness y Nutrición

[![Next.js](https://img.shields.io/badge/Next.js-14.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Django](https://img.shields.io/badge/Django-4.2-green?style=for-the-badge&logo=django)](https://django.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

## 🚀 Descripción del Proyecto

Nex-Fit es una aplicación web moderna y completa para la gestión integral de fitness y nutrición. Combina un frontend Next.js con un backend Django para ofrecer una experiencia de usuario excepcional con funcionalidades avanzadas de seguimiento, planificación y análisis.

## ✨ Características Principales

### 🎯 **Gestión de Comidas y Nutrición**
- **Plan de Comidas Personalizado**: Selección inteligente de opciones nutricionales
- **Seguimiento de Macros**: Monitoreo detallado de proteínas, carbohidratos, grasas y calorías
- **Dashboard Nutricional**: Visualización moderna con gráficos y métricas en tiempo real
- **Persistencia de Datos**: Sincronización entre frontend y backend con localStorage como backup

### 🏃‍♂️ **Seguimiento de Progreso**
- **Métricas Avanzadas**: Análisis detallado del progreso físico
- **Gráficos Interactivos**: Visualizaciones dinámicas del rendimiento
- **Historial Completo**: Registro de todas las actividades y logros

### 🔐 **Sistema de Autenticación**
- **JWT Seguro**: Autenticación robusta con tokens de acceso y renovación
- **Gestión de Usuarios**: Roles y permisos granulares
- **Panel de Administración**: Control completo del sistema

### 🎨 **Interfaz Moderna**
- **Diseño Responsivo**: Optimizado para todos los dispositivos
- **UI/UX Avanzada**: Componentes Shadcn/ui con Tailwind CSS
- **Animaciones Suaves**: Transiciones y efectos visuales modernos
- **Tema Consistente**: Paleta de colores y estilos unificados

## 🏗️ Arquitectura del Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Base de       │
│   Next.js 14    │◄──►│   Django 4.2    │◄──►│   Datos SQLite  │
│   TypeScript    │    │   Python 3.11+  │    │   PostgreSQL    │
│   Tailwind CSS  │    │   DRF           │    │   (Producción)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Frontend (Next.js 14)**
- **Framework**: Next.js con App Router
- **Lenguaje**: TypeScript 5.0
- **Estilos**: Tailwind CSS 3.3
- **Componentes**: Shadcn/ui + componentes personalizados
- **Estado**: React Context + Hooks personalizados
- **Rutas**: Sistema de rutas dinámicas y protegidas

### **Backend (Django 4.2)**
- **Framework**: Django 4.2 LTS
- **API**: Django REST Framework (DRF)
- **Autenticación**: JWT con Simple JWT
- **Base de Datos**: SQLite (desarrollo) / PostgreSQL (producción)
- **Validación**: Serializers personalizados con validación UUID
- **Seguridad**: CORS configurado, autenticación por tokens

## 🚀 Inicio Rápido

### **Prerrequisitos**
- Node.js 18+ y npm/pnpm
- Python 3.11+
- Git

### **1. Clonar el Repositorio**
```bash
git clone <repository-url>
cd nex-fit
```

### **2. Configurar Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py create_default_meals
python manage.py runserver 8000
```

### **3. Configurar Frontend**
```bash
cd frontend
npm install
# o
pnpm install
npm run dev
```

### **4. Acceder a la Aplicación**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Admin Django**: http://localhost:8000/admin

### **5. Ejecutar Todo con Docker**
```bash
# Desde la raíz del proyecto
docker compose up --build
```

- Configura las variables necesarias en `docker/backend.env` y `frontend/docker.env` antes de levantar los servicios.
- Los contenedores disponibles son: `frontend` (Next.js), `backend` (Django + Gunicorn), `db` (PostgreSQL 15) y `redis` (Redis 7).
- El comando anterior ejecuta las migraciones y `collectstatic` automáticamente durante el arranque del backend.
- Para detener los servicios: `docker compose down`.
- Para recrear desde cero: `docker compose down -v && docker compose up --build`.

## 📁 Estructura del Proyecto

```
nex-fit/
├── frontend/                 # Aplicación Next.js
│   ├── app/                 # App Router de Next.js
│   ├── components/          # Componentes React reutilizables
│   ├── hooks/              # Hooks personalizados
│   ├── lib/                # Servicios y utilidades
│   ├── contexts/           # Contextos de React
│   ├── styles/             # Estilos globales y configuración
│   └── README.md           # → Ver doc/frontend/README.md
├── backend/                 # API Django
│   ├── nutrition/          # App de nutrición y comidas
│   ├── accounts/           # Gestión de usuarios
│   ├── api/                # Configuración de la API
│   ├── workouts/           # Sistema de entrenamientos
│   ├── progress/           # Seguimiento de progreso
│   ├── achievements/       # Sistema de logros
│   ├── notifications/      # Sistema de notificaciones
│   ├── dashboard/          # Panel de administración
│   └── README.md           # → Ver doc/backend/README.md
├── doc/                    # 📚 Documentación completa del proyecto ✨
│   ├── INDEX.md            # Índice completo de documentación
│   ├── README.md           # Documentación principal
│   ├── backend/            # Documentación del backend
│   ├── frontend/           # Documentación del frontend
│   ├── api/                # Especificaciones de API
│   ├── architecture/       # Arquitectura del sistema
│   ├── database/           # Esquemas de base de datos
│   ├── deployment/         # Guías de despliegue
│   ├── fixes/              # Soluciones implementadas
│   ├── scripts/            # Documentación de scripts
│   ├── testing/            # Guías de testing
│   ├── troubleshooting/    # Solución de problemas
│   └── user-manual/        # Manual de usuario
└── scripts/                # Scripts de desarrollo y despliegue
    ├── deployment/         # Scripts de despliegue
    └── development/        # Scripts de desarrollo
```

> 📚 **Nota**: Toda la documentación está consolidada en la carpeta `doc/`. Ver [doc/INDEX.md](doc/INDEX.md) para el índice completo.

## 🔧 Configuración

### **Variables de Entorno Frontend**
```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_APP_NAME=Nex-Fit
```

### **Variables de Entorno Backend**
```bash
# backend/.env
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///db.sqlite3
ALLOWED_HOSTS=localhost,127.0.0.1
```

## 📊 Estado del Proyecto

### **✅ Completado**
- [x] Sistema de autenticación JWT completo
- [x] API REST completa para nutrición
- [x] Dashboard de comidas funcional
- [x] Seguimiento de macros en tiempo real
- [x] Interfaz moderna y responsiva
- [x] Integración frontend-backend completa
- [x] Persistencia de datos local y remota
- [x] Sistema de roles y permisos
- [x] **Dashboard mejorado con datos reales**
- [x] **Sistema de entrenamientos implementado**
- [x] **Manejo robusto de errores en frontend**
- [x] **Componentes de progreso integrados**
- [x] **Panel de administración funcional**
- [x] **Sistema de notificaciones real**

### **🔄 En Desarrollo**
- [ ] Tests automatizados completos
- [ ] Optimizaciones de rendimiento
- [ ] Reportes avanzados y analytics

### **📋 Pendiente**
- [ ] CI/CD pipeline completo
- [ ] Dockerización para producción
- [ ] Despliegue en producción
- [ ] Monitoreo y logging avanzado

## 🧪 Testing

### **Backend**
```bash
cd backend
python manage.py test
python -m pytest
```

### **Frontend**
```bash
cd frontend
npm run test
npm run test:watch
```

## 🚀 Despliegue

### **Desarrollo Local**
```bash
# Scripts de inicio rápido
./scripts/development/start-dev.sh          # Linux/Mac
./scripts/development/start-dev.ps1         # Windows PowerShell
./scripts/development/start-dev.bat         # Windows CMD
./scripts/development/start-simple.ps1      # Inicio simple
```

### **Producción**
```bash
# Backend
cd backend
gunicorn backend.wsgi:application

# Frontend
cd frontend
npm run build
npm start
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

- **Issues**: [GitHub Issues](link-to-issues)
- **Documentación**: [Wiki del Proyecto](link-to-wiki)
- **Email**: soporte@nex-fit.com

## 🙏 Agradecimientos

- **Next.js Team** por el framework increíble
- **Django Team** por el backend robusto
- **Tailwind CSS** por el sistema de estilos
- **Shadcn/ui** por los componentes hermosos

---

**Desarrollado con ❤️ por el equipo de Nex-Fit**

*Última actualización: Octubre 2025*

---

## 📚 Documentación

> 📌 **Toda la documentación está consolidada en la carpeta [`doc/`](doc/)**

### 📖 **Documentación Principal**
- **[Índice de Documentación](doc/INDEX.md)** - Acceso completo a toda la documentación
- **[Configuración Rápida](doc/QUICK_SETUP.md)** - Setup en 5 minutos
- **[Estado del Proyecto](doc/PROJECT_STATUS_REPORT.md)** - Reporte detallado del estado

### ✅ **Checklists de Tareas** ✨ **NUEVO**
- **[Checklist General](doc/PROJECT_CHECKLIST.md)** - Vista unificada (71% completado)
- **[Checklist Backend](doc/backend/checklist.md)** - Tareas del backend (79% completado)
- **[Checklist Frontend](doc/frontend/checklist.md)** - Tareas del frontend (67% completado)

### 🔧 **Documentación Técnica**
- **[Backend](doc/backend/README.md)** - Documentación del backend
- **[Frontend](doc/frontend/README.md)** - Documentación del frontend
- **[Despliegue](doc/deployment/DEPLOYMENT.md)** - Guía de despliegue
- **[Testing](doc/testing/)** - Guías de testing

