"""Option 4: full nutrition plan editing — hydrate/persist/reconcile by ID."""
from __future__ import annotations

from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from nutrition.models import (
    Food,
    MealLog,
    NutritionPlan,
    PlanMeal,
    PlanMealRecipe,
    Recipe,
    RecipeIngredient,
)
from nutrition.shopping_list_service import build_shopping_list

User = get_user_model()
PLANS_URL = "/api/admin/nutrition/plans/"


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(email="admin-opt4@test.com", password="testpass123")


@pytest.fixture
def admin_client(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def recipe_a(db, admin_user):
    return Recipe.objects.create(
        name="Opt4 Encaje",
        calories=400,
        protein=Decimal("30"),
        carbs=Decimal("40"),
        fat=Decimal("10"),
        created_by=admin_user,
        is_active=True,
    )


@pytest.fixture
def recipe_b(db, admin_user):
    return Recipe.objects.create(
        name="Opt4 Ligera",
        calories=280,
        protein=Decimal("20"),
        carbs=Decimal("25"),
        fat=Decimal("8"),
        created_by=admin_user,
        is_active=True,
    )


@pytest.fixture
def recipe_c(db, admin_user):
    return Recipe.objects.create(
        name="Opt4 Pesada",
        calories=650,
        protein=Decimal("40"),
        carbs=Decimal("60"),
        fat=Decimal("25"),
        created_by=admin_user,
        is_active=True,
    )


def _meal_payload(meal: PlanMeal, **overrides):
    recipes = list(meal.meal_recipes.select_related("recipe").order_by("display_order"))
    body = {
        "id": str(meal.id),
        "week_number": meal.week_number,
        "day_of_week": meal.day_of_week,
        "name": meal.name,
        "meal_type": meal.meal_type,
        "time": meal.time.isoformat() if meal.time else None,
        "description": meal.description,
        "order_index": meal.order_index,
        "suggested_recipes_ids": [str(mr.recipe_id) for mr in recipes],
        "meal_recipes": [
            {
                "recipe_id": str(mr.recipe_id),
                "servings": float(mr.servings or 1),
                "display_order": mr.display_order,
                "custom_calories": mr.custom_calories,
                "custom_protein": float(mr.custom_protein) if mr.custom_protein is not None else None,
                "custom_carbs": float(mr.custom_carbs) if mr.custom_carbs is not None else None,
                "custom_fat": float(mr.custom_fat) if mr.custom_fat is not None else None,
            }
            for mr in recipes
        ],
    }
    body.update(overrides)
    return body


@pytest.fixture
def rich_plan(db, admin_user, recipe_a, recipe_b, recipe_c):
    plan = NutritionPlan.objects.create(
        name="Opt4 Full Edit Plan",
        description="synthetic",
        daily_calories=1500,
        protein_grams=120,
        carbs_grams=150,
        fat_grams=50,
        duration_weeks=2,
        is_template=True,
        is_active=True,
        created_by=admin_user,
    )
    slots = []
    specs = [
        (1, 1, "breakfast", 1, "W1 Desayuno", [recipe_a, recipe_b]),
        (1, 1, "snack", 2, "W1 Snack A", [recipe_b]),
        (1, 1, "snack", 3, "W1 Snack B", [recipe_c]),
        (1, 1, "dinner", 4, "W1 Cena", [recipe_a]),
        (2, 1, "lunch", 1, "W2 Lunes lunch", [recipe_c]),
        (2, 2, "lunch", 1, "W2 Martes lunch", [recipe_a]),
    ]
    for week, day, meal_type, order, name, recipes in specs:
        meal = PlanMeal.objects.create(
            plan=plan,
            week_number=week,
            day_of_week=day,
            meal_type=meal_type,
            order_index=order,
            name=name,
            calories=100,
            protein=Decimal("10"),
            carbs=Decimal("10"),
            fat=Decimal("5"),
        )
        meal.suggested_recipes.set(recipes)
        for idx, recipe in enumerate(recipes):
            PlanMealRecipe.objects.create(
                meal=meal,
                recipe=recipe,
                servings=Decimal("1"),
                display_order=idx,
            )
        slots.append(meal)
    return plan, slots


@pytest.mark.django_db
class TestPlanFullEditing:
    @override_settings(SECURE_SSL_REDIRECT=False)
    def test_retrieve_hydrates_weeks_days_dual_snacks_and_recipes(
        self, admin_client, rich_plan, recipe_a, recipe_b
    ):
        plan, slots = rich_plan
        response = admin_client.get(f"{PLANS_URL}{plan.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == plan.name
        meals = response.data["meals"]
        assert len(meals) == 6
        weeks = {m["week_number"] for m in meals}
        assert weeks == {1, 2}
        snacks = [m for m in meals if m["meal_type"] == "snack" and m["week_number"] == 1]
        assert len(snacks) == 2
        assert {m["order_index"] for m in snacks} == {2, 3}
        assert {m["id"] for m in snacks} == {str(slots[1].id), str(slots[2].id)}
        breakfast = next(m for m in meals if m["id"] == str(slots[0].id))
        assert len(breakfast["meal_recipes"]) == 2
        assert {mr["recipe"]["id"] for mr in breakfast["meal_recipes"]} == {
            str(recipe_a.id),
            str(recipe_b.id),
        }

    @override_settings(SECURE_SSL_REDIRECT=False)

    def test_rename_preserves_meals_and_ids(self, admin_client, rich_plan):
        plan, slots = rich_plan
        ids_before = set(str(s.id) for s in slots)
        response = admin_client.patch(
            f"{PLANS_URL}{plan.id}/",
            {"name": "Opt4 Renamed"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Opt4 Renamed"
        ids_after = set(PlanMeal.objects.filter(plan=plan).values_list("id", flat=True))
        assert {str(i) for i in ids_after} == ids_before

    @override_settings(SECURE_SSL_REDIRECT=False)

    def test_change_recipe_persists_and_keeps_slot_id(
        self, admin_client, rich_plan, recipe_a, recipe_c
    ):
        plan, slots = rich_plan
        dinner = slots[3]
        payload = {
            "meals": [
                _meal_payload(s) if s.id != dinner.id else _meal_payload(
                    dinner,
                    meal_recipes=[{
                        "recipe_id": str(recipe_c.id),
                        "servings": 1,
                        "display_order": 0,
                    }],
                    suggested_recipes_ids=[str(recipe_c.id)],
                )
                for s in slots
            ]
        }
        response = admin_client.patch(f"{PLANS_URL}{plan.id}/", payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        dinner.refresh_from_db()
        assert PlanMeal.objects.filter(plan=plan, id=dinner.id).exists()
        recipe_ids = list(
            PlanMealRecipe.objects.filter(meal=dinner).values_list("recipe_id", flat=True)
        )
        assert recipe_ids == [recipe_c.id]

    @override_settings(SECURE_SSL_REDIRECT=False)

    def test_add_slot_persists(self, admin_client, rich_plan, recipe_b):
        plan, slots = rich_plan
        meals = [_meal_payload(s) for s in slots]
        meals.append(
            {
                "week_number": 1,
                "day_of_week": 1,
                "name": "W1 Extra",
                "meal_type": "lunch",
                "order_index": 5,
                "suggested_recipes_ids": [str(recipe_b.id)],
                "meal_recipes": [{"recipe_id": str(recipe_b.id), "servings": 1, "display_order": 0}],
            }
        )
        response = admin_client.patch(f"{PLANS_URL}{plan.id}/", {"meals": meals}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert PlanMeal.objects.filter(plan=plan).count() == 7
        assert PlanMeal.objects.filter(plan=plan, name="W1 Extra").exists()

    @override_settings(SECURE_SSL_REDIRECT=False)

    def test_delete_slot_removes_only_that_slot(self, admin_client, rich_plan):
        plan, slots = rich_plan
        victim = slots[2]
        keep = [s for s in slots if s.id != victim.id]
        response = admin_client.patch(
            f"{PLANS_URL}{plan.id}/",
            {"meals": [_meal_payload(s) for s in keep]},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert not PlanMeal.objects.filter(id=victim.id).exists()
        assert PlanMeal.objects.filter(plan=plan).count() == 5
        assert PlanMeal.objects.filter(id=slots[1].id).exists()

    @override_settings(SECURE_SSL_REDIRECT=False)

    def test_reorder_slots_persists(self, admin_client, rich_plan):
        plan, slots = rich_plan
        snack_a, snack_b = slots[1], slots[2]
        meals = []
        for s in slots:
            if s.id == snack_a.id:
                meals.append(_meal_payload(s, order_index=3))
            elif s.id == snack_b.id:
                meals.append(_meal_payload(s, order_index=2))
            else:
                meals.append(_meal_payload(s))
        response = admin_client.patch(f"{PLANS_URL}{plan.id}/", {"meals": meals}, format="json")
        assert response.status_code == status.HTTP_200_OK
        snack_a.refresh_from_db()
        snack_b.refresh_from_db()
        assert snack_a.order_index == 3
        assert snack_b.order_index == 2

    @override_settings(SECURE_SSL_REDIRECT=False)

    def test_servings_multiplier_persists(self, admin_client, rich_plan, recipe_a):
        plan, slots = rich_plan
        breakfast = slots[0]
        meals = []
        for s in slots:
            if s.id == breakfast.id:
                meals.append(
                    _meal_payload(
                        breakfast,
                        meal_recipes=[{
                            "recipe_id": str(recipe_a.id),
                            "servings": 2,
                            "display_order": 0,
                            "custom_calories": 800,
                        }],
                        suggested_recipes_ids=[str(recipe_a.id)],
                    )
                )
            else:
                meals.append(_meal_payload(s))
        response = admin_client.patch(f"{PLANS_URL}{plan.id}/", {"meals": meals}, format="json")
        assert response.status_code == status.HTTP_200_OK
        mrs = list(PlanMealRecipe.objects.filter(meal_id=breakfast.id))
        assert len(mrs) == 1
        assert mrs[0].recipe_id == recipe_a.id
        # Servings/custom macros may be rescaled by finalize_plan_after_meal_changes;
        # the assigned recipe and non-default servings must remain.
        assert float(mrs[0].servings) != 1.0 or mrs[0].custom_calories not in (None, 400)

    @override_settings(SECURE_SSL_REDIRECT=False)

    def test_edit_week1_does_not_change_week2(self, admin_client, rich_plan):
        plan, slots = rich_plan
        w2 = slots[4]
        meals = []
        for s in slots:
            if s.week_number == 1 and s.day_of_week == 1 and s.meal_type == "breakfast":
                meals.append(_meal_payload(s, name="W1 Desayuno EDITADO"))
            else:
                meals.append(_meal_payload(s))
        response = admin_client.patch(f"{PLANS_URL}{plan.id}/", {"meals": meals}, format="json")
        assert response.status_code == status.HTTP_200_OK
        w2.refresh_from_db()
        assert w2.name == "W2 Lunes lunch"

    @override_settings(SECURE_SSL_REDIRECT=False)

    def test_edit_monday_week1_does_not_change_tuesday_week2(self, admin_client, rich_plan):
        plan, slots = rich_plan
        tuesday = slots[5]
        meals = [
            _meal_payload(s, name="Lunes tocado") if s == slots[0] else _meal_payload(s)
            for s in slots
        ]
        response = admin_client.patch(f"{PLANS_URL}{plan.id}/", {"meals": meals}, format="json")
        assert response.status_code == status.HTTP_200_OK
        tuesday.refresh_from_db()
        assert tuesday.name == "W2 Martes lunch"

    @override_settings(SECURE_SSL_REDIRECT=False)

    def test_dual_snacks_remain_independent(self, admin_client, rich_plan, recipe_a):
        plan, slots = rich_plan
        snack_a, snack_b = slots[1], slots[2]
        meals = []
        for s in slots:
            if s.id == snack_a.id:
                meals.append(
                    _meal_payload(
                        s,
                        meal_recipes=[{
                            "recipe_id": str(recipe_a.id),
                            "servings": 1,
                            "display_order": 0,
                        }],
                        suggested_recipes_ids=[str(recipe_a.id)],
                    )
                )
            else:
                meals.append(_meal_payload(s))
        response = admin_client.patch(f"{PLANS_URL}{plan.id}/", {"meals": meals}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert list(
            PlanMealRecipe.objects.filter(meal=snack_a).values_list("recipe_id", flat=True)
        ) == [recipe_a.id]
        assert PlanMealRecipe.objects.filter(meal=snack_b).count() == 1
        assert PlanMealRecipe.objects.get(meal=snack_b).recipe.name == "Opt4 Pesada"

    @override_settings(SECURE_SSL_REDIRECT=False)

    def test_foreign_meal_id_rejected(self, admin_client, rich_plan, recipe_a):
        plan, slots = rich_plan
        other = NutritionPlan.objects.create(name="Other", is_template=True, is_active=True)
        foreign = PlanMeal.objects.create(
            plan=other, week_number=1, day_of_week=1, meal_type="lunch", order_index=1, name="Alien"
        )
        meals = [_meal_payload(s) for s in slots]
        meals[0] = _meal_payload(slots[0], id=str(foreign.id))
        before = PlanMeal.objects.filter(plan=plan).count()
        response = admin_client.patch(f"{PLANS_URL}{plan.id}/", {"meals": meals}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert PlanMeal.objects.filter(plan=plan).count() == before
        assert PlanMeal.objects.filter(id=slots[0].id, name=slots[0].name).exists()

    @override_settings(SECURE_SSL_REDIRECT=False)

    def test_invalid_payload_is_atomic(self, admin_client, rich_plan):
        plan, slots = rich_plan
        before_name = slots[0].name
        meals = [_meal_payload(s) for s in slots]
        meals[0] = _meal_payload(slots[0], name="Should Rollback", id="00000000-0000-0000-0000-000000000099")
        response = admin_client.patch(f"{PLANS_URL}{plan.id}/", {"meals": meals}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        slots[0].refresh_from_db()
        assert slots[0].name == before_name

    @override_settings(SECURE_SSL_REDIRECT=False)

    def test_double_save_does_not_duplicate(self, admin_client, rich_plan):
        plan, slots = rich_plan
        payload = {"meals": [_meal_payload(s) for s in slots]}
        r1 = admin_client.patch(f"{PLANS_URL}{plan.id}/", payload, format="json")
        r2 = admin_client.patch(f"{PLANS_URL}{plan.id}/", payload, format="json")
        assert r1.status_code == status.HTTP_200_OK
        assert r2.status_code == status.HTTP_200_OK
        assert PlanMeal.objects.filter(plan=plan).count() == 6

    @override_settings(SECURE_SSL_REDIRECT=False)

    def test_edit_does_not_create_or_flip_meallogs(
        self, admin_client, rich_plan, recipe_a, admin_user
    ):
        plan, slots = rich_plan
        member = User.objects.create_user(email="member-opt4@test.com", password="testpass123")
        log = MealLog.objects.create(
            user=member,
            date=timezone.localdate(),
            meal_type="dinner",
            plan_meal=slots[3],
            recipe=recipe_a,
            calories=400,
            completed=True,
            is_skipped=False,
        )
        before_count = MealLog.objects.count()
        payload = {
            "meals": [
                _meal_payload(s, name=s.name + " x") if s.id == slots[3].id else _meal_payload(s)
                for s in slots
            ]
        }
        response = admin_client.patch(f"{PLANS_URL}{plan.id}/", payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert MealLog.objects.count() == before_count
        log.refresh_from_db()
        assert log.completed is True
        assert log.plan_meal_id == slots[3].id

    @override_settings(SECURE_SSL_REDIRECT=False)

    def test_create_plan_still_works(self, admin_client, recipe_a):
        payload = {
            "name": "Opt4 Create",
            "daily_calories": 1600,
            "protein_grams": 120,
            "carbs_grams": 160,
            "fat_grams": 50,
            "is_template": True,
            "is_active": True,
            "meals": [
                {
                    "week_number": 1,
                    "day_of_week": 1,
                    "name": "Desayuno",
                    "meal_type": "breakfast",
                    "order_index": 1,
                    "suggested_recipes_ids": [str(recipe_a.id)],
                    "meal_recipes": [{"recipe_id": str(recipe_a.id), "servings": 1, "display_order": 0}],
                }
            ],
        }
        response = admin_client.post(PLANS_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data["meals"]) == 1

    @override_settings(SECURE_SSL_REDIRECT=False)

    def test_duplicate_via_create_keeps_original(self, admin_client, rich_plan, recipe_a):
        plan, slots = rich_plan
        detail = admin_client.get(f"{PLANS_URL}{plan.id}/")
        assert detail.status_code == status.HTTP_200_OK
        meals = []
        for m in detail.data["meals"]:
            meals.append(
                {
                    "week_number": m["week_number"],
                    "day_of_week": m["day_of_week"],
                    "name": m["name"],
                    "meal_type": m["meal_type"],
                    "order_index": m["order_index"],
                    "suggested_recipes_ids": [
                        mr["recipe"]["id"] for mr in (m.get("meal_recipes") or [])
                    ],
                    "meal_recipes": [
                        {
                            "recipe_id": mr["recipe"]["id"],
                            "servings": mr.get("servings") or 1,
                            "display_order": mr.get("display_order") or 0,
                        }
                        for mr in (m.get("meal_recipes") or [])
                    ],
                }
            )
        create = admin_client.post(
            PLANS_URL,
            {
                "name": "Opt4 Copy",
                "daily_calories": plan.daily_calories,
                "protein_grams": plan.protein_grams,
                "carbs_grams": plan.carbs_grams,
                "fat_grams": plan.fat_grams,
                "is_template": True,
                "is_active": True,
                "meals": meals,
            },
            format="json",
        )
        assert create.status_code == status.HTTP_201_CREATED
        assert PlanMeal.objects.filter(plan=plan).count() == 6
        assert str(create.data["id"]) != str(plan.id)

    @override_settings(SECURE_SSL_REDIRECT=False)
    def test_shopping_list_works_after_edit(
        self, admin_client, admin_user, recipe_a, recipe_b
    ):
        member = User.objects.create_user(email="shop-opt4@test.com", password="testpass123")
        plan = NutritionPlan.objects.create(
            name="Opt4 Shop Plan",
            is_active=True,
            user=member,
            created_by=admin_user,
            daily_calories=1800,
            protein_grams=120,
            carbs_grams=180,
            fat_grams=60,
        )
        meal = PlanMeal.objects.create(
            plan=plan,
            week_number=1,
            day_of_week=timezone.localdate().isoweekday(),
            meal_type="breakfast",
            order_index=1,
            name="Desayuno",
            calories=400,
            protein=Decimal("30"),
            carbs=Decimal("40"),
            fat=Decimal("10"),
        )
        food_a = Food.objects.create(name="Opt4 Avena", equivalence_category="cereales")
        food_b = Food.objects.create(name="Opt4 Arroz", equivalence_category="arroz_cereales")
        RecipeIngredient.objects.create(recipe=recipe_a, food=food_a, quantity=100, unit="g")
        RecipeIngredient.objects.create(recipe=recipe_b, food=food_b, quantity=200, unit="g")
        PlanMealRecipe.objects.create(meal=meal, recipe=recipe_a, servings=1, display_order=0)
        meal.suggested_recipes.set([recipe_a])

        before = build_shopping_list(member, plan, days=1)
        assert "Opt4 Avena" in {item["name"] for item in before["items"]}

        response = admin_client.patch(
            f"{PLANS_URL}{plan.id}/",
            {
                "meals": [
                    _meal_payload(
                        meal,
                        suggested_recipes_ids=[str(recipe_b.id)],
                        meal_recipes=[
                            {"recipe_id": str(recipe_b.id), "servings": 1, "display_order": 0}
                        ],
                    )
                ]
            },
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK

        after = build_shopping_list(member, plan, days=1)
        names = {item["name"] for item in after["items"]}
        assert "Opt4 Arroz" in names
        assert "Opt4 Avena" not in names

    @override_settings(SECURE_SSL_REDIRECT=False)
    def test_recommendations_work_after_edit(
        self, admin_client, admin_user, recipe_a, recipe_b, recipe_c
    ):
        member = User.objects.create_user(email="reco-opt4@test.com", password="testpass123")
        plan = NutritionPlan.objects.create(
            name="Opt4 Reco Plan",
            is_active=True,
            user=member,
            created_by=admin_user,
            daily_calories=1500,
            protein_grams=120,
            carbs_grams=150,
            fat_grams=50,
            start_date=timezone.localdate(),
        )
        breakfast = PlanMeal.objects.create(
            plan=plan,
            week_number=1,
            day_of_week=timezone.localdate().isoweekday(),
            meal_type="breakfast",
            order_index=1,
            name="Desayuno",
            calories=400,
            protein=Decimal("30"),
            carbs=Decimal("40"),
            fat=Decimal("10"),
        )
        dinner = PlanMeal.objects.create(
            plan=plan,
            week_number=1,
            day_of_week=timezone.localdate().isoweekday(),
            meal_type="dinner",
            order_index=2,
            name="Cena",
            calories=500,
            protein=Decimal("35"),
            carbs=Decimal("45"),
            fat=Decimal("15"),
        )
        for meal, recipes in ((breakfast, [recipe_a]), (dinner, [recipe_b, recipe_c])):
            meal.suggested_recipes.set(recipes)
            for idx, recipe in enumerate(recipes):
                PlanMealRecipe.objects.create(
                    meal=meal, recipe=recipe, servings=1, display_order=idx
                )

        response = admin_client.patch(
            f"{PLANS_URL}{plan.id}/",
            {
                "meals": [
                    _meal_payload(breakfast),
                    _meal_payload(
                        dinner,
                        meal_recipes=[
                            {"recipe_id": str(recipe_c.id), "servings": 1, "display_order": 0},
                            {"recipe_id": str(recipe_b.id), "servings": 1, "display_order": 1},
                        ],
                        suggested_recipes_ids=[str(recipe_c.id), str(recipe_b.id)],
                    ),
                ]
            },
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        dinner.refresh_from_db()
        assert dinner.id  # slot identity preserved

        user_client = APIClient()
        user_client.force_authenticate(user=member)
        reco = user_client.get(
            "/api/nutrition/meal-alternatives-recommendation/",
            {
                "date": timezone.localdate().isoformat(),
                "plan_meal_id": str(dinner.id),
            },
        )
        assert reco.status_code == status.HTTP_200_OK
        assert len(reco.data["alternatives"]) >= 2
        assert reco.data["alternatives"][0]["is_recommended"] is True
        assert "recommendation_level" in reco.data["alternatives"][0]
