#!/usr/bin/env python
"""
Comando para refrescar los ejercicios de los planes de entrenamiento de usuarios
aplicando la nueva lógica mejorada de asignación.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import CustomUser
from workouts.models import WorkoutProgram, WorkoutDay, WorkoutDayExercise
from workouts.services import PersonalizedWorkoutService


class Command(BaseCommand):
    help = 'Refresca los ejercicios de los planes de entrenamiento de usuarios con la nueva lógica mejorada'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user-email',
            type=str,
            help='Email del usuario específico a refrescar (opcional)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simular sin hacer cambios reales',
        )

    def handle(self, *args, **options):
        user_email = options.get('user_email')
        dry_run = options.get('dry_run', False)
        
        self.stdout.write('=' * 70)
        self.stdout.write('🔄 REFRESCANDO EJERCICIOS DE USUARIOS')
        self.stdout.write('=' * 70)
        
        if dry_run:
            self.stdout.write(self.style.WARNING('⚠️  MODO DRY-RUN: No se harán cambios reales\n'))
        
        # Obtener usuarios
        if user_email:
            users = CustomUser.objects.filter(email=user_email)
            if not users.exists():
                self.stdout.write(self.style.ERROR(f'❌ Usuario con email {user_email} no encontrado'))
                return
        else:
            # Obtener todos los usuarios con planes activos
            users = CustomUser.objects.filter(
                workout_programs__is_active=True
            ).distinct()
        
        total_users = users.count()
        self.stdout.write(f'\n📋 Usuarios encontrados: {total_users}\n')
        
        if total_users == 0:
            self.stdout.write(self.style.WARNING('⚠️  No se encontraron usuarios con planes activos'))
            return
        
        refreshed_count = 0
        error_count = 0
        
        for user in users:
            self.stdout.write(f'\n👤 Procesando: {user.email} ({user.get_full_name() or "Sin nombre"})')
            
            # Obtener planes activos del usuario
            active_programs = WorkoutProgram.objects.filter(
                user=user,
                is_active=True
            )
            
            if not active_programs.exists():
                self.stdout.write('  ⏭️  No tiene planes activos, saltando...')
                continue
            
            for program in active_programs:
                self.stdout.write(f'\n  📋 Plan: {program.name}')
                self.stdout.write(f'     Días por semana: {program.days_per_week}')
                self.stdout.write(f'     Objetivo: {program.goal}')
                
                # Obtener días existentes
                existing_days = WorkoutDay.objects.filter(program=program)
                existing_exercises_count = WorkoutDayExercise.objects.filter(
                    workout_day__program=program
                ).count()
                
                self.stdout.write(f'     Días existentes: {existing_days.count()}')
                self.stdout.write(f'     Ejercicios existentes: {existing_exercises_count}')
                
                if dry_run:
                    self.stdout.write('  🔍 DRY-RUN: Se eliminarían los días y ejercicios existentes')
                    self.stdout.write('  🔍 DRY-RUN: Se crearían nuevos días con la nueva lógica')
                    continue
                
                try:
                    # Eliminar días existentes (esto también elimina los ejercicios por CASCADE)
                    deleted_days = existing_days.count()
                    deleted_exercises = existing_exercises_count
                    
                    existing_days.delete()
                    self.stdout.write(f'  🗑️  Eliminados {deleted_days} días y {deleted_exercises} ejercicios')
                    
                    # Recrear días con la nueva lógica
                    service = PersonalizedWorkoutService(user)
                    workout_duration = service.get_workout_duration()
                    
                    # Usar el método privado para crear días
                    service._create_workout_days(program, workout_duration)
                    
                    # Verificar resultados
                    new_days = WorkoutDay.objects.filter(program=program)
                    new_exercises = WorkoutDayExercise.objects.filter(
                        workout_day__program=program
                    )
                    
                    # Agrupar ejercicios por día para mostrar resumen
                    self.stdout.write(f'\n  ✅ Nuevos días creados: {new_days.count()}')
                    self.stdout.write(f'  ✅ Nuevos ejercicios creados: {new_exercises.count()}')
                    
                    # Mostrar resumen por día
                    for day in new_days.order_by('day_number'):
                        day_exercises = new_exercises.filter(workout_day=day)
                        exercise_names = [ex.exercise.name for ex in day_exercises]
                        unique_exercises = len(set(exercise_names))
                        
                        self.stdout.write(f'\n     📅 {day.name}')
                        self.stdout.write(f'        Ejercicios: {day_exercises.count()} (únicos: {unique_exercises})')
                        
                        # Verificar duplicados
                        if len(exercise_names) != unique_exercises:
                            duplicates = [name for name in exercise_names if exercise_names.count(name) > 1]
                            self.stdout.write(self.style.WARNING(
                                f'        ⚠️  Duplicados encontrados: {set(duplicates)}'
                            ))
                        else:
                            self.stdout.write('        ✅ Sin duplicados')
                    
                    refreshed_count += 1
                    self.stdout.write(self.style.SUCCESS(f'\n  ✅ Plan refrescado exitosamente'))
                    
                except Exception as e:
                    error_count += 1
                    self.stdout.write(self.style.ERROR(f'\n  ❌ Error al refrescar plan: {str(e)}'))
                    import traceback
                    self.stdout.write(traceback.format_exc())
        
        # Resumen final
        self.stdout.write('\n' + '=' * 70)
        self.stdout.write('📊 RESUMEN')
        self.stdout.write('=' * 70)
        self.stdout.write(f'✅ Planes refrescados: {refreshed_count}')
        if error_count > 0:
            self.stdout.write(self.style.ERROR(f'❌ Errores: {error_count}'))
        self.stdout.write('=' * 70 + '\n')

