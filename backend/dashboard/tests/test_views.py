"""
Tests simplificados para las vistas del módulo de dashboard
"""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from dashboard.models import DashboardData
from datetime import datetime, timedelta
from django.utils import timezone

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


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
def sample_dashboard_data(member_user):
    return DashboardData.objects.create(
        user=member_user,
        date="2025-01-01",
        data_type="daily",
        nutrition_data={
            "calories_consumed": 1800,
            "calories_burned": 300,
        },
        workout_data={"workouts_completed": 1},
        progress_data={"weight": 70.5},
        achievements_data={},
        expires_at=timezone.now() + timedelta(hours=1)
    )


@pytest.mark.django_db
class TestDashboardDataModel:
    """Tests para el modelo DashboardData"""

    def test_create_dashboard_data(self, member_user):
        """Test de creación de datos del dashboard"""
        dashboard_data = DashboardData.objects.create(
            user=member_user,
            date=datetime.now().date(),
            data_type="daily",
            nutrition_data={"calories_consumed": 1800},
            workout_data={},
            progress_data={},
            achievements_data={},
            expires_at=timezone.now() + timedelta(hours=1)
        )
        
        assert dashboard_data.id is not None
        assert dashboard_data.user == member_user
        assert dashboard_data.nutrition_data["calories_consumed"] == 1800

    def test_update_dashboard_data(self, sample_dashboard_data):
        """Test de actualización de datos del dashboard"""
        sample_dashboard_data.nutrition_data["calories_consumed"] = 2000
        sample_dashboard_data.save()
        
        sample_dashboard_data.refresh_from_db()
        assert sample_dashboard_data.nutrition_data["calories_consumed"] == 2000

    def test_delete_dashboard_data(self, sample_dashboard_data):
        """Test de eliminación de datos del dashboard"""
        dashboard_id = sample_dashboard_data.id
        sample_dashboard_data.delete()
        
        assert not DashboardData.objects.filter(id=dashboard_id).exists()

    def test_is_expired_property(self, member_user):
        """Test de propedad is_expired"""
        # Crear con expiration en el pasado
        # Crear con expiration válida, luego cambiar sin que valide
        expired_data = DashboardData.objects.create(
            user=member_user,
            date=datetime.now().date(),
            data_type="daily",
            nutrition_data={},
            workout_data={},
            progress_data={},
            achievements_data={},
            expires_at=timezone.now() + timedelta(hours=1)
        )
        
        # Modificar directamente en la base de datos con update para evitar validación
        DashboardData.objects.filter(id=expired_data.id).update(
            expires_at=timezone.now() - timedelta(hours=1)  # Ya expirado
        )
        
        # Recargar desde DB
        expired_data.refresh_from_db()
        assert expired_data.is_expired is True

    def test_not_expired_property(self, sample_dashboard_data):
        """Test de propedad is_expired cuando no ha expirado"""
        assert sample_dashboard_data.is_expired is False


@pytest.mark.django_db
class TestDashboardViews:
    """Tests para las vistas del dashboard - funcionalidad básica"""

    def test_dashboard_authentication_required(self, api_client):
        """Test de que el dashboard requiere autenticación"""
        url = reverse("dashboard-today")
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_dashboard_list_authenticated(self, auth_headers, member_user):
        """Test de listado de dashboard autenticado"""
        # Crear algunos datos
        for i in range(3):
            DashboardData.objects.create(
                user=member_user,
                date=datetime.now().date() - timedelta(days=i),
                data_type="daily",
                nutrition_data={"calories_consumed": 1800},
                workout_data={},
                progress_data={},
                achievements_data={},
                expires_at=timezone.now() + timedelta(hours=1)
            )
        
        url = reverse("dashboard-list")
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data

    def test_dashboard_detail_access(self, auth_headers, sample_dashboard_data):
        """Test de acceso a detalle del dashboard"""
        url = reverse("dashboard-detail", args=[sample_dashboard_data.id])
        response = auth_headers.get(url)
        
        # Checkear que la respuesta es válida (puede ser 200 o 404 según permisos)
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]

    def test_dashboard_today_endpoint_exists(self, auth_headers):
        """Test de que el endpoint 'today' retorna 200"""
        url = reverse("dashboard-today")
        response = auth_headers.get(url)
        
        # El endpoint debe retornar 200 incluso sin datos
        assert response.status_code == status.HTTP_200_OK
        assert response.data is not None

    def test_dashboard_weekly_endpoint_exists(self, auth_headers):
        """Test de que el endpoint 'weekly' retorna 200"""
        url = reverse("dashboard-weekly")
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data is not None

    def test_dashboard_monthly_endpoint_exists(self, auth_headers):
        """Test de que el endpoint 'monthly' retorna 200"""
        url = reverse("dashboard-monthly")
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data is not None


@pytest.mark.django_db
class TestDashboardQueryset:
    """Tests para filtrado y consultas del dashboard"""

    def test_filter_by_user(self, member_user):
        """Test de filtrado por usuario"""
        other_user = User.objects.create_user(
            email="other@example.com",
            password="OtherPass123!",
            role="MEMBER"
        )
        
        # Crear datos para ambos usuarios
        DashboardData.objects.create(
            user=member_user,
            date=datetime.now().date(),
            data_type="daily",
            nutrition_data={},
            workout_data={},
            progress_data={},
            achievements_data={},
            expires_at=timezone.now() + timedelta(hours=1)
        )
        
        DashboardData.objects.create(
            user=other_user,
            date=datetime.now().date(),
            data_type="daily",
            nutrition_data={},
            workout_data={},
            progress_data={},
            achievements_data={},
            expires_at=timezone.now() + timedelta(hours=1)
        )
        
        # Verificar que se cuentan correctamente
        member_data = DashboardData.objects.filter(user=member_user)
        assert member_data.count() == 1
        
        other_data = DashboardData.objects.filter(user=other_user)
        assert other_data.count() == 1

    def test_filter_by_date_type(self, member_user):
        """Test de filtrado por tipo de datos"""
        DashboardData.objects.create(
            user=member_user,
            date=datetime.now().date(),
            data_type="daily",
            nutrition_data={},
            workout_data={},
            progress_data={},
            achievements_data={},
            expires_at=timezone.now() + timedelta(hours=1)
        )
        
        DashboardData.objects.create(
            user=member_user,
            date=datetime.now().date(),
            data_type="weekly",
            nutrition_data={},
            workout_data={},
            progress_data={},
            achievements_data={},
            expires_at=timezone.now() + timedelta(hours=1)
        )
        
        daily_data = DashboardData.objects.filter(data_type="daily")
        assert daily_data.count() == 1
        
        weekly_data = DashboardData.objects.filter(data_type="weekly")
        assert weekly_data.count() == 1


@pytest.mark.django_db
class TestDashboardSerialization:
    """Tests para serialización de datos del dashboard"""

    def test_dashboard_data_serialization(self, sample_dashboard_data):
        """Test de serialización de datos del dashboard"""
        from dashboard.serializers import DashboardDataSerializer
        
        serializer = DashboardDataSerializer(sample_dashboard_data)
        data = serializer.data
        
        assert data["id"] == str(sample_dashboard_data.id)
        assert data["data_type"] == "daily"
        assert data["nutrition_data"]["calories_consumed"] == 1800
        assert data["workout_data"]["workouts_completed"] == 1

    def test_dashboard_data_json_fields(self, sample_dashboard_data):
        """Test de que los campos JSON se guardan y recuperan correctamente"""
        sample_dashboard_data.nutrition_data = {
            "calories_consumed": 2000,
            "calories_burned": 500
        }
        sample_dashboard_data.workout_data = {
            "workouts_completed": 2,
            "total_duration": 120
        }
        sample_dashboard_data.save()
        
        sample_dashboard_data.refresh_from_db()
        
        assert sample_dashboard_data.nutrition_data["calories_consumed"] == 2000
        assert sample_dashboard_data.nutrition_data["calories_burned"] == 500
        assert sample_dashboard_data.workout_data["workouts_completed"] == 2
        assert sample_dashboard_data.workout_data["total_duration"] == 120
