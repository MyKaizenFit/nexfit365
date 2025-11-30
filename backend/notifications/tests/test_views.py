"""
Tests para las vistas del módulo de notificaciones
"""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from notifications.models import Notification
from datetime import datetime, timedelta

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user():
    user = User.objects.create_user(
        email="admin@example.com",
        password="AdminPass123!",
        first_name="Admin",
        last_name="User",
        role="ADMIN",
        is_staff=True
    )
    return user


@pytest.fixture
def trainer_user():
    user = User.objects.create_user(
        email="trainer@example.com",
        password="TrainerPass123!",
        first_name="Trainer",
        last_name="User",
        role="TRAINER"
    )
    return user


@pytest.fixture
def member_user():
    user = User.objects.create_user(
        email="member@example.com",
        password="MemberPass123!",
        first_name="Member",
        last_name="User",
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
def sample_notification(member_user):
    return Notification.objects.create(
        user=member_user,
        type="achievement",
        title="¡Logro desbloqueado!",
        message="Has completado tu primer entrenamiento",
        data={"achievement_id": "first_workout", "points": 100}
    )


@pytest.mark.django_db
class TestNotificationViews:
    """Tests para las vistas de notificaciones"""

    def test_list_notifications_authenticated(self, auth_headers, member_user):
        """Test de listado de notificaciones autenticado"""
        # Crear algunas notificaciones
        Notification.objects.create(
            user=member_user,
            type="achievement",
            title="Test 1",
            message="Message 1"
        )
        Notification.objects.create(
            user=member_user,
            type="meal_reminder",
            title="Test 2",
            message="Message 2"
        )
        
        url = reverse("notification-list")
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2

    def test_list_notifications_unauthenticated(self, api_client):
        """Test de listado sin autenticación"""
        url = reverse("notification-list")
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_notification_success(self, auth_headers, member_user):
        """Test de creación exitosa de notificación"""
        url = reverse("notification-list")
        data = {
            "type": "meal_reminder",
            "title": "Recordatorio de entrenamiento",
            "message": "No olvides tu entrenamiento de hoy",
            "data": {"workout_id": "123", "time": "18:00"}
        }
        response = auth_headers.post(url, data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert Notification.objects.count() == 1
        
        notification = Notification.objects.first()
        assert notification.user == member_user
        assert notification.title == "Recordatorio de entrenamiento"

    def test_create_notification_invalid_data(self, auth_headers):
        """Test de creación con datos inválidos"""
        url = reverse("notification-list")
        data = {
            "type": "invalid_type",  # Tipo inválido
            "title": "",  # Título vacío
            "message": ""  # Mensaje vacío
        }
        response = auth_headers.post(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_retrieve_notification_owner(self, auth_headers, sample_notification):
        """Test de obtención de notificación por el propietario"""
        url = reverse("notification-detail", args=[sample_notification.id])
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == str(sample_notification.id)
        assert response.data["title"] == sample_notification.title

    def test_retrieve_notification_other_user(self, auth_headers, member_user):
        """Test de obtención de notificación de otro usuario"""
        other_user = User.objects.create_user(
            email="other@example.com",
            password="OtherPass123!",
            first_name="Other",
            last_name="User",
            role="MEMBER"
        )
        notification = Notification.objects.create(
            user=other_user,
            type="achievement",
            title="Other user notification",
            message="This is not yours"
        )
        
        url = reverse("notification-detail", args=[notification.id])
        response = auth_headers.get(url)
        
        # Debe fallar por permisos
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_notification_owner(self, auth_headers, sample_notification):
        """Test de actualización de notificación por el propietario"""
        url = reverse("notification-detail", args=[sample_notification.id])
        data = {"read_at": datetime.now().isoformat()}
        response = auth_headers.patch(url, data)
        
        assert response.status_code == status.HTTP_200_OK
        sample_notification.refresh_from_db()
        assert sample_notification.read_at is not None

    def test_delete_notification_owner(self, auth_headers, sample_notification):
        """Test de eliminación de notificación por el propietario"""
        url = reverse("notification-detail", args=[sample_notification.id])
        response = auth_headers.delete(url)
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert Notification.objects.count() == 0


@pytest.mark.django_db
class TestNotificationActions:
    """Tests para acciones específicas de notificaciones"""

    def test_mark_as_read(self, auth_headers, sample_notification):
        """Test de marcar notificación como leída"""
        url = reverse("notification-read", kwargs={'pk': sample_notification.id})
        response = auth_headers.patch(url)
        
        assert response.status_code == status.HTTP_200_OK
        sample_notification.refresh_from_db()
        assert sample_notification.read_at is not None

    def test_mark_as_unread(self, auth_headers, sample_notification):
        """Test de marcar notificación como no leída"""
        # Primero marcarla como leída
        sample_notification.read_at = datetime.now()
        sample_notification.save()
        
        url = reverse("notification-unread", kwargs={'pk': sample_notification.id})
        response = auth_headers.patch(url)
        
        assert response.status_code == status.HTTP_200_OK
        sample_notification.refresh_from_db()
        assert sample_notification.read_at is None

    def test_mark_all_as_read(self, auth_headers, member_user):
        """Test de marcar todas las notificaciones como leídas"""
        # Crear múltiples notificaciones
        for i in range(3):
            Notification.objects.create(
                user=member_user,
                type="meal_reminder",
                title=f"Notification {i}",
                message=f"Message {i}"
            )
        
        url = reverse("notification-mark-all-read")
        response = auth_headers.patch(url)
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verificar que todas están marcadas como leídas
        notifications = Notification.objects.filter(user=member_user)
        for notification in notifications:
            assert notification.read_at is not None

    def test_get_unread_count(self, auth_headers, member_user):
        """Test de obtener contador de notificaciones no leídas"""
        # Crear notificaciones leídas y no leídas
        Notification.objects.create(
            user=member_user,
            type="meal_reminder",
            title="Read notification",
            message="This is read",
            read_at=datetime.now()
        )
        Notification.objects.create(
            user=member_user,
            type="achievement",
            title="Unread notification",
            message="This is unread"
        )
        
        url = reverse("notification-unread-count")
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data["unread_count"] == 1


@pytest.mark.django_db
class TestNotificationPermissions:
    """Tests para verificar permisos"""

    def test_admin_can_view_all_notifications(self, admin_headers, member_user):
        """Test de que admin puede ver notificaciones de todos"""
        notification = Notification.objects.create(
            user=member_user,
            type="achievement",
            title="Admin can see this",
            message="Admin has access"
        )
        
        url = reverse("notification-detail", args=[notification.id])
        response = admin_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK

    def test_trainer_can_view_member_notifications(self, trainer_headers, member_user):
        """Test de que trainer puede ver notificaciones de miembros"""
        notification = Notification.objects.create(
            user=member_user,
            type="meal_reminder",
            title="Trainer can see this",
            message="Trainer has access"
        )
        
        url = reverse("notification-detail", args=[notification.id])
        response = trainer_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK

    def test_member_cannot_view_other_notifications(self, auth_headers, member_user):
        """Test de que miembro no puede ver notificaciones de otros"""
        other_user = User.objects.create_user(
            email="other@example.com",
            password="OtherPass123!",
            first_name="Other",
            last_name="User",
            role="MEMBER"
        )
        notification = Notification.objects.create(
            user=other_user,
            type="achievement",
            title="Other user notification",
            message="This is not yours"
        )
        
        url = reverse("notification-detail", args=[notification.id])
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestNotificationFiltering:
    """Tests para filtros de notificaciones"""

    def test_filter_by_type(self, auth_headers, member_user):
        """Test de filtro por tipo de notificación"""
        # Crear notificaciones de diferentes tipos
        Notification.objects.create(
            user=member_user,
            type="achievement",
            title="Achievement notification",
            message="You got an achievement"
        )
        Notification.objects.create(
            user=member_user,
            type="meal_reminder",
            title="Reminder notification",
            message="Don't forget your workout"
        )
        
        url = reverse("notification-list")
        response = auth_headers.get(url, {"type": "achievement"})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["type"] == "achievement"

    def test_filter_by_read_status(self, auth_headers, member_user):
        """Test de filtro por estado de lectura"""
        # Crear notificaciones leídas y no leídas
        Notification.objects.create(
            user=member_user,
            type="meal_reminder",
            title="Read notification",
            message="This is read",
            read_at=datetime.now()
        )
        Notification.objects.create(
            user=member_user,
            type="achievement",
            title="Unread notification",
            message="This is unread"
        )
        
        url = reverse("notification-list")
        response = auth_headers.get(url, {"read": "false"})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["read_at"] is None

    def test_filter_by_date_range(self, auth_headers, member_user):
        """Test de filtro por rango de fechas"""
        # Crear notificaciones en diferentes fechas
        yesterday = datetime.now() - timedelta(days=1)
        today = datetime.now()
        
        Notification.objects.create(
            user=member_user,
            type="meal_reminder",
            title="Yesterday notification",
            message="From yesterday",
            created_at=yesterday
        )
        Notification.objects.create(
            user=member_user,
            type="achievement",
            title="Today notification",
            message="From today",
            created_at=today
        )
        
        url = reverse("notification-list")
        response = auth_headers.get(url, {
            "date_from": today.date().isoformat(),
            "date_to": today.date().isoformat()
        })
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert "Today notification" in response.data["results"][0]["title"]


@pytest.mark.django_db
class TestNotificationPagination:
    """Tests para paginación"""

    def test_pagination_default(self, auth_headers, member_user):
        """Test de paginación por defecto"""
        # Crear más de 20 notificaciones
        for i in range(25):
            Notification.objects.create(
                user=member_user,
                type="meal_reminder",
                title=f"Notification {i}",
                message=f"Message {i}"
            )
        
        url = reverse("notification-list")
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert len(response.data["results"]) <= 20  # PAGE_SIZE por defecto
        assert "next" in response.data
        assert "previous" in response.data

    def test_pagination_custom_page_size(self, auth_headers, member_user):
        """Test de paginación con tamaño de página personalizado"""
        # Crear 10 notificaciones
        for i in range(10):
            Notification.objects.create(
                user=member_user,
                type="meal_reminder",
                title=f"Notification {i}",
                message=f"Message {i}"
            )
        
        url = reverse("notification-list")
        response = auth_headers.get(url, {"page_size": 5})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 5


@pytest.mark.django_db
class TestNotificationData:
    """Tests para el campo data de las notificaciones"""

    def test_notification_with_json_data(self, auth_headers, member_user):
        """Test de notificación con datos JSON"""
        data = {
            "achievement_id": "first_workout",
            "points": 100,
            "level": "bronze",
            "metadata": {
                "workout_duration": 45,
                "calories_burned": 300
            }
        }
        
        notification = Notification.objects.create(
            user=member_user,
            type="achievement",
            title="Achievement unlocked!",
            message="You've earned an achievement",
            data=data
        )
        
        url = reverse("notification-detail", args=[notification.id])
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data["data"] == data
        assert response.data["data"]["points"] == 100
        assert response.data["data"]["metadata"]["workout_duration"] == 45

    def test_notification_data_validation(self, auth_headers):
        """Test de validación de datos de notificación"""
        url = reverse("notification-list")
        data = {
            "notification_type": "achievement",
            "title": "Test",
            "message": "Test message",
            "data": "invalid_json_string"  # Debe ser dict o None
        }
        response = auth_headers.post(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST 