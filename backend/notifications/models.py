import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True


class Notification(TimeStampedModel):
    NOTIFICATION_TYPES = [
        ("workout_reminder", "Recordatorio de entrenamiento"),
        ("meal_reminder", "Recordatorio de comida"),
        ("achievement", "Logro desbloqueado"),
        ("progress", "Actualización de progreso"),
        ("system", "Notificación del sistema"),
        ("nutrition", "Notificación nutricional"),
        ("workout", "Notificación de entrenamiento"),
        ("general", "General"),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name="notifications"
    )
    type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES, default="general")
    title = models.CharField(max_length=200)
    message = models.TextField()
    data = models.JSONField(null=True, blank=True)  # Datos adicionales específicos del tipo
    action_url = models.URLField(blank=True, default="")  # URL para acción (opcional)
    read_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "read_at"]),
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["user", "type"]),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.title} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
    
    @property
    def is_read(self):
        return self.read_at is not None
    
    @property
    def is_expired(self):
        if self.expires_at is None:
            return False
        return timezone.now() > self.expires_at
    
    def mark_as_read(self):
        if not self.is_read:
            self.read_at = timezone.now()
            self.save(update_fields=["read_at"])
    
    def mark_as_unread(self):
        if self.is_read:
            self.read_at = None
            self.save(update_fields=["read_at"])
    
    def clean(self):
        if self.expires_at and self.expires_at <= timezone.now():
            from django.core.exceptions import ValidationError
            raise ValidationError("La fecha de expiración debe ser en el futuro")
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs) 


class MotivationalTip(TimeStampedModel):
    """
    Consejos motivacionales que rotan cada 24 horas
    """
    title = models.CharField(max_length=200, help_text="Título del consejo")
    content = models.TextField(help_text="Contenido del consejo")
    category = models.CharField(
        max_length=50,
        choices=[
            ('motivation', 'Motivación'),
            ('nutrition', 'Nutrición'),
            ('workout', 'Entrenamiento'),
            ('mindset', 'Mentalidad'),
            ('recovery', 'Recuperación'),
            ('general', 'General'),
        ],
        default='general'
    )
    is_active = models.BooleanField(default=True, help_text="Si el consejo está activo")
    priority = models.PositiveIntegerField(default=1, help_text="Prioridad del consejo (1-10)")
    last_shown = models.DateTimeField(null=True, blank=True, help_text="Última vez que se mostró")
    
    class Meta:
        ordering = ['-priority', '-created_at']
        verbose_name = "Consejo Motivacional"
        verbose_name_plural = "Consejos Motivacionales"
    
    def __str__(self):
        return f"{self.title} ({self.get_category_display()})"


class FeedbackMessage(TimeStampedModel):
    """
    Mensajes de feedback de usuarios para administradores
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="feedback_messages")
    subject = models.CharField(max_length=200, help_text="Asunto del mensaje")
    message = models.TextField(help_text="Contenido del mensaje")
    category = models.CharField(
        max_length=50,
        choices=[
            ('bug', 'Error/Bug'),
            ('feature', 'Nueva Funcionalidad'),
            ('improvement', 'Mejora'),
            ('complaint', 'Queja'),
            ('compliment', 'Elogio'),
            ('other', 'Otro'),
        ],
        default='other'
    )
    priority = models.CharField(
        max_length=20,
        choices=[
            ('low', 'Baja'),
            ('medium', 'Media'),
            ('high', 'Alta'),
            ('urgent', 'Urgente'),
        ],
        default='medium'
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ('new', 'Nuevo'),
            ('in_progress', 'En Progreso'),
            ('resolved', 'Resuelto'),
            ('closed', 'Cerrado'),
        ],
        default='new'
    )
    admin_response = models.TextField(blank=True, help_text="Respuesta del administrador")
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_feedback"
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Mensaje de Feedback"
        verbose_name_plural = "Mensajes de Feedback"
    
    def __str__(self):
        return f"{self.subject} - {self.user.email} ({self.get_status_display()})"
    
    def mark_as_resolved(self, admin_user, response=""):
        self.status = 'resolved'
        self.resolved_by = admin_user
        self.resolved_at = timezone.now()
        self.admin_response = response
        self.save()


class PushSubscription(TimeStampedModel):
    """
    Suscripciones push para notificaciones en tiempo real
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='push_subscriptions'
    )
    endpoint = models.URLField(max_length=500, help_text="URL del endpoint de push")
    p256dh = models.CharField(max_length=200, help_text="Clave pública p256dh")
    auth = models.CharField(max_length=200, help_text="Clave de autenticación")
    is_active = models.BooleanField(default=True, help_text="Si la suscripción está activa")
    user_agent = models.TextField(blank=True, help_text="User agent del navegador")
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Suscripción Push"
        verbose_name_plural = "Suscripciones Push"
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['endpoint']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'endpoint'],
                name='unique_user_endpoint'
            )
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.endpoint[:50]}..."

    def get_subscription_dict(self):
        """Obtener diccionario con datos de suscripción para webpush"""
        return {
            'endpoint': self.endpoint,
            'keys': {
                'p256dh': self.p256dh,
                'auth': self.auth
            }
        }


