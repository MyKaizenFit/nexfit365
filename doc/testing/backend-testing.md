# 🧪 Testing Backend - Nex-Fit

## 📋 Resumen

Esta guía cubre todas las estrategias de testing para el backend Django de Nex-Fit, incluyendo tests unitarios, de integración, de API y de base de datos.

## 🏗️ Arquitectura de Testing

### **Stack de Testing**
- **Framework**: pytest + pytest-django
- **Base de Datos**: SQLite en memoria para tests
- **Mocking**: unittest.mock + pytest-mock
- **Cobertura**: pytest-cov
- **Fixtures**: pytest fixtures para datos de prueba

### **Estructura de Directorios**
```
backend/
├── tests/
│   ├── __init__.py
│   ├── conftest.py              # Fixtures globales
│   ├── test_settings.py         # Configuración de testing
│   ├── unit/                    # Tests unitarios
│   │   ├── test_models.py
│   │   ├── test_serializers.py
│   │   └── test_utils.py
│   ├── integration/             # Tests de integración
│   │   ├── test_api_endpoints.py
│   │   ├── test_authentication.py
│   │   └── test_workflows.py
│   ├── fixtures/                # Datos de prueba
│   │   ├── users.json
│   │   ├── workouts.json
│   │   └── nutrition.json
│   └── e2e/                     # Tests end-to-end
│       ├── test_user_journey.py
│       └── test_admin_workflow.py
```

## ⚙️ Configuración

### **1. Instalación de Dependencias**
```bash
# Instalar dependencias de testing
pip install pytest pytest-django pytest-cov pytest-mock factory-boy

# Agregar a requirements.txt
echo "pytest==7.4.3" >> requirements.txt
echo "pytest-django==4.7.0" >> requirements.txt
echo "pytest-cov==4.1.0" >> requirements.txt
echo "pytest-mock==3.12.0" >> requirements.txt
echo "factory-boy==3.3.0" >> requirements.txt
```

### **2. Configuración pytest.ini**
```ini
# pytest.ini
[tool:pytest]
DJANGO_SETTINGS_MODULE = test_settings
python_files = tests.py test_*.py *_tests.py
addopts = 
    --reuse-db
    --nomigrations
    --tb=short
    --cov=.
    --cov-report=html
    --cov-report=term-missing
    --cov-fail-under=90
testpaths = tests
```

### **3. Configuración de Testing (test_settings.py)**
```python
# backend/test_settings.py
import os
from .sett                                         ings import *

# Base de datos de testing
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Configuración de testing
DEBUG = False
SECRET_KEY = 'test-secret-key-not-for-production'

# Deshabilitar migraciones en tests
class DisableMigrations:
    def __contains__(self, item):
        return True
    
    def __getitem__(self, item):
        return None

MIGRATION_MODULES = DisableMigrations()

# Configuración de archivos estáticos
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'

# Configuración de caché para testing
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}

# Configuración de logging para tests
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'WARNING',
        },
    },
}

# Configuración de JWT para testing
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=5),
    'REFRESH_TOKEN_LIFETIME': timedelta(minutes=10),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

# Deshabilitar throttling en tests
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_RATES': {
        'anon': '1000/min',
        'user': '1000/min',
    }
}
```

## 🧪 Tests Unitarios

