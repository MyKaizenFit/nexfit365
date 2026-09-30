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
    purpose = serializers.ChoiceField(choices=Purpose.choices, required=False)
    purposes = serializers.ListField(
        child=serializers.ChoiceField(choices=Purpose.choices),
        required=False,
        allow_empty=False,
    )
    event_type = serializers.ChoiceField(choices=EventType.choices)
    source = serializers.ChoiceField(choices=EventSource.choices)
    legal_basis = serializers.ChoiceField(choices=LegalBasis.choices, required=False, allow_blank=True)

    def validate(self, attrs):
        purposes = list(attrs.get("purposes") or [])
        purpose = attrs.get("purpose")
        if purpose and purpose not in purposes:
            purposes.insert(0, purpose)
        if not purposes:
            raise serializers.ValidationError({"purpose": "Indica la finalidad."})
        deduped = []
        for item in purposes:
            if item not in deduped:
                deduped.append(item)
        attrs["purposes"] = deduped
        attrs["purpose"] = deduped[0]
        attrs["legal_basis"] = attrs.get("legal_basis") or ""
        attrs["locale"] = attrs.get("locale") or DEFAULT_LOCALE
        return attrs
