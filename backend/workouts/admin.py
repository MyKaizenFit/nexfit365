# workouts/admin.py
from django.contrib import admin
from .models import (
    Exercise, ExerciseSubstitution, WorkoutProgram, WorkoutDay, WorkoutDayExercise,
    WorkoutLog, WorkoutLogExercise, WorkoutLogSet
)


class ExerciseSubstitutionInline(admin.TabularInline):
    model = ExerciseSubstitution
    fk_name = 'exercise'
    extra = 0


@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'difficulty', 'is_system', 'is_active']
    list_filter = ['category', 'difficulty', 'is_system', 'is_active']
    search_fields = ['name', 'description']
    ordering = ['name']
    inlines = [ExerciseSubstitutionInline]


class WorkoutDayInline(admin.TabularInline):
    model = WorkoutDay
    extra = 0
    ordering = ['order_index']


@admin.register(WorkoutProgram)
class WorkoutProgramAdmin(admin.ModelAdmin):
    list_display = ['name', 'difficulty', 'goal', 'days_per_week', 'is_system', 'is_template']
    list_filter = ['difficulty', 'goal', 'is_system', 'is_template', 'is_active']
    search_fields = ['name', 'description']
    inlines = [WorkoutDayInline]


class WorkoutDayExerciseInline(admin.TabularInline):
    model = WorkoutDayExercise
    extra = 0
    ordering = ['order_index']


@admin.register(WorkoutDay)
class WorkoutDayAdmin(admin.ModelAdmin):
    list_display = ['name', 'program', 'day_number', 'is_rest_day']
    list_filter = ['is_rest_day']
    inlines = [WorkoutDayExerciseInline]


@admin.register(WorkoutLog)
class WorkoutLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'completed', 'duration_minutes', 'rating']
    list_filter = ['completed', 'date']
    search_fields = ['user__email']
    ordering = ['-date']
