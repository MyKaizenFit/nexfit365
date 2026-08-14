"""PUBLIC_API_BASE_URL pagination links. No production database."""

import os
from urllib.parse import parse_qs, urlparse

from django.core.paginator import Paginator
from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory
from unittest.mock import patch

from backend.pagination import PublicApiPageNumberPagination


def _links(path: str, page_number: int):
    request = APIRequestFactory().get(path)
    pagination = PublicApiPageNumberPagination()
    pagination.request = request
    pagination.page = Paginator(list(range(50)), 10).page(page_number)
    return pagination.get_previous_link(), pagination.get_next_link()


def _query(url: str) -> dict[str, list[str]]:
    return parse_qs(urlparse(url).query)


class TestPublicApiPagination(SimpleTestCase):
    @patch.dict(os.environ, {"PUBLIC_API_BASE_URL": "https://metodosk.com/nexfit/api"}, clear=False)
    def test_future_nexfit_next_and_previous(self):
        previous, nxt = _links(
            "/api/admin/exercises/?search=press&ordering=name&page=2",
            2,
        )
        self.assertIsNotNone(previous)
        self.assertIsNotNone(nxt)
        self.assertEqual(
            urlparse(nxt).scheme + "://" + urlparse(nxt).netloc + urlparse(nxt).path,
            "https://metodosk.com/nexfit/api/admin/exercises/",
        )
        self.assertEqual(
            urlparse(previous).scheme + "://" + urlparse(previous).netloc + urlparse(previous).path,
            "https://metodosk.com/nexfit/api/admin/exercises/",
        )
        self.assertIn("/nexfit/api/", nxt)
        self.assertIn("/nexfit/api/", previous)
        self.assertNotEqual(nxt, "https://metodosk.com/api/admin/exercises/?page=3")
        self.assertEqual(_query(nxt)["page"], ["3"])
        self.assertEqual(_query(nxt)["search"], ["press"])
        self.assertEqual(_query(nxt)["ordering"], ["name"])
        self.assertNotIn("page", _query(previous))
        self.assertEqual(_query(previous)["search"], ["press"])
        self.assertEqual(_query(previous)["ordering"], ["name"])

    @patch.dict(os.environ, {"PUBLIC_API_BASE_URL": "https://metodosk.com/nexfit/api"}, clear=False)
    def test_preserves_page_size_and_filters(self):
        _previous, nxt = _links(
            "/api/notifications/?page=1&page_size=20&search=hola&ordering=-created_at",
            1,
        )
        self.assertIsNone(_previous)
        self.assertEqual(_query(nxt)["page"], ["2"])
        self.assertEqual(_query(nxt)["page_size"], ["20"])
        self.assertEqual(_query(nxt)["search"], ["hola"])
        self.assertEqual(_query(nxt)["ordering"], ["-created_at"])
        self.assertTrue(nxt.startswith("https://metodosk.com/nexfit/api/notifications/"))

    @patch.dict(
        os.environ,
        {"PUBLIC_API_BASE_URL": "https://api.nexfit365.dpdns.org/api"},
        clear=False,
    )
    def test_old_api_host(self):
        previous, nxt = _links("/api/admin/exercises/?page=2", 2)
        self.assertTrue(nxt.startswith("https://api.nexfit365.dpdns.org/api/admin/exercises/"))
        self.assertTrue(previous.startswith("https://api.nexfit365.dpdns.org/api/admin/exercises/"))
        self.assertNotIn("/nexfit/", nxt)
        self.assertEqual(_query(nxt)["page"], ["3"])

    def test_fallback_without_public_api_base_url(self):
        with patch.dict(os.environ, {"PUBLIC_API_BASE_URL": ""}, clear=False):
            previous, nxt = _links("/api/admin/exercises/?search=press&page=2", 2)
        self.assertIsNotNone(nxt)
        self.assertIsNotNone(previous)
        self.assertIn("/api/admin/exercises/", nxt)
        self.assertNotIn("/nexfit/", nxt)
        self.assertEqual(_query(nxt)["search"], ["press"])
        self.assertEqual(_query(nxt)["page"], ["3"])

    def test_media_base_does_not_drive_pagination(self):
        with patch.dict(
            os.environ,
            {
                "PUBLIC_API_BASE_URL": "",
                "PUBLIC_MEDIA_BASE_URL": "https://metodosk.com/nexfit",
            },
            clear=False,
        ):
            _previous, nxt = _links("/api/admin/exercises/?page=1", 1)
        self.assertIn("/api/admin/exercises/", nxt)
        self.assertNotIn("/nexfit/api/", nxt)
