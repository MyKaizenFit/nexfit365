"""Tests para workouts/admin_views.py - AdminExerciseViewSet, AdminWorkoutProgramViewSet, y vistas de función admin"""
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from workouts.models import Exercise, WorkoutProgram, WorkoutDay, WorkoutDayExercise, WorkoutLog, ExerciseSubstitution
import uuid

User = get_user_model()


# ---------------------------------------------------------------------------
# Fixtures comunes
# ---------------------------------------------------------------------------

@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email='admin@test.com',
        password='testpass123',
        is_staff=True,
        is_superuser=True,
    )


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(
        email='user@test.com',
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
        name='Press de Banca',
        category='strength',
        muscle_groups=['chest', 'triceps'],
        difficulty='intermediate',
    )


@pytest.fixture
def exercise2(db):
    return Exercise.objects.create(
        name='Fondos en Paralelas',
        category='strength',
        muscle_groups=['chest', 'triceps'],
        difficulty='intermediate',
    )


@pytest.fixture
def workout_program(db, regular_user):
    return WorkoutProgram.objects.create(
        name='Programa Test',
        user=regular_user,
        difficulty='beginner',
        goal='general_fitness',
        days_per_week=3,
        duration_weeks=4,
    )


@pytest.fixture
def workout_log(db, regular_user, workout_program):
    day = WorkoutDay.objects.create(
        program=workout_program,
        name='Día 1',
        day_number=1,
        day_of_week='monday',
        order_index=1,
    )
    return WorkoutLog.objects.create(
        user=regular_user,
        workout_day=day,
        date='2024-01-15',
        duration_minutes=60,
        completed=True,
        exercises_data=[
            {
                'name': 'Press de Banca',
                'muscle_groups': ['chest'],
                'sets': [
                    {'reps': 10, 'weight': 80},
                    {'reps': 8, 'weight': 85},
                ],
            }
        ],
    )


