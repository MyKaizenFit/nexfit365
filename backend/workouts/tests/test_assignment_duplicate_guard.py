"""Guardas anti-clon accidental al asignar plantillas de entrenamiento."""
import threading
from concurrent.futures import ThreadPoolExecutor

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from rest_framework import status
from rest_framework.test import APIClient

from workouts.models import Exercise, WorkoutDay, WorkoutDayExercise, WorkoutProgram
from workouts.services import (
    DefaultWorkoutAssignmentService,
    TemplateAlreadyAssigned,
    extract_source_template_id,
)

User = get_user_model()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email='admin-assign-guard@test.com',
        password='testpass123',
        is_staff=True,
        is_superuser=True,
    )


@pytest.fixture
def member(db):
    return User.objects.create_user(
        email='member-assign-guard@test.com',
        password='testpass123',
    )


@pytest.fixture
def admin_client(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def exercise(db):
    return Exercise.objects.create(
        name='Squat Guard Test',
        category='strength',
        muscle_groups=['legs'],
        difficulty='beginner',
    )


def _make_template(name, exercise, *, duration_weeks=4):
    template = WorkoutProgram.objects.create(
        name=name,
        difficulty='beginner',
        goal='general_fitness',
        days_per_week=3,
        duration_weeks=duration_weeks,
        is_template=True,
        is_active=True,
    )
    day = WorkoutDay.objects.create(
        program=template,
        day_number=1,
        name='Dia 1',
        is_rest_day=False,
    )
    WorkoutDayExercise.objects.create(
        workout_day=day,
        exercise=exercise,
        sets=3,
        reps='10',
        order_index=1,
    )
    return template


@pytest.mark.django_db
class TestAssignmentDuplicateGuard:
    def test_first_assign_creates_program(self, admin_client, member, exercise):
        template = _make_template('Plantilla Primera', exercise)
        before = WorkoutProgram.objects.filter(user=member, is_template=False).count()

        response = admin_client.patch(
            f'/api/admin/workouts/programs/{template.id}/',
            {'assigned_user_ids': [member.id]},
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK, response.data
        assert len(response.data['created_user_program_ids']) == 1
        assert WorkoutProgram.objects.filter(user=member, is_template=False).count() == before + 1

        assigned = WorkoutProgram.objects.get(id=response.data['created_user_program_ids'][0])
        assert assigned.is_active is True
        assert extract_source_template_id(assigned.tags) == str(template.id)

    def test_same_template_without_force_does_not_clone(self, admin_client, member, exercise):
        template = _make_template('Plantilla Same', exercise)
        first = DefaultWorkoutAssignmentService(member).assign_from_default(template)
        assert first is not None
        before = WorkoutProgram.objects.filter(user=member, is_template=False).count()

        response = admin_client.patch(
            f'/api/admin/workouts/programs/{template.id}/',
            {'assigned_user_ids': [member.id]},
            format='json',
        )

        assert response.status_code == status.HTTP_409_CONFLICT
        assert response.data['code'] == 'template_already_assigned'
        assert response.data['active_program_id'] == str(first.id)
        assert WorkoutProgram.objects.filter(user=member, is_template=False).count() == before

        first.refresh_from_db()
        assert first.is_active is True

    def test_same_template_with_force_creates_new_copy(self, admin_client, member, exercise):
        template = _make_template('Plantilla Force', exercise)
        first = DefaultWorkoutAssignmentService(member).assign_from_default(template)
        before = WorkoutProgram.objects.filter(user=member, is_template=False).count()

        response = admin_client.patch(
            f'/api/admin/workouts/programs/{template.id}/',
            {'assigned_user_ids': [member.id], 'force_reassign': True},
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK, response.data
        assert len(response.data['created_user_program_ids']) == 1
        assert WorkoutProgram.objects.filter(user=member, is_template=False).count() == before + 1

        first.refresh_from_db()
        new_program = WorkoutProgram.objects.get(id=response.data['created_user_program_ids'][0])
        assert first.is_active is False
        assert new_program.is_active is True
        assert extract_source_template_id(new_program.tags) == str(template.id)
        assert WorkoutProgram.objects.filter(user=member, is_active=True).count() == 1

    def test_different_template_creates_new_copy(self, admin_client, member, exercise):
        template_a = _make_template('Plantilla A', exercise)
        template_b = _make_template('Plantilla B', exercise)
        first = DefaultWorkoutAssignmentService(member).assign_from_default(template_a)

        response = admin_client.patch(
            f'/api/admin/workouts/programs/{template_b.id}/',
            {'assigned_user_ids': [member.id]},
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK, response.data
        first.refresh_from_db()
        new_program = WorkoutProgram.objects.get(id=response.data['created_user_program_ids'][0])
        assert first.is_active is False
        assert new_program.is_active is True
        assert extract_source_template_id(new_program.tags) == str(template_b.id)
        assert WorkoutProgram.objects.filter(user=member, is_template=False).count() == 2

    def test_history_preserved_and_single_active(self, admin_client, member, exercise):
        template = _make_template('Plantilla History', exercise)
        first = DefaultWorkoutAssignmentService(member).assign_from_default(template)
        response = admin_client.patch(
            f'/api/admin/workouts/programs/{template.id}/',
            {'assigned_user_ids': [member.id], 'force_reassign': True},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert WorkoutProgram.objects.filter(user=member, is_template=False).count() == 2
        assert WorkoutProgram.objects.filter(user=member, is_active=True).count() == 1
        assert WorkoutProgram.objects.filter(pk=first.pk).exists()

    def test_normal_user_program_edit_does_not_clone(self, admin_client, member, exercise):
        template = _make_template('Plantilla Edit User', exercise)
        assigned = DefaultWorkoutAssignmentService(member).assign_from_default(template)
        before = WorkoutProgram.objects.filter(user=member, is_template=False).count()

        response = admin_client.patch(
            f'/api/admin/workouts/programs/{assigned.id}/',
            {
                'name': 'Programa editado',
                'assigned_user_ids': [member.id],
                'days': [
                    {
                        'day_number': 1,
                        'name': 'Dia editado',
                        'is_rest_day': False,
                        'exercises': [{'exercise_id': str(exercise.id), 'sets': 4, 'reps': '8'}],
                    }
                ],
            },
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK, response.data
        assert response.data.get('created_user_program_ids') == []
        assert WorkoutProgram.objects.filter(user=member, is_template=False).count() == before
        assigned.refresh_from_db()
        assert assigned.name == 'Programa editado'
        assert assigned.is_active is True

    def test_template_save_without_assigned_ids_does_not_clone(self, admin_client, member, exercise):
        template = _make_template('Plantilla Save Only', exercise)
        DefaultWorkoutAssignmentService(member).assign_from_default(template)
        before = WorkoutProgram.objects.filter(user=member, is_template=False).count()

        response = admin_client.patch(
            f'/api/admin/workouts/programs/{template.id}/',
            {'name': 'Plantilla renombrada', 'description': 'solo edicion'},
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK, response.data
        assert response.data.get('created_user_program_ids') == []
        assert WorkoutProgram.objects.filter(user=member, is_template=False).count() == before
        template.refresh_from_db()
        assert template.name == 'Plantilla renombrada'

    def test_template_save_with_assigned_ids_blocked_without_force(self, admin_client, member, exercise):
        template = _make_template('Plantilla Save Assign', exercise)
        first = DefaultWorkoutAssignmentService(member).assign_from_default(template)
        before = WorkoutProgram.objects.filter(user=member, is_template=False).count()

        response = admin_client.patch(
            f'/api/admin/workouts/programs/{template.id}/',
            {
                'name': 'Plantilla con assign accidental',
                'assigned_user_ids': [member.id],
            },
            format='json',
        )

        assert response.status_code == status.HTTP_409_CONFLICT
        assert response.data['code'] == 'template_already_assigned'
        assert WorkoutProgram.objects.filter(user=member, is_template=False).count() == before
        first.refresh_from_db()
        assert first.is_active is True

    def test_service_raises_template_already_assigned(self, member, exercise):
        template = _make_template('Plantilla Service', exercise)
        DefaultWorkoutAssignmentService(member).assign_from_default(template)
        with pytest.raises(TemplateAlreadyAssigned):
            DefaultWorkoutAssignmentService(member).assign_from_default(template)


@pytest.mark.django_db(transaction=True)
class TestConcurrentAssignmentGuard:
    def _require_postgres(self):
        if connection.vendor != 'postgresql':
            pytest.skip('select_for_update concurrency requires PostgreSQL (CI)')

    def test_concurrent_first_assigns_create_only_one(self, admin_user, member, exercise):
        self._require_postgres()
        template = _make_template('Plantilla Concurrent', exercise)
        barrier = threading.Barrier(2)
        results = []

        def _assign():
            client = APIClient()
            client.force_authenticate(user=admin_user)
            barrier.wait(timeout=10)
            response = client.patch(
                f'/api/admin/workouts/programs/{template.id}/',
                {'assigned_user_ids': [member.id]},
                format='json',
            )
            results.append((response.status_code, response.data))
            connection.close()

        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(_assign), pool.submit(_assign)]
            for future in futures:
                future.result(timeout=30)

        statuses = sorted(code for code, _ in results)
        assert statuses.count(status.HTTP_200_OK) == 1
        assert statuses.count(status.HTTP_409_CONFLICT) == 1
        assert WorkoutProgram.objects.filter(user=member, is_template=False).count() == 1
        assert WorkoutProgram.objects.filter(user=member, is_active=True).count() == 1

    def test_concurrent_force_reassign_creates_only_one(self, admin_user, member, exercise):
        self._require_postgres()
        template = _make_template('Plantilla Concurrent Force', exercise)
        first = DefaultWorkoutAssignmentService(member).assign_from_default(template)
        barrier = threading.Barrier(2)
        results = []

        def _force_assign():
            client = APIClient()
            client.force_authenticate(user=admin_user)
            barrier.wait(timeout=10)
            response = client.patch(
                f'/api/admin/workouts/programs/{template.id}/',
                {
                    'assigned_user_ids': [member.id],
                    'force_reassign': True,
                    'replace_active_program_id': str(first.id),
                },
                format='json',
            )
            results.append((response.status_code, response.data))
            connection.close()

        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(_force_assign), pool.submit(_force_assign)]
            for future in futures:
                future.result(timeout=30)

        statuses = sorted(code for code, _ in results)
        assert statuses.count(status.HTTP_200_OK) == 1
        assert statuses.count(status.HTTP_409_CONFLICT) == 1
        assert WorkoutProgram.objects.filter(user=member, is_active=True).count() == 1
        # original + one forced replacement
        assert WorkoutProgram.objects.filter(user=member, is_template=False).count() == 2
