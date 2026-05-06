from datetime import date

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase

from workouts.models import Exercise, WorkoutDay, WorkoutLog, WorkoutProgram

User = get_user_model()


class ExerciseModelTest(TestCase):
    def test_create_exercise(self):
        exercise = Exercise.objects.create(
            name="Press de banca",
            category="strength",
            muscle_groups=["chest", "triceps"],
            instructions="Acuéstate en un banco y presiona la barra",
        )

        self.assertEqual(exercise.name, "Press de banca")
        self.assertEqual(exercise.category, "strength")
        self.assertEqual(exercise.muscle_groups, ["chest", "triceps"])
        self.assertEqual(str(exercise), "Press de banca")

    def test_exercise_name_is_not_unique(self):
        Exercise.objects.create(name="Sentadilla", category="strength")
        duplicate = Exercise.objects.create(name="Sentadilla", category="strength")
        self.assertEqual(duplicate.name, "Sentadilla")


class WorkoutProgramModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="test@example.com", password="testpass123")

    def test_create_workout_program(self):
        program = WorkoutProgram.objects.create(
            user=self.user,
            name="Rutina Principiante",
            description="Rutina para principiantes",
            difficulty="beginner",
            goal="muscle_gain",
            days_per_week=3,
            duration_weeks=8,
            start_date="2024-01-01",
        )

        self.assertEqual(program.name, "Rutina Principiante")
        self.assertEqual(program.user, self.user)
        self.assertEqual(program.difficulty, "beginner")
        self.assertEqual(program.goal, "muscle_gain")
        self.assertTrue(program.is_active)

    def test_workout_program_choices(self):
        valid_difficulties = ["beginner", "intermediate", "advanced"]
        for difficulty in valid_difficulties:
            program = WorkoutProgram.objects.create(user=self.user, name=f"Programa {difficulty}", difficulty=difficulty)
            self.assertEqual(program.difficulty, difficulty)

        valid_goals = ["weight_loss", "muscle_gain", "strength", "endurance", "general_fitness", "body_recomposition"]
        for goal in valid_goals:
            program = WorkoutProgram.objects.create(user=self.user, name=f"Programa {goal}", goal=goal)
            self.assertEqual(program.goal, goal)

    def test_only_one_active_program_per_user(self):
        first = WorkoutProgram.objects.create(user=self.user, name="P1", is_active=True)
        second = WorkoutProgram.objects.create(user=self.user, name="P2", is_active=True)

        first.refresh_from_db()
        second.refresh_from_db()

        self.assertFalse(first.is_active)
        self.assertTrue(second.is_active)


class WorkoutDayModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="test@example.com", password="testpass123")
        self.program = WorkoutProgram.objects.create(user=self.user, name="Rutina Test")

    def test_create_workout_day(self):
        day = WorkoutDay.objects.create(
            program=self.program,
            day_number=1,
            day_of_week="monday",
            name="Día 1 - Pecho",
            is_rest_day=False,
            notes="Enfocado en pecho y tríceps",
            order_index=1,
        )

        self.assertEqual(day.program, self.program)
        self.assertEqual(day.day_number, 1)
        self.assertEqual(day.day_of_week, "monday")
        self.assertEqual(day.name, "Día 1 - Pecho")
        self.assertFalse(day.is_rest_day)
        self.assertEqual(day.order_index, 1)

    def test_workout_day_unique_day_number_per_program(self):
        WorkoutDay.objects.create(program=self.program, day_number=1, name="Día 1", order_index=1)
        with self.assertRaises(IntegrityError):
            WorkoutDay.objects.create(program=self.program, day_number=1, name="Día 1 repetido", order_index=2)


class WorkoutLogModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="test@example.com", password="testpass123")
        self.program = WorkoutProgram.objects.create(user=self.user, name="Rutina Test")
        self.day = WorkoutDay.objects.create(program=self.program, day_number=1, day_of_week="monday", name="Día 1", order_index=1)

    def test_create_workout_log(self):
        log = WorkoutLog.objects.create(
            user=self.user,
            workout_day=self.day,
            date="2024-01-01",
            completed=True,
            notes="Entrenamiento completado",
        )

        self.assertEqual(log.user, self.user)
        self.assertEqual(log.workout_day, self.day)
        self.assertEqual(str(log.date), "2024-01-01")
        self.assertTrue(log.completed)

    def test_workout_log_unique_constraint(self):
        WorkoutLog.objects.create(user=self.user, workout_day=self.day, date="2024-01-01")
        with self.assertRaises(IntegrityError):
            WorkoutLog.objects.create(user=self.user, workout_day=self.day, date="2024-01-01")