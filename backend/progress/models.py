import uuid
from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone

from .photo_types import PHOTO_TYPES


class TimeStampedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True


class ProgressPhoto(TimeStampedModel):
    PHOTO_TYPES = PHOTO_TYPES

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name="progress_photos"
    )
    photo = models.ImageField(upload_to="progress_photos/%Y/%m/%d/")
    thumbnail = models.ImageField(upload_to="progress_photos/thumbnails/%Y/%m/%d/", null=True, blank=True)
    photo_type = models.CharField(max_length=20, choices=PHOTO_TYPES, default="front")
    date = models.DateField()
    weight = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(0)]
    )
    notes = models.TextField(blank=True, default="")
    measurements = models.JSONField(null=True, blank=True)  # Para medidas específicas
    
    class Meta:
        ordering = ["-date", "-created_at"]
        # Comentamos la restricción única para permitir múltiples fotos del mismo tipo en la misma fecha
        # constraints = [
        #     models.UniqueConstraint(
        #         fields=["user", "date", "photo_type"], 
        #         name="unique_progress_photo_per_user_date_type"
        #     )
        # ]
    
    def __str__(self):
        return f"{self.user.email} - {self.photo_type} - {self.date}"
    
    def clean(self):
        if self.date > timezone.localdate():
            raise ValidationError("La fecha no puede ser en el futuro")
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class WeightEntry(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name="weight_entries"
    )
    weight = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    date = models.DateField()
    notes = models.TextField(blank=True, default="")
    
    class Meta:
        ordering = ["-date", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "date"],
                name="unique_weight_entry_per_user_date",
            )
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.weight}kg - {self.date}"
    
    def clean(self):
        if self.date > timezone.localdate():
            raise ValidationError("La fecha no puede ser en el futuro")
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class BodyMeasurement(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name="body_measurements"
    )
    date = models.DateField()
    
    # Medidas principales
    chest = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    waist = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    hips = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    arms = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    thighs = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    neck = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    forearms = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    calves = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    
    notes = models.TextField(blank=True, default="")
    
    class Meta:
        ordering = ["-date", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "date"], 
                name="unique_body_measurement_per_user_date"
            )
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.date}"
    
    def clean(self):
        if self.date > timezone.localdate():
            raise ValidationError("La fecha no puede ser en el futuro")
        
        # Al menos una medida debe estar presente
        if not any([
            self.chest, self.waist, self.hips, self.arms, 
            self.thighs, self.neck, self.forearms, self.calves
        ]):
            raise ValidationError("Al menos una medida debe estar presente")
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs) 


class MoodEntry(TimeStampedModel):
    """
    Entrada del estado de ánimo del usuario
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="mood_entries")
    date = models.DateField(help_text="Fecha de la entrada")
    mood_score = models.PositiveSmallIntegerField(
        choices=[
            (1, '😢 Muy mal'),
            (2, '😕 Mal'),
            (3, '😐 Regular'),
            (4, '🙂 Bien'),
            (5, '😄 Muy bien'),
        ],
        help_text="Puntuación del estado de ánimo"
    )
    energy_level = models.PositiveSmallIntegerField(
        choices=[
            (1, '😴 Muy bajo'),
            (2, '😪 Bajo'),
            (3, '😐 Normal'),
            (4, '😊 Alto'),
            (5, '🚀 Muy alto'),
        ],
        help_text="Nivel de energía"
    )
    stress_level = models.PositiveSmallIntegerField(
        choices=[
            (1, '😌 Muy bajo'),
            (2, '😊 Bajo'),
            (3, '😐 Normal'),
            (4, '😰 Alto'),
            (5, '😱 Muy alto'),
        ],
        help_text="Nivel de estrés"
    )
    notes = models.TextField(blank=True, help_text="Notas adicionales sobre el estado de ánimo")
    
    class Meta:
        ordering = ['-date']
        unique_together = ['user', 'date']
        verbose_name = "Entrada de Estado de Ánimo"
        verbose_name_plural = "Entradas de Estado de Ánimo"
    
    def __str__(self):
        return f"{self.user.email} - {self.date} (Mood: {self.mood_score})"


class DailyWellness(TimeStampedModel):
    """
    Registro diario de bienestar: horas de sueño y motivación
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="daily_wellness_entries"
    )
    date = models.DateField(help_text="Fecha del registro")
    sleep_hours = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        validators=[MinValueValidator(0), MaxValueValidator(24)],
        help_text="Horas de sueño (0-24)"
    )
    motivation_score = models.PositiveSmallIntegerField(
        choices=[
            (1, '😢 Muy baja'),
            (2, '😕 Baja'),
            (3, '😐 Regular'),
            (4, '🙂 Buena'),
            (5, '😄 Muy alta'),
        ],
        help_text="Nivel de motivación (1-5)"
    )
    notes = models.TextField(blank=True, help_text="Notas adicionales")
    
    class Meta:
        ordering = ['-date', '-created_at']
        unique_together = ['user', 'date']
        verbose_name = "Registro de Bienestar Diario"
        verbose_name_plural = "Registros de Bienestar Diario"
        indexes = [
            models.Index(fields=['user', 'date']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.date} (Sueño: {self.sleep_hours}h, Motivación: {self.motivation_score})"
    
    def clean(self):
        if self.date > timezone.localdate():
            raise ValidationError("La fecha no puede ser en el futuro")
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class RestWellnessAssessment(TimeStampedModel):
    """Evaluación puntual de hábitos de descanso."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="rest_wellness_assessments",
    )
    answers = models.JSONField(help_text="Array de 32 respuestas booleanas en orden mezclado")
    scores = models.JSONField(help_text="Puntuación por categoría")
    script = models.TextField(help_text="Guión personalizado para el coach")
    top_categories = models.JSONField(help_text="Top 3 categorías prioritarias")

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Evaluación de descanso"
        verbose_name_plural = "Evaluaciones de descanso"
        indexes = [
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self):
        return f"{self.user.email} - descanso ({self.created_at:%Y-%m-%d})"
