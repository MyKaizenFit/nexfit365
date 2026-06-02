import pytest
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from achievements.models import Achievement, UserAchievement
from nutrition.models import MealLog, NutritionPlan, PlanMeal
from workouts.models import WorkoutLog

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


@pytest.mark.django_db
class TestCompleteDayStreak:
    def _create_daily_plan(self, user, target_date):
        plan = NutritionPlan.objects.create(
            user=user,
            name="Plan diario",
            description="Plan de test",
            is_active=True,
        )
        meal = PlanMeal.objects.create(
            plan=plan,
            day_of_week=target_date.isoweekday(),
            name="Desayuno",
            meal_type="breakfast",
            calories=400,
            protein=30,
            carbs=40,
            fat=10,
        )
        return plan, meal

    def _complete_meal(self, user, target_date, plan_meal):
        return MealLog.objects.create(
            user=user,
            date=target_date,
            meal_type=plan_meal.meal_type,
            plan_meal=plan_meal,
            completed=True,
            calories=400,
            protein=30,
            carbs=40,
            fat=10,
            custom_description="Comida completada",
        )

    def _complete_workout(self, user, target_date):
        return WorkoutLog.objects.create(
            user=user,
            date=target_date,
            completed=True,
            duration_minutes=45,
        )

    def test_complete_day_requires_auth(self, api_client):
        response = api_client.post("/api/achievements/complete-day/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_complete_day_does_not_increment_when_day_is_incomplete(self, auth_client, member_user):
        today = timezone.localdate()
        member_user.training_days = [today.isoweekday()]
        member_user.save(update_fields=["training_days"])
        self._create_daily_plan(member_user, today)

        response = auth_client.post("/api/achievements/complete-day/")

        member_user.refresh_from_db()
        assert response.status_code == status.HTTP_409_CONFLICT
        assert response.data["completed"] is False
        assert response.data["status"]["is_complete"] is False
        assert member_user.daily_streak == 0
        assert member_user.last_completed_day is None

    def test_complete_day_increments_streak_and_is_idempotent(self, auth_client, member_user):
        today = timezone.localdate()
        member_user.training_days = [today.isoweekday()]
        member_user.save(update_fields=["training_days"])
        _, meal = self._create_daily_plan(member_user, today)
        self._complete_meal(member_user, today, meal)
        self._complete_workout(member_user, today)

        first_response = auth_client.post("/api/achievements/complete-day/")
        second_response = auth_client.post("/api/achievements/complete-day/")

        member_user.refresh_from_db()
        assert first_response.status_code == status.HTTP_200_OK
        assert first_response.data["daily_streak"] == 1
        assert second_response.status_code == status.HTTP_200_OK
        assert second_response.data["already_completed"] is True
        assert member_user.daily_streak == 1
        assert member_user.longest_streak == 1
        assert member_user.last_completed_day == today

    def test_complete_day_continues_consecutive_streak(self, auth_client, member_user):
        today = timezone.localdate()
        member_user.training_days = [today.isoweekday()]
        member_user.daily_streak = 2
        member_user.longest_streak = 2
        member_user.last_completed_day = today - timedelta(days=1)
        member_user.save(update_fields=["training_days", "daily_streak", "longest_streak", "last_completed_day"])
        _, meal = self._create_daily_plan(member_user, today)
        self._complete_meal(member_user, today, meal)
        self._complete_workout(member_user, today)

        response = auth_client.post("/api/achievements/complete-day/")

        member_user.refresh_from_db()
        assert response.status_code == status.HTTP_200_OK
        assert member_user.daily_streak == 3
        assert member_user.longest_streak == 3

    def test_complete_day_resets_current_streak_after_gap_but_preserves_longest(self, auth_client, member_user):
        today = timezone.localdate()
        member_user.training_days = [today.isoweekday()]
        member_user.daily_streak = 5
        member_user.longest_streak = 5
        member_user.last_completed_day = today - timedelta(days=2)
        member_user.save(update_fields=["training_days", "daily_streak", "longest_streak", "last_completed_day"])
        _, meal = self._create_daily_plan(member_user, today)
        self._complete_meal(member_user, today, meal)
        self._complete_workout(member_user, today)

        response = auth_client.post("/api/achievements/complete-day/")

        member_user.refresh_from_db()
        assert response.status_code == status.HTTP_200_OK
        assert member_user.daily_streak == 1
        assert member_user.longest_streak == 5

    def test_complete_day_on_rest_day_requires_only_nutrition(self, auth_client, member_user):
        today = timezone.localdate()
        rest_day = 7 if today.isoweekday() != 7 else 6
        member_user.training_days = [rest_day]
        member_user.save(update_fields=["training_days"])
        _, meal = self._create_daily_plan(member_user, today)
        self._complete_meal(member_user, today, meal)

        response = auth_client.post("/api/achievements/complete-day/")

        member_user.refresh_from_db()
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"]["workout_required"] is False
        assert member_user.daily_streak == 1

    def test_complete_day_unlocks_existing_streak_achievement(self, auth_client, member_user):
        today = timezone.localdate()
        Achievement.objects.create(
            key="racha_1",
            name="Racha 1",
            description="Completa una racha",
            category="streak",
            points=10,
            criteria={"type": "streak", "days": 1},
            is_active=True,
        )
        member_user.training_days = [today.isoweekday()]
        member_user.save(update_fields=["training_days"])
        _, meal = self._create_daily_plan(member_user, today)
        self._complete_meal(member_user, today, meal)
        self._complete_workout(member_user, today)

        response = auth_client.post("/api/achievements/complete-day/")

        assert response.status_code == status.HTTP_200_OK
        assert UserAchievement.objects.filter(user=member_user, achievement__key="racha_1").exists()
