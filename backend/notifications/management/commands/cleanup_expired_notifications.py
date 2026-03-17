from django.core.management.base import BaseCommand
from django.utils import timezone

from notifications.models import Notification


class Command(BaseCommand):
    help = "Elimina notificaciones expiradas"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Muestra cuántas notificaciones expiradas se eliminarían sin borrarlas",
        )

    def handle(self, *args, **options):
        queryset = Notification.objects.filter(
            expires_at__isnull=False,
            expires_at__lt=timezone.now(),
        )
        expired_count = queryset.count()

        if options["dry_run"]:
            self.stdout.write(self.style.WARNING(f"Se encontraron {expired_count} notificaciones expiradas"))
            return

        deleted_count, _ = queryset.delete()
        self.stdout.write(self.style.SUCCESS(f"Eliminadas {deleted_count} notificaciones expiradas"))