#!/usr/bin/env python
"""
Script para corregir nombres de usuarios y planes con problemas de encoding
Corrige específicamente "Maráa" -> "María", "Garcáa" -> "García", etc.
"""
import os
import sys
import django

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from accounts.models import CustomUser
from workouts.models import WorkoutProgram
from nutrition.models import NutritionPlan, PlanMeal
import re

# Mapeo de correcciones específicas
FIXES = {
    'Maráa': 'María',
    'Garcáa': 'García',
    'L??pez': 'López',
    'Rodr??guez': 'Rodríguez',
    'Gonz??lez': 'González',
    'Mart??nez': 'Martínez',
    'S??nchez': 'Sánchez',
    'P??rez': 'Pérez',
    'Fern??ndez': 'Fernández',
    'G??mez': 'Gómez',
    'D??az': 'Díaz',
    'Hern??ndez': 'Hernández',
    'Mu??oz': 'Muñoz',
    'Jim??nez': 'Jiménez',
    'Jos??': 'José',
}

def fix_text(text):
    """Corrige un texto con problemas de encoding"""
    if not text:
        return text
    
    fixed = str(text)
    
    # Aplicar correcciones específicas
    for wrong, correct in FIXES.items():
        fixed = fixed.replace(wrong, correct)
    
    # Corregir patrones comunes: letra + áa -> letra + í
    fixed = re.sub(r'([A-Za-z])áa', r'\1ía', fixed)
    
    # Corregir otros patrones comunes
    fixed = re.sub(r'([A-Za-z])á([A-Za-z])', lambda m: m.group(1) + 'í' + m.group(2) if m.group(2) in 'aeiou' else m.group(0), fixed)
    
    return fixed

def fix_users():
    """Corrige nombres de usuarios"""
    print("\n" + "="*70)
    print("🔧 CORRIGIENDO NOMBRES DE USUARIOS")
    print("="*70)
    
    # Buscar usuarios con problemas
    users = CustomUser.objects.filter(
        first_name__contains='áa'
    ) | CustomUser.objects.filter(
        last_name__contains='áa'
    ) | CustomUser.objects.filter(
        first_name__contains='??'
    ) | CustomUser.objects.filter(
        last_name__contains='??'
    )
    
    total = users.count()
    print(f"📋 Usuarios encontrados con problemas: {total}\n")
    
    if total == 0:
        print("✅ No hay usuarios con problemas de encoding")
        return 0
    
    fixed_count = 0
    for user in users:
        updated = False
        old_first = user.first_name
        old_last = user.last_name
        
        if user.first_name:
            new_first = fix_text(user.first_name)
            if new_first != user.first_name:
                user.first_name = new_first
                updated = True
                print(f"  ✅ {user.email}: '{old_first}' -> '{new_first}'")
        
        if user.last_name:
            new_last = fix_text(user.last_name)
            if new_last != user.last_name:
                user.last_name = new_last
                updated = True
                print(f"  ✅ {user.email}: '{old_last}' -> '{new_last}'")
        
        if updated:
            try:
                user.save()
                fixed_count += 1
            except Exception as e:
                print(f"  ❌ Error guardando {user.email}: {e}")
    
    print(f"\n✅ Usuarios corregidos: {fixed_count}/{total}")
    return fixed_count

def fix_workout_programs():
    """Corrige nombres de planes de entrenamiento"""
    print("\n" + "="*70)
    print("🔧 CORRIGIENDO PLANES DE ENTRENAMIENTO")
    print("="*70)
    
    programs = WorkoutProgram.objects.filter(
        name__contains='Maráa'
    ) | WorkoutProgram.objects.filter(
        name__contains='Garcáa'
    ) | WorkoutProgram.objects.filter(
        name__contains='??'
    )
    
    total = programs.count()
    print(f"📋 Planes encontrados con problemas: {total}\n")
    
    if total == 0:
        print("✅ No hay planes con problemas de encoding")
        return 0
    
    fixed_count = 0
    for program in programs:
        old_name = program.name
        new_name = fix_text(program.name)
        
        if new_name != old_name:
            print(f"  🔧 '{old_name}' -> '{new_name}'")
            program.name = new_name
            try:
                program.save()
                fixed_count += 1
                print(f"  ✅ Plan corregido")
            except Exception as e:
                print(f"  ❌ Error guardando: {e}")
    
    print(f"\n✅ Planes corregidos: {fixed_count}/{total}")
    return fixed_count

def fix_nutrition_plans():
    """Corrige nombres de planes nutricionales"""
    print("\n" + "="*70)
    print("🔧 CORRIGIENDO PLANES NUTRICIONALES")
    print("="*70)
    
    plans = NutritionPlan.objects.filter(
        name__contains='Maráa'
    ) | NutritionPlan.objects.filter(
        name__contains='Garcáa'
    ) | NutritionPlan.objects.filter(
        name__contains='??'
    )
    
    total = plans.count()
    print(f"📋 Planes encontrados con problemas: {total}\n")
    
    if total == 0:
        print("✅ No hay planes nutricionales con problemas de encoding")
        return 0
    
    fixed_count = 0
    for plan in plans:
        old_name = plan.name
        new_name = fix_text(plan.name)
        
        if new_name != old_name:
            print(f"  🔧 '{old_name}' -> '{new_name}'")
            plan.name = new_name
            try:
                plan.save()
                fixed_count += 1
                print(f"  ✅ Plan corregido")
            except Exception as e:
                print(f"  ❌ Error guardando: {e}")
    
    print(f"\n✅ Planes nutricionales corregidos: {fixed_count}/{total}")
    return fixed_count

def fix_plan_meals():
    """Corrige nombres de comidas de planes"""
    print("\n" + "="*70)
    print("🔧 CORRIGIENDO COMIDAS DE PLANES")
    print("="*70)
    
    # Buscar comidas con problemas de encoding
    meals = PlanMeal.objects.filter(
        name__contains='Maráa'
    ) | PlanMeal.objects.filter(
        name__contains='Garcáa'
    ) | PlanMeal.objects.filter(
        name__contains='??'
    ) | PlanMeal.objects.filter(
        name__contains='áa'
    )
    
    total = meals.count()
    print(f"📋 Comidas encontradas con problemas: {total}\n")
    
    if total == 0:
        print("✅ No hay comidas con problemas de encoding")
        return 0
    
    fixed_count = 0
    for meal in meals:
        old_name = meal.name
        new_name = fix_text(meal.name)
        
        if new_name != old_name:
            print(f"  🔧 '{old_name}' -> '{new_name}'")
            meal.name = new_name
            try:
                meal.save()
                fixed_count += 1
                print(f"  ✅ Comida corregida")
            except Exception as e:
                print(f"  ❌ Error guardando: {e}")
    
    print(f"\n✅ Comidas corregidas: {fixed_count}/{total}")
    return fixed_count

if __name__ == '__main__':
    print("="*70)
    print("🔧 CORRIGIENDO PROBLEMAS DE ENCODING EN NOMBRES")
    print("="*70)
    
    total_fixed = 0
    total_fixed += fix_users()
    total_fixed += fix_workout_programs()
    total_fixed += fix_nutrition_plans()
    total_fixed += fix_plan_meals()
    
    print("\n" + "="*70)
    print(f"✅ PROCESO COMPLETADO")
    print(f"   Total de objetos corregidos: {total_fixed}")
    print("="*70)

