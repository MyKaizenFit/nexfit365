import json

import pytest
from rest_framework.test import APIRequestFactory, force_authenticate

from accounts.views import gdpr_export_data
from notifications.models import Notification


@pytest.mark.django_db
def test_gdpr_export_includes_notifications(user):
    Notification.objects.create(
        user=user,
        title="Aviso de prueba",
        message="Cuerpo",
        type="general",
    )

    factory = APIRequestFactory()
    request = factory.get("/api/accounts/gdpr/export/")
    force_authenticate(request, user=user)
    response = gdpr_export_data(request)

    assert response.status_code == 200
    payload = json.loads(response.content)
    assert len(payload["notifications"]) == 1
    assert payload["notifications"][0]["title"] == "Aviso de prueba"
    assert payload["notifications"][0]["is_read"] is False
    assert "read_at" in payload["notifications"][0]
