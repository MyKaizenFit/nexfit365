# accounts/management/commands/assign_missing_plans.py
"""
Comando para asignar planes a usuarios que no tienen planes activos.
"""
from django.core.management.base import BaseCommand
from accounts.models import CustomUser
from accounts.services import assign_default_plans_to_user
from workouts.models import WorkoutProgram
from nutrition.models import NutritionPlan


class Command(BaseCommand):
    help = 'Asignar planes por defecto a usuarios que no tienen planes activos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Solo mostrar qué se haría sin realizar cambios',
        )
        parser.add_argument(
            '--email',
            type=str,
            help='Asignar solo a un usuario específico por email',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        specific_email = options.get('email')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('=== MODO DRY-RUN (sin cambios) ===\n'))
        
        # Obtener usuarios
        if specific_email:
            users = CustomUser.objects.filter(email=specific_email)
        else:
            users = CustomUser.objects.filter(is_active=True)
        
        self.stdout.write(f'Revisando {users.count()} usuarios...\n')
        
        assigned_workout = 0
        assigned_nutrition = 0
        skipped = 0
        
        for user in users:
            has_workout = WorkoutProgram.objects.filter(user=user, is_active=True).exists()
            has_nutrition = NutritionPlan.objects.filter(user=user, is_active=True).exists()
            
            if has_workout and has_nutrition:
                skipped += 1
                continue
            
            self.stdout.write(f'\n👤 {user.email}:')
            
            if not has_workout:
                self.stdout.write('   ❌ Sin plan de entrenamiento')
            if not has_nutrition:
                self.stdout.write('   ❌ Sin plan nutricional')
            
            if dry_run:
                self.stdout.write(self.style.WARNING('   → Se asignarían planes'))
                continue
            
            # Asignar planes
            try:
                results = assign_default_plans_to_user(user)
                
                if results['workout_program']:
                    assigned_workout += 1
                    self.stdout.write(self.style.SUCCESS(
                        f'   ✅ Entrenamiento: {results["workout_program"].name}'
                    ))
                elif not has_workout:
                    self.stdout.write(self.style.WARNING(
                        '   ⚠️ No se pudo asignar programa de entrenamiento'
                    ))
                
                if results['nutrition_plan']:
                    assigned_nutrition += 1
                    self.stdout.write(self.style.SUCCESS(
                        f'   ✅ Nutrición: {results["nutrition_plan"].name}'
                    ))
                elif not has_nutrition:
                    self.stdout.write(self.style.WARNING(
                        '   ⚠️ No se pudo asignar plan nutricional'
                    ))
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'   ❌ Error: {str(e)}'))
        
        # Resumen
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(self.style.SUCCESS(f'Programas de entrenamiento asignados: {assigned_workout}'))
        self.stdout.write(self.style.SUCCESS(f'Planes nutricionales asignados: {assigned_nutrition}'))
        self.stdout.write(f'Usuarios omitidos (ya tienen planes): {skipped}')


