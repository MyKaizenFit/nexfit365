"""Consentimiento de salud por finalidad y puerta de uso.

El enforcement solo existe cuando hay un health_notice activo, publicado
y con requires_acceptance. Sin ese documento, el comportamiento actual
no cambia. Retirar el consentimiento no borra datos: deja un trabajo
pending para PHASE 1D-C.
"""

from django.core.exceptions import ValidationError
from django.db import transaction
from rest_framework.exceptions import APIException

from legal.models import (
    DEFAULT_LOCALE,
    DocumentCode,
    EventType,
    HealthCleanupStatus,
    HealthDataDeletionJob,
    LegalBasis,
    Purpose,
    UserLegalEvent,
)
from legal.services import (
    DocumentNotCurrent,
    _latest_event,
    get_active_legal_document,
    record_event,
)

HEALTH_PURPOSES = (
    Purpose.HEALTH_PROFILE,
    Purpose.NUTRITION,
    Purpose.WORKOUTS,
    Purpose.PROGRESS_PHOTOS,
    Purpose.WELLNESS,
)

CORE_PURPOSES = (
    Purpose.HEALTH_PROFILE,
    Purpose.NUTRITION,
    Purpose.WORKOUTS,
)

HEALTH_PROFILE_FIELDS = frozenset(
    {
        "gender",
        "height",
        "weight",
        "target_weight",
        "activity_level",
        "allergies",
        "dietary_restrictions",
        "medical_conditions",
        "injuries_or_medical_issues",
        "additional_info_for_admin",
    }
)

NUTRITION_WRITE_FIELDS = frozenset({"admin_calories_override"})

OPTIONAL_WHEN_ENFORCED = ("gender", "height", "weight", "activity_level")


class HealthConsentRequired(APIException):
    status_code = 403
    default_detail = {
        "detail": "Esta función usa datos de salud y necesita tu consentimiento.",
        "code": "health_consent_required",
    }
    default_code = "health_consent_required"


def health_consent_enforcement_active(locale: str = DEFAULT_LOCALE) -> bool:
    document = get_active_legal_document(DocumentCode.HEALTH_NOTICE, locale)
    return bool(document and document.requires_acceptance)


def _latest_purpose_event(user, purpose: str, locale: str = DEFAULT_LOCALE):
    return (
        UserLegalEvent.objects.filter(
            user=user,
            purpose=purpose,
            document__code=DocumentCode.HEALTH_NOTICE,
            document__locale=locale,
            document__published_at__isnull=False,
        )
        .select_related("document")
        .order_by("-created_at", "-id")
        .first()
    )


def has_active_health_consent(user, purpose: str, locale: str = DEFAULT_LOCALE) -> bool:
    if not health_consent_enforcement_active(locale):
        return True
    document = get_active_legal_document(DocumentCode.HEALTH_NOTICE, locale)
    if document.requires_reacceptance:
        latest = _latest_event(user, document, purpose)
        return latest is not None and latest.event_type == EventType.CONSENT_GRANTED
    latest = _latest_purpose_event(user, purpose, locale)
    return latest is not None and latest.event_type == EventType.CONSENT_GRANTED


def require_health_consent(user, purpose: str, locale: str = DEFAULT_LOCALE):
    if has_active_health_consent(user, purpose, locale):
        return
    raise HealthConsentRequired()


def purpose_state(user, purpose: str, locale: str = DEFAULT_LOCALE) -> str:
    document = get_active_legal_document(DocumentCode.HEALTH_NOTICE, locale)
    if document is None or not document.requires_acceptance:
        return "not_required"
    latest = _latest_purpose_event(user, purpose, locale)
    if document.requires_reacceptance:
        current = _latest_event(user, document, purpose)
        if current is not None and current.event_type == EventType.CONSENT_GRANTED:
            return "granted"
        if latest is not None and latest.event_type == EventType.CONSENT_GRANTED:
            return "pending_new_version"
        if latest is not None and latest.event_type == EventType.CONSENT_WITHDRAWN:
            return "withdrawn"
        return "not_granted"
    if latest is None:
        return "not_granted"
    if latest.event_type == EventType.CONSENT_GRANTED:
        return "granted"
    if latest.event_type == EventType.CONSENT_WITHDRAWN:
        return "withdrawn"
    return "not_granted"


