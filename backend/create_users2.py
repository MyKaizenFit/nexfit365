from django.contrib.auth import get_user_model
from accounts.models import UserProfile

User = get_user_model()

# Datos de los 8 usuarios
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
        UserProfile.objects.get_or_create(user=user)
        created += 1
        print(f"✅ {user_data['email']}")
    except Exception as e:
        print(f"❌ {user_data['email']}: {str(e)}")

print(f"\n✅ Usuarios creados: {created}/{len(users_data)}")
print(f"📊 Total: {User.objects.count()}")
