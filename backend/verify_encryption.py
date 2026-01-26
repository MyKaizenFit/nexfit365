import os
import django
import base64
from cryptography.fernet import Fernet
from accounts.models import CustomUser
import json

def get_fernet():
    key = os.environ.get('SENSITIVE_DATA_KEY')
    if not key:
        raise Exception('SENSITIVE_DATA_KEY no definida')
    return Fernet(key.encode())

def is_encrypted(value):
    return isinstance(value, str) and value.startswith('gAAAA')

def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    django.setup()
    fernet = get_fernet()
    fields = [
        'email', 'phone_number', 'profile_picture', 'birth_date', 'gender',
        'weight', 'height', 'target_weight', 'allergies', 'disliked_foods',
        'medical_conditions', 'injuries_or_medical_issues', 'password_reset_token'
    ]
    total = CustomUser.objects.count()
    encrypted = {field: 0 for field in fields}
    not_encrypted = {field: 0 for field in fields}
    for user in CustomUser.objects.all():
        for field in fields:
            val = getattr(user, field, None)
            if val and is_encrypted(val):
                encrypted[field] += 1
            elif val:
                not_encrypted[field] += 1
    print(f"Total usuarios: {total}")
    for field in fields:
        print(f"{field}: {encrypted[field]} encriptados, {not_encrypted[field]} sin encriptar")

if __name__ == '__main__':
    main()
