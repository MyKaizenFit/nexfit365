from rest_framework import serializers

from legal.models import (
    DEFAULT_LOCALE,
    EventSource,
    EventType,
    LegalBasis,
    LegalDocument,
    Purpose,
    UserLegalEvent,
)


class LegalDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LegalDocument
        fields = (
            "code",
            "version",
            "locale",
            "title",
            "body",
            "content_hash",
            "requires_acceptance",
            "requires_reacceptance",
            "withdrawable",
            "effective_at",
            "published_at",
        )


class LegalEventSerializer(serializers.ModelSerializer):
    code = serializers.CharField(source="document.code", read_only=True)
    version = serializers.CharField(source="document.version", read_only=True)
    locale = serializers.CharField(source="document.locale", read_only=True)
    content_hash = serializers.CharField(source="document.content_hash", read_only=True)

    class Meta:
        model = UserLegalEvent
        fields = (
            "id",
            "code",
            "version",
            "locale",
            "content_hash",
            "purpose",
            "event_type",
            "legal_basis",
            "source",
            "created_at",
        )


class LegalEventCreateSerializer(serializers.Serializer):
    code = serializers.ChoiceField(choices=LegalDocument._meta.get_field("code").choices)
    version = serializers.CharField(max_length=32)
    locale = serializers.CharField(max_length=10, default=DEFAULT_LOCALE)
    purpose = serializers.ChoiceField(choices=Purpose.choices)
    event_type = serializers.ChoiceField(choices=EventType.choices)
    source = serializers.ChoiceField(choices=EventSource.choices)
    legal_basis = serializers.ChoiceField(choices=LegalBasis.choices, required=False, allow_blank=True)

    def validate(self, attrs):
        attrs["legal_basis"] = attrs.get("legal_basis") or ""
        attrs["locale"] = attrs.get("locale") or DEFAULT_LOCALE
        return attrs
