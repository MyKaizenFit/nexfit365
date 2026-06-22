# 🚀 Guía de Despliegue Local - Nex-Fit

## 📋 Prerrequisitos

- Python 3.11+
- PostgreSQL 13+ (o usar Docker)
- Redis 6+ (o usar Docker)
- Git

## 🐳 Opción 1: Despliegue con Docker (Recomendado)

### 1. Clonar y configurar
```bash
# Clonar repositorio
git clone <repository-url>
cd backend

# Copiar archivo de ejemplo
cp env.example .env
```

### 2. Configurar variables de entorno
```bash
# Editar .env con tus credenciales
nano .env

# Configuración mínima para desarrollo:
DEBUG=True
SECRET_KEY=dev-secret-key-change-in-production
DB_NAME=mykaizenfit
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=db
DB_PORT=5432
REDIS_URL=redis://redis:6379/0
```

### 3. Levantar servicios
```bash
# Construir y levantar todos los servicios
docker-compose up -d --build

# Ver logs
docker-compose logs -f

# Ver estado de servicios
docker-compose ps
```

### 4. Ejecutar migraciones y setup
```bash
# Ejecutar migraciones
docker-compose exec web python manage.py migrate

# Crear superusuario
docker-compose exec web python manage.py createsuperuser

# Crear datos demo
docker-compose exec web python manage.py seed_demo
```

### 5. Acceder a la aplicación
- **API**: http://localhost:8000/api/
- **Swagger**: http://localhost:8000/api/docs/
- **Admin**: http://localhost:8000/admin/
- **Health Check**: http://localhost:8000/api/health/

### 6. Comandos útiles de Docker
```bash
# Parar servicios
docker-compose down

# Reiniciar servicios
docker-compose restart

# Ver logs de un servicio específico
docker-compose logs -f web

# Ejecutar comandos en el contenedor
docker-compose exec web python manage.py shell
docker-compose exec web python manage.py test
```

---

## 🐍 Opción 2: Despliegue Manual

### 1. Configurar entorno virtual
```bash
# Crear entorno virtual
python -m venv .venv

# Activar entorno virtual
source .venv/bin/activate  # Linux/Mac
# o
.venv\Scripts\activate     # Windows

# Verificar Python
python --version  # Debe ser 3.11+
```

### 2. Instalar dependencias
```bash
# Actualizar pip
pip install --upgrade pip

# Instalar dependencias
pip install -r requirements.txt

# Verificar instalación
python -c "import django; print(django.get_version())"
```

### 3. Configurar PostgreSQL
```bash
# Instalar PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Instalar PostgreSQL (macOS)
brew install postgresql

# Instalar PostgreSQL (Windows)
# Descargar desde https://www.postgresql.org/download/windows/

# Crear base de datos
sudo -u postgres psql
CREATE DATABASE mykaizenfit;
CREATE USER mykaizenfit_user WITH PASSWORD 'CHANGE_ME_DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE mykaizenfit TO mykaizenfit_user;
\q
```

### 4. Configurar Redis
```bash
# Instalar Redis (Ubuntu/Debian)
sudo apt install redis-server

# Instalar Redis (macOS)
brew install redis

# Instalar Redis (Windows)
# Usar WSL2 o Docker

# Verificar Redis
redis-cli ping  # Debe responder PONG
```

### 5. Configurar variables de entorno
```bash
# Copiar archivo de ejemplo
cp env.example .env

# Editar .env
nano .env

# Configuración para desarrollo local:
DEBUG=True
SECRET_KEY=dev-secret-key-change-in-production
DB_NAME=mykaizenfit
DB_USER=mykaizenfit_user
DB_PASSWORD=CHANGE_ME_DB_PASSWORD
DB_HOST=localhost
DB_PORT=5432
DB_SSLMODE=disable
REDIS_URL=redis://localhost:6379/0
```

### 6. Ejecutar migraciones
```bash
# Crear migraciones
python manage.py makemigrations accounts
python manage.py makemigrations nutrition
python manage.py makemigrations workouts
python manage.py makemigrations progress
python manage.py makemigrations notifications
python manage.py makemigrations achievements
python manage.py makemigrations dashboard

# Aplicar migraciones
python manage.py migrate

# Ver estado de migraciones
python manage.py showmigrations
```

### 7. Crear superusuario
```bash
python manage.py createsuperuser
# Seguir las instrucciones para crear admin
```

### 8. Crear datos demo
```bash
# Crear datos de prueba
python manage.py seed_demo

# Con opciones
python manage.py seed_demo --users 10 --clear
```

