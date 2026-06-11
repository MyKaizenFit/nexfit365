from django.contrib.auth import get_user_model
from django.test import TestCase

from dashboard.models import UserStats
from dashboard.plan_sync import derive_plan_targets, infer_training_day_numbers, sync_user_from_active_plans
from nutrition.models import NutritionPlan, NutritionPlanAssignment
from workouts.models import WorkoutDay, WorkoutProgram

User = get_user_model()


class PlanSyncTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="plan-sync@test.com",
            password="testpass123",
            first_name="Plan",
            last_name="Sync",
            training_days=[1, 3, 5],
            training_days_per_week=3,
        )
        UserStats.objects.create(user=self.user, calories_goal=2000, workouts_goal=5)

        self.nutrition_plan = NutritionPlan.objects.create(
            user=self.user,
            name="Plan Admin",
            daily_calories=1750,
            protein_grams=124,
            carbs_grams=174,
            fat_grams=61,
            goal="lose_weight",
            is_active=True,
        )
        NutritionPlanAssignment.objects.create(plan=self.nutrition_plan, user=self.user, is_active=True)

        self.workout_program = WorkoutProgram.objects.create(
            user=self.user,
            name="Rutina Admin",
            is_active=True,
            days_per_week=4,
        )
        for day_number, day_of_week, is_rest, name in [
            (1, "monday", False, "Pierna A"),
            (2, "tuesday", False, "Torso"),
            (3, "wednesday", True, "Descanso"),
            (4, "thursday", False, "Pierna B"),
            (5, "friday", False, "Full Body"),
            (6, "saturday", True, "Descanso"),
            (7, "sunday", True, "Descanso"),
        ]:
            WorkoutDay.objects.create(
                program=self.workout_program,
                day_number=day_number,
                day_of_week=day_of_week,
                is_rest_day=is_rest,
                name=name,
            )

    def test_infer_training_day_numbers_from_plan(self):
        numbers = infer_training_day_numbers(self.workout_program)
        self.assertEqual(numbers, [1, 2, 4, 5])

    def test_sync_user_from_active_plans_updates_stats_and_profile(self):
        sync_user_from_active_plans(self.user)

        self.user.refresh_from_db()
        stats = UserStats.objects.get(user=self.user)

        self.assertEqual(stats.calories_goal, 1750)
        self.assertEqual(stats.workouts_goal, 4)
        self.assertEqual(self.user.training_days, [1, 2, 4, 5])
        self.assertEqual(self.user.training_days_per_week, 4)

        targets = derive_plan_targets(self.user)
        self.assertEqual(targets["calories_goal"], 1750)
        self.assertEqual(targets["workouts_goal"], 4)
