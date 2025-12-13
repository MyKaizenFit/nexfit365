# 🖥️ Guía de Configuración del Entorno Local

Esta guía te ayudará a configurar tu entorno de desarrollo local en tus dos equipos (portátil y torre).

## 📋 Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

- **Git** (versión 2.0 o superior)
- **Docker** y **Docker Compose** (opcional, para desarrollo con contenedores)
- **Node.js** (versión 18 o superior) - para el frontend
- **Python** (versión 3.10 o superior) - para el backend

## 🚀 Configuración Inicial en Cada Equipo

### Paso 1: Clonar el Repositorio

```bash
# Elige una ubicación adecuada en tu equipo
cd ~/proyectos  # o donde prefieras

# Clonar el repositorio
git clone https://github.com/MyKaizenFit/nexfit365.git
cd nexfit365
```

### Paso 2: Configurar Git (si no está configurado globalmente)

```bash
# Configurar tu nombre y email (usa el mismo en ambos equipos)
git config user.name "Tu Nombre"
git config user.email "tu@email.com"

# Verificar configuración
git config --list | grep user
```

### Paso 3: Crear y Cambiar a la Rama Develop

```bash
# Verificar ramas disponibles
git branch -a

# Cambiar a develop
git checkout develop

# Si develop no existe localmente, crearla desde remoto
git checkout -b develop origin/develop

# Verificar que estás en develop
git branch
# Debe mostrar: * develop
```

### Paso 4: Sincronizar con el Repositorio Remoto

```bash
# Obtener todos los cambios más recientes
git pull origin develop

# Verificar estado
git status
# Debe mostrar: "Your branch is up to date with 'origin/develop'"
```

## 🔧 Configuración del Proyecto

### Opción A: Desarrollo con Docker (Recomendado)

```bash
# 1. Copiar archivos de configuración de entorno
# Backend
cp backend/docker/backend.env.example backend/docker/backend.env
# Editar backend/docker/backend.env con tus valores

# Frontend
cp frontend/docker.env.example frontend/docker.env
# Editar frontend/docker.env con tus valores

# 2. Levantar el entorno de desarrollo
docker compose -f docker-compose.dev.yml up -d

# 3. Verificar que todo esté corriendo
docker compose -f docker-compose.dev.yml ps

# 4. Ver logs si es necesario
docker compose -f docker-compose.dev.yml logs -f
```

**Acceso:**
- Frontend: http://localhost:3001
- Backend: http://localhost:8001/api
- Admin: http://localhost:8001/admin

### Opción B: Desarrollo sin Docker

#### Backend (Django)

```bash
cd backend

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# En Linux/Mac:
source venv/bin/activate
# En Windows:
# venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp docker/backend.env.example .env
# Editar .env con tus valores

# Ejecutar migraciones
python manage.py migrate

# Crear superusuario (opcional)
python manage.py createsuperuser

# Iniciar servidor de desarrollo
python manage.py runserver 8000
```

#### Frontend (Next.js)

```bash
cd frontend

# Instalar dependencias
npm install
# o
pnpm install

# Configurar variables de entorno
cp docker.env.example .env.local
# Editar .env.local con tus valores

# Iniciar servidor de desarrollo
npm run dev
# o
pnpm dev
```

**Acceso:**
- Frontend: http://localhost:3000
- Backend: http://localhost:8000/api

## 🔄 Flujo de Trabajo Diario

### Al Iniciar una Sesión de Trabajo

```bash
# 1. Ir al directorio del proyecto
cd ~/proyectos/nexfit365  # o tu ruta

# 2. Cambiar a develop
git checkout develop

# 3. ⚠️ IMPORTANTE: Obtener últimos cambios
git pull origin develop

# 4. Verificar estado
git status
```

### Trabajar en una Nueva Funcionalidad

```bash
# 1. Crear una rama de feature desde develop
git checkout develop
git pull origin develop
git checkout -b feature/nombre-de-la-funcionalidad

# 2. Trabajar en tus cambios...

# 3. Hacer commit frecuentemente
git add .
git commit -m "feat: descripción de lo que has hecho"

# 4. Subir cambios al remoto
git push origin feature/nombre-de-la-funcionalidad
```

### Al Terminar una Sesión de Trabajo

