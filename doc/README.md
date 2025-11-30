# 📚 Documentación Completa - Nex-Fit

> 📌 **Última actualización**: Octubre 2025 | **Versión**: 1.2.0 | **Estado**: ✅ Consolidado

## 🎯 Descripción General

Nex-Fit es una aplicación web completa de fitness y bienestar que permite a los usuarios gestionar sus entrenamientos, nutrición, progreso y logros. La aplicación está diseñada con una arquitectura moderna separando frontend y backend.

## 📍 Estructura de Documentación

> ✨ **Toda la documentación del proyecto está consolidada en esta carpeta `doc/`**

```
doc/
├── INDEX.md                     # 📚 Índice completo de documentación
├── README.md                    # Este archivo
├── QUICK_SETUP.md               # ⚡ Setup rápido en 5 minutos
├── PROJECT_STATUS_REPORT.md     # 📊 Estado del proyecto
├── CHANGELOG.md                 # 📝 Historial de cambios
├── REORGANIZATION_SUMMARY.md    # 🔄 Resumen de reorganización
├── backend/                     # 🐍 Documentación del backend
├── frontend/                    # ⚛️ Documentación del frontend
├── api/                         # 📡 Especificaciones de API
├── architecture/                # 🏗️ Arquitectura del sistema
├── database/                    # 🗄️ Esquemas de base de datos
├── deployment/                  # 🚀 Guías de despliegue
├── fixes/                       # 🐛 Soluciones implementadas
├── scripts/                     # 🔧 Documentación de scripts
├── testing/                     # 🧪 Guías de testing
├── troubleshooting/             # 🛠️ Solución de problemas
└── user-manual/                 # 👥 Manual de usuario
```

## 🏗️ Arquitectura del Sistema

```
Nex-Fit/
├── 📁 backend/          # API Django + DRF + PostgreSQL
│   └── README.md        # → Ver doc/backend/README.md
├── 📁 frontend/         # Aplicación Next.js + TypeScript
│   └── README.md        # → Ver doc/frontend/README.md
├── 📁 doc/             # 📚 Documentación completa ✨
│   └── INDEX.md         # Índice de toda la documentación
└── 📁 scripts/          # Scripts de desarrollo y despliegue
```

## 📖 Acceso Rápido a Documentación

> 💡 **Tip**: Ver [INDEX.md](./INDEX.md) para el índice completo con todos los documentos

### 🚀 **Inicio Rápido**
- **[Setup Rápido](./QUICK_SETUP.md)** - Configuración en 5 minutos
- **[Estado del Proyecto](./PROJECT_STATUS_REPORT.md)** - Reporte completo
- **[Changelog](./CHANGELOG.md)** - Historial de cambios

### 🔧 **Documentación Técnica**
- **[Backend](./backend/README.md)** - Django + DRF + PostgreSQL
- **[Frontend](./frontend/README.md)** - Next.js + TypeScript + Tailwind
- **[API](./api/openapi-specification.md)** - Especificaciones de API
- **[Arquitectura](./architecture/system-architecture.md)** - Diseño del sistema
- **[Base de Datos](./database/schema.md)** - Esquemas y modelos

### 🚀 **Despliegue y Producción**
- **[Guía de Despliegue](./deployment/DEPLOYMENT.md)** - Despliegue completo
- **[Pasos de Despliegue](./deployment/DEPLOYMENT_STEPS.md)** - Paso a paso
- **[Producción](./deployment/production-setup.md)** - Setup de producción

### 🧪 **Testing y Calidad**
- **[Testing Backend](./testing/backend-testing.md)** - Guía completa
- **[Testing Frontend](./testing/frontend-testing.md)** - Tests del frontend
- **[Testing E2E](./testing/e2e-testing.md)** - Tests end-to-end
- **[Testing Integración](./testing/integration-testing.md)** - Tests de integración

### 🐛 **Fixes y Soluciones**
- **[Soluciones Frontend](./fixes/frontend-solutions.md)** - Problemas resueltos del frontend
- **[Autenticación](./fixes/AUTH_SERVICE_THROTTLING_FIX.md)** - Fix de autenticación
- **[Dashboard](./fixes/DASHBOARD_CLEANUP_SUMMARY.md)** - Limpieza del dashboard
- **[Rate Limiting](./fixes/FINAL_RATE_LIMITING_FIX.md)** - Límites de velocidad

### 👥 **Manual de Usuario**
- **[Manual de Usuario](./user-manual/README.md)** - Guía para usuarios finales

### 🛠️ **Troubleshooting**
- **[Guía de Troubleshooting](./troubleshooting/troubleshooting-guide.md)** - Solución de problemas

## 🚀 Inicio Rápido

### Backend
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🔑 Acceso al Sistema

- **URL Backend**: http://localhost:8000
- **URL Frontend**: http://localhost:3000
- **Admin Django**: http://localhost:8000/admin
- **API Docs**: http://localhost:8000/api/docs/

## 📊 Estado del Proyecto

- **Backend**: 🟢 95% Completado
- **Frontend**: 🟢 85% Completado (75% funcionalidad real)
- **Documentación**: 🟢 85% Completado
- **Testing**: 🟡 80% Completado
- **Integración**: 🟢 75% Completado (módulos principales funcionales)

## 🤝 Contribución

Para contribuir al proyecto, consulta la [guía de contribución](./CONTRIBUTING.md).

## 📞 Soporte

- **Issues**: Crear en el repositorio del proyecto
- **Documentación**: Revisar esta carpeta docs/
- **Backend**: Consultar backend/docs/
- **Frontend**: Consultar frontend/docs/

---

## 🆕 Cambios Recientes (Octubre 2025)

### ✨ **Consolidación de Documentación**
- ✅ Toda la documentación movida a la carpeta `doc/`
- ✅ Eliminados archivos duplicados
- ✅ Reorganizada estructura de carpetas
- ✅ Actualizado índice completo ([INDEX.md](./INDEX.md))
- ✅ Enlaces y referencias actualizadas
- ✅ READMEs actualizados en `backend/` y `frontend/`

---

*Última actualización: Octubre 2025*  
*Versión: 1.2.0*  
*Estado: ✅ Consolidado y Actualizado*
