# workouts/admin_serializers.py
# Serializers de admin simplificados

from rest_framework import serializers
from .models import Exercise, WorkoutProgram, WorkoutDay, WorkoutDayExercise
from backend.utils.encoding_fix import fix_mojibake
from .serializers import build_absolute_file_url, build_exercise_video_display_url


class EncodingFixMixin:
    """Apply mojibake repair to outgoing representations."""

    def to_representation(self, instance):
        data = super().to_representation(instance)
        return fix_mojibake(data)


class AdminExerciseSerializer(EncodingFixMixin, serializers.ModelSerializer):
    has_video = serializers.BooleanField(read_only=True)
    video_display_url = serializers.SerializerMethodField()
    video_file_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    substitutes = serializers.SerializerMethodField()

    class Meta:
        model = Exercise
        fields = '__all__'

    def get_substitutes(self, obj) -> list:
        substitutes = obj.get_substitutes()
        return AdminExerciseSubstituteSerializer(substitutes, many=True).data

    def get_video_display_url(self, obj) -> str | None:
        return build_exercise_video_display_url(self, obj)

    def get_video_file_url(self, obj) -> str | None:
        return build_absolute_file_url(self, obj.video_file)

    def get_thumbnail_url(self, obj) -> str | None:
        return build_absolute_file_url(self, obj.thumbnail)


class AdminExerciseListSerializer(EncodingFixMixin, serializers.ModelSerializer):
    """Serializer ligero para listados admin de ejercicios."""
    has_video = serializers.BooleanField(read_only=True)
    video_display_url = serializers.SerializerMethodField()
    video_file_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = Exercise
        fields = [
            "id",
            "name",
            "category",
            "muscle_groups",
            "equipment",
            "difficulty",
            "is_system",
            "is_active",
            "video_url",
            "video_file_url",
            "image_url",
            "thumbnail_url",
            "google_drive_file_id",
            "has_video",
            "video_display_url",
        ]

    def get_video_display_url(self, obj) -> str | None:
        return build_exercise_video_display_url(self, obj)

    def get_video_file_url(self, obj) -> str | None:
        return build_absolute_file_url(self, obj.video_file)

    def get_thumbnail_url(self, obj) -> str | None:
        return build_absolute_file_url(self, obj.thumbnail)


class AdminExerciseSubstituteSerializer(EncodingFixMixin, serializers.ModelSerializer):
    has_video = serializers.BooleanField(read_only=True)
    video_display_url = serializers.SerializerMethodField()
    video_file_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = Exercise
        fields = [
            "id",
            "name",
            "category",
            "muscle_groups",
            "equipment",
            "difficulty",
            "description",
            "instructions",
            "video_url",
            "video_file_url",
            "image_url",
            "thumbnail_url",
            "google_drive_file_id",
            "has_video",
            "video_display_url",
            "is_system",
            "is_active",
            "tags",
        ]

    def get_video_display_url(self, obj) -> str | None:
        return build_exercise_video_display_url(self, obj)

    def get_video_file_url(self, obj) -> str | None:
        return build_absolute_file_url(self, obj.video_file)

    def get_thumbnail_url(self, obj) -> str | None:
        return build_absolute_file_url(self, obj.thumbnail)


class AdminWorkoutDayExerciseSerializer(EncodingFixMixin, serializers.ModelSerializer):
    exercise_name = serializers.CharField(source='exercise.name', read_only=True)
    exercise_category = serializers.CharField(source='exercise.category', read_only=True)
    substitutes = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkoutDayExercise
        fields = '__all__'
    
    def get_substitutes(self, obj) -> list:
        """Obtener los ejercicios de reemplazo para este ejercicio"""
        if not hasattr(obj, 'exercise') or not obj.exercise:
            return []
        substitutes = obj.exercise.get_substitutes()
        return AdminExerciseSubstituteSerializer(substitutes, many=True).data


class AdminWorkoutDaySerializer(EncodingFixMixin, serializers.ModelSerializer):
    exercises = AdminWorkoutDayExerciseSerializer(many=True, read_only=True)
    
    class Meta:
        model = WorkoutDay
        fields = '__all__'


class AdminWorkoutProgramSerializer(EncodingFixMixin, serializers.ModelSerializer):
    days = AdminWorkoutDaySerializer(many=True, read_only=True)
    
    class Meta:
        model = WorkoutProgram
        fields = '__all__'


class AdminWorkoutProgramMinimalSerializer(EncodingFixMixin, serializers.ModelSerializer):
    """
    Serializer minimal para listas en admin.
    Incluye info del usuario para poder gestionar planes de usuarios.
    """
    user_email = serializers.SerializerMethodField()
    created_by_email = serializers.SerializerMethodField()
    days_count = serializers.SerializerMethodField()
    training_days = serializers.SerializerMethodField()

    class Meta:
        model = WorkoutProgram
        fields = [
            "id",
            "name",
            "description",
            "difficulty",
            "goal",
            "location",
            "duration_weeks",
            "days_per_week",
            "estimated_duration_minutes",
            "is_template",
            "is_system",
            "is_active",
            "user",
            "created_by",
            "user_email",
            "created_by_email",
            "days_count",
            "training_days",
            "created_at",
            "updated_at",
        ]

    def get_user_email(self, obj) -> str | None:
        try:
            return getattr(obj.user, "email", None)
        except Exception:
            return None

    def get_created_by_email(self, obj) -> str | None:
        try:
            return getattr(obj.created_by, "email", None)
        except Exception:
            return None

    def get_days_count(self, obj) -> int:
        try:
            return obj.days.count()
        except Exception:
            return 0

    def get_training_days(self, obj) -> int:
        try:
            return sum(1 for day in obj.days.all() if not day.is_rest_day)
        except Exception:
            return 0
