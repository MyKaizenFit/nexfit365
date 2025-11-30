# workouts/services.py
from typing import Dict, List, Optional, Tuple
from datetime import timedelta
import random

from django.db.models import Q
from django.utils import timezone

from accounts.models import CustomUser
from .models import (
    DefaultExercise,
    DefaultWorkoutProgram,
    DefaultWorkoutDay,
    Exercise,
    WorkoutProgram,
    WorkoutDay,
    WorkoutDayExercise,
)

class PersonalizedWorkoutService:
    """Servicio para generar planes de entrenamiento personalizados basados en el perfil del usuario"""
    
    def __init__(self, user: CustomUser):
        self.user = user
    
    def determine_workout_level(self) -> str:
        """Determina el nivel de entrenamiento basado en el perfil del usuario"""
        if not self.user.training_days_per_week:
            return 'beginner'
        
        # Basado en días de entrenamiento y experiencia
        if self.user.training_days_per_week <= 2:
            return 'beginner'
        elif self.user.training_days_per_week <= 4:
            return 'intermediate'
        else:
            return 'advanced'
    
    def determine_workout_goal(self) -> str:
        """Determina el objetivo de entrenamiento basado en el perfil del usuario"""
        if not self.user.main_goal:
            return 'general_fitness'
        
        goal_mapping = {
            'lose_weight': 'weight_loss',
            'gain_muscle': 'muscle_gain',
            'body_recomposition': 'strength_building'
        }
        
        return goal_mapping.get(self.user.main_goal, 'general_fitness')
    
    def get_workout_duration(self) -> int:
        """Calcula la duración del entrenamiento basada en el perfil del usuario"""
        if not self.user.training_days_per_week:
            return 30  # 30 minutos por defecto
        
        # Duración basada en días de entrenamiento y nivel de actividad
        base_duration = 30
        
        if self.user.activity_level == 'sedentary':
            base_duration = 25
        elif self.user.activity_level == 'very_active':
            base_duration = 45
        
        # Ajustar según días de entrenamiento
        if self.user.training_days_per_week <= 2:
            return base_duration
        elif self.user.training_days_per_week <= 4:
            return base_duration + 10
        else:
            return base_duration + 20
    
    def get_suitable_programs(self) -> List[DefaultWorkoutProgram]:
        """Obtiene programas de entrenamiento adecuados para el usuario"""
        programs = DefaultWorkoutProgram.objects.filter(is_active=True)
        
        # Filtrar por rol del usuario
        programs = programs.filter(min_role_required__lte=self.user.role)
        
        # Filtrar por nivel de entrenamiento
        workout_level = self.determine_workout_level()
        programs = programs.filter(difficulty=workout_level)
        
        # Filtrar por objetivo
        workout_goal = self.determine_workout_goal()
        programs = programs.filter(goal=workout_goal)
        
        # Filtrar por lugar de entrenamiento
        if self.user.training_location == 'home':
            programs = programs.filter(tags__contains=['home', 'bodyweight'])
        elif self.user.training_location == 'gym':
            programs = programs.filter(tags__contains=['gym', 'equipment'])
        
        return programs.order_by('-is_default', 'name')
    
    def create_personalized_program(self) -> WorkoutProgram:
        """Crea un programa de entrenamiento personalizado para el usuario"""
        workout_level = self.determine_workout_level()
        workout_goal = self.determine_workout_goal()
        duration_weeks = 4  # Duración por defecto
        workout_duration = self.get_workout_duration()
        
        # Crear el programa
        program = WorkoutProgram.objects.create(
            user=self.user,
            name=f"Programa Personalizado - {self.user.get_full_name()}",
            description=f"Programa de entrenamiento personalizado para {workout_goal} - Nivel {workout_level}",
            level=workout_level,
            goal=workout_goal,
            days_per_week=self.user.training_days_per_week or 3,
            duration_weeks=duration_weeks,
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timedelta(weeks=duration_weeks),
            is_active=True
        )
        
        # Crear los días de entrenamiento
        self._create_workout_days(program, workout_duration)
        
        return program
    
    def _create_workout_days(self, program: WorkoutProgram, workout_duration: int):
        """Crea los días de entrenamiento del programa"""
        days_per_week = program.days_per_week or 3
        workout_goal = program.goal
        workout_level = self.determine_workout_level()
        
        # Definir los días de la semana
        week_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        
        # Seleccionar días de entrenamiento
        if days_per_week == 1:
            selected_days = ['monday']
        elif days_per_week == 2:
            selected_days = ['monday', 'thursday']
        elif days_per_week == 3:
            selected_days = ['monday', 'wednesday', 'friday']
        elif days_per_week == 4:
            selected_days = ['monday', 'tuesday', 'thursday', 'friday']
        elif days_per_week == 5:
            selected_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        elif days_per_week == 6:
            selected_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        else:  # 7 días
            selected_days = week_days
        
        # Mapeo de nombres de días a números
        day_to_number = {
            'monday': 1,
            'tuesday': 2,
            'wednesday': 3,
            'thursday': 4,
            'friday': 5,
            'saturday': 6,
            'sunday': 7
        }
        
        # Obtener ejercicios recomendados
        recommended_exercises = self.get_exercise_recommendations()
        
        # Crear días de entrenamiento
        for i, day in enumerate(selected_days):
            is_rest_day = False
            day_name = self._get_day_name(day, workout_goal, i + 1)
            
            # Marcar algunos días como descanso si hay muchos días de entrenamiento
            if days_per_week >= 6 and i % 2 == 1:
                is_rest_day = True
                day_name = f"Día de Descanso - {day_name}"
            
            workout_day = WorkoutDay.objects.create(
                program=program,
                day=day,
                name=day_name,
                day_number=day_to_number.get(day),
                duration_minutes=workout_duration if not is_rest_day else 0,
                is_rest_day=is_rest_day,
                notes=f"Entrenamiento personalizado para {workout_goal}",
                order_index=i + 1
            )
            
            # Añadir ejercicios solo si no es día de descanso
            if not is_rest_day and recommended_exercises:
                # Seleccionar 4-6 ejercicios aleatorios para cada día
                num_exercises = min(6, len(recommended_exercises), random.randint(4, 6))
                day_exercises = random.sample(list(recommended_exercises), num_exercises)
                
                for j, exercise in enumerate(day_exercises):
                    sets = 3 if workout_level == 'beginner' else 4
                    reps = "12-15" if workout_level == 'beginner' else "8-12"
                    rest_time = 60 if workout_level == 'beginner' else 90
                    
                    WorkoutDayExercise.objects.create(
                        day=workout_day,
                        exercise=exercise,
                        category=exercise.category or "",
                        muscle_groups=exercise.muscle_groups or [],
                        sets=sets,
                        reps=reps,
                        weight="",
                        rest_seconds=rest_time,
                        notes="",
                        order_index=j + 1
                    )
    
    def _get_day_name(self, day: str, goal: str, day_number: int) -> str:
        """Genera nombres descriptivos para los días de entrenamiento"""
        day_names = {
            'monday': 'Lunes',
            'tuesday': 'Martes',
            'wednesday': 'Miércoles',
            'thursday': 'Jueves',
            'friday': 'Viernes',
            'saturday': 'Sábado',
            'sunday': 'Domingo'
        }
        
        goal_names = {
            'weight_loss': 'Cardio y Fuerza',
            'muscle_gain': 'Hipertrofia',
            'strength_building': 'Fuerza',
            'endurance': 'Resistencia',
            'general_fitness': 'Fitness General'
        }
        
        base_name = day_names.get(day, f'Día {day_number}')
        goal_name = goal_names.get(goal, 'Entrenamiento')
        
        return f"{base_name} - {goal_name}"
    
    def get_exercise_recommendations(self) -> List[Exercise]:
        """Obtiene recomendaciones de ejercicios basadas en el perfil del usuario"""
        exercises = Exercise.objects.all()
        
        # Si no hay ejercicios, retornar lista vacía
        if not exercises.exists():
            return list(exercises)
        
        # Simplemente retornar ejercicios aleatorios
        # TODO: Implementar filtrado por objetivo y lugar cuando el modelo Exercise se amplíe
        return list(exercises.order_by('?')[:20])
    
    def get_recommendations(self) -> Dict[str, any]:
        """Obtiene recomendaciones de entrenamiento basadas en el perfil del usuario"""
        recommendations = {
            'workout_level': self.determine_workout_level(),
            'workout_goal': self.determine_workout_goal(),
            'recommended_days_per_week': self.user.training_days_per_week or 3,
            'workout_duration': self.get_workout_duration(),
            'suitable_programs': self.get_suitable_programs()[:3],  # Top 3 programas
            'exercise_recommendations': self.get_exercise_recommendations()[:10],  # Top 10 ejercicios
            'tips': []
        }
        
        # Agregar consejos personalizados
        if self.user.main_goal == 'lose_weight':
            recommendations['tips'].append("Combina cardio con entrenamiento de fuerza para maximizar la quema de grasa")
            recommendations['tips'].append("Mantén la intensidad moderada-alta durante los entrenamientos")
        
        elif self.user.main_goal == 'gain_muscle':
            recommendations['tips'].append("Enfócate en ejercicios compuestos para maximizar el crecimiento muscular")
            recommendations['tips'].append("Progresión gradual en peso y repeticiones es clave")
        
        else:  # body_recomposition
            recommendations['tips'].append("Combina entrenamiento de fuerza con cardio moderado")
            recommendations['tips'].append("Mantén un balance entre volumen e intensidad")
        
        # Consejos basados en lugar de entrenamiento
        if self.user.training_location == 'home':
            recommendations['tips'].append("Usa tu peso corporal y equipamiento básico para entrenar efectivamente")
            recommendations['tips'].append("Considera ejercicios de alta intensidad (HIIT) para maximizar resultados")
        elif self.user.training_location == 'gym':
            recommendations['tips'].append("Aprovecha el equipamiento del gimnasio para variedad en tus entrenamientos")
            recommendations['tips'].append("Progresión en peso es más fácil con acceso a equipamiento completo")
        
        # Consejos basados en lesiones
        if self.user.injuries_or_medical_issues:
            recommendations['tips'].append("Consulta con un profesional antes de comenzar cualquier rutina de ejercicio")
            recommendations['tips'].append("Evita ejercicios que puedan agravar tus lesiones existentes")
        
        return recommendations


