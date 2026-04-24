import pytest
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from dashboard.models import CoachingPlan, CoachingInquiry
from notifications.models import Notification

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def member_user():
    return User.objects.create_user(
        email="coaching-user@example.com",
        password="StrongPass123!",
        first_name="Iago",
        last_name="Cliente",
        role="basic",
    )


@pytest.fixture
def auth_client(api_client, member_user):
    refresh = RefreshToken.for_user(member_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api_client


@pytest.fixture
def admin_user():
    return User.objects.create_user(
        email="admin-coaching@example.com",
        password="StrongPass123!",
        first_name="Admin",
        last_name="Coach",
        role="admin",
        is_staff=True,
        is_superuser=True,
    )


@pytest.fixture
def admin_client(admin_user):
    client = APIClient()
    refresh = RefreshToken.for_user(admin_user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client


@pytest.mark.django_db
class TestCoachingPlansApi:
    def test_list_active_coaching_plans(self, auth_client):
        CoachingPlan.objects.create(
            slug="trimestral-basic",
            name="Trimestral Basic",
            duration_label="3 meses",
            tier="basic",
            benefits=[
                "Revisión quincenal",
                "Lista de correo privada vitalicia",
                "Curso de regalo",
            ],
            is_active=True,
            sort_order=1,
        )

        response = auth_client.get("/api/coaching/plans/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["slug"] == "trimestral-basic"
        assert "benefits" in response.data[0]


@pytest.mark.django_db
class TestCoachingInquiryApi:
    def test_create_inquiry_generates_contact_links(self, auth_client, member_user):
        plan = CoachingPlan.objects.create(
            slug="trimestral-vip",
            name="Trimestral VIP",
            duration_label="3 meses",
            tier="vip",
            benefits=["Respuesta en 24h", "Revisión semanal"],
            is_active=True,
            sort_order=2,
        )

        payload = {
            "plan_id": str(plan.id),
            "goal": "Perder grasa y ganar consistencia",
            "current_challenge": "No consigo mantener el plan y necesito seguimiento.",
            "preferred_contact": "both",
            "phone_number": "+34600111222",
            "availability": "Tardes de lunes a jueves",
        }

        response = auth_client.post("/api/coaching/inquiries/", payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["plan"]["slug"] == "trimestral-vip"
        assert "wa.me" in response.data["whatsapp_url"]
        assert response.data["mailto_url"].startswith("mailto:")
        assert "calendly" in response.data["booking_url"]

        inquiry = CoachingInquiry.objects.get(user=member_user)
        assert inquiry.plan == plan
        assert inquiry.preferred_contact == "both"
        assert inquiry.status == "pending"

    def test_create_inquiry_requires_contact_details_for_selected_channel(self, auth_client):
        anonymous_client = APIClient()
        payload = {
            "goal": "Quiero ayuda real",
            "preferred_contact": "email",
            "availability": "Mañanas",
        }

        response = anonymous_client.post("/api/coaching/inquiries/", payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in str(response.data).lower()

        payload = {
            "goal": "Quiero seguimiento por WhatsApp",
            "preferred_contact": "whatsapp",
            "availability": "Tardes",
            "phone_number": "",
        }

        response = auth_client.post("/api/coaching/inquiries/", payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "teléfono" in str(response.data).lower() or "phone" in str(response.data).lower()

    def test_create_inquiry_tracks_source_screen(self, auth_client, member_user):
        plan = CoachingPlan.objects.create(
            slug="tracking-screen-vip",
            name="Tracking VIP",
            duration_label="3 meses",
            tier="vip",
            benefits=["Seguimiento semanal"],
            is_active=True,
            sort_order=4,
        )

        payload = {
            "plan_id": str(plan.id),
            "goal": "Necesito ayuda con la constancia",
            "preferred_contact": "both",
            "availability": "Tardes",
            "source_screen": "workouts",
        }

        response = auth_client.post("/api/coaching/inquiries/", payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["source_screen"] == "workouts"

        inquiry = CoachingInquiry.objects.get(user=member_user, plan=plan)
        assert inquiry.source_screen == "workouts"

    def test_create_inquiry_notifies_internal_team(self, auth_client, admin_user):
        plan = CoachingPlan.objects.create(
            slug="semestral-vip-alert",
            name="Semestral VIP",
            duration_label="6 meses",
            tier="vip",
            benefits=["Seguimiento semanal"],
            is_active=True,
            sort_order=4,
        )

        payload = {
            "plan_id": str(plan.id),
            "goal": "Quiero acompañamiento 1 a 1",
            "current_challenge": "Me cuesta mantener constancia sin seguimiento.",
            "preferred_contact": "email",
            "availability": "Mañanas",
        }

        response = auth_client.post("/api/coaching/inquiries/", payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        notification = Notification.objects.filter(
            user=admin_user,
            type="system",
            data__category="coaching_lead",
        ).first()
        assert notification is not None
        assert "nueva solicitud" in notification.title.lower()
        assert "acompañamiento 1 a 1" in notification.message.lower()

    def test_admin_sees_follow_up_helpers_for_stale_leads(self, admin_client, member_user):
        plan = CoachingPlan.objects.create(
            slug="trimestral-basic-followup",
            name="Trimestral Basic",
            duration_label="3 meses",
            tier="basic",
            benefits=["Revisión quincenal"],
            is_active=True,
            sort_order=5,
        )
        inquiry = CoachingInquiry.objects.create(
            user=member_user,
            plan=plan,
            goal="Necesito ayuda para mantener el foco",
            preferred_contact="whatsapp",
            availability="Tardes",
        )
        CoachingInquiry.objects.filter(id=inquiry.id).update(
            created_at=timezone.now() - timedelta(days=3)
        )

        response = admin_client.get("/api/coaching/inquiries/")

        assert response.status_code == status.HTTP_200_OK
        payload = response.data["results"] if isinstance(response.data, dict) else response.data
        match = next(item for item in payload if item["id"] == str(inquiry.id))
        assert match["needs_follow_up"] is True
        assert match["days_waiting"] >= 3
        assert "wa.me" in match["followup_whatsapp_url"]

    def test_admin_can_update_inquiry_status(self, admin_client, member_user):
        plan = CoachingPlan.objects.create(
            slug="anual-vip-admin",
            name="Anual VIP",
            duration_label="12 meses",
            tier="vip",
            benefits=["Respuesta en 24h"],
            is_active=True,
            sort_order=3,
        )
        inquiry = CoachingInquiry.objects.create(
            user=member_user,
            plan=plan,
            goal="Necesito seguimiento real",
            preferred_contact="whatsapp",
        )

        response = admin_client.patch(
            f"/api/coaching/inquiries/{inquiry.id}/",
            {"status": "scheduled", "notes": "Llamada de valoración agendada."},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        inquiry.refresh_from_db()
        assert inquiry.status == "scheduled"
        assert inquiry.notes == "Llamada de valoración agendada."


@pytest.mark.django_db
class TestSubscriptionTrialApi:
    def test_user_can_start_free_trial(self, auth_client, member_user):
        response = auth_client.post("/api/start-free-trial/", {}, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        member_user.refresh_from_db()
        assert member_user.subscription_status == "trial"
        assert member_user.subscription_plan == "trial"
        assert member_user.role == "premium"

        status_response = auth_client.get("/api/subscription-status/")
        assert status_response.status_code == status.HTTP_200_OK
        assert status_response.data["is_active"] is True
        assert status_response.data["can_start_trial"] is False
        assert status_response.data["days_remaining"] >= 6

    def test_user_cannot_reuse_trial(self, auth_client, member_user):
        member_user.start_free_trial(days=7)

        response = auth_client.post("/api/start-free-trial/", {}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "prueba gratuita" in response.data["detail"].lower()

    def test_expired_trial_reverts_user_to_basic(self, auth_client, member_user):
        member_user.subscription_status = "trial"
        member_user.subscription_plan = "trial"
        member_user.role = "premium"
        member_user.trial_started_at = timezone.now() - timedelta(days=8)
        member_user.trial_ends_at = timezone.now() - timedelta(hours=1)
        member_user.save(update_fields=[
            "subscription_status",
            "subscription_plan",
            "role",
            "trial_started_at",
            "trial_ends_at",
            "updated_at",
        ])

        response = auth_client.get("/api/subscription-status/")

        assert response.status_code == status.HTTP_200_OK
        member_user.refresh_from_db()
        assert response.data["status"] == "expired"
        assert member_user.subscription_status == "expired"
        assert member_user.role == "basic"
