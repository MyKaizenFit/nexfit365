#!/usr/bin/env python
"""
Script para limpiar entrenamientos de prueba
"""

import os
import sys
import django
from datetime import datetime, timedelta

# Configurar Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from workouts.models import WorkoutLog

User = get_user_model()

def clean_workout_logs():
    """Elimina todos los logs de entrenamientos del usuario de prueba"""
    
    try:
        user = User.objects.get(email='usuario@test.com')
        print(f"✓ Usuario encontrado: {user.email}")
    except User.DoesNotExist:
        print("✗ Usuario 'usuario@test.com' no encontrado")
        return
    
    # Contar entrenamientos existentes
    existing_logs = WorkoutLog.objects.filter(user=user)
    count = existing_logs.count()
    
    if count == 0:
        print("ℹ No hay entrenamientos para eliminar")
        return
    
    print(f"\n📊 Entrenamientos existentes: {count}")
    print(f"   Fecha más antigua: {existing_logs.order_by('date').first().date}")
    print(f"   Fecha más reciente: {existing_logs.order_by('-date').first().date}")
    
    # Eliminar todos
    existing_logs.delete()
    
    print(f"\n✓ Se eliminaron {count} entrenamientos")
    print("✅ Listo para regenerar historial limpio")


if __name__ == '__main__':
    print("=" * 60)
    print("Limpiador de Historial de Entrenamientos")
    print("=" * 60)
    print()
    
    clean_workout_logs()
