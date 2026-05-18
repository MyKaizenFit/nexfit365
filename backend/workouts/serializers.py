# workouts/serializers.py
# Serializers para la nueva estructura simplificada

from rest_framework import serializers
from django.db import DatabaseError
from .models import (
    Exercise, WorkoutProgram, WorkoutDay, WorkoutDayExercise,
    WorkoutLog, WorkoutLogExercise, WorkoutLogSet
)
from backend.utils.encoding_fix import fix_mojibake


class EncodingFixMixin:
    """Apply mojibake repair to outgoing representations."""

    def to_representation(self, instance):
        data = super().to_representation(instance)
        return fix_mojibake(data)


class ExerciseSerializer(EncodingFixMixin, serializers.ModelSerializer):
    """Serializer para ejercicios"""
    has_video = serializers.BooleanField(read_only=True)
    video_display_url = serializers.SerializerMethodField()
    substitutes = serializers.SerializerMethodField()
    
    class Meta:
        model = Exercise
        fields = [
            "id", "name", "description", "instructions",
            "category", "muscle_groups", "equipment", "difficulty",
            "video_url", "image_url", "google_drive_file_id",
            "has_video", "video_display_url",
            "substitutes",
            "is_system", "is_active", "tags",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "has_video", "video_display_url", "created_at", "updated_at"]
    
    def get_video_display_url(self, obj) -> str | None:
        """Retorna la URL del video"""
        return obj.get_video_url()

    def get_substitutes(self, obj) -> list:
        try:
            substitutes = obj.get_substitutes()
            return ExerciseSubstituteSerializer(substitutes, many=True).data
        except DatabaseError:
            return []


class ExerciseSubstituteSerializer(EncodingFixMixin, serializers.ModelSerializer):
    """Serializer minimo para sustitutos"""
    has_video = serializers.BooleanField(read_only=True)
    video_display_url = serializers.SerializerMethodField()

    class Meta:
        model = Exercise
        fields = [
            "id", "name", "category", "muscle_groups", "equipment", "difficulty",
            "description", "instructions",
            "video_url", "google_drive_file_id", "has_video", "video_display_url",
        ]

    def get_video_display_url(self, obj) -> str | None:
        """Retorna la URL del video"""
        return obj.get_video_url()


class ExerciseMinimalSerializer(EncodingFixMixin, serializers.ModelSerializer):
    """Serializer minimal para listas - incluye datos de video para reproducción"""
    has_video = serializers.BooleanField(read_only=True)
    video_display_url = serializers.SerializerMethodField()
    substitutes = serializers.SerializerMethodField()
    
    class Meta:
        model = Exercise
        fields = [
            "id", "name", "category", "muscle_groups", "difficulty",
            "description", "instructions",
            "video_url", "google_drive_file_id", "has_video", "video_display_url",
            "substitutes",
        ]
    
    def get_video_display_url(self, obj) -> str | None:
        """Retorna la URL del video"""
        return obj.get_video_url()

    def get_substitutes(self, obj) -> list:
        try:
            substitutes = obj.get_substitutes()
            return ExerciseSubstituteSerializer(substitutes, many=True).data
        except DatabaseError:
            return []


class WorkoutDayExerciseSerializer(EncodingFixMixin, serializers.ModelSerializer):
    """Serializer para ejercicios en un día"""
    exercise = ExerciseMinimalSerializer(read_only=True)
    exercise_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = WorkoutDayExercise
        fields = [
            "id", "exercise", "exercise_id",
            "sets", "reps", "weight", "duration_seconds", "rest_seconds",
            "notes", "order_index", "superset_group"
        ]


class WorkoutDaySerializer(EncodingFixMixin, serializers.ModelSerializer):
    """Serializer para días de entrenamiento"""
    exercises = WorkoutDayExerciseSerializer(many=True, read_only=True)
    total_exercises = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = WorkoutDay
        fields = [
            "id", "name", "day_number", "day_of_week",
            "is_rest_day", "duration_minutes", "focus", "notes",
            "order_index", "exercises", "total_exercises"
        ]


class WorkoutProgramSerializer(EncodingFixMixin, serializers.ModelSerializer):
    """Serializer para programas de entrenamiento"""
    days = WorkoutDaySerializer(many=True, read_only=True)
    total_days = serializers.IntegerField(read_only=True)
    training_days = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = WorkoutProgram
        fields = [
            "id", "name", "description",
            "difficulty", "goal", "location",
            "duration_weeks", "days_per_week", "estimated_duration_minutes",
            "equipment_needed",
            "is_template", "is_system", "is_active",
            "start_date", "end_date",
            "tags", "image_url",
            "days", "total_days", "training_days",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "total_days", "training_days", "created_at", "updated_at"]
    
    def update(self, instance, validated_data):
        """
        Actualizar programa con validación reforzada: solo un programa activo por usuario.
        Si se marca is_active=True, desactiva automáticamente otros programas activos del usuario.
        """
        is_activating = validated_data.get('is_active', False)
        
        # Si se está activando este programa y pertenece a un usuario, desactivar otros
        if is_activating and instance.user:
            WorkoutProgram.objects.filter(
                user=instance.user,
                is_active=True
            ).exclude(pk=instance.pk).update(is_active=False)
        
        return super().update(instance, validated_data)


class WorkoutProgramMinimalSerializer(EncodingFixMixin, serializers.ModelSerializer):
    """Serializer minimal para listas - incluye campos necesarios para admin"""
    days_count = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkoutProgram
        fields = [
            "id", "name", "description", "difficulty", "goal", 
            "duration_weeks", "days_per_week", "estimated_duration_minutes",
            "is_system", "is_template", "is_active", "location",
            "days_count"
        ]
    
    def get_days_count(self, obj) -> int:
        return obj.days.count()


class WorkoutLogSetSerializer(serializers.ModelSerializer):
    """Serializer para sets en un log"""
    class Meta:
        model = WorkoutLogSet
        fields = ["id", "set_number", "reps", "weight", "duration_seconds", "rest_seconds", "completed"]


class WorkoutLogExerciseSerializer(serializers.ModelSerializer):
    """Serializer para ejercicios en un log"""
    sets = WorkoutLogSetSerializer(many=True, read_only=True)
    
    class Meta:
        model = WorkoutLogExercise
        fields = ["id", "exercise", "exercise_name", "order_index", "notes", "sets"]


class WorkoutLogSerializer(serializers.ModelSerializer):
    """Serializer para logs de entrenamiento"""
    log_exercises = WorkoutLogExerciseSerializer(many=True, read_only=True)
    
    class Meta:
        model = WorkoutLog
        fields = [
            "id", "user", "workout_day", "date",
            "duration_minutes", "completed", "rating",
            "exercises_data", "notes",
            "calories_burned", "average_heart_rate",
            "log_exercises",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]