### 9. Ejecutar servidor
```bash
# Servidor de desarrollo
python manage.py runserver

# Servidor en puerto específico
python manage.py runserver 8001

# Servidor accesible desde red
python manage.py runserver 0.0.0.0:8000
```

---

## 🧪 Testing

### Ejecutar tests
```bash
# Todos los tests
pytest

# Tests con cobertura
pytest --cov=. --cov-report=html

# Tests específicos
pytest accounts/tests/
pytest nutrition/tests/test_models.py

# Tests con logging detallado
pytest -v --log-cli-level=DEBUG

# Tests marcados
pytest -m "models"
pytest -m "views"
pytest -m "not slow"
```

### Ver cobertura
```bash
# Abrir reporte HTML
open htmlcov/index.html  # macOS
xdg-open htmlcov/index.html  # Linux
start htmlcov/index.html  # Windows
```

---

## 🔧 Desarrollo

### Comandos útiles
```bash
# Ver ayuda de Make
make help

# Instalar dependencias de desarrollo
make install-dev

# Formatear código
make format

# Ejecutar linting
make lint

# Limpiar archivos temporales
make clean

# Shell de Django
python manage.py shell

# Crear migraciones
python manage.py makemigrations

# Aplicar migraciones
python manage.py migrate

# Recolectar archivos estáticos
python manage.py collectstatic
```

### Pre-commit hooks
```bash
# Instalar pre-commit
pip install pre-commit
pre-commit install

# Ejecutar manualmente
pre-commit run --all-files
```

---

## 📊 Monitoreo

### Health Check
```bash
# Verificar estado de la API
curl http://localhost:8000/api/health/

# Verificar base de datos
python manage.py check --database default

# Verificar configuración
python manage.py check --deploy
```

### Logs
```bash
# Ver logs de Django
tail -f test.log

# Ver logs de Docker
docker-compose logs -f web

# Ver logs de PostgreSQL
docker-compose logs -f db

# Ver logs de Redis
docker-compose logs -f redis
```

---

## 🚨 Solución de Problemas

### Error de conexión a base de datos
```bash
# Verificar PostgreSQL
sudo systemctl status postgresql

# Verificar conexión
psql -h localhost -U mykaizenfit_user -d mykaizenfit

# Verificar variables de entorno
python manage.py print_db_config
```

### Error de Redis
```bash
# Verificar Redis
redis-cli ping

# Verificar variables de entorno
echo $REDIS_URL
```

### Error de migraciones
```bash
# Ver estado
python manage.py showmigrations

# Resetear migraciones (¡CUIDADO!)
python manage.py migrate --fake accounts zero
python manage.py migrate accounts

# Crear migraciones desde cero
rm -rf */migrations/0*.py
python manage.py makemigrations
python manage.py migrate
```

### Error de permisos
```bash
# Verificar permisos de archivos
ls -la

# Cambiar permisos si es necesario
chmod 755 manage.py
chmod -R 755 */
```

---

## 📱 Acceso a la Aplicación

### URLs principales
- **API Base**: http://localhost:8000/api/
- **Swagger UI**: http://localhost:8000/api/docs/
- **OpenAPI Schema**: http://localhost:8000/api/schema/
- **Admin Panel**: http://localhost:8000/admin/
- **Health Check**: http://localhost:8000/api/health/

### Usuarios demo (después de seed_demo)
- **Admin**: admin@example.invalid / ChangeMeAdmin123!
- **Trainer**: trainer@example.invalid / ChangeMeTrainer123!
- **User**: user1@example.invalid / ChangeMeUser123!

### Autenticación
```bash
# Obtener token JWT
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.invalid", "password": "ChangeMeAdmin123!"}'

# Usar token en requests
curl -X GET http://localhost:8000/api/me/ \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🎯 Próximos Pasos

1. **Configurar entorno** siguiendo una de las opciones arriba
2. **Ejecutar migraciones** para crear las tablas
3. **Crear superusuario** para acceder al admin
4. **Crear datos demo** para testing
5. **Ejecutar tests** para verificar funcionamiento
6. **Explorar la API** usando Swagger UI
7. **Personalizar configuración** según necesidades

---

**¡Listo para desarrollar! 🚀**

Para más ayuda, consulta:
- [README.md](../README.md) - Documentación general
- [urls.md](./urls.md) - Documentación de endpoints
- [Issues de GitHub](https://github.com/your-repo/issues) - Reportar problemas 