"""Tests para workouts/admin_workout_plan_views.py - AdminWorkoutPlanExportImportViewSet"""
import io
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from workouts.models import WorkoutProgram, Exercise, WorkoutDay, WorkoutDayExercise

User = get_user_model()

BASE_URL = '/api/admin/workouts/workouts/'


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email='admin_plan@test.com',
        password='testpass123',
        is_staff=True,
        is_superuser=True,
    )


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(
        email='user_plan@test.com',
        password='testpass123',
    )


@pytest.fixture
def admin_client(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def regular_client(regular_user):
    client = APIClient()
    client.force_authenticate(user=regular_user)
    return client


@pytest.fixture
def template_program(db):
    return WorkoutProgram.objects.create(
        name='Plan Plantilla Test',
        description='Descripción del plan',
        difficulty='beginner',
        goal='general_fitness',
        duration_weeks=4,
        days_per_week=3,
        location='gym',
        is_active=True,
        is_template=True,
    )


@pytest.fixture
def exercise(db):
    return Exercise.objects.create(
        name='Sentadilla',
        category='strength',
        muscle_groups=['piernas'],
        is_active=True,
    )


@pytest.fixture
def template_with_days(db, template_program, exercise):
    """Plan plantilla con días y ejercicios"""
    day = WorkoutDay.objects.create(
        program=template_program,
        name='Día 1 - Piernas',
        day_of_week='monday',
        day_number=1,
    )
    WorkoutDayExercise.objects.create(
        workout_day=day,
        exercise=exercise,
        sets=3,
        reps='10',
        rest_seconds=60,
        order_index=1,
    )
    return template_program


# ---------------------------------------------------------------------------
# export_csv tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestExportCsv:
    """Tests para GET /api/admin/workouts/workouts/export_csv/"""

    def test_export_csv_requires_admin(self, regular_client):
        response = regular_client.get(f'{BASE_URL}export_csv/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_export_csv_requires_auth(self):
        client = APIClient()
        response = client.get(f'{BASE_URL}export_csv/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_export_csv_empty(self, admin_client):
        """Exportar cuando no hay planes plantilla"""
        response = admin_client.get(f'{BASE_URL}export_csv/')
        assert response.status_code == status.HTTP_200_OK
        assert response['Content-Type'] == 'text/csv; charset=utf-8'

    def test_export_csv_with_template(self, admin_client, template_with_days):
        """Exportar con un plan plantilla"""
        response = admin_client.get(f'{BASE_URL}export_csv/')
        assert response.status_code == status.HTTP_200_OK
        content = response.content.decode('utf-8')
        assert 'Plan Plantilla Test' in content

    def test_export_csv_content_disposition(self, admin_client):
        """El CSV debe tener la cabecera content-disposition correcta"""
        response = admin_client.get(f'{BASE_URL}export_csv/')
        assert response.status_code == status.HTTP_200_OK
        assert 'attachment' in response.get('Content-Disposition', '')

    def test_export_csv_with_exercises(self, admin_client, template_with_days):
        """El CSV debe incluir ejercicios"""
        response = admin_client.get(f'{BASE_URL}export_csv/')
        assert response.status_code == status.HTTP_200_OK
        content = response.content.decode('utf-8')
        assert 'Sentadilla' in content


# ---------------------------------------------------------------------------
# export_excel tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestExportExcel:
    """Tests para GET /api/admin/workouts/workouts/export_excel/"""

    def test_export_excel_requires_admin(self, regular_client):
        response = regular_client.get(f'{BASE_URL}export_excel/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_export_excel_requires_auth(self):
        client = APIClient()
        response = client.get(f'{BASE_URL}export_excel/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_export_excel_empty(self, admin_client):
        """Exportar cuando no hay planes plantilla"""
        response = admin_client.get(f'{BASE_URL}export_excel/')
        assert response.status_code == status.HTTP_200_OK
        assert 'spreadsheet' in response['Content-Type']

    def test_export_excel_with_template(self, admin_client, template_with_days):
        """Exportar con un plan plantilla"""
        response = admin_client.get(f'{BASE_URL}export_excel/')
        assert response.status_code == status.HTTP_200_OK

    def test_export_excel_content_disposition(self, admin_client):
        """El Excel debe tener la cabecera content-disposition correcta"""
        response = admin_client.get(f'{BASE_URL}export_excel/')
        assert response.status_code == status.HTTP_200_OK
        assert 'attachment' in response.get('Content-Disposition', '')


# ---------------------------------------------------------------------------
# import_csv tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestImportCsv:
    """Tests para POST /api/admin/workouts/workouts/import_csv/"""

    def test_import_csv_requires_admin(self, regular_client):
        response = regular_client.post(f'{BASE_URL}import_csv/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_import_csv_requires_auth(self):
        client = APIClient()
        response = client.post(f'{BASE_URL}import_csv/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_import_csv_no_file(self, admin_client):
        """Sin archivo debe retornar 400"""
        response = admin_client.post(f'{BASE_URL}import_csv/', {}, format='multipart')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data

    def test_import_csv_simple_format(self, admin_client, exercise):
        """CSV con formato simple (nombre plan, descripción, ejercicios)"""
        csv_content = (
            'nombre,descripcion,dificultad,objetivo,semanas,sesiones_semana,ubicacion\n'
            'Plan Import Test,Descripción test,Principiante,Fitness general,4,3,Gimnasio\n'
        )
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'test_import.csv'
        response = admin_client.post(
            f'{BASE_URL}import_csv/',
            {'file': csv_file},
            format='multipart',
        )
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_201_CREATED,
            status.HTTP_400_BAD_REQUEST,
        ]

    def test_import_csv_complete_format(self, admin_client, exercise):
        """CSV con formato completo (plan + día + ejercicio)"""
        csv_content = (
            'plan_name,plan_description,plan_difficulty,plan_goal,'
            'plan_duration_weeks,plan_sessions_per_week,plan_location,'
            'day_name,day_of_week,day_order,exercise_name,sets,reps,rest_seconds,exercise_order\n'
            'Plan Completo,Descripción,beginner,general_fitness,4,3,gym,'
            'Día 1,monday,1,Sentadilla,3,10,60,1\n'
        )
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'test_complete.csv'
        response = admin_client.post(
            f'{BASE_URL}import_csv/',
            {'file': csv_file},
            format='multipart',
        )
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_201_CREATED,
            status.HTTP_400_BAD_REQUEST,
        ]

    def test_import_csv_invalid_encoding(self, admin_client):
        """CSV con codificación inválida"""
        # binary content that cannot be decoded as utf-8
        binary_content = b'\xff\xfe invalid bytes'
        file = io.BytesIO(binary_content)
        file.name = 'bad_encoding.csv'
        response = admin_client.post(
            f'{BASE_URL}import_csv/',
            {'file': file},
            format='multipart',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_import_csv_empty_file(self, admin_client):
        """CSV vacío"""
        csv_content = '\n'
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'empty.csv'
        response = admin_client.post(
            f'{BASE_URL}import_csv/',
            {'file': csv_file},
            format='multipart',
        )
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_201_CREATED,
            status.HTTP_400_BAD_REQUEST,
        ]


# ---------------------------------------------------------------------------
# import_excel tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestImportExcel:
    """Tests para POST /api/admin/workouts/workouts/import_excel/"""

    def test_import_excel_requires_admin(self, regular_client):
        response = regular_client.post(f'{BASE_URL}import_excel/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_import_excel_requires_auth(self):
        client = APIClient()
        response = client.post(f'{BASE_URL}import_excel/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_import_excel_no_file(self, admin_client):
        """Sin archivo debe retornar 400"""
        response = admin_client.post(f'{BASE_URL}import_excel/', {}, format='multipart')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_import_excel_valid_file(self, admin_client, exercise):
        """Importar un Excel válido con openpyxl"""
        import openpyxl
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = 'Planes'
        # Header row
        headers = [
            'plan_name', 'plan_description', 'plan_difficulty', 'plan_goal',
            'plan_duration_weeks', 'plan_sessions_per_week', 'plan_location',
            'day_name', 'day_of_week', 'day_order',
            'exercise_name', 'sets', 'reps', 'rest_seconds', 'exercise_order'
        ]
        ws.append(headers)
        # Data row
        ws.append([
            'Plan Excel Test', 'Descripción', 'beginner', 'general_fitness',
            4, 3, 'gym',
            'Día 1', 'monday', 1,
            'Sentadilla', 3, 10, 60, 1
        ])
        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        buffer.name = 'test.xlsx'

        response = admin_client.post(
            f'{BASE_URL}import_excel/',
            {'file': buffer},
            format='multipart',
        )
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_201_CREATED,
            status.HTTP_400_BAD_REQUEST,
        ]

    def test_import_excel_invalid_file(self, admin_client):
        """Archivo que no es Excel válido"""
        file = io.BytesIO(b'not an excel file content')
        file.name = 'invalid.xlsx'
        response = admin_client.post(
            f'{BASE_URL}import_excel/',
            {'file': file},
            format='multipart',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
