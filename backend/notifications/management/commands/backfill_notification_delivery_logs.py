from django.core.management.base import BaseCommand
from django.db import transaction

from notifications.models import Notification, NotificationDeliveryLog


class Command(BaseCommand):
    help = (
        "Crea trazas históricas mínimas para notificaciones antiguas que aún no "
        "tengan logs de entrega por canal."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--batch-size",
            type=int,
            default=500,
            help="Número de notificaciones a procesar por lote.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Calcula qué se crearía, pero no escribe en base de datos.",
        )

    def handle(self, *args, **options):
        batch_size = max(int(options["batch_size"]), 1)
        dry_run = bool(options["dry_run"])

        queryset = Notification.objects.order_by("created_at").prefetch_related("delivery_logs")

        created_logs = 0
        processed_notifications = 0
        pending_objects = []

        for notification in queryset.iterator(chunk_size=batch_size):
            processed_notifications += 1
            existing_channels = {log.channel for log in notification.delivery_logs.all()}

            for channel in (
                NotificationDeliveryLog.CHANNEL_PUSH,
                NotificationDeliveryLog.CHANNEL_EMAIL,
            ):
                if channel in existing_channels:
                    continue

                pending_objects.append(
                    NotificationDeliveryLog(
                        notification=notification,
                        channel=channel,
                        status=NotificationDeliveryLog.STATUS_SKIPPED,
                        attempts=0,
                        metadata={
                            "reason": "historical_notification_without_delivery_trace",
                            "backfilled": True,
                        },
                    )
                )

            if len(pending_objects) >= batch_size:
                created_logs += self._flush(pending_objects, dry_run=dry_run)
                pending_objects = []

        if pending_objects:
            created_logs += self._flush(pending_objects, dry_run=dry_run)

        mode = "DRY RUN" if dry_run else "OK"
        self.stdout.write(
            self.style.SUCCESS(
                f"[{mode}] Notificaciones revisadas: {processed_notifications}. "
                f"Logs creados: {created_logs}."
            )
        )

    def _flush(self, objects, *, dry_run: bool) -> int:
        if dry_run:
            return len(objects)

        with transaction.atomic():
            NotificationDeliveryLog.objects.bulk_create(objects, ignore_conflicts=True)
        return len(objects)