### **1. Tests de Modelos (test_models.py)**
```python
# tests/unit/test_models.py
import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from accounts.models import CustomUser
from workouts.models import WorkoutProgram, WorkoutSession
from nutrition.models import NutritionPlan, Meal
from progress.models import ProgressPhoto, BodyMeasurement

class TestCustomUserModel:
    """Tests para el modelo CustomUser"""
    
    def test_create_user(self):
        """Test crear usuario básico"""
        user = CustomUser.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        assert user.username == 'testuser'
        assert user.email == 'test@example.com'
        assert user.check_password('testpass123')
        assert user.is_active is True
        assert user.is_staff is False
        assert user.role == 'user'
    
    def test_create_superuser(self):
        """Test crear superusuario"""
        admin = CustomUser.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='adminpass123'
        )
        assert admin.is_superuser is True
        assert admin.is_staff is True
        assert admin.role == 'admin'
    
    def test_user_str_representation(self):
        """Test representación string del usuario"""
        user = CustomUser.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        assert str(user) == 'testuser'
    
    def test_user_email_unique(self):
        """Test que el email sea único"""
        CustomUser.objects.create_user(
            username='user1',
            email='test@example.com',
            password='testpass123'
        )
        
        with pytest.raises(IntegrityError):
            CustomUser.objects.create_user(
                username='user2',
                email='test@example.com',
                password='testpass123'
            )
    
    def test_user_validation(self):
        """Test validaciones del usuario"""
        # Email requerido
        with pytest.raises(ValueError):
            CustomUser.objects.create_user(
                username='testuser',
                email='',
                password='testpass123'
            )
        
        # Username requerido
        with pytest.raises(ValueError):
            CustomUser.objects.create_user(
                username='',
                email='test@example.com',
                password='testpass123'
            )

class TestWorkoutProgramModel:
    """Tests para el modelo WorkoutProgram"""
    
    @pytest.fixture
    def user(self):
        return CustomUser.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_create_workout_program(self, user):
        """Test crear programa de entrenamiento"""
        program = WorkoutProgram.objects.create(
            name='Test Program',
            description='Test Description',
            difficulty='beginner',
            duration_weeks=4,
            created_by=user
        )
        assert program.name == 'Test Program'
        assert program.difficulty == 'beginner'
        assert program.created_by == user
        assert program.is_public is False
    
    def test_workout_program_str(self, user):
        """Test representación string del programa"""
        program = WorkoutProgram.objects.create(
            name='Test Program',
            description='Test Description',
            difficulty='beginner',
            duration_weeks=4,
            created_by=user
        )
        assert str(program) == 'Test Program'
    
    def test_workout_program_tags(self, user):
        """Test manejo de tags JSON"""
        program = WorkoutProgram.objects.create(
            name='Test Program',
            description='Test Description',
            difficulty='beginner',
            duration_weeks=4,
            created_by=user,
            tags=['strength', 'cardio']
        )
        assert program.tags == ['strength', 'cardio']

class TestNutritionPlanModel:
    """Tests para el modelo NutritionPlan"""
    
    @pytest.fixture
    def user(self):
        return CustomUser.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_create_nutrition_plan(self, user):
        """Test crear plan nutricional"""
        plan = NutritionPlan.objects.create(
            user=user,
            name='Test Plan',
            daily_calories=2000,
            protein_goal=150,
            carbs_goal=200,
            fat_goal=80
        )
        assert plan.user == user
        assert plan.daily_calories == 2000
        assert plan.is_active is True
    
    def test_nutrition_plan_calculations(self, user):
        """Test cálculos nutricionales"""
        plan = NutritionPlan.objects.create(
            user=user,
            name='Test Plan',
            daily_calories=2000,
            protein_goal=150,
            carbs_goal=200,
            fat_goal=80
        )
        
        # Verificar que las calorías coincidan
        protein_calories = plan.protein_goal * 4
        carbs_calories = plan.carbs_goal * 4
        fat_calories = plan.fat_goal * 9
        total_calculated = protein_calories + carbs_calories + fat_calories
        
        assert total_calculated == 2000

class TestProgressPhotoModel:
    """Tests para el modelo ProgressPhoto"""
    
    @pytest.fixture
    def user(self):
        return CustomUser.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_create_progress_photo(self, user):
        """Test crear foto de progreso"""
        photo = ProgressPhoto.objects.create(
            user=user,
            date='2024-01-01',
            photo='test_photo.jpg',
            category='front'
        )
        assert photo.user == user
        assert photo.category == 'front'
        assert photo.is_public is False
    
    def test_progress_photo_str(self, user):
        """Test representación string de la foto"""
        photo = ProgressPhoto.objects.create(
            user=user,
            date='2024-01-01',
            photo='test_photo.jpg',
            category='front'
        )
        expected = f"Progress Photo - {user.username} - 2024-01-01"
        assert str(photo) == expected
```

