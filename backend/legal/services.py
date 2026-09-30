from django.core.exceptions import ValidationError

from legal.models import (
    DEFAULT_LOCALE,
    POSITIVE_EVENT_TYPES,
    EventType,
    LegalDocument,
    UserLegalEvent,
)


class DocumentNotFound(ValidationError):
    pass


class DocumentNotCurrent(ValidationError):
    pass


def get_active_legal_document(code: str, locale: str = DEFAULT_LOCALE):
    return (
        LegalDocument.objects.filter(
            code=code,
            locale=locale,
            is_active=True,
            published_at__isnull=False,
        )
        .order_by("-published_at", "-id")
        .first()
    )


def get_active_documents(locale: str = DEFAULT_LOCALE):
    return LegalDocument.objects.filter(
        locale=locale,
        is_active=True,
        published_at__isnull=False,
    ).order_by("code")


def _latest_event(user, document, purpose=None):
    events = UserLegalEvent.objects.filter(user=user, document=document)
    if purpose is not None:
        events = events.filter(purpose=purpose)
    return events.order_by("-created_at", "-id").first()


def has_current_acceptance(user, document, purpose=None) -> bool:
    latest = _latest_event(user, document, purpose)
    return latest is not None and latest.event_type in POSITIVE_EVENT_TYPES


def has_covering_acceptance(user, document) -> bool:
    if document.requires_reacceptance:
        return has_current_acceptance(user, document)
    versions = LegalDocument.objects.filter(
        code=document.code,
        locale=document.locale,
        published_at__isnull=False,
    )
    return any(has_current_acceptance(user, version) for version in versions)


def get_pending_required_documents(user, locale: str = DEFAULT_LOCALE):
    pending = []
    for document in get_active_documents(locale):
        if document.requires_acceptance and not has_covering_acceptance(user, document):
            pending.append(document)
    return pending


def current_optional_consents(user):
    seen = set()
    current = []
    events = (
        UserLegalEvent.objects.filter(user=user, event_type=EventType.CONSENT_GRANTED)
        .select_related("document")
        .order_by("document_id", "purpose", "-created_at", "-id")
    )
    for event in events:
        key = (event.document_id, event.purpose)
        if key in seen:
            continue
        seen.add(key)
        latest = _latest_event(user, event.document, event.purpose)
        if latest and latest.event_type == EventType.CONSENT_GRANTED:
            current.append(latest)
    return current


def record_event(*, user, code, version, locale, purpose, event_type, source, legal_basis=""):
    document = LegalDocument.objects.filter(code=code, version=version, locale=locale).first()
    if document is None:
        raise DocumentNotFound("El documento no existe.")
    if document.published_at is None or not document.is_active:
        raise DocumentNotCurrent("El documento no está vigente.")
    if event_type == EventType.CONSENT_WITHDRAWN and not document.withdrawable:
        raise ValidationError("Este documento no admite retirada.")
    if event_type == EventType.CONSENT_WITHDRAWN:
        latest = _latest_event(user, document, purpose)
        if latest is None or latest.event_type != EventType.CONSENT_GRANTED:
            if latest and latest.event_type == EventType.CONSENT_WITHDRAWN:
                return latest, False
            raise ValidationError("No hay un consentimiento vigente que retirar.")

    latest = _latest_event(user, document, purpose)
    if latest and latest.event_type == event_type:
        return latest, False

    event = UserLegalEvent.objects.create(
        user=user,
        document=document,
        purpose=purpose,
        event_type=event_type,
        legal_basis=legal_basis or "",
        source=source,
    )
    return event, True


REGISTRATION_EVENT_TYPES = {
    "privacy": EventType.ACKNOWLEDGEMENT,
    "terms": EventType.ACCEPTANCE,
}


def registration_documents_confirmed(payload, locale: str = DEFAULT_LOCALE):
    """Active required privacy/terms the client confirmed by version.

    The client never supplies the user. Event type is chosen here.
    """
    submitted = payload.get("legal") if isinstance(payload, dict) else None
    if not isinstance(submitted, dict):
        submitted = {}
    confirmed = []
    missing = []
    for document in get_active_documents(locale):
        if document.code not in REGISTRATION_EVENT_TYPES or not document.requires_acceptance:
            continue
        item = submitted.get(document.code)
        version = item.get("version") if isinstance(item, dict) else None
        if version != document.version:
            missing.append(document.code)
            continue
        confirmed.append(document)
    if missing:
        raise ValidationError("Debes confirmar los documentos vigentes antes de crear la cuenta.")
    return confirmed


def record_registration_acknowledgements(user, documents):
    from legal.models import EventSource, Purpose

    for document in documents:
        record_event(
            user=user,
            code=document.code,
            version=document.version,
            locale=document.locale,
            purpose=Purpose.ACCOUNT,
            event_type=REGISTRATION_EVENT_TYPES[document.code],
            source=EventSource.REGISTRATION,
        )


def build_status(user, locale: str = DEFAULT_LOCALE):
    accepted = []
    seen = set()
    events = (
        UserLegalEvent.objects.filter(user=user)
        .select_related("document")
        .order_by("document_id", "purpose", "-created_at", "-id")
    )
    for event in events:
        key = (event.document_id, event.purpose)
        if key in seen:
            continue
        seen.add(key)
        if event.event_type in POSITIVE_EVENT_TYPES:
            accepted.append(event)
    return {
        "locale": locale,
        "pending": get_pending_required_documents(user, locale),
        "accepted": accepted,
        "optional_consents": current_optional_consents(user),
    }
