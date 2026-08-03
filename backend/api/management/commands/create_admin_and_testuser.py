from django.core.management.base import BaseCommand, CommandError
from accounts.models import CustomUser
import os


class Command(BaseCommand):
    help = (
        "Crea/actualiza admin y usuario de prueba. "
        "Requiere BOOTSTRAP_ADMIN_PASSWORD y BOOTSTRAP_MEMBER_PASSWORD en el entorno."
    )

    def handle(self, *args, **kwargs):
        admin_email = os.environ.get("BOOTSTRAP_ADMIN_EMAIL", "admin@example.invalid")
        admin_password = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD")
        if not admin_password:
            raise CommandError("Set BOOTSTRAP_ADMIN_PASSWORD (no default password in repo)")

        admin, _created = CustomUser.objects.update_or_create(
            email=admin_email,
            defaults={
                "is_staff": True,
                "is_superuser": True,
                "first_name": "Admin",
                "last_name": "NexFit",
            },
        )
        admin.set_password(admin_password)
        admin.save()
        self.stdout.write(self.style.SUCCESS(f"Usuario ADMIN actualizado/creado: {admin_email}"))

        test_email = os.environ.get("BOOTSTRAP_MEMBER_EMAIL", "member@example.invalid")
        test_password = os.environ.get("BOOTSTRAP_MEMBER_PASSWORD")
        if not test_password:
            raise CommandError("Set BOOTSTRAP_MEMBER_PASSWORD (no default password in repo)")

        test_user, _created = CustomUser.objects.update_or_create(
            email=test_email,
            defaults={
                "is_staff": False,
                "is_superuser": False,
                "first_name": "Test",
                "last_name": "Member",
            },
        )
        test_user.set_password(test_password)
        test_user.save()
        self.stdout.write(self.style.SUCCESS(f"Usuario TEST actualizado/creado: {test_email}"))
