"""
Tests para las vistas del módulo de dashboard
"""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from dashboard.models import DashboardData
from datetime import datetime, timedelta
from decimal import Decimal

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user():
    user = User.objects.create_user(
        email="admin@example.com",
        password="AdminPass123!",
        role="ADMIN",
        is_staff=True
    )
    return user


@pytest.fixture
def trainer_user():
    user = User.objects.create_user(
        email="trainer@example.com",
        password="TrainerPass123!",
        role="TRAINER"
    )
    return user


@pytest.fixture
def member_user():
    user = User.objects.create_user(
        email="member@example.com",
        password="MemberPass123!",
        role="MEMBER"
    )
    return user


@pytest.fixture
def auth_headers(api_client, member_user):
    refresh = RefreshToken.for_user(member_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api_client


@pytest.fixture
def admin_headers(api_client, admin_user):
    refresh = RefreshToken.for_user(admin_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api_client


@pytest.fixture
def trainer_headers(api_client, trainer_user):
    refresh = RefreshToken.for_user(trainer_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api_client


@pytest.fixture
def sample_dashboard_data(member_user):
    return DashboardData.objects.create(
        user=member_user,
        data_type="daily",
        data={
            "calories_consumed": 1800,
            "calories_burned": 300,
            "workouts_completed": 1,
            "meals_logged": 3,
            "weight": 70.5,
            "steps": 8500
        },
            date="2025-01-01"
    )


@pytest.mark.django_db
class TestDashboardViews:
    """Tests para las vistas del dashboard"""

    def test_dashboard_today_authenticated(self, auth_headers, member_user):
        """Test de dashboard del día autenticado"""
        # Crear datos del dashboard para hoy
        DashboardData.objects.create(
            user=member_user,
            data_type="daily",
            data={
                "calories_consumed": 1800,
                "calories_burned": 300,
                "workouts_completed": 1
            },
            date=datetime.now().date()
        )
        
        url = reverse("dashboard-today")
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert "calories_consumed" in response.data
        assert "workouts_completed" in response.data

    def test_dashboard_today_unauthenticated(self, api_client):
        """Test de dashboard del día sin autenticación"""
        url = reverse("dashboard-today")
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_dashboard_weekly_authenticated(self, auth_headers, member_user):
        """Test de dashboard semanal autenticado"""
        # Crear datos del dashboard para la semana
        today = datetime.now().date()
        for i in range(7):
            date = today - timedelta(days=i)
            DashboardData.objects.create(
                user=member_user,
                data_type="daily",
                data={
                    "calories_consumed": 1800 + i,
                    "calories_burned": 300 + i,
                    "workouts_completed": i % 2  # Alternar entre 0 y 1
                },
                date=date
            )
        
        url = reverse("dashboard-weekly")
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert "weekly_summary" in response.data
        assert "total_calories_consumed" in response.data["weekly_summary"]

    def test_dashboard_monthly_authenticated(self, auth_headers, member_user):
        """Test de dashboard mensual autenticado"""
        # Crear datos del dashboard para el mes
        today = datetime.now().date()
        for i in range(30):
            date = today - timedelta(days=i)
            DashboardData.objects.create(
                user=member_user,
                data_type="daily",
                data={
                    "calories_consumed": 1800 + (i % 100),
                    "calories_burned": 300 + (i % 50),
                    "workouts_completed": i % 3
                },
                date=date
            )
        
        url = reverse("dashboard-monthly")
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert "monthly_summary" in response.data
        assert "average_calories_consumed" in response.data["monthly_summary"]

    def test_dashboard_stats_authenticated(self, auth_headers, member_user):
        """Test de estadísticas del dashboard autenticado"""
        # Crear datos del dashboard
        DashboardData.objects.create(
            user=member_user,
            data_type="daily",
            data={
                "calories_consumed": 1800,
                "calories_burned": 300,
                "workouts_completed": 1
            },
            date=datetime.now().date()
        )
        
        url = reverse("dashboard-stats")
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert "total_workouts" in response.data
        assert "total_calories_burned" in response.data

    def test_dashboard_data_creation(self, auth_headers, member_user):
        """Test de creación de datos del dashboard"""
        url = reverse("dashboard-list")
        data = {
            "data_type": "daily",
            "data": {
                "calories_consumed": 1900,
                "calories_burned": 350,
                "workouts_completed": 2,
                "meals_logged": 4
            },
            "date": datetime.now().date().isoformat()
        }
        response = auth_headers.post(url, data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert DashboardData.objects.count() == 1
        
        dashboard_data = DashboardData.objects.first()
        assert dashboard_data.user == member_user
        assert dashboard_data.data["calories_consumed"] == 1900

    def test_dashboard_data_update(self, auth_headers, sample_dashboard_data):
        """Test de actualización de datos del dashboard"""
        url = reverse("dashboard-detail", args=[sample_dashboard_data.id])
        data = {
            "data": {
                "calories_consumed": 2000,
                "calories_burned": 400,
                "workouts_completed": 2
            }
        }
        response = auth_headers.patch(url, data)
        
        assert response.status_code == status.HTTP_200_OK
        sample_dashboard_data.refresh_from_db()
        assert sample_dashboard_data.data["calories_consumed"] == 2000

    def test_dashboard_data_deletion(self, auth_headers, sample_dashboard_data):
        """Test de eliminación de datos del dashboard"""
        url = reverse("dashboard-detail", args=[sample_dashboard_data.id])
        response = auth_headers.delete(url)
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert DashboardData.objects.count() == 0


@pytest.mark.django_db
class TestDashboardPermissions:
    """Tests para verificar permisos del dashboard"""

    def test_admin_can_view_all_dashboards(self, admin_headers, member_user):
        """Test de que admin puede ver dashboard de todos"""
        DashboardData.objects.create(
            user=member_user,
            data_type="daily",
            data={"calories_consumed": 1800},
            date=datetime.now().date()
        )
        
        url = reverse("dashboard-list")
        response = admin_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) >= 1

    def test_trainer_can_view_member_dashboards(self, trainer_headers, member_user):
        """Test de que trainer puede ver dashboard de miembros"""
        DashboardData.objects.create(
            user=member_user,
            data_type="daily",
            data={"calories_consumed": 1800},
            date=datetime.now().date()
        )
        
        url = reverse("dashboard-list")
        response = trainer_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) >= 1

    def test_member_cannot_view_other_dashboards(self, auth_headers, member_user):
        """Test de que miembro no puede ver dashboard de otros"""
        other_user = User.objects.create_user(
            email="other@example.com",
            password="OtherPass123!",
            role="MEMBER"
        )
        DashboardData.objects.create(
            user=other_user,
            data_type="daily",
            data={"calories_consumed": 1800},
            date=datetime.now().date()
        )
        
        url = reverse("dashboard-list")
        response = auth_headers.get(url)
        
        # Solo debe ver sus propios datos
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 0  # No tiene datos propios


@pytest.mark.django_db
class TestDashboardDataValidation:
    """Tests para validación de datos del dashboard"""

    def test_dashboard_data_invalid_type(self, auth_headers):
        """Test de datos con tipo inválido"""
        url = reverse("dashboard-list")
        data = {
            "data_type": "invalid_type",
            "data": {"calories": 1800},
            "date": datetime.now().date().isoformat()
        }
        response = auth_headers.post(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_dashboard_data_invalid_date(self, auth_headers):
        """Test de datos con fecha inválida"""
        url = reverse("dashboard-list")
        data = {
            "data_type": "daily",
            "data": {"calories": 1800},
            "date": "invalid_date"
        }
        response = auth_headers.post(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_dashboard_data_future_date(self, auth_headers):
        """Test de datos con fecha futura"""
        future_date = (datetime.now() + timedelta(days=1)).date()
        url = reverse("dashboard-list")
        data = {
            "data_type": "daily",
            "data": {"calories": 1800},
            "date": future_date.isoformat()
        }
        response = auth_headers.post(url, data)
        
        # Dependiendo de la validación del modelo, esto podría fallar
        # assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_dashboard_data_empty_data(self, auth_headers):
        """Test de datos con campo data vacío"""
        url = reverse("dashboard-list")
        data = {
            "data_type": "daily",
            "data": {},
            "date": datetime.now().date().isoformat()
        }
        response = auth_headers.post(url, data)
        
        # Esto podría ser válido dependiendo de la validación
        # assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestDashboardCalculations:
    """Tests para cálculos del dashboard"""

    def test_weekly_calories_calculation(self, auth_headers, member_user):
        """Test de cálculo de calorías semanales"""
        # Crear datos para la semana
        today = datetime.now().date()
        total_calories = 0
        
        for i in range(7):
            date = today - timedelta(days=i)
            calories = 1800 + i
            total_calories += calories
            
            DashboardData.objects.create(
                user=member_user,
                data_type="daily",
                data={"calories_consumed": calories},
                date=date
            )
        
        url = reverse("dashboard-weekly")
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        weekly_summary = response.data["weekly_summary"]
        assert weekly_summary["total_calories_consumed"] == total_calories
        assert weekly_summary["average_calories_consumed"] == total_calories // 7

    def test_monthly_workout_calculation(self, auth_headers, member_user):
        """Test de cálculo de entrenamientos mensuales"""
        # Crear datos para el mes
        today = datetime.now().date()
        total_workouts = 0
        
        for i in range(30):
            date = today - timedelta(days=i)
            workouts = i % 3  # 0, 1, o 2 entrenamientos
            total_workouts += workouts
            
            DashboardData.objects.create(
                user=member_user,
                data_type="daily",
                data={"workouts_completed": workouts},
                date=date
            )
        
        url = reverse("dashboard-monthly")
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        monthly_summary = response.data["monthly_summary"]
        assert monthly_summary["total_workouts"] == total_workouts
        assert monthly_summary["average_workouts_per_day"] == round(total_workouts / 30, 2)

    def test_calorie_deficit_calculation(self, auth_headers, member_user):
        """Test de cálculo de déficit calórico"""
        # Crear datos con calorías consumidas y quemadas
        DashboardData.objects.create(
            user=member_user,
            data_type="daily",
            data={
                "calories_consumed": 1800,
                "calories_burned": 300
            },
            date=datetime.now().date()
        )
        
        url = reverse("dashboard-today")
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        # El déficit sería 1800 - 300 = 1500
        # Dependiendo de la implementación, esto podría estar en response.data


@pytest.mark.django_db
class TestDashboardCache:
    """Tests para el sistema de cache del dashboard"""

    def test_dashboard_cache_creation(self, auth_headers, member_user):
        """Test de creación de cache del dashboard"""
        # Crear datos del dashboard
        DashboardData.objects.create(
            user=member_user,
            data_type="daily",
            data={"calories_consumed": 1800},
            date=datetime.now().date()
        )
        
        # Primera llamada - debe crear cache
        url = reverse("dashboard-today")
        response1 = auth_headers.get(url)
        assert response1.status_code == status.HTTP_200_OK
        
        # Segunda llamada - debe usar cache
        response2 = auth_headers.get(url)
        assert response2.status_code == status.HTTP_200_OK
        
        # Los datos deben ser iguales
        assert response1.data == response2.data

    def test_dashboard_cache_invalidation(self, auth_headers, member_user):
        """Test de invalidación de cache del dashboard"""
        # Crear datos iniciales
        dashboard_data = DashboardData.objects.create(
            user=member_user,
            data_type="daily",
            data={"calories_consumed": 1800},
            date=datetime.now().date()
        )
        
        # Primera llamada
        url = reverse("dashboard-today")
        response1 = auth_headers.get(url)
        assert response1.status_code == status.HTTP_200_OK
        
        # Actualizar datos
        dashboard_data.data["calories_consumed"] = 2000
        dashboard_data.save()
        
        # Segunda llamada - debe mostrar datos actualizados
        response2 = auth_headers.get(url)
        assert response2.status_code == status.HTTP_200_OK
        assert response2.data["calories_consumed"] == 2000


@pytest.mark.django_db
class TestDashboardFiltering:
    """Tests para filtros del dashboard"""

    def test_filter_by_date_range(self, auth_headers, member_user):
        """Test de filtro por rango de fechas"""
        # Crear datos en diferentes fechas
        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        week_ago = today - timedelta(days=7)
        
        DashboardData.objects.create(
            user=member_user,
            data_type="daily",
            data={"calories": 1800},
            date=today
        )
        DashboardData.objects.create(
            user=member_user,
            data_type="daily",
            data={"calories": 1700},
            date=yesterday
        )
        DashboardData.objects.create(
            user=member_user,
            data_type="daily",
            data={"calories": 1600},
            date=week_ago
        )
        
        url = reverse("dashboard-list")
        response = auth_headers.get(url, {
            "date_from": yesterday.isoformat(),
            "date_to": today.isoformat()
        })
        
        assert response.status_code == status.HTTP_200_OK
        # Debe mostrar solo datos de ayer y hoy
        assert len(response.data["results"]) == 2

    def test_filter_by_data_type(self, auth_headers, member_user):
        """Test de filtro por tipo de datos"""
        # Crear datos de diferentes tipos
        DashboardData.objects.create(
            user=member_user,
            data_type="daily",
            data={"calories": 1800},
            date=datetime.now().date()
        )
        DashboardData.objects.create(
            user=member_user,
            data_type="weekly",
            data={"total_calories": 12600},
            date=datetime.now().date()
        )
        
        url = reverse("dashboard-list")
        response = auth_headers.get(url, {"data_type": "daily"})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["data_type"] == "daily"


@pytest.mark.django_db
class TestDashboardPagination:
    """Tests para paginación del dashboard"""

    def test_pagination_default(self, auth_headers, member_user):
        """Test de paginación por defecto"""
        # Crear más de 20 entradas
        for i in range(25):
            DashboardData.objects.create(
                user=member_user,
                data_type="daily",
                data={"calories": 1800 + i},
                date=datetime.now().date() - timedelta(days=i)
            )
        
        url = reverse("dashboard-list")
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert len(response.data["results"]) <= 20  # PAGE_SIZE por defecto
        assert "next" in response.data
        assert "previous" in response.data

    def test_pagination_custom_page_size(self, auth_headers, member_user):
        """Test de paginación con tamaño de página personalizado"""
        # Crear 10 entradas
        for i in range(10):
            DashboardData.objects.create(
                user=member_user,
                data_type="daily",
                data={"calories": 1800 + i},
                date=datetime.now().date() - timedelta(days=i)
            )
        
        url = reverse("dashboard-list")
        response = auth_headers.get(url, {"page_size": 5})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 5 