```bash
# 1. Verificar qué has cambiado
git status

# 2. Si hay cambios, hacer commit
git add .
git commit -m "feat: descripción de cambios"
git push origin develop  # o la rama en la que estés trabajando

# 3. Verificar que todo esté sincronizado
git status
```

### Cambiar Entre Equipos

```bash
# En el EQUIPO 1 (antes de cerrar)
git add .
git commit -m "feat: cambios desde portátil"
git push origin develop

# En el EQUIPO 2 (al iniciar)
git pull origin develop  # ⚠️ Obtiene cambios del portátil
# Continúas trabajando...
```

## 🎯 Comandos Útiles

### Ver Estado y Cambios

```bash
# Ver estado actual
git status

# Ver diferencias
git diff

# Ver historial de commits
git log --oneline -10

# Ver qué archivos has modificado
git status --short
```

### Trabajar con Ramas

```bash
# Ver todas las ramas
git branch -a

# Crear nueva rama
git checkout -b feature/nueva-funcionalidad

# Cambiar de rama
git checkout develop

# Ver diferencias entre ramas
git diff develop..feature/nueva-funcionalidad
```

### Sincronización

```bash
# Obtener cambios del remoto
git pull origin develop

# Subir cambios al remoto
git push origin develop

# Ver qué commits tienes que no están en remoto
git log origin/develop..HEAD

# Ver qué commits están en remoto que no tienes
git log HEAD..origin/develop
```

## ⚠️ Resolución de Conflictos

Si al hacer `git pull` aparecen conflictos:

```bash
# 1. Git te mostrará qué archivos tienen conflictos
git pull origin develop

# 2. Abre los archivos con conflictos
# Busca las marcas: <<<<<<< ======= >>>>>>>

# 3. Resuelve los conflictos manualmente
# Elimina las marcas y deja el código correcto

# 4. Marca los archivos como resueltos
git add archivo-resuelto.tsx

# 5. Completa el merge
git commit -m "fix: resolver conflictos"

# 6. Sube los cambios
git push origin develop
```

## 🔐 Configuración de SSH (Opcional pero Recomendado)

Para evitar tener que introducir credenciales cada vez:

```bash
# 1. Generar clave SSH (si no tienes una)
ssh-keygen -t ed25519 -C "tu@email.com"

# 2. Ver la clave pública
cat ~/.ssh/id_ed25519.pub

# 3. Añadir la clave en GitHub:
# Settings > SSH and GPG keys > New SSH key
# Pega el contenido de la clave pública

# 4. Cambiar el remoto a SSH (si usas HTTPS)
git remote set-url origin git@github.com:MyKaizenFit/nexfit365.git

# 5. Verificar
git remote -v
```

## 📝 Checklist de Configuración

Para cada equipo, verifica:

- [ ] Repositorio clonado
- [ ] Git configurado (nombre y email)
- [ ] Rama `develop` creada y activa
- [ ] Sincronizado con `origin/develop`
- [ ] Variables de entorno configuradas
- [ ] Proyecto funcionando localmente (Docker o sin Docker)
- [ ] Puedes hacer commits y push

## 🆘 Solución de Problemas Comunes

### "Error: no se puede hacer push porque hay cambios en remoto"

```bash
# Hacer pull primero (puede crear un merge commit)
git pull origin develop
# Resolver conflictos si los hay
git push origin develop
```

### "Error: cambios sin commitear"

```bash
# Ver qué archivos están modificados
git status

# Opción 1: Hacer commit
git add .
git commit -m "feat: cambios pendientes"
git push origin develop

# Opción 2: Guardar temporalmente (stash)
git stash
git pull origin develop
git stash pop  # Recupera tus cambios
```

### "Error: rama no existe"

```bash
# Obtener todas las ramas del remoto
git fetch origin

# Crear rama local desde remota
git checkout -b develop origin/develop
```

## 📚 Recursos Adicionales

- **WORKFLOW.md**: Flujo completo de desarrollo y producción
- **README.md**: Documentación general del proyecto
- **Git Documentation**: https://git-scm.com/doc

## ✅ Siguiente Paso

Una vez configurado tu entorno local, consulta **WORKFLOW.md** para el flujo completo de trabajo con desarrollo y producción.

