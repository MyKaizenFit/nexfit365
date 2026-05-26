from django.core.management.base import BaseCommand
from django.utils import timezone

from nutrition.models import CommunityRecipePost


class Command(BaseCommand):
    help = "Elimina publicaciones de recetas de comunidad caducadas."

    def handle(self, *args, **options):
        deleted_count = 0
        for post in CommunityRecipePost.objects.filter(expires_at__lte=timezone.now()).only('id', 'photo'):
            post.delete()
            deleted_count += 1
        self.stdout.write(self.style.SUCCESS(f"Publicaciones eliminadas: {deleted_count}"))
