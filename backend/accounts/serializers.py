# accounts/serializers.py
from rest_framework import serializers
from datetime import timedelta
from django.db import models
from django.utils import timezone

from notifications.models import Notification
from workouts.models import WorkoutLog

from .models import CustomUser, ProfileAuditLog


IMPORTANT_NOTIFICATION_TYPES = {"progress", "nutrition", "workout", "system"}

class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer para el perfil completo del usuario"""
    
    bmi = serializers.ReadOnlyField()
    profile_picture = serializers.ImageField(read_only=True)
    profile_picture_url = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'first_name', 'last_name', 'phone_number', 'birth_date', 
            'gender', 'height', 'weight', 'target_weight', 'bmi',
            'activity_level', 'training_days_per_week', 'training_days', 
            'training_location', 'main_goal',
            'injuries_or_medical_issues', 'disliked_foods',
            'dietary_restrictions', 'allergies', 'medical_conditions', 
            'workout_preferences', 'equipment_available', 'notification_preferences', 
            'profile_picture', 'profile_picture_url',
            'daily_streak', 'longest_streak', 'last_completed_day',
            'role', 'is_staff', 'is_superuser', 'is_active', 'is_verified',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'email', 'role', 'is_staff', 'is_superuser', 'is_active', 'is_verified', 'created_at', 'updated_at']
    
    def get_profile_picture_url(self, obj):
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None

class AdminUserSerializer(serializers.ModelSerializer):
    """Serializer para administración de usuarios con información completa"""
    
    bmi = serializers.ReadOnlyField()
    age = serializers.ReadOnlyField()
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    gender_display = serializers.CharField(source='get_gender_display', read_only=True)
    main_goal_display = serializers.CharField(source='get_main_goal_display', read_only=True)
    activity_level_display = serializers.CharField(source='get_activity_level_display', read_only=True)
    training_location_display = serializers.CharField(source='get_training_location_display', read_only=True)
    is_staff_display = serializers.SerializerMethodField()
    is_superuser_display = serializers.SerializerMethodField()
    last_login_formatted = serializers.SerializerMethodField()
    created_at_formatted = serializers.SerializerMethodField()
    profile_picture_url = serializers.SerializerMethodField()
    premium_alerts = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = [
            # Información básica
            'id', 'email', 'first_name', 'last_name', 'phone_number', 'profile_picture', 'profile_picture_url',
            # Rol y permisos
            'role', 'role_display', 'is_active', 'is_staff', 'is_staff_display', 
            'is_superuser', 'is_superuser_display', 'is_verified',
            # Datos físicos
            'birth_date', 'age', 'gender', 'gender_display', 'height', 'weight', 'target_weight', 'bmi',
            # Objetivos y preferencias de fitness
            'main_goal', 'main_goal_display', 'activity_level', 'activity_level_display',
            'training_location', 'training_location_display', 'training_days_per_week', 'training_days',
            'equipment_available', 'workout_preferences',
            # Información dietética
            'dietary_restrictions', 'allergies', 'disliked_foods',
            # Información médica
            'medical_conditions', 'injuries_or_medical_issues',
            # Gamificación
            'daily_streak', 'longest_streak', 'last_completed_day',
            # Configuración
            'notification_preferences',
            # Onboarding
            'onboarding_completed', 'onboarding_step',
            # Timestamps
            'date_joined', 'created_at_formatted', 'last_login', 'last_login_formatted', 
            'created_at', 'updated_at',
            # Alertas premium para panel admin
            'premium_alerts'
        ]
        read_only_fields = ['id', 'email', 'date_joined', 'created_at', 'updated_at', 'bmi', 'age']
    
    def update(self, instance, validated_data):
        """Sobrescribir update para manejar el mapeo de roles"""
        # El mapeo de roles ya se hace en admin_views.py antes de llegar aquí
        return super().update(instance, validated_data)
    
    def get_is_staff_display(self, obj):
        return 'Sí' if obj.is_staff else 'No'
    
    def get_is_superuser_display(self, obj):
        return 'Sí' if obj.is_superuser else 'No'
    
    def get_last_login_formatted(self, obj):
        if obj.last_login:
            return obj.last_login.strftime('%d/%m/%Y %H:%M')
        return 'Nunca'
    
    def get_created_at_formatted(self, obj):
        if obj.date_joined:
            return obj.date_joined.strftime('%d/%m/%Y %H:%M')
        return 'N/A'
    
    def get_profile_picture_url(self, obj):
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None

    def get_premium_alerts(self, obj):
        if obj.role != 'premium':
            return None

        now = timezone.now()
        recent_profile_window = now - timedelta(days=7)
        recent_feedback_date = now.date() - timedelta(days=14)

        unread_notifications_count = Notification.objects.filter(
            user=obj,
            type__in=IMPORTANT_NOTIFICATION_TYPES,
            read_at__isnull=True,
        ).count()

        recent_profile_changes_count = ProfileAuditLog.objects.filter(
            user=obj,
            created_at__gte=recent_profile_window,
        ).count()

        latest_feedback = (
            WorkoutLog.objects.filter(user=obj, completed=True)
            .filter(models.Q(rating__isnull=False) | ~models.Q(notes=''))
            .order_by('-date', '-created_at')
            .first()
        )

        feedback_recent_count = 0
        latest_feedback_data = None
        if latest_feedback and latest_feedback.date and latest_feedback.date >= recent_feedback_date:
            feedback_recent_count = 1
            note_preview = (latest_feedback.notes or '').strip()
            if len(note_preview) > 120:
                note_preview = f"{note_preview[:117]}..."

            latest_feedback_data = {
                'date': latest_feedback.date.isoformat(),
                'rating': latest_feedback.rating,
                'message': note_preview or None,
            }

        pending_total = unread_notifications_count + recent_profile_changes_count + feedback_recent_count

        return {
            'enabled': True,
            'unread_notifications': unread_notifications_count,
            'recent_profile_changes': recent_profile_changes_count,
            'recent_workout_feedback': feedback_recent_count,
            'latest_workout_feedback': latest_feedback_data,
            'pending_total': pending_total,
            'has_pending': pending_total > 0,
        }

class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer para actualizar el perfil del usuario"""
    
    class Meta:
        model = CustomUser
        fields = [
            'first_name', 'last_name', 'birth_date', 'gender',
            'height', 'weight', 'target_weight',
            'main_goal', 'activity_level', 'training_days_per_week', 'training_days',
            'training_location', 'dietary_restrictions', 'allergies',
            'medical_conditions', 'workout_preferences', 'equipment_available',
            'notification_preferences', 'profile_picture', 'disliked_foods',
            'injuries_or_medical_issues'
        ]

