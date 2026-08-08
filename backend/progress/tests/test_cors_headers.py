"""
Tests CORS headers for media upload endpoints.
Ensures preflight OPTIONS responses include required custom headers.
"""
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()


class CorsHeadersTestCase(TestCase):
    """Test CORS headers for upload endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.origin = "https://nexfit365.dpdns.org"

    def test_progress_photos_preflight_includes_idempotency_key(self):
        """OPTIONS /api/progress-photos/ must allow Idempotency-Key header."""
        response = self.client.options(
            "/api/progress-photos/",
            HTTP_ORIGIN=self.origin,
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="content-type,x-csrftoken,idempotency-key",
        )
        self.assertEqual(response.status_code, 200)
        allow_headers = response.get("Access-Control-Allow-Headers", "").lower()
        self.assertIn("idempotency-key", allow_headers)
        self.assertEqual(response.get("Access-Control-Allow-Origin"), self.origin)
        self.assertEqual(response.get("Access-Control-Allow-Credentials"), "true")

    def test_exercise_upload_video_preflight_includes_x_upload_id(self):
        """OPTIONS /api/admin/exercises/<id>/upload-video/ must allow X-Upload-ID header."""
        # Exercise ID doesn't matter - we're testing OPTIONS/CORS, not the actual view
        response = self.client.options(
            "/api/admin/exercises/1/upload-video/",
            HTTP_ORIGIN=self.origin,
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="x-csrftoken,x-upload-id",
        )
        self.assertEqual(response.status_code, 200)
        allow_headers = response.get("Access-Control-Allow-Headers", "").lower()
        self.assertIn("x-upload-id", allow_headers)
        self.assertEqual(response.get("Access-Control-Allow-Origin"), self.origin)
        self.assertEqual(response.get("Access-Control-Allow-Credentials"), "true")

    def test_unauthorized_origin_rejected(self):
        """Origin not in CORS_ALLOWED_ORIGINS should not get CORS headers."""
        response = self.client.options(
            "/api/progress-photos/",
            HTTP_ORIGIN="https://evil.com",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="content-type",
        )
        # Should NOT have CORS headers for unauthorized origin
        self.assertNotEqual(response.get("Access-Control-Allow-Origin"), "https://evil.com")

    def test_credentials_true_for_allowed_origin(self):
        """CORS_ALLOW_CREDENTIALS must be true for allowed origin."""
        response = self.client.options(
            "/api/progress-photos/",
            HTTP_ORIGIN=self.origin,
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="content-type",
        )
        self.assertEqual(response.get("Access-Control-Allow-Credentials"), "true")


@override_settings(DEBUG=True)
class CorsHeadersDevTestCase(TestCase):
    """In DEBUG mode, all headers should be allowed via CORS_ALLOW_ALL_HEADERS."""

    def setUp(self):
        self.client = APIClient()
        self.origin = "https://nexfit365.dpdns.org"

    def test_dev_allows_all_requested_headers(self):
        """In DEBUG, any requested header should be echoed back."""
        response = self.client.options(
            "/api/progress-photos/",
            HTTP_ORIGIN=self.origin,
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="content-type,x-csrftoken,idempotency-key,x-upload-id,x-custom-header",
        )
        self.assertEqual(response.status_code, 200)
        # In DEBUG, CORS_ALLOW_ALL_HEADERS=True reflects requested headers
        allow_headers = response.get("Access-Control-Allow-Headers", "")
        self.assertIn("idempotency-key", allow_headers.lower())
        self.assertIn("x-upload-id", allow_headers.lower())
