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
                'email': 'admin@mykaizenfit.com',
                'password': 'temp123456',
                'first_name': 'Admin',
                'last_name': 'User',
                'is_staff': True,
                'is_superuser': True,
            },
            {
                'email': 'usuario@test.com',
                'password': 'temp123456',
                'first_name': 'Usuario',
                'last_name': 'Test',
                'is_staff': False,
                'is_superuser': False,
            },
            {
                'email': 'test2@gmail.com',
                'password': 'temp123456',
                'first_name': 'Test',
                'last_name': 'Two',
                'is_staff': False,
                'is_superuser': False,
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
        
        self.stdout.write(f"\nTotal: {CustomUser.objects.count()}")
