"""Tests para workouts/admin_exercise_views.py - AdminExerciseViewSet con import/export, stats, bulk_delete"""
import io
import csv
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from workouts.models import Exercise, ExerciseSubstitution
from unittest.mock import patch, MagicMock

User = get_user_model()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email='adminex@test.com',
        password='testpass123',
        is_staff=True,
        is_superuser=True,
    )


@pytest.fixture
def staff_user(db):
    return User.objects.create_user(
        email='staffex@test.com',
        password='testpass123',
        is_staff=True,
    )


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(
        email='userex@test.com',
        password='testpass123',
    )


@pytest.fixture
def admin_client(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def staff_client(staff_user):
    client = APIClient()
    client.force_authenticate(user=staff_user)
    return client


@pytest.fixture
def exercise(db):
    return Exercise.objects.create(
        name='Ejercicio Admin Ex',
        category='strength',
        muscle_groups=['chest'],
        difficulty='beginner',
        is_active=True,
    )


@pytest.fixture
def exercise2(db):
    return Exercise.objects.create(
        name='Ejercicio Sustituto',
        category='strength',
        muscle_groups=['chest'],
        difficulty='intermediate',
        is_active=True,
    )


# ---------------------------------------------------------------------------
# AdminExerciseViewSet - CRUD básico (en /api/admin/exercises/)
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestAdminExerciseEndpoint:
    """Tests para el endpoint /api/admin/exercises/"""

    def test_list_requires_auth(self):
        client = APIClient()
        response = client.get('/api/admin/exercises/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_requires_staff(self, regular_user):
        client = APIClient()
        client.force_authenticate(user=regular_user)
        response = client.get('/api/admin/exercises/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_as_admin(self, admin_client, exercise):
        response = admin_client.get('/api/admin/exercises/')
        assert response.status_code == status.HTTP_200_OK

    def test_list_as_staff(self, staff_client, exercise):
        response = staff_client.get('/api/admin/exercises/')
        assert response.status_code == status.HTTP_200_OK

    def test_retrieve_exercise(self, admin_client, exercise):
        response = admin_client.get(f'/api/admin/exercises/{exercise.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == exercise.name

    def test_create_exercise(self, admin_client):
        data = {
            'name': 'Nuevo Ejercicio Admin',
            'category': 'cardio',
            'muscle_groups': ['legs'],
            'difficulty': 'beginner',
        }
        response = admin_client.post('/api/admin/exercises/', data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert Exercise.objects.filter(name='Nuevo Ejercicio Admin').exists()

    def test_update_exercise(self, admin_client, exercise):
        response = admin_client.patch(
            f'/api/admin/exercises/{exercise.id}/',
            {'name': 'Ejercicio Modificado'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        exercise.refresh_from_db()
        assert exercise.name == 'Ejercicio Modificado'

    def test_upload_video(self, admin_client, exercise):
        video = SimpleUploadedFile(
            'ejercicio-horizontal.mp4',
            b'fake-video-content',
            content_type='video/mp4',
        )
        response = admin_client.post(
            f'/api/admin/exercises/{exercise.id}/upload-video/',
            {'video_file': video},
            format='multipart',
        )

        assert response.status_code == status.HTTP_200_OK
        exercise.refresh_from_db()
        assert exercise.video_file.name.startswith('exercises/videos/')
        assert response.data['video_file_url']
        assert response.data['video_display_url'].startswith('http://testserver/media/')

    def test_upload_video_rejects_invalid_extension(self, admin_client, exercise):
        video = SimpleUploadedFile(
            'ejercicio.txt',
            b'not-a-video',
            content_type='text/plain',
        )
        response = admin_client.post(
            f'/api/admin/exercises/{exercise.id}/upload-video/',
            {'video_file': video},
            format='multipart',
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'Formato' in response.data['detail']

    def test_upload_video_rolls_back_when_storage_missing(self, admin_client, exercise):
        video = SimpleUploadedFile(
            'ejercicio-horizontal.mp4',
            b'fake-video-content',
            content_type='video/mp4',
        )
        with patch('workouts.admin_exercise_views._storage_file_exists', return_value=False):
            response = admin_client.post(
                f'/api/admin/exercises/{exercise.id}/upload-video/',
                {'video_file': video},
                format='multipart',
            )

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert 'no se guardó' in response.data['detail'].lower()
        exercise.refresh_from_db()
        assert not (exercise.video_file and exercise.video_file.name)

    def test_has_video_false_when_file_missing_on_storage(self, admin_client, exercise):
        video = SimpleUploadedFile(
            'ejercicio-horizontal.mp4',
            b'fake-video-content',
            content_type='video/mp4',
        )
        response = admin_client.post(
            f'/api/admin/exercises/{exercise.id}/upload-video/',
            {'video_file': video},
            format='multipart',
        )
        assert response.status_code == status.HTTP_200_OK
        exercise.refresh_from_db()
        assert exercise.has_video is True

        from django.core.files.storage import default_storage
        default_storage.delete(exercise.video_file.name)
        exercise.refresh_from_db()
        assert exercise.has_video is False

    def test_upload_thumbnail(self, admin_client, exercise):
        thumbnail = SimpleUploadedFile(
            'ejercicio.webp',
            b'fake-image-content',
            content_type='image/webp',
        )
        response = admin_client.post(
            f'/api/admin/exercises/{exercise.id}/upload-thumbnail/',
            {'thumbnail': thumbnail},
            format='multipart',
        )

        assert response.status_code == status.HTTP_200_OK
        exercise.refresh_from_db()
        assert exercise.thumbnail.name.startswith('exercises/thumbnails/')
        assert response.data['thumbnail_url']

    def test_delete_exercise(self, admin_client, exercise):
        exercise_id = str(exercise.id)
        response = admin_client.delete(f'/api/admin/exercises/{exercise_id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT


# ---------------------------------------------------------------------------
# stats action
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestAdminExerciseStats:
    """Tests para la acción stats del AdminExerciseViewSet"""

    def test_stats_empty(self, admin_client):
        response = admin_client.get('/api/admin/exercises/stats/')
        assert response.status_code == status.HTTP_200_OK
        assert 'total_exercises' in response.data
        assert response.data['total_exercises'] == 0

    def test_stats_with_exercises(self, admin_client, exercise):
        Exercise.objects.create(
            name='Ejercicio Cardio',
            category='cardio',
            muscle_groups=['legs'],
            difficulty='beginner',
        )
        response = admin_client.get('/api/admin/exercises/stats/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['total_exercises'] >= 2
        assert 'exercises_by_category' in response.data
        assert 'exercises_by_muscle_group' in response.data
        assert 'recent_exercises' in response.data

    def test_stats_by_category(self, admin_client, exercise):
        response = admin_client.get('/api/admin/exercises/stats/')
        assert response.status_code == status.HTTP_200_OK
        category_stats = response.data['exercises_by_category']
        assert 'strength' in category_stats


# ---------------------------------------------------------------------------
# bulk_delete action
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestAdminExerciseBulkDelete:
    """Tests para la acción bulk_delete"""

    def test_bulk_delete_exercises(self, admin_client, exercise, exercise2):
        ids = [str(exercise.id), str(exercise2.id)]
        response = admin_client.delete(
            '/api/admin/exercises/bulk_delete/',
            {'exercise_ids': ids},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['deleted_count'] == 2
        assert not Exercise.objects.filter(id__in=ids).exists()

    def test_bulk_delete_empty_ids(self, admin_client):
        response = admin_client.delete(
            '/api/admin/exercises/bulk_delete/',
            {'exercise_ids': []},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_bulk_delete_requires_admin(self, regular_user, exercise):
        client = APIClient()
        client.force_authenticate(user=regular_user)
        response = client.delete(
            '/api/admin/exercises/bulk_delete/',
            {'exercise_ids': [str(exercise.id)]},
            format='json',
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ---------------------------------------------------------------------------
# export_csv action
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestAdminExerciseExportCSV:
    """Tests para exportar ejercicios en CSV"""

    def test_export_csv_empty(self, admin_client):
        response = admin_client.get('/api/admin/exercises/export-csv/')
        assert response.status_code == status.HTTP_200_OK
        assert 'text/csv' in response['Content-Type']

    def test_export_csv_has_headers(self, admin_client):
        response = admin_client.get('/api/admin/exercises/export-csv/')
        assert response.status_code == status.HTTP_200_OK
        content = b''.join(response.streaming_content).decode('utf-8') if hasattr(response, 'streaming_content') else response.content.decode('utf-8')
        assert 'nombre' in content.lower()

    def test_export_csv_with_exercises(self, admin_client, exercise):
        response = admin_client.get('/api/admin/exercises/export-csv/')
        assert response.status_code == status.HTTP_200_OK
        content = b''.join(response.streaming_content).decode('utf-8') if hasattr(response, 'streaming_content') else response.content.decode('utf-8')
        assert exercise.name in content

    def test_export_csv_requires_auth(self):
        client = APIClient()
        response = client.get('/api/admin/exercises/export-csv/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# export_excel action
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestAdminExerciseExportExcel:
    """Tests para exportar ejercicios en Excel"""

    def test_export_excel_empty(self, admin_client):
        response = admin_client.get('/api/admin/exercises/export-excel/')
        assert response.status_code == status.HTTP_200_OK
        assert 'application/vnd' in response['Content-Type'] or 'excel' in response['Content-Type'].lower() or response['Content-Type'] == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'


# ---------------------------------------------------------------------------
# import_csv action
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestAdminExerciseImportCSV:
    """Tests para importar ejercicios desde CSV"""

    def test_import_csv_no_file(self, admin_client):
        response = admin_client.post('/api/admin/exercises/import-csv/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_import_csv_creates_exercises(self, admin_client):
        csv_content = (
            'name,category,muscle_groups,difficulty\n'
            'Ejercicio CSV 1,strength,"chest,triceps",intermediate\n'
            'Ejercicio CSV 2,cardio,legs,beginner\n'
        )
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'exercises.csv'
        response = admin_client.post(
            '/api/admin/exercises/import-csv/',
            {'file': csv_file},
            format='multipart',
        )
        assert response.status_code == status.HTTP_200_OK
        assert 'created' in response.data
        assert response.data['created'] >= 2

    def test_import_csv_updates_existing(self, admin_client, exercise):
        csv_content = (
            'name,category,muscle_groups,difficulty\n'
            f'{exercise.name},cardio,legs,beginner\n'
        )
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'exercises.csv'
        response = admin_client.post(
            '/api/admin/exercises/import-csv/',
            {'file': csv_file},
            format='multipart',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['updated'] >= 1

    def test_import_csv_requires_admin(self, regular_user):
        client = APIClient()
        client.force_authenticate(user=regular_user)
        csv_content = 'name,category\nEjercicio,strength\n'
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'ex.csv'
        response = client.post('/api/admin/exercises/import-csv/', {'file': csv_file}, format='multipart')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_import_csv_skips_rows_without_name(self, admin_client):
        csv_content = (
            'name,category\n'
            ',strength\n'
            'Ejercicio Con Nombre,cardio\n'
        )
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'exercises.csv'
        response = admin_client.post(
            '/api/admin/exercises/import-csv/',
            {'file': csv_file},
            format='multipart',
        )
        assert response.status_code == status.HTTP_200_OK
        # Solo se debería crear el segundo ejercicio
        assert response.data['skipped'] >= 1


# ---------------------------------------------------------------------------
# import_excel action
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestAdminExerciseImportExcel:
    """Tests para importar ejercicios desde Excel"""

    def test_import_excel_no_file(self, admin_client):
        response = admin_client.post('/api/admin/exercises/import-excel/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_import_excel_creates_exercises(self, admin_client):
        import openpyxl
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(['name', 'category', 'muscle_groups', 'difficulty'])
        ws.append(['Ejercicio Excel 1', 'strength', 'chest', 'intermediate'])
        ws.append(['Ejercicio Excel 2', 'cardio', 'legs', 'beginner'])
        
        excel_file = io.BytesIO()
        wb.save(excel_file)
        excel_file.seek(0)
        excel_file.name = 'exercises.xlsx'
        
        response = admin_client.post(
            '/api/admin/exercises/import-excel/',
            {'file': excel_file},
            format='multipart',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['created'] >= 2

    def test_import_excel_invalid_file(self, admin_client):
        fake_file = io.BytesIO(b'not an excel file')
        fake_file.name = 'bad.xlsx'
        response = admin_client.post(
            '/api/admin/exercises/import-excel/',
            {'file': fake_file},
            format='multipart',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ---------------------------------------------------------------------------
# substitute actions
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestAdminExerciseSubstitutes:
    """Tests para las acciones de sustitutos en /api/admin/exercises/{id}/..."""

    def test_add_substitute(self, admin_client, exercise, exercise2):
        response = admin_client.post(
            f'/api/admin/exercises/{exercise.id}/add_substitute/',
            {'substitute_id': str(exercise2.id), 'priority': 1},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert ExerciseSubstitution.objects.filter(exercise=exercise, substitute=exercise2).exists()

    def test_add_substitute_missing_id(self, admin_client, exercise):
        response = admin_client.post(
            f'/api/admin/exercises/{exercise.id}/add_substitute/',
            {},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_add_substitute_self_reference(self, admin_client, exercise):
        response = admin_client.post(
            f'/api/admin/exercises/{exercise.id}/add_substitute/',
            {'substitute_id': str(exercise.id)},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_remove_substitute(self, admin_client, exercise, exercise2):
        ExerciseSubstitution.objects.create(exercise=exercise, substitute=exercise2, priority=1)
        response = admin_client.post(
            f'/api/admin/exercises/{exercise.id}/remove_substitute/',
            {'substitute_id': str(exercise2.id)},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK

    def test_remove_substitute_missing_id(self, admin_client, exercise):
        response = admin_client.post(
            f'/api/admin/exercises/{exercise.id}/remove_substitute/',
            {},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_list_substitutes(self, admin_client, exercise, exercise2):
        ExerciseSubstitution.objects.create(exercise=exercise, substitute=exercise2, priority=1)
        response = admin_client.get(f'/api/admin/exercises/{exercise.id}/substitutes/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['substitute_name'] == exercise2.name

    def test_list_substitutes_empty(self, admin_client, exercise):
        response = admin_client.get(f'/api/admin/exercises/{exercise.id}/substitutes/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data == []


# ---------------------------------------------------------------------------
# sync_from_google_drive action
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestAdminExerciseSyncGoogleDrive:
    """Tests para la sincronización desde Google Drive"""

    def test_sync_not_configured(self, admin_client):
        with patch('workouts.google_drive_service.get_google_drive_service') as mock_service:
            service_instance = MagicMock()
            service_instance.is_configured.return_value = False
            mock_service.return_value = service_instance
            
            response = admin_client.post('/api/admin/exercises/sync_from_google_drive/')
        
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_500_INTERNAL_SERVER_ERROR]

    def test_sync_requires_admin(self, regular_user):
        client = APIClient()
        client.force_authenticate(user=regular_user)
        response = client.post('/api/admin/exercises/sync_from_google_drive/')
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ---------------------------------------------------------------------------
# auto_link_videos action
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestAdminExerciseAutoLinkVideos:
    """Tests para vincular vídeos por nombre desde carpeta pública de Drive"""

    def test_auto_link_accepts_folder_url_and_matches_by_name(self, admin_client):
        exercise = Exercise.objects.create(name='Curl de Bíceps Bayesian', category='strength')
        drive_video = {
            'name': 'Curl de Bíceps Bayesian',
            'filename': 'CURL de BÍCEPS BAYESIAN.MOV',
            'file_id': '1g8xvzPVSm9IixCdFQYb_TFjBgQzyg1L0',
        }

        with patch('workouts.google_drive_service.GoogleDriveService.list_public_videos_from_folder') as mock_list:
            mock_list.return_value = [drive_video]
            response = admin_client.post(
                '/api/admin/exercises/auto-link-videos/',
                {'folder_url': 'https://drive.google.com/drive/folders/1dbDvVZKOwYJ4A13FtVslIid2JKLcN4fG?usp=sharing'},
                format='json',
                secure=True,
            )

        assert response.status_code == status.HTTP_200_OK
        assert response.data['videos_in_drive'] == 1
        assert response.data['linked'] == 1
        exercise.refresh_from_db()
        assert exercise.google_drive_file_id == drive_video['file_id']
        assert exercise.video_url == f"https://drive.google.com/file/d/{drive_video['file_id']}/preview"

    def test_auto_link_requires_admin(self, regular_user):
        client = APIClient()
        client.force_authenticate(user=regular_user)
        response = client.post('/api/admin/exercises/auto-link-videos/', secure=True)
        assert response.status_code == status.HTTP_403_FORBIDDEN
