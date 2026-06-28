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


def build_absolute_file_url(serializer, file_field) -> str | None:
    if not file_field:
        return None

    try:
        url = file_field.url
    except (ValueError, AttributeError):
        return None

    request = serializer.context.get("request") if hasattr(serializer, "context") else None
    if request:
        return request.build_absolute_uri(url)
    return url


def build_exercise_video_display_url(serializer, exercise) -> str | None:
    if getattr(exercise, "video_file", None):
        return build_absolute_file_url(serializer, exercise.video_file)
    return exercise.get_video_url()


def build_exercise_cover_url(serializer, exercise) -> str | None:
    """Portada del ejercicio: miniatura subida o URL externa."""
    thumbnail = build_absolute_file_url(serializer, getattr(exercise, "thumbnail", None))
    if thumbnail:
        return thumbnail
    image_url = (getattr(exercise, "image_url", None) or "").strip()
    return image_url or None


class ExerciseSerializer(EncodingFixMixin, serializers.ModelSerializer):
    """Serializer para ejercicios"""
    has_video = serializers.BooleanField(read_only=True)
    video_display_url = serializers.SerializerMethodField()
    video_file_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    cover_url = serializers.SerializerMethodField()
    substitutes = serializers.SerializerMethodField()
    
    class Meta:
        model = Exercise
        fields = [
            "id", "name", "description", "instructions",
            "category", "muscle_groups", "equipment", "difficulty",
            "video_url", "video_file_url", "image_url", "thumbnail_url", "cover_url",
            "google_drive_file_id",
            "has_video", "video_display_url",
            "substitutes",
            "is_system", "is_active", "tags",
            "created_at", "updated_at"
        ]
        read_only_fields = [
            "id", "has_video", "video_display_url", "video_file_url",
            "thumbnail_url", "cover_url", "created_at", "updated_at",
        ]
    
    def get_video_display_url(self, obj) -> str | None:
        """Retorna la URL del video"""
        return build_exercise_video_display_url(self, obj)

    def get_video_file_url(self, obj) -> str | None:
        return build_absolute_file_url(self, obj.video_file)

    def get_thumbnail_url(self, obj) -> str | None:
        return build_absolute_file_url(self, obj.thumbnail)

    def get_cover_url(self, obj) -> str | None:
        return build_exercise_cover_url(self, obj)

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
    video_file_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    cover_url = serializers.SerializerMethodField()

    class Meta:
        model = Exercise
        fields = [
            "id", "name", "category", "muscle_groups", "equipment", "difficulty",
            "description", "instructions",
            "video_url", "video_file_url", "image_url", "thumbnail_url", "cover_url",
            "google_drive_file_id", "has_video", "video_display_url",
        ]

    def get_video_display_url(self, obj) -> str | None:
        """Retorna la URL del video"""
        return build_exercise_video_display_url(self, obj)

    def get_video_file_url(self, obj) -> str | None:
        return build_absolute_file_url(self, obj.video_file)

    def get_thumbnail_url(self, obj) -> str | None:
        return build_absolute_file_url(self, obj.thumbnail)

    def get_cover_url(self, obj) -> str | None:
        return build_exercise_cover_url(self, obj)


class ExerciseMinimalSerializer(EncodingFixMixin, serializers.ModelSerializer):
    """Serializer minimal para listas - incluye datos de video para reproducción"""
    has_video = serializers.BooleanField(read_only=True)
    video_display_url = serializers.SerializerMethodField()
    video_file_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    cover_url = serializers.SerializerMethodField()
    substitutes = serializers.SerializerMethodField()
    
    class Meta:
        model = Exercise
        fields = [
            "id", "name", "category", "muscle_groups", "difficulty",
            "description", "instructions",
            "video_url", "video_file_url", "image_url", "thumbnail_url", "cover_url",
            "google_drive_file_id", "has_video", "video_display_url",
            "substitutes",
        ]
    
    def get_video_display_url(self, obj) -> str | None:
        """Retorna la URL del video"""
        return build_exercise_video_display_url(self, obj)

    def get_video_file_url(self, obj) -> str | None:
        return build_absolute_file_url(self, obj.video_file)

    def get_thumbnail_url(self, obj) -> str | None:
        return build_absolute_file_url(self, obj.thumbnail)

    def get_cover_url(self, obj) -> str | None:
        return build_exercise_cover_url(self, obj)

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
    workout_day_name = serializers.CharField(source="workout_day.name", read_only=True)
    workout_day_day = serializers.CharField(source="workout_day.day_of_week", read_only=True)
    
    class Meta:
        model = WorkoutLog
        fields = [
            "id", "user", "workout_day", "date",
            "workout_day_name", "workout_day_day",
            "duration_minutes", "completed", "rating",
            "exercises_data", "notes",
            "calories_burned", "average_heart_rate",
            "log_exercises",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]
