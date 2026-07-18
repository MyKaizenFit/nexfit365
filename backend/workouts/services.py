# workouts/services.py
from typing import Dict, List, Optional, Tuple
from datetime import timedelta
import random

from django.db.models import Q
from django.utils import timezone

from accounts.models import CustomUser
from .models import (
    Exercise,
    WorkoutProgram,
    WorkoutDay,
    WorkoutDayExercise,
)


def reset_weekly_workout_plan_if_needed(program: WorkoutProgram) -> WorkoutProgram:
    """
    Inicializa start_date si falta y sincroniza duration_weeks con el contenido del plan.
    """
    if not program or not program.is_active:
        return program

    from .program_lifecycle import program_duration_weeks_from_plan

    today = timezone.localdate()
    update_fields: list[str] = []

    if not program.start_date:
        program.start_date = today
        update_fields.append("start_date")

    synced_duration = program_duration_weeks_from_plan(program)
    if (program.duration_weeks or 0) != synced_duration:
        program.duration_weeks = synced_duration
        update_fields.append("duration_weeks")

    if program.start_date and not program.end_date and synced_duration > 0:
        program.end_date = program.start_date + timedelta(weeks=synced_duration)
        update_fields.append("end_date")

    if update_fields:
        update_fields.append("updated_at")
        program.save(update_fields=update_fields)

    return program


def prepare_user_program_activation(program: WorkoutProgram) -> WorkoutProgram:
    """
    Al activar o reasignar un plan de usuario desde admin, ancla fechas para que
    el calendario arranque en semana 1 desde la semana actual.
    """
    if not program or not program.user_id:
        return program

    from .program_lifecycle import program_duration_weeks_from_plan

    today = timezone.localdate()
    monday = today - timedelta(days=today.weekday())
    duration = program_duration_weeks_from_plan(program)

    program.start_date = monday
    program.duration_weeks = duration
    program.end_date = monday + timedelta(weeks=duration)
    program.is_active = True
    program.save(update_fields=["start_date", "end_date", "duration_weeks", "is_active", "updated_at"])
    return program