class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer para el registro de nuevos usuarios"""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    role = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    
    class Meta:
        model = CustomUser
        fields = [
            'email', 'password', 'password_confirm', 'first_name', 'last_name',
            'birth_date', 'gender', 'height', 'weight', 'target_weight',
            'main_goal', 'activity_level', 'dietary_restrictions', 'allergies',
            'medical_conditions', 'workout_preferences', 'equipment_available',
            'phone_number', 'role'
        ]
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
        }
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Las contraseñas no coinciden")
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        # Verificar si viene desde admin (request.user es staff)
        request = self.context.get('request')
        is_from_admin = request and (request.user.is_staff or request.user.is_superuser)
        
        # Obtener el rol de los datos validados (viene del formulario)
        role = validated_data.pop('role', None)
        # Si no viene role o está vacío, establecer 'basic' por defecto
        if not role or role == '':
            role = 'basic'  # Rol por defecto para todos los usuarios
        
        # El modelo ahora acepta directamente basic, pro, premium, admin
        # Mapear valores antiguos y variantes para compatibilidad
        role_mapping = {
            'MEMBER': 'basic',  # Compatibilidad con datos antiguos
            'member': 'basic',  # Variante en minúsculas
            'TRAINER': 'pro',
            'trainer': 'pro',
            'ADMIN': 'admin',
            'admin': 'admin',
        }
        
        # Normalizar el rol
        role_lower = role.lower() if role else ''
        if role_lower in role_mapping:
            validated_data['role'] = role_mapping[role_lower]
        elif role in ['basic', 'pro', 'premium', 'admin']:
            validated_data['role'] = role
        else:
            validated_data['role'] = 'basic'
        
        # Cuando se crea desde admin, asegurar que el usuario esté activo
        if is_from_admin:
            validated_data['is_active'] = True
        
        user = CustomUser.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user

class UserGoalsSerializer(serializers.ModelSerializer):
    """Serializer específico para objetivos de fitness"""
    
    class Meta:
        model = CustomUser
        fields = ['main_goal', 'activity_level', 'target_weight']

class InitialRegistrationSerializer(serializers.ModelSerializer):
    """Serializer para el formulario de registro inicial completo"""
    
    class Meta:
        model = CustomUser
        fields = [
            'first_name', 'last_name', 'email', 'phone_number', 'birth_date', 'gender',
            'height', 'weight', 'target_weight', 'activity_level', 'training_days_per_week', 'training_days',
            'training_location', 'allergies', 'medical_conditions', 'disliked_foods',
            'main_goal', 'injuries_or_medical_issues'
        ]
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'email': {'read_only': True},  # El email no se puede cambiar
            'birth_date': {'required': True},
            'gender': {'required': True},
            'height': {'required': True},
            'weight': {'required': True},
            'activity_level': {'required': True},
            'training_days_per_week': {'required': True},
            'training_days': {'required': True},
            'training_location': {'required': True},
            'main_goal': {'required': True},
        }
    
    def validate_birth_date(self, value):
        from datetime import date
        if value and value > date.today():
            raise serializers.ValidationError("La fecha de nacimiento no puede ser en el futuro")
        # Verificar que la edad sea al menos 13 años
        today = date.today()
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        if age < 13:
            raise serializers.ValidationError("Debes tener al menos 13 años para registrarte")
        if age > 120:
            raise serializers.ValidationError("La fecha de nacimiento no es válida")
        return value
    
    def validate_height(self, value):
        if value < 50 or value > 210:
            raise serializers.ValidationError("La altura debe estar entre 50 y 210 cm")
        return value
    
    def validate_weight(self, value):
        if value < 20 or value > 300:
            raise serializers.ValidationError("El peso debe estar entre 20 y 300 kg")
        return value
    
    def validate_training_days_per_week(self, value):
        if value < 1 or value > 7:
            raise serializers.ValidationError("Los días de entrenamiento deben estar entre 1 y 7")
        return value
    
    def validate_training_days(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("training_days debe ser una lista")
        if len(value) == 0:
            raise serializers.ValidationError("Debes seleccionar al menos un día de entrenamiento")
        if not all(isinstance(day, int) and 1 <= day <= 7 for day in value):
            raise serializers.ValidationError("Los días deben ser números entre 1 (Lunes) y 7 (Domingo)")
        # Eliminar duplicados y ordenar
        return sorted(list(set(value)))
    
    def save(self, **kwargs):
        # Calcular training_days_per_week si no se proporciona
        training_days = self.validated_data.get('training_days', [])
        if training_days and 'training_days_per_week' not in self.validated_data:
            self.validated_data['training_days_per_week'] = len(training_days)
        elif 'training_days_per_week' not in self.validated_data and training_days:
            self.validated_data['training_days_per_week'] = len(training_days)
        
        # Convertir allergies y medical_conditions de string a lista si vienen como string
        if 'allergies' in self.validated_data:
            allergies = self.validated_data['allergies']
            if isinstance(allergies, str) and allergies.strip():
                # Si es un string no vacío, convertirlo a lista
                self.validated_data['allergies'] = [allergy.strip() for allergy in allergies.split(',') if allergy.strip()]
            elif not allergies or (isinstance(allergies, str) and not allergies.strip()):
                # Si está vacío, usar lista vacía
                self.validated_data['allergies'] = []
        
        if 'medical_conditions' in self.validated_data:
            medical_conditions = self.validated_data['medical_conditions']
            if isinstance(medical_conditions, str) and medical_conditions.strip():
                # Si es un string no vacío, convertirlo a lista
                self.validated_data['medical_conditions'] = [condition.strip() for condition in medical_conditions.split(',') if condition.strip()]
            elif not medical_conditions or (isinstance(medical_conditions, str) and not medical_conditions.strip()):
                # Si está vacío, usar lista vacía
                self.validated_data['medical_conditions'] = []
        
        # main_goal se guarda directamente en el campo main_goal del modelo
        # No hay necesidad de añadirlo a fitness_goals ya que ese campo no existe en el modelo
        
        # Convertir birth_date de string a date si es necesario
        if 'birth_date' in self.validated_data and self.validated_data['birth_date']:
            from datetime import date
            birth_date = self.validated_data['birth_date']
            if isinstance(birth_date, str):
                from datetime import datetime
                try:
                    birth_date = datetime.strptime(birth_date, '%Y-%m-%d').date()
                    self.validated_data['birth_date'] = birth_date
                except ValueError:
                    pass
        
        # Nota: age es una propiedad calculada en el modelo, no se debe asignar directamente
        
        # Forzar guardado de todos los campos, incluso si partial=True
        user = super().save(**kwargs)
        
        # Asegurar que los campos críticos se guarden directamente si no se guardaron en el serializer
        if 'birth_date' in self.validated_data:
            user.birth_date = self.validated_data['birth_date']
        if 'phone_number' in self.validated_data:
            user.phone_number = self.validated_data['phone_number']
        if 'main_goal' in self.validated_data:
            user.main_goal = self.validated_data['main_goal']
        
        user.save()
        return user