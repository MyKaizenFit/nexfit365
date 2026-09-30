from django.core.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from legal.health import health_consent_status, record_health_consents
from legal.models import DEFAULT_LOCALE, DocumentCode, EventType
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
                "health": health_consent_status(request.user, locale),
            }
        )


class LegalEventCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if "user" in request.data or "user_id" in request.data:
            return Response({"detail": "No se puede indicar el usuario."}, status=400)
        serializer = LegalEventCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        purposes = data.pop("purposes")
        data.pop("purpose", None)
        try:
            if (
                data["code"] == DocumentCode.HEALTH_NOTICE
                and data["event_type"] in (EventType.CONSENT_GRANTED, EventType.CONSENT_WITHDRAWN)
            ):
                data.pop("code", None)
                recorded = record_health_consents(user=request.user, purposes=purposes, **data)
                events = [event for event, _created in recorded]
                created = any(item_created for _event, item_created in recorded)
                payload = LegalEventSerializer(events, many=True).data
                body = payload[0] if len(payload) == 1 else {"events": payload}
                return Response(body, status=201 if created else 200)
            if len(purposes) != 1:
                return Response({"detail": "Solo el aviso de salud admite varias finalidades."}, status=400)
            event, created = record_event(user=request.user, purpose=purposes[0], **data)
        except DocumentNotFound:
            return Response({"detail": "El documento no existe."}, status=404)
        except DocumentNotCurrent:
            return Response({"detail": "El documento no está vigente."}, status=400)
        except ValidationError as exc:
            detail = getattr(exc, "messages", None) or ["No se pudo registrar el evento."]
            return Response({"detail": detail}, status=400)
        return Response(LegalEventSerializer(event).data, status=201 if created else 200)