### **2. Tests de Serializers (test_serializers.py)**
```python
# tests/unit/test_serializers.py
import pytest
from rest_framework.exceptions import ValidationError
from accounts.serializers import CustomUserSerializer
from workouts.serializers import WorkoutProgramSerializer
from nutrition.serializers import NutritionPlanSerializer

class TestCustomUserSerializer:
    """Tests para CustomUserSerializer"""
    
    def test_serialize_user(self):
        """Test serialización de usuario"""
        user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'first_name': 'Test',
            'last_name': 'User',
            'role': 'user'
        }
        serializer = CustomUserSerializer(data=user_data)
        assert serializer.is_valid()
        assert serializer.validated_data['username'] == 'testuser'
    
    def test_serialize_user_invalid_email(self):
        """Test validación de email inválido"""
        user_data = {
            'username': 'testuser',
            'email': 'invalid-email',
            'first_name': 'Test',
            'last_name': 'User'
        }
        serializer = CustomUserSerializer(data=user_data)
        assert not serializer.is_valid()
        assert 'email' in serializer.errors
    
    def test_serialize_user_missing_required_fields(self):
        """Test validación de campos requeridos"""
        user_data = {
            'username': 'testuser',
            # email faltante
        }
        serializer = CustomUserSerializer(data=user_data)
        assert not serializer.is_valid()
        assert 'email' in serializer.errors

class TestWorkoutProgramSerializer:
    """Tests para WorkoutProgramSerializer"""
    
    def test_serialize_workout_program(self):
        """Test serialización de programa de entrenamiento"""
        program_data = {
            'name': 'Test Program',
            'description': 'Test Description',
            'difficulty': 'beginner',
            'duration_weeks': 4,
            'tags': ['strength', 'cardio']
        }
        serializer = WorkoutProgramSerializer(data=program_data)
        assert serializer.is_valid()
        assert serializer.validated_data['name'] == 'Test Program'
    
    def test_serialize_workout_program_invalid_difficulty(self):
        """Test validación de dificultad inválida"""
        program_data = {
            'name': 'Test Program',
            'description': 'Test Description',
            'difficulty': 'invalid_difficulty',
            'duration_weeks': 4
        }
        serializer = WorkoutProgramSerializer(data=program_data)
        assert not serializer.is_valid()
        assert 'difficulty' in serializer.errors
    
    def test_serialize_workout_program_negative_duration(self):
        """Test validación de duración negativa"""
        program_data = {
            'name': 'Test Program',
            'description': 'Test Description',
            'difficulty': 'beginner',
            'duration_weeks': -1
        }
        serializer = WorkoutProgramSerializer(data=program_data)
        assert not serializer.is_valid()
        assert 'duration_weeks' in serializer.errors
```

## 🔗 Tests de Integración