def health_consent_status(user, locale: str = DEFAULT_LOCALE):
    document = get_active_legal_document(DocumentCode.HEALTH_NOTICE, locale)
    groups = (
        ("core", CORE_PURPOSES),
        ("progress_photos", (Purpose.PROGRESS_PHOTOS,)),
        ("wellness", (Purpose.WELLNESS,)),
    )
    payload_groups = []
    for group_id, purposes in groups:
        items = []
        for purpose in purposes:
            latest = _latest_purpose_event(user, purpose, locale) if document else None
            items.append(
                {
                    "purpose": purpose,
                    "state": purpose_state(user, purpose, locale),
                    "version": latest.document.version if latest else None,
                    "changed_at": latest.created_at.isoformat() if latest else None,
                }
            )
        payload_groups.append({"id": group_id, "purposes": list(purposes), "items": items})
    return {
        "enforcement_active": bool(document and document.requires_acceptance),
        "document": (
            {
                "code": document.code,
                "version": document.version,
                "title": document.title,
            }
            if document
            else None
        ),
        "groups": payload_groups,
    }


def _has_value(data, fields) -> bool:
    for key in fields:
        if key not in data:
            continue
        value = data[key]
        if value is None or value == "" or value == [] or value == {}:
            continue
        return True
    return False


def reject_ungranted_health_writes(user, data, locale: str = DEFAULT_LOCALE):
    if not health_consent_enforcement_active(locale):
        return
    if _has_value(data, HEALTH_PROFILE_FIELDS):
        require_health_consent(user, Purpose.HEALTH_PROFILE, locale)
    if _has_value(data, NUTRITION_WRITE_FIELDS):
        require_health_consent(user, Purpose.NUTRITION, locale)


def queue_health_cleanup(user, purpose: str):
    open_job = HealthDataDeletionJob.objects.filter(
        user=user,
        purpose=purpose,
        status__in=(HealthCleanupStatus.PENDING, HealthCleanupStatus.PROCESSING),
    ).first()
    if open_job:
        return open_job
    return HealthDataDeletionJob.objects.create(
        user=user,
        purpose=purpose,
        status=HealthCleanupStatus.PENDING,
    )


@transaction.atomic
def record_health_consents(
    *,
    user,
    purposes,
    event_type,
    source,
    version,
    locale=DEFAULT_LOCALE,
    legal_basis="",
):
    document = get_active_legal_document(DocumentCode.HEALTH_NOTICE, locale)
    if document is None or not document.requires_acceptance or document.version != version:
        raise DocumentNotCurrent("No hay un aviso de salud vigente que requiera consentimiento.")
    if event_type not in (EventType.CONSENT_GRANTED, EventType.CONSENT_WITHDRAWN):
        raise ValidationError("El aviso de salud solo admite concesión o retirada.")
    if not purposes:
        raise ValidationError("Indica la finalidad.")
    results = []
    for purpose in purposes:
        if purpose not in HEALTH_PURPOSES:
            raise ValidationError("Finalidad no cubierta por el aviso de salud.")
        if event_type == EventType.CONSENT_GRANTED:
            if has_active_health_consent(user, purpose, locale):
                latest = _latest_purpose_event(user, purpose, locale)
                results.append((latest, False))
                continue
            event, created = record_event(
                user=user,
                code=document.code,
                version=document.version,
                locale=locale,
                purpose=purpose,
                event_type=event_type,
                source=source,
                legal_basis=legal_basis or LegalBasis.SPECIAL_CATEGORY_EXPLICIT_CONSENT,
            )
            results.append((event, created))
            continue
        latest = _latest_purpose_event(user, purpose, locale)
        if latest is not None and latest.event_type == EventType.CONSENT_WITHDRAWN:
            results.append((latest, False))
            continue
        if latest is None or latest.event_type != EventType.CONSENT_GRANTED:
            raise ValidationError("No hay un consentimiento vigente para retirar.")
        event = UserLegalEvent.objects.create(
            user=user,
            document=document,
            purpose=purpose,
            event_type=EventType.CONSENT_WITHDRAWN,
            legal_basis=legal_basis or LegalBasis.SPECIAL_CATEGORY_EXPLICIT_CONSENT,
            source=source,
        )
        queue_health_cleanup(user, purpose)
        results.append((event, True))
    return results
