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
