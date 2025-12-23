from rest_framework import serializers

from .models import DashboardData, WellnessTip, DefaultPlanConfiguration, HelpSettings, ProblemReport
from nutrition.models import NutritionPlan
from workouts.models import WorkoutProgram


class DashboardDataSerializer(serializers.ModelSerializer):
    """Serializer para datos del dashboard"""
    
    class Meta:
        model = DashboardData
        fields = [
            "id", "user", "date", "data_type", "nutrition_data", "workout_data",
            "progress_data", "achievements_data", "last_calculated", "expires_at"
        ]
        read_only_fields = ["id", "user", "last_calculated", "expires_at"]


class DashboardTodaySerializer(serializers.Serializer):
    """Serializer para dashboard del día actual"""
    date = serializers.DateField()
    
    # Nutrición
    meals_planned = serializers.IntegerField()
    meals_completed = serializers.IntegerField()
    calories_consumed = serializers.IntegerField()
    calories_target = serializers.IntegerField()
    nutrition_adherence = serializers.DecimalField(max_digits=5, decimal_places=2)
    
    # Entrenamiento
    workout_planned = serializers.BooleanField()
    workout_completed = serializers.BooleanField()
    workout_duration = serializers.IntegerField(allow_null=True)
    workout_rating = serializers.IntegerField(allow_null=True)
    
    # Progreso
    current_weight = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)
    weight_change_today = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)
    
    # Logros
    achievements_unlocked_today = serializers.IntegerField()
    points_earned_today = serializers.IntegerField()


class DashboardWeeklySerializer(serializers.Serializer):
    """Serializer para dashboard semanal"""
    week_start = serializers.DateField()
    week_end = serializers.DateField()
    
    # Nutrición semanal
    nutrition_adherence_week = serializers.DecimalField(max_digits=5, decimal_places=2)
    total_calories_week = serializers.IntegerField()
    average_calories_day = serializers.DecimalField(max_digits=6, decimal_places=2)
    meals_completed_week = serializers.IntegerField()
    meals_planned_week = serializers.IntegerField()
    
    # Entrenamiento semanal
    workouts_completed_week = serializers.IntegerField()
    workouts_planned_week = serializers.IntegerField()
    total_workout_time = serializers.IntegerField()
    average_workout_rating = serializers.DecimalField(max_digits=3, decimal_places=2)
    
    # Progreso semanal
    weight_change_week = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)
    weight_change_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)
    progress_photos_week = serializers.IntegerField()
    
    # Logros semanales
    achievements_unlocked_week = serializers.IntegerField()
    points_earned_week = serializers.IntegerField()
    
    # Tendencias
    trend_nutrition = serializers.CharField()
    trend_workouts = serializers.CharField()
    trend_progress = serializers.CharField()


class DashboardMonthlySerializer(serializers.Serializer):
    """Serializer para dashboard mensual"""
    month = serializers.CharField()
    year = serializers.IntegerField()
    
    # Resumen mensual
    total_workouts = serializers.IntegerField()
    total_meals_logged = serializers.IntegerField()
    total_progress_photos = serializers.IntegerField()
    total_achievements = serializers.IntegerField()
    
    # Promedios mensuales
    average_workout_rating = serializers.DecimalField(max_digits=3, decimal_places=2)
    average_nutrition_adherence = serializers.DecimalField(max_digits=5, decimal_places=2)
    average_calories_day = serializers.DecimalField(max_digits=6, decimal_places=2)
    
    # Objetivos mensuales
    goals_achieved = serializers.IntegerField()
    goals_total = serializers.IntegerField()
    goals_completion_rate = serializers.DecimalField(max_digits=5, decimal_places=2)


class DashboardStatsSerializer(serializers.Serializer):
    """Serializer para estadísticas generales del dashboard"""
    user_id = serializers.UUIDField()
    total_days_active = serializers.IntegerField()
    current_streak = serializers.IntegerField()
    longest_streak = serializers.IntegerField()
    total_points = serializers.IntegerField()
    level = serializers.IntegerField()
    next_level_points = serializers.IntegerField()
    progress_to_next_level = serializers.DecimalField(max_digits=5, decimal_places=2) 


class WellnessTipSerializer(serializers.ModelSerializer):
    """Serializer para consejos de bienestar creados por administradores."""

    author_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    author_email = serializers.EmailField(source="created_by.email", read_only=True)

    class Meta:
        model = WellnessTip
        fields = [
            "id",
            "title",
            "summary",
            "content",
            "category",
            "audience",
            "is_active",
            "is_highlighted",
            "created_at",
            "updated_at",
            "author_name",
            "author_email",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "author_name", "author_email"]


