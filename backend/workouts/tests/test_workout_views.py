"""Tests para workouts/views.py - ExerciseViewSet, WorkoutProgramViewSet, WorkoutLogViewSet, WorkoutPlanTemplateViewSet"""
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from workouts.models import Exercise, WorkoutProgram, WorkoutDay, WorkoutLog
from django.utils import timezone

User = get_user_model()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def user(db):
    return User.objects.create_user(
        email='userviews@test.com',
        password='testpass123',
    )


@pytest.fixture
def user2(db):
    return User.objects.create_user(
        email='user2views@test.com',
        password='testpass123',
    )


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email='adminviews@test.com',
        password='testpass123',
        is_staff=True,
        is_superuser=True,
    )


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def auth_client2(user2):
    client = APIClient()
    client.force_authenticate(user=user2)
    return client


@pytest.fixture
def exercise(db):
    return Exercise.objects.create(
        name='Sentadilla',
        category='strength',
        muscle_groups=['quadriceps', 'glutes'],
        difficulty='intermediate',
        is_active=True,
    )


@pytest.fixture
def exercise2(db):
    return Exercise.objects.create(
        name='Dominadas',
        category='strength',
        muscle_groups=['back', 'biceps'],
        difficulty='intermediate',
        is_active=True,
    )


@pytest.fixture
def user_program(db, user):
    return WorkoutProgram.objects.create(
        name='Mi Programa',
        user=user,
        difficulty='beginner',
        goal='general_fitness',
        days_per_week=3,
        duration_weeks=4,
        is_active=True,
        is_template=False,
    )


@pytest.fixture
def template_program(db):
    return WorkoutProgram.objects.create(
        name='Plantilla Pública',
        is_template=True,
        is_system=True,
        is_active=True,
        difficulty='beginner',
        goal='general_fitness',
        days_per_week=3,
        duration_weeks=4,
    )


@pytest.fixture
def workout_day(db, user_program):
    return WorkoutDay.objects.create(
        program=user_program,
        name='Día 1',
        day_number=1,
        day_of_week='monday',
        order_index=1,
    )


@pytest.fixture
def workout_log(db, user, workout_day):
    return WorkoutLog.objects.create(
        user=user,
        workout_day=workout_day,
        date=timezone.localdate(),
        duration_minutes=45,
        completed=True,
    )


