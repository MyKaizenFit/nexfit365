from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source="user.email")
    is_read = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    
    class Meta:
        model = Notification
        fields = [
            "id", "user", "type", "title", "message", "data", "action_url",
            "read_at", "expires_at", "is_read", "is_expired", "created_at"
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at", "is_read", "is_expired"]


class NotificationCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear notificaciones (staff/sistema)"""
    
    class Meta:
        model = Notification
        fields = [
            "user", "type", "title", "message", "data", "action_url", "expires_at"
        ]
        extra_kwargs = {
            'user': {'required': False}  # El user se asigna automáticamente en perform_create
        }
    
    def validate_user(self, value):
        # Solo staff puede crear notificaciones para otros usuarios
        request = self.context.get("request")
        if request and value and request.user != value and not request.user.is_staff:
            raise serializers.ValidationError(
                "No puedes crear notificaciones para otros usuarios"
            )
        return value


class NotificationUpdateSerializer(serializers.ModelSerializer):
    """Serializer para actualizar notificaciones"""
    
    class Meta:
        model = Notification
        fields = ["read_at"]
    
    def update(self, instance, validated_data):
        # Si se está marcando como leído
        if "read_at" in validated_data and validated_data["read_at"] is not None:
            instance.mark_as_read()
        # Si se está marcando como no leído
        elif "read_at" in validated_data and validated_data["read_at"] is None:
            instance.mark_as_unread()
        
        return instance


class NotificationSummarySerializer(serializers.Serializer):
    """Serializer para resumen de notificaciones"""
    total_notifications = serializers.IntegerField()
    unread_count = serializers.IntegerField()
    notifications_by_type = serializers.DictField()
    latest_notification = serializers.DateTimeField(allow_null=True)


class CreateNotificationSerializer(serializers.Serializer):
    """Serializer para crear notificaciones desde el panel de administrador"""
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="Lista de IDs de usuarios. Si no se proporciona, se envía a todos los usuarios activos."
    )
    title = serializers.CharField(max_length=200)
    message = serializers.CharField()
    type = serializers.ChoiceField(
        choices=[
            ('info', 'Información'),
            ('warning', 'Advertencia'),
            ('success', 'Éxito'),
            ('error', 'Error'),
        ],
        default='info'
    )
    priority = serializers.ChoiceField(
        choices=[
            ('low', 'Baja'),
            ('medium', 'Media'),
            ('high', 'Alta'),
        ],
        default='medium'
    )
    action_url = serializers.URLField(required=False, allow_blank=True)
    expires_at = serializers.DateTimeField(required=False, allow_null=True) 