class DefaultPlanConfigurationSerializer(serializers.ModelSerializer):
    """Serializer para configuraciones de planes por defecto"""
    
    default_nutrition_plan = serializers.SerializerMethodField()
    default_workout_program = serializers.SerializerMethodField()
    
    class Meta:
        model = DefaultPlanConfiguration
        fields = [
            'id', 'name', 'description', 'priority', 'is_active',
            'main_goal', 'training_location', 'activity_level', 'gender',
            'min_training_days_per_week', 'max_training_days_per_week',
            'age_min', 'age_max', 'dietary_restrictions', 'equipment_keywords',
            'default_nutrition_plan', 'default_workout_program',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_default_nutrition_plan(self, obj):
        if obj.default_nutrition_plan:
            return {
                'id': str(obj.default_nutrition_plan.id),
                'name': obj.default_nutrition_plan.name,
            }
        return None
    
    def get_default_workout_program(self, obj):
        if obj.default_workout_program:
            return {
                'id': str(obj.default_workout_program.id),
                'name': obj.default_workout_program.name,
            }
        return None


class DefaultPlanConfigurationCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para crear/actualizar configuraciones de planes por defecto"""
    
    default_nutrition_plan_id = serializers.UUIDField(required=False, allow_null=True)
    default_workout_program_id = serializers.UUIDField(required=False, allow_null=True)
    
    class Meta:
        model = DefaultPlanConfiguration
        fields = [
            'name', 'description', 'priority', 'is_active',
            'main_goal', 'training_location', 'activity_level', 'gender',
            'min_training_days_per_week', 'max_training_days_per_week',
            'age_min', 'age_max', 'dietary_restrictions', 'equipment_keywords',
            'default_nutrition_plan_id', 'default_workout_program_id'
        ]
    
    def validate(self, attrs):
        # Validar que el plan nutricional existe
        nutrition_plan_id = attrs.get('default_nutrition_plan_id')
        if nutrition_plan_id:
            if not NutritionPlan.objects.filter(id=nutrition_plan_id).exists():
                raise serializers.ValidationError({
                    'default_nutrition_plan_id': 'Plan nutricional no encontrado'
                })
        
        # Validar que el programa de entrenamiento existe
        workout_program_id = attrs.get('default_workout_program_id')
        if workout_program_id:
            if not WorkoutProgram.objects.filter(id=workout_program_id).exists():
                raise serializers.ValidationError({
                    'default_workout_program_id': 'Programa de entrenamiento no encontrado'
                })
        
        return attrs
    
    def create(self, validated_data):
        nutrition_plan_id = validated_data.pop('default_nutrition_plan_id', None)
        workout_program_id = validated_data.pop('default_workout_program_id', None)
        
        config = DefaultPlanConfiguration.objects.create(**validated_data)
        
        if nutrition_plan_id:
            config.default_nutrition_plan_id = nutrition_plan_id
        if workout_program_id:
            config.default_workout_program_id = workout_program_id
        
        config.save()
        return config
    
    def update(self, instance, validated_data):
        nutrition_plan_id = validated_data.pop('default_nutrition_plan_id', None)
        workout_program_id = validated_data.pop('default_workout_program_id', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if nutrition_plan_id is not None:
            instance.default_nutrition_plan_id = nutrition_plan_id
        if workout_program_id is not None:
            instance.default_workout_program_id = workout_program_id
        
        instance.save()
        return instance


class HelpSettingsSerializer(serializers.ModelSerializer):
    """Serializer para configuración de ayuda"""
    
    class Meta:
        model = HelpSettings
        fields = [
            'id', 'faq_enabled', 'faq_url', 'faq_content',
            'contact_email', 'contact_enabled',
            'guides_enabled', 'guides_url', 'guides_content',
            'report_enabled', 'report_email', 'report_redirect_url',
            'app_version', 'last_update_date', 'terms_url', 'privacy_url',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProblemReportSerializer(serializers.ModelSerializer):
    """Serializer para reportes de problemas"""
    
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    resolved_by_email = serializers.EmailField(source='resolved_by.email', read_only=True)
    
    class Meta:
        model = ProblemReport
        fields = [
            'id', 'user', 'user_email', 'user_name',
            'problem_type', 'subject', 'description',
            'steps_to_reproduce', 'expected_behavior', 'actual_behavior',
            'browser_info', 'device_info', 'url', 'screenshot_url',
            'contact_email', 'status', 'admin_notes',
            'resolved_at', 'resolved_by', 'resolved_by_email',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'user_email', 'user_name',
            'resolved_by', 'resolved_by_email', 'resolved_at',
            'created_at', 'updated_at'
        ]


class ProblemReportCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear reportes de problemas (público)"""
    
    class Meta:
        model = ProblemReport
        fields = [
            'problem_type', 'subject', 'description',
            'steps_to_reproduce', 'expected_behavior', 'actual_behavior',
            'browser_info', 'device_info', 'url', 'screenshot_url',
            'contact_email'
        ]
    
    def create(self, validated_data):
        # Asignar usuario si está autenticado
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        
        return super().create(validated_data)