# ---------------------------------------------------------------------------
# ExerciseViewSet
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestExerciseViewSet:
    """Tests para el ViewSet de ejercicios"""

    def test_list_exercises_authenticated(self, auth_client, exercise):
        response = auth_client.get('/api/exercises/')
        assert response.status_code == status.HTTP_200_OK

    def test_list_exercises_unauthenticated(self, exercise):
        client = APIClient()
        response = client.get('/api/exercises/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_retrieve_exercise(self, auth_client, exercise):
        response = auth_client.get(f'/api/exercises/{exercise.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Sentadilla'

    def test_categories_action(self, auth_client, exercise):
        response = auth_client.get('/api/exercises/categories/')
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)
        assert len(response.data) > 0
        assert 'value' in response.data[0]
        assert 'label' in response.data[0]

    def test_muscle_groups_action(self, auth_client):
        response = auth_client.get('/api/exercises/muscle_groups/')
        assert response.status_code == status.HTTP_200_OK
        assert 'chest' in response.data
        assert 'back' in response.data

    def test_list_returns_active_only(self, auth_client):
        Exercise.objects.create(
            name='Ejercicio Inactivo', category='strength',
            muscle_groups=[], is_active=False,
        )
        Exercise.objects.create(
            name='Ejercicio Activo', category='strength',
            muscle_groups=[], is_active=True,
        )
        response = auth_client.get('/api/exercises/')
        assert response.status_code == status.HTTP_200_OK
        # La respuesta puede ser lista directa o paginada (con 'results')
        items = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        names = [e['name'] for e in items]
        assert 'Ejercicio Activo' in names
        assert 'Ejercicio Inactivo' not in names

    def test_search_exercises(self, auth_client, exercise):
        response = auth_client.get('/api/exercises/?search=Sentadilla')
        assert response.status_code == status.HTTP_200_OK

    def test_filter_by_category(self, auth_client, exercise):
        response = auth_client.get('/api/exercises/?category=strength')
        assert response.status_code == status.HTTP_200_OK
        items = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        for e in items:
            assert e['category'] == 'strength'


# ---------------------------------------------------------------------------
# WorkoutProgramViewSet
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestWorkoutProgramViewSet:
    """Tests para el ViewSet de programas de entrenamiento"""

    def test_list_programs_authenticated(self, auth_client, user_program):
        response = auth_client.get('/api/programs/')
        assert response.status_code == status.HTTP_200_OK

    def test_list_programs_unauthenticated(self, user_program):
        client = APIClient()
        response = client.get('/api/programs/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_my_programs_action(self, auth_client, user_program):
        response = auth_client.get('/api/programs/my_programs/')
        assert response.status_code == status.HTTP_200_OK
        items = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        assert len(items) == 1
        assert items[0]['name'] == 'Mi Programa'

    def test_my_programs_only_returns_own(self, auth_client, user2, user_program):
        # Programa de otro usuario — no debe aparecer
        WorkoutProgram.objects.create(
            name='Programa Otro Usuario',
            user=user2,
            is_active=True,
            is_template=False,
        )
        response = auth_client.get('/api/programs/my_programs/')
        assert response.status_code == status.HTTP_200_OK
        items = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        names = [p['name'] for p in items]
        assert 'Mi Programa' in names
        assert 'Programa Otro Usuario' not in names

    def test_my_active_program_with_program(self, auth_client, user_program):
        response = auth_client.get('/api/programs/my_active_program/')
        assert response.status_code == status.HTTP_200_OK
        assert 'program' in response.data

    def test_my_active_program_no_program(self, auth_client2):
        response = auth_client2.get('/api/programs/my_active_program/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['program'] is None

    def test_templates_action(self, auth_client, template_program):
        response = auth_client.get('/api/programs/templates/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_available_templates_action(self, auth_client, template_program):
        response = auth_client.get('/api/programs/available_templates/')
        assert response.status_code == status.HTTP_200_OK

    def test_activate_own_program(self, auth_client, user, user_program):
        # Crear otro programa activo
        other = WorkoutProgram.objects.create(
            name='Segundo Programa',
            user=user,
            is_active=True,
            is_template=False,
        )
        response = auth_client.post(f'/api/programs/{user_program.id}/activate/')
        assert response.status_code == status.HTTP_200_OK
        user_program.refresh_from_db()
        assert user_program.is_active is True

    def test_activate_other_users_program(self, auth_client, user2):
        other_program = WorkoutProgram.objects.create(
            name='Programa Ajeno',
            user=user2,
            is_active=True,
            is_template=False,
        )
        response = auth_client.post(f'/api/programs/{other_program.id}/activate/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_activate_template_not_allowed(self, auth_client, template_program):
        response = auth_client.post(f'/api/programs/{template_program.id}/activate/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ---------------------------------------------------------------------------
# WorkoutLogViewSet
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestWorkoutLogViewSet:
    """Tests para el ViewSet de logs de entrenamiento"""

    def test_list_logs(self, auth_client, workout_log):
        response = auth_client.get('/api/workout-logs/')
        assert response.status_code == status.HTTP_200_OK
        items = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        assert len(items) >= 1

    def test_list_logs_unauthenticated(self, workout_log):
        client = APIClient()
        response = client.get('/api/workout-logs/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_logs_only_own(self, auth_client, user2, workout_day):
        # Log de otro usuario no debe aparecer
        other_log = WorkoutLog.objects.create(
            user=user2,
            workout_day=workout_day,
            date='2024-03-01',
            duration_minutes=30,
        )
        response = auth_client.get('/api/workout-logs/')
        items = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        log_ids = [l['id'] for l in items]
        assert str(other_log.id) not in log_ids

    def test_create_log(self, auth_client, workout_day):
        data = {
            'workout_day': str(workout_day.id),
            'date': '2024-02-10',
            'duration_minutes': 50,
            'completed': True,
        }
        response = auth_client.post('/api/workout-logs/', data, format='json')
        assert response.status_code == status.HTTP_201_CREATED

    def test_today_action_no_log(self, auth_client):
        response = auth_client.get('/api/workout-logs/today/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['log'] is None

    def test_today_action_with_log(self, auth_client, workout_log):
        response = auth_client.get('/api/workout-logs/today/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['log'] is not None

    def test_week_action(self, auth_client, workout_log):
        response = auth_client.get('/api/workout-logs/week/')
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)

    def test_statistics_action(self, auth_client, workout_log):
        response = auth_client.get('/api/workout-logs/statistics/')
        assert response.status_code == status.HTTP_200_OK
        assert 'total_workouts' in response.data
        assert 'completed_this_week' in response.data
        assert 'weekly_goal' in response.data
        assert 'current_streak' in response.data
        assert 'estimated_1rm_prs' in response.data
        assert 'recommended_rest_seconds' in response.data

    def test_statistics_no_logs(self, auth_client2):
        response = auth_client2.get('/api/workout-logs/statistics/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['total_workouts'] == 0

    def test_check_today_no_workout_day(self, auth_client):
        response = auth_client.get('/api/workout-logs/check_today/')
        assert response.status_code == 400

    def test_check_today_with_workout_day(self, auth_client, workout_day):
        response = auth_client.get(f'/api/workout-logs/check_today/?workout_day={workout_day.id}')
        assert response.status_code == status.HTTP_200_OK
        assert 'is_completed' in response.data

    def test_check_today_invalid_workout_day(self, auth_client):
        import uuid
        fake_id = uuid.uuid4()
        response = auth_client.get(f'/api/workout-logs/check_today/?workout_day={fake_id}')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_completed'] is False


# ---------------------------------------------------------------------------
# WorkoutPlanTemplateViewSet
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestWorkoutPlanTemplateViewSet:
    """Tests para el ViewSet de plantillas de planes de entrenamiento"""

    def test_list_templates(self, auth_client, template_program):
        response = auth_client.get('/api/workout-plan-templates/')
        assert response.status_code == status.HTTP_200_OK
        assert 'results' in response.data
        assert 'count' in response.data

    def test_list_templates_pagination(self, auth_client, template_program):
        response = auth_client.get('/api/workout-plan-templates/?page=1&page_size=5')
        assert response.status_code == status.HTTP_200_OK
        assert 'total_pages' in response.data

    def test_retrieve_template(self, auth_client, template_program):
        response = auth_client.get(f'/api/workout-plan-templates/{template_program.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == template_program.name

    def test_create_template_authenticated(self, auth_client, exercise):
        data = {
            'name': 'Nueva Plantilla',
            'difficulty': 'beginner',
            'goal': 'general_fitness',
            'days_per_week': 3,
            'duration_weeks': 4,
        }
        response = auth_client.post('/api/workout-plan-templates/', data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        program = WorkoutProgram.objects.get(name='Nueva Plantilla')
        assert program.is_template is True

    def test_create_template_with_days(self, auth_client, exercise):
        data = {
            'name': 'Plantilla Con Días',
            'difficulty': 'intermediate',
            'goal': 'muscle_gain',
            'days_per_week': 4,
            'duration_weeks': 8,
            'days': [
                {
                    'day_number': 1,
                    'name': 'Pecho y Tríceps',
                    'exercises': [
                        {'exercise_id': str(exercise.id), 'sets': 4, 'reps': '8-10'},
                    ],
                },
                {
                    'day_number': 2,
                    'name': 'Descanso',
                    'is_rest_day': True,
                    'exercises': [],
                },
            ],
        }
        response = auth_client.post('/api/workout-plan-templates/', data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        program = WorkoutProgram.objects.get(name='Plantilla Con Días')
        assert program.days.count() == 2

    def test_requires_authentication(self, template_program):
        client = APIClient()
        response = client.get('/api/workout-plan-templates/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
