# 🧪 Guía de Testing - Nex-Fit

## 📋 Índice

- [Configuración de Tests](#configuración-de-tests)
- [Ejecutar Tests](#ejecutar-tests)
- [Estructura de Tests](#estructura-de-tests)
- [Cobertura](#cobertura)
- [Logging de Tests](#logging-de-tests)
- [Factories y Fixtures](#factories-y-fixtures)
- [Tests de Integración](#tests-de-integración)
- [Tests de Performance](#tests-de-performance)

---

## ⚙️ Configuración de Tests

### Archivos de Configuración

- **`pytest.ini`**: Configuración principal de pytest
- **`test_settings.py`**: Configuración específica para tests
- **`.coveragerc`**: Configuración de cobertura

### Configuración de Logging

Los tests usan una configuración especial de logging que incluye:

- **Console Handler**: Muestra logs en consola con formato especial
- **File Handler**: Guarda logs detallados en `test.log`
- **Nivel DEBUG**: Para capturar toda la información

### Configuración de Base de Datos

- **SQLite en memoria**: Para tests rápidos
- **Transacciones**: Cada test se ejecuta en una transacción
- **Rollback automático**: Los datos se limpian automáticamente

---

## 🚀 Ejecutar Tests

### Comandos Básicos

```bash
# Todos los tests
pytest

# Tests con verbose
pytest -v

# Tests con cobertura
pytest --cov=. --cov-report=html

# Tests específicos
pytest accounts/tests/
pytest nutrition/tests/test_models.py

# Tests por marcadores
pytest -m "models"
pytest -m "views"
pytest -m "not slow"
```

### Comandos con Make

```bash
# Ejecutar tests
make test

# Tests con cobertura
make test-cov

# Limpiar archivos de test
make clean
```

### Opciones Avanzadas

```bash
# Tests con logging detallado
pytest -v --log-cli-level=DEBUG

# Tests con duración
pytest --durations=10

# Tests con fallo rápido
pytest --maxfail=3

# Tests paralelos
pytest -n auto

# Tests con reporte HTML
pytest --cov=. --cov-report=html --cov-report=term-missing
```

---

## 🏗️ Estructura de Tests

### Organización de Directorios

```
backend/
├── accounts/
│   └── tests/
│       ├── __init__.py
│       ├── test_models.py
│       ├── test_views.py
│       ├── test_serializers.py
│       └── test_permissions.py
├── nutrition/
│   └── tests/
│       ├── __init__.py
│       ├── test_models.py
│       └── test_views.py
├── workouts/
│   └── tests/
│       ├── __init__.py
│       ├── test_models.py
│       └── test_views.py
├── progress/
│   └── tests/
│       ├── __init__.py
│       ├── test_models.py
│       └── test_views.py
├── notifications/
│   └── tests/
│       ├── __init__.py
│       ├── test_models.py
│       └── test_views.py
├── achievements/
│   └── tests/
│       ├── __init__.py
│       ├── test_models.py
│       └── test_views.py
└── dashboard/
    └── tests/
        ├── __init__.py
        ├── test_models.py
        └── test_views.py
```

### Convenciones de Nomenclatura

- **Archivos**: `test_*.py`
- **Clases**: `Test*`
- **Métodos**: `test_*`
- **Marcadores**: `@pytest.mark.*`

### Ejemplo de Test

```python
import pytest
from django.test import TestCase
from accounts.models import CustomUser

@pytest.mark.django_db
class TestCustomUser(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )
    
    def test_user_creation(self):
        """Test que el usuario se crea correctamente"""
        self.assertEqual(self.user.email, "test@example.com")
        self.assertTrue(self.user.check_password("testpass123"))
    
    def test_user_str_representation(self):
        """Test la representación string del usuario"""
        self.assertEqual(str(self.user), "test@example.com")
```

---

## 📊 Cobertura

### Objetivos de Cobertura

- **Global**: ≥85%
- **Models**: ≥90%
- **Views**: ≥85%
- **Serializers**: ≥90%
- **Permissions**: ≥85%

### Generar Reporte de Cobertura

```bash
# Cobertura básica
pytest --cov=.

# Cobertura con reporte HTML
pytest --cov=. --cov-report=html

# Cobertura con reporte XML (para CI)
pytest --cov=. --cov-report=xml

# Cobertura con umbral mínimo
pytest --cov=. --cov-fail-under=85
```

### Ver Reporte de Cobertura

```bash
# Abrir reporte HTML
open htmlcov/index.html          # macOS
xdg-open htmlcov/index.html      # Linux
start htmlcov/index.html         # Windows

# Ver en terminal
pytest --cov=. --cov-report=term-missing
```

### Configuración de Cobertura

```ini
# pytest.ini
addopts = 
    --cov=.
    --cov-report=html
    --cov-report=term-missing
    --cov-fail-under=85
```

---

## 📝 Logging de Tests

### Configuración de Logging

Los tests generan logs detallados en:

- **Consola**: Formato especial con emojis
- **Archivo**: `test.log` con formato verbose

### Formato de Logs

```bash
🧪 [DEBUG] accounts.models: Usuario creado exitosamente
🧪 [INFO] nutrition.views: Plan nutricional creado
🧪 [WARNING] workouts.models: Ejercicio sin categoría
🧪 [ERROR] api.views: Error en endpoint
```

### Ver Logs en Tiempo Real

```bash
# Ver logs de consola
pytest -v --log-cli-level=DEBUG

# Ver logs de archivo
tail -f test.log

# Ver logs específicos
grep "ERROR" test.log
grep "accounts" test.log
```

### Logs por Módulo

```python
import logging

# Obtener logger específico
logger = logging.getLogger("accounts")
logger.info("Test de usuario ejecutándose")

# Logger para tests
test_logger = logging.getLogger("test")
test_logger.debug("Debug del test")
```

---

## 🏭 Factories y Fixtures

### Usar Factory Boy

```python
import pytest
from factory.django import DjangoModelFactory
from accounts.models import CustomUser

class UserFactory(DjangoModelFactory):
    class Meta:
        model = CustomUser
    
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    password = factory.PostGenerationMethodCall("set_password", "testpass123")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")

@pytest.mark.django_db
def test_user_factory():
    user = UserFactory()
    assert user.email.startswith("user")
    assert user.check_password("testpass123")
```

### Fixtures de Pytest

```python
import pytest
from accounts.models import CustomUser

@pytest.fixture
def user():
    """Fixture para crear usuario de prueba"""
    return CustomUser.objects.create_user(
        email="test@example.com",
        password="testpass123"
    )

@pytest.fixture
def admin_user():
    """Fixture para crear usuario admin"""
    return CustomUser.objects.create_superuser(
        email="admin@example.com",
        password="CHANGE_ME_PASSWORD"
    )

@pytest.mark.django_db
def test_with_user_fixture(user):
    """Test usando fixture de usuario"""
    assert user.email == "test@example.com"
```

---

## 🔗 Tests de Integración

### Tests de API

```python
import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from accounts.models import CustomUser

@pytest.mark.django_db
class TestUserAPI:
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )
        self.client.force_authenticate(user=self.user)
    
    def test_get_user_profile(self):
        """Test obtener perfil de usuario"""
        url = reverse("api:me")
        response = self.client.get(url)
        
        assert response.status_code == 200
        assert response.data["email"] == "test@example.com"
    
    def test_update_user_profile(self):
        """Test actualizar perfil de usuario"""
        url = reverse("api:me")
        data = {"first_name": "Nuevo Nombre"}
        response = self.client.patch(url, data)
        
        assert response.status_code == 200
        assert response.data["first_name"] == "Nuevo Nombre"
```

### Tests de Permisos

```python
import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from accounts.models import CustomUser

@pytest.mark.django_db
class TestPermissions:
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            email="user@example.com",
            password="CHANGE_ME_PASSWORD"
        )
        self.admin = CustomUser.objects.create_superuser(
            email="admin@example.com",
            password="CHANGE_ME_PASSWORD"
        )
    
    def test_user_cannot_access_admin_endpoint(self):
        """Test que usuario normal no puede acceder a endpoint admin"""
        self.client.force_authenticate(user=self.user)
        url = reverse("api:demo-admin")
        response = self.client.get(url)
        
        assert response.status_code == 403
    
    def test_admin_can_access_admin_endpoint(self):
        """Test que admin puede acceder a endpoint admin"""
        self.client.force_authenticate(user=self.admin)
        url = reverse("api:demo-admin")
        response = self.client.get(url)
        
        assert response.status_code == 200
```

---

## ⚡ Tests de Performance

### Tests de Queries

```python
import pytest
from django.test.utils import CaptureQueriesContext
from django.db import connection
from django.urls import reverse
from rest_framework.test import APIClient

@pytest.mark.django_db
def test_dashboard_queries_optimized():
    """Test que el dashboard no genera N+1 queries"""
    client = APIClient()
    # ... setup data ...
    
    with CaptureQueriesContext(connection) as ctx:
        response = client.get(reverse("api:dashboard-today"))
        assert response.status_code == 200
        
        # Verificar que no hay demasiadas queries
        assert len(ctx) <= 8, f"Demasiadas queries: {len(ctx)}"
```

### Tests de Cache

```python
import pytest
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APIClient

@pytest.mark.django_db
def test_dashboard_cache():
    """Test que el dashboard usa cache correctamente"""
    client = APIClient()
    # ... setup data ...
    
    # Primera llamada (cache miss)
    response1 = client.get(reverse("api:dashboard-today"))
    assert response1.status_code == 200
    
    # Segunda llamada (cache hit)
    response2 = client.get(reverse("api:dashboard-today"))
    assert response2.status_code == 200
    
    # Verificar que los datos son iguales
    assert response1.data == response2.data
```

---

## 🚨 Solución de Problemas

### Tests que Fallan

```bash
# Ver detalles del error
pytest -v --tb=long

# Ver solo el primer error
pytest --maxfail=1

# Ejecutar tests fallidos
pytest --lf

# Ejecutar tests que fallaron en la última ejecución
pytest --ff
```

### Problemas de Base de Datos

```bash
# Verificar migraciones
python manage.py showmigrations

# Resetear base de datos de test
python manage.py test --keepdb
```

### Problemas de Dependencias

```bash
# Verificar instalación
pip list | grep pytest

# Reinstalar dependencias
pip install -r requirements.txt --force-reinstall
```

---

## 📋 Checklist de Testing

### Antes de Commit

- [ ] Todos los tests pasan
- [ ] Cobertura ≥85%
- [ ] No hay tests duplicados
- [ ] Tests tienen nombres descriptivos
- [ ] Tests incluyen docstrings
- [ ] Tests usan fixtures apropiadas

### Durante Desarrollo

- [ ] Escribir tests para nueva funcionalidad
- [ ] Actualizar tests existentes si es necesario
- [ ] Verificar que tests fallan antes de implementar
- [ ] Usar TDD cuando sea posible

### Después de Deploy

- [ ] Ejecutar tests en producción
- [ ] Verificar logs de tests
- [ ] Monitorear cobertura en CI/CD
- [ ] Actualizar documentación de tests

---

## 🎯 Próximos Pasos

1. **Configurar entorno de testing** siguiendo esta guía
2. **Ejecutar tests existentes** para verificar funcionamiento
3. **Escribir tests faltantes** para alcanzar cobertura objetivo
4. **Implementar tests de integración** para endpoints críticos
5. **Configurar CI/CD** para ejecutar tests automáticamente

---

**¡Happy Testing! 🧪**

Para más ayuda:
- [Documentación de pytest](https://docs.pytest.org/)
- [Documentación de Django Testing](https://docs.djangoproject.com/en/stable/topics/testing/)
- [Factory Boy Documentation](https://factoryboy.readthedocs.io/) 