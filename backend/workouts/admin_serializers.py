# workouts/admin_serializers.py
# Serializers de admin simplificados

from rest_framework import serializers
from .models import Exercise, WorkoutProgram, WorkoutDay, WorkoutDayExercise


class AdminExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercise
        fields = '__all__'


class AdminWorkoutDayExerciseSerializer(serializers.ModelSerializer):
    exercise_name = serializers.CharField(source='exercise.name', read_only=True)
    
    class Meta:
        model = WorkoutDayExercise
        fields = '__all__'


class AdminWorkoutDaySerializer(serializers.ModelSerializer):
    exercises = AdminWorkoutDayExerciseSerializer(many=True, read_only=True)
    
    class Meta:
        model = WorkoutDay
        fields = '__all__'


class AdminWorkoutProgramSerializer(serializers.ModelSerializer):
    days = AdminWorkoutDaySerializer(many=True, read_only=True)
    
    class Meta:
        model = WorkoutProgram
        fields = '__all__'
