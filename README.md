# NexFit365

Sistema web para la gestión integral de fitness, nutrición y seguimiento de progreso. Este repositorio corresponde al entorno de producción ubicado en `/srv/mykaizenfit/pro`.

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

## Descripción

NexFit365 centraliza la administración de planes de alimentación, programas de entrenamiento, métricas de progreso y usuarios. La aplicación combina un frontend en Next.js con una API Django, base de datos PostgreSQL, Redis y despliegue mediante Docker Compose.

## Funcionalidades

### Nutrición

- Planes de alimentación personalizados.
- Biblioteca de recetas con información nutricional.
- Seguimiento de macronutrientes y calorías.
- Dashboard nutricional interactivo.
- Sistema de equivalencias multi-categoría para recomendaciones de sustitución.
- Gestión administrativa de categorías de equivalencia.

### Entrenamientos

- Programas de entrenamiento personalizables.
- Biblioteca de ejercicios con videos.
- Seguimiento de progreso y rendimiento.
- Planes predeterminados y personalizados.

### Progreso

- Métricas avanzadas y análisis.
- Gráficos interactivos.
- Historial de actividades.
- Sistema de logros.

### Administración y seguridad

- Autenticación JWT con tokens de acceso y renovación.
- Roles de usuario para administración, entrenamiento y cliente.
- Panel de administración para gestión operativa.

## Arquitectura

```text
Frontend Next.js 14      Backend Django 4.2       PostgreSQL + Redis
Port 3000          <-->  Port 8000           <-->  Port 5432

                    Docker Compose en producción
```

## Estructura del proyecto

```text
nexfit365/
├── frontend/                   # Aplicación Next.js
│   ├── app/                    # App Router
│   ├── components/             # Componentes React
│   ├── hooks/                  # Hooks personalizados
│   ├── lib/                    # Servicios y utilidades
│   └── docker.env.example      # Variables de entorno
│
├── backend/                    # API Django
│   ├── accounts/               # Gestión de usuarios
│   ├── nutrition/              # Nutrición y recetas
│   ├── workouts/               # Entrenamientos y ejercicios
│   ├── progress/               # Seguimiento de progreso
│   ├── achievements/           # Logros
│   ├── notifications/          # Notificaciones
│   ├── dashboard/              # Panel de administración
│   └── docker/                 # Configuración Docker
│       └── backend.env.example
│
├── doc/                        # Documentación
├── scripts/                    # Scripts de despliegue y mantenimiento
├── docker-compose.dev.yml      # Stack de desarrollo
├── docker-compose.prod.yml     # Stack de producción
└── .gitignore
```

## Guía de iconos tecnológicos

Cuando el README o la documentación necesiten mostrar iconos de tecnologías, se debe mantener un estilo uniforme basado en iconos cuadrados con esquinas redondeadas, fondo oscuro y logotipo centrado, similar a los iconos de Skill Icons.

Formato recomendado:

```html
<p>
  <img src="https://skillicons.dev/icons?i=nextjs,react,ts,tailwind,python,django,postgres,redis,docker" alt="Stack tecnológico" height="42" />
</p>
```

Buenas prácticas:

- Usar iconos solo para tecnologías principales del proyecto.
- Mantener una altura consistente, preferiblemente entre `40` y `44` píxeles.
- Incluir siempre texto alternativo descriptivo.
- Evitar mezclar estilos de iconos, badges y emojis en la misma sección.
- Mantener un tono profesional y orientado a documentación técnica.

## Inicio rápido con Docker

### Prerrequisitos

- Docker y Docker Compose.
- Git.
- Acceso a las variables de entorno necesarias para producción.

### Preparar el repositorio

```bash
cd /srv/mykaizenfit/pro
git checkout main
```

### Levantar los servicios

```bash
docker compose -f docker-compose.prod.yml up -d
```

### Acceder a la aplicación

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- Admin Django: http://localhost:8000/admin
- PostgreSQL: 127.0.0.1:5432

## Comandos útiles

### Docker

```bash
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml restart backend
docker compose -f docker-compose.prod.yml ps
```

### Django

```bash
docker exec pro-backend-1 python manage.py migrate
docker exec -it pro-backend-1 python manage.py createsuperuser
docker exec -it pro-backend-1 python manage.py shell
```

### Base de datos

```bash
docker exec pro-db-1 pg_dump -U postgres mykaizenfit > backup-prod.sql
docker exec -i pro-db-1 psql -U postgres mykaizenfit < backup-prod.sql
```

## Entornos

Producción:

- Ruta: `/srv/mykaizenfit/pro`
- Rama: `main`
- Datos persistentes: `/srv/mykaizenfit/pro/data`

Desarrollo:

- Ruta: `/srv/mykaizenfit/dev`
- Rama: `dev`
- Datos persistentes: `/srv/mykaizenfit/dev/data`

## Desarrollo local sin Docker

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

## Documentación relacionada

- `doc/`: documentación general del proyecto.
- `doc/backend/`: documentación técnica del backend.
- `doc/frontend/`: documentación técnica del frontend.
- `doc/docker/`: documentación de Docker y despliegue.
- `scripts/deployment/`: utilidades operativas de despliegue y mantenimiento.
