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


class Achievement(TimeStampedModel):
    ACHIEVEMENT_CATEGORIES = [
        ("workout", "Entrenamiento"),
        ("nutrition", "Nutrición"),
        ("progress", "Progreso"),
        ("streak", "Racha"),
        ("milestone", "Hito"),
        ("social", "Social"),
        ("system", "Sistema"),
    ]
    
    key = models.CharField(max_length=100, unique=True, help_text="Clave única del logro")
    name = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=ACHIEVEMENT_CATEGORIES, default="system")
    icon = models.CharField(max_length=100, blank=True, default="")  # Nombre del icono
    criteria = models.JSONField(help_text="Criterios para desbloquear el logro")
    points = models.PositiveIntegerField(default=0, help_text="Puntos que otorga el logro")
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ["category", "name"]
    
    def __str__(self):
        return f"{self.name} ({self.category})"
    
    def clean(self):
        if not self.criteria:
            from django.core.exceptions import ValidationError
            raise ValidationError("Los criterios son obligatorios")
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class UserAchievement(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name="user_achievements"
    )
    achievement = models.ForeignKey(
        Achievement, 
        on_delete=models.CASCADE, 
        related_name="user_achievements"
    )
    unlocked_at = models.DateTimeField(default=timezone.now)
    progress = models.JSONField(null=True, blank=True, help_text="Progreso actual hacia el logro")
    
    class Meta:
        ordering = ["-unlocked_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "achievement"], 
                name="unique_user_achievement"
            )
        ]
        indexes = [
            models.Index(fields=["user", "unlocked_at"]),
            models.Index(fields=["achievement", "unlocked_at"]),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.achievement.name}"
    
    @property
    def days_since_unlocked(self):
        return (timezone.now() - self.unlocked_at).days
    
    def save(self, *args, **kwargs):
        # Asegurar que no se duplique
        if not self.pk:
            existing = UserAchievement.objects.filter(
                user=self.user, 
                achievement=self.achievement
            ).exists()
            if existing:
                from django.core.exceptions import ValidationError
                raise ValidationError("Este usuario ya tiene este logro")
        
        super().save(*args, **kwargs) 