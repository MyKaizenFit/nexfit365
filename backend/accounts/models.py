# accounts/models.py
# Modelo de usuario - Versión simplificada

import uuid
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


class CustomUserManager(BaseUserManager):
    """Manager personalizado para CustomUser"""
    
    def create_user(self, email, password=None, **extra_fields):
        """Crear y retornar un usuario regular con email y contraseña"""
        if not email:
            raise ValueError('El email debe ser proporcionado')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Crear y retornar un superusuario con email y contraseña"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser debe tener is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser debe tener is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractUser):
    """
    Usuario personalizado con campos adicionales para fitness/nutrición
    """
    
    # Usar email como campo de autenticación principal
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    
    # Eliminar el campo username heredado
    username = None
    
    # Usar el manager personalizado
    objects = CustomUserManager()
    
    # ==========================================================================
    # INFORMACIÓN BÁSICA
    # ==========================================================================
    
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    profile_picture = models.ImageField(
        upload_to='profile_pictures/', 
        null=True, 
        blank=True
    )
    
    # Rol del usuario
    ROLE_CHOICES = [
        ('basic', 'Usuario Básico'),
        ('pro', 'Usuario Pro'),
        ('premium', 'Usuario Premium'),
        ('admin', 'Administrador'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='basic')
    is_verified = models.BooleanField(default=False)
    
    # ==========================================================================
    # DATOS FÍSICOS
    # ==========================================================================
    
    birth_date = models.DateField(null=True, blank=True)
    
    GENDER_CHOICES = [
        ('male', 'Masculino'),
        ('female', 'Femenino'),
        ('other', 'Otro'),
    ]
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, null=True, blank=True)
    
    height = models.FloatField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(50), MaxValueValidator(250)],
        help_text="Altura en centímetros"
    )
    weight = models.FloatField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(20), MaxValueValidator(300)],
        help_text="Peso en kilogramos"
    )
    target_weight = models.FloatField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(20), MaxValueValidator(300)],
        help_text="Peso objetivo en kg"
    )
    
    # ==========================================================================
    # OBJETIVOS Y PREFERENCIAS DE FITNESS
    # ==========================================================================
    
    ACTIVITY_LEVEL_CHOICES = [
        ('sedentary', 'Sedentario'),
        ('light', 'Ligero'),
        ('moderate', 'Moderado'),
        ('active', 'Activo'),
        ('very_active', 'Muy Activo'),
    ]
    activity_level = models.CharField(
        max_length=20, 
        choices=ACTIVITY_LEVEL_CHOICES, 
        default='moderate'
    )
    
    MAIN_GOAL_CHOICES = [
        ('lose_weight', 'Perder peso'),
        ('gain_muscle', 'Ganar músculo'),
        ('body_recomposition', 'Recomposición corporal'),
        ('maintain', 'Mantener'),
        ('performance', 'Rendimiento'),
    ]
    main_goal = models.CharField(
        max_length=50, 
        choices=MAIN_GOAL_CHOICES, 
        null=True, 
        blank=True
    )
    
    TRAINING_LOCATION_CHOICES = [
        ('home', 'Casa'),
        ('gym', 'Gimnasio'),
        ('outdoor', 'Exterior'),
    ]
    training_location = models.CharField(
        max_length=20, 
        choices=TRAINING_LOCATION_CHOICES, 
        null=True, 
        blank=True
    )
    
    training_days_per_week = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(7)]
    )
    training_days = models.JSONField(
        default=list,
        help_text="Días que entrena [1=Lunes, ..., 7=Domingo]"
    )
    equipment_available = models.JSONField(
        default=list,
        help_text="Equipamiento disponible"
    )
    
    # ==========================================================================
    # INFORMACIÓN DIETÉTICA
    # ==========================================================================
    
    dietary_restrictions = models.JSONField(
        default=list,
        help_text="['vegetarian', 'vegan', 'gluten-free', etc.]"
    )
    allergies = models.JSONField(
        default=list,
        help_text="['nuts', 'dairy', 'shellfish', etc.]"
    )
    disliked_foods = models.TextField(
        null=True,
        blank=True,
        help_text="Alimentos que no come"
    )
    
    # ==========================================================================
    # INFORMACIÓN MÉDICA
    # ==========================================================================
    
    medical_conditions = models.JSONField(
        default=list,
        help_text="Condiciones médicas relevantes"
    )
    injuries_or_medical_issues = models.TextField(
        null=True,
        blank=True,
        help_text="Lesiones o issues médicos"
    )
    
    # ==========================================================================
    # GAMIFICACIÓN / RACHAS
    # ==========================================================================
    
    daily_streak = models.PositiveIntegerField(
        default=0,
        help_text="Racha actual de días consecutivos"
    )
    longest_streak = models.PositiveIntegerField(
        default=0,
        help_text="Racha más larga alcanzada"
    )
    last_completed_day = models.DateField(
        null=True,
        blank=True,
        help_text="Última fecha con día completo"
    )
    
    # ==========================================================================
    # CONFIGURACIÓN
    # ==========================================================================
    
    notification_preferences = models.JSONField(
        default=dict,
        help_text="Preferencias de notificaciones"
    )
    workout_preferences = models.JSONField(
        default=dict,
        help_text="Preferencias de entrenamiento"
    )
    
    # ==========================================================================
    # ONBOARDING
    # ==========================================================================
    
    onboarding_completed = models.BooleanField(
        default=False,
        help_text="Si completó el formulario inicial"
    )
    onboarding_step = models.PositiveIntegerField(
        default=0,
        help_text="Paso actual del onboarding"
    )
    
    # ==========================================================================
    # RESET DE CONTRASEÑA
    # ==========================================================================
    
    password_reset_token = models.CharField(max_length=64, null=True, blank=True)
    password_reset_expires = models.DateTimeField(null=True, blank=True)
    must_change_password = models.BooleanField(default=False)
    temporary_password_used = models.BooleanField(default=False)
    
    # ==========================================================================
    # TIMESTAMPS
    # ==========================================================================
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"
    
    def __str__(self):
        return f"{self.email} - {self.get_full_name()}"
    
    @property
    def bmi(self):
        """Calcular IMC"""
        if self.height and self.weight:
            height_m = self.height / 100
            return round(self.weight / (height_m ** 2), 2)
        return None
    
    @property
    def age(self):
        """Calcular edad desde fecha de nacimiento"""
        if self.birth_date:
            from datetime import date
            today = date.today()
            return today.year - self.birth_date.year - (
                (today.month, today.day) < (self.birth_date.month, self.birth_date.day)
            )
        return None
    
    @property
    def daily_calories_target(self):
        """Calcular calorías diarias objetivo basado en datos del usuario"""
        if not all([self.weight, self.height, self.birth_date, self.gender]):
            return None
        
        age = self.age
        if not age:
            return None
        
        # Fórmula Harris-Benedict
        if self.gender == 'male':
            bmr = 88.362 + (13.397 * self.weight) + (4.799 * self.height) - (5.677 * age)
        else:
            bmr = 447.593 + (9.247 * self.weight) + (3.098 * self.height) - (4.330 * age)
        
        # Multiplicador por nivel de actividad
        activity_multipliers = {
            'sedentary': 1.2,
            'light': 1.375,
            'moderate': 1.55,
            'active': 1.725,
            'very_active': 1.9,
        }
        
        tdee = bmr * activity_multipliers.get(self.activity_level, 1.55)
        
        # Ajustar según objetivo
        goal_adjustments = {
            'lose_weight': -500,
            'gain_muscle': 300,
            'body_recomposition': 0,
            'maintain': 0,
            'performance': 200,
        }
        
        return round(tdee + goal_adjustments.get(self.main_goal, 0))
