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


class DashboardData(TimeStampedModel):
    """
    Cache de datos del dashboard para evitar cálculos repetitivos
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name="dashboard_data"
    )
    date = models.DateField()
    data_type = models.CharField(max_length=50)  # 'today', 'weekly', 'monthly'
    
    # Datos del dashboard
    nutrition_data = models.JSONField(null=True, blank=True)
    workout_data = models.JSONField(null=True, blank=True)
    progress_data = models.JSONField(null=True, blank=True)
    achievements_data = models.JSONField(null=True, blank=True)
    
    # Metadata
    last_calculated = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(help_text="Cuándo expira este cache")
    
    class Meta:
        ordering = ["-date", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "date", "data_type"], 
                name="unique_dashboard_data_per_user_date_type"
            )
        ]
        indexes = [
            models.Index(fields=["user", "date"]),
            models.Index(fields=["user", "data_type"]),
            models.Index(fields=["expires_at"]),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.data_type} - {self.date}"
    
    @property
    def is_expired(self):
        return timezone.now() > self.expires_at
    
    def clean(self):
        if self.expires_at and self.expires_at <= timezone.now():
            from django.core.exceptions import ValidationError
            raise ValidationError("La fecha de expiración debe ser en el futuro")
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class UserStats(TimeStampedModel):
    """
    Estadísticas del usuario para el dashboard
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="stats"
    )
    
    # Objetivos y metas
    calories_goal = models.IntegerField(default=2000, help_text="Objetivo de calorías diarias")
    workouts_goal = models.IntegerField(default=5, help_text="Objetivo de entrenamientos por semana")
    weight_goal = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Peso objetivo en kg")
    
    # Datos actuales
    current_weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Peso actual en kg")
    starting_weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Peso inicial en kg")
    
    # Fechas importantes
    transformation_start_date = models.DateField(null=True, blank=True, help_text="Fecha de inicio de la transformación")
    next_review_date = models.DateField(null=True, blank=True, help_text="Próxima fecha de revisión")
    
    # Preferencias
    preferred_workout_days = models.JSONField(default=list, blank=True, help_text="Días preferidos para entrenar")
    preferred_meal_times = models.JSONField(default=list, blank=True, help_text="Horarios preferidos para comer")
    
    class Meta:
        verbose_name = "Estadísticas del Usuario"
        verbose_name_plural = "Estadísticas de los Usuarios"
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["transformation_start_date"]),
        ]
    
    def __str__(self):
        return f"Estadísticas de {self.user.email}"
    
    @property
    def days_in_transformation(self):
        """Calcular días desde el inicio de la transformación"""
        if self.transformation_start_date:
            delta = timezone.now().date() - self.transformation_start_date
            return delta.days
        return 0
    
    @property
    def weight_change(self):
        """Calcular cambio de peso desde el inicio"""
        if self.starting_weight and self.current_weight:
            return float(self.current_weight - self.starting_weight)
        return 0.0
    
    @property
    def weight_change_percentage(self):
        """Calcular porcentaje de cambio de peso"""
        if self.starting_weight and self.current_weight and self.starting_weight > 0:
            return ((self.current_weight - self.starting_weight) / self.starting_weight) * 100
        return 0.0


