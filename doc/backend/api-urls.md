# 🌐 Documentación de URLs - Nex-Fit API

## 📋 Índice

- [Autenticación](#autenticación)
- [Usuarios](#usuarios)
- [Nutrición](#nutrición)
- [Entrenamientos](#entrenamientos)
- [Progreso](#progreso)
- [Notificaciones](#notificaciones)
- [Logros](#logros)
- [Dashboard](#dashboard)
- [Admin](#admin)
- [Documentación](#documentación)

---

## 🔐 Autenticación

### Endpoints de Autenticación

| Método | URL | Descripción | Autenticación |
|--------|-----|-------------|---------------|
| `POST` | `/api/auth/login/` | Iniciar sesión | No requerida |
| `POST` | `/api/auth/refresh/` | Refrescar token JWT | No requerida |
| `POST` | `/api/auth/logout/` | Cerrar sesión | JWT Bearer |

### Ejemplos de Uso

#### Login
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

#### Refresh Token
```bash
curl -X POST http://localhost:8000/api/auth/refresh/ \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "your_refresh_token_here"
  }'
```

---

## 👥 Usuarios

### Endpoints de Usuario

| Método | URL | Descripción | Autenticación | Permisos |
|--------|-----|-------------|---------------|----------|
| `GET` | `/api/me/` | Perfil del usuario actual | JWT Bearer | Usuario autenticado |
| `GET` | `/api/demo/admin/` | Demo de permisos admin | JWT Bearer | Admin |
| `GET` | `/api/demo/trainer/` | Demo de permisos trainer | JWT Bearer | Trainer |
| `GET` | `/api/demo/member/` | Demo de permisos member | JWT Bearer | Member |

### Ejemplos de Uso

#### Obtener Perfil
```bash
curl -X GET http://localhost:8000/api/me/ \
  -H "Authorization: Bearer your_access_token_here"
```

---

## 🍎 Nutrición

### Endpoints de Alimentos

| Método | URL | Descripción | Autenticación | Permisos |
|--------|-----|-------------|---------------|----------|
| `GET` | `/api/foods/` | Listar alimentos | JWT Bearer | Todos |
| `POST` | `/api/foods/` | Crear alimento | JWT Bearer | Staff |
| `GET` | `/api/foods/{id}/` | Obtener alimento | JWT Bearer | Todos |
| `PUT` | `/api/foods/{id}/` | Actualizar alimento | JWT Bearer | Staff |
| `DELETE` | `/api/foods/{id}/` | Eliminar alimento | JWT Bearer | Staff |

### Endpoints de Planes Nutricionales

| Método | URL | Descripción | Autenticación | Permisos |
|--------|-----|-------------|---------------|----------|
| `GET` | `/api/nutrition-plans/` | Listar planes | JWT Bearer | Usuario autenticado |
| `POST` | `/api/nutrition-plans/` | Crear plan | JWT Bearer | Usuario autenticado |
| `GET` | `/api/nutrition-plans/{id}/` | Obtener plan | JWT Bearer | Propietario/Staff |
| `PUT` | `/api/nutrition-plans/{id}/` | Actualizar plan | JWT Bearer | Propietario/Staff |
| `DELETE` | `/api/nutrition-plans/{id}/` | Eliminar plan | JWT Bearer | Propietario/Staff |

### Endpoints de Logs de Comidas

| Método | URL | Descripción | Autenticación | Permisos |
|--------|-----|-------------|---------------|----------|
| `GET` | `/api/meal-logs/` | Listar logs | JWT Bearer | Usuario autenticado |
| `POST` | `/api/meal-logs/` | Crear log | JWT Bearer | Usuario autenticado |
| `GET` | `/api/meal-logs/{id}/` | Obtener log | JWT Bearer | Propietario/Staff |
| `PUT` | `/api/meal-logs/{id}/` | Actualizar log | JWT Bearer | Propietario/Staff |
| `DELETE` | `/api/meal-logs/{id}/` | Eliminar log | JWT Bearer | Propietario/Staff |

### Ejemplos de Uso

#### Listar Alimentos
```bash
curl -X GET http://localhost:8000/api/foods/ \
  -H "Authorization: Bearer your_access_token_here"
```

#### Crear Plan Nutricional
```bash
curl -X POST http://localhost:8000/api/nutrition-plans/ \
  -H "Authorization: Bearer your_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Plan Definición 1800",
    "description": "Plan de definición muscular",
    "daily_calories": 1800,
    "start_date": "2025-01-01"
  }'
```

---

## 🏋️ Entrenamientos

### Endpoints de Ejercicios

| Método | URL | Descripción | Autenticación | Permisos |
|--------|-----|-------------|---------------|----------|
| `GET` | `/api/exercises/` | Listar ejercicios | JWT Bearer | Todos |
| `POST` | `/api/exercises/` | Crear ejercicio | JWT Bearer | Staff |
| `GET` | `/api/exercises/{id}/` | Obtener ejercicio | JWT Bearer | Todos |
| `PUT` | `/api/exercises/{id}/` | Actualizar ejercicio | JWT Bearer | Staff |
| `DELETE` | `/api/exercises/{id}/` | Eliminar ejercicio | JWT Bearer | Staff |

### Endpoints de Programas de Entrenamiento

| Método | URL | Descripción | Autenticación | Permisos |
|--------|-----|-------------|---------------|----------|
| `GET` | `/api/workout-programs/` | Listar programas | JWT Bearer | Usuario autenticado |
| `POST` | `/api/workout-programs/` | Crear programa | JWT Bearer | Usuario autenticado |
| `GET` | `/api/workout-programs/{id}/` | Obtener programa | JWT Bearer | Propietario/Staff |
| `PUT` | `/api/workout-programs/{id}/` | Actualizar programa | JWT Bearer | Propietario/Staff |
| `DELETE` | `/api/workout-programs/{id}/` | Eliminar programa | JWT Bearer | Propietario/Staff |

### Endpoints de Logs de Entrenamiento

| Método | URL | Descripción | Autenticación | Permisos |
|--------|-----|-------------|---------------|----------|
| `GET` | `/api/workout-logs/` | Listar logs | JWT Bearer | Usuario autenticado |
| `POST` | `/api/workout-logs/` | Crear log | JWT Bearer | Usuario autenticado |
| `GET` | `/api/workout-logs/{id}/` | Obtener log | JWT Bearer | Propietario/Staff |
| `PUT` | `/api/workout-logs/{id}/` | Actualizar log | JWT Bearer | Propietario/Staff |
| `DELETE` | `/api/workout-logs/{id}/` | Eliminar log | JWT Bearer | Propietario/Staff |

### Ejemplos de Uso

#### Listar Ejercicios
```bash
curl -X GET http://localhost:8000/api/exercises/ \
  -H "Authorization: Bearer your_access_token_here"
```

#### Crear Programa de Entrenamiento
```bash
curl -X POST http://localhost:8000/api/workout-programs/ \
  -H "Authorization: Bearer your_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Programa Fuerza 4x4",
    "description": "Programa de fuerza 4 días por semana",
    "level": "intermediate",
    "goal": "strength_building",
    "days_per_week": 4,
    "start_date": "2025-01-01"
  }'
```

---

## 📊 Progreso

### Endpoints de Fotos de Progreso

| Método | URL | Descripción | Autenticación | Permisos |
|--------|-----|-------------|---------------|----------|
| `GET` | `/api/progress-photos/` | Listar fotos | JWT Bearer | Usuario autenticado |
| `POST` | `/api/progress-photos/` | Subir foto | JWT Bearer | Usuario autenticado |
| `GET` | `/api/progress-photos/{id}/` | Obtener foto | JWT Bearer | Propietario/Staff |
| `PUT` | `/api/progress-photos/{id}/` | Actualizar foto | JWT Bearer | Propietario/Staff |
| `DELETE` | `/api/progress-photos/{id}/` | Eliminar foto | JWT Bearer | Propietario/Staff |
| `GET` | `/api/progress-photos/summary/` | Resumen de fotos | JWT Bearer | Usuario autenticado |

### Endpoints de Historial de Peso

| Método | URL | Descripción | Autenticación | Permisos |
|--------|-----|-------------|---------------|----------|
| `GET` | `/api/weight-history/` | Listar entradas | JWT Bearer | Usuario autenticado |
| `POST` | `/api/weight-history/` | Crear entrada | JWT Bearer | Usuario autenticado |
| `GET` | `/api/weight-history/{id}/` | Obtener entrada | JWT Bearer | Propietario/Staff |
| `PUT` | `/api/weight-history/{id}/` | Actualizar entrada | JWT Bearer | Propietario/Staff |
| `DELETE` | `/api/weight-history/{id}/` | Eliminar entrada | JWT Bearer | Propietario/Staff |
| `GET` | `/api/weight-history/history/` | Historial con límite | JWT Bearer | Usuario autenticado |
| `GET` | `/api/weight-history/stats/` | Estadísticas de peso | JWT Bearer | Usuario autenticado |

### Endpoints de Medidas Corporales

| Método | URL | Descripción | Autenticación | Permisos |
|--------|-----|-------------|---------------|----------|
| `GET` | `/api/measurements/` | Listar medidas | JWT Bearer | Usuario autenticado |
| `POST` | `/api/measurements/` | Crear medidas | JWT Bearer | Usuario autenticado |
| `GET` | `/api/measurements/{id}/` | Obtener medidas | JWT Bearer | Propietario/Staff |
| `PUT` | `/api/measurements/{id}/` | Actualizar medidas | JWT Bearer | Propietario/Staff |
| `DELETE` | `/api/measurements/{id}/` | Eliminar medidas | JWT Bearer | Propietario/Staff |
| `GET` | `/api/measurements/trends/` | Tendencias de medidas | JWT Bearer | Usuario autenticado |

### Ejemplos de Uso

#### Subir Foto de Progreso
```bash
curl -X POST http://localhost:8000/api/progress-photos/ \
  -H "Authorization: Bearer your_access_token_here" \
  -F "photo=@progress_photo.jpg" \
  -F "photo_type=front" \
  -F "date=2025-01-01" \
  -F "weight=75.5"
```

#### Crear Entrada de Peso
```bash
curl -X POST http://localhost:8000/api/weight-history/ \
  -H "Authorization: Bearer your_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "weight": 75.2,
    "date": "2025-01-01",
    "notes": "Peso de la mañana"
  }'
```

---

## 🔔 Notificaciones

### Endpoints de Notificaciones

| Método | URL | Descripción | Autenticación | Permisos |
|--------|-----|-------------|---------------|----------|
| `GET` | `/api/notifications/` | Listar notificaciones | JWT Bearer | Usuario autenticado |
| `POST` | `/api/notifications/` | Crear notificación | JWT Bearer | Usuario autenticado/Staff |
| `GET` | `/api/notifications/{id}/` | Obtener notificación | JWT Bearer | Propietario/Staff |
| `PUT` | `/api/notifications/{id}/` | Actualizar notificación | JWT Bearer | Propietario/Staff |
| `DELETE` | `/api/notifications/{id}/` | Eliminar notificación | JWT Bearer | Propietario/Staff |
| `PATCH` | `/api/notifications/{id}/read/` | Marcar como leída | JWT Bearer | Propietario/Staff |
| `PATCH` | `/api/notifications/{id}/unread/` | Marcar como no leída | JWT Bearer | Propietario/Staff |
| `PATCH` | `/api/notifications/mark_all_read/` | Marcar todas como leídas | JWT Bearer | Usuario autenticado |
| `GET` | `/api/notifications/unread_count/` | Contador no leídas | JWT Bearer | Usuario autenticado |
| `GET` | `/api/notifications/summary/` | Resumen de notificaciones | JWT Bearer | Usuario autenticado |
| `GET` | `/api/notifications/recent/` | Notificaciones recientes | JWT Bearer | Usuario autenticado |
| `GET` | `/api/notifications/by_type/` | Por tipo | JWT Bearer | Usuario autenticado |

### Ejemplos de Uso

#### Listar Notificaciones
```bash
curl -X GET http://localhost:8000/api/notifications/ \
  -H "Authorization: Bearer your_access_token_here"
```

#### Marcar como Leída
```bash
curl -X PATCH http://localhost:8000/api/notifications/{id}/read/ \
  -H "Authorization: Bearer your_access_token_here"
```

---

## 🏆 Logros

### Endpoints de Logros Disponibles

| Método | URL | Descripción | Autenticación | Permisos |
|--------|-----|-------------|---------------|----------|
| `GET` | `/api/achievements/` | Listar logros | JWT Bearer | Todos |
| `POST` | `/api/achievements/` | Crear logro | JWT Bearer | Staff |
| `GET` | `/api/achievements/{id}/` | Obtener logro | JWT Bearer | Todos |
| `PUT` | `/api/achievements/{id}/` | Actualizar logro | JWT Bearer | Staff |
| `DELETE` | `/api/achievements/{id}/` | Eliminar logro | JWT Bearer | Staff |
| `GET` | `/api/achievements/categories/` | Categorías de logros | JWT Bearer | Todos |
| `GET` | `/api/achievements/by_category/` | Por categoría | JWT Bearer | Todos |

### Endpoints de Logros del Usuario

| Método | URL | Descripción | Autenticación | Permisos |
|--------|-----|-------------|---------------|----------|
| `GET` | `/api/user-achievements/` | Listar logros del usuario | JWT Bearer | Usuario autenticado |
| `POST` | `/api/user-achievements/` | Asignar logro | JWT Bearer | Staff |
| `GET` | `/api/user-achievements/{id}/` | Obtener logro del usuario | JWT Bearer | Propietario/Staff |
| `PUT` | `/api/user-achievements/{id}/` | Actualizar logro del usuario | JWT Bearer | Propietario/Staff |
| `DELETE` | `/api/user-achievements/{id}/` | Eliminar logro del usuario | JWT Bearer | Propietario/Staff |
| `GET` | `/api/user-achievements/summary/` | Resumen de logros | JWT Bearer | Usuario autenticado |
| `GET` | `/api/user-achievements/progress/` | Progreso hacia logros | JWT Bearer | Usuario autenticado |
| `GET` | `/api/user-achievements/recent/` | Logros recientes | JWT Bearer | Usuario autenticado |
| `GET` | `/api/user-achievements/by_category/` | Por categoría | JWT Bearer | Usuario autenticado |

### Ejemplos de Uso

#### Listar Logros Disponibles
```bash
curl -X GET http://localhost:8000/api/achievements/ \
  -H "Authorization: Bearer your_access_token_here"
```

#### Asignar Logro a Usuario
```bash
curl -X POST http://localhost:8000/api/user-achievements/ \
  -H "Authorization: Bearer your_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "user": "user_id_here",
    "achievement": "achievement_id_here",
    "progress": {"completed": true}
  }'
```

---

## 📈 Dashboard

### Endpoints del Dashboard

| Método | URL | Descripción | Autenticación | Permisos |
|--------|-----|-------------|---------------|----------|
| `GET` | `/api/dashboard/today/` | Dashboard del día | JWT Bearer | Usuario autenticado |
| `GET` | `/api/dashboard/weekly/` | Dashboard semanal | JWT Bearer | Usuario autenticado |
| `GET` | `/api/dashboard/monthly/` | Dashboard mensual | JWT Bearer | Usuario autenticado |
| `GET` | `/api/dashboard/stats/` | Estadísticas generales | JWT Bearer | Usuario autenticado |

### Ejemplos de Uso

#### Dashboard del Día
```bash
curl -X GET http://localhost:8000/api/dashboard/today/ \
  -H "Authorization: Bearer your_access_token_here"
```

#### Dashboard Semanal
```bash
curl -X GET http://localhost:8000/api/dashboard/weekly/ \
  -H "Authorization: Bearer your_access_token_here"
```

---

## 🔧 Admin

### Endpoints de Administración

| Método | URL | Descripción | Autenticación | Permisos |
|--------|-----|-------------|---------------|----------|
| `GET` | `/admin/` | Panel de administración | JWT Bearer | Staff |
| `GET` | `/admin/accounts/` | Gestión de usuarios | JWT Bearer | Staff |
| `GET` | `/admin/nutrition/` | Gestión de nutrición | JWT Bearer | Staff |
| `GET` | `/admin/workouts/` | Gestión de entrenamientos | JWT Bearer | Staff |
| `GET` | `/admin/progress/` | Gestión de progreso | JWT Bearer | Staff |
| `GET` | `/admin/notifications/` | Gestión de notificaciones | JWT Bearer | Staff |
| `GET` | `/admin/achievements/` | Gestión de logros | JWT Bearer | Staff |
| `GET` | `/admin/dashboard/` | Gestión del dashboard | JWT Bearer | Staff |

---

## 📚 Documentación

### Endpoints de Documentación

| Método | URL | Descripción | Autenticación | Permisos |
|--------|-----|-------------|---------------|----------|
| `GET` | `/api/docs/` | Swagger UI | No requerida | Todos |
| `GET` | `/api/schema/` | OpenAPI Schema | No requerida | Todos |
| `GET` | `/api/health/` | Health check | No requerida | Todos |

### Ejemplos de Uso

#### Ver Documentación Swagger
```bash
# Abrir en navegador
http://localhost:8000/api/docs/
```

#### Obtener Schema OpenAPI
```bash
curl -X GET http://localhost:8000/api/schema/
```

---

## 🚀 Comandos de Despliegue Local

### 1. Configurar Entorno
```bash
# Activar entorno virtual
source .venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

### 2. Configurar Base de Datos
```bash
# Copiar archivo de ejemplo
cp env.example .env

# Editar .env con tus credenciales
# DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT
```

### 3. Ejecutar Migraciones
```bash
# Crear migraciones
python manage.py makemigrations

# Aplicar migraciones
python manage.py migrate
```

### 4. Crear Superusuario
```bash
python manage.py createsuperuser
```

### 5. Crear Datos Demo
```bash
python manage.py seed_demo
```

### 6. Ejecutar Servidor
```bash
python manage.py runserver
```

### 7. Ejecutar Tests
```bash
# Todos los tests
pytest

# Tests con cobertura
pytest --cov=. --cov-report=html

# Tests específicos
pytest accounts/tests/
pytest nutrition/tests/
```

---

## 📝 Notas Importantes

- **Autenticación**: Todos los endpoints requieren JWT Bearer token excepto login, refresh y health check
- **Permisos**: Los usuarios solo pueden acceder a sus propios datos
- **Staff**: Los usuarios con `is_staff=True` pueden acceder a todo
- **Rate Limiting**: Los endpoints tienen límites de velocidad configurados
- **Logging**: Todos los endpoints generan logs detallados
- **Cache**: El dashboard usa Redis para cache de datos

---

## 🔗 Enlaces Útiles

- **Swagger UI**: http://localhost:8000/api/docs/
- **Admin Panel**: http://localhost:8000/admin/
- **Health Check**: http://localhost:8000/api/health/
- **OpenAPI Schema**: http://localhost:8000/api/schema/

---

**Nex-Fit API** - Documentación completa de endpoints 🚀 