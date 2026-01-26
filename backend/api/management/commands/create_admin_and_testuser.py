from django.core.management.base import BaseCommand
from accounts.models import CustomUser

class Command(BaseCommand):
    help = 'Crea el usuario administrador y el usuario de prueba con los datos solicitados'

    def handle(self, *args, **kwargs):
        # Crear o actualizar admin
        admin_email = "admin@mykaizenfit.com"
        admin_password = "AdminNex-Fit123!"
        admin, created = CustomUser.objects.update_or_create(
            email=admin_email,
            defaults={
                "is_staff": True,
                "is_superuser": True,
                "first_name": "Admin",
                "last_name": "NexFit"
            }
        )
        admin.set_password(admin_password)
        admin.save()
        self.stdout.write(self.style.SUCCESS(f'Usuario ADMIN actualizado/creado: {admin_email}'))

        # Crear o actualizar usuario de prueba
        test_email = "usuario@test.com"
        test_password = "Test123!"
        test_user, created = CustomUser.objects.update_or_create(
            email=test_email,
            defaults={
                "is_staff": False,
                "is_superuser": False,
                "first_name": "María",
                "last_name": "García López"
            }
        )
        test_user.set_password(test_password)
        test_user.save()
        self.stdout.write(self.style.SUCCESS(f'Usuario de prueba actualizado/creado: {test_email}'))