class WellnessTip(TimeStampedModel):
    """
    Consejos creados por administradores para mostrar en el dashboard y secciones de motivación.
    """

    class TipCategory(models.TextChoices):
        NUTRITION = "nutrition", "Nutrición"
        TRAINING = "training", "Entrenamiento"
        MINDSET = "mindset", "Mentalidad"
        RECOVERY = "recovery", "Recuperación"
        LIFESTYLE = "lifestyle", "Estilo de vida"

    title = models.CharField(max_length=150)
    summary = models.CharField(max_length=255, blank=True)
    content = models.TextField()
    category = models.CharField(
        max_length=50,
        choices=TipCategory.choices,
        default=TipCategory.MINDSET,
    )
    audience = models.CharField(
        max_length=50,
        default="general",
        help_text="Segmento de usuarios al que va dirigido el consejo (general, principiantes, avanzados, etc.).",
    )
    is_active = models.BooleanField(default=True)
    is_highlighted = models.BooleanField(
        default=False,
        help_text="Los consejos destacados se muestran primero en el dashboard.",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="wellness_tips",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-is_highlighted", "-created_at"]
        verbose_name = "Consejo de bienestar"
        verbose_name_plural = "Consejos de bienestar"
        indexes = [
            models.Index(fields=["category", "is_active"]),
            models.Index(fields=["is_highlighted", "is_active"]),
        ]

    def __str__(self):
        return self.title


class DefaultPlanConfiguration(TimeStampedModel):
    """
    Configuración por defecto de planes según perfil de usuario.
    Define qué plan nutricional y programa de entrenamiento asignar
    automáticamente cuando un usuario se registra con cierto perfil.
    """
    
    # Información básica
    name = models.CharField(max_length=200, help_text="Nombre descriptivo de la configuración")
    description = models.TextField(blank=True, help_text="Descripción detallada")
    priority = models.IntegerField(
        default=100,
        help_text="Prioridad de evaluación (menor número = mayor prioridad)"
    )
    is_active = models.BooleanField(default=True, help_text="Si está activa para asignación automática")
    
    # Criterios de coincidencia del perfil de usuario
    main_goal = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text="Objetivo principal del usuario (lose_weight, gain_muscle, etc.)"
    )
    training_location = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text="Ubicación de entrenamiento (home, gym, outdoor)"
    )
    activity_level = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text="Nivel de actividad (sedentary, light, moderate, active, very_active)"
    )
    gender = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        help_text="Género objetivo (male, female, other) - null para todos"
    )
    
    # Rangos de días de entrenamiento
    min_training_days_per_week = models.IntegerField(
        null=True,
        blank=True,
        help_text="Mínimo de días de entrenamiento por semana"
    )
    max_training_days_per_week = models.IntegerField(
        null=True,
        blank=True,
        help_text="Máximo de días de entrenamiento por semana"
    )
    
    # Rangos de edad
    age_min = models.IntegerField(
        null=True,
        blank=True,
        help_text="Edad mínima del usuario"
    )
    age_max = models.IntegerField(
        null=True,
        blank=True,
        help_text="Edad máxima del usuario"
    )
    
    # Restricciones alimentarias y equipamiento
    dietary_restrictions = models.JSONField(
        default=list,
        blank=True,
        help_text="Lista de restricciones dietéticas a considerar"
    )
    equipment_keywords = models.JSONField(
        default=list,
        blank=True,
        help_text="Palabras clave de equipamiento disponible"
    )
    
    # Planes a asignar
    default_nutrition_plan = models.ForeignKey(
        'nutrition.NutritionPlan',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='default_configurations',
        help_text="Plan nutricional a asignar"
    )
    default_workout_program = models.ForeignKey(
        'workouts.WorkoutProgram',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='default_configurations',
        help_text="Programa de entrenamiento a asignar"
    )
    
    class Meta:
        ordering = ['priority', 'created_at']
        verbose_name = "Configuración de Plan por Defecto"
        verbose_name_plural = "Configuraciones de Planes por Defecto"
        indexes = [
            models.Index(fields=['priority', 'is_active']),
            models.Index(fields=['main_goal', 'training_location', 'activity_level']),
        ]
    
    def __str__(self):
        return f"{self.name} (Prioridad: {self.priority})"
    
    def matches_user_profile(self, user):
        """
        Verifica si esta configuración coincide con el perfil del usuario
        """
        # Verificar objetivo principal
        if self.main_goal and user.main_goal != self.main_goal:
            return False
        
        # Verificar ubicación de entrenamiento
        if self.training_location and user.training_location != self.training_location:
            return False
        
        # Verificar nivel de actividad
        if self.activity_level and user.activity_level != self.activity_level:
            return False
        
        # Verificar género
        if self.gender and user.gender != self.gender:
            return False
        
        # Verificar días de entrenamiento
        if self.min_training_days_per_week and user.training_days_per_week < self.min_training_days_per_week:
            return False
        if self.max_training_days_per_week and user.training_days_per_week > self.max_training_days_per_week:
            return False
        
        # Verificar edad
        if user.birth_date:
            from datetime import date
            age = (date.today() - user.birth_date).days // 365
            if self.age_min and age < self.age_min:
                return False
            if self.age_max and age > self.age_max:
                return False
        
        return True