class AdminMessage(TimeStampedModel):
    """
    Mensajes directos enviados por administradores a usuarios.
    NO genera notificaciones automáticas, solo se guardan como mensajes.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='admin_messages'
    )
    sent_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_admin_messages',
        help_text="Admin que envió el mensaje"
    )
    title = models.CharField(max_length=200, help_text="Título del mensaje")
    message = models.TextField(help_text="Contenido del mensaje")
    action_url = models.URLField(blank=True, default="", help_text="URL para acción (opcional)")
    read_at = models.DateTimeField(null=True, blank=True, help_text="Cuándo fue leído")
    expires_at = models.DateTimeField(null=True, blank=True, help_text="Expiración del mensaje")

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Mensaje de Admin"
        verbose_name_plural = "Mensajes de Admin"
        indexes = [
            models.Index(fields=['user', 'read_at']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['sent_by', 'created_at']),
        ]

    def __str__(self):
        return f"Mensaje a {self.user.email} de {self.sent_by.email if self.sent_by else 'sistema'}"

    @property
    def is_read(self):
        return self.read_at is not None

    @property
    def is_expired(self):
        if self.expires_at is None:
            return False
        return timezone.now() > self.expires_at

    def mark_as_read(self):
        if not self.is_read:
            self.read_at = timezone.now()
            self.save(update_fields=['read_at'])


class NotificationDeliveryLog(TimeStampedModel):
    """Traza de entrega por canal para una notificación."""

    CHANNEL_PUSH = "push"
    CHANNEL_EMAIL = "email"
    CHANNEL_CHOICES = [
        (CHANNEL_PUSH, "Push"),
        (CHANNEL_EMAIL, "Email"),
    ]

    STATUS_PENDING = "pending"
    STATUS_SENT = "sent"
    STATUS_FAILED = "failed"
    STATUS_SKIPPED = "skipped"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pendiente"),
        (STATUS_SENT, "Enviado"),
        (STATUS_FAILED, "Fallido"),
        (STATUS_SKIPPED, "Omitido"),
    ]

    notification = models.ForeignKey(
        Notification,
        on_delete=models.CASCADE,
        related_name="delivery_logs",
    )
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    attempts = models.PositiveIntegerField(default=0)
    last_error = models.TextField(blank=True, default="")
    task_id = models.CharField(max_length=255, blank=True, default="")
    last_attempt_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Log de entrega de notificación"
        verbose_name_plural = "Logs de entrega de notificaciones"
        constraints = [
            models.UniqueConstraint(
                fields=["notification", "channel"],
                name="unique_notification_delivery_channel",
            )
        ]
        indexes = [
            models.Index(fields=["notification", "channel"]),
            models.Index(fields=["status", "channel"]),
            models.Index(fields=["last_attempt_at"]),
        ]

    def __str__(self):
        return f"{self.notification_id} - {self.channel} - {self.status}"