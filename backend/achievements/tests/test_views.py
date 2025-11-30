"""
Tests para las vistas del módulo de logros
"""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from achievements.models import Achievement, UserAchievement
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
def sample_achievement():
    return Achievement.objects.create(
        key="first_workout",
        name="Primer Entrenamiento",
        description="Completa tu primer entrenamiento",
        category="workout",
        points=100,
        criteria={
            "type": "workout_completed",
            "count": 1
        }
    )


@pytest.fixture
def sample_user_achievement(member_user, sample_achievement):
    return UserAchievement.objects.create(
        user=member_user,
        achievement=sample_achievement,
        unlocked_at="2025-01-01"
    )


@pytest.mark.django_db
class TestAchievementViews:
    """Tests para las vistas de logros"""

    def test_list_achievements_authenticated(self, auth_headers):
        """Test de listado de logros autenticado"""
        # Crear algunos logros
        Achievement.objects.create(
            key="first_workout",
            name="Primer Entrenamiento",
            description="Completa tu primer entrenamiento",
            category="workout",
            points=100
        )
        Achievement.objects.create(
            key="weight_loss",
            name="Pérdida de Peso",
            description="Pierde 5kg",
            category="progress",
            points=200
        )
        
        url = reverse("achievements-list")
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2

    def test_list_achievements_unauthenticated(self, api_client):
        """Test de listado sin autenticación"""
        url = reverse("achievements-list")
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_achievement_admin_only(self, auth_headers, admin_headers):
        """Test de que solo admin puede crear logros"""
        # Intentar crear como miembro
        url = reverse("achievements-list")
        data = {
            "key": "test_achievement",
            "name": "Test Achievement",
            "description": "Test description",
            "category": "test",
            "points": 50
        }
        response = auth_headers.post(url, data)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Crear como admin
        response = admin_headers.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert Achievement.objects.count() == 1

    def test_create_achievement_success(self, admin_headers):
        """Test de creación exitosa de logro por admin"""
        url = reverse("achievements-list")
        data = {
            "key": "test_achievement",
            "name": "Test Achievement",
            "description": "Test description",
            "category": "test",
            "points": 50,
            "criteria": {
                "type": "test",
                "count": 1
            }
        }
        response = admin_headers.post(url, data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert Achievement.objects.count() == 1
        
        achievement = Achievement.objects.first()
        assert achievement.key == "test_achievement"
        assert achievement.name == "Test Achievement"

    def test_create_achievement_invalid_data(self, admin_headers):
        """Test de creación con datos inválidos"""
        url = reverse("achievements-list")
        data = {
            "key": "",  # Campo requerido vacío
            "name": "",  # Nombre vacío
            "points": -10  # Puntos negativos
        }
        response = admin_headers.post(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_retrieve_achievement(self, auth_headers, sample_achievement):
        """Test de obtención de logro"""
        url = reverse("achievements-detail", args=[sample_achievement.id])
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == str(sample_achievement.id)
        assert response.data["name"] == sample_achievement.name

    def test_update_achievement_admin_only(self, auth_headers, admin_headers, sample_achievement):
        """Test de que solo admin puede actualizar logros"""
        # Intentar actualizar como miembro
        url = reverse("achievements-detail", args=[sample_achievement.id])
        data = {"points": 150}
        response = auth_headers.patch(url, data)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Actualizar como admin
        response = admin_headers.patch(url, data)
        assert response.status_code == status.HTTP_200_OK
        
        sample_achievement.refresh_from_db()
        assert sample_achievement.points == 150

    def test_delete_achievement_admin_only(self, auth_headers, admin_headers, sample_achievement):
        """Test de que solo admin puede eliminar logros"""
        # Intentar eliminar como miembro
        url = reverse("achievements-detail", args=[sample_achievement.id])
        response = auth_headers.delete(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Eliminar como admin
        response = admin_headers.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert Achievement.objects.count() == 0


@pytest.mark.django_db
class TestUserAchievementViews:
    """Tests para las vistas de logros de usuario"""

    def test_list_user_achievements_authenticated(self, auth_headers, member_user):
        """Test de listado de logros de usuario autenticado"""
        # Crear logro y asignarlo al usuario
        achievement = Achievement.objects.create(
            key="first_workout",
            name="Primer Entrenamiento",
            description="Completa tu primer entrenamiento",
            category="workout",
            points=100
        )
        UserAchievement.objects.create(
            user=member_user,
            achievement=achievement,
            unlocked_at="2025-01-01"
        )
        
        url = reverse("user-achievements-list")
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1

    def test_list_user_achievements_unauthenticated(self, api_client):
        """Test de listado sin autenticación"""
        url = reverse("user-achievements-list")
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_user_achievement_admin_only(self, auth_headers, admin_headers, member_user, sample_achievement):
        """Test de que solo admin puede asignar logros"""
        # Intentar asignar como miembro
        url = reverse("user-achievements-list")
        data = {
            "user": str(member_user.id),
            "achievement": str(sample_achievement.id),
            "unlocked_at": "2025-01-01"
        }
        response = auth_headers.post(url, data)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Asignar como admin
        response = admin_headers.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert UserAchievement.objects.count() == 1

    def test_create_user_achievement_success(self, admin_headers, member_user, sample_achievement):
        """Test de asignación exitosa de logro por admin"""
        url = reverse("user-achievements-list")
        data = {
            "user": str(member_user.id),
            "achievement": str(sample_achievement.id),
            "unlocked_at": "2025-01-01"
        }
        response = admin_headers.post(url, data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert UserAchievement.objects.count() == 1
        
        user_achievement = UserAchievement.objects.first()
        assert user_achievement.user == member_user
        assert user_achievement.achievement == sample_achievement

    def test_create_user_achievement_duplicate(self, admin_headers, member_user, sample_achievement):
        """Test de que no se puede asignar el mismo logro dos veces"""
        # Asignar logro por primera vez
        UserAchievement.objects.create(
            user=member_user,
            achievement=sample_achievement,
            unlocked_at="2025-01-01"
        )
        
        # Intentar asignar de nuevo
        url = reverse("user-achievements-list")
        data = {
            "user": str(member_user.id),
            "achievement": str(sample_achievement.id),
            "unlocked_at": "2025-01-02"
        }
        response = admin_headers.post(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert UserAchievement.objects.count() == 1

    def test_retrieve_user_achievement_owner(self, auth_headers, sample_user_achievement):
        """Test de obtención de logro de usuario por el propietario"""
        url = reverse("user-achievements-detail", args=[sample_user_achievement.id])
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == str(sample_user_achievement.id)

    def test_retrieve_user_achievement_other_user(self, auth_headers, member_user):
        """Test de obtención de logro de usuario de otro usuario"""
        other_user = User.objects.create_user(
            email="other@example.com",
            password="OtherPass123!",
            role="MEMBER"
        )
        achievement = Achievement.objects.create(
            key="other_achievement",
            name="Other Achievement",
            description="Other description",
            category="other",
            points=50
        )
        user_achievement = UserAchievement.objects.create(
            user=other_user,
            achievement=achievement,
            unlocked_at="2025-01-01"
        )
        
        url = reverse("user-achievements-detail", args=[user_achievement.id])
        response = auth_headers.get(url)
        
        # Debe fallar por permisos
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_user_achievement_admin_only(self, auth_headers, admin_headers, sample_user_achievement):
        """Test de que solo admin puede actualizar logros de usuario"""
        # Intentar actualizar como miembro
        url = reverse("user-achievements-detail", args=[sample_user_achievement.id])
        data = {"unlocked_at": "2025-01-02"}
        response = auth_headers.patch(url, data)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Actualizar como admin
        response = admin_headers.patch(url, data)
        assert response.status_code == status.HTTP_200_OK
        
        sample_user_achievement.refresh_from_db()
        assert sample_user_achievement.unlocked_at == "2025-01-02"

    def test_delete_user_achievement_admin_only(self, auth_headers, admin_headers, sample_user_achievement):
        """Test de que solo admin puede eliminar logros de usuario"""
        # Intentar eliminar como miembro
        url = reverse("user-achievements-detail", args=[sample_user_achievement.id])
        response = auth_headers.delete(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Eliminar como admin
        response = admin_headers.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert UserAchievement.objects.count() == 0


@pytest.mark.django_db
class TestAchievementPermissions:
    """Tests para verificar permisos"""

    def test_admin_can_view_all_user_achievements(self, admin_headers, member_user):
        """Test de que admin puede ver logros de usuario de todos"""
        achievement = Achievement.objects.create(
            key="test_achievement",
            name="Test Achievement",
            description="Test description",
            category="test",
            points=50
        )
        user_achievement = UserAchievement.objects.create(
            user=member_user,
            achievement=achievement,
            unlocked_at="2025-01-01"
        )
        
        url = reverse("user-achievements-detail", args=[user_achievement.id])
        response = admin_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK

    def test_trainer_can_view_member_achievements(self, trainer_headers, member_user):
        """Test de que trainer puede ver logros de usuario de miembros"""
        achievement = Achievement.objects.create(
            key="test_achievement",
            name="Test Achievement",
            description="Test description",
            category="test",
            points=50
        )
        user_achievement = UserAchievement.objects.create(
            user=member_user,
            achievement=achievement,
            unlocked_at="2025-01-01"
        )
        
        url = reverse("user-achievements-detail", args=[user_achievement.id])
        response = trainer_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK

    def test_member_cannot_view_other_achievements(self, auth_headers, member_user):
        """Test de que miembro no puede ver logros de usuario de otros"""
        other_user = User.objects.create_user(
            email="other@example.com",
            password="OtherPass123!",
            role="MEMBER"
        )
        achievement = Achievement.objects.create(
            key="other_achievement",
            name="Other Achievement",
            description="Other description",
            category="other",
            points=50
        )
        user_achievement = UserAchievement.objects.create(
            user=other_user,
            achievement=achievement,
            unlocked_at="2025-01-01"
        )
        
        url = reverse("user-achievements-detail", args=[user_achievement.id])
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestAchievementFiltering:
    """Tests para filtros de logros"""

    def test_filter_by_category(self, auth_headers):
        """Test de filtro por categoría"""
        # Crear logros de diferentes categorías
        Achievement.objects.create(
            key="workout_achievement",
            name="Workout Achievement",
            description="Workout related",
            category="workout",
            points=100
        )
        Achievement.objects.create(
            key="progress_achievement",
            name="Progress Achievement",
            description="Progress related",
            category="progress",
            points=200
        )
        
        url = reverse("achievements-list")
        response = auth_headers.get(url, {"category": "workout"})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["category"] == "workout"

    def test_filter_by_points_range(self, auth_headers):
        """Test de filtro por rango de puntos"""
        # Crear logros con diferentes puntos
        Achievement.objects.create(
            key="low_points",
            name="Low Points",
            description="Low points achievement",
            category="test",
            points=50
        )
        Achievement.objects.create(
            key="high_points",
            name="High Points",
            description="High points achievement",
            category="test",
            points=200
        )
        
        url = reverse("achievements-list")
        response = auth_headers.get(url, {"min_points": 100})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["points"] >= 100

    def test_filter_user_achievements_by_user(self, admin_headers, member_user):
        """Test de filtro de logros de usuario por usuario"""
        other_user = User.objects.create_user(
            email="other@example.com",
            password="OtherPass123!",
            role="MEMBER"
        )
        
        achievement = Achievement.objects.create(
            key="test_achievement",
            name="Test Achievement",
            description="Test description",
            category="test",
            points=50
        )
        
        # Asignar logro a ambos usuarios
        UserAchievement.objects.create(
            user=member_user,
            achievement=achievement,
            unlocked_at="2025-01-01"
        )
        UserAchievement.objects.create(
            user=other_user,
            achievement=achievement,
            unlocked_at="2025-01-01"
        )
        
        url = reverse("user-achievements-list")
        response = admin_headers.get(url, {"user": str(member_user.id)})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["user"] == str(member_user.id)


@pytest.mark.django_db
class TestAchievementPagination:
    """Tests para paginación"""

    def test_pagination_default(self, auth_headers):
        """Test de paginación por defecto"""
        # Crear más de 20 logros
        for i in range(25):
            Achievement.objects.create(
                key=f"achievement_{i}",
                name=f"Achievement {i}",
                description=f"Description {i}",
                category="test",
                points=50
            )
        
        url = reverse("achievements-list")
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert len(response.data["results"]) <= 20  # PAGE_SIZE por defecto
        assert "next" in response.data
        assert "previous" in response.data

    def test_pagination_custom_page_size(self, auth_headers):
        """Test de paginación con tamaño de página personalizado"""
        # Crear 10 logros
        for i in range(10):
            Achievement.objects.create(
                key=f"achievement_{i}",
                name=f"Achievement {i}",
                description=f"Description {i}",
                category="test",
                points=50
            )
        
        url = reverse("achievements-list")
        response = auth_headers.get(url, {"page_size": 5})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 5


@pytest.mark.django_db
class TestAchievementData:
    """Tests para el campo criteria de los logros"""

    def test_achievement_with_criteria(self, auth_headers):
        """Test de logro con criterios JSON"""
        criteria = {
            "type": "workout_completed",
            "count": 5,
            "timeframe": "week",
            "conditions": {
                "min_duration": 30,
                "min_calories": 200
            }
        }
        
        achievement = Achievement.objects.create(
            key="weekly_workout",
            name="Entrenador Semanal",
            description="Completa 5 entrenamientos en una semana",
            category="workout",
            points=150,
            criteria=criteria
        )
        
        url = reverse("achievements-detail", args=[achievement.id])
        response = auth_headers.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data["criteria"] == criteria
        assert response.data["criteria"]["count"] == 5
        assert response.data["criteria"]["conditions"]["min_duration"] == 30

    def test_achievement_criteria_validation(self, admin_headers):
        """Test de validación de criterios de logro"""
        url = reverse("achievements-list")
        data = {
            "key": "test_achievement",
            "name": "Test Achievement",
            "description": "Test description",
            "category": "test",
            "points": 50,
            "criteria": "invalid_json_string"  # Debe ser dict o None
        }
        response = admin_headers.post(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST 