"""
Tests para las vistas del módulo de progreso
"""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from progress.models import ProgressPhoto, WeightEntry, BodyMeasurement
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


@pytest.mark.django_db
class TestProgressPhotoViews:
    """Tests para las vistas de fotos de progreso"""

    def test_list_progress_photos_authenticated(self, auth_headers, member_user):
        """Test de listado de fotos de progreso autenticado"""
        # Crear algunas fotos de progreso
        ProgressPhoto.objects.create(
            user=member_user,
            photo="test_photo.jpg",
            photo_type="front",
            date="2025-01-01",
            notes="Test photo"
        )
        
        url = reverse("progress-photos-list")
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1

    def test_list_progress_photos_unauthenticated(self, api_client):
        """Test de listado sin autenticación"""
        url = reverse("progress-photos-list")
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_progress_photo_success(self, auth_headers, member_user):
        """Test de creación exitosa de foto de progreso"""
        url = reverse("progress-photos-list")
        data = {
            "photo": "test_photo.jpg",
            "photo_type": "front",
            "date": "2025-01-01",
            "notes": "Test photo"
        }
        response = auth_headers.post(url, data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert ProgressPhoto.objects.count() == 1
        
        photo = ProgressPhoto.objects.first()
        assert photo.user == member_user
        assert photo.photo_type == "front"

    def test_create_progress_photo_invalid_data(self, auth_headers):
        """Test de creación con datos inválidos"""
        url = reverse("progress-photos-list")
        data = {
            "photo": "",  # Campo requerido vacío
            "photo_type": "invalid_type",  # Tipo inválido
            "date": "invalid_date"  # Fecha inválida
        }
        response = auth_headers.post(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_retrieve_progress_photo_owner(self, auth_headers, member_user):
        """Test de obtención de foto por el propietario"""
        photo = ProgressPhoto.objects.create(
            user=member_user,
            photo="test_photo.jpg",
            photo_type="front",
            date="2025-01-01"
        )
        
        url = reverse("progress-photos-detail", args=[photo.id])
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == str(photo.id)

    def test_retrieve_progress_photo_other_user(self, auth_headers, member_user):
        """Test de obtención de foto de otro usuario"""
        other_user = User.objects.create_user(
            email="other@example.com",
            password="OtherPass123!",
            role="MEMBER"
        )
        photo = ProgressPhoto.objects.create(
            user=other_user,
            photo="test_photo.jpg",
            photo_type="front",
            date="2025-01-01"
        )
        
        url = reverse("progress-photos-detail", args=[photo.id])
        response = auth_headers.get(url)
        
        # Debe fallar por permisos
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_progress_photo_owner(self, auth_headers, member_user):
        """Test de actualización de foto por el propietario"""
        photo = ProgressPhoto.objects.create(
            user=member_user,
            photo="test_photo.jpg",
            photo_type="front",
            date="2025-01-01"
        )
        
        url = reverse("progress-photos-detail", args=[photo.id])
        data = {"notes": "Updated notes"}
        response = auth_headers.patch(url, data)
        
        assert response.status_code == status.HTTP_200_OK
        photo.refresh_from_db()
        assert photo.notes == "Updated notes"

    def test_delete_progress_photo_owner(self, auth_headers, member_user):
        """Test de eliminación de foto por el propietario"""
        photo = ProgressPhoto.objects.create(
            user=member_user,
            photo="test_photo.jpg",
            photo_type="front",
            date="2025-01-01"
        )
        
        url = reverse("progress-photos-detail", args=[photo.id])
        response = auth_headers.delete(url)
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert ProgressPhoto.objects.count() == 0


@pytest.mark.django_db
class TestWeightEntryViews:
    """Tests para las vistas de entradas de peso"""

    def test_list_weight_entries_authenticated(self, auth_headers, member_user):
        """Test de listado de entradas de peso autenticado"""
        WeightEntry.objects.create(
            user=member_user,
            weight=Decimal("70.5"),
            date="2025-01-01",
            notes="Test weight"
        )
        
        url = reverse("weight-history-list")
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1

    def test_create_weight_entry_success(self, auth_headers, member_user):
        """Test de creación exitosa de entrada de peso"""
        url = reverse("weight-history-list")
        data = {
            "weight": "75.2",
            "date": "2025-01-01",
            "notes": "Test weight entry"
        }
        response = auth_headers.post(url, data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert WeightEntry.objects.count() == 1
        
        entry = WeightEntry.objects.first()
        assert entry.user == member_user
        assert entry.weight == Decimal("75.2")

    def test_create_weight_entry_invalid_weight(self, auth_headers):
        """Test de creación con peso inválido"""
        url = reverse("weight-history-list")
        data = {
            "weight": "-10",  # Peso negativo
            "date": "2025-01-01"
        }
        response = auth_headers.post(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_update_weight_entry_owner(self, auth_headers, member_user):
        """Test de actualización de entrada por el propietario"""
        entry = WeightEntry.objects.create(
            user=member_user,
            weight=Decimal("70.0"),
            date="2025-01-01"
        )
        
        url = reverse("weight-history-detail", args=[entry.id])
        data = {"weight": "71.0"}
        response = auth_headers.patch(url, data)
        
        assert response.status_code == status.HTTP_200_OK
        entry.refresh_from_db()
        assert entry.weight == Decimal("71.0")


@pytest.mark.django_db
class TestBodyMeasurementViews:
    """Tests para las vistas de medidas corporales"""

    def test_list_measurements_authenticated(self, auth_headers, member_user):
        """Test de listado de medidas autenticado"""
        BodyMeasurement.objects.create(
            user=member_user,
            chest=Decimal("95.0"),
            waist=Decimal("80.0"),
            date="2025-01-01"
        )
        
        url = reverse("measurements-list")
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1

    def test_create_measurement_success(self, auth_headers, member_user):
        """Test de creación exitosa de medida corporal"""
        url = reverse("measurements-list")
        data = {
            "chest": "95.0",
            "waist": "80.0",
            "arms": "35.0",
            "date": "2025-01-01"
        }
        response = auth_headers.post(url, data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert BodyMeasurement.objects.count() == 1
        
        measurement = BodyMeasurement.objects.first()
        assert measurement.user == member_user
        assert measurement.chest == Decimal("95.0")

    def test_create_measurement_invalid_values(self, auth_headers):
        """Test de creación con valores inválidos"""
        url = reverse("measurements-list")
        data = {
            "chest": "-10",  # Valor negativo
            "date": "2025-01-01"
        }
        response = auth_headers.post(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_update_measurement_owner(self, auth_headers, member_user):
        """Test de actualización de medida por el propietario"""
        measurement = BodyMeasurement.objects.create(
            user=member_user,
            chest=Decimal("95.0"),
            date="2025-01-01"
        )
        
        url = reverse("measurements-detail", args=[measurement.id])
        data = {"chest": "96.0"}
        response = auth_headers.patch(url, data)
        
        assert response.status_code == status.HTTP_200_OK
        measurement.refresh_from_db()
        assert measurement.chest == Decimal("96.0")


@pytest.mark.django_db
class TestPermissions:
    """Tests para verificar permisos"""

    def test_admin_can_view_all_progress(self, admin_headers, member_user):
        """Test de que admin puede ver progreso de todos"""
        photo = ProgressPhoto.objects.create(
            user=member_user,
            photo="test_photo.jpg",
            photo_type="front",
            date="2025-01-01"
        )
        
        url = reverse("progress-photos-detail", args=[photo.id])
        response = admin_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK

    def test_trainer_can_view_member_progress(self, trainer_headers, member_user):
        """Test de que trainer puede ver progreso de miembros"""
        photo = ProgressPhoto.objects.create(
            user=member_user,
            photo="test_photo.jpg",
            photo_type="front",
            date="2025-01-01"
        )
        
        url = reverse("progress-photos-detail", args=[photo.id])
        response = trainer_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK

    def test_member_cannot_view_other_progress(self, auth_headers, member_user):
        """Test de que miembro no puede ver progreso de otros"""
        other_user = User.objects.create_user(
            email="other@example.com",
            password="OtherPass123!",
            role="MEMBER"
        )
        photo = ProgressPhoto.objects.create(
            user=other_user,
            photo="test_photo.jpg",
            photo_type="front",
            date="2025-01-01"
        )
        
        url = reverse("progress-photos-detail", args=[photo.id])
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestFilteringAndSearch:
    """Tests para filtros y búsqueda"""

    def test_filter_by_date(self, auth_headers, member_user):
        """Test de filtro por fecha"""
        # Crear entradas en diferentes fechas
        WeightEntry.objects.create(
            user=member_user,
            weight=Decimal("70.0"),
            date="2025-01-01"
        )
        WeightEntry.objects.create(
            user=member_user,
            weight=Decimal("71.0"),
            date="2025-01-02"
        )
        
        url = reverse("weight-history-list")
        response = auth_headers.get(url, {"date": "2025-01-01"})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1

    def test_filter_by_photo_type(self, auth_headers, member_user):
        """Test de filtro por tipo de foto"""
        ProgressPhoto.objects.create(
            user=member_user,
            photo="front.jpg",
            photo_type="front",
            date="2025-01-01"
        )
        ProgressPhoto.objects.create(
            user=member_user,
            photo="side.jpg",
            photo_type="side",
            date="2025-01-01"
        )
        
        url = reverse("progress-photos-list")
        response = auth_headers.get(url, {"photo_type": "front"})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["photo_type"] == "front"


@pytest.mark.django_db
class TestPagination:
    """Tests para paginación"""

    def test_pagination_default(self, auth_headers, member_user):
        """Test de paginación por defecto"""
        # Crear más de 20 entradas
        for i in range(25):
            WeightEntry.objects.create(
                user=member_user,
                weight=Decimal(f"70.{i}"),
                date=f"2025-01-{i+1:02d}"
            )
        
        url = reverse("weight-history-list")
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
            WeightEntry.objects.create(
                user=member_user,
                weight=Decimal(f"70.{i}"),
                date=f"2025-01-{i+1:02d}"
            )
        
        url = reverse("weight-history-list")
        response = auth_headers.get(url, {"page_size": 5})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 5 