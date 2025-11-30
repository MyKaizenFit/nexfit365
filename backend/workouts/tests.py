from django.test import TestCase
from django.contrib.auth import get_user_model
from workouts.models import Exercise, WorkoutProgram, WorkoutDay, WorkoutLog

User = get_user_model()


class ExerciseModelTest(TestCase):
    """Tests para el modelo Exercise"""
    
    def test_create_exercise(self):
        """Test crear un ejercicio básico"""
        exercise = Exercise.objects.create(
            name="Press de banca",
            category="chest",
            muscle_groups=["pectorales", "tríceps"],
            instructions="Acuéstate en un banco y presiona la barra"
        )
        
        self.assertEqual(exercise.name, "Press de banca")
        self.assertEqual(exercise.category, "chest")
        self.assertEqual(exercise.muscle_groups, ["pectorales", "tríceps"])
        self.assertEqual(str(exercise), "Press de banca")
    
    def test_exercise_unique_name(self):
        """Test que el nombre del ejercicio sea único"""
        Exercise.objects.create(
            name="Press de banca",
            category="chest",
            muscle_groups=["pectorales"]
        )
        
        with self.assertRaises(Exception):  # IntegrityError
            Exercise.objects.create(
                name="Press de banca",
                category="chest",
                muscle_groups=["pectorales"]
            )


class WorkoutProgramModelTest(TestCase):
    """Tests para el modelo WorkoutProgram"""
    
    def setUp(self):
        """Setup para cada test"""
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )
    
    def test_create_workout_program(self):
        """Test crear un programa de entrenamiento"""
        program = WorkoutProgram.objects.create(
            user=self.user,
            name="Rutina Principiante",
            description="Rutina para principiantes",
            level="beginner",
            goal="muscle_gain",
            days_per_week=3,
            duration_weeks=8,
            start_date="2024-01-01"
        )
        
        self.assertEqual(program.name, "Rutina Principiante")
        self.assertEqual(program.user, self.user)
        self.assertEqual(program.level, "beginner")
        self.assertEqual(program.goal, "muscle_gain")
        self.assertFalse(program.is_active)  # Por defecto es False
        self.assertEqual(str(program), f"Rutina Principiante ({self.user})")
    
    def test_workout_program_choices(self):
        """Test que los choices del programa sean válidos"""
        # Test level choices
        valid_levels = ["beginner", "intermediate", "advanced"]
        for level in valid_levels:
            program = WorkoutProgram.objects.create(
                user=self.user,
                name=f"Programa {level}",
                level=level,
                goal="muscle_gain",
                start_date="2024-01-01"
            )
            self.assertEqual(program.level, level)
        
        # Test goal choices
        valid_goals = ["weight_loss", "muscle_gain", "strength_building", "endurance", "general_fitness"]
        for goal in valid_goals:
            program = WorkoutProgram.objects.create(
                user=self.user,
                name=f"Programa {goal}",
                goal=goal,
                start_date="2024-01-01"
            )
            self.assertEqual(program.goal, goal)


class WorkoutDayModelTest(TestCase):
    """Tests para el modelo WorkoutDay"""
    
    def setUp(self):
        """Setup para cada test"""
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )
        self.program = WorkoutProgram.objects.create(
            user=self.user,
            name="Rutina Test",
            start_date="2024-01-01"
        )
    
    def test_create_workout_day(self):
        """Test crear un día de entrenamiento"""
        day = WorkoutDay.objects.create(
            program=self.program,
            day="monday",
            name="Día 1 - Pecho",
            is_rest_day=False,
            notes="Enfocado en pecho y tríceps",
            order_index=1
        )
        
        self.assertEqual(day.program, self.program)
        self.assertEqual(day.day, "monday")
        self.assertEqual(day.name, "Día 1 - Pecho")
        self.assertFalse(day.is_rest_day)
        self.assertEqual(day.notes, "Enfocado en pecho y tríceps")
        self.assertEqual(day.order_index, 1)
    
    def test_workout_day_rest_day(self):
        """Test crear un día de descanso"""
        rest_day = WorkoutDay.objects.create(
            program=self.program,
            day="sunday",
            name="Descanso",
            is_rest_day=True,
            order_index=7
        )
        
        self.assertTrue(rest_day.is_rest_day)
        self.assertEqual(rest_day.day, "sunday")
        self.assertEqual(rest_day.name, "Descanso")


class WorkoutLogModelTest(TestCase):
    """Tests para el modelo WorkoutLog"""
    
    def setUp(self):
        """Setup para cada test"""
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )
        self.program = WorkoutProgram.objects.create(
            user=self.user,
            name="Rutina Test",
            start_date="2024-01-01"
        )
        self.day = WorkoutDay.objects.create(
            program=self.program,
            day="monday",
            name="Día 1 - Pecho",
            order_index=1
        )
    
    def test_create_workout_log(self):
        """Test crear un log de entrenamiento"""
        log = WorkoutLog.objects.create(
            user=self.user,
            workout_day=self.day,
            date="2024-01-01",
            completed=True,
            notes="Entrenamiento completado"
        )
        
        self.assertEqual(log.user, self.user)
        self.assertEqual(log.workout_day, self.day)
        self.assertEqual(log.date, "2024-01-01")
        self.assertTrue(log.completed)
        self.assertEqual(log.notes, "Entrenamiento completado")
    
    def test_workout_log_defaults(self):
        """Test valores por defecto del log"""
        log = WorkoutLog.objects.create(
            user=self.user,
            workout_day=self.day,
            date="2024-01-01"
        )
        
        self.assertFalse(log.completed)  # Por defecto es False
        self.assertEqual(log.notes, "")  # Por defecto es string vacío