import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from model_bakery import baker
from freezegun import freeze_time

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user():
    return baker.make(User, email='admin@test.com', role='admin', is_staff=True, is_superuser=True)


@pytest.fixture
def trainer_user():
    return baker.make(User, email='trainer@test.com', role='trainer', is_staff=True)


@pytest.fixture
def member_user():
    return baker.make(User, email='member@test.com', role='member')


@pytest.fixture
def regular_users():
    """Crear varios usuarios regulares para testing"""
    return [
        baker.make(User, email=f'user{i}@test.com', role='member', is_active=True)
        for i in range(1, 6)
    ]


@pytest.mark.django_db
class TestUserViewSet:
    """Tests para el ViewSet de gestión de usuarios"""

    def test_list_users_admin_access(self, api_client, admin_user, regular_users):
        """Admin puede listar usuarios"""
        api_client.force_authenticate(user=admin_user)
        url = reverse('user-list')
        
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'results' in response.data
        assert len(response.data['results']) == 7  # admin + 5 usuarios regulares
        assert response.data['count'] == 7

    def test_list_users_non_admin_denied(self, api_client, member_user):
        """Usuarios no admin no pueden listar usuarios"""
        api_client.force_authenticate(user=member_user)
        url = reverse('user-list')
        
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_user_admin_access(self, api_client, admin_user):
        """Admin puede crear usuarios"""
        api_client.force_authenticate(user=admin_user)
        url = reverse('user-list')
        data = {
            'email': 'newuser@test.com',
            'password': 'testpass123',
            'password_confirm': 'testpass123',
            'first_name': 'New',
            'last_name': 'User',
            'role': 'member'
        }
        
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert User.objects.filter(email='newuser@test.com').exists()
        user = User.objects.get(email='newuser@test.com')
        assert user.first_name == 'New'
        assert user.role == 'member'

    def test_create_user_password_mismatch(self, api_client, admin_user):
        """Error si las contraseñas no coinciden"""
        api_client.force_authenticate(user=admin_user)
        url = reverse('user-list')
        data = {
            'email': 'newuser@test.com',
            'password': 'testpass123',
            'password_confirm': 'differentpass',
            'first_name': 'New',
            'last_name': 'User'
        }
        
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'password_confirm' in response.data

    def test_create_user_duplicate_email(self, api_client, admin_user, member_user):
        """Error si el email ya existe"""
        api_client.force_authenticate(user=admin_user)
        url = reverse('user-list')
        data = {
            'email': member_user.email,
            'password': 'testpass123',
            'password_confirm': 'testpass123',
            'first_name': 'New',
            'last_name': 'User'
        }
        
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'email' in response.data

    def test_retrieve_user_admin_access(self, api_client, admin_user, member_user):
        """Admin puede ver detalles de usuario"""
        api_client.force_authenticate(user=admin_user)
        url = reverse('user-detail', kwargs={'pk': member_user.id})
        
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == member_user.email
        assert response.data['role'] == member_user.role

    def test_update_user_admin_access(self, api_client, admin_user, member_user):
        """Admin puede actualizar usuarios"""
        api_client.force_authenticate(user=admin_user)
        url = reverse('user-detail', kwargs={'pk': member_user.id})
        data = {'first_name': 'Updated', 'last_name': 'Name'}
        
        response = api_client.patch(url, data)
        
        assert response.status_code == status.HTTP_200_OK
        member_user.refresh_from_db()
        assert member_user.first_name == 'Updated'
        assert member_user.last_name == 'Name'

    def test_delete_user_admin_access(self, api_client, admin_user, member_user):
        """Admin puede desactivar usuarios (soft delete)"""
        api_client.force_authenticate(user=admin_user)
        url = reverse('user-detail', kwargs={'pk': member_user.id})
        
        response = api_client.delete(url)
        
        assert response.status_code == status.HTTP_200_OK
        member_user.refresh_from_db()
        assert not member_user.is_active

    def test_user_filters(self, api_client, admin_user, regular_users):
        """Filtros de usuarios funcionan correctamente"""
        api_client.force_authenticate(user=admin_user)
        url = reverse('user-list')
        
        # Filtro por rol
        response = api_client.get(url, {'role': 'member'})
        assert response.status_code == status.HTTP_200_OK
        assert all(user['role'] == 'member' for user in response.data['results'])
        
        # Filtro por estado activo
        response = api_client.get(url, {'is_active': 'true'})
        assert response.status_code == status.HTTP_200_OK
        assert all(user['is_active'] for user in response.data['results'])
        
        # Filtro de búsqueda
        response = api_client.get(url, {'search': 'user1'})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert 'user1@test.com' in response.data['results'][0]['email']

    def test_user_ordering(self, api_client, admin_user, regular_users):
        """Ordenamiento de usuarios funciona correctamente"""
        api_client.force_authenticate(user=admin_user)
        url = reverse('user-list')
        
        # Ordenar por email ascendente
        response = api_client.get(url, {'ordering': 'email'})
        assert response.status_code == status.HTTP_200_OK
        emails = [user['email'] for user in response.data['results']]
        assert emails == sorted(emails)
        
        # Ordenar por fecha de registro descendente (por defecto)
        response = api_client.get(url, {'ordering': '-date_joined'})
        assert response.status_code == status.HTTP_200_OK

    def test_user_pagination(self, api_client, admin_user, regular_users):
        """Paginación de usuarios funciona correctamente"""
        api_client.force_authenticate(user=admin_user)
        url = reverse('user-list')
        
        # Cambiar tamaño de página
        response = api_client.get(url, {'page_size': 3})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 3
        assert 'next' in response.data
        assert 'previous' in response.data

    def test_user_profile_access(self, api_client, member_user):
        """Usuario puede acceder a su propio perfil"""
        api_client.force_authenticate(user=member_user)
        url = reverse('user-profile')
        
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == member_user.email

    def test_user_profile_update(self, api_client, member_user):
        """Usuario puede actualizar su propio perfil"""
        api_client.force_authenticate(user=member_user)
        url = reverse('user-profile')
        data = {'first_name': 'Updated', 'last_name': 'Name'}
        
        response = api_client.patch(url, data)
        
        assert response.status_code == status.HTTP_200_OK
        member_user.refresh_from_db()
        assert member_user.first_name == 'Updated'
        assert member_user.last_name == 'Name'

    def test_user_stats_access(self, api_client, admin_user, member_user):
        """Admin puede ver estadísticas de usuario"""
        api_client.force_authenticate(user=admin_user)
        url = reverse('user-stats', kwargs={'pk': member_user.id})
        
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['user_id'] == str(member_user.id)
        assert response.data['email'] == member_user.email
        assert 'nutrition' in response.data
        assert 'workouts' in response.data
        assert 'progress' in response.data

    def test_user_stats_owner_access(self, api_client, member_user):
        """Usuario puede ver sus propias estadísticas"""
        api_client.force_authenticate(user=member_user)
        url = reverse('user-stats', kwargs={'pk': member_user.id})
        
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['user_id'] == str(member_user.id)

    def test_user_stats_unauthorized_access(self, api_client, member_user, regular_users):
        """Usuario no puede ver estadísticas de otros"""
        api_client.force_authenticate(user=member_user)
        other_user = regular_users[0]
        url = reverse('user-stats', kwargs={'pk': other_user.id})
        
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_toggle_user_status(self, api_client, admin_user, member_user):
        """Admin puede activar/desactivar usuarios"""
        api_client.force_authenticate(user=admin_user)
        url = reverse('user-toggle-status', kwargs={'pk': member_user.id})
        
        # Desactivar usuario
        response = api_client.patch(url)
        assert response.status_code == status.HTTP_200_OK
        member_user.refresh_from_db()
        assert not member_user.is_active
        
        # Reactivar usuario
        response = api_client.patch(url)
        assert response.status_code == status.HTTP_200_OK
        member_user.refresh_from_db()
        assert member_user.is_active

    def test_change_user_role(self, api_client, admin_user, member_user):
        """Admin puede cambiar roles de usuario"""
        api_client.force_authenticate(user=admin_user)
        url = reverse('user-change-role', kwargs={'pk': member_user.id})
        data = {'role': 'trainer'}
        
        response = api_client.patch(url, data)
        
        assert response.status_code == status.HTTP_200_OK
        member_user.refresh_from_db()
        assert member_user.role == 'trainer'
        assert response.data['old_role'] == 'member'
        assert response.data['new_role'] == 'trainer'

    def test_change_user_role_invalid(self, api_client, admin_user, member_user):
        """Error al cambiar a rol inválido"""
        api_client.force_authenticate(user=admin_user)
        url = reverse('user-change-role', kwargs={'pk': member_user.id})
        data = {'role': 'invalid_role'}
        
        response = api_client.patch(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'available_roles' in response.data

    def test_general_stats_admin_access(self, api_client, admin_user, regular_users):
        """Admin puede ver estadísticas generales"""
        api_client.force_authenticate(user=admin_user)
        url = reverse('user-general-stats')
        
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'total_users' in response.data
        assert 'active_users' in response.data
        assert 'role_distribution' in response.data
        assert 'monthly_registrations' in response.data

    def test_general_stats_non_admin_denied(self, api_client, member_user):
        """Usuarios no admin no pueden ver estadísticas generales"""
        api_client.force_authenticate(user=member_user)
        url = reverse('user-general-stats')
        
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestUserPermissions:
    """Tests para permisos de usuarios"""

    def test_owner_can_access_own_data(self, api_client, member_user):
        """Usuario puede acceder a sus propios datos"""
        api_client.force_authenticate(user=member_user)
        url = reverse('user-detail', kwargs={'pk': member_user.id})
        
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK

    def test_owner_cannot_access_other_data(self, api_client, member_user, regular_users):
        """Usuario no puede acceder a datos de otros"""
        api_client.force_authenticate(user=member_user)
        other_user = regular_users[0]
        url = reverse('user-detail', kwargs={'pk': other_user.id})
        
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_trainer_can_access_member_data(self, api_client, trainer_user, member_user):
        """Entrenador puede acceder a datos de miembros"""
        api_client.force_authenticate(user=trainer_user)
        url = reverse('user-detail', kwargs={'pk': member_user.id})
        
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK

    def test_trainer_cannot_access_trainer_data(self, api_client, trainer_user, regular_users):
        """Entrenador no puede acceder a datos de otros entrenadores"""
        other_trainer = baker.make(User, email='other@trainer.com', role='trainer')
        api_client.force_authenticate(user=trainer_user)
        url = reverse('user-detail', kwargs={'pk': other_trainer.id})
        
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestUserValidation:
    """Tests para validaciones de usuario"""

    def test_email_normalization(self, api_client, admin_user):
        """Los emails se normalizan a minúsculas"""
        api_client.force_authenticate(user=admin_user)
        url = reverse('user-list')
        data = {
            'email': 'TEST@EXAMPLE.COM',
            'password': 'testpass123',
            'password_confirm': 'testpass123',
            'first_name': 'Test',
            'last_name': 'User'
        }
        
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_201_CREATED
        user = User.objects.get(email='test@example.com')
        assert user.email == 'test@example.com'

    def test_password_strength_validation(self, api_client, admin_user):
        """Se valida la fortaleza de la contraseña"""
        api_client.force_authenticate(user=admin_user)
        url = reverse('user-list')
        data = {
            'email': 'weak@test.com',
            'password': '123',
            'password_confirm': '123',
            'first_name': 'Weak',
            'last_name': 'User'
        }
        
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'password' in response.data

    def test_unique_email_constraint(self, api_client, admin_user, member_user):
        """No se pueden crear usuarios con emails duplicados"""
        api_client.force_authenticate(user=admin_user)
        url = reverse('user-list')
        data = {
            'email': member_user.email,
            'password': 'testpass123',
            'password_confirm': 'testpass123',
            'first_name': 'Duplicate',
            'last_name': 'User'
        }
        
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'email' in response.data


@pytest.mark.django_db
class TestUserSearchAndFiltering:
    """Tests para búsqueda y filtrado avanzado"""

    def test_search_by_name_parts(self, api_client, admin_user):
        """Búsqueda por partes del nombre"""
        # Crear usuarios con nombres específicos
        baker.make(User, email='john.doe@test.com', first_name='John', last_name='Doe')
        baker.make(User, email='jane.smith@test.com', first_name='Jane', last_name='Smith')
        
        api_client.force_authenticate(user=admin_user)
        url = reverse('user-list')
        
        # Búsqueda por nombre
        response = api_client.get(url, {'search': 'John'})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert 'john.doe@test.com' in response.data['results'][0]['email']
        
        # Búsqueda por apellido
        response = api_client.get(url, {'search': 'Smith'})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert 'jane.smith@test.com' in response.data['results'][0]['email']

    def test_date_range_filters(self, api_client, admin_user):
        """Filtros de rango de fechas funcionan"""
        with freeze_time('2025-01-01'):
            old_user = baker.make(User, email='old@test.com')
        
        with freeze_time('2025-01-15'):
            new_user = baker.make(User, email='new@test.com')
        
        api_client.force_authenticate(user=admin_user)
        url = reverse('user-list')
        
        # Filtrar por fecha desde
        response = api_client.get(url, {'date_joined_from': '2025-01-10'})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert 'new@test.com' in response.data['results'][0]['email']
        
        # Filtrar por fecha hasta
        response = api_client.get(url, {'date_joined_to': '2025-01-10'})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert 'old@test.com' in response.data['results'][0]['email']

    def test_verification_status_filter(self, api_client, admin_user):
        """Filtro por estado de verificación funciona"""
        verified_user = baker.make(User, email='verified@test.com', is_verified=True)
        unverified_user = baker.make(User, email='unverified@test.com', is_verified=False)
        
        api_client.force_authenticate(user=admin_user)
        url = reverse('user-list')
        
        # Filtrar usuarios verificados
        response = api_client.get(url, {'verification_status': 'verified'})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert 'verified@test.com' in response.data['results'][0]['email']
        
        # Filtrar usuarios no verificados
        response = api_client.get(url, {'verification_status': 'unverified'})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert 'unverified@test.com' in response.data['results'][0]['email'] 