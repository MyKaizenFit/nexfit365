import os
import uuid
import unicodedata
from datetime import timedelta
from urllib.parse import quote
from django.conf import settings
from django.db import models
from django.utils import timezone



class TimeStampedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True


def _normalize_profile_terms(value):
    if not value:
        return []

    if isinstance(value, str):
        raw_items = value.replace(';', ',').replace('\n', ',').split(',')
    elif isinstance(value, (list, tuple, set)):
        raw_items = []
        for item in value:
            if item is None:
                continue
            if isinstance(item, str):
                raw_items.extend(item.replace(';', ',').replace('\n', ',').split(','))
            else:
                raw_items.append(str(item))
    else:
        raw_items = [str(value)]

    normalized = []
    seen = set()
    for item in raw_items:
        text = unicodedata.normalize('NFKD', str(item)).encode('ascii', 'ignore').decode('ascii')
        text = text.lower().replace('-', ' ')
        text = ' '.join(text.split())
        if text and text not in seen:
            seen.add(text)
            normalized.append(text)
    return normalized


_DIETARY_RESTRICTION_ALIASES = {
    'vegetarian': {'vegetarian', 'vegetariano', 'vegetariana'},
    'vegan': {'vegan', 'vegano', 'vegana'},
    'gluten_free': {'gluten free', 'sin gluten', 'celiaco', 'celiaca', 'celiaquia'},
    'dairy_free': {
        'dairy free', 'lactose free', 'sin lactosa', 'lactosa', 'lactose',
        'sin lacteos', 'lacteos', 'dairy', 'leche',
    },
    'egg_free': {'egg free', 'sin huevo', 'huevo'},
    'nut_free': {'nut free', 'sin frutos secos', 'frutos secos', 'nuts'},
    'soy_free': {'soy free', 'sin soja', 'soja', 'soy'},
    'fish_free': {'fish free', 'sin pescado', 'pescado'},
    'shellfish_free': {'shellfish free', 'sin marisco', 'marisco', 'crustaceos'},
    'keto': {'keto', 'ketogenic', 'cetogenica', 'cetogenico'},
    'low_carb': {'low carb', 'bajo en carbohidratos'},
}


def canonical_dietary_restrictions(value):
    canonical_terms = []
    seen = set()
    for term in _normalize_profile_terms(value):
        canonical = None
        for key, aliases in _DIETARY_RESTRICTION_ALIASES.items():
            if term in aliases:
                canonical = key
                break
        if canonical is None:
            canonical = term
        if canonical not in seen:
            seen.add(canonical)
            canonical_terms.append(canonical)
    return canonical_terms


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

    @staticmethod
    def user_dietary_restriction_terms(user):
        terms = []
        terms.extend(canonical_dietary_restrictions(getattr(user, 'dietary_restrictions', None)))
        terms.extend(canonical_dietary_restrictions(getattr(user, 'allergies', None)))
        return set(terms)

    def dietary_restriction_terms(self):
        return set(canonical_dietary_restrictions(self.dietary_restrictions))

    @staticmethod
    def normalize_main_goal(value):
        aliases = {
            'weight_loss': 'lose_weight',
            'fat_loss': 'lose_weight',
            'muscle_gain': 'gain_muscle',
            'maintenance': 'maintain',
        }
        return aliases.get(value, value)
    
    LEGACY_DIFFICULTY_ACTIVITY_LEVELS = frozenset({'beginner', 'intermediate', 'advanced'})

    def matches_user_profile(self, user):
        """
        Verifica si esta configuración coincide con el perfil del usuario
        """
        # Verificar objetivo principal
        if self.main_goal and self.normalize_main_goal(user.main_goal) != self.normalize_main_goal(self.main_goal):
            return False
        
        # Verificar ubicación de entrenamiento
        if self.training_location and user.training_location != self.training_location:
            return False
        
        # Verificar nivel de actividad (ignorar valores legacy de dificultad de entrenamiento)
        if self.activity_level and self.activity_level not in self.LEGACY_DIFFICULTY_ACTIVITY_LEVELS:
            if user.activity_level != self.activity_level:
                return False
        
        # Verificar género
        if self.gender and user.gender != self.gender:
            return False
        
        # Verificar días de entrenamiento
        training_days_per_week = user.training_days_per_week or 0
        if self.min_training_days_per_week and training_days_per_week < self.min_training_days_per_week:
            return False
        if self.max_training_days_per_week and training_days_per_week > self.max_training_days_per_week:
            return False
        
        # Verificar edad
        if user.birth_date:
            from datetime import date
            age = (date.today() - user.birth_date).days // 365
            if self.age_min and age < self.age_min:
                return False
            if self.age_max and age > self.age_max:
                return False

        # Verificar restricciones alimentarias configuradas.
        # Ejemplo: config "sin lactosa" debe coincidir con usuario que marca "lactosa".
        config_restrictions = self.dietary_restriction_terms()
        if config_restrictions:
            user_restrictions = self.user_dietary_restriction_terms(user)
            if not config_restrictions.issubset(user_restrictions):
                return False
        
        return True


