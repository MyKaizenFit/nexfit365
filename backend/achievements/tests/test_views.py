import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from achievements.models import Achievement, UserAchievement

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user():
    return User.objects.create_user(
        email="admin@example.com",
        password="AdminPass123!",
        role="admin",
        is_staff=True,
    )


@pytest.fixture
def member_user():
    return User.objects.create_user(
        email="member@example.com",
        password="MemberPass123!",
        role="basic",
        is_staff=False,
    )


@pytest.fixture
def other_user():
    return User.objects.create_user(
        email="other@example.com",
        password="OtherPass123!",
        role="basic",
        is_staff=False,
    )


@pytest.fixture
def auth_client(member_user):
    client = APIClient()
    refresh = RefreshToken.for_user(member_user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client


@pytest.fixture
def admin_client(admin_user):
    client = APIClient()
    refresh = RefreshToken.for_user(admin_user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client


@pytest.fixture
def sample_achievement():
    return Achievement.objects.create(
        key="first_workout",
        name="Primer Entrenamiento",
        description="Completa tu primer entrenamiento",
        category="workout",
        points=100,
        criteria={"type": "workout_completed", "count": 1},
        is_active=True,
    )


@pytest.mark.django_db
class TestAchievementEndpoints:
    def test_list_requires_auth(self, api_client):
        response = api_client.get("/api/achievements/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_authenticated(self, auth_client):
        Achievement.objects.create(
            key="a1",
            name="A1",
            description="Desc",
            category="workout",
            points=50,
            criteria={"type": "x", "count": 1},
            is_active=True,
        )
        Achievement.objects.create(
            key="a2",
            name="A2",
            description="Desc",
            category="progress",
            points=70,
            criteria={"type": "y", "count": 2},
            is_active=True,
        )

        response = auth_client.get("/api/achievements/")

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert len(response.data["results"]) == 2

    def test_create_achievement_staff_only(self, auth_client, admin_client):
        payload = {
            "key": "new_achievement",
            "name": "Nuevo",
            "description": "Desc",
            "category": "system",
            "points": 30,
            "criteria": {"type": "test", "count": 1},
        }

        member_response = auth_client.post("/api/achievements/", payload, format="json")
        assert member_response.status_code == status.HTTP_403_FORBIDDEN

        admin_response = admin_client.post("/api/achievements/", payload, format="json")
        assert admin_response.status_code == status.HTTP_201_CREATED
        assert Achievement.objects.filter(key="new_achievement").exists()

    def test_retrieve_achievement(self, auth_client, sample_achievement):
        response = auth_client.get(f"/api/achievements/{sample_achievement.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == str(sample_achievement.id)
        assert response.data["key"] == "first_workout"

    def test_filter_by_category(self, auth_client):
        Achievement.objects.create(
            key="wf",
            name="Workout",
            description="Desc",
            category="workout",
            points=10,
            criteria={"type": "x", "count": 1},
            is_active=True,
        )
        Achievement.objects.create(
            key="pf",
            name="Progress",
            description="Desc",
            category="progress",
            points=10,
            criteria={"type": "x", "count": 1},
            is_active=True,
        )

        response = auth_client.get("/api/achievements/", {"category": "workout"})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["category"] == "workout"

    def test_categories_action(self, auth_client, sample_achievement):
        response = auth_client.get("/api/achievements/categories/")

        assert response.status_code == status.HTTP_200_OK
        assert "categories" in response.data
        assert sample_achievement.category in response.data["categories"]


@pytest.mark.django_db
class TestUserAchievementEndpoints:
    def test_list_user_achievements_only_own(self, auth_client, member_user, other_user, sample_achievement):
        UserAchievement.objects.create(user=member_user, achievement=sample_achievement)

        other_achievement = Achievement.objects.create(
            key="other_key",
            name="Other",
            description="Other",
            category="system",
            points=20,
            criteria={"type": "x", "count": 1},
            is_active=True,
        )
        UserAchievement.objects.create(user=other_user, achievement=other_achievement)

        response = auth_client.get("/api/user-achievements/")

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert len(response.data["results"]) == 1

    def test_create_user_achievement_staff_only(self, auth_client, admin_client, member_user, sample_achievement):
        payload = {
            "user": member_user.id,
            "achievement": str(sample_achievement.id),
            "progress": {"from": "test"},
        }

        member_response = auth_client.post("/api/user-achievements/", payload, format="json")
        assert member_response.status_code == status.HTTP_403_FORBIDDEN

        admin_response = admin_client.post("/api/user-achievements/", payload, format="json")
        assert admin_response.status_code == status.HTTP_201_CREATED
        assert UserAchievement.objects.filter(achievement=sample_achievement).exists()

    def test_create_user_achievement_duplicate(self, admin_client, member_user, sample_achievement):
        UserAchievement.objects.create(user=member_user, achievement=sample_achievement)

        payload = {
            "user": member_user.id,
            "achievement": str(sample_achievement.id),
        }
        response = admin_client.post("/api/user-achievements/", payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_summary_progress_recent_actions(self, auth_client, member_user, sample_achievement):
        UserAchievement.objects.create(user=member_user, achievement=sample_achievement)

        summary = auth_client.get("/api/user-achievements/summary/")
        progress = auth_client.get("/api/user-achievements/progress/")
        recent = auth_client.get("/api/user-achievements/recent/")

        assert summary.status_code == status.HTTP_200_OK
        assert "total_achievements" in summary.data
        assert "unlocked_achievements" in summary.data

        assert progress.status_code == status.HTTP_200_OK
        assert isinstance(progress.data, list)

        assert recent.status_code == status.HTTP_200_OK
        assert isinstance(recent.data, list)
