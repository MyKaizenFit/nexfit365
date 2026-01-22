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
                'phone_number': None,
            },
            {
                'email': 'usuario@test.com',
                'password': 'temp123456',
                'first_name': 'Usuario',
                'last_name': 'Test',
                'is_staff': False,
                'is_superuser': False,
                'phone_number': None,
            },
            {
                'email': 'test2@gmail.com',
                'password': 'temp123456',
                'first_name': 'Test',
                'last_name': 'Two',
                'is_staff': False,
                'is_superuser': False,
                'phone_number': None,
            },
            # Recuperar los 5 usuarios perdidos (con teléfono)
            {
                'email': 'hjgf@jhg.ci',
                'password': 'temp123456',
                'first_name': 'User',
                'last_name': 'Four',
                'is_staff': False,
                'is_superuser': False,
                'phone_number': '234234234',
            },
            {
                'email': 'saraottum@gmail.com',
                'password': 'temp123456',
                'first_name': 'Sara',
                'last_name': 'Ottum',
                'is_staff': False,
                'is_superuser': False,
                'phone_number': '601401727',
            },
            {
                'email': 'raptoraitor32@gmail.com',
                'password': 'temp123456',
                'first_name': 'Raptor',
                'last_name': 'Aitor',
                'is_staff': False,
                'is_superuser': False,
                'phone_number': '642855638',
            },
            {
                'email': 'prueba@test.com',
                'password': 'temp123456',
                'first_name': 'Prueba',
                'last_name': 'Test',
                'is_staff': False,
                'is_superuser': False,
                'phone_number': '123123123',
            },
            {
                'email': 'frosiris50@gmail.com',
                'password': 'temp123456',
                'first_name': 'Fro',
                'last_name': 'Siris',
                'is_staff': False,
                'is_superuser': False,
                'phone_number': '000000000',
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
