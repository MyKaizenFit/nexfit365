import hashlib
import unicodedata

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction


class DocumentCode(models.TextChoices):
    PRIVACY = "privacy", "Privacidad"
    TERMS = "terms", "Términos"
    HEALTH_NOTICE = "health_notice", "Aviso de datos de salud"
    COOKIES = "cookies", "Cookies"
    MARKETING = "marketing", "Marketing"


class Purpose(models.TextChoices):
    ACCOUNT = "account", "Cuenta"
    HEALTH_PROFILE = "health_profile", "Perfil de salud"
    PROGRESS_PHOTOS = "progress_photos", "Fotos de progreso"
    NUTRITION = "nutrition", "Nutrición"
    WORKOUTS = "workouts", "Entrenamiento"
    WELLNESS = "wellness", "Bienestar"
    MARKETING = "marketing", "Marketing"


class EventType(models.TextChoices):
    ACKNOWLEDGEMENT = "acknowledgement", "Acuse"
    ACCEPTANCE = "acceptance", "Aceptación"
    CONSENT_GRANTED = "consent_granted", "Consentimiento otorgado"
    CONSENT_WITHDRAWN = "consent_withdrawn", "Consentimiento retirado"


class LegalBasis(models.TextChoices):
    CONSENT = "consent", "Consentimiento"
    CONTRACT = "contract", "Contrato"
    LEGAL_OBLIGATION = "legal_obligation", "Obligación legal"
    LEGITIMATE_INTEREST = "legitimate_interest", "Interés legítimo"
    VITAL_INTEREST = "vital_interest", "Interés vital"
    PUBLIC_TASK = "public_task", "Misión pública"
    SPECIAL_CATEGORY_EXPLICIT_CONSENT = (
        "special_category_explicit_consent",
        "Consentimiento explícito de categoría especial",
    )
    OTHER = "other", "Otra"


class EventSource(models.TextChoices):
    REGISTRATION = "registration", "Registro"
    INITIAL_REGISTRATION = "initial_registration", "Registro inicial"
    SETTINGS = "settings", "Ajustes"
    REACCEPTANCE = "reacceptance", "Reaceptación"
    ADMIN = "admin", "Administración"
    API = "api", "API"


POSITIVE_EVENT_TYPES = (
    EventType.ACKNOWLEDGEMENT,
    EventType.ACCEPTANCE,
    EventType.CONSENT_GRANTED,
)
DEFAULT_LOCALE = "es-ES"
FROZEN_DOCUMENT_FIELDS = (
    "code",
    "version",
    "locale",
    "title",
    "body",
    "requires_acceptance",
    "requires_reacceptance",
    "withdrawable",
    "effective_at",
)


def legal_content_hash(title: str, body: str) -> str:
    """SHA-256 of normalized title and body. Ignores ids and timestamps."""
    normalized_title = unicodedata.normalize("NFC", title or "").replace("\r\n", "\n").strip()
    normalized_body = unicodedata.normalize("NFC", body or "").replace("\r\n", "\n").strip()
    payload = f"{normalized_title}\n{normalized_body}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


class LegalDocumentQuerySet(models.QuerySet):
    def update(self, **kwargs):
        frozen = set(FROZEN_DOCUMENT_FIELDS) | {"content_hash", "published_at"}
        if frozen & set(kwargs) and self.filter(published_at__isnull=False).exists():
            raise ValidationError("Un documento publicado no se modifica en bloque.")
        return super().update(**kwargs)

    def delete(self):
        if self.filter(published_at__isnull=False).exists():
            raise ValidationError("Un documento publicado no se elimina.")
        return super().delete()


class LegalDocument(models.Model):
    code = models.CharField(max_length=32, choices=DocumentCode.choices)
    version = models.CharField(max_length=32)
    locale = models.CharField(max_length=10, default=DEFAULT_LOCALE)
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    content_hash = models.CharField(max_length=64, editable=False)
    published_at = models.DateTimeField(null=True, blank=True)
    effective_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=False)
    requires_acceptance = models.BooleanField(default=False)
    requires_reacceptance = models.BooleanField(default=False)
    withdrawable = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = LegalDocumentQuerySet.as_manager()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["code", "version", "locale"],
                name="legal_document_version_unique",
            ),
            models.UniqueConstraint(
                fields=["code", "locale"],
                condition=models.Q(is_active=True),
                name="legal_one_active_per_code_locale",
            ),
        ]
        ordering = ["code", "locale", "-created_at"]

    def __str__(self):
        return f"{self.code} {self.version} ({self.locale})"

    def save(self, *args, **kwargs):
        self.content_hash = legal_content_hash(self.title, self.body)
        previous = None
        if self.pk:
            previous = type(self).objects.filter(pk=self.pk).first()
        if previous and self._is_locked(previous):
            self._reject_changes(previous)
        with transaction.atomic():
            if self.is_active:
                type(self).objects.filter(
                    code=self.code,
                    locale=self.locale,
                    is_active=True,
                ).exclude(pk=self.pk).update(is_active=False)
            super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.published_at or self.events.exists():
            raise ValidationError("Un documento publicado o usado no se elimina.")
        return super().delete(*args, **kwargs)

    def _is_locked(self, previous) -> bool:
        return previous.published_at is not None or previous.events.exists()

    def _reject_changes(self, previous):
        for field in FROZEN_DOCUMENT_FIELDS:
            if getattr(previous, field) != getattr(self, field):
                raise ValidationError("Un documento publicado no se modifica. Crea una versión nueva.")
        if previous.published_at != self.published_at:
            raise ValidationError("Un documento publicado no se modifica. Crea una versión nueva.")


class UserLegalEventQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise ValidationError("Los eventos legales no se modifican.")

    def delete(self):
        raise ValidationError("Los eventos legales no se eliminan.")


class UserLegalEvent(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="legal_events",
    )
    document = models.ForeignKey(
        LegalDocument,
        on_delete=models.PROTECT,
        related_name="events",
    )
    purpose = models.CharField(max_length=32, choices=Purpose.choices)
    event_type = models.CharField(max_length=32, choices=EventType.choices)
    legal_basis = models.CharField(max_length=64, choices=LegalBasis.choices, blank=True)
    source = models.CharField(max_length=32, choices=EventSource.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserLegalEventQuerySet.as_manager()

    class Meta:
        indexes = [
            models.Index(
                fields=["user", "document", "purpose", "created_at"],
                name="legal_event_lookup",
            ),
        ]
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.user_id} {self.event_type} {self.document_id}"

    def save(self, *args, **kwargs):
        if self.pk and type(self).objects.filter(pk=self.pk).exists():
            raise ValidationError("Los eventos legales no se modifican.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Los eventos legales no se eliminan.")
