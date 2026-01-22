#!/usr/bin/env python
"""
Script simple para ver usuarios en la base de datos
"""
import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from accounts.models import CustomUser


total = CustomUser.objects.count()

if total == 0:
else:
    for user in CustomUser.objects.all().order_by('date_joined'):
        if user.last_login:
    
    # Resumen
    
    # Por rol
    for role_code, role_name in CustomUser._meta.get_field('role').choices:
        count = CustomUser.objects.filter(role=role_code).count()
        if count > 0:


