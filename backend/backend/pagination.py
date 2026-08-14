"""DRF pagination that emits public API next/previous links."""

from rest_framework.pagination import PageNumberPagination
from rest_framework.utils.urls import remove_query_param, replace_query_param

from backend.api_urls import public_api_request_url


class PublicApiPageNumberPagination(PageNumberPagination):
    """PageNumberPagination whose next/previous use PUBLIC_API_BASE_URL."""

    def get_next_link(self):
        if not self.page.has_next():
            return None
        url = public_api_request_url(self.request)
        page_number = self.page.next_page_number()
        return replace_query_param(url, self.page_query_param, page_number)

    def get_previous_link(self):
        if not self.page.has_previous():
            return None
        url = public_api_request_url(self.request)
        page_number = self.page.previous_page_number()
        if page_number == 1:
            return remove_query_param(url, self.page_query_param)
        return replace_query_param(url, self.page_query_param, page_number)