class DefaultWorkoutAssignmentService:
    """
    Convierte un `DefaultWorkoutProgram` en un `WorkoutProgram` asignado al usuario.
    """

    DAY_NUMBER_TO_NAME = {
        1: "monday",
        2: "tuesday",
        3: "wednesday",
        4: "thursday",
        5: "friday",
        6: "saturday",
        7: "sunday",
    }

    def __init__(self, user: CustomUser):
        self.user = user

    def assign_from_default(
        self,
        default_program: Optional[DefaultWorkoutProgram],
        assigned_by: Optional[CustomUser] = None,
        notes: Optional[str] = None,
    ) -> Optional[WorkoutProgram]:
        if not default_program or not default_program.is_active:
            return None

        existing_active_program = WorkoutProgram.objects.filter(user=self.user, is_active=True).first()
        if existing_active_program:
            existing_active_program.is_active = False
            existing_active_program.end_date = timezone.now().date()
            existing_active_program.save()

        start_date = timezone.now().date()
        end_date = start_date + timedelta(weeks=default_program.duration_weeks or 4)

        program = WorkoutProgram.objects.create(
            user=self.user,
            name=f"{default_program.name} - {self.user.get_full_name() or self.user.email}",
            description=(default_program.description or "Programa asignado automáticamente"),
            level=default_program.difficulty or "beginner",
            goal=self._infer_goal(default_program),
            days_per_week=default_program.days.count() or None,
            duration_weeks=default_program.duration_weeks,
            start_date=start_date,
            end_date=end_date,
            is_active=True,
        )

        for order, default_day in enumerate(default_program.days.all().order_by("day_number"), start=1):
            workout_day = WorkoutDay.objects.create(
                program=program,
                day=self.DAY_NUMBER_TO_NAME.get(default_day.day_number, f"day_{default_day.day_number or order}"),
                name=default_day.day_name,
                day_number=default_day.day_number or order,
                duration_minutes=default_program.estimated_duration_minutes,
                is_rest_day=default_day.is_rest_day,
                notes=default_day.notes,
                order_index=order,
            )

            for index, default_exercise in enumerate(default_day.exercises.all().order_by("order_index"), start=1):
                WorkoutDayExercise.objects.create(
                    day=workout_day,
                    exercise=default_exercise.exercise,
                    category="",
                    muscle_groups=[],
                    sets=default_exercise.sets,
                    reps=str(default_exercise.reps),
                    weight=str(default_exercise.weight) if default_exercise.weight is not None else "",
                    rest_seconds=default_exercise.rest_time,
                    notes="",
                    order_index=index,
                )

        return program

    def _infer_goal(self, default_program: DefaultWorkoutProgram) -> str:
        tags = {str(tag).lower() for tag in (default_program.tags or [])}
        if {"weight_loss", "fat_loss"} & tags:
            return "weight_loss"
        if {"muscle_gain", "hypertrophy"} & tags:
            return "muscle_gain"
        if {"strength"} & tags:
            return "strength_building"
        if {"endurance"} & tags:
            return "endurance"
        return "general_fitness"


def get_personalized_workout_plan(user: CustomUser) -> Dict[str, any]:
    """Función helper para obtener un plan de entrenamiento personalizado"""
    service = PersonalizedWorkoutService(user)
    return service.get_recommendations()
