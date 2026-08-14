"""Tests for public media URL helpers."""

import os
from unittest.mock import patch

from django.test import RequestFactory, SimpleTestCase, override_settings

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

    @patch.dict(os.environ, {'PUBLIC_MEDIA_BASE_URL': 'https://metodosk.com/nexfit'}, clear=False)
    def test_configured_base_does_not_include_media_suffix(self):
        url = build_public_media_url(None, '/media/exercises/videos/demo.mp4')
        self.assertEqual(url, 'https://metodosk.com/nexfit/media/exercises/videos/demo.mp4')

    @patch.dict(os.environ, {'PUBLIC_MEDIA_BASE_URL': 'https://api.nexfit365.dpdns.org'}, clear=False)
    def test_configured_base_keeps_old_api_host(self):
        url = build_public_media_url(None, '/media/exercises/videos/demo.mp4')
        self.assertEqual(url, 'https://api.nexfit365.dpdns.org/media/exercises/videos/demo.mp4')

    @patch.dict(os.environ, {'PUBLIC_MEDIA_BASE_URL': 'https://metodosk.com/nexfit'}, clear=False)
    def test_configured_base_wins_over_request_host(self):
        request = RequestFactory().get('/')
        url = build_public_media_url(request, '/media/exercises/videos/demo.mp4')
        self.assertEqual(url, 'https://metodosk.com/nexfit/media/exercises/videos/demo.mp4')

    @patch.dict(os.environ, {'PUBLIC_MEDIA_BASE_URL': 'https://metodosk.com/nexfit'}, clear=False)
    def test_historical_absolute_api_urls_unchanged(self):
        historical = 'https://api.nexfit365.dpdns.org/media/exercises/videos/demo.mp4'
        request = RequestFactory().get('/')
        self.assertEqual(build_public_media_url(request, historical), historical)

    @patch.dict(os.environ, {'PUBLIC_MEDIA_BASE_URL': 'https://metodosk.com/nexfit'}, clear=False)
    def test_exercise_thumbnail_keeps_nexfit_and_single_media(self):
        url = build_public_media_url(None, '/media/exercises/thumbnails/cover.jpg')
        self.assertEqual(url, 'https://metodosk.com/nexfit/media/exercises/thumbnails/cover.jpg')
        self.assertNotIn('/media/media/', url)
        self.assertNotIn('/nexfit/api/media/', url)
        self.assertNotEqual(url, 'https://metodosk.com/media/exercises/thumbnails/cover.jpg')

    @patch.dict(os.environ, {'PUBLIC_MEDIA_BASE_URL': 'https://metodosk.com/nexfit'}, clear=False)
    def test_recipe_file_and_external_and_historical(self):
        from types import SimpleNamespace
        from backend.media_urls import recipe_image_display_url

        relative = SimpleNamespace(image_url='', image=SimpleNamespace(url='/media/recipes/images/a.jpg'))
        self.assertEqual(
            recipe_image_display_url(relative),
            'https://metodosk.com/nexfit/media/recipes/images/a.jpg',
        )

        external = SimpleNamespace(image_url='https://drive.google.com/file/d/abc', image=None)
        self.assertEqual(recipe_image_display_url(external), 'https://drive.google.com/file/d/abc')

        historical = SimpleNamespace(
            image_url='https://api.nexfit365.dpdns.org/media/recipes/images/old.jpg',
            image=None,
        )
        self.assertEqual(
            recipe_image_display_url(historical),
            'https://api.nexfit365.dpdns.org/media/recipes/images/old.jpg',
        )

    @patch.dict(os.environ, {'PUBLIC_MEDIA_BASE_URL': 'https://metodosk.com/nexfit'}, clear=False)
    def test_signed_pii_path_keeps_nexfit_api_prefix(self):
        from backend.media_urls import build_public_absolute_url

        url = build_public_absolute_url(None, '/api/progress/protected-media/?token=abc')
        self.assertEqual(
            url,
            'https://metodosk.com/nexfit/api/progress/protected-media/?token=abc',
        )
        self.assertIn('/nexfit/api/progress/protected-media/', url)
