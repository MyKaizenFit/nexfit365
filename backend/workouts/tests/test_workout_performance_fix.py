"""Integridad y rendimiento: copia bulk, week-scope, mutation ligera, N+1 substitutes."""
import pytest
from django.contrib.auth import get_user_model
from django.db import connection, reset_queries, transaction
from django.test.utils import CaptureQueriesContext, override_settings
from rest_framework.test import APIClient

from accounts.services import copy_template_days_to_user_program
from workouts.admin_serializers import (
    AdminWorkoutProgramMutationSerializer,
    AdminWorkoutProgramSerializer,
)
from workouts.models import (
    Exercise,
    ExerciseSubstitution,
    WorkoutDay,
    WorkoutDayExercise,
    WorkoutProgram,
)
from workouts.query_utils import program_days_prefetch
from workouts.serializers import WorkoutProgramSerializer
from workouts.services import DefaultWorkoutAssignmentService, prefetch_workout_program_with_days

User = get_user_model()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email="admin-perf@test.com",
        password="testpass123",
        is_staff=True,
        is_superuser=True,
    )


@pytest.fixture
def member(db):
    return User.objects.create_user(email="member-perf@test.com", password="testpass123")


@pytest.fixture
def admin_client(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def member_client(member):
    client = APIClient()
    client.force_authenticate(user=member)
    return client


def _make_exercises(n=3, prefix=None):
    import uuid as _uuid
    tag = prefix or _uuid.uuid4().hex[:8]
    exercises = []
    for i in range(n):
        ex = Exercise.objects.create(
            name=f"Ejercicio Perf {tag} {i}",
            category="strength",
            difficulty="beginner",
        )
        exercises.append(ex)
    # Sustitutos entre el primero y el resto
    for i, sub in enumerate(exercises[1:], start=1):
        ExerciseSubstitution.objects.create(
            exercise=exercises[0],
            substitute=sub,
            priority=i,
        )
    return exercises


def _build_multiweek_template(*, weeks=4, days_per_week=3, exercises_per_day=2, admin_user=None):
    exercises = _make_exercises(max(3, exercises_per_day))
    template = WorkoutProgram.objects.create(
        name="Plantilla Macrociclo Test",
        is_template=True,
        is_system=False,
        is_active=True,
        duration_weeks=weeks,
        days_per_week=days_per_week,
        difficulty="intermediate",
        goal="muscle_gain",
        created_by=admin_user,
    )
    for week in range(1, weeks + 1):
        for slot in range(1, days_per_week + 1):
            day_number = (week - 1) * 7 + slot
            day = WorkoutDay.objects.create(
                program=template,
                name=f"S{week} D{slot}",
                day_number=day_number,
                day_of_week=["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"][slot - 1],
                is_rest_day=False,
                order_index=day_number,
            )
            for ex_i in range(exercises_per_day):
                WorkoutDayExercise.objects.create(
                    workout_day=day,
                    exercise=exercises[ex_i % len(exercises)],
                    sets=3,
                    reps="10",
                    weight="20kg",
                    rest_seconds=60,
                    order_index=ex_i,
                    notes=f"n-{week}-{slot}-{ex_i}",
                )
    return template, exercises


@pytest.mark.django_db
def test_copy_template_preserves_integrity(admin_user, member):
    template, exercises = _build_multiweek_template(weeks=3, days_per_week=2, exercises_per_day=2, admin_user=admin_user)
    template_days = list(template.days.all().prefetch_related("exercises").order_by("day_number"))

    user_program = WorkoutProgram.objects.create(
        user=member,
        name="Copia usuario",
        is_template=False,
        is_active=True,
        duration_weeks=template.duration_weeks,
        days_per_week=template.days_per_week,
    )

    days_copied, ex_copied = copy_template_days_to_user_program(template_days, user_program)
    assert days_copied == template.days.count()
    assert ex_copied == WorkoutDayExercise.objects.filter(workout_day__program=template).count()

    src_days = list(template.days.order_by("day_number"))
    dst_days = list(user_program.days.order_by("day_number"))
    assert len(src_days) == len(dst_days)
    for src, dst in zip(src_days, dst_days):
        assert dst.day_number == src.day_number
        assert dst.is_rest_day == src.is_rest_day
        src_ex = list(src.exercises.order_by("order_index"))
        dst_ex = list(dst.exercises.order_by("order_index"))
        assert len(src_ex) == len(dst_ex)
        for se, de in zip(src_ex, dst_ex):
            assert de.exercise_id == se.exercise_id
            assert de.sets == se.sets
            assert de.reps == se.reps
            assert de.weight == se.weight
            assert de.rest_seconds == se.rest_seconds
            assert de.order_index == se.order_index
            assert de.notes == se.notes


@pytest.mark.django_db
def test_copy_template_rolls_back_on_failure(admin_user, member, monkeypatch):
    template, _ = _build_multiweek_template(weeks=2, days_per_week=2, exercises_per_day=1, admin_user=admin_user)
    template_days = list(template.days.all().prefetch_related("exercises").order_by("day_number"))
    user_program = WorkoutProgram.objects.create(
        user=member,
        name="Copia fail",
        is_template=False,
        is_active=True,
        duration_weeks=2,
        days_per_week=2,
    )

    original_bulk = WorkoutDayExercise.objects.bulk_create

    def boom(rows, *args, **kwargs):
        if rows:
            raise RuntimeError("forced failure")
        return original_bulk(rows, *args, **kwargs)

    monkeypatch.setattr(WorkoutDayExercise.objects, "bulk_create", boom)

    with pytest.raises(RuntimeError):
        copy_template_days_to_user_program(template_days, user_program)

    assert user_program.days.count() == 0
    assert WorkoutDayExercise.objects.filter(workout_day__program=user_program).count() == 0


@pytest.mark.django_db
@override_settings(DEBUG=True)
def test_substitutes_prefetch_avoids_n_plus_one(admin_user):
    template, _ = _build_multiweek_template(weeks=2, days_per_week=3, exercises_per_day=2, admin_user=admin_user)

    reset_queries()
    program = (
        WorkoutProgram.objects.filter(pk=template.pk)
        .prefetch_related(program_days_prefetch())
        .first()
    )
    data = AdminWorkoutProgramSerializer(program).data
    query_count = len(connection.queries)

    assert len(data["days"]) == 6
    # Baseline + days + exercises + substitutions should stay small (not 1 per exercise)
    assert query_count < 25, f"Too many queries: {query_count}"

    # Doubling weeks should not double substitute queries linearly into hundreds
    big, _ = _build_multiweek_template(weeks=4, days_per_week=3, exercises_per_day=2, admin_user=admin_user)
    reset_queries()
    program2 = (
        WorkoutProgram.objects.filter(pk=big.pk)
        .prefetch_related(program_days_prefetch())
        .first()
    )
    AdminWorkoutProgramSerializer(program2).data
    query_count2 = len(connection.queries)
    assert query_count2 < 30, f"Queries grew too much: {query_count2}"


@pytest.mark.django_db
def test_mutation_response_is_lightweight(admin_client, admin_user, member):
    template, _ = _build_multiweek_template(weeks=2, days_per_week=2, exercises_per_day=2, admin_user=admin_user)

    response = admin_client.patch(
        f"/api/admin/workouts/programs/{template.id}/",
        {"name": "Renombrada", "assigned_user_ids": [member.id]},
        format="json",
    )
    assert response.status_code == 200
    body = response.data
    assert body["id"] == str(template.id) or body["id"] == template.id
    assert "created_user_program_ids" in body
    assert body["created_user_program_ids"]
    # days stubs only — no nested exercises
    assert isinstance(body.get("days"), list)
    if body["days"]:
        assert "exercises" not in body["days"][0]
        assert "day_number" in body["days"][0]


@pytest.mark.django_db
def test_admin_retrieve_week_scoped(admin_client, admin_user):
    template, _ = _build_multiweek_template(weeks=4, days_per_week=3, exercises_per_day=1, admin_user=admin_user)

    response = admin_client.get(f"/api/admin/workouts/programs/{template.id}/?week=2")
    assert response.status_code == 200
    days = response.data["days"]
    assert response.data["loaded_week"] == 2
    assert len(days) == 3
    for day in days:
        assert 8 <= day["day_number"] <= 14

    bad = admin_client.get(f"/api/admin/workouts/programs/{template.id}/?week=0")
    assert bad.status_code == 400


@pytest.mark.django_db
def test_week_scoped_update_preserves_other_weeks(admin_client, admin_user):
    """Programa 52 semanas: editar semana 20 deja intactas 19 y 21."""
    template, exercises, n_days, _ = _build_large_template_bulk(
        weeks=52, days_per_week=2, exercises_per_day=1, admin_user=admin_user
    )
    assert n_days == 104
    # Semana 20 → day_number 134-135; 19 → 127-128; 21 → 141-142
    week19_nums = [127, 128]
    week20_nums = [134, 135]
    week21_nums = [141, 142]
    week20_days = list(template.days.filter(day_number__in=week20_nums).order_by("day_number"))
    week19_before = {
        d.day_number: list(d.exercises.values_list("exercise_id", "notes", "order_index"))
        for d in template.days.filter(day_number__in=week19_nums).order_by("day_number")
    }
    week21_before = {
        d.day_number: list(d.exercises.values_list("exercise_id", "notes", "order_index"))
        for d in template.days.filter(day_number__in=week21_nums).order_by("day_number")
    }

    new_ex = exercises[0]
    payload = {
        "days": [
            {
                "day_number": 134,
                "day_name": "Semana 20 modificada",
                "is_rest_day": False,
                "exercises": [
                    {"exercise_id": str(new_ex.id), "sets": 5, "reps": "5", "notes": "changed"}
                ],
            },
            {
                "day_number": 135,
                "day_name": week20_days[1].name,
                "is_rest_day": False,
                "exercises": [
                    {"exercise_id": str(new_ex.id), "sets": 4, "reps": "8", "notes": "changed-b"}
                ],
            },
        ],
    }
    response = admin_client.patch(
        f"/api/admin/workouts/programs/{template.id}/?week=20",
        payload,
        format="json",
    )
    assert response.status_code == 200

    template.refresh_from_db()
    assert template.days.count() == 104  # 52 weeks * 2 days

    day134 = template.days.get(day_number=134)
    assert day134.name == "Semana 20 modificada"
    assert day134.exercises.get().notes == "changed"
    assert day134.exercises.get().sets == 5

    week19_after = {
        d.day_number: list(d.exercises.values_list("exercise_id", "notes", "order_index"))
        for d in template.days.filter(day_number__in=week19_nums).order_by("day_number")
    }
    week21_after = {
        d.day_number: list(d.exercises.values_list("exercise_id", "notes", "order_index"))
        for d in template.days.filter(day_number__in=week21_nums).order_by("day_number")
    }
    assert week19_after == week19_before
    assert week21_after == week21_before


@pytest.mark.django_db
def test_my_active_program_defaults_to_current_week(member_client, member, admin_user):
    template, _ = _build_multiweek_template(weeks=4, days_per_week=2, exercises_per_day=1, admin_user=admin_user)
    assigned = DefaultWorkoutAssignmentService(member).assign_from_default(template, assigned_by=admin_user)
    assert assigned is not None

    response = member_client.get("/api/workout-programs/my_active_program/")
    assert response.status_code == 200
    program = response.data["program"]
    assert program is not None
    assert "loaded_week" in program
    # Solo días de una semana (≤7)
    assert len(program["days"]) <= 7
    assert program.get("days_count", 0) >= len(program["days"])

    week2 = member_client.get("/api/workout-programs/my_active_program/?week=2")
    assert week2.status_code == 200
    assert week2.data["program"]["loaded_week"] == 2
    for day in week2.data["program"]["days"]:
        assert 8 <= day["day_number"] <= 14


@pytest.mark.django_db
def test_mutation_serializer_omits_nested_exercises(admin_user):
    template, _ = _build_multiweek_template(weeks=2, days_per_week=2, exercises_per_day=2, admin_user=admin_user)
    data = AdminWorkoutProgramMutationSerializer(template).data
    assert "days" in data
    assert all("exercises" not in day for day in data["days"])
    full = AdminWorkoutProgramSerializer(
        prefetch_workout_program_with_days(template)
    ).data
    assert any(day.get("exercises") for day in full["days"])


def _build_large_template_bulk(*, weeks=52, days_per_week=7, exercises_per_day=4, admin_user=None):
    """Plantilla sintética grande (~365 días / ~1500 ejercicios) vía bulk_create."""
    import time as _time
    import uuid as _uuid
    from django.utils import timezone as tz

    tag = _uuid.uuid4().hex[:8]
    exercises = []
    for i in range(max(8, exercises_per_day + 2)):
        exercises.append(
            Exercise(
                id=_uuid.uuid4(),
                name=f"Bench Ex {tag} {i}",
                category="strength",
                difficulty="beginner",
                created_at=tz.now(),
                updated_at=tz.now(),
            )
        )
    Exercise.objects.bulk_create(exercises)
    ExerciseSubstitution.objects.bulk_create(
        [
            ExerciseSubstitution(
                id=_uuid.uuid4(),
                exercise=exercises[0],
                substitute=exercises[i],
                priority=i,
                created_at=tz.now(),
                updated_at=tz.now(),
            )
            for i in range(1, min(4, len(exercises)))
        ]
    )

    template = WorkoutProgram.objects.create(
        name=f"Bench Macro {tag}",
        is_template=True,
        is_system=False,
        is_active=True,
        duration_weeks=weeks,
        days_per_week=days_per_week,
        difficulty="intermediate",
        goal="muscle_gain",
        created_by=admin_user,
    )

    day_rows = []
    for week in range(1, weeks + 1):
        for slot in range(1, days_per_week + 1):
            day_number = (week - 1) * 7 + slot
            day_rows.append(
                WorkoutDay(
                    id=_uuid.uuid4(),
                    program=template,
                    name=f"S{week} D{slot}",
                    day_number=day_number,
                    day_of_week=["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"][
                        (slot - 1) % 7
                    ],
                    is_rest_day=False,
                    order_index=day_number,
                    created_at=tz.now(),
                    updated_at=tz.now(),
                )
            )
    WorkoutDay.objects.bulk_create(day_rows)

    ex_rows = []
    for day in day_rows:
        for ex_i in range(exercises_per_day):
            ex_rows.append(
                WorkoutDayExercise(
                    id=_uuid.uuid4(),
                    workout_day_id=day.id,
                    exercise_id=exercises[ex_i % len(exercises)].id,
                    sets=3,
                    reps="10",
                    weight="20kg",
                    rest_seconds=60,
                    order_index=ex_i,
                    created_at=tz.now(),
                    updated_at=tz.now(),
                )
            )
    WorkoutDayExercise.objects.bulk_create(ex_rows, batch_size=500)
    return template, exercises, len(day_rows), len(ex_rows)


@pytest.mark.django_db
@override_settings(DEBUG=True)
def test_benchmark_macrocycle_metrics(admin_user, member, admin_client, member_client, capsys):
    """Benchmark sintético ~52w/365d/~1500ex. Imprime métricas AFTER (código actual)."""
    import json
    import time

    template, _, n_days, n_ex = _build_large_template_bulk(
        weeks=52, days_per_week=7, exercises_per_day=4, admin_user=admin_user
    )
    assert n_days == 364
    assert n_ex == 1456

    # ASSIGN
    reset_queries()
    t0 = time.perf_counter()
    assigned = DefaultWorkoutAssignmentService(member).assign_from_default(
        template, assigned_by=admin_user
    )
    assign_time = time.perf_counter() - t0
    assign_queries = len(connection.queries)
    assert assigned is not None
    assert assigned.days.count() == n_days

    # ADMIN DETAIL full (compat) vs week-scoped
    reset_queries()
    t0 = time.perf_counter()
    full_prog = prefetch_workout_program_with_days(template)
    full_data = AdminWorkoutProgramSerializer(full_prog).data
    admin_full_time = time.perf_counter() - t0
    admin_full_queries = len(connection.queries)
    full_size = len(json.dumps(full_data, default=str))

    reset_queries()
    t0 = time.perf_counter()
    week_resp = admin_client.get(f"/api/admin/workouts/programs/{template.id}/?week=1")
    admin_week_time = time.perf_counter() - t0
    admin_week_queries = len(connection.queries)
    assert week_resp.status_code == 200
    week_size = len(json.dumps(week_resp.data, default=str))
    assert len(week_resp.data["days"]) == 7

    # MUTATION response size (lightweight)
    reset_queries()
    t0 = time.perf_counter()
    mut = admin_client.patch(
        f"/api/admin/workouts/programs/{template.id}/",
        {"name": template.name + " x"},
        format="json",
    )
    mut_time = time.perf_counter() - t0
    mut_queries = len(connection.queries)
    assert mut.status_code == 200
    mut_size = len(json.dumps(mut.data, default=str))
    assert "exercises" not in (mut.data.get("days") or [{}])[0]

    # MY ACTIVE (scoped)
    reset_queries()
    t0 = time.perf_counter()
    active = member_client.get("/api/workout-programs/my_active_program/")
    my_time = time.perf_counter() - t0
    my_queries = len(connection.queries)
    assert active.status_code == 200
    my_size = len(json.dumps(active.data, default=str))
    assert len(active.data["program"]["days"]) <= 7

    # SUBSTITUTES query budget on week serialize
    reset_queries()
    week_prog = prefetch_workout_program_with_days(template, week=1)
    AdminWorkoutProgramSerializer(week_prog).data
    sub_queries = len(connection.queries)

    report = {
        "days": n_days,
        "exercises": n_ex,
        "ASSIGN_TIME": round(assign_time, 3),
        "ASSIGN_QUERIES": assign_queries,
        "ADMIN_DETAIL_FULL_TIME": round(admin_full_time, 3),
        "ADMIN_DETAIL_FULL_QUERIES": admin_full_queries,
        "ADMIN_DETAIL_FULL_SIZE": full_size,
        "ADMIN_DETAIL_WEEK_TIME": round(admin_week_time, 3),
        "ADMIN_DETAIL_WEEK_QUERIES": admin_week_queries,
        "ADMIN_DETAIL_WEEK_SIZE": week_size,
        "MUTATION_TIME": round(mut_time, 3),
        "MUTATION_QUERIES": mut_queries,
        "MUTATION_SIZE": mut_size,
        "MY_ACTIVE_TIME": round(my_time, 3),
        "MY_ACTIVE_QUERIES": my_queries,
        "MY_ACTIVE_SIZE": my_size,
        "SUBSTITUTES_WEEK_QUERIES": sub_queries,
    }
    print("\nBENCHMARK_REPORT=" + json.dumps(report))

    # Guardrails: week path must be dramatically cheaper than full
    assert week_size < full_size / 10
    assert mut_size < full_size / 20
    assert my_size < full_size / 10
    assert assign_time < 30
    assert sub_queries < 40
