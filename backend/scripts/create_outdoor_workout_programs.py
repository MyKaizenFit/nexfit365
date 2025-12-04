#!/usr/bin/env python
"""
Script para crear programas de entrenamiento para outdoor (aire libre)
"""
import os
import sys
import django

# Configurar Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from workouts.models import WorkoutProgram, Exercise
from accounts.models import CustomUser

def create_outdoor_workout_programs():
    """Crear programas de entrenamiento para outdoor"""
    print("🏃 Creando programas de entrenamiento para outdoor...\n")
    
    # Obtener admin para created_by
    admin = CustomUser.objects.filter(is_superuser=True).first()
    
    programs_data = [
        {
            'name': 'Plan Outdoor - Pérdida de Peso',
            'description': 'Programa de entrenamiento al aire libre enfocado en pérdida de peso. Combina cardio (running, sprints) con ejercicios de peso corporal. Ideal para parques, playas o cualquier espacio abierto.',
            'difficulty': 'beginner',
            'goal': 'weight_loss',
            'duration_weeks': 10,
            'days_per_week': 4,
            'is_template': True,
            'is_active': True,
            'equipment_needed': ['bodyweight', 'running_shoes'],
            'tags': ['outdoor', 'cardio', 'bodyweight', 'running', 'weight_loss'],
        },
        {
            'name': 'Plan Outdoor - Calistenia Muscular',
            'description': 'Programa de calistenia avanzada para ganancia muscular al aire libre. Incluye dominadas, fondos, pistol squats y progresiones avanzadas. Requiere barras de parque o similar.',
            'difficulty': 'intermediate',
            'goal': 'muscle_gain',
            'duration_weeks': 12,
            'days_per_week': 4,
            'is_template': True,
            'is_active': True,
            'equipment_needed': ['bodyweight', 'pull_up_bar', 'parallel_bars'],
            'tags': ['outdoor', 'calisthenics', 'bodyweight', 'muscle_gain', 'advanced'],
        },
        {
            'name': 'Plan Outdoor - Recomposición Activa',
            'description': 'Programa mixto para recomposición corporal al aire libre. Alterna entrenamiento de fuerza con peso corporal, cardio intervals y trabajo de core. Perfecto para transformación completa.',
            'difficulty': 'intermediate',
            'goal': 'body_recomposition',
            'duration_weeks': 8,
            'days_per_week': 4,
            'is_template': True,
            'is_active': True,
            'equipment_needed': ['bodyweight', 'resistance_bands'],
            'tags': ['outdoor', 'hiit', 'bodyweight', 'recomposition', 'functional'],
        },
        {
            'name': 'Plan Outdoor - Mantenimiento Saludable',
            'description': 'Programa de mantenimiento al aire libre. Combina caminatas, trote suave y ejercicios básicos de movilidad. Ideal para mantener un estilo de vida activo y saludable.',
            'difficulty': 'beginner',
            'goal': 'general_fitness',
            'duration_weeks': 8,
            'days_per_week': 3,
            'is_template': True,
            'is_active': True,
            'equipment_needed': ['bodyweight'],
            'tags': ['outdoor', 'walking', 'jogging', 'mobility', 'wellness'],
        },
    ]
    
    created_programs = {}
    created_count = 0
    skipped_count = 0
    
    for program_data in programs_data:
        # Verificar si ya existe
        existing = WorkoutProgram.objects.filter(name=program_data['name']).first()
        
        if existing:
            print(f"⏭️  Ya existe: {program_data['name']}")
            created_programs[program_data['goal']] = existing
            skipped_count += 1
            continue
        
        # Crear programa
        program = WorkoutProgram.objects.create(
            name=program_data['name'],
            description=program_data['description'],
            difficulty=program_data['difficulty'],
            goal=program_data['goal'],
            duration_weeks=program_data['duration_weeks'],
            days_per_week=program_data['days_per_week'],
            is_template=program_data['is_template'],
            is_active=program_data['is_active'],
            equipment_needed=program_data['equipment_needed'],
            tags=program_data['tags'],
            created_by=admin
        )
        
        created_programs[program_data['goal']] = program
        
        print(f"✅ Creado: {program.name}")
        print(f"   🎯 Objetivo: {program.goal}")
        print(f"   📅 Duración: {program.duration_weeks} semanas")
        print(f"   💪 Nivel: {program.difficulty}")
        created_count += 1
    
    print(f"\n{'='*60}")
    print(f"✅ Programas outdoor creados/verificados")
    print(f"   Programas creados: {created_count}")
    print(f"   Programas existentes: {skipped_count}")
    print(f"{'='*60}\n")
    
    return created_programs

if __name__ == '__main__':
    create_outdoor_workout_programs()

