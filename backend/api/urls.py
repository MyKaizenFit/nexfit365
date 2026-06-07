# api/urls.py
# Esta app ya no contiene endpoints propios.
# Las URLs de Plan, Subscription, etc. fueron eliminadas.

from django.urls import path
from .views import submit_feedback

urlpatterns = [
    path("feedback/", submit_feedback, name="submit-feedback"),
]