class CoachingPlan(TimeStampedModel):
    """Planes del servicio personalizado 1:1 mostrados dentro de la app."""

    class Tier(models.TextChoices):
        BASIC = "basic", "Basic"
        VIP = "vip", "VIP"

    slug = models.SlugField(max_length=80, unique=True)
    name = models.CharField(max_length=150)
    duration_label = models.CharField(max_length=80, help_text="Duración visible del plan")
    tier = models.CharField(max_length=20, choices=Tier.choices, default=Tier.BASIC)
    summary = models.CharField(max_length=255, blank=True)
    benefits = models.JSONField(default=list, blank=True)
    cta_text = models.CharField(max_length=120, default="Quiero que evaluéis mi caso")
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "created_at"]
        verbose_name = "Plan 1 a 1"
        verbose_name_plural = "Planes 1 a 1"

    def __str__(self):
        return self.name

    @classmethod
    def ensure_defaults(cls):
        if cls.objects.exists():
            return

        defaults = [
            {
                "slug": "trimestral-basic",
                "name": "Trimestral Basic",
                "duration_label": "3 meses",
                "tier": cls.Tier.BASIC,
                "summary": "Ideal si quieres estructura y revisión periódica.",
                "benefits": [
                    "Revisión quincenal (respuesta cada 15 días)",
                    "Lista de correo privada vitalicia",
                    "Curso de regalo",
                    "Acceso a la App para clientes",
                ],
                "sort_order": 1,
            },
            {
                "slug": "trimestral-vip",
                "name": "Trimestral VIP",
                "duration_label": "3 meses",
                "tier": cls.Tier.VIP,
                "summary": "Seguimiento más cercano y 100% personalizado.",
                "benefits": [
                    "Respuesta en 24h",
                    "Revisión semanal",
                    "Lista de correo privada vitalicia",
                    "Curso de regalo",
                    "100% personalizado",
                    "Acceso a la App para clientes",
                ],
                "sort_order": 2,
            },
            {
                "slug": "semestral-vip",
                "name": "Semestral VIP",
                "duration_label": "6 meses",
                "tier": cls.Tier.VIP,
                "summary": "Más continuidad para consolidar resultados.",
                "benefits": [
                    "Respuesta en 24h",
                    "Revisión semanal",
                    "Lista de correo privada vitalicia",
                    "1 videollamada al final del trimestre",
                    "100% personalizado",
                    "Acceso a la App para clientes",
                ],
                "sort_order": 3,
            },
            {
                "slug": "anual-vip",
                "name": "Anual VIP",
                "duration_label": "12 meses",
                "tier": cls.Tier.VIP,
                "summary": "La opción más completa para una transformación profunda.",
                "benefits": [
                    "Respuesta en 24h",
                    "Revisión semanal",
                    "Lista de correo privada vitalicia",
                    "3 videollamadas (1 por trimestre)",
                    "100% personalizado",
                    "Acceso a la App para clientes",
                    "Cualquier info-producto de hasta 200€ gratis vitalicio",
                ],
                "sort_order": 4,
            },
        ]

        for item in defaults:
            cls.objects.get_or_create(slug=item["slug"], defaults=item)