### **1. Tests de API Endpoints (test_api_endpoints.py)**
```python
# tests/integration/test_api_endpoints.py
import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

class TestAuthenticationEndpoints:
    """Tests para endpoints de autenticación"""
    
    @pytest.fixture
    def client(self):
        return APIClient()
    
    @pytest.fixture
    def user(self):
        return User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_login_success(self, client, user):
        """Test login exitoso"""
        url = reverse('api:auth:login')
        data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        response = client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data
    
    def test_login_invalid_credentials(self, client):
        """Test login con credenciales inválidas"""
        url = reverse('api:auth:login')
        data = {
            'email': 'test@example.com',
            'password': 'wrongpassword'
        }
        response = client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_register_success(self, client):
        """Test registro exitoso"""
        url = reverse('api:auth:register')
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'newpass123',
            'first_name': 'New',
            'last_name': 'User'
        }
        response = client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert User.objects.filter(email='newuser@example.com').exists()
    
    def test_register_duplicate_email(self, client, user):
        """Test registro con email duplicado"""
        url = reverse('api:auth:register')
        data = {
            'username': 'anotheruser',
            'email': 'test@example.com',  # Email ya existe
            'password': 'newpass123',
            'first_name': 'Another',
            'last_name': 'User'
        }
        response = client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'email' in response.data
    
    def test_refresh_token(self, client, user):
        """Test renovación de token"""
        refresh = RefreshToken.for_user(user)
        url = reverse('api:auth:refresh')
        data = {'refresh': str(refresh)}
        response = client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
    
    def test_logout(self, client, user):
        """Test logout"""
        refresh = RefreshToken.for_user(user)
        client.force_authenticate(user=user)
        
        url = reverse('api:auth:logout')
        data = {'refresh': str(refresh)}
        response = client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_205_RESET_CONTENT

class TestWorkoutEndpoints:
    """Tests para endpoints de entrenamientos"""
    
    @pytest.fixture
    def client(self):
        return APIClient()
    
    @pytest.fixture
    def user(self):
        return User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    @pytest.fixture
    def auth_client(self, client, user):
        refresh = RefreshToken.for_user(user)
        client.force_authenticate(user=user)
        return client
    
    def test_create_workout_program(self, auth_client):
        """Test crear programa de entrenamiento"""
        url = reverse('api:workouts:program-list')
        data = {
            'name': 'Test Program',
            'description': 'Test Description',
            'difficulty': 'beginner',
            'duration_weeks': 4,
            'tags': ['strength', 'cardio']
        }
        response = auth_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Test Program'
    
    def test_list_workout_programs(self, auth_client):
        """Test listar programas de entrenamiento"""
        url = reverse('api:workouts:program-list')
        response = auth_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)
    
    def test_get_workout_program_detail(self, auth_client):
        """Test obtener detalle de programa"""
        # Crear programa primero
        create_url = reverse('api:workouts:program-list')
        create_data = {
            'name': 'Test Program',
            'description': 'Test Description',
            'difficulty': 'beginner',
            'duration_weeks': 4
        }
        create_response = auth_client.post(create_url, create_data, format='json')
        program_id = create_response.data['id']
        
        # Obtener detalle
        detail_url = reverse('api:workouts:program-detail', kwargs={'pk': program_id})
        response = auth_client.get(detail_url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Test Program'
    
    def test_unauthorized_access(self, client):
        """Test acceso no autorizado"""
        url = reverse('api:workouts:program-list')
        response = client.get(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

class TestNutritionEndpoints:
    """Tests para endpoints de nutrición"""
    
    @pytest.fixture
    def client(self):
        return APIClient()
    
    @pytest.fixture
    def user(self):
        return User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    @pytest.fixture
    def auth_client(self, client, user):
        client.force_authenticate(user=user)
        return client
    
    def test_create_nutrition_plan(self, auth_client):
        """Test crear plan nutricional"""
        url = reverse('api:nutrition:plan-list')
        data = {
            'name': 'Test Plan',
            'daily_calories': 2000,
            'protein_goal': 150,
            'carbs_goal': 200,
            'fat_goal': 80
        }
        response = auth_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['daily_calories'] == 2000
    
    def test_create_meal(self, auth_client):
        """Test crear comida"""
        url = reverse('api:nutrition:meal-list')
        data = {
            'date': '2024-01-01',
            'meal_type': 'breakfast',
            'foods': [
                {
                    'name': 'Oatmeal',
                    'quantity': 100,
                    'calories': 350
                }
            ],
            'total_calories': 350
        }
        response = auth_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['total_calories'] == 350
```

## 🎯 Tests E2E (End-to-End)

