# 🔧 Documentación Técnica Backend - Nex-Fit

## 🏗️ Arquitectura del Sistema

### **Stack Tecnológico**
- **Framework**: Django 4.2 LTS
- **API**: Django REST Framework (DRF) 3.14+
- **Base de Datos**: SQLite (desarrollo) / PostgreSQL (producción)
- **Autenticación**: JWT (Simple JWT)
- **Cache**: Redis (opcional)
- **Documentación API**: drf-yasg (Swagger/OpenAPI)
- **Testing**: pytest + Django TestCase

### **Arquitectura de Aplicaciones**
```
backend/
├── 📁 accounts/          // Gestión de usuarios y autenticación
├── 📁 api/               // Endpoints principales y autenticación
├── 📁 workouts/          // Gestión de entrenamientos
├── 📁 nutrition/         // Planificación nutricional
├── 📁 progress/          // Seguimiento del progreso
├── 📁 achievements/      // Sistema de logros y badges
├── 📁 notifications/     // Sistema de notificaciones
├── 📁 dashboard/         // Datos del dashboard
└── 📁 backend/           // Configuración principal
```

## 🔐 Sistema de Autenticación

### **JWT Implementation**
```python
# Configuración JWT en settings.py
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
}
```

### **Endpoints de Autenticación**
- `POST /api/auth/login/` - Login de usuario
- `POST /api/auth/register/` - Registro de usuario
- `POST /api/auth/refresh/` - Renovar token
- `POST /api/auth/logout/` - Logout y blacklist token
- `GET /api/auth/me/` - Información del usuario actual

### **Modelo de Usuario Personalizado**
```python
class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    height = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    fitness_goals = models.JSONField(default=dict)
    is_verified = models.BooleanField(default=False)
```

## 🏋️ Módulo de Entrenamientos

### **Modelos Principales**
```python
class WorkoutProgram(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField()
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES)
    duration_weeks = models.PositiveIntegerField()
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    is_public = models.BooleanField(default=False)
    tags = models.JSONField(default=list)

class WorkoutSession(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    program = models.ForeignKey(WorkoutProgram, on_delete=models.CASCADE)
    date = models.DateField()
    duration_minutes = models.PositiveIntegerField()
    notes = models.TextField(blank=True)
    completed = models.BooleanField(default=False)
```

### **Endpoints de Entrenamientos**
- `GET /api/workouts/programs/` - Listar programas
- `POST /api/workouts/programs/` - Crear programa
- `GET /api/workouts/programs/{id}/` - Detalle de programa
- `PUT /api/workouts/programs/{id}/` - Actualizar programa
- `DELETE /api/workouts/programs/{id}/` - Eliminar programa
- `GET /api/workouts/sessions/` - Historial de sesiones
- `POST /api/workouts/sessions/` - Registrar sesión

## 🥗 Módulo de Nutrición

### **Modelos Principales**
```python
class NutritionPlan(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    daily_calories = models.PositiveIntegerField()
    protein_goal = models.PositiveIntegerField()  # gramos
    carbs_goal = models.PositiveIntegerField()    # gramos
    fat_goal = models.PositiveIntegerField()      # gramos
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

class Meal(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    date = models.DateField()
    meal_type = models.CharField(max_length=20, choices=MEAL_TYPE_CHOICES)
    foods = models.JSONField()  # Lista de alimentos con cantidades
    total_calories = models.PositiveIntegerField()
    notes = models.TextField(blank=True)
```

### **Endpoints de Nutrición**
- `GET /api/nutrition/plans/` - Planes nutricionales
- `POST /api/nutrition/plans/` - Crear plan
- `GET /api/nutrition/meals/` - Historial de comidas
- `POST /api/nutrition/meals/` - Registrar comida
- `GET /api/nutrition/analytics/` - Estadísticas nutricionales

## 📊 Módulo de Progreso

### **Modelos Principales**
```python
class ProgressPhoto(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    date = models.DateField()
    photo = models.ImageField(upload_to='progress_photos/')
    category = models.CharField(max_length=20, choices=PHOTO_CATEGORIES)
    notes = models.TextField(blank=True)
    is_public = models.BooleanField(default=False)

class BodyMeasurement(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    date = models.DateField()
    weight = models.DecimalField(max_digits=5, decimal_places=2)
    chest = models.DecimalField(max_digits=5, decimal_places=2, null=True)
    waist = models.DecimalField(max_digits=5, decimal_places=2, null=True)
    hips = models.DecimalField(max_digits=5, decimal_places=2, null=True)
    biceps = models.DecimalField(max_digits=5, decimal_places=2, null=True)
    thighs = models.DecimalField(max_digits=5, decimal_places=2, null=True)
```

