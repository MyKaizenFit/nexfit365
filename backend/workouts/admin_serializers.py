# workouts/admin_serializers.py
# Serializers de admin simplificados

from rest_framework import serializers
from .models import Exercise, WorkoutProgram, WorkoutDay, WorkoutDayExercise
from backend.utils.encoding_fix import fix_mojibake


class EncodingFixMixin:
    """Apply mojibake repair to outgoing representations."""

    def to_representation(self, instance):
        data = super().to_representation(instance)
        return fix_mojibake(data)


class AdminExerciseSerializer(EncodingFixMixin, serializers.ModelSerializer):
    substitutes = serializers.SerializerMethodField()

    class Meta:
        model = Exercise
        fields = '__all__'

    def get_substitutes(self, obj):
        substitutes = obj.get_substitutes()
        return AdminExerciseSubstituteSerializer(substitutes, many=True).data


class AdminExerciseSubstituteSerializer(EncodingFixMixin, serializers.ModelSerializer):
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
            "image_url",
            "google_drive_file_id",
            "is_system",
            "is_active",
            "tags",
        ]


class AdminWorkoutDayExerciseSerializer(EncodingFixMixin, serializers.ModelSerializer):
    exercise_name = serializers.CharField(source='exercise.name', read_only=True)
    
    class Meta:
        model = WorkoutDayExercise
        fields = '__all__'


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
            "created_at",
            "updated_at",
        ]

    def get_user_email(self, obj):
        try:
            return getattr(obj.user, "email", None)
        except Exception:
            return None

    def get_created_by_email(self, obj):
        try:
            return getattr(obj.created_by, "email", None)
        except Exception:
            return None

    def get_days_count(self, obj):
        try:
            return obj.days.count()
        except Exception:
            return 0