### **1. Tests de Flujo de Usuario (test_user_journey.py)**
```python
# tests/e2e/test_user_journey.py
import pytest
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

class TestCompleteUserJourney(TestCase):
    """Tests de flujo completo de usuario"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
    
    def test_complete_user_registration_and_setup(self):
        """Test flujo completo de registro y configuración"""
        # 1. Registro de usuario
        register_url = reverse('api:auth:register')
        register_data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'newpass123',
            'first_name': 'New',
            'last_name': 'User'
        }
        register_response = self.client.post(register_url, register_data, format='json')
        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        
        # 2. Login
        login_url = reverse('api:auth:login')
        login_data = {
            'email': 'newuser@example.com',
            'password': 'newpass123'
        }
        login_response = self.client.post(login_url, login_data, format='json')
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        
        access_token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        # 3. Crear plan nutricional
        nutrition_url = reverse('api:nutrition:plan-list')
        nutrition_data = {
            'name': 'My Plan',
            'daily_calories': 2000,
            'protein_goal': 150,
            'carbs_goal': 200,
            'fat_goal': 80
        }
        nutrition_response = self.client.post(nutrition_url, nutrition_data, format='json')
        self.assertEqual(nutrition_response.status_code, status.HTTP_201_CREATED)
        
        # 4. Crear programa de entrenamiento
        workout_url = reverse('api:workouts:program-list')
        workout_data = {
            'name': 'My Workout',
            'description': 'My workout program',
            'difficulty': 'beginner',
            'duration_weeks': 4,
            'tags': ['strength']
        }
        workout_response = self.client.post(workout_url, workout_data, format='json')
        self.assertEqual(workout_response.status_code, status.HTTP_201_CREATED)
        
        # 5. Registrar comida
        meal_url = reverse('api:nutrition:meal-list')
        meal_data = {
            'date': '2024-01-01',
            'meal_type': 'breakfast',
            'foods': [
                {
                    'name': 'Oatmeal',
                    'quantity': 100,
                    'calories': 350
                }
            ],
            'total_calories': 350
        }
        meal_response = self.client.post(meal_url, meal_data, format='json')
        self.assertEqual(meal_response.status_code, status.HTTP_201_CREATED)
        
        # 6. Registrar sesión de entrenamiento
        session_url = reverse('api:workouts:session-list')
        session_data = {
            'program': workout_response.data['id'],
            'date': '2024-01-01',
            'duration_minutes': 60,
            'notes': 'Great workout!',
            'completed': True
        }
        session_response = self.client.post(session_url, session_data, format='json')
        self.assertEqual(session_response.status_code, status.HTTP_201_CREATED)
        
        # 7. Subir foto de progreso
        progress_url = reverse('api:progress:photo-list')
        progress_data = {
            'date': '2024-01-01',
            'category': 'front',
            'notes': 'Progress photo'
        }
        # Nota: En un test real, necesitarías un archivo de imagen
        # progress_response = self.client.post(progress_url, progress_data, format='multipart')
        # self.assertEqual(progress_response.status_code, status.HTTP_201_CREATED)
        
        # 8. Obtener dashboard
        dashboard_url = reverse('api:dashboard:stats')
        dashboard_response = self.client.get(dashboard_url)
        self.assertEqual(dashboard_response.status_code, status.HTTP_200_OK)
        
        # Verificar que todos los datos están presentes
        self.assertIn('nutrition_stats', dashboard_response.data)
        self.assertIn('workout_stats', dashboard_response.data)
        self.assertIn('progress_stats', dashboard_response.data)

class TestAdminWorkflow(TestCase):
    """Tests de flujo de administrador"""
    
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='adminpass123'
        )
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_admin_can_view_all_users(self):
        """Test que admin puede ver todos los usuarios"""
        self.client.force_authenticate(user=self.admin)
        
        url = reverse('api:admin:user-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 2)  # Admin + user
    
    def test_admin_can_manage_user_data(self):
        """Test que admin puede gestionar datos de usuario"""
        self.client.force_authenticate(user=self.admin)
        
        # Obtener usuario
        user_url = reverse('api:admin:user-detail', kwargs={'pk': self.user.id})
        user_response = self.client.get(user_url)
        self.assertEqual(user_response.status_code, status.HTTP_200_OK)
        
        # Actualizar usuario
        update_data = {
            'first_name': 'Updated',
            'last_name': 'Name'
        }
        update_response = self.client.patch(user_url, update_data, format='json')
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        
        # Verificar actualización
        updated_user = User.objects.get(id=self.user.id)
        self.assertEqual(updated_user.first_name, 'Updated')
        self.assertEqual(updated_user.last_name, 'Name')
```