class CoachingInquiry(TimeStampedModel):
    """Solicitud enviada por un usuario para evaluar su caso y contratar ayuda 1:1."""

    class PreferredContact(models.TextChoices):
        WHATSAPP = "whatsapp", "WhatsApp"
        EMAIL = "email", "Email"
        BOTH = "both", "Ambos"

    class SourceScreen(models.TextChoices):
        DASHBOARD = "dashboard-home", "Dashboard"
        WORKOUTS = "workouts", "Entrenamientos"
        MEALS = "meals", "Nutrición"
        MEASUREMENTS = "measurements", "Progreso"
        COACHING_PAGE = "coaching-page", "Página de coaching"
        LANDING = "landing", "Landing"
        OTHER = "other", "Otro"

    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente"
        CONTACTED = "contacted", "Contactado"
        SCHEDULED = "scheduled", "Llamada agendada"
        QUALIFIED = "qualified", "Cualificado"
        CLOSED = "closed", "Cerrado"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="coaching_inquiries",
    )
    plan = models.ForeignKey(
        CoachingPlan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inquiries",
    )
    full_name = models.CharField(max_length=200, blank=True)
    email = models.EmailField(blank=True)
    phone_number = models.CharField(max_length=50, blank=True)
    goal = models.TextField(help_text="Objetivo principal del usuario")
    current_challenge = models.TextField(blank=True, help_text="Principal bloqueo actual")
    availability = models.CharField(max_length=255, blank=True, help_text="Disponibilidad para llamada")
    preferred_contact = models.CharField(
        max_length=20,
        choices=PreferredContact.choices,
        default=PreferredContact.WHATSAPP,
    )
    source_screen = models.CharField(
        max_length=40,
        choices=SourceScreen.choices,
        default=SourceScreen.DASHBOARD,
        blank=True,
        help_text="Pantalla o entrada desde la que el usuario abrió el funnel 1:1",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    notes = models.TextField(blank=True, help_text="Notas internas del equipo")

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Solicitud coaching"
        verbose_name_plural = "Solicitudes coaching"
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self):
        return f"{self.full_name or self.email or self.user} - {self.get_status_display()}"

    def save(self, *args, **kwargs):
        if self.user:
            if not self.full_name:
                self.full_name = self.user.get_full_name().strip() or self.user.email
            if not self.email:
                self.email = self.user.email
            if not self.phone_number and getattr(self.user, "phone_number", None):
                self.phone_number = self.user.phone_number
        super().save(*args, **kwargs)

    def build_prefilled_message(self):
        plan_name = self.plan.name if self.plan else "servicio personalizado 1:1"
        return (
            "Hola, acabo de rellenar el formulario de evaluación de la app y me gustaría que valorarais mi caso.\n\n"
            f"Plan de interés: {plan_name}\n"
            f"Nombre: {self.full_name or '-'}\n"
            f"Email: {self.email or '-'}\n"
            f"Teléfono: {self.phone_number or '-'}\n"
            f"Objetivo: {self.goal}\n"
            f"Bloqueo actual: {self.current_challenge or '-'}\n"
            f"Disponibilidad: {self.availability or '-'}\n"
            f"Origen en la app: {self.get_source_screen_display() or self.source_screen}"
        )

    def get_whatsapp_url(self):
        raw_number = os.getenv("COACHING_WHATSAPP_NUMBER", "+34600000000")
        clean_number = "".join(ch for ch in raw_number if ch.isdigit())
        return f"https://wa.me/{clean_number}?text={quote(self.build_prefilled_message())}"

    def get_mailto_url(self):
        contact_email = os.getenv("COACHING_CONTACT_EMAIL") or HelpSettings.get_active().contact_email
        subject = quote("Nueva solicitud de evaluación 1:1 desde la app")
        body = quote(self.build_prefilled_message())
        return f"mailto:{contact_email}?subject={subject}&body={body}"

    def get_booking_url(self):
        direct_url = os.getenv("COACHING_BOOKING_URL")
        if direct_url:
            return direct_url

        active_settings = HelpSettings.get_active()
        if active_settings.coaching_booking_enabled and active_settings.coaching_booking_url:
            return active_settings.coaching_booking_url

        return "https://calendly.com/nexfit365/valoracion-inicial"

    @property
    def days_waiting(self):
        return max(0, (timezone.now() - self.created_at).days)

    @property
    def needs_follow_up(self):
        return self.status in {self.Status.PENDING, self.Status.CONTACTED} and self.created_at <= timezone.now() - timedelta(hours=48)

    def build_followup_message(self):
        plan_name = self.plan.name if self.plan else "el servicio personalizado 1:1"
        greeting = f"Hola {self.full_name.split()[0]}," if self.full_name else "Hola,"
        return (
            f"{greeting} te escribo del equipo de NexFit365. "
            f"Hemos visto tu interés en {plan_name} y queríamos saber si sigues queriendo que valoremos tu caso. "
            "Si te viene bien, responde a este mensaje y te dejamos la llamada de valoración cerrada."
        )

    def get_followup_whatsapp_url(self):
        target_number = self.phone_number or getattr(self.user, "phone_number", "") or os.getenv("COACHING_WHATSAPP_NUMBER", "+34600000000")
        clean_number = "".join(ch for ch in target_number if ch.isdigit())
        if not clean_number:
            return ""

        if self.phone_number or getattr(self.user, "phone_number", ""):
            message = self.build_followup_message()
        else:
            message = (
                f"Seguimiento pendiente del lead {self.full_name or self.email or self.id}. "
                f"Plan: {self.plan.name if self.plan else '1:1 personalizado'}. "
                f"Objetivo: {self.goal}"
            )

        return f"https://wa.me/{clean_number}?text={quote(message)}"

    def get_followup_mailto_url(self):
        if not self.email:
            return ""
        subject = quote("Seguimiento de tu solicitud 1:1")
        body = quote(self.build_followup_message())
        return f"mailto:{self.email}?subject={subject}&body={body}"


