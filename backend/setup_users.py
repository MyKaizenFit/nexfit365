#!/usr/bin/env python
"""Crear usuarios de bootstrap. Passwords solo vía entorno (sin defaults en repo)."""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()


def setup_users():
    admin_email = os.environ.get('BOOTSTRAP_ADMIN_EMAIL', 'admin@example.invalid')
    admin_password = os.environ.get('BOOTSTRAP_ADMIN_PASSWORD')
    if not admin_password:
        raise SystemExit('Set BOOTSTRAP_ADMIN_PASSWORD (no default password in repo)')

    if User.objects.filter(email=admin_email).exists():
        admin_user = User.objects.get(email=admin_email)
        admin_user.set_password(admin_password)
        admin_user.save(update_fields=['password'])
    else:
        User.objects.create_superuser(
            email=admin_email,
            password=admin_password,
            first_name='Administrador',
            last_name='Nex-Fit',
            role='admin',
        )

    user_email = os.environ.get('BOOTSTRAP_MEMBER_EMAIL', 'member@example.invalid')
    user_password = os.environ.get('BOOTSTRAP_MEMBER_PASSWORD')
    if not user_password:
        raise SystemExit('Set BOOTSTRAP_MEMBER_PASSWORD (no default password in repo)')

    if User.objects.filter(email=user_email).exists():
        normal_user = User.objects.get(email=user_email)
        normal_user.set_password(user_password)
        normal_user.save(update_fields=['password'])
    else:
        User.objects.create_user(
            email=user_email,
            password=user_password,
            first_name='Usuario',
            last_name='Prueba',
            role='basic',
        )

    return True


if __name__ == '__main__':
    try:
        setup_users()
    except SystemExit:
        raise
    except Exception:
        sys.exit(1)
    sys.exit(0)
