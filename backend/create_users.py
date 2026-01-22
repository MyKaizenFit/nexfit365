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
    {"email": "admin@mykaizenfit.com", "password": "temp123456", "phone": None},
    {"email": "usuario@test.com", "password": "temp123456", "phone": None},
    {"email": "test2@gmail.com", "password": "temp123456", "phone": None},
    {"email": "hjgf@jhg.ci", "password": "temp123456", "phone": "234234234"},
    {"email": "saraottum@gmail.com", "password": "temp123456", "phone": "601401727"},
    {"email": "raptoraitor32@gmail.com", "password": "temp123456", "phone": "642855638"},
    {"email": "prueba@test.com", "password": "temp123456", "phone": "123123123"},
    {"email": "frosiris50@gmail.com", "password": "temp123456", "phone": "000000000"},
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
