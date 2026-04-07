from rest_framework import serializers
from .models import Notification, PushSubscription
from .models import AdminMessage


class AdminMessageSerializer(serializers.ModelSerializer):
    """Serializer para mensajes directos del admin"""
    user_email = serializers.ReadOnlyField(source='user.email')
    sent_by_email = serializers.ReadOnlyField(source='sent_by.email')
    is_read = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    
    class Meta:
        model = AdminMessage
        fields = [
            'id', 'user', 'user_email', 'sent_by', 'sent_by_email', 
            'title', 'message', 'action_url', 'read_at', 'expires_at',
            'is_read', 'is_expired', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'sent_by', 'created_at', 'updated_at', 'is_read', 'is_expired', 'read_at']


class AdminMessageCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear mensajes del admin"""
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        help_text="Lista de IDs de usuarios a los que enviar el mensaje"
    )
    
    class Meta:
        model = AdminMessage
        fields = ['user_ids', 'title', 'message', 'action_url', 'expires_at']
    
    def create(self, validated_data):
        """Este método no se usa; se usa en el viewset en su lugar"""
        raise NotImplementedError("Use the viewset's create method instead")


class AdminMessageUpdateSerializer(serializers.ModelSerializer):
    """Serializer para actualizar mensajes del admin (marcar como leído)"""
    class Meta:
        model = AdminMessage
        fields = ['read_at']
    
    def update(self, instance, validated_data):
        if 'read_at' in validated_data and validated_data['read_at'] is not None:
            instance.mark_as_read()
        return instance

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

    def validate_data(self, value):
        if value is not None and not isinstance(value, dict):
            raise serializers.ValidationError("El campo data debe ser un objeto JSON o null")
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
            ('workout_reminder', 'Recordatorio de entrenamiento'),
            ('meal_reminder', 'Recordatorio de comida'),
            ('achievement', 'Logro desbloqueado'),
            ('progress', 'Actualización de progreso'),
            ('system', 'Notificación del sistema'),
            ('nutrition', 'Notificación nutricional'),
            ('workout', 'Notificación de entrenamiento'),
            ('general', 'General'),
            ('info', 'Información'),
            ('warning', 'Advertencia'),
            ('success', 'Éxito'),
            ('error', 'Error'),
            ('meal', 'Comida'),
            ('reminder', 'Recordatorio'),
            ('motivation', 'Motivación'),
            ('admin', 'Administrador'),
            ('marketing', 'Marketing'),
        ],
        default='general'
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
    send_email = serializers.BooleanField(required=False, default=False)


class PushSubscriptionSerializer(serializers.ModelSerializer):
    """Serializer para suscripciones push"""
    user_email = serializers.ReadOnlyField(source='user.email')

    class Meta:
        model = PushSubscription
        fields = [
            'id', 'user', 'user_email', 'endpoint', 'p256dh', 'auth',
            'is_active', 'user_agent', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        """Acepta tanto formato plano como el anidado que envía el browser ({keys: {p256dh, auth}})"""
        mutable = dict(data)
        keys = mutable.pop('keys', None)
        if isinstance(keys, dict):
            if 'p256dh' in keys:
                mutable['p256dh'] = keys['p256dh']
            if 'auth' in keys:
                mutable['auth'] = keys['auth']
        return super().to_internal_value(mutable)

    def create(self, validated_data):
        """Crear o actualizar suscripción asociada al usuario autenticado"""
        request = self.context.get('request')
        if request and request.user:
            validated_data['user'] = request.user
            validated_data['user_agent'] = request.META.get('HTTP_USER_AGENT', '')
        # Usar update_or_create para que re-suscribirse desde el mismo browser no falle
        user = validated_data.pop('user')
        endpoint = validated_data.get('endpoint')
        obj, _ = PushSubscription.objects.update_or_create(
            user=user,
            endpoint=endpoint,
            defaults={**validated_data, 'is_active': True},
        )
        return obj