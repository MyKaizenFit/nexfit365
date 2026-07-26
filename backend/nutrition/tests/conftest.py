"""Shared fixtures for nutrition app tests."""

import pytest
from django.contrib.auth import get_user_model

from nutrition.models import NutritionPlan

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="nutrition-conftest@test.com",
        password="testpass123",
    )


@pytest.fixture
def regular_user(user):
    return user


@pytest.fixture
def nutrition_plan(db, user):
    return NutritionPlan.objects.create(
        name="Plan de Prueba",
        user=user,
        daily_calories=2000,
        protein_grams=150,
        carbs_grams=250,
        fat_grams=60,
        is_active=True,
        is_template=False,
    )
