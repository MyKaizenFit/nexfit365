from django.conf import settings
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from rest_framework import serializers

from .models import ProgressPhoto, WeightEntry, BodyMeasurement, DailyWellness, RestWellnessAssessment
from .photo_types import ALL_TYPE_KEYS


def _build_public_media_url(request, media_path: str | None) -> str | None:
    """Build absolute media URLs and keep production media HTTPS-safe."""
    if not media_path:
        return None

    if not request:
        return media_path

    url = request.build_absolute_uri(media_path)
    forwarded_proto = (request.META.get("HTTP_X_FORWARDED_PROTO") or "").split(",")[0].strip().lower()
    host = (request.get_host() or "").split(":")[0].lower()
    is_local_host = host in {"localhost", "127.0.0.1", "0.0.0.0"} or host.endswith(".local")

    should_force_https = (
        forwarded_proto == "https"
        or request.is_secure()
        or (not settings.DEBUG and not is_local_host)
    )

    if should_force_https and url.startswith("http://"):
        return "https://" + url[len("http://"):]
    return url


class ProgressPhotoSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source="user.email")
    photo_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProgressPhoto
        fields = [
            "id", "user", "photo", "photo_url", "thumbnail_url", "photo_type", 
            "date", "weight", "notes", "measurements", "created_at"
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]
    
    def create(self, validated_data):
        """Crear foto asociada al usuario autenticado."""
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
    
    def validate_photo_type(self, value):
        """Validar que el tipo de foto sea válido (incluye legado side/other)."""
        if value not in ALL_TYPE_KEYS:
            raise serializers.ValidationError(
                f"Tipo de foto inválido. Valores permitidos: {', '.join(sorted(ALL_TYPE_KEYS))}"
            )
        return value
    
    def validate_weight(self, value):
        """Validar que el peso sea válido si se proporciona"""
        if value is not None and value <= 0:
            raise serializers.ValidationError("El peso debe ser mayor a 0")
        return value
    
    def get_photo_url(self, obj) -> str | None:
        if obj.photo:
            request = self.context.get("request")
            return _build_public_media_url(request, obj.photo.url)
        return None
    
    def get_thumbnail_url(self, obj) -> str | None:
        if obj.thumbnail:
            request = self.context.get("request")
            return _build_public_media_url(request, obj.thumbnail.url)
        return None
    
    def validate_photo(self, value):
        if isinstance(value, list):
            if not value:
                raise serializers.ValidationError("No se proporcionó ningún archivo")
            value = value[0]

        if not hasattr(value, "size") or not hasattr(value, "content_type"):
            raise serializers.ValidationError("El campo photo debe ser un archivo válido")

        from django.conf import settings
        if value.size > settings.MAX_PROGRESS_PHOTO_SIZE:
            raise serializers.ValidationError(
                f"El archivo es demasiado grande. Tamaño máximo: {settings.MAX_PROGRESS_PHOTO_SIZE // (1024*1024)}MB"
            )

        allowed_types = [
            "image/jpeg", "image/png", "image/jpg", "image/webp",
            "image/heic", "image/heif", "application/octet-stream",
        ]

        if value.content_type not in allowed_types:
            file_extension = value.name.lower().split(".")[-1] if "." in value.name else ""
            allowed_extensions = ["jpg", "jpeg", "png", "webp", "heic", "heif"]

            if file_extension not in allowed_extensions:
                raise serializers.ValidationError(
                    f"Tipo de archivo no permitido. Recibido: {value.content_type}, extensión: {file_extension}. "
                    f"Tipos permitidos: {', '.join(allowed_types)}"
                )

        return value


class WeightEntrySerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source="user.email")
    
    class Meta:
        model = WeightEntry
        fields = ["id", "user", "weight", "date", "notes", "created_at"]
        read_only_fields = ["id", "user", "created_at", "updated_at"]
    
    def to_representation(self, instance):
        """Convertir Decimal a float para la serialización JSON"""
        representation = super().to_representation(instance)
        # Convertir weight de Decimal/string a float
        if 'weight' in representation and representation['weight'] is not None:
            try:
                from decimal import Decimal
                if isinstance(instance.weight, Decimal):
                    representation['weight'] = float(instance.weight)
                elif isinstance(representation['weight'], str):
                    representation['weight'] = float(representation['weight'])
            except (ValueError, TypeError):
                # Si no se puede convertir, dejarlo como está
                pass
        return representation
    
    def create(self, validated_data):
        """Crear entrada de peso con usuario del request"""
        from decimal import Decimal
        from dashboard.models import UserStats
        from django.utils import timezone

        request = self.context.get("request")
        user = validated_data.pop("user", None) or request.user
        validated_data["weight"] = Decimal(str(validated_data["weight"]))

        existing_entries = WeightEntry.objects.filter(user=user).count()
        if existing_entries == 0:
            stats, created = UserStats.objects.get_or_create(
                user=user,
                defaults={
                    "starting_weight": validated_data["weight"],
                    "current_weight": validated_data["weight"],
                    "transformation_start_date": validated_data.get("date", timezone.now().date()),
                },
            )
            if not created and not stats.starting_weight:
                stats.starting_weight = validated_data["weight"]
                stats.current_weight = validated_data["weight"]
                if not stats.transformation_start_date:
                    stats.transformation_start_date = validated_data.get("date", timezone.now().date())
                stats.save()
        else:
            stats, _ = UserStats.objects.get_or_create(user=user)
            stats.current_weight = validated_data["weight"]
            stats.save()

        user.weight = validated_data["weight"]
        user.save(update_fields=["weight"])

        entry = WeightEntry.objects.create(
            user=user,
            weight=validated_data["weight"],
            date=validated_data["date"],
            notes=validated_data.get("notes", ""),
        )

        try:
            from notifications.utils import notify_admins_user_change
            notify_admins_user_change(
                user=user,
                title='🔔 Usuario registró peso',
                message=(
                    f"{user.email} registró {validated_data['weight']} kg "
                    f"el {validated_data['date'].strftime('%d/%m/%Y')}"
                ),
                data={
                    'category': 'weight_entry',
                    'weight': str(validated_data['weight']),
                    'date': validated_data['date'].isoformat(),
                    'source': 'progress',
                },
            )
        except Exception:
            pass

        return entry
    
    def validate_weight(self, value):
        # Convertir a Decimal si es necesario
        try:
            from decimal import Decimal
            if isinstance(value, (int, float)):
                value = Decimal(str(value))
            elif isinstance(value, str):
                value = Decimal(value)
            elif not isinstance(value, Decimal):
                raise serializers.ValidationError("El peso debe ser un número válido")
        except (ValueError, TypeError):
            raise serializers.ValidationError("El peso debe ser un número válido")
        
        if value <= 0:
            raise serializers.ValidationError("El peso debe ser mayor a 0")
        
        return value
    
    def validate_date(self, value):
        """Validar que la fecha no sea en el futuro (día local del servidor)."""
        from django.utils import timezone
        if value > timezone.localdate():
            raise serializers.ValidationError("La fecha no puede ser en el futuro")
        return value


class BodyMeasurementSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source="user.email")
    
    class Meta:
        model = BodyMeasurement
        fields = [
            "id", "user", "date", "chest", "waist", "hips", "arms", 
            "thighs", "neck", "forearms", "calves", "notes", "created_at"
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]
    
    def validate(self, data):
        # Al menos una medida debe estar presente
        measurement_fields = [
            "chest", "waist", "hips", "arms", 
            "thighs", "neck", "forearms", "calves"
        ]
        
        if not any(data.get(field) for field in measurement_fields):
            raise serializers.ValidationError(
                "Al menos una medida debe estar presente"
            )
        
        return data


class ProgressSummarySerializer(serializers.Serializer):
    """Serializer para resumen de progreso"""
    total_photos = serializers.IntegerField()
    total_weight_entries = serializers.IntegerField()
    total_measurements = serializers.IntegerField()
    latest_weight = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)
    latest_weight_date = serializers.DateField(allow_null=True)
    weight_change = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)
    weight_change_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)
    photos_this_month = serializers.IntegerField()
    weight_entries_this_month = serializers.IntegerField()


class DailyWellnessSerializer(serializers.ModelSerializer):
    """Serializer para registro diario de bienestar (sueño y motivación)"""
    user = serializers.ReadOnlyField(source="user.email")
    sleep_hours = serializers.DecimalField(
        max_digits=4,
        decimal_places=2,
        min_value=Decimal("0"),
        max_value=Decimal("24"),
    )
    
    class Meta:
        model = DailyWellness
        fields = [
            "id", "user", "date", "sleep_hours", "motivation_score", 
            "notes", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]

    def validate_sleep_hours(self, value):
        """Aceptar valores de teclado movil como 7.45 y guardarlos con 1 decimal."""
        try:
            rounded = Decimal(value).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
        except (InvalidOperation, TypeError, ValueError) as exc:
            raise serializers.ValidationError("Introduce horas de sueno validas.") from exc
        if rounded < Decimal("0") or rounded > Decimal("24"):
            raise serializers.ValidationError("Las horas de sueno deben estar entre 0 y 24.")
        return rounded
    
    def create(self, validated_data):
        """Crear registro de bienestar con usuario del request"""
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class RestWellnessAssessmentSubmittedSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    message = serializers.CharField()


class RestWellnessAssessmentCreateSerializer(serializers.Serializer):
    answers = serializers.ListField(
        child=serializers.BooleanField(allow_null=True),
        min_length=32,
        max_length=32,
    )

    def validate_answers(self, value):
        if any(answer is None for answer in value):
            raise serializers.ValidationError("Todas las preguntas deben tener respuesta Sí o No.")
        return value


class RestWellnessAssessmentListSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    date = serializers.DateTimeField(source="created_at")

    class Meta:
        model = RestWellnessAssessment
        fields = ["id", "name", "date", "top_categories", "scores"]

    def get_name(self, obj):
        full_name = obj.user.get_full_name().strip()
        return full_name or obj.user.email


class RestWellnessAssessmentDetailSerializer(RestWellnessAssessmentListSerializer):
    script = serializers.CharField(read_only=True)
    ranked = serializers.SerializerMethodField()
    answers = serializers.JSONField(read_only=True)

    class Meta(RestWellnessAssessmentListSerializer.Meta):
        fields = RestWellnessAssessmentListSerializer.Meta.fields + [
            "script",
            "ranked",
            "answers",
        ]

    def get_ranked(self, obj):
        from .rest_wellness_content import build_ranked_with_tiers

        return build_ranked_with_tiers(obj.scores or {})
