from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from notifications.admin_views import (
    AUTOMATION_RULES,
    _build_weekly_brief,
    _collect_automation_snapshot,
    _run_automation_for_key,
)


class Command(BaseCommand):
    help = "Ejecuta las automatizaciones operativas y el reporte semanal desde cron o terminal."

    def add_arguments(self, parser):
        parser.add_argument(
            "--automation",
            default="all",
            choices=["all", *AUTOMATION_RULES.keys()],
            help="Automatización concreta a ejecutar o all para lanzar todas.",
        )
        parser.add_argument(
            "--admin-email",
            default=None,
            help="Email del admin/trainer que figurará como emisor de la automatización.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Muestra el alcance previsto sin crear notificaciones.",
        )

    def handle(self, *args, **options):
        snapshot = _collect_automation_snapshot()
        self.stdout.write(self.style.SUCCESS(_build_weekly_brief(snapshot)))
        self.stdout.write("")

        selected = options["automation"]
        automation_keys = list(AUTOMATION_RULES.keys()) if selected == "all" else [selected]

        if options["dry_run"]:
            self.stdout.write(self.style.WARNING("Modo simulación activado. No se enviarán notificaciones."))
            for key in automation_keys:
                config = AUTOMATION_RULES[key]
                segment_key = config["segment_key"]
                audience = snapshot["segments"].get(segment_key, 0)
                self.stdout.write(f"- {config['name']}: {audience} usuarios objetivo")
            return

        actor = self._resolve_actor(options.get("admin_email"))

        for key in automation_keys:
            result = _run_automation_for_key(key, actor)
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ {AUTOMATION_RULES[key]['name']}: {result['notifications_created']} notificaciones creadas"
                )
            )

    def _resolve_actor(self, admin_email=None):
        User = get_user_model()
        admin_qs = User.objects.filter(is_active=True).filter(
            is_superuser=True
        ) | User.objects.filter(is_active=True, is_staff=True)

        if admin_email:
            actor = admin_qs.filter(email=admin_email).first()
            if actor:
                return actor
            raise CommandError(f"No se encontró un admin activo con email {admin_email}")

        actor = admin_qs.order_by("date_joined").first()
        if actor:
            return actor

        raise CommandError("No hay ningún admin o staff activo para ejecutar las automatizaciones.")
