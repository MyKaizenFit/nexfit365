"""Tests for public media URL helpers."""

from django.test import SimpleTestCase, override_settings

from backend.media_urls import build_public_media_url, get_public_media_base_url


class TestPublicMediaUrls(SimpleTestCase):
    @override_settings(DEBUG=False, ALLOWED_HOSTS=['api.nexfit365.dpdns.org'])
    def test_get_public_media_base_url_from_allowed_hosts(self):
        self.assertEqual(get_public_media_base_url(), 'https://api.nexfit365.dpdns.org')

    @override_settings(DEBUG=False, ALLOWED_HOSTS=['api.nexfit365.dpdns.org'])
    def test_build_public_media_url_without_request_uses_api_base(self):
        url = build_public_media_url(None, '/media/exercises/videos/demo.mp4')
        self.assertEqual(url, 'https://api.nexfit365.dpdns.org/media/exercises/videos/demo.mp4')

    def test_build_public_media_url_keeps_external_urls(self):
        external = 'https://drive.google.com/file/d/abc/preview'
        self.assertEqual(build_public_media_url(None, external), external)