class HelpSettings(TimeStampedModel):
    """
    Configuración del sistema de ayuda.
    Permite gestionar URLs, correos y contenido desde el panel de administración.
    """
    
    # Configuración de FAQ
    faq_enabled = models.BooleanField(default=True, help_text="Activar página de FAQ")
    faq_url = models.URLField(
        blank=True,
        null=True,
        help_text="URL de la página de FAQ (si está en otra ubicación)"
    )
    faq_content = models.TextField(
        blank=True,
        help_text="Contenido HTML de la página FAQ (si se gestiona internamente)"
    )
    
    # Configuración de Contacto
    contact_email = models.EmailField(
        default="soporte@nexfit365.com",
        help_text="Email de contacto para soporte"
    )
    contact_enabled = models.BooleanField(default=True, help_text="Activar contacto por email")
    coaching_booking_enabled = models.BooleanField(default=True, help_text="Activar agendado de llamadas para coaching 1:1")
    coaching_booking_url = models.URLField(
        blank=True,
        null=True,
        help_text="URL de Calendly, Meet u otra herramienta para agendar llamadas"
    )
    
    # Configuración de Guías de Usuario
    guides_enabled = models.BooleanField(default=True, help_text="Activar página de guías")
    guides_url = models.URLField(
        blank=True,
        null=True,
        help_text="URL de la página de guías (si está en otra ubicación)"
    )
    guides_content = models.TextField(
        blank=True,
        help_text="Contenido HTML de las guías (si se gestiona internamente)"
    )
    
    # Configuración de Reporte de Problemas
    report_enabled = models.BooleanField(default=True, help_text="Activar formulario de reporte")
    report_email = models.EmailField(
        default="soporte@nexfit365.com",
        help_text="Email donde se envían los reportes de problemas"
    )
    report_redirect_url = models.URLField(
        blank=True,
        null=True,
        help_text="URL a donde redirigir después de enviar el reporte"
    )
    
    # Información de la aplicación
    app_version = models.CharField(
        max_length=50,
        default="2.1.0",
        help_text="Versión actual de la aplicación"
    )
    last_update_date = models.CharField(
        max_length=100,
        default="Diciembre 2024",
        help_text="Fecha de última actualización"
    )
    terms_url = models.URLField(
        blank=True,
        null=True,
        help_text="URL de términos de servicio"
    )
    privacy_url = models.URLField(
        blank=True,
        null=True,
        help_text="URL de política de privacidad"
    )
    
    # Configuración general
    is_active = models.BooleanField(
        default=True,
        help_text="Activar esta configuración de ayuda"
    )
    
    class Meta:
        verbose_name = "Configuración de Ayuda"
        verbose_name_plural = "Configuraciones de Ayuda"
        constraints = [
            models.UniqueConstraint(
                fields=["is_active"],
                condition=models.Q(is_active=True),
                name="unique_active_help_settings"
            )
        ]
    
    def __str__(self):
        return f"Configuración de Ayuda (Activa: {self.is_active})"
    
    def save(self, *args, **kwargs):
        # Asegurar que solo haya una configuración activa
        if self.is_active:
            HelpSettings.objects.filter(is_active=True).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)
    
    @classmethod
    def get_active(cls):
        """Obtener la configuración activa, o crear una por defecto si no existe"""
        settings = cls.objects.filter(is_active=True).first()
        if not settings:
            settings = cls.objects.create()
        return settings


