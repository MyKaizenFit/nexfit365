import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# Crear usuario administrador
try:
    admin_user = User.objects.create_superuser(
        email='admin@example.invalid',
        password='AdminNex-Fit123!',
        first_name='Admin',
        last_name='User'
    )
    print('Admin user created successfully')
except Exception as e:
    print(f'Admin user error: {e}')

# Crear usuario normal
try:
    normal_user = User.objects.create_user(
        email='user@example.invalid',
        password='UsuarioTest123!',
        first_name='Usuario',
        last_name='Prueba'
    )
    print('Normal user created successfully')
except Exception as e:
    print(f'Normal user error: {e}')

print(f'Total users: {User.objects.count()}')





















