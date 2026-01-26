import os
import django
import base64
from cryptography.fernet import Fernet
from django.conf import settings
from accounts.models import CustomUser
from django.db import transaction
import json

def get_fernet():
    key = os.environ.get('SENSITIVE_DATA_KEY')
    if not key:
        key = base64.urlsafe_b64encode(os.urandom(32)).decode()
        print('Clave generada para encriptación:', key)
        return Fernet(key)
    return Fernet(key.encode())

def encrypt_field(value, fernet):
    if value is None:
        return value
    if isinstance(value, (int, float)):
        value = str(value)
    if isinstance(value, (dict, list)):
        value = json.dumps(value, ensure_ascii=False)
    if value and not str(value).startswith('gAAAA'):
        return fernet.encrypt(str(value).encode()).decode()
    return value

def encrypt_user_fields(user, fernet):
    changed = False
    fields = [
        'email', 'phone_number', 'profile_picture', 'birth_date', 'gender',
        'weight', 'height', 'target_weight', 'allergies', 'disliked_foods',
        'medical_conditions', 'injuries_or_medical_issues', 'password_reset_token'
    ]
    for field in fields:
        val = getattr(user, field, None)
        enc = encrypt_field(val, fernet)
        if enc != val:
            setattr(user, field, enc)
            changed = True
    return changed

def encrypt_profile_audit_logs(fernet):
    from accounts.models import ProfileAuditLog
    count = 0
    for log in ProfileAuditLog.objects.all():
        changes = log.changes
        if changes:
            enc = encrypt_field(changes, fernet)
            if enc != changes:
                log.changes = enc
                log.save()
                count += 1
    print(f"ProfileAuditLog encriptados: {count}")

def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    django.setup()
    fernet = get_fernet()
    count = 0
    with transaction.atomic():
        for user in CustomUser.objects.all():
            if encrypt_user_fields(user, fernet):
                user.save()
                count += 1
    print(f"Usuarios actualizados y encriptados: {count}")
    encrypt_profile_audit_logs(fernet)

if __name__ == '__main__':
    main()
