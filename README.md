# NexFit365

Plataforma web para la gestion de programas de fitness, nutricion, progreso y administracion de usuarios.

<p>
  <a href="https://nextjs.org/" aria-label="Next.js">
    <img src="https://skillicons.dev/icons?i=nextjs" alt="Next.js" height="42" />
  </a>
  <a href="https://react.dev/" aria-label="React">
    <img src="https://skillicons.dev/icons?i=react" alt="React" height="42" />
  </a>
  <a href="https://www.typescriptlang.org/" aria-label="TypeScript">
    <img src="https://skillicons.dev/icons?i=ts" alt="TypeScript" height="42" />
  </a>
  <a href="https://tailwindcss.com/" aria-label="Tailwind CSS">
    <img src="https://skillicons.dev/icons?i=tailwind" alt="Tailwind CSS" height="42" />
  </a>
  <a href="https://www.python.org/" aria-label="Python">
    <img src="https://skillicons.dev/icons?i=python" alt="Python" height="42" />
  </a>
  <a href="https://www.djangoproject.com/" aria-label="Django">
    <img src="https://skillicons.dev/icons?i=django" alt="Django" height="42" />
  </a>
  <a href="https://www.postgresql.org/" aria-label="PostgreSQL">
    <img src="https://skillicons.dev/icons?i=postgres" alt="PostgreSQL" height="42" />
  </a>
  <a href="https://redis.io/" aria-label="Redis">
    <img src="https://skillicons.dev/icons?i=redis" alt="Redis" height="42" />
  </a>
  <a href="https://www.docker.com/" aria-label="Docker">
    <img src="https://skillicons.dev/icons?i=docker" alt="Docker" height="42" />
  </a>
</p>

## Descripcion

NexFit365 centraliza la operacion de un servicio digital de entrenamiento y nutricion. El sistema permite crear planes, asignarlos a usuarios, gestionar contenido, consultar metricas de progreso y mantener flujos administrativos desde una aplicacion web moderna.

El proyecto esta dividido en dos aplicaciones principales:

- Frontend: aplicacion Next.js con TypeScript, React, Tailwind CSS y componentes reutilizables.
- Backend: API Django REST Framework con autenticacion JWT, PostgreSQL, Redis y servicios auxiliares.

## Funcionalidades principales

### Usuarios y administracion

- Registro, autenticacion y gestion de sesiones mediante JWT.
- Roles diferenciados para usuarios, administradores y perfiles operativos.
- Panel administrativo para gestionar planes, contenidos y datos de usuarios.
- Flujos de mantenimiento para datos de entrenamiento, nutricion y progreso.

### Nutricion

- Planes de alimentacion personalizados.
- Biblioteca de recetas con datos nutricionales.
- Gestion de equivalencias alimentarias para sustituciones.
- Seguimiento de calorias y macronutrientes.
- Herramientas administrativas para importar, editar y mantener contenido nutricional.

### Entrenamientos

- Programas y plantillas de entrenamiento.
- Biblioteca de ejercicios con soporte para recursos multimedia.
- Asignacion de planes segun configuraciones y objetivos.
- Seguimiento semanal del cumplimiento y progreso del usuario.

### Progreso y analitica

- Registro de metricas corporales y actividad.
- Dashboards para visualizar evolucion y adherencia.
- Historial de planes, entrenamientos y datos relevantes.
- Base funcional para logros, notificaciones y seguimiento operativo.

## Stack tecnologico

| Area | Tecnologias |
| --- | --- |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| UI | Radix UI, shadcn/ui patterns, Lucide React, Recharts |
| Backend | Python, Django 5.2, Django REST Framework |
| Auth | JWT con `djangorestframework-simplejwt` |
| Datos | PostgreSQL, Redis |
| Tareas y cache | Celery, django-redis, django-celery-results |
| Calidad | Jest, Testing Library, Pytest, ESLint, TypeScript |
| Despliegue | Docker, Docker Compose, Gunicorn, WhiteNoise |

## Arquitectura

```text
Frontend              Backend API                 Infraestructura
Next.js + React  <--> Django REST Framework  <--> PostgreSQL + Redis
```

## Estructura del repositorio

```text
.
|-- backend/                  # API, modelos, servicios y tareas del servidor
|   |-- accounts/             # Usuarios, autenticacion y perfiles
|   |-- achievements/         # Logros y progreso asociado
|   |-- dashboard/            # Servicios para vistas administrativas
|   |-- notifications/        # Notificaciones
|   |-- nutrition/            # Planes, recetas y equivalencias
|   |-- progress/             # Metricas y seguimiento del usuario
|   `-- workouts/             # Entrenamientos, ejercicios y programas
|
|-- frontend/                 # Aplicacion web
|   |-- app/                  # Rutas y layouts de Next.js
|   |-- components/           # Componentes de interfaz
|   |-- hooks/                # Hooks de React
|   |-- lib/                  # Clientes, utilidades y logica compartida
|   `-- public/               # Recursos estaticos
|
|-- doc/                      # Documentacion complementaria
|-- scripts/                  # Scripts de soporte operativo
|-- docker-compose.dev.yml    # Orquestacion para desarrollo
`-- docker-compose.prod.yml   # Orquestacion para despliegue
```

## Requisitos

- Node.js compatible con Next.js 15.
- Python 3.11 o superior.
- PostgreSQL.
- Redis.
- Docker y Docker Compose para ejecucion contenerizada.

## Configuracion

El proyecto utiliza variables de entorno para credenciales, endpoints, claves secretas y configuracion de servicios externos.

Archivos de referencia:

- `backend/env.example`
- `backend/env.production.example`
- `frontend/env.example`

Pasos generales:

1. Crear los archivos `.env` necesarios a partir de los ejemplos.
2. Configurar credenciales de base de datos, Redis, JWT, CORS y servicios externos.
3. Ejecutar migraciones del backend.
4. Instalar dependencias y levantar frontend y backend.

No se deben versionar credenciales, rutas internas de servidores ni archivos de entorno reales.

## Ejecucion con Docker

### Desarrollo

```bash
docker compose -f docker-compose.dev.yml up --build
```

### Produccion

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## Desarrollo local

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
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

## Calidad y pruebas

### Frontend

```bash
cd frontend
npm run lint
npm run typecheck
npm test
```

### Backend

```bash
cd backend
pytest
```

## Convenciones de documentacion

- Mantener un tono profesional, claro y tecnico.
- No incluir emojis en titulos, commits o contenido del README.
- No publicar rutas internas del servidor, credenciales, nombres privados de contenedores ni datos operativos sensibles.
- Usar iconos tecnologicos con un estilo uniforme, preferiblemente `skillicons.dev`, y siempre con texto alternativo.
- Documentar comandos de forma generica para que funcionen en cualquier clon del repositorio.

## Documentacion relacionada

- `doc/`: documentacion general del proyecto.
- `doc/backend/`: notas tecnicas del backend.
- `doc/frontend/`: notas tecnicas del frontend.
- `doc/docker/`: documentacion de despliegue y contenedores.
- `scripts/deployment/`: utilidades operativas de despliegue y mantenimiento.
