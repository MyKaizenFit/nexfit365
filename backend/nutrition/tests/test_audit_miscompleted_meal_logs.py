"""Tests del comando de auditoría de MealLogs mis-completed (dry-run por defecto)."""

from datetime import date
from decimal import Decimal
from io import StringIO

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command

from nutrition.models import MealLog, Recipe

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(email='audit-meal@test.com', password='x')


@pytest.fixture
def recipe(db):
    return Recipe.objects.create(
        name='Audit Recipe',
        category='Cena',
        difficulty='Fácil',
        servings=1,
        calories=400,
        protein=Decimal('30'),
        carbs=Decimal('40'),
        fat=Decimal('12'),
        is_active=True,
    )


@pytest.mark.django_db
class TestAuditMiscompletedMealLogsCommand:
    def test_dry_run_reports_counts_and_does_not_modify(self, user, recipe):
        log = MealLog.objects.create(
            user=user,
            date=date(2026, 6, 1),
            meal_type='dinner',
            recipe=recipe,
            completed=True,
            calories=400,
            protein=30,
            carbs=40,
            fat=12,
        )
        out = StringIO()
        call_command('audit_miscompleted_meal_logs', stdout=out)
        log.refresh_from_db()
        assert log.completed is True
        assert int(log.calories) == 400
        text = out.getvalue()
        assert 'Total completed=true' in text
        assert 'Dry-run: 0 registros modificados' in text
        assert 'LIMITACIÓN' in text

    def test_apply_without_confirm_does_not_modify(self, user, recipe):
        log = MealLog.objects.create(
            user=user,
            date=date(2026, 6, 1),
            meal_type='dinner',
            recipe=recipe,
            completed=True,
            calories=400,
        )
        out = StringIO()
        call_command('audit_miscompleted_meal_logs', '--apply', stdout=out)
        log.refresh_from_db()
        assert log.completed is True
        assert 'Abortado' in out.getvalue()

    def test_apply_with_confirm_resets_only_ambiguous(self, user, recipe):
        ambiguous = MealLog.objects.create(
            user=user,
            date=date(2026, 6, 1),
            meal_type='dinner',
            recipe=recipe,
            completed=True,
            calories=400,
            notes='',
        )
        with_notes = MealLog.objects.create(
            user=user,
            date=date(2026, 6, 2),
            meal_type='lunch',
            recipe=recipe,
            completed=True,
            calories=500,
            notes='Comí fuera',
        )
        out = StringIO()
        call_command(
            'audit_miscompleted_meal_logs',
            '--apply',
            '--confirm-unsafe',
            stdout=out,
        )
        ambiguous.refresh_from_db()
        with_notes.refresh_from_db()
        assert ambiguous.completed is False
        assert int(ambiguous.calories or 0) == 0
        assert with_notes.completed is True
        assert 'APLICADO' in out.getvalue()
