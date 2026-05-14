# workouts/models.py
# Modelos de entrenamiento - Versión reestructurada y simplificada

import uuid
from urllib.parse import parse_qs, urlparse
from django.conf import settings
from django.db import models, transaction
from django.core.validators import MinValueValidator, MaxValueValidator


class TimeStampedModel(models.Model):
    """Modelo base con timestamps"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True


# =============================================================================
# EJERCICIOS
# =============================================================================

class Exercise(TimeStampedModel):
    """
    Ejercicio único - unifica ejercicios del sistema y personalizados
    
    Uso:
    - is_system=True: Ejercicios predefinidos del sistema (no se pueden eliminar)
    - is_system=False, created_by=User: Ejercicios creados por usuarios/admins
    """
    
    DIFFICULTY_CHOICES = [
        ('beginner', 'Principiante'),
        ('intermediate', 'Intermedio'),
        ('advanced', 'Avanzado'),
    ]
    
    CATEGORY_CHOICES = [
        ('strength', 'Fuerza'),
        ('cardio', 'Cardio'),
        ('flexibility', 'Flexibilidad'),
        ('hiit', 'HIIT'),
        ('bodyweight', 'Peso corporal'),
        ('functional', 'Funcional'),
        ('plyometrics', 'Pliometría'),
        ('balance', 'Equilibrio'),
    ]
    
    # Información básica
    name = models.CharField(max_length=200, help_text="Nombre del ejercicio")
    description = models.TextField(blank=True, help_text="Descripción breve")
    instructions = models.TextField(blank=True, help_text="Instrucciones de ejecución")
    
    # Categorización
    category = models.CharField(
        max_length=50, 
        choices=CATEGORY_CHOICES,
        default='strength',
        help_text="Categoría principal"
    )
    muscle_groups = models.JSONField(
        default=list, 
        blank=True,
        help_text="Grupos musculares trabajados ['chest', 'triceps', 'shoulders']"
    )
    equipment = models.JSONField(
        default=list, 
        blank=True,
        help_text="Equipamiento necesario ['dumbbells', 'bench', 'barbell']"
    )
    difficulty = models.CharField(
        max_length=20, 
        choices=DIFFICULTY_CHOICES, 
        default='beginner'
    )
    
    # Media
    video_url = models.URLField(
        blank=True, 
        help_text="URL externa de video (YouTube, Vimeo)"
    )
    image_url = models.URLField(
        blank=True, 
        help_text="URL de imagen del ejercicio"
    )
    google_drive_file_id = models.CharField(
        max_length=100, 
        blank=True,
        help_text="ID del archivo en Google Drive"
    )
    video_file = models.FileField(
        upload_to='exercises/videos/', 
        blank=True, 
        null=True,
        help_text="Video subido directamente"
    )
    thumbnail = models.ImageField(
        upload_to='exercises/thumbnails/', 
        blank=True, 
        null=True
    )
    
    # Flags de control
    is_system = models.BooleanField(
        default=False, 
        help_text="True = ejercicio del sistema (no eliminable)"
    )
    is_active = models.BooleanField(
        default=True, 
        help_text="False = ejercicio desactivado/oculto"
    )
    
    # Propiedad
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL,
        related_name='exercises_created',
        help_text="Null = ejercicio del sistema"
    )
    
    # Metadata
    tags = models.JSONField(default=list, blank=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = "Ejercicio"
        verbose_name_plural = "Ejercicios"
    
    def __str__(self):
        return self.name
    
    @property
    def has_video(self):
        """Verifica si tiene video disponible"""
        return bool(self.video_file) or bool(self.video_url) or bool(self.google_drive_file_id)

    @staticmethod
    def _to_google_drive_preview_url(raw_url: str) -> str:
        """Normalize different Google Drive link variants to embeddable /preview URL."""
        try:
            parsed = urlparse(raw_url)
            host = parsed.hostname or ""
            if "drive.google.com" not in host:
                return raw_url

            # /file/d/<id>/view or /file/d/<id>/preview
            if "/file/d/" in parsed.path:
                parts = parsed.path.split("/file/d/")
                if len(parts) > 1:
                    file_id = parts[1].split("/")[0]
                    if file_id:
                        return f"https://drive.google.com/file/d/{file_id}/preview"

            # /open?id=<id> or /uc?export=download&id=<id>
            query_id = parse_qs(parsed.query).get("id", [None])[0]
            if query_id:
                return f"https://drive.google.com/file/d/{query_id}/preview"
        except Exception:
            return raw_url

        return raw_url
    
    def get_video_url(self):
        """Retorna la URL del video (prioridad: archivo > Google Drive > URL)"""
        if self.video_file:
            return self.video_file.url
        if self.google_drive_file_id:
            return f"https://drive.google.com/file/d/{self.google_drive_file_id}/preview"
        if self.video_url:
            return self._to_google_drive_preview_url(self.video_url)
        return self.video_url

    def get_substitutes(self):
        """Retorna ejercicios sustitutos ordenados por prioridad."""
        return [
            relation.substitute
            for relation in self.substitutions.all().select_related("substitute").order_by("priority", "created_at")
        ]


class ExerciseSubstitution(TimeStampedModel):
    """
    Relacion global de ejercicios sustitutos.
    Permite definir alternativas para un ejercicio en cualquier contexto.
    """

    exercise = models.ForeignKey(
        Exercise,
        on_delete=models.CASCADE,
        related_name="substitutions",
        help_text="Ejercicio base que se desea sustituir",
    )
    substitute = models.ForeignKey(
        Exercise,
        on_delete=models.CASCADE,
        related_name="substituted_in",
        help_text="Ejercicio sustituto",
    )
    priority = models.PositiveSmallIntegerField(
        default=1,
        help_text="Orden de preferencia (1 = mas recomendado)",
    )
    notes = models.TextField(
        blank=True,
        help_text="Notas o contexto para usar este sustituto",
    )

    class Meta:
        ordering = ["priority", "created_at"]
        verbose_name = "Sustituto de Ejercicio"
        verbose_name_plural = "Sustitutos de Ejercicios"
        constraints = [
            models.UniqueConstraint(
                fields=["exercise", "substitute"],
                name="unique_exercise_substitute",
            ),
            models.CheckConstraint(
                check=~models.Q(exercise=models.F("substitute")),
                name="exercise_cannot_substitute_itself",
            ),
        ]

    def __str__(self):
        return f"{self.exercise.name} -> {self.substitute.name}"


# =============================================================================
# PROGRAMAS DE ENTRENAMIENTO
# =============================================================================

class WorkoutProgram(TimeStampedModel):
    """
    Programa de entrenamiento - unifica programas, plantillas y por defecto
    
    Uso:
    - is_system=True: Programa del sistema (plantilla disponible para todos)
    - is_system=False, user=None: Plantilla creada por admin
    - is_system=False, user=User: Programa activo de un usuario
    """
    
    DIFFICULTY_CHOICES = [
        ('beginner', 'Principiante'),
        ('intermediate', 'Intermedio'),
        ('advanced', 'Avanzado'),
    ]
    
    GOAL_CHOICES = [
        ('weight_loss', 'Pérdida de peso'),
        ('muscle_gain', 'Ganancia muscular'),
        ('strength', 'Fuerza'),
        ('endurance', 'Resistencia'),
        ('general_fitness', 'Fitness general'),
        ('body_recomposition', 'Recomposición corporal'),
    ]
    
    LOCATION_CHOICES = [
        ('gym', 'Gimnasio'),
        ('home', 'Casa'),
        ('outdoor', 'Exterior'),
        ('any', 'Cualquier lugar'),
    ]
    
    # Información básica
    name = models.CharField(max_length=200, help_text="Nombre del programa")
    description = models.TextField(blank=True, help_text="Descripción del programa")
    
    # Configuración
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='beginner')
    goal = models.CharField(max_length=30, choices=GOAL_CHOICES, default='general_fitness')
    location = models.CharField(max_length=20, choices=LOCATION_CHOICES, default='any')
    
    duration_weeks = models.PositiveIntegerField(default=4, help_text="Duración en semanas")
    days_per_week = models.PositiveIntegerField(
        default=3, 
        validators=[MinValueValidator(1), MaxValueValidator(7)],
        help_text="Días de entrenamiento por semana"
    )
    estimated_duration_minutes = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text="Duración estimada por sesión en minutos"
    )
    equipment_needed = models.JSONField(
        default=list, 
        blank=True,
        help_text="Equipamiento necesario"
    )
    
    # Flags de control
    is_template = models.BooleanField(
        default=False, 
        help_text="True = plantilla reutilizable"
    )
    is_system = models.BooleanField(
        default=False, 
        help_text="True = programa del sistema"
    )
    is_active = models.BooleanField(
        default=True, 
        help_text="False = programa inactivo"
    )
    
    # Propiedad
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        null=True, 
        blank=True, 
        on_delete=models.CASCADE,
        related_name='workout_programs',
        help_text="Usuario al que pertenece (null = plantilla/sistema)"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL,
        related_name='workout_programs_created',
        help_text="Quién creó el programa"
    )
    
    # Fechas (para programas activos de usuarios)
    start_date = models.DateField(null=True, blank=True, help_text="Fecha de inicio")
    end_date = models.DateField(null=True, blank=True, help_text="Fecha de fin")
    
    # Metadata
    tags = models.JSONField(default=list, blank=True)
    image_url = models.URLField(blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Programa de Entrenamiento"
        verbose_name_plural = "Programas de Entrenamiento"
    
    def __str__(self):
        if self.user:
            return f"{self.name} ({self.user.email})"
        return f"{self.name} (Sistema/Plantilla)"
    
    @property
    def total_days(self):
        """Total de días en el programa"""
        return self.days.count()
    
    @property
    def training_days(self):
        """Días de entrenamiento (no descanso)"""
        return self.days.filter(is_rest_day=False).count()

    def save(self, *args, **kwargs):
        """Garantiza que un usuario tenga como maximo un programa activo."""
        with transaction.atomic():
            super().save(*args, **kwargs)
            if self.user_id and self.is_active:
                WorkoutProgram.objects.filter(
                    user_id=self.user_id,
                    is_active=True,
                ).exclude(pk=self.pk).update(is_active=False)


# =============================================================================
# DÍAS DE ENTRENAMIENTO
# =============================================================================

class WorkoutDay(TimeStampedModel):
    """
    Día de entrenamiento dentro de un programa
    """
    
    DAY_OF_WEEK_CHOICES = [
        ('monday', 'Lunes'),
        ('tuesday', 'Martes'),
        ('wednesday', 'Miércoles'),
        ('thursday', 'Jueves'),
        ('friday', 'Viernes'),
        ('saturday', 'Sábado'),
        ('sunday', 'Domingo'),
    ]
    
    program = models.ForeignKey(
        WorkoutProgram, 
        on_delete=models.CASCADE, 
        related_name='days'
    )
    
    name = models.CharField(
        max_length=100, 
        help_text="Nombre del día (ej: 'Pecho y Tríceps', 'Día de Piernas')"
    )
    day_number = models.PositiveIntegerField(
        help_text="Número del día en el programa (1, 2, 3...)"
    )
    day_of_week = models.CharField(
        max_length=15, 
        choices=DAY_OF_WEEK_CHOICES,
        blank=True,
        help_text="Día de la semana asignado (opcional)"
    )
    
    is_rest_day = models.BooleanField(
        default=False, 
        help_text="True = día de descanso"
    )
    duration_minutes = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text="Duración estimada en minutos"
    )
    focus = models.CharField(
        max_length=100, 
        blank=True,
        help_text="Enfoque del día (ej: 'Upper Body', 'Cardio')"
    )
    notes = models.TextField(blank=True, help_text="Notas adicionales")
    order_index = models.PositiveIntegerField(default=1, help_text="Orden de visualización")
    
    class Meta:
        ordering = ['order_index', 'day_number']
        unique_together = ['program', 'day_number']
        verbose_name = "Día de Entrenamiento"
        verbose_name_plural = "Días de Entrenamiento"
    
    def __str__(self):
        return f"{self.program.name} - Día {self.day_number}: {self.name}"
    
    @property
    def total_exercises(self):
        """Total de ejercicios en este día"""
        return self.exercises.count()


# =============================================================================
# EJERCICIOS EN DÍA
# =============================================================================

class WorkoutDayExercise(TimeStampedModel):
    """
    Ejercicio específico dentro de un día de entrenamiento
    """
    
    workout_day = models.ForeignKey(
        WorkoutDay, 
        on_delete=models.CASCADE, 
        related_name='exercises'
    )
    exercise = models.ForeignKey(
        Exercise, 
        on_delete=models.CASCADE,
        related_name='workout_assignments'
    )
    
    # Configuración del ejercicio
    sets = models.PositiveIntegerField(default=3, help_text="Número de series")
    reps = models.CharField(
        max_length=50, 
        default="10",
        help_text="Repeticiones (ej: '10', '8-12', 'hasta fallo')"
    )
    weight = models.CharField(
        max_length=50, 
        blank=True,
        help_text="Peso (ej: '20kg', 'bodyweight', '70% 1RM')"
    )
    duration_seconds = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text="Duración en segundos (para cardio/planks)"
    )
    rest_seconds = models.PositiveIntegerField(
        default=60,
        help_text="Tiempo de descanso entre series"
    )
    
    # Notas
    notes = models.TextField(
        blank=True, 
        help_text="Notas técnicas o instrucciones específicas"
    )
    order_index = models.PositiveIntegerField(
        default=1, 
        help_text="Orden del ejercicio en el día"
    )
    
    # Superset/Circuit
    superset_group = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text="Grupo de superset (ejercicios con mismo número se hacen juntos)"
    )
    
    class Meta:
        ordering = ['order_index']
        verbose_name = "Ejercicio en Día"
        verbose_name_plural = "Ejercicios en Día"
    
    def __str__(self):
        return f"{self.workout_day.name} - {self.exercise.name}"


# =============================================================================
# LOG DE ENTRENAMIENTOS
# =============================================================================

class WorkoutLog(TimeStampedModel):
    """
    Registro de un entrenamiento realizado por un usuario
    """
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='workout_logs'
    )
    workout_day = models.ForeignKey(
        WorkoutDay, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL,
        related_name='logs',
        help_text="Día del programa seguido (puede ser null si es libre)"
    )
    
    date = models.DateField(help_text="Fecha del entrenamiento")
    duration_minutes = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text="Duración real en minutos"
    )
    
    completed = models.BooleanField(default=False, help_text="Si se completó")
    rating = models.PositiveSmallIntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Valoración del entrenamiento (1-5 estrellas)"
    )
    
    # Datos del entrenamiento (snapshot)
    exercises_data = models.JSONField(
        default=list,
        help_text="Copia de los ejercicios realizados con sets/reps reales"
    )
    
    notes = models.TextField(blank=True, help_text="Notas del usuario")
    
    # Métricas adicionales
    calories_burned = models.PositiveIntegerField(null=True, blank=True)
    average_heart_rate = models.PositiveIntegerField(null=True, blank=True)
    
    class Meta:
        ordering = ['-date', '-created_at']
        verbose_name = "Log de Entrenamiento"
        verbose_name_plural = "Logs de Entrenamientos"
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'date', 'workout_day'], 
                name='unique_workout_log_per_user_day'
            )
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.date}"


# =============================================================================
# LOG DE EJERCICIOS (detalle del log)
# =============================================================================

class WorkoutLogExercise(TimeStampedModel):
    """
    Detalle de cada ejercicio en un log de entrenamiento
    """
    
    workout_log = models.ForeignKey(
        WorkoutLog, 
        on_delete=models.CASCADE, 
        related_name='log_exercises'
    )
    exercise = models.ForeignKey(
        Exercise, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    exercise_name = models.CharField(
        max_length=200,
        help_text="Nombre del ejercicio (snapshot por si se elimina)"
    )
    
    order_index = models.PositiveIntegerField(default=1)
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['order_index']
    
    def __str__(self):
        return f"{self.workout_log} - {self.exercise_name}"


class WorkoutLogSet(TimeStampedModel):
    """
    Cada serie realizada en un ejercicio
    """
    
    log_exercise = models.ForeignKey(
        WorkoutLogExercise, 
        on_delete=models.CASCADE, 
        related_name='sets'
    )
    
    set_number = models.PositiveIntegerField(default=1)
    reps = models.PositiveIntegerField(null=True, blank=True)
    weight = models.DecimalField(
        max_digits=6, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Peso en kg"
    )
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    rest_seconds = models.PositiveIntegerField(null=True, blank=True)
    completed = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['set_number']
    
    def __str__(self):
        return f"Set {self.set_number}: {self.reps} reps @ {self.weight}kg"
