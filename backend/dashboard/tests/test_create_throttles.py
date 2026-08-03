import pytest
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework.throttling import SimpleRateThrottle

from dashboard.models import CoachingPlan


@pytest.mark.django_db
class TestAnonymousCreateThrottles:
    """Scoped create throttles (DRF freezes rates on the throttle class)."""

    def setup_method(self):
        cache.clear()

    def teardown_method(self):
        cache.clear()

    def test_coaching_inquiry_create_throttled(self, monkeypatch):
        plan = CoachingPlan.objects.create(
            slug="throttle-plan",
            name="Throttle Plan",
            duration_label="3 meses",
            tier="basic",
            benefits=["A"],
            is_active=True,
            sort_order=1,
        )
        rates = dict(SimpleRateThrottle.THROTTLE_RATES)
        rates["coaching_inquiry_create"] = "3/min"
        monkeypatch.setattr(SimpleRateThrottle, "THROTTLE_RATES", rates)

        client = APIClient()
        payload = {
            "plan_id": str(plan.id),
            "goal": "Quiero ayuda con la constancia y el plan",
            "preferred_contact": "email",
            "email": "lead@example.com",
            "availability": "Tardes",
        }

        for i in range(4):
            response = client.post("/api/coaching/inquiries/", payload, format="json")
            if i < 3:
                assert response.status_code == status.HTTP_201_CREATED, response.data
            else:
                assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS

    def test_problem_report_create_throttled(self, monkeypatch):
        rates = dict(SimpleRateThrottle.THROTTLE_RATES)
        rates["problem_report_create"] = "3/min"
        monkeypatch.setattr(SimpleRateThrottle, "THROTTLE_RATES", rates)

        client = APIClient()
        payload = {
            "problem_type": "bug",
            "subject": "Fallo de prueba",
            "description": "Descripción suficientemente larga para el reporte",
            "contact_email": "reporter@example.com",
        }

        for i in range(4):
            response = client.post("/api/problem-reports/", payload, format="json")
            if i < 3:
                assert response.status_code == status.HTTP_201_CREATED, response.data
            else:
                assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