## 📊 Fixtures y Datos de Prueba

### **1. Fixtures Globales (conftest.py)**
```python
# tests/conftest.py
import pytest
from django.contrib.auth import get_user_model
from factory import Faker, SubFactory
from factory.django import DjangoModelFactory
from workouts.models import WorkoutProgram, WorkoutSession
from nutrition.models import NutritionPlan, Meal
from progress.models import ProgressPhoto, BodyMeasurement

User = get_user_model()

class UserFactory(DjangoModelFactory):
    """Factory para crear usuarios de prueba"""
    class Meta:
        model = User
    
    username = Faker('user_name')
    email = Faker('email')
    first_name = Faker('first_name')
    last_name = Faker('last_name')
    password = 'testpass123'
    role = 'user'
    is_active = True

class AdminFactory(DjangoModelFactory):
    """Factory para crear administradores"""
    class Meta:
        model = User
    
    username = Faker('user_name')
    email = Faker('email')
    first_name = Faker('first_name')
    last_name = Faker('last_name')
    password = 'adminpass123'
    role = 'admin'
    is_superuser = True
    is_staff = True
    is_active = True

class WorkoutProgramFactory(DjangoModelFactory):
    """Factory para crear programas de entrenamiento"""
    class Meta:
        model = WorkoutProgram
    
    name = Faker('sentence', nb_words=3)
    description = Faker('text', max_nb_chars=200)
    difficulty = Faker('random_element', elements=['beginner', 'intermediate', 'advanced'])
    duration_weeks = Faker('random_int', min=1, max=12)
    created_by = SubFactory(UserFactory)
    is_public = False
    tags = Faker('random_elements', elements=['strength', 'cardio', 'flexibility'], unique=True)

class NutritionPlanFactory(DjangoModelFactory):
    """Factory para crear planes nutricionales"""
    class Meta:
        model = NutritionPlan
    
    user = SubFactory(UserFactory)
    name = Faker('sentence', nb_words=2)
    daily_calories = Faker('random_int', min=1200, max=3000)
    protein_goal = Faker('random_int', min=50, max=200)
    carbs_goal = Faker('random_int', min=100, max=400)
    fat_goal = Faker('random_int', min=30, max=150)
    is_active = True

class MealFactory(DjangoModelFactory):
    """Factory para crear comidas"""
    class Meta:
        model = Meal
    
    user = SubFactory(UserFactory)
    date = Faker('date_this_year')
    meal_type = Faker('random_element', elements=['breakfast', 'lunch', 'dinner', 'snack'])
    foods = Faker('json', data_type='list', value_types=['str', 'int'])
    total_calories = Faker('random_int', min=100, max=800)
    notes = Faker('text', max_nb_chars=100)

# Fixtures globales
@pytest.fixture
def user():
    """Fixture para usuario básico"""
    return UserFactory()

@pytest.fixture
def admin():
    """Fixture para administrador"""
    return AdminFactory()

@pytest.fixture
def workout_program(user):
    """Fixture para programa de entrenamiento"""
    return WorkoutProgramFactory(created_by=user)

@pytest.fixture
def nutrition_plan(user):
    """Fixture para plan nutricional"""
    return NutritionPlanFactory(user=user)

@pytest.fixture
def meal(user):
    """Fixture para comida"""
    return MealFactory(user=user)

@pytest.fixture
def multiple_users():
    """Fixture para múltiples usuarios"""
    return UserFactory.create_batch(5)

@pytest.fixture
def workout_programs(user):
    """Fixture para múltiples programas"""
    return WorkoutProgramFactory.create_batch(3, created_by=user)
```

