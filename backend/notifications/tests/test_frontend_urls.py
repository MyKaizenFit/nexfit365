"""Frontend URL helper used by notification links."""

from django.test import SimpleTestCase, override_settings

from backend.frontend_urls import build_frontend_url


class TestBuildFrontendUrl(SimpleTestCase):
    @override_settings(FRONTEND_URL="https://metodosk.com/nexfit")
    def test_joins_subpath_frontend(self):
        self.assertEqual(
            build_frontend_url("/dashboard"),
            "https://metodosk.com/nexfit/dashboard",
        )
        self.assertEqual(
            build_frontend_url("/admin/user-v2/42"),
            "https://metodosk.com/nexfit/admin/user-v2/42",
        )
        self.assertEqual(
            build_frontend_url("/dashboard?section=recipe-community"),
            "https://metodosk.com/nexfit/dashboard?section=recipe-community",
        )

    @override_settings(FRONTEND_URL="https://nexfit365.dpdns.org")
    def test_joins_old_frontend_host(self):
        self.assertEqual(
            build_frontend_url("/dashboard"),
            "https://nexfit365.dpdns.org/dashboard",
        )

    @override_settings(FRONTEND_URL="https://metodosk.com/nexfit")
    def test_keeps_absolute_historical_urls(self):
        historical = "https://nexfit365.dpdns.org/dashboard"
        self.assertEqual(build_frontend_url(historical), historical)
