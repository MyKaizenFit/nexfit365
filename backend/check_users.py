#!/usr/bin/env python
"""
Script para verificar usuarios en la base de datos
"""
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def check_users():
    """Verificar usuarios en la base de datos"""
    try:
        users = User.objects.all()
        
        
        for user in users:
        
        return True
        
    except Exception as e:
        return False

if __name__ == "__main__":
    success = check_users()
    sys.exit(0 if success else 1)





