def rollover_program_cycle_if_completed(program: WorkoutProgram) -> WorkoutProgram:
    """
    Si el usuario ha completado todas las semanas del plan, reinicia en semana 1
    sin desactivar el programa y avisa a los administradores.
    """
    if not program or not program.is_active or not program.user_id:
        return program

    from .program_lifecycle import is_program_completed, program_duration_weeks_from_plan
    from notifications.utils import notify_admins_user_change

    if not is_program_completed(program):
        return program

    today = timezone.localdate()
    monday = today - timedelta(days=today.weekday())
    duration = program_duration_weeks_from_plan(program)

    if program.user:
        notify_admins_user_change(
            user=program.user,
            title="Plan de entrenamiento reiniciado automáticamente",
            message=(
                f"El plan «{program.name}» de {program.user.email} completó un ciclo "
                f"de {duration} semana(s) y se reinició en semana 1 desde el "
                f"{monday.strftime('%d/%m/%Y')}."
            ),
            data={
                "source": "workout_program_rollover",
                "program_id": str(program.id),
                "duration_weeks": duration,
            },
        )

    program.start_date = monday
    program.end_date = monday + timedelta(weeks=duration)
    program.duration_weeks = duration
    program.save(update_fields=["start_date", "end_date", "duration_weeks", "updated_at"])
    return program

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
    
    def get_suitable_programs(self) -> List[WorkoutProgram]:
        """Obtiene programas de entrenamiento adecuados para el usuario"""
        programs = WorkoutProgram.objects.filter(is_system=True, is_active=True, user__isnull=True)
        
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
            start_date=timezone.localdate(),
            end_date=timezone.localdate() + timedelta(weeks=duration_weeks),
            is_active=True
        )
        
        # Crear los días de entrenamiento
        self._create_workout_days(program, workout_duration)
        
        return program
    
    def _get_muscle_group_category(self, muscle_groups: List[str]) -> str:
        """Categoriza grupos musculares en Push, Pull, Legs o Full Body"""
        if not muscle_groups:
            return 'full_body'
        
        # Normalizar grupos musculares a minúsculas
        groups = [str(mg).lower() for mg in muscle_groups]
        
        # Grupos Push (empujar): pecho, tríceps, hombros
        push_groups = ['pecho', 'pectorales', 'tríceps', 'triceps', 'hombros', 'deltoides', 'deltoides anteriores', 'deltoides laterales']
        
        # Grupos Pull (tirar): espalda, bíceps, trapecio, romboides
        pull_groups = ['espalda', 'dorsales', 'bíceps', 'biceps', 'trapecio', 'romboides', 'deltoides posteriores']
        
        # Grupos Legs (piernas): piernas, glúteos, cuádriceps, isquiotibiales, gemelos
        legs_groups = ['piernas', 'glúteos', 'gluteos', 'cuádriceps', 'cuadriceps', 'isquiotibiales', 'gemelos', 'sóleo', 'soleo', 'abductores', 'aductores']
        
        # Contar coincidencias
        push_count = sum(1 for mg in groups if any(pg in mg for pg in push_groups))
        pull_count = sum(1 for mg in groups if any(plg in mg for plg in pull_groups))
        legs_count = sum(1 for mg in groups if any(lg in mg for lg in legs_groups))
        
        # Determinar categoría principal
        if legs_count > 0 and (push_count == 0 and pull_count == 0):
            return 'legs'
        elif push_count > pull_count and legs_count == 0:
            return 'push'
        elif pull_count > push_count and legs_count == 0:
            return 'pull'
        elif push_count > 0 and pull_count > 0 and legs_count == 0:
            return 'upper_body'
        elif legs_count > 0 and (push_count > 0 or pull_count > 0):
            return 'full_body'
        else:
            return 'full_body'
    
    def _get_exercises_by_category(self, category: str, all_exercises: List[Exercise], used_exercises: set) -> List[Exercise]:
        """Obtiene ejercicios de una categoría específica que no hayan sido usados"""
        available = []
        for exercise in all_exercises:
            if exercise.id in used_exercises:
                continue
            exercise_category = self._get_muscle_group_category(exercise.muscle_groups or [])
            if exercise_category == category:
                available.append(exercise)
        return available
    
    def _create_workout_days(self, program: WorkoutProgram, workout_duration: int):
        """Crea los días de entrenamiento del programa con lógica mejorada"""
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
        
        # Obtener todos los ejercicios disponibles
        all_exercises = list(Exercise.objects.filter(is_active=True))
        if not all_exercises:
            return
        
        # Definir rutinas según días por semana
        # Para 3 días: Push, Pull, Legs
        # Para 4 días: Push, Pull, Legs, Upper Body
        # Para 5 días: Push, Pull, Legs, Upper Body, Full Body
        # Para 6+ días: Push, Pull, Legs (repetir)
        routine_templates = {
            1: ['full_body'],
            2: ['upper_body', 'legs'],
            3: ['push', 'pull', 'legs'],
            4: ['push', 'pull', 'legs', 'upper_body'],
            5: ['push', 'pull', 'legs', 'upper_body', 'full_body'],
            6: ['push', 'pull', 'legs', 'push', 'pull', 'legs'],
            7: ['push', 'pull', 'legs', 'upper_body', 'full_body', 'push', 'pull']
        }
        
        # Obtener template de rutina
        routine = routine_templates.get(days_per_week, ['push', 'pull', 'legs'] * ((days_per_week // 3) + 1))
        routine = routine[:days_per_week]  # Asegurar que no exceda
        
        # Rastrear ejercicios usados para evitar duplicados
        used_exercises = set()
        
        # Crear días de entrenamiento
        for i, day in enumerate(selected_days):
            is_rest_day = False
            
            # Determinar categoría del día
            day_category = routine[i] if i < len(routine) else 'full_body'
            
            # Generar nombre del día basado en categoría
            category_names = {
                'push': 'Pecho, Tríceps y Hombros',
                'pull': 'Espalda y Bíceps',
                'legs': 'Piernas y Glúteos',
                'upper_body': 'Tren Superior',
                'full_body': 'Cuerpo Completo'
            }
            day_name = f"{self._get_day_name(day, workout_goal, i + 1)} - {category_names.get(day_category, 'Entrenamiento')}"
            
            # Marcar algunos días como descanso si hay muchos días de entrenamiento
            if days_per_week >= 6 and i % 2 == 1:
                is_rest_day = True
                day_name = f"Día de Descanso - {day_name}"
            
            workout_day = WorkoutDay.objects.create(
                program=program,
                day_of_week=day,
                name=day_name,
                day_number=day_to_number.get(day),
                duration_minutes=workout_duration if not is_rest_day else 0,
                is_rest_day=is_rest_day,
                focus=category_names.get(day_category, 'Entrenamiento'),
                notes=f"Entrenamiento personalizado para {workout_goal}",
                order_index=i + 1
            )
            
            # Añadir ejercicios solo si no es día de descanso
            if not is_rest_day:
                # Obtener ejercicios de la categoría del día
                category_exercises = self._get_exercises_by_category(day_category, all_exercises, used_exercises)
                
                # Si no hay suficientes ejercicios de la categoría, usar ejercicios complementarios
                if len(category_exercises) < 4:
                    # Para push, también buscar ejercicios de upper_body
                    if day_category == 'push':
                        category_exercises.extend(self._get_exercises_by_category('upper_body', all_exercises, used_exercises))
                    # Para pull, también buscar ejercicios de upper_body
                    elif day_category == 'pull':
                        category_exercises.extend(self._get_exercises_by_category('upper_body', all_exercises, used_exercises))
                    # Para legs, también buscar ejercicios de full_body que incluyan piernas
                    elif day_category == 'legs':
                        category_exercises.extend(self._get_exercises_by_category('full_body', all_exercises, used_exercises))
                
                # Eliminar duplicados manteniendo el orden
                seen = set()
                unique_exercises = []
                for ex in category_exercises:
                    if ex.id not in seen:
                        seen.add(ex.id)
                        unique_exercises.append(ex)
                
                # Seleccionar 4-6 ejercicios (priorizar ejercicios compuestos)
                # Separar ejercicios compuestos (múltiples grupos musculares) de aislamiento
                compound_exercises = [ex for ex in unique_exercises if len(ex.muscle_groups or []) >= 2]
                isolation_exercises = [ex for ex in unique_exercises if len(ex.muscle_groups or []) < 2]
                
                # Seleccionar ejercicios: 3-4 compuestos + 1-2 de aislamiento
                num_exercises = min(6, max(4, len(unique_exercises)))
                num_compound = min(4, len(compound_exercises), num_exercises - 1)
                num_isolation = min(2, len(isolation_exercises), num_exercises - num_compound)
                
                selected_compound = random.sample(compound_exercises, num_compound) if compound_exercises else []
                selected_isolation = random.sample(isolation_exercises, num_isolation) if isolation_exercises else []
                
                # Combinar: primero compuestos, luego aislamiento
                day_exercises = selected_compound + selected_isolation
                
                # Si aún no hay suficientes, completar con cualquier ejercicio disponible
                if len(day_exercises) < num_exercises:
                    remaining = [ex for ex in unique_exercises if ex not in day_exercises]
                    needed = num_exercises - len(day_exercises)
                    day_exercises.extend(random.sample(remaining, min(needed, len(remaining))))
                
                # Crear ejercicios en el día
                for j, exercise in enumerate(day_exercises):
                    sets = 3 if workout_level == 'beginner' else 4
                    reps = "12-15" if workout_level == 'beginner' else "8-12"
                    rest_time = 60 if workout_level == 'beginner' else 90
                    
                    WorkoutDayExercise.objects.create(
                        workout_day=workout_day,
                        exercise=exercise,
                        sets=sets,
                        reps=reps,
                        weight="",
                        rest_seconds=rest_time,
                        notes="",
                        order_index=j + 1
                    )
                    
                    # Marcar ejercicio como usado
                    used_exercises.add(exercise.id)
    
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
        exercises = Exercise.objects.filter(is_active=True)
        
        # Si no hay ejercicios, retornar lista vacía
        if not exercises.exists():
            return list(exercises)
        
        # Filtrar por lugar de entrenamiento si está especificado
        if self.user.training_location:
            if self.user.training_location == 'home':
                # Priorizar ejercicios de peso corporal o con equipamiento mínimo
                exercises = exercises.filter(
                    Q(category='bodyweight') | 
                    Q(equipment__contains=['bodyweight']) |
                    Q(equipment__contains=['dumbbells']) |
                    Q(equipment__contains=['resistance_bands'])
                )
            elif self.user.training_location == 'gym':
                # Priorizar ejercicios con equipamiento de gimnasio
                exercises = exercises.exclude(
                    Q(category='bodyweight') & 
                    ~Q(equipment__contains=['multipower']) &
                    ~Q(equipment__contains=['polea']) &
                    ~Q(equipment__contains=['máquina'])
                )
        
        # Filtrar por nivel de dificultad
        workout_level = self.determine_workout_level()
        if workout_level == 'beginner':
            exercises = exercises.filter(difficulty__in=['beginner', 'intermediate'])
        elif workout_level == 'intermediate':
            exercises = exercises.filter(difficulty__in=['beginner', 'intermediate', 'advanced'])
        # advanced puede usar todos
        
        # Priorizar ejercicios compuestos (múltiples grupos musculares)
        # Ordenar por número de grupos musculares (más grupos = más compuesto)
        exercises_list = list(exercises)
        exercises_list.sort(key=lambda x: len(x.muscle_groups or []), reverse=True)
        
        # Retornar hasta 50 ejercicios para tener variedad
        return exercises_list[:50]
    
    def get_recommendations(self) -> Dict[str, any]:
        """Obtiene recomendaciones de entrenamiento basadas en el perfil del usuario"""
        recommendations = {
            'workout_level': self.determine_workout_level(),
            'workout_goal': self.determine_workout_goal(),
            'recommended_days_per_week': self.user.training_days_per_week or 3,
            'workout_duration': self.get_workout_duration(),
            'suitable_programs': list(self.get_suitable_programs()[:3]),  # Top 3 programas
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
    Convierte un `WorkoutProgram` del sistema en un `WorkoutProgram` asignado al usuario.
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

    @staticmethod
    def infer_weekly_training_days(program: WorkoutProgram) -> int:
        """Infer weekly frequency from week-1 sessions; ignore stale days_per_week metadata."""
        first_week_training = program.days.filter(
            day_number__lte=7,
            is_rest_day=False,
        ).count()
        if 1 <= first_week_training <= 7:
            return first_week_training

        if program.days_per_week and 1 <= program.days_per_week <= 7:
            return program.days_per_week

        training_days_count = program.days.filter(is_rest_day=False).count()
        if 1 <= training_days_count <= 7:
            return training_days_count
        return 3

    def assign_from_default(
        self,
        default_program: Optional[WorkoutProgram],
        assigned_by: Optional[CustomUser] = None,
        notes: Optional[str] = None,
    ) -> Optional[WorkoutProgram]:
        if not default_program:
            return None

        # Las plantillas se pueden asignar aunque is_active=False en el listado admin.
        if not default_program.is_template and not default_program.is_system and not default_program.is_active:
            return None

        if not default_program.days.exists():
            return None

        existing_active_program = WorkoutProgram.objects.filter(user=self.user, is_active=True).first()
        if existing_active_program:
            existing_active_program.is_active = False
            existing_active_program.end_date = timezone.localdate()
            existing_active_program.save()

        from .program_lifecycle import program_duration_weeks_from_plan

        today = timezone.localdate()
        monday = today - timedelta(days=today.weekday())
        duration = program_duration_weeks_from_plan(default_program)
        end_date = monday + timedelta(weeks=duration)
        assigned_days_per_week = self.infer_weekly_training_days(default_program)

        program = WorkoutProgram.objects.create(
            user=self.user,
            name=f"{default_program.name} - {self.user.get_full_name() or self.user.email}",
            description=(default_program.description or "Programa asignado automáticamente"),
            difficulty=default_program.difficulty or "beginner",
            goal=self._infer_goal(default_program),
            days_per_week=assigned_days_per_week,
            duration_weeks=duration,
            start_date=monday,
            end_date=end_date,
            is_active=True,
            is_template=False,
            is_system=False,
            tags=build_assigned_program_tags(default_program),
        )

        if getattr(self.user, "training_days_per_week", None) != assigned_days_per_week:
            self.user.training_days_per_week = assigned_days_per_week
            self.user.save(update_fields=["training_days_per_week", "updated_at"])

        from accounts.services import (
            copy_template_days_to_user_program,
            get_template_training_days_with_exercises,
            normalize_training_days,
        )

        template_days = list(
            default_program.days.all().order_by("day_number", "order_index")
        )
        explicit_training_days = normalize_training_days(
            getattr(self.user, "training_days", None)
        )
        template_training_days = get_template_training_days_with_exercises(default_program)

        copy_template_days_to_user_program(
            template_days,
            program,
            user_training_days=explicit_training_days or None,
            template_training_days=template_training_days,
        )

        from dashboard.plan_sync import sync_user_from_active_plans
        sync_user_from_active_plans(self.user)

        return program

    def _infer_goal(self, default_program: WorkoutProgram) -> str:
        tags = {str(tag).lower() for tag in (default_program.tags or [])}
        if {"weight_loss", "fat_loss"} & tags:
            return "weight_loss"
        if {"muscle_gain", "hypertrophy"} & tags:
            return "muscle_gain"
        if {"strength"} & tags:
            return "strength"
        if {"endurance"} & tags:
            return "endurance"
        return default_program.goal or "general_fitness"


SOURCE_TEMPLATE_TAG_PREFIX = "source_template:"


def source_template_tag(template_id) -> str:
    return f"{SOURCE_TEMPLATE_TAG_PREFIX}{template_id}"


def extract_source_template_id(tags) -> Optional[str]:
    if not tags:
        return None
    for tag in tags:
        if isinstance(tag, str) and tag.startswith(SOURCE_TEMPLATE_TAG_PREFIX):
            template_id = tag[len(SOURCE_TEMPLATE_TAG_PREFIX):].strip()
            if template_id:
                return template_id
    return None


def build_assigned_program_tags(template_program: WorkoutProgram) -> List[str]:
    return [source_template_tag(template_program.id)]


def prefetch_workout_program_with_days(program: Optional[WorkoutProgram]) -> Optional[WorkoutProgram]:
    if not program:
        return None
    return (
        WorkoutProgram.objects.filter(pk=program.pk)
        .prefetch_related(
            "days__exercises__exercise",
            "days__exercises__exercise__substitutions__substitute",
        )
        .first()
    )


def find_assigned_workout_template(
    user: CustomUser,
    active_program: Optional[WorkoutProgram] = None,
) -> Optional[WorkoutProgram]:
    """
    Plantilla asignada directamente al usuario (prioridad sobre config. por defecto).
    Detecta por tag source_template:* o por convención de nombre "Plantilla - Usuario".
    """
    programs_to_check: List[WorkoutProgram] = []
    seen_ids = set()

    def add_program(candidate: Optional[WorkoutProgram]) -> None:
        if not candidate or candidate.id in seen_ids:
            return
        seen_ids.add(candidate.id)
        programs_to_check.append(candidate)

    add_program(active_program)
    for program in WorkoutProgram.objects.filter(user=user).order_by("-is_active", "-created_at")[:12]:
        add_program(program)

    for program in programs_to_check:
        template_id = extract_source_template_id(program.tags)
        if template_id:
            template = WorkoutProgram.objects.filter(
                pk=template_id,
                is_template=True,
                is_active=True,
            ).first()
            if template:
                return template

    templates = list(
        WorkoutProgram.objects.filter(is_template=True, is_active=True)
        .only("id", "name")
        .order_by("-updated_at")
    )
    best_template: Optional[WorkoutProgram] = None
    best_prefix_len = 0

    for program in programs_to_check:
        for template in templates:
            marker = f"{template.name} - "
            if program.name.startswith(marker) and len(template.name) > best_prefix_len:
                best_template = template
                best_prefix_len = len(template.name)

    return best_template


def find_default_config_workout_template(user: CustomUser) -> Optional[WorkoutProgram]:
    from dashboard.models import DefaultPlanConfiguration

    configurations = (
        DefaultPlanConfiguration.objects.filter(
            is_active=True,
            default_workout_program__isnull=False,
        )
        .select_related("default_workout_program")
        .order_by("priority")
    )
    for config in configurations:
        if config.matches_user_profile(user):
            return config.default_workout_program
    return None


def resolve_reference_workout_program(
    user: CustomUser,
    active_program: Optional[WorkoutProgram] = None,
) -> Tuple[Optional[WorkoutProgram], Optional[str]]:
    assigned_template = find_assigned_workout_template(user, active_program)
    if assigned_template:
        return assigned_template, "assigned_template"

    default_template = find_default_config_workout_template(user)
    if default_template:
        return default_template, "default_config"

    return None, None


def get_personalized_workout_plan(user: CustomUser) -> Dict[str, any]:
    """Función helper para obtener un plan de entrenamiento personalizado"""
    service = PersonalizedWorkoutService(user)
    return service.get_recommendations()
