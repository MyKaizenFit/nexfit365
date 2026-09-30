"""Block ordinary API use while required privacy/terms documents are pending.

Staff are exempt so operations are not locked out. Rights, legal, and session
endpoints stay available. The check runs after DRF authentication.
"""

from rest_framework.exceptions import APIException

_INSTALLED = False

ALLOWED_PREFIXES = (
    "/api/legal/",
    "/api/gdpr/",
    "/api/auth/logout",
    "/api/auth/refresh",
    "/api/auth/login",
    "/api/auth/clear-session",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/health",
)

ALLOWED_READ_PREFIXES = (
    "/api/me",
    "/api/profile/",
    "/api/auth/me",
)


class LegalPending(APIException):
    status_code = 403
    default_detail = {
        "detail": "Hay documentos legales pendientes.",
        "code": "legal_pending",
    }
    default_code = "legal_pending"


def _allowed(request) -> bool:
    path = request.path or ""
    if any(path.startswith(prefix) for prefix in ALLOWED_PREFIXES):
        return True
    if request.method in ("GET", "HEAD", "OPTIONS") and any(
        path.startswith(prefix) for prefix in ALLOWED_READ_PREFIXES
    ):
        return True
    return False


def enforce_legal_gate(request):
    user = getattr(request, "user", None)
    if user is None or not getattr(user, "is_authenticated", False):
        return
    if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
        return
    if _allowed(request):
        return
    from legal.services import get_pending_required_documents

    if get_pending_required_documents(user):
        raise LegalPending()


def install_legal_gate():
    global _INSTALLED
    if _INSTALLED:
        return
    from rest_framework.views import APIView

    original = APIView.initial

    def initial(self, request, *args, **kwargs):
        original(self, request, *args, **kwargs)
        enforce_legal_gate(request)

    APIView.initial = initial
    _INSTALLED = True