# ---------------------------------------------------------------------------
# AdminExerciseViewSet (admin_views.AdminExerciseViewSet)
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestAdminExerciseViewSet:
    """Tests para CRUD de ejercicios desde el admin"""

    def test_list_exercises_admin(self, admin_client, exercise):
        response = admin_client.get('/api/admin/workouts/exercises/')
        assert response.status_code == status.HTTP_200_OK

    def test_list_exercises_requires_admin(self, regular_user, exercise):
        client = APIClient()
        client.force_authenticate(user=regular_user)
        response = client.get('/api/admin/workouts/exercises/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_exercises_unauthenticated(self, exercise):
        client = APIClient()
        response = client.get('/api/admin/workouts/exercises/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_retrieve_exercise(self, admin_client, exercise):
        response = admin_client.get(f'/api/admin/workouts/exercises/{exercise.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == exercise.name

    def test_create_exercise(self, admin_client):
        data = {
            'name': 'Nuevo Ejercicio',
            'category': 'cardio',
            'muscle_groups': ['legs'],
            'difficulty': 'beginner',
        }
        response = admin_client.post('/api/admin/workouts/exercises/', data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert Exercise.objects.filter(name='Nuevo Ejercicio').exists()

    def test_update_exercise(self, admin_client, exercise):
        response = admin_client.patch(
            f'/api/admin/workouts/exercises/{exercise.id}/',
            {'name': 'Press de Banca Modificado'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        exercise.refresh_from_db()
        assert exercise.name == 'Press de Banca Modificado'

    def test_delete_exercise(self, admin_client, exercise):
        exercise_id = str(exercise.id)
        response = admin_client.delete(f'/api/admin/workouts/exercises/{exercise_id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_add_substitute(self, admin_client, exercise, exercise2):
        response = admin_client.post(
            f'/api/admin/workouts/exercises/{exercise.id}/add_substitute/',
            {'substitute_id': str(exercise2.id), 'priority': 1},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert ExerciseSubstitution.objects.filter(exercise=exercise, substitute=exercise2).exists()

    def test_add_substitute_missing_id(self, admin_client, exercise):
        response = admin_client.post(
            f'/api/admin/workouts/exercises/{exercise.id}/add_substitute/',
            {},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_add_substitute_self_reference(self, admin_client, exercise):
        response = admin_client.post(
            f'/api/admin/workouts/exercises/{exercise.id}/add_substitute/',
            {'substitute_id': str(exercise.id)},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_remove_substitute(self, admin_client, exercise, exercise2):
        ExerciseSubstitution.objects.create(exercise=exercise, substitute=exercise2, priority=1)
        response = admin_client.post(
            f'/api/admin/workouts/exercises/{exercise.id}/remove_substitute/',
            {'substitute_id': str(exercise2.id)},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert not ExerciseSubstitution.objects.filter(exercise=exercise, substitute=exercise2).exists()

    def test_remove_substitute_missing_id(self, admin_client, exercise):
        response = admin_client.post(
            f'/api/admin/workouts/exercises/{exercise.id}/remove_substitute/',
            {},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_list_substitutes(self, admin_client, exercise, exercise2):
        ExerciseSubstitution.objects.create(exercise=exercise, substitute=exercise2, priority=1)
        response = admin_client.get(f'/api/admin/workouts/exercises/{exercise.id}/substitutes/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_list_substitutes_empty(self, admin_client, exercise):
        response = admin_client.get(f'/api/admin/workouts/exercises/{exercise.id}/substitutes/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data == []

    def test_add_substitute_updates_existing(self, admin_client, exercise, exercise2):
        """Si ya existe la sustitución, debe actualizar prioridad/notas"""
        ExerciseSubstitution.objects.create(exercise=exercise, substitute=exercise2, priority=1)
        response = admin_client.post(
            f'/api/admin/workouts/exercises/{exercise.id}/add_substitute/',
            {'substitute_id': str(exercise2.id), 'priority': 2, 'notes': 'Alternativa'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        sub = ExerciseSubstitution.objects.get(exercise=exercise, substitute=exercise2)
        assert sub.priority == 2


# ---------------------------------------------------------------------------
# AdminWorkoutProgramViewSet
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestAdminWorkoutProgramViewSet:
    """Tests para CRUD de programas de entrenamiento desde el admin"""

    def test_list_programs(self, admin_client, workout_program):
        response = admin_client.get('/api/admin/workouts/programs/')
        assert response.status_code == status.HTTP_200_OK
        assert 'results' in response.data

    def test_list_programs_pagination(self, admin_client, workout_program):
        response = admin_client.get('/api/admin/workouts/programs/?page=1&page_size=10')
        assert response.status_code == status.HTTP_200_OK
        assert 'count' in response.data
        assert 'total_pages' in response.data

    def test_retrieve_program(self, admin_client, workout_program):
        response = admin_client.get(f'/api/admin/workouts/programs/{workout_program.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == workout_program.name

    def test_create_program_template(self, admin_client):
        data = {
            'name': 'Plan Template Test',
            'difficulty': 'beginner',
            'goal': 'general_fitness',
            'days_per_week': 3,
            'duration_weeks': 4,
        }
        response = admin_client.post('/api/admin/workouts/programs/', data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert WorkoutProgram.objects.filter(name='Plan Template Test').exists()

    def test_create_program_for_user(self, admin_client, regular_user):
        data = {
            'name': 'Plan Usuario Test',
            'difficulty': 'beginner',
            'goal': 'general_fitness',
            'days_per_week': 3,
            'duration_weeks': 4,
            'user_id': regular_user.id,
        }
        response = admin_client.post('/api/admin/workouts/programs/', data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        program = WorkoutProgram.objects.get(name='Plan Usuario Test')
        assert program.user == regular_user
        assert program.is_template is False

    def test_create_program_with_days(self, admin_client, exercise):
        data = {
            'name': 'Plan Con Días',
            'difficulty': 'intermediate',
            'goal': 'muscle_gain',
            'days_per_week': 3,
            'duration_weeks': 8,
            'days': [
                {
                    'day_number': 1,
                    'name': 'Día 1 - Pecho',
                    'exercises': [
                        {
                            'exercise_id': str(exercise.id),
                            'sets': 3,
                            'reps': '10-12',
                        }
                    ],
                }
            ],
        }
        response = admin_client.post('/api/admin/workouts/programs/', data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        program = WorkoutProgram.objects.get(name='Plan Con Días')
        assert program.days.count() == 1

    def test_create_inactive_user_program_copy_with_days_keeps_original_active(self, admin_client, regular_user, exercise):
        original = WorkoutProgram.objects.create(
            name='Rutina Usuario Original',
            user=regular_user,
            difficulty='intermediate',
            goal='muscle_gain',
            days_per_week=3,
            duration_weeks=6,
            is_active=True,
        )
        original_day = WorkoutDay.objects.create(
            program=original,
            name='Día 1 - Fuerza',
            day_number=1,
            day_of_week='monday',
            order_index=1,
        )
        WorkoutDayExercise.objects.create(
            workout_day=original_day,
            exercise=exercise,
            sets=4,
            reps='8-10',
            weight='RPE 8',
            rest_seconds=90,
            order_index=1,
        )

        response = admin_client.post(
            '/api/admin/workouts/programs/',
            {
                'name': 'Rutina Usuario Original (Copia)',
                'difficulty': original.difficulty,
                'goal': original.goal,
                'days_per_week': original.days_per_week,
                'duration_weeks': original.duration_weeks,
                'estimated_duration_minutes': 60,
                'user': regular_user.id,
                'is_active': False,
                'days': [
                    {
                        'day_number': 1,
                        'day_of_week': 'monday',
                        'day_name': 'Día 1 - Fuerza',
                        'exercises': [
                            {
                                'exercise_id': str(exercise.id),
                                'sets': 4,
                                'reps': '8-10',
                                'weight': 'RPE 8',
                                'rest_time': 90,
                            }
                        ],
                    }
                ],
            },
            format='json',
        )

        assert response.status_code == status.HTTP_201_CREATED
        original.refresh_from_db()
        copy = WorkoutProgram.objects.get(name='Rutina Usuario Original (Copia)')
        assert original.is_active is True
        assert copy.user == regular_user
        assert copy.is_active is False
        assert copy.days.count() == 1
        assert copy.days.get().exercises.count() == 1

    def test_create_template_and_assign_to_multiple_users(self, admin_client, regular_user):
        other_user = User.objects.create_user(
            email='other-user@test.com',
            password='testpass123',
        )

        data = {
            'name': 'Plantilla Multiusuario',
            'difficulty': 'beginner',
            'goal': 'general_fitness',
            'days_per_week': 3,
            'duration_weeks': 4,
            'assigned_user_ids': [regular_user.id, other_user.id],
        }

        response = admin_client.post('/api/admin/workouts/programs/', data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data.get('assigned_user_ids') == [regular_user.id, other_user.id]
        assert len(response.data.get('created_user_program_ids', [])) == 2

        template = WorkoutProgram.objects.get(id=response.data['id'])
        assert template.user is None
        assert template.is_template is True

        assert WorkoutProgram.objects.filter(user=regular_user, is_active=True).exists()
        assert WorkoutProgram.objects.filter(user=other_user, is_active=True).exists()

    def test_assign_template_uses_real_training_days_for_user(self, admin_client, regular_user, exercise):
        old_plan = WorkoutProgram.objects.create(
            user=regular_user,
            name='Plan antiguo 3 dias',
            days_per_week=3,
            is_active=True,
            is_template=False,
        )

        data = {
            'name': 'Plantilla 4 dias reales',
            'difficulty': 'beginner',
            'goal': 'general_fitness',
            'days_per_week': 3,
            'duration_weeks': 4,
            'assigned_user_ids': [regular_user.id],
            'days': [
                {
                    'day_number': day_number,
                    'name': f'Dia {day_number}',
                    'is_rest_day': False,
                    'exercises': [{'exercise_id': str(exercise.id), 'sets': 3, 'reps': '10'}],
                }
                for day_number in range(1, 5)
            ],
        }

        response = admin_client.post('/api/admin/workouts/programs/', data, format='json')
        assert response.status_code == status.HTTP_201_CREATED

        assigned_id = response.data['created_user_program_ids'][0]
        assigned = WorkoutProgram.objects.get(id=assigned_id)
        assert assigned.days_per_week == 4
        assert assigned.training_days == 4
        assert assigned.is_active is True

        old_plan.refresh_from_db()
        regular_user.refresh_from_db()
        assert old_plan.is_active is False
        assert regular_user.training_days_per_week == 4

    def test_update_long_program_keeps_weekly_days_instead_of_total_sessions(self, admin_client, workout_program, exercise):
        days = [
            {
                'day_number': day_number,
                'name': f'Sesion {day_number}',
                'is_rest_day': False,
                'exercises': [{'exercise_id': str(exercise.id), 'sets': 3, 'reps': '10'}],
            }
            for day_number in range(1, 13)
        ]

        response = admin_client.patch(
            f'/api/admin/workouts/programs/{workout_program.id}/',
            {
                'days_per_week': 4,
                'days': days,
            },
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK
        workout_program.refresh_from_db()
        assert workout_program.days.count() == 12
        assert workout_program.days_per_week == 4

    def test_update_program(self, admin_client, workout_program):
        response = admin_client.patch(
            f'/api/admin/workouts/programs/{workout_program.id}/',
            {'name': 'Programa Actualizado'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        workout_program.refresh_from_db()
        assert workout_program.name == 'Programa Actualizado'

    def test_update_program_with_days(self, admin_client, workout_program, exercise):
        response = admin_client.put(
            f'/api/admin/workouts/programs/{workout_program.id}/',
            {
                'name': workout_program.name,
                'difficulty': 'advanced',
                'goal': 'strength',
                'days_per_week': 4,
                'duration_weeks': 12,
                'days': [
                    {
                        'day_number': 1,
                        'name': 'Día 1',
                        'exercises': [],
                    }
                ],
            },
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        workout_program.refresh_from_db()
        assert workout_program.days.count() == 1

    def test_update_program_response_returns_fresh_days(self, admin_client, workout_program, exercise):
        old_day = WorkoutDay.objects.create(
            program=workout_program,
            name='Día antiguo',
            day_number=1,
            day_of_week='monday',
            order_index=1,
        )
        WorkoutDayExercise.objects.create(
            workout_day=old_day,
            exercise=exercise,
            sets=2,
            reps='10',
            rest_seconds=60,
            order_index=1,
        )

        response = admin_client.patch(
            f'/api/admin/workouts/programs/{workout_program.id}/',
            {
                'days': [
                    {
                        'day_number': 1,
                        'day_of_week': 'monday',
                        'name': 'Día actualizado',
                        'exercises': [
                            {
                                'exercise_id': str(exercise.id),
                                'sets': 4,
                                'reps': '8-12',
                                'rest_seconds': 90,
                            }
                        ],
                    }
                ],
            },
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data['days'][0]['name'] == 'Día actualizado'
        assert response.data['days'][0]['exercises'][0]['sets'] == 4

        workout_program.refresh_from_db()
        fresh_day = workout_program.days.get()
        assert fresh_day.name == 'Día actualizado'
        assert fresh_day.exercises.get().sets == 4

    def test_update_program_accepts_manual_day_and_exercise_names(self, admin_client, workout_program):
        response = admin_client.patch(
            f'/api/admin/workouts/programs/{workout_program.id}/',
            {
                'days_per_week': 2,
                'days': [
                    {
                        'day_number': 2,
                        'day_of_week': 'tuesday',
                        'name': 'Día manual',
                        'exercises': [
                            {
                                'name': 'Hip thrust manual',
                                'sets': 3,
                                'reps': '2026-12-08 00:00:00',
                                'weight': 'RPE 7',
                                'rest_seconds': 90,
                            }
                        ],
                    }
                ],
            },
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK
        workout_program.refresh_from_db()
        day = workout_program.days.get()
        assert day.day_of_week == 'tuesday'
        day_exercise = day.exercises.select_related('exercise').get()
        assert day_exercise.exercise.name == 'Hip thrust manual'
        assert day_exercise.reps == '8-12'

    def test_update_program_and_assign_to_multiple_users(self, admin_client):
        user_a = User.objects.create_user(
            email='assign-a@test.com',
            password='testpass123',
        )
        user_b = User.objects.create_user(
            email='assign-b@test.com',
            password='testpass123',
        )

        program = WorkoutProgram.objects.create(
            name='Plantilla Editable',
            difficulty='beginner',
            goal='general_fitness',
            days_per_week=3,
            duration_weeks=4,
            is_template=True,
        )

        response = admin_client.patch(
            f'/api/admin/workouts/programs/{program.id}/',
            {
                'name': 'Plantilla Editable V2',
                'assigned_user_ids': [user_a.id, user_b.id],
            },
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data.get('assigned_user_ids') == [user_a.id, user_b.id]
        assert len(response.data.get('created_user_program_ids', [])) == 2

        assert WorkoutProgram.objects.filter(user=user_a, is_active=True).exists()
        assert WorkoutProgram.objects.filter(user=user_b, is_active=True).exists()

    def test_update_user_program_with_same_assigned_user_keeps_it_individual(self, admin_client, regular_user):
        program = WorkoutProgram.objects.create(
            name='Rutina Individual',
            user=regular_user,
            difficulty='beginner',
            goal='general_fitness',
            days_per_week=3,
            duration_weeks=4,
            is_template=False,
            is_system=False,
        )

        response = admin_client.patch(
            f'/api/admin/workouts/programs/{program.id}/',
            {
                'name': 'Rutina Individual Editada',
                'assigned_user_ids': [regular_user.id],
            },
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK
        program.refresh_from_db()
        assert program.name == 'Rutina Individual Editada'
        assert program.user == regular_user
        assert program.is_template is False
        assert program.is_system is False
        assert response.data.get('created_user_program_ids') == []

    def test_delete_program(self, admin_client, workout_program):
        program_id = str(workout_program.id)
        response = admin_client.delete(f'/api/admin/workouts/programs/{program_id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_requires_admin(self, regular_user, workout_program):
        client = APIClient()
        client.force_authenticate(user=regular_user)
        response = client.get('/api/admin/workouts/programs/')
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ---------------------------------------------------------------------------
# AdminWorkoutDayViewSet
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestAdminWorkoutDayViewSet:
    """Tests para CRUD de días de entrenamiento"""

    def test_list_days(self, admin_client, workout_program):
        WorkoutDay.objects.create(
            program=workout_program, name='Día 1', day_number=1,
            day_of_week='monday', order_index=1,
        )
        response = admin_client.get('/api/admin/workouts/days/')
        assert response.status_code == status.HTTP_200_OK

    def test_create_day(self, admin_client, workout_program):
        data = {
            'program': str(workout_program.id),
            'name': 'Día 2',
            'day_number': 2,
            'day_of_week': 'tuesday',
            'order_index': 2,
        }
        response = admin_client.post('/api/admin/workouts/days/', data, format='json')
        assert response.status_code == status.HTTP_201_CREATED

    def test_delete_day(self, admin_client, workout_program):
        day = WorkoutDay.objects.create(
            program=workout_program, name='Día A', day_number=3,
            day_of_week='wednesday', order_index=3,
        )
        response = admin_client.delete(f'/api/admin/workouts/days/{day.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT


# ---------------------------------------------------------------------------
# admin_user_program function view
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestAdminUserProgram:
    """Tests para endpoint admin GET /api/admin/workouts/users/{id}/program/"""

    def test_get_user_program(self, admin_client, regular_user, workout_program):
        response = admin_client.get(f'/api/admin/workouts/users/{regular_user.id}/program/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['user_id'] == regular_user.id
        assert response.data['program']['id'] == str(workout_program.id)

    def test_get_user_program_no_program(self, admin_client, regular_user):
        response = admin_client.get(f'/api/admin/workouts/users/{regular_user.id}/program/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['program'] is None

    def test_get_user_program_user_not_found(self, admin_client):
        response = admin_client.get('/api/admin/workouts/users/99999/program/')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_user_program_prefers_assigned_template_over_default_config(
        self, admin_client, regular_user, exercise
    ):
        from dashboard.models import DefaultPlanConfiguration
        from workouts.services import build_assigned_program_tags

        assigned_template = WorkoutProgram.objects.create(
            name="Plantilla Asignada Premium",
            is_template=True,
            is_active=True,
            days_per_week=3,
        )
        WorkoutDay.objects.create(
            program=assigned_template,
            name="Día plantilla asignada",
            day_number=1,
            day_of_week="monday",
        )

        default_template = WorkoutProgram.objects.create(
            name="Plantilla Config Defecto",
            is_template=True,
            is_active=True,
            days_per_week=3,
        )
        DefaultPlanConfiguration.objects.create(
            name="Config test",
            priority=1,
            is_active=True,
            default_workout_program=default_template,
        )

        user_program = WorkoutProgram.objects.create(
            user=regular_user,
            name=f"{assigned_template.name} - {regular_user.first_name}",
            is_template=False,
            is_active=True,
            tags=build_assigned_program_tags(assigned_template),
        )

        response = admin_client.get(f'/api/admin/workouts/users/{regular_user.id}/program/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['program']['id'] == str(user_program.id)
        assert response.data['reference_program']['id'] == str(assigned_template.id)
        assert response.data['reference_program_source'] == 'assigned_template'

    def test_requires_admin(self, regular_user):
        client = APIClient()
        client.force_authenticate(user=regular_user)
        response = client.get(f'/api/admin/workouts/users/{regular_user.id}/program/')
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ---------------------------------------------------------------------------
# admin_user_workout_logs function view
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestAdminUserWorkoutLogs:
    """Tests para endpoint admin GET /api/admin/workouts/users/{id}/workout-logs/"""

    def test_get_workout_logs(self, admin_client, regular_user, workout_log):
        response = admin_client.get(f'/api/admin/workouts/users/{regular_user.id}/workout-logs/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert 'totals' in response.data
        assert 'logs' in response.data

    def test_get_workout_logs_empty(self, admin_client, regular_user):
        response = admin_client.get(f'/api/admin/workouts/users/{regular_user.id}/workout-logs/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 0

    def test_filter_by_date_range(self, admin_client, regular_user, workout_log):
        response = admin_client.get(
            f'/api/admin/workouts/users/{regular_user.id}/workout-logs/'
            '?start_date=2024-01-01&end_date=2024-01-31'
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1

    def test_filter_excludes_out_of_range(self, admin_client, regular_user, workout_log):
        response = admin_client.get(
            f'/api/admin/workouts/users/{regular_user.id}/workout-logs/'
            '?start_date=2023-01-01&end_date=2023-12-31'
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 0

    def test_limit_parameter(self, admin_client, regular_user, workout_log):
        response = admin_client.get(
            f'/api/admin/workouts/users/{regular_user.id}/workout-logs/?limit=1'
        )
        assert response.status_code == status.HTTP_200_OK

    def test_user_not_found(self, admin_client):
        response = admin_client.get('/api/admin/workouts/users/99999/workout-logs/')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_requires_admin(self, regular_user, workout_log):
        client = APIClient()
        client.force_authenticate(user=regular_user)
        response = client.get(f'/api/admin/workouts/users/{regular_user.id}/workout-logs/')
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ---------------------------------------------------------------------------
# admin_user_workout_stats function view
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestAdminUserWorkoutStats:
    """Tests para endpoint GET /api/admin/workouts/users/{id}/workout-stats/"""

    def test_get_workout_stats(self, admin_client, regular_user, workout_log):
        response = admin_client.get(f'/api/admin/workouts/users/{regular_user.id}/workout-stats/')
        assert response.status_code == status.HTTP_200_OK
        assert 'total_logs' in response.data
        assert 'totals' in response.data
        assert 'top_exercises' in response.data
        assert 'streaks' in response.data
        assert 'weekly_volume' in response.data

    def test_get_workout_stats_no_logs(self, admin_client, regular_user):
        response = admin_client.get(f'/api/admin/workouts/users/{regular_user.id}/workout-stats/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['total_logs'] == 0

    def test_user_not_found(self, admin_client):
        response = admin_client.get('/api/admin/workouts/users/99999/workout-stats/')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_requires_admin(self, regular_user):
        client = APIClient()
        client.force_authenticate(user=regular_user)
        response = client.get(f'/api/admin/workouts/users/{regular_user.id}/workout-stats/')
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ---------------------------------------------------------------------------
# admin_user_workout_log_detail function view
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestAdminUserWorkoutLogDetail:
    """Tests para endpoint PATCH/DELETE /api/admin/workouts/users/{id}/workout-logs/{log_id}/"""

    def test_patch_workout_log(self, admin_client, regular_user, workout_log):
        response = admin_client.patch(
            f'/api/admin/workouts/users/{regular_user.id}/workout-logs/{workout_log.id}/',
            {'duration_minutes': 75},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        workout_log.refresh_from_db()
        assert workout_log.duration_minutes == 75

    def test_delete_workout_log(self, admin_client, regular_user, workout_log):
        log_id = str(workout_log.id)
        response = admin_client.delete(
            f'/api/admin/workouts/users/{regular_user.id}/workout-logs/{log_id}/'
        )
        assert response.status_code == 204
        assert not WorkoutLog.objects.filter(id=log_id).exists()

    def test_log_not_found(self, admin_client, regular_user):
        fake_id = uuid.uuid4()
        response = admin_client.patch(
            f'/api/admin/workouts/users/{regular_user.id}/workout-logs/{fake_id}/',
            {'duration_minutes': 75},
            format='json',
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_requires_admin(self, regular_user, workout_log):
        client = APIClient()
        client.force_authenticate(user=regular_user)
        response = client.patch(
            f'/api/admin/workouts/users/{regular_user.id}/workout-logs/{workout_log.id}/',
            {'duration_minutes': 75},
            format='json',
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
