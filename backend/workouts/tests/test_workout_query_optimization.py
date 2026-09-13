"""Query-count and API-contract tests for workout backend query optimization."""
from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

import pytest

from workouts.models import (
    Exercise,
    ExerciseSubstitution,
    WorkoutDay,
    WorkoutDayExercise,
    WorkoutLog,
    WorkoutLogExercise,
    WorkoutLogSet,
    WorkoutProgram,
)

User = get_user_model()

PROGRAM_LIST_KEYS = {
    "id",
    "name",
    "description",
    "difficulty",
    "goal",
    "duration_weeks",
    "days_per_week",
    "estimated_duration_minutes",
    "is_system",
    "is_template",
    "is_active",
    "location",
    "days_count",
}

def _count_queries(fn):
    with CaptureQueriesContext(connection) as ctx:
        result = fn()
    return len(ctx.captured_queries), result, ctx.captured_queries


def _sql_mentions(queries, table):
    needle = table.lower()
    return any(needle in q["sql"].lower() for q in queries)


def _make_exercises(n=6):
    return [
        Exercise.objects.create(
            name=f"Ejercicio {i}",
            category="strength",
            muscle_groups=["chest"],
            difficulty="beginner",
            is_active=True,
        )
        for i in range(n)
    ]


def _fill_program(program, days=3, exercises_per_day=4, catalog=None, rest_day=False):
    catalog = catalog or _make_exercises(max(exercises_per_day, 4))
    for day_n in range(1, days + 1):
        day = WorkoutDay.objects.create(
            program=program,
            name=f"Día {day_n}",
            day_number=day_n,
            day_of_week="monday",
            order_index=day_n,
            is_rest_day=rest_day and day_n == days,
        )
        if day.is_rest_day:
            continue
        for idx in range(exercises_per_day):
            WorkoutDayExercise.objects.create(
                workout_day=day,
                exercise=catalog[idx % len(catalog)],
                sets=3,
                reps="10",
                order_index=idx + 1,
            )
    return program


def _create_user_program(user, name, catalog, days=3, exercises_per_day=4):
    program = WorkoutProgram.objects.create(
        name=name,
        user=user,
        difficulty="beginner",
        goal="general_fitness",
        days_per_week=days,
        duration_weeks=4,
        is_active=False,
        is_template=False,
    )
    _fill_program(program, days=days, exercises_per_day=exercises_per_day, catalog=catalog)
    return program


def _activate(programs):
    WorkoutProgram.objects.filter(pk__in=[p.pk for p in programs]).update(is_active=True)


def _payload_items(response):
    data = response.data
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and "results" in data:
        return data["results"]
    return data


@pytest.fixture
def user(db):
    return User.objects.create_user(email="queryopt@test.com", password="testpass123")


@pytest.fixture
def other_user(db):
    return User.objects.create_user(email="queryopt-other@test.com", password="testpass123")


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def catalog(db):
    exercises = _make_exercises(6)
    ExerciseSubstitution.objects.create(
        exercise=exercises[0],
        substitute=exercises[1],
        priority=1,
    )
    return exercises


@pytest.mark.django_db
def test_program_list_query_count_does_not_grow_with_programs(auth_client, user, catalog):
    one = _create_user_program(user, "Programa 0", catalog)
    _activate([one])

    def list_programs():
        response = auth_client.get("/api/programs/?page_size=100")
        assert response.status_code == 200
        return response

    n1, resp1, q1 = _count_queries(list_programs)
    extra = [_create_user_program(user, f"Programa {i}", catalog) for i in range(1, 20)]
    _activate([one, *extra])
    n20, resp20, q20 = _count_queries(list_programs)

    assert resp1.data["results"][0]["days_count"] == 3
    assert {item["days_count"] for item in resp20.data["results"] if not item["is_template"]} == {3}
    assert n20 <= n1 + 1
    assert not _sql_mentions(q1, "workouts_workoutdayexercise")
    assert not _sql_mentions(q20, "workouts_workoutdayexercise")
    assert not _sql_mentions(q20, "workouts_exercisesubstitution")
    assert set(resp20.data["results"][0]) == PROGRAM_LIST_KEYS


