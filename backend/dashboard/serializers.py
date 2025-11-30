from rest_framework import serializers

from .models import DashboardData, WellnessTip


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


# DefaultPlanConfigurationSerializer fue eliminado porque el modelo ya no existe
