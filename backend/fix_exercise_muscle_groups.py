#!/usr/bin/env python
"""
Script para corregir grupos musculares en ejercicios con problemas de encoding
"""
import os
import sys
import django
import json

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from workouts.models import Exercise

# Mapeo de correcciones para grupos musculares
MUSCLE_GROUP_FIXES = {
    'gl??teos': 'glúteos',
    'gl??teo': 'glúteo',
    'b??ceps': 'bíceps',
    'tr??ceps': 'tríceps',
    'cu??driceps': 'cuádriceps',
    'isquiotibiales': 'isquiotibiales',  # Ya está bien
    'dorsales': 'dorsales',  # Ya está bien
    'trapecio': 'trapecio',  # Ya está bien
    'romboides': 'romboides',  # Ya está bien
    'erectores espinales': 'erectores espinales',  # Ya está bien
    'gemelos': 'gemelos',  # Ya está bien
}

def fix_muscle_groups():
    """Corrige grupos musculares en ejercicios"""
    print("="*70)
    print("🔧 CORRIGIENDO GRUPOS MUSCULARES EN EJERCICIOS")
    print("="*70)
    
    # Buscar ejercicios con problemas en muscle_groups
    all_exercises = Exercise.objects.filter(muscle_groups__isnull=False)
    total = all_exercises.count()
    print(f"📋 Total de ejercicios con grupos musculares: {total}\n")
    
    fixed_count = 0
    for exercise in all_exercises:
        if not exercise.muscle_groups:
            continue
        
        updated = False
        fixed_groups = []
        
        for group in exercise.muscle_groups:
            if isinstance(group, str):
                original = group
                fixed = group
                
                # Aplicar correcciones específicas
                for wrong, correct in MUSCLE_GROUP_FIXES.items():
                    fixed = fixed.replace(wrong, correct)
                
                # Corregir patrones comunes
                fixed = fixed.replace('??', 'ú')  # gl??teos -> glúteos
                fixed = fixed.replace('??', 'í')  # b??ceps -> bíceps
                
                # Correcciones más específicas
                if 'gl??' in fixed.lower():
                    fixed = fixed.replace('gl??', 'glú')
                if 'b??' in fixed.lower():
                    fixed = fixed.replace('b??', 'bí')
                if 'tr??' in fixed.lower():
                    fixed = fixed.replace('tr??', 'trí')
                if 'cu??' in fixed.lower():
                    fixed = fixed.replace('cu??', 'cuá')
                
                if fixed != original:
                    updated = True
                    print(f"  🔧 {exercise.name}: '{original}' -> '{fixed}'")
                
                fixed_groups.append(fixed)
            else:
                fixed_groups.append(group)
        
        if updated:
            exercise.muscle_groups = fixed_groups
            try:
                exercise.save()
                fixed_count += 1
                print(f"  ✅ Ejercicio '{exercise.name}' corregido")
            except Exception as e:
                print(f"  ❌ Error guardando '{exercise.name}': {e}")
    
    print(f"\n✅ Ejercicios corregidos: {fixed_count}/{total}")
    return fixed_count

if __name__ == '__main__':
    total_fixed = fix_muscle_groups()
    print("\n" + "="*70)
    print(f"✅ PROCESO COMPLETADO")
    print(f"   Total de ejercicios corregidos: {total_fixed}")
    print("="*70)

