"""Admin read-only body measurement listing for a user's profile."""
from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from progress.models import BodyMeasurement

User = get_user_model()


def _auth(client, user):
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client


def _url(user_id, suffix=""):
    return f"/api/admin/progress/users/{user_id}/measurements/{suffix}"


def _rows(payload):
    if isinstance(payload, dict):
        return payload.get("results", payload)
    return payload


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email="admin-meas@example.com",
        password="AdminPass123!",
        role="ADMIN",
        is_staff=True,
    )


@pytest.fixture
def member_user(db):
    return User.objects.create_user(
        email="member-meas@example.com",
        password="MemberPass123!",
        role="MEMBER",
        is_staff=False,
    )


@pytest.fixture
def other_member(db):
    return User.objects.create_user(
        email="other-meas@example.com",
        password="MemberPass123!",
        role="MEMBER",
        is_staff=False,
    )


@pytest.mark.django_db
class TestAdminBodyMeasurementViews:
    def test_admin_lists_user_measurements(self, api_client, admin_user, member_user):
        BodyMeasurement.objects.create(
            user=member_user,
            date=date(2026, 3, 1),
            waist=Decimal("70.00"),
            chest=Decimal("90.50"),
        )
        client = _auth(api_client, admin_user)
        response = client.get(_url(member_user.id))
        assert response.status_code == status.HTTP_200_OK
        rows = _rows(response.data)
        assert len(rows) == 1
        assert Decimal(str(rows[0]["waist"])) == Decimal("70.00")
        assert Decimal(str(rows[0]["chest"])) == Decimal("90.50")
        assert rows[0]["date"] == "2026-03-01"

    def test_member_cannot_access_admin_endpoint(self, api_client, member_user):
        client = _auth(api_client, member_user)
        response = client.get(_url(member_user.id))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_cannot_access(self, api_client, member_user):
        response = api_client.get(_url(member_user.id))
        assert response.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        )

    def test_results_belong_only_to_requested_user(
        self, api_client, admin_user, member_user, other_member
    ):
        own = BodyMeasurement.objects.create(
            user=member_user,
            date=date(2026, 1, 10),
            waist=Decimal("71.00"),
        )
        BodyMeasurement.objects.create(
            user=other_member,
            date=date(2026, 1, 11),
            waist=Decimal("99.00"),
            hips=Decimal("100.00"),
        )
        client = _auth(api_client, admin_user)
        response = client.get(_url(member_user.id))
        assert response.status_code == status.HTTP_200_OK
        rows = _rows(response.data)
        assert [row["id"] for row in rows] == [str(own.id)]
        assert all(Decimal(str(row["waist"])) != Decimal("99.00") for row in rows)

    def test_returns_multiple_historical_records_newest_first(
        self, api_client, admin_user, member_user
    ):
        BodyMeasurement.objects.create(
            user=member_user, date=date(2025, 1, 1), waist=Decimal("74.00")
        )
        BodyMeasurement.objects.create(
            user=member_user, date=date(2026, 6, 15), waist=Decimal("70.00")
        )
        BodyMeasurement.objects.create(
            user=member_user, date=date(2025, 8, 20), waist=Decimal("72.00")
        )
        client = _auth(api_client, admin_user)
        response = client.get(_url(member_user.id))
        rows = _rows(response.data)
        dates = [row["date"] for row in rows]
        assert dates == ["2026-06-15", "2025-08-20", "2025-01-01"]
        assert [Decimal(str(row["waist"])) for row in rows] == [
            Decimal("70.00"),
            Decimal("72.00"),
            Decimal("74.00"),
        ]

    def test_preserves_null_optional_fields(self, api_client, admin_user, member_user):
        BodyMeasurement.objects.create(
            user=member_user,
            date=date(2024, 5, 5),
            neck=Decimal("32.25"),
        )
        client = _auth(api_client, admin_user)
        response = client.get(_url(member_user.id))
        assert response.status_code == status.HTTP_200_OK
        row = _rows(response.data)[0]
        assert Decimal(str(row["neck"])) == Decimal("32.25")
        for field in ("chest", "waist", "hips", "arms", "thighs", "forearms", "calves"):
            assert row[field] is None
        assert row["notes"] == ""

    def test_empty_history_is_valid(self, api_client, admin_user, member_user):
        client = _auth(api_client, admin_user)
        response = client.get(_url(member_user.id))
        assert response.status_code == status.HTTP_200_OK
        rows = _rows(response.data)
        assert rows == []
        if isinstance(response.data, dict) and "count" in response.data:
            assert response.data["count"] == 0

    def test_get_does_not_modify_records(self, api_client, admin_user, member_user):
        measurement = BodyMeasurement.objects.create(
            user=member_user,
            date=date(2026, 2, 2),
            arms=Decimal("28.50"),
            notes="check-in",
        )
        before = list(
            BodyMeasurement.objects.filter(user=member_user)
            .order_by("id")
            .values(
                "id",
                "date",
                "chest",
                "waist",
                "hips",
                "arms",
                "thighs",
                "neck",
                "forearms",
                "calves",
                "notes",
                "created_at",
                "updated_at",
            )
        )
        updated_at = measurement.updated_at
        client = _auth(api_client, admin_user)
        response = client.get(_url(member_user.id))
        assert response.status_code == status.HTTP_200_OK
        measurement.refresh_from_db()
        after = list(
            BodyMeasurement.objects.filter(user=member_user)
            .order_by("id")
            .values(
                "id",
                "date",
                "chest",
                "waist",
                "hips",
                "arms",
                "thighs",
                "neck",
                "forearms",
                "calves",
                "notes",
                "created_at",
                "updated_at",
            )
        )
        assert before == after
        assert measurement.updated_at == updated_at
        assert BodyMeasurement.objects.filter(user=member_user).count() == 1

    def test_write_methods_are_not_allowed(self, api_client, admin_user, member_user):
        measurement = BodyMeasurement.objects.create(
            user=member_user,
            date=date(2026, 4, 1),
            calves=Decimal("35.00"),
        )
        client = _auth(api_client, admin_user)
        create = client.post(
            _url(member_user.id),
            {"date": "2026-04-02", "waist": "70.00"},
            format="json",
        )
        update = client.patch(
            _url(member_user.id, f"{measurement.id}/"),
            {"waist": "71.00"},
            format="json",
        )
        delete = client.delete(_url(member_user.id, f"{measurement.id}/"))
        assert create.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
        assert update.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
        assert delete.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
        measurement.refresh_from_db()
        assert measurement.waist is None
        assert measurement.calves == Decimal("35.00")
        assert BodyMeasurement.objects.filter(user=member_user).count() == 1

    def test_other_user_measurement_id_is_not_visible(
        self, api_client, admin_user, member_user, other_member
    ):
        foreign = BodyMeasurement.objects.create(
            user=other_member,
            date=date(2026, 3, 3),
            hips=Decimal("95.00"),
        )
        client = _auth(api_client, admin_user)
        response = client.get(_url(member_user.id, f"{foreign.id}/"))
        assert response.status_code == status.HTTP_404_NOT_FOUND
