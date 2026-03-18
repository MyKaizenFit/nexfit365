"""Tests para endpoint set-image-url de recetas"""
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from nutrition.models import Recipe
from unittest.mock import patch, MagicMock

User = get_user_model()


@pytest.mark.django_db
class TestAdminRecipeImageUrl:
    """Tests para actualizar image_url de recetas"""
    
    @pytest.fixture
    def admin_user(self):
        """Crear admin user"""
        return User.objects.create_user(
            email='admin@test.com',
            password='testpass123',
            is_staff=True,
            is_superuser=True
        )
    
    @pytest.fixture
    def recipe(self):
        """Crear una receta de prueba"""
        return Recipe.objects.create(
            name='Test Recipe',
            category='Almuerzo',
            difficulty='Fácil',
            servings=1,
            calories=500,
            protein=20,
            carbs=50,
            fat=10
        )
    
    @pytest.fixture
    def client_auth(self, admin_user):
        """Cliente autenticado como admin"""
        client = APIClient()
        client.force_authenticate(user=admin_user)
        return client
    
    def test_set_image_url_success(self, client_auth, recipe):
        """Test: actualizar image_url correctamente"""
        image_url = 'https://drive.google.com/uc?id=1234567890&export=download'
        
        with patch('nutrition.admin_views.requests.head') as mock_head:
            # Mock el HEAD request
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.headers = {'content-type': 'image/jpeg'}
            mock_head.return_value = mock_response
            
            response = client_auth.post(
                f'/api/admin/nutrition/recipes/{recipe.id}/set-image-url/',
                {'image_url': image_url},
                format='json'
            )
        
        assert response.status_code == status.HTTP_200_OK
        recipe.refresh_from_db()
        assert recipe.image_url == image_url
    
    def test_set_image_url_missing(self, client_auth, recipe):
        """Test: error cuando falta image_url"""
        response = client_auth.post(
            f'/api/admin/nutrition/recipes/{recipe.id}/set-image-url/',
            {},
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'image_url es requerido' in str(response.data)
    
    def test_set_image_url_invalid_url(self, client_auth, recipe):
        """Test: error cuando URL es inválida"""
        response = client_auth.post(
            f'/api/admin/nutrition/recipes/{recipe.id}/set-image-url/',
            {'image_url': 'not-a-valid-url'},
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'URL inválida' in str(response.data)
    
    def test_set_image_url_not_accessible(self, client_auth, recipe):
        """Test: error cuando URL no es accesible"""
        with patch('nutrition.admin_views.requests.head') as mock_head:
            from requests.exceptions import ConnectionError
            mock_head.side_effect = ConnectionError('Connection refused')
            
            response = client_auth.post(
                f'/api/admin/nutrition/recipes/{recipe.id}/set-image-url/',
                {'image_url': 'https://example.com/image.jpg'},
                format='json'
            )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'Error accediendo a URL' in str(response.data)
    
    def test_set_image_url_not_image(self, client_auth, recipe):
        """Test: error cuando URL no apunta a imagen"""
        with patch('nutrition.admin_views.requests.head') as mock_head:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.headers = {'content-type': 'text/html'}  # No es imagen
            mock_head.return_value = mock_response
            
            response = client_auth.post(
                f'/api/admin/nutrition/recipes/{recipe.id}/set-image-url/',
                {'image_url': 'https://example.com/page.html'},
                format='json'
            )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'no es una imagen válida' in str(response.data)
    
    def test_set_image_url_http_error(self, client_auth, recipe):
        """Test: error cuando HTTP status es 404"""
        with patch('nutrition.admin_views.requests.head') as mock_head:
            mock_response = MagicMock()
            mock_response.status_code = 404
            mock_head.return_value = mock_response
            
            response = client_auth.post(
                f'/api/admin/nutrition/recipes/{recipe.id}/set-image-url/',
                {'image_url': 'https://example.com/missing.jpg'},
                format='json'
            )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'status 404' in str(response.data)
    
    def test_set_image_url_timeout(self, client_auth, recipe):
        """Test: error cuando URL tarda demasiado"""
        with patch('nutrition.admin_views.requests.head') as mock_head:
            from requests.exceptions import Timeout
            mock_head.side_effect = Timeout()
            
            response = client_auth.post(
                f'/api/admin/nutrition/recipes/{recipe.id}/set-image-url/',
                {'image_url': 'https://example.com/slow.jpg'},
                format='json'
            )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'tardó demasiado' in str(response.data)
    
    def test_set_image_url_requires_admin(self, recipe):
        """Test: endpoint requiere admin"""
        client = APIClient()
        
        # Sin autenticación
        response = client.post(
            f'/api/admin/nutrition/recipes/{recipe.id}/set-image-url/',
            {'image_url': 'https://example.com/image.jpg'},
            format='json'
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_set_image_url_multiple_formats(self, client_auth, recipe):
        """Test: soporta múltiples formatos de imagen"""
        test_cases = [
            ('https://drive.google.com/uc?id=123&export=download', 'image/png'),
            ('https://imgur.com/abc123.jpg', 'image/jpeg'),
            ('https://example.webp/image.webp', 'image/webp; charset=utf-8'),
            ('https://example.gif/animated.gif', 'image/gif'),
        ]
        
        for image_url, content_type in test_cases:
            with patch('nutrition.admin_views.requests.head') as mock_head:
                mock_response = MagicMock()
                mock_response.status_code = 200
                mock_response.headers = {'content-type': content_type}
                mock_head.return_value = mock_response
                
                response = client_auth.post(
                    f'/api/admin/nutrition/recipes/{recipe.id}/set-image-url/',
                    {'image_url': image_url},
                    format='json'
                )
            
            assert response.status_code == status.HTTP_200_OK, f"Failed for {image_url}"