@pytest.mark.django_db
def test_my_programs_query_count_does_not_grow_with_programs(auth_client, user, other_user, catalog):
    programs = [_create_user_program(user, f"Programa {i}", catalog) for i in range(20)]
    _activate(programs)
    foreign = _create_user_program(other_user, "Ajeno", catalog)
    _activate([foreign])

    def mine():
        response = auth_client.get("/api/programs/my_programs/")
        assert response.status_code == 200
        return response

    n20, resp, queries = _count_queries(mine)
    items = _payload_items(resp)
    assert len(items) == 20
    assert all(item["days_count"] == 3 for item in items)
    assert "Ajeno" not in {item["name"] for item in items}

    WorkoutProgram.objects.filter(user=user).exclude(pk=programs[0].pk).update(is_active=False)
    n1, resp1, _ = _count_queries(mine)
    assert len(_payload_items(resp1)) == 1
    assert n20 <= n1 + 1
    assert not _sql_mentions(queries, "workouts_workoutdayexercise")


@pytest.mark.django_db
def test_available_templates_skips_deep_prefetch(auth_client, catalog):
    for i in range(5):
        tpl = WorkoutProgram.objects.create(
            name=f"Plantilla {i}",
            is_template=True,
            is_system=True,
            is_active=True,
            difficulty="beginner",
            goal="general_fitness",
            days_per_week=3,
            duration_weeks=4,
        )
        _fill_program(tpl, days=3, exercises_per_day=4, catalog=catalog)

    def fetch():
        response = auth_client.get("/api/programs/available_templates/")
        assert response.status_code == 200
        return response

    n5, resp, queries = _count_queries(fetch)
    items = _payload_items(resp)
    assert len(items) == 5
    assert all(item["days_count"] == 3 for item in items)
    assert all(set(item) == PROGRAM_LIST_KEYS for item in items)
    assert "days" not in items[0]
    assert not _sql_mentions(queries, "workouts_workoutdayexercise")
    assert not _sql_mentions(queries, "workouts_exercisesubstitution")

    for i in range(5, 20):
        tpl = WorkoutProgram.objects.create(
            name=f"Plantilla {i}",
            is_template=True,
            is_system=True,
            is_active=True,
            difficulty="beginner",
            goal="general_fitness",
            days_per_week=3,
            duration_weeks=4,
        )
        _fill_program(tpl, days=3, exercises_per_day=4, catalog=catalog)

    n20, resp20, _ = _count_queries(fetch)
    assert len(_payload_items(resp20)) == 20
    assert n20 <= n5 + 1


@pytest.mark.django_db
def test_templates_days_count_matches_available_templates(auth_client, catalog):
    tpl = WorkoutProgram.objects.create(
        name="Plantilla única",
        is_template=True,
        is_system=True,
        is_active=True,
        difficulty="beginner",
        goal="general_fitness",
        days_per_week=3,
        duration_weeks=4,
    )
    _fill_program(tpl, days=3, exercises_per_day=4, catalog=catalog, rest_day=True)

    templates = auth_client.get("/api/programs/templates/")
    available = auth_client.get("/api/programs/available_templates/")
    assert templates.status_code == 200
    assert available.status_code == 200
    t_item = _payload_items(templates)[0]
    a_item = _payload_items(available)[0]
    assert t_item["days_count"] == 3
    assert a_item["days_count"] == 3
    assert t_item["days_count"] == a_item["days_count"]


@pytest.mark.django_db
def test_days_count_is_exact_for_rest_and_empty_programs(auth_client, user, catalog):
    empty = WorkoutProgram.objects.create(
        name="Vacío",
        user=user,
        difficulty="beginner",
        goal="general_fitness",
        is_active=False,
        is_template=False,
    )
    with_rest = _create_user_program(user, "Con descanso", catalog, days=3)
    with_rest.days.filter(day_number=3).update(is_rest_day=True)
    _activate([empty, with_rest])

    response = auth_client.get("/api/programs/my_programs/")
    by_name = {item["name"]: item["days_count"] for item in _payload_items(response)}
    assert by_name["Vacío"] == 0
    assert by_name["Con descanso"] == 3


@pytest.mark.django_db
def test_active_program_keeps_full_tree_and_substitutes(auth_client, user, catalog):
    program = _create_user_program(user, "Activo", catalog)
    _activate([program])

    n, response, queries = _count_queries(
        lambda: auth_client.get("/api/programs/my_active_program/")
    )
    assert response.status_code == 200
    payload = response.data["program"]
    assert payload["name"] == "Activo"
    assert len(payload["days"]) == 3
    first_day = payload["days"][0]
    assert first_day["exercises"]
    assert first_day["total_exercises"] == len(first_day["exercises"])
    exercise = first_day["exercises"][0]["exercise"]
    substitutes = exercise["substitutes"]
    assert substitutes
    assert substitutes[0]["name"] == "Ejercicio 1"
    assert payload["total_days"] == 3
    assert payload["training_days"] == 3
    assert _sql_mentions(queries, "workouts_workoutdayexercise")
    assert n < 20


@pytest.mark.django_db
def test_program_retrieve_still_returns_nested_days(auth_client, user, catalog):
    program = _create_user_program(user, "Detalle", catalog)
    _activate([program])
    response = auth_client.get(f"/api/programs/{program.id}/")
    assert response.status_code == 200
    assert len(response.data["days"]) == 3
    assert response.data["days"][0]["exercises"]


@pytest.mark.django_db
def test_exercise_list_uses_prefetch_instead_of_n_plus_one(auth_client, catalog):
    def fetch():
        response = auth_client.get("/api/exercises/?page_size=100")
        assert response.status_code == 200
        return response

    n6, resp, queries = _count_queries(fetch)
    results = _payload_items(resp)
    with_subs = next(item for item in results if item["name"] == "Ejercicio 0")
    assert with_subs["substitutes"][0]["name"] == "Ejercicio 1"
    extra = [
        Exercise.objects.create(
            name=f"Extra {i}",
            category="strength",
            muscle_groups=["chest"],
            difficulty="beginner",
            is_active=True,
        )
        for i in range(14)
    ]
    for ex in extra:
        ExerciseSubstitution.objects.create(
            exercise=ex,
            substitute=catalog[1],
            priority=1,
        )
    n20, _, _ = _count_queries(fetch)
    assert n20 <= n6 + 2
    assert _sql_mentions(queries, "workouts_exercisesubstitution")


@pytest.mark.django_db
def test_log_list_query_count_does_not_grow_with_logs(auth_client, user, catalog):
    program = _create_user_program(user, "Logs", catalog)
    _activate([program])
    days = list(WorkoutDay.objects.filter(program=program))
    today = timezone.localdate()

    def make_log(day, offset):
        log = WorkoutLog.objects.create(
            user=user,
            workout_day=day,
            date=today.fromordinal(today.toordinal() - offset),
            completed=True,
            duration_minutes=40,
        )
        log_ex = WorkoutLogExercise.objects.create(
            workout_log=log,
            exercise=catalog[0],
            exercise_name=catalog[0].name,
            order_index=1,
        )
        WorkoutLogSet.objects.create(
            log_exercise=log_ex,
            set_number=1,
            reps=10,
            weight=20,
            rest_seconds=60,
        )
        return log

    make_log(days[0], 0)

    def fetch():
        response = auth_client.get("/api/workout-logs/?page_size=100")
        assert response.status_code == 200
        return response

    n1, resp1, _ = _count_queries(fetch)
    make_log(days[1], 1)
    make_log(days[2], 2)
    n3, resp3, queries = _count_queries(fetch)
    items = _payload_items(resp3)
    assert len(items) == 3
    assert items[0]["workout_day_name"]
    assert items[0]["log_exercises"][0]["sets"]
    assert n3 <= n1 + 1
    assert _sql_mentions(queries, "workouts_workoutlogexercise")


@pytest.mark.django_db
def test_check_today_batch_query_count_is_constant(auth_client, user, catalog):
    programs = [_create_user_program(user, f"Batch {i}", catalog, days=1) for i in range(20)]
    _activate(programs)
    day_ids = [str(day.id) for day in WorkoutDay.objects.filter(program__in=programs)]

    def fetch(ids):
        response = auth_client.get(
            "/api/workout-logs/check_today_batch/?workout_days=" + ",".join(ids)
        )
        assert response.status_code == 200
        return response

    n1, resp1, _ = _count_queries(lambda: fetch(day_ids[:1]))
    n5, _, _ = _count_queries(lambda: fetch(day_ids[:5]))
    n20, resp20, _ = _count_queries(lambda: fetch(day_ids))
    assert n1 == n5 == n20
    assert set(resp20.data["results"]) == set(day_ids)
    assert resp1.data["results"][day_ids[0]]["is_completed"] is False


@pytest.mark.django_db
def test_program_list_search_and_ordering_still_work(auth_client, user, catalog):
    alpha = _create_user_program(user, "Alpha fuerza", catalog)
    beta = _create_user_program(user, "Beta cardio", catalog)
    _activate([alpha, beta])

    search = auth_client.get("/api/programs/?search=Alpha")
    assert search.status_code == 200
    names = [item["name"] for item in search.data["results"]]
    assert names == ["Alpha fuerza"]

    ordered = auth_client.get("/api/programs/?ordering=name")
    assert ordered.status_code == 200
    ordered_names = [item["name"] for item in ordered.data["results"]]
    assert ordered_names[0] == "Alpha fuerza"
