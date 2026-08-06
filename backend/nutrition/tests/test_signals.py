from datetime import date
from decimal import Decimal
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from notifications.delivery_options import should_send_email
from notifications.models import Notification
from nutrition.models import NutritionPlan
from nutrition.signals import update_plan_on_user_change, update_plan_on_weight_entry
from progress.models import WeightEntry

User = get_user_model()


class NutritionPlanAutoUpdateNotificationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="nutrition-signals@test.com",
            password="testpass123",
            birth_date=date(1994, 1, 1),
            gender="male",
            height=175,
            weight=80,
            activity_level="moderate",
            main_goal="lose_weight",
        )
        self.plan = NutritionPlan.objects.create(
            name="Plan activo",
            user=self.user,
            daily_calories=2000,
            protein_grams=150,
            carbs_grams=200,
            fat_grams=65,
            is_active=True,
        )

    def _mock_auto_update_service(self):
        nutrition_service = Mock()
        nutrition_service.update_existing_plan.return_value = self.plan
        service = Mock()
        service.should_update_plan.return_value = (True, "Cambio de peso: 80.0 -> 82.0 kg")
        service.nutrition_service = nutrition_service
        return service

    def test_user_profile_auto_update_notifies_non_premium_without_email(self):
        self.user._old_weight = 80
        self.user._old_main_goal = self.user.main_goal
        self.user._old_activity_level = self.user.activity_level
        self.user._old_admin_calories_override = self.user.admin_calories_override
        self.user.weight = 82

        with patch("nutrition.signals.PlanAutoUpdateService", return_value=self._mock_auto_update_service()):
            update_plan_on_user_change(sender=User, instance=self.user, created=False)

        notification = Notification.objects.get(title="Plan nutricional actualizado")
        self.assertEqual(notification.user, self.user)
        self.assertEqual(notification.type, "nutrition")
        self.assertIs(notification.data["created_by_automation"], True)
        self.assertIs(notification.data["send_email"], False)
        self.assertIs(should_send_email(notification), False)

    def test_user_profile_auto_update_does_not_notify_premium_user(self):
        self.user.role = "premium"
        self.user._old_weight = 80
        self.user._old_main_goal = self.user.main_goal
        self.user._old_activity_level = self.user.activity_level
        self.user._old_admin_calories_override = self.user.admin_calories_override
        self.user.weight = 82

        with patch("nutrition.signals.PlanAutoUpdateService", return_value=self._mock_auto_update_service()):
            update_plan_on_user_change(sender=User, instance=self.user, created=False)

        self.assertFalse(Notification.objects.filter(title="Plan nutricional actualizado").exists())

    def test_weight_entry_auto_update_notifies_non_premium_without_email(self):
        self.user.weight = 82
        weight_entry = WeightEntry(
            user=self.user,
            weight=Decimal("82.00"),
            date=date.today(),
        )

        with patch("nutrition.signals.PlanAutoUpdateService", return_value=self._mock_auto_update_service()):
            update_plan_on_weight_entry(sender=WeightEntry, instance=weight_entry, created=True)

        notification = Notification.objects.get(title="Plan nutricional actualizado")
        self.assertEqual(notification.user, self.user)
        self.assertEqual(notification.type, "nutrition")
        self.assertIs(notification.data["created_by_automation"], True)
        self.assertIs(notification.data["send_email"], False)
        self.assertIs(should_send_email(notification), False)

    def test_weight_entry_auto_update_does_not_notify_premium_user(self):
        self.user.role = "premium"
        self.user.weight = 82
        weight_entry = WeightEntry(
            user=self.user,
            weight=Decimal("82.00"),
            date=date.today(),
        )

        with patch("nutrition.signals.PlanAutoUpdateService", return_value=self._mock_auto_update_service()):
            update_plan_on_weight_entry(sender=WeightEntry, instance=weight_entry, created=True)

        self.assertFalse(Notification.objects.filter(title="Plan nutricional actualizado").exists())