### **Endpoints de Progreso**
- `GET /api/progress/photos/` - Fotos de progreso
- `POST /api/progress/photos/` - Subir foto
- `GET /api/progress/measurements/` - Medidas corporales
- `POST /api/progress/measurements/` - Registrar medidas
- `GET /api/progress/analytics/` - Gráficos de progreso

## 🏆 Sistema de Logros

### **Modelos Principales**
```python
class Achievement(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField()
    icon = models.CharField(max_length=100)  # Nombre del icono
    category = models.CharField(max_length=20, choices=ACHIEVEMENT_CATEGORIES)
    criteria = models.JSONField()  # Criterios para desbloquear
    points = models.PositiveIntegerField(default=0)

class UserAchievement(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE)
    unlocked_at = models.DateTimeField(auto_now_add=True)
    progress = models.PositiveIntegerField(default=0)  # Para logros progresivos
```

### **Endpoints de Logros**
- `GET /api/achievements/` - Listar logros disponibles
- `GET /api/achievements/my/` - Logros del usuario
- `GET /api/achievements/leaderboard/` - Tabla de clasificación

## 🔔 Sistema de Notificaciones

### **Modelos Principales**
```python
class Notification(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    data = models.JSONField(default=dict)  # Datos adicionales
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
```

### **Endpoints de Notificaciones**
- `GET /api/notifications/` - Listar notificaciones
- `POST /api/notifications/{id}/read/` - Marcar como leída
- `DELETE /api/notifications/{id}/` - Eliminar notificación

## 🗄️ Base de Datos

### **Configuración PostgreSQL**
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST'),
        'PORT': os.getenv('DB_PORT', '5432'),
        'OPTIONS': {'sslmode': os.getenv('DB_SSLMODE', 'require')},
    }
}
```

### **Migraciones**
```bash
# Crear migraciones
python manage.py makemigrations

# Aplicar migraciones
python manage.py migrate

# Ver estado de migraciones
python manage.py showmigrations
```

## 🧪 Testing

### **Configuración pytest**
```ini
# pytest.ini
[tool:pytest]
DJANGO_SETTINGS_MODULE = test_settings
python_files = tests.py test_*.py *_tests.py
addopts = --reuse-db --nomigrations --tb=short
```

### **Ejecutar Tests**
```bash
# Todos los tests
pytest

# Tests específicos
pytest accounts/tests/
pytest workouts/tests/test_views.py

# Con coverage
pytest --cov=. --cov-report=html
```

## 🚀 Despliegue

### **Variables de Entorno Requeridas**
```bash
# Base de datos (desarrollo)
DATABASE_URL=sqlite:///db.sqlite3

# Base de datos (producción)
# DB_NAME=tu_base_datos
# DB_USER=tu_usuario
# DB_PASSWORD=tu_contraseña
# DB_HOST=tu_host
# DB_PORT=5432
# DB_SSLMODE=require

# Django
SECRET_KEY=tu-clave-secreta-muy-larga-y-segura
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# JWT
JWT_ACCESS_TOKEN_LIFETIME=60
JWT_REFRESH_TOKEN_LIFETIME=7

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### **Comandos de Despliegue**
```bash
# Instalar dependencias
pip install -r requirements.txt

# Aplicar migraciones
python manage.py migrate

# Recolectar archivos estáticos
python manage.py collectstatic

# Crear superusuario
python manage.py createsuperuser

# Ejecutar servidor
python manage.py runserver
```

## 📚 Documentación API

### **Swagger/OpenAPI**
- **URL**: `/api/docs/`
- **Redoc**: `/api/redoc/`
- **Formato**: OpenAPI 3.0

### **Ejemplo de Endpoint Documentado**
```python
@swagger_auto_schema(
    operation_description="Crear un nuevo programa de entrenamiento",
    request_body=WorkoutProgramSerializer,
    responses={
        201: WorkoutProgramSerializer,
        400: 'Bad Request',
        401: 'Unauthorized',
    }
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_workout_program(request):
    # Implementación del endpoint
    pass
```

## 🔒 Seguridad

### **Permisos y Autenticación**
- **IsAuthenticated**: Usuario debe estar logueado
- **IsOwner**: Usuario debe ser propietario del recurso
- **IsAdmin**: Usuario debe ser administrador
- **Custom Permissions**: Permisos específicos por módulo

### **Validación de Datos**
- **Serializers**: Validación automática de datos
- **Model Validation**: Validación a nivel de modelo
- **Custom Validators**: Validadores personalizados
- **Rate Limiting**: Límites de requests por usuario

---

## 📖 Próximos Pasos

- [API Reference](./api-reference.md) - Documentación completa de endpoints
- [Configuración](./configuration.md) - Setup detallado del sistema
- [Despliegue](./deployment.md) - Guía de producción
- [Testing](./testing.md) - Estrategias de testing

---

*Documentación Backend v1.1 - Nex-Fit*
*Última actualización: Diciembre 2024*
