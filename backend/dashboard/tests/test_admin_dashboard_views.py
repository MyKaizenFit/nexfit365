import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from workouts.models import WorkoutLog

User = get_user_model()


@pytest.mark.django_db
def test_admin_dashboard_activity_includes_workout_comments():
    admin = User.objects.create_user(
        email="admin-dashboard@test.com",
        password="testpass123",
        is_staff=True,
        is_superuser=True,
    )
    user = User.objects.create_user(
        email="client-dashboard@test.com",
        password="testpass123",
    )
    WorkoutLog.objects.create(
        user=user,
        date="2026-06-08",
        completed=True,
        rating=4,
        notes="Me molestó un poco la rodilla en sentadilla.",
    )

    client = APIClient()
    client.force_authenticate(user=admin)

    response = client.get("/api/admin/dashboard/activity/")

    assert response.status_code == 200
    workout_logs = response.data["recent_workout_logs"]
    assert workout_logs[0]["notes"] == "Me molestó un poco la rodilla en sentadilla."

    workout_activity = next(item for item in response.data["activities"] if item["type"] == "workout")
    assert workout_activity["notes"] == "Me molestó un poco la rodilla en sentadilla."
