"""
Comando para eliminar todos los ejercicios y planes de entrenamiento
"""
from django.core.management.base import BaseCommand
from workouts.models import (
    Exercise, 
    WorkoutPlanTemplate, 
    WorkoutPlanDay, 
    WorkoutPlanExercise,
    DefaultWorkoutProgram,
    DefaultWorkoutDay,
    DefaultExercise
)


class Command(BaseCommand):
    help = 'Elimina todos los ejercicios y planes de entrenamiento de la base de datos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirmar que realmente quieres borrar todo',
        )

    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(
                self.style.ERROR(
                    '⚠️  ADVERTENCIA: Este comando eliminará TODOS los ejercicios y planes de entrenamiento.\n'
                    'Para ejecutarlo, añade la bandera --confirm'
                )
            )
            return

        self.stdout.write(self.style.WARNING('🗑️  Eliminando todos los datos de entrenamiento...'))

        # Contar antes de borrar
        exercises_count = Exercise.objects.count()
        plans_count = WorkoutPlanTemplate.objects.count()
        default_programs_count = DefaultWorkoutProgram.objects.count()

        # Eliminar en orden inverso de dependencias
        self.stdout.write('   Eliminando ejercicios de planes...')
        WorkoutPlanExercise.objects.all().delete()
        
        self.stdout.write('   Eliminando días de planes...')
        WorkoutPlanDay.objects.all().delete()
        
        self.stdout.write('   Eliminando planes de entrenamiento...')
        WorkoutPlanTemplate.objects.all().delete()
        
        self.stdout.write('   Eliminando ejercicios por defecto...')
        DefaultExercise.objects.all().delete()
        
        self.stdout.write('   Eliminando días por defecto...')
        DefaultWorkoutDay.objects.all().delete()
        
        self.stdout.write('   Eliminando programas por defecto...')
        DefaultWorkoutProgram.objects.all().delete()
        
        self.stdout.write('   Eliminando ejercicios...')
        Exercise.objects.all().delete()

        self.stdout.write(
            self.style.SUCCESS(
                f'✅ Eliminación completada:\n'
                f'   - {exercises_count} ejercicios eliminados\n'
                f'   - {plans_count} planes de entrenamiento eliminados\n'
                f'   - {default_programs_count} programas por defecto eliminados'
            )
        )

