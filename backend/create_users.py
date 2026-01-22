import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, '/srv/mykaizenfit/pro/backend')
django.setup()

from django.contrib.auth import get_user_model
from accounts.models import UserProfile

User = get_user_model()

# Datos de los 8 usuarios originales
users_data = [
    {"email": "admin@example.invalid", "password": "CHANGE_ME_PASSWORD", "phone": None},
    {"email": "user@example.invalid", "password": "CHANGE_ME_PASSWORD", "phone": None},
    {"email": "demo-user-1@example.invalid", "password": "CHANGE_ME_PASSWORD", "phone": None},
    {"email": "demo-user-2@example.invalid", "password": "CHANGE_ME_PASSWORD", "phone": "000000000"},
    {"email": "demo-user-3@example.invalid", "password": "CHANGE_ME_PASSWORD", "phone": "000000000"},
    {"email": "demo-user-4@example.invalid", "password": "CHANGE_ME_PASSWORD", "phone": "642855638"},
    {"email": "prueba@test.com", "password": "CHANGE_ME_PASSWORD", "phone": "123123123"},
    {"email": "demo-user-5@example.invalid", "password": "CHANGE_ME_PASSWORD", "phone": "000000000"},
]

print("📝 Creando 8 usuarios...")
print("")

created = 0
for user_data in users_data:
    try:
        user = User.objects.create_user(
            email=user_data["email"],
            password=user_data["password"],
            phone_number=user_data["phone"]
        )
        user.is_active = True
        user.save()
        
        # Crear perfil
        UserProfile.objects.get_or_create(user=user)
        
        created += 1
        print(f"✅ {user_data['email']}")
    except Exception as e:
        print(f"❌ {user_data['email']}: {str(e)}")

print("")
print(f"✅ Usuarios creados: {created}/{len(users_data)}")

# Verificar
count = User.objects.count()
print(f"📊 Total usuarios en BD: {count}")
