"""
Management command para crear usuarios
"""
from django.core.management.base import BaseCommand
from accounts.models import CustomUser

class Command(BaseCommand):
    help = 'Crear usuarios de prueba'

    def handle(self, *args, **options):
        users_data = [
            {
                'email': 'admin@example.invalid',
                'password': 'ChangeMe123!',
                'first_name': 'Admin',
                'last_name': 'User',
                'is_staff': True,
                'is_superuser': True,
                'phone_number': None,
            },
            {
                'email': 'member@example.invalid',
                'password': 'ChangeMe123!',
                'first_name': 'Usuario',
                'last_name': 'Test',
                'is_staff': False,
                'is_superuser': False,
                'phone_number': None,
            },
            {
                'email': 'member2@example.invalid',
                'password': 'ChangeMe123!',
                'first_name': 'Test',
                'last_name': 'Two',
                'is_staff': False,
                'is_superuser': False,
                'phone_number': None,
            },
            {
                'email': 'demo-user-1@example.invalid',
                'password': 'ChangeMe123!',
                'first_name': 'User',
                'last_name': 'Four',
                'is_staff': False,
                'is_superuser': False,
                'phone_number': None,
            },
            {
                'email': 'demo-user-2@example.invalid',
                'password': 'ChangeMe123!',
                'first_name': 'Demo',
                'last_name': 'Five',
                'is_staff': False,
                'is_superuser': False,
                'phone_number': None,
            },
            {
                'email': 'demo-user-3@example.invalid',
                'password': 'ChangeMe123!',
                'first_name': 'Demo',
                'last_name': 'Six',
                'is_staff': False,
                'is_superuser': False,
                'phone_number': None,
            },
            {
                'email': 'demo-user-4@example.invalid',
                'password': 'ChangeMe123!',
                'first_name': 'Prueba',
                'last_name': 'Test',
                'is_staff': False,
                'is_superuser': False,
                'phone_number': None,
            },
            {
                'email': 'demo-user-5@example.invalid',
                'password': 'ChangeMe123!',
                'first_name': 'Demo',
                'last_name': 'Eight',
                'is_staff': False,
                'is_superuser': False,
                'phone_number': None,
            },
        ]
        
        for data in users_data:
            email = data.pop('email')  # Sacar email del dict
            password = data.pop('password')  # Sacar password del dict
            
            if not CustomUser.objects.filter(email=email).exists():
                CustomUser.objects.create_user(email=email, password=password, **data)
                self.stdout.write(f"✅ Creado: {email}")
            else:
                self.stdout.write(f"⏭️  Existente: {email}")
        
        self.stdout.write(f"\n✅ Usuarios creados/restaurados exitosamente")
        self.stdout.write(f"📊 Total usuarios en BD: {CustomUser.objects.count()}")
