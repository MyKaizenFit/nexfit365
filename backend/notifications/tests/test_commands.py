import io
from datetime import timedelta

import pytest
from django.core.management import call_command
from django.contrib.auth import get_user_model
from django.utils import timezone

from notifications.models import Notification

User = get_user_model()


@pytest.fixture
def member_user():
    return User.objects.create_user(
        email="command-member@example.com",
        password="MemberPass123!",
        first_name="Command",
        last_name="Member",
        role="MEMBER",
    )


@pytest.mark.django_db
class TestCleanupExpiredNotificationsCommand:
    def test_dry_run_reports_expired_without_deleting(self, member_user):
        notification = Notification.objects.create(
            user=member_user,
            type="general",
            title="Expirada",
            message="Debe detectarse",
            expires_at=timezone.now() + timedelta(days=1),
        )
        Notification.objects.filter(id=notification.id).update(expires_at=timezone.now() - timedelta(hours=1))

        out = io.StringIO()
        call_command("cleanup_expired_notifications", "--dry-run", stdout=out)

        notification.refresh_from_db()
        assert "Se encontraron 1 notificaciones expiradas" in out.getvalue()
        assert Notification.objects.filter(id=notification.id).exists()

    def test_command_deletes_only_expired_notifications(self, member_user):
        expired = Notification.objects.create(
            user=member_user,
            type="general",
            title="Expirada",
            message="Debe borrarse",
            expires_at=timezone.now() + timedelta(days=1),
        )
        active = Notification.objects.create(
            user=member_user,
            type="general",
            title="Activa",
            message="Debe quedarse",
            expires_at=timezone.now() + timedelta(days=2),
        )
        Notification.objects.filter(id=expired.id).update(expires_at=timezone.now() - timedelta(hours=1))

        out = io.StringIO()
        call_command("cleanup_expired_notifications", stdout=out)

        assert "Eliminadas 1 notificaciones expiradas" in out.getvalue()
        assert not Notification.objects.filter(id=expired.id).exists()
        assert Notification.objects.filter(id=active.id).exists()
