import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# Verificar si ya existen usuarios
print(f"Usuarios existentes: {User.objects.count()}")

# Crear usuario administrador
admin_email = 'admin@mykaizenfit.com'
admin_password = 'AdminNex-Fit123!'

try:
    if User.objects.filter(email=admin_email).exists():
        admin_user = User.objects.get(email=admin_email)
        print(f'Admin user already exists: {admin_user.email}')
    else:
        admin_user = User.objects.create_superuser(
            email=admin_email,
            password=admin_password,
            first_name='Admin',
            last_name='User'
        )
        print(f'Admin user created: {admin_user.email}')
except Exception as e:
    print(f'Error creating admin user: {e}')

# Crear usuario normal
user_email = 'usuario@test.com'
user_password = 'UsuarioTest123!'

try:
    if User.objects.filter(email=user_email).exists():
        normal_user = User.objects.get(email=user_email)
        print(f'Normal user already exists: {normal_user.email}')
    else:
        normal_user = User.objects.create_user(
            email=user_email,
            password=user_password,
            first_name='Usuario',
            last_name='Prueba'
        )
        print(f'Normal user created: {normal_user.email}')
except Exception as e:
    print(f'Error creating normal user: {e}')

print(f'Total users: {User.objects.count()}')

# Mostrar todos los usuarios
for user in User.objects.all():
    print(f'User: {user.email}, is_staff: {user.is_staff}, is_superuser: {user.is_superuser}')





















