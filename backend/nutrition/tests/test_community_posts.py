import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from nutrition.models import CommunityRecipePost


User = get_user_model()


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
