import pytest
from io import BytesIO
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient

from nutrition.models import CommunityRecipePost
from nutrition.tasks import purge_expired_community_recipe_posts


User = get_user_model()


def make_test_image(name="comida.jpg", content_type="image/jpeg"):
    file_obj = BytesIO()
    image = Image.new("RGB", (2, 2), color=(255, 0, 0))
    image.save(file_obj, format="JPEG")
    file_obj.seek(0)
    return SimpleUploadedFile(name, file_obj.read(), content_type=content_type)


@pytest.fixture
def community_user(db):
    return User.objects.create_user(email='community@test.com', password='testpass123')


@pytest.fixture
def community_client(community_user):
    client = APIClient()
    client.force_authenticate(user=community_user)
    return client


@pytest.mark.django_db
class TestCommunityPosts:
    url = '/api/nutrition/community-recipes/'

    def test_existing_recipe_contract_keeps_recipe_as_default(self, community_client):
        response = community_client.post(self.url, {
            'title': 'Tortilla',
            'description': 'Una receta fácil',
            'ingredients': 'Huevos',
            'instructions': 'Cocinar',
        }, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['post_type'] == 'recipe'
        assert response.data['photo_url'] == ''
        assert response.data['expires_at'] is None

    def test_create_structured_exercise_post_without_photo(self, community_client):
        response = community_client.post(self.url, {
            'title': 'Sentadilla goblet',
            'description': 'Una opción accesible para aprender la sentadilla.',
            'post_type': 'exercise',
            'template_data': {
                'muscle_groups': 'Piernas y glúteos',
                'sets_reps': '4 x 10',
            },
            'tags': ['fuerza', 'principiante'],
        }, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        post = CommunityRecipePost.objects.get()
        assert post.post_type == 'exercise'
        assert post.template_data['sets_reps'] == '4 x 10'
        assert post.tags == ['fuerza', 'principiante']

    def test_create_structured_post_from_browser_form_data(self, community_client):
        response = community_client.post(self.url, {
            'title': 'Entrenamiento rápido',
            'description': 'Una sesión corta para días con poco tiempo.',
            'post_type': 'workout',
            'template_data': '{"duration": "30 minutos"}',
            'tags': '["cardio", "casa"]',
        }, format='multipart')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['template_data'] == {'duration': '30 minutos'}
        assert response.data['tags'] == ['cardio', 'casa']

    def test_create_post_rejects_oversized_photo(self, community_client):
        large = SimpleUploadedFile(
            "huge.jpg",
            b"x" * (6 * 1024 * 1024 + 1),
            content_type="image/jpeg",
        )
        response = community_client.post(self.url, {
            'title': 'Foto grande',
            'description': 'No deberia pasar',
            'post_type': 'progress',
            'photo': large,
        }, format='multipart')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert '6MB' in str(response.data)

    def test_create_post_accepts_mobile_jpg_content_type(self, community_client):
        photo = make_test_image(content_type="image/jpg")
        response = community_client.post(self.url, {
            'title': 'Tostas de atun',
            'description': 'Receta rapida',
            'post_type': 'recipe',
            'photo': photo,
        }, format='multipart')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['photo_url']

    def test_filter_feed_by_post_type(self, community_client, community_user):
        CommunityRecipePost.objects.create(
            author=community_user,
            title='Pregunta',
            description='¿Cómo progresáis?',
            post_type='question',
        )
        CommunityRecipePost.objects.create(
            author=community_user,
            title='Consejo',
            description='Descansa bien',
            post_type='tip',
        )

        response = community_client.get(f'{self.url}?post_type=question')

        assert response.status_code == status.HTTP_200_OK
        items = response.data.get('results', response.data)
        assert len(items) == 1
        assert items[0]['post_type'] == 'question'

    def test_feed_keeps_posts_with_legacy_expiration_dates(self, community_client, community_user):
        post = CommunityRecipePost.objects.create(
            author=community_user,
            title='Publicación antigua',
            description='Debe seguir visible',
            post_type='general',
            expires_at=timezone.now() - timedelta(days=1),
        )

        response = community_client.get(self.url)

        assert response.status_code == status.HTTP_200_OK
        items = response.data.get('results', response.data)
        assert [item['id'] for item in items] == [str(post.id)]

    def test_legacy_purge_task_does_not_delete_posts(self, community_user):
        post = CommunityRecipePost.objects.create(
            author=community_user,
            title='Publicación permanente',
            expires_at=timezone.now() - timedelta(days=1),
        )

        assert purge_expired_community_recipe_posts() == 0
        assert CommunityRecipePost.objects.filter(pk=post.pk).exists()
