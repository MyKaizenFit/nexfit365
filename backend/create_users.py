import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, '/srv/mykaizenfit/pro/backend')
django.setup()

from django.contrib.auth import get_user_model
from accounts.models import UserProfile

User = get_user_model()

# Datos demo. No usar datos reales ni contrasenas operativas en este script.
users_data = [
    {"email": "admin@example.invalid", "password": "ChangeMe123!", "phone": None},
    {"email": "member@example.invalid", "password": "ChangeMe123!", "phone": None},
    {"email": "member2@example.invalid", "password": "ChangeMe123!", "phone": None},
    {"email": "demo-user-1@example.invalid", "password": "ChangeMe123!", "phone": None},
    {"email": "demo-user-2@example.invalid", "password": "ChangeMe123!", "phone": None},
    {"email": "demo-user-3@example.invalid", "password": "ChangeMe123!", "phone": None},
    {"email": "demo-user-4@example.invalid", "password": "ChangeMe123!", "phone": None},
    {"email": "demo-user-5@example.invalid", "password": "ChangeMe123!", "phone": None},
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
