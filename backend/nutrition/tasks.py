from celery import shared_task
from django.utils import timezone

from .models import CommunityRecipePost


@shared_task
def purge_expired_community_recipe_posts():
    deleted_count = 0
    for post in CommunityRecipePost.objects.filter(expires_at__lte=timezone.now()).only('id', 'photo'):
        post.delete()
        deleted_count += 1
    return deleted_count
