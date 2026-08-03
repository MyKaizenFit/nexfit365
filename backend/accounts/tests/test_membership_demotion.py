import pytest
from django.utils import timezone
from datetime import timedelta

from accounts.models import CustomUser
from accounts.serializers import UserProfileSerializer


@pytest.mark.django_db
def test_profile_serializer_persists_expired_trial_demotion():
    user = CustomUser.objects.create_user(
        email="trial-expired@test.com",
        password="testpass123",
        role="premium",
    )
    user.subscription_status = "trial"
    user.subscription_plan = "trial"
    user.trial_started_at = timezone.now() - timedelta(days=10)
    user.trial_ends_at = timezone.now() - timedelta(days=1)
    user.save(
        update_fields=[
            "role",
            "subscription_status",
            "subscription_plan",
            "trial_started_at",
            "trial_ends_at",
        ]
    )

    data = UserProfileSerializer(user).data
    user.refresh_from_db()

    assert data["role"] == "basic"
    assert data["subscription_status"] == "expired"
    assert user.role == "basic"
    assert user.subscription_status == "expired"
