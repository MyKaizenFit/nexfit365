from django.urls import path

from legal.views import ActiveLegalDocumentsView, LegalEventCreateView, LegalStatusView

urlpatterns = [
    path("documents/active/", ActiveLegalDocumentsView.as_view(), name="legal-documents-active"),
    path("status/", LegalStatusView.as_view(), name="legal-status"),
    path("events/", LegalEventCreateView.as_view(), name="legal-events"),
]