## 🚀 Comandos de Testing

### **1. Ejecutar Tests**
```bash
# Ejecutar todos los tests
pytest

# Ejecutar tests específicos
pytest tests/unit/test_models.py
pytest tests/integration/test_api_endpoints.py
pytest tests/e2e/test_user_journey.py

# Ejecutar tests con cobertura
pytest --cov=. --cov-report=html --cov-report=term-missing

# Ejecutar tests en paralelo
pytest -n auto

# Ejecutar tests con verbose
pytest -v

# Ejecutar tests y parar en el primer fallo
pytest -x

# Ejecutar tests y mostrar output de print
pytest -s
```

### **2. Comandos de Cobertura**
```bash
# Generar reporte de cobertura HTML
pytest --cov=. --cov-report=html
open htmlcov/index.html

# Generar reporte de cobertura XML (para CI/CD)
pytest --cov=. --cov-report=xml

# Verificar cobertura mínima
pytest --cov=. --cov-fail-under=90
```

### **3. Comandos de Debugging**
```bash
# Ejecutar tests con debugging
pytest --pdb

# Ejecutar tests con logging
pytest --log-cli-level=DEBUG

# Ejecutar tests específicos con debugging
pytest tests/unit/test_models.py::TestCustomUserModel::test_create_user --pdb
```

## 📈 Métricas y Reportes

### **1. Configuración de Cobertura**
```ini
# .coveragerc
[run]
source = .
omit = 
    */migrations/*
    */venv/*
    */env/*
    */tests/*
    */test_settings.py
    manage.py
    */settings.py

[report]
exclude_lines =
    pragma: no cover
    def __repr__
    if self.debug:
    if settings.DEBUG
    raise AssertionError
    raise NotImplementedError
    if 0:
    if __name__ == .__main__.:
    class .*\bProtocol\):
    @(abc\.)?abstractmethod
```

### **2. Reportes de Testing**
```bash
# Generar reporte completo
pytest --cov=. --cov-report=html --cov-report=term-missing --junitxml=test-results.xml

# Verificar cobertura por módulo
pytest --cov=. --cov-report=term-missing | grep -E "(TOTAL|accounts|workouts|nutrition|progress)"
```

## 🔧 Configuración CI/CD

### **1. GitHub Actions (.github/workflows/test.yml)**
```yaml
name: Backend Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        cd backend
        python -m pip install --upgrade pip
        pip install -r requirements.txt
    
    - name: Run tests
      run: |
        cd backend
        pytest --cov=. --cov-report=xml --cov-report=html --junitxml=test-results.xml
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./backend/coverage.xml
        flags: backend
        name: backend-coverage
    
    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-results
        path: backend/test-results.xml
```

## 📚 Mejores Prácticas

### **1. Naming Conventions**
- Tests unitarios: `test_<function_name>_<scenario>`
- Tests de integración: `test_<endpoint>_<method>_<scenario>`
- Tests E2E: `test_<user_journey>_<scenario>`

### **2. Estructura de Tests**
```python
def test_function_name_scenario(self):
    """Test descripción clara del escenario"""
    # Arrange - Preparar datos
    # Act - Ejecutar acción
    # Assert - Verificar resultado
```

### **3. Fixtures y Factories**
- Usar factories para datos de prueba
- Fixtures para setup común
- Cleanup automático con `@pytest.fixture(autouse=True)`

### **4. Assertions**
- Usar assertions específicas
- Un assertion por test cuando sea posible
- Mensajes descriptivos en assertions

### **5. Mocking**
- Mock servicios externos
- Mock requests HTTP
- Mock time/date para tests determinísticos

---

*Documentación de Testing Backend v1.0 - Nex-Fit*  
*Última actualización: Diciembre 2024*
