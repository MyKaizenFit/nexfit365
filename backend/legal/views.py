from django.core.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from legal.models import DEFAULT_LOCALE
from legal.serializers import (
    LegalDocumentSerializer,
    LegalEventCreateSerializer,
    LegalEventSerializer,
)
from legal.services import DocumentNotCurrent, DocumentNotFound, build_status, get_active_documents, record_event


class ActiveLegalDocumentsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        locale = request.query_params.get("locale") or DEFAULT_LOCALE
        documents = get_active_documents(locale)
        return Response(LegalDocumentSerializer(documents, many=True).data)


class LegalStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        locale = request.query_params.get("locale") or DEFAULT_LOCALE
        status = build_status(request.user, locale)
        return Response(
            {
                "locale": status["locale"],
                "pending": LegalDocumentSerializer(status["pending"], many=True).data,
                "accepted": LegalEventSerializer(status["accepted"], many=True).data,
                "optional_consents": LegalEventSerializer(status["optional_consents"], many=True).data,
            }
        )


class LegalEventCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if "user" in request.data or "user_id" in request.data:
            return Response({"detail": "No se puede indicar el usuario."}, status=400)
        serializer = LegalEventCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            event, created = record_event(user=request.user, **serializer.validated_data)
        except DocumentNotFound:
            return Response({"detail": "El documento no existe."}, status=404)
        except DocumentNotCurrent:
            return Response({"detail": "El documento no está vigente."}, status=400)
        except ValidationError as exc:
            detail = getattr(exc, "messages", None) or ["No se pudo registrar el evento."]
            return Response({"detail": detail}, status=400)
        return Response(LegalEventSerializer(event).data, status=201 if created else 200)
