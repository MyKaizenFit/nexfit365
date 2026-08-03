import pytest
from rest_framework.test import APIRequestFactory, force_authenticate

from accounts.models import AccountDeletionRequest
from accounts.views import gdpr_request_deletion


@pytest.mark.django_db
def test_gdpr_deletion_creates_durable_request(user):
    factory = APIRequestFactory()
    request = factory.post(
        "/api/accounts/gdpr/delete/",
        {"reason": "Quiero borrar mis datos"},
        format="json",
    )
    force_authenticate(request, user=user)
    response = gdpr_request_deletion(request)

    assert response.status_code == 200
    req = AccountDeletionRequest.objects.get(user=user)
    assert req.reason == "Quiero borrar mis datos"
    assert req.status == AccountDeletionRequest.Status.PENDING
