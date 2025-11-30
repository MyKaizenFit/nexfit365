#!/usr/bin/env python
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from accounts.models import CustomUser
from nutrition.models import NutritionPlan

users = CustomUser.objects.filter(email__startswith='usuario')

print("=" * 60)
print("CREDENCIALES DE USUARIOS DE PRUEBA")
print("=" * 60)

for user in users:
    print(f"\nEmail: {user.email}")
    print(f"Contrasena: Test1234!")
    print(f"Nombre: {user.get_full_name()}")
    print(f"Objetivo: {user.main_goal}")
    print(f"Actividad: {user.activity_level}")
    print(f"Dias entrenamiento: {user.training_days_per_week}")
    
    plans = NutritionPlan.objects.filter(user=user, is_active=True)
    print(f"Planes nutricionales activos: {plans.count()}")
    for plan in plans:
        print(f"  - {plan.name} ({plan.daily_calories} cal/dia)")
    
    print("-" * 60)

