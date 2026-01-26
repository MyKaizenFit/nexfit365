import os
import django
from accounts.models import CustomUser

def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    django.setup()
    user = CustomUser.objects.filter(email='admin@example.invalid').first()
    if user:
        print(f"Email: {user.email}")
        print(f"Phone: {user.phone_number}")
        print(f"Profile picture: {user.profile_picture}")
        print(f"Birth date: {user.birth_date}")
        print(f"Gender: {user.gender}")
        print(f"Weight: {user.weight}")
        print(f"Height: {user.height}")
        print(f"Target weight: {user.target_weight}")
        print(f"Allergies: {user.allergies}")
        print(f"Disliked foods: {user.disliked_foods}")
        print(f"Medical conditions: {user.medical_conditions}")
        print(f"Injuries/medical issues: {user.injuries_or_medical_issues}")
        print(f"Password reset token: {user.password_reset_token}")
    else:
        print("Admin user not found")

if __name__ == '__main__':
    main()