class ProblemReport(TimeStampedModel):
    """
    Reportes de problemas enviados por usuarios
    """
    
    class ProblemType(models.TextChoices):
        BUG = "bug", "Error/Bug"
        FEATURE = "feature", "Solicitud de Funcionalidad"
        UI = "ui", "Problema de Interfaz"
        PERFORMANCE = "performance", "Problema de Rendimiento"
        OTHER = "other", "Otro"
    
    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente"
        IN_REVIEW = "in_review", "En Revisión"
        RESOLVED = "resolved", "Resuelto"
        CLOSED = "closed", "Cerrado"
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="problem_reports",
        help_text="Usuario que reporta el problema (puede ser anónimo)"
    )
    
    # Información del reporte
    problem_type = models.CharField(
        max_length=50,
        choices=ProblemType.choices,
        default=ProblemType.OTHER,
        help_text="Tipo de problema"
    )
    subject = models.CharField(
        max_length=200,
        help_text="Asunto del problema"
    )
    description = models.TextField(
        help_text="Descripción detallada del problema"
    )
    steps_to_reproduce = models.TextField(
        blank=True,
        help_text="Pasos para reproducir el problema"
    )
    expected_behavior = models.TextField(
        blank=True,
        help_text="Comportamiento esperado"
    )
    actual_behavior = models.TextField(
        blank=True,
        help_text="Comportamiento actual"
    )
    
    # Información adicional
    browser_info = models.CharField(
        max_length=200,
        blank=True,
        help_text="Información del navegador"
    )
    device_info = models.CharField(
        max_length=200,
        blank=True,
        help_text="Información del dispositivo"
    )
    url = models.URLField(
        blank=True,
        help_text="URL donde ocurrió el problema"
    )
    screenshot_url = models.URLField(
        blank=True,
        null=True,
        help_text="URL de captura de pantalla si se adjuntó"
    )
    
    # Contacto
    contact_email = models.EmailField(
        blank=True,
        help_text="Email de contacto (si el usuario no está autenticado)"
    )
    
    # Estado y gestión
    status = models.CharField(
        max_length=50,
        choices=Status.choices,
        default=Status.PENDING,
        help_text="Estado del reporte"
    )
    admin_notes = models.TextField(
        blank=True,
        help_text="Notas del administrador"
    )
    resolved_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha de resolución"
    )
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_reports",
        help_text="Administrador que resolvió el problema"
    )
    
    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Reporte de Problema"
        verbose_name_plural = "Reportes de Problemas"
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["problem_type"]),
        ]
    
    def __str__(self):
        return f"{self.subject} - {self.get_status_display()}"
