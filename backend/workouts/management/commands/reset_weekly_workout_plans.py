"""
Comando legado para mantener compatibilidad con despliegues antiguos.
Los planes ya no se reinician semanalmente; solo se asegura start_date si falta.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
from workouts.models import WorkoutProgram
from workouts.services import reset_weekly_workout_plan_if_needed

class Command(BaseCommand):
    help = 'Inicializa start_date en planes activos antiguos que no la tengan'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Forzar reinicio incluso si no es lunes'
        )

    def handle(self, *args, **options):
        force = options['force']
        today = timezone.now().date()
        
        # Se mantiene la opción por compatibilidad con automatizaciones existentes.
        if today.weekday() != 0 and not force:
            self.stdout.write(self.style.WARNING(
                f"⚠️  Hoy es {today.strftime('%A')}, no lunes. "
                "Usa --force para ejecutar de todas formas."
            ))
            return
        
        self.stdout.write("=" * 70)
        self.stdout.write(self.style.SUCCESS("🔄 REVISANDO PLANES ACTIVOS SIN FECHA DE INICIO"))
        self.stdout.write("=" * 70 + "\n")
        
        # Obtener todos los planes activos de usuarios sin end_date para asegurar
        # que tengan start_date, sin mover su ventana temporal.
        active_plans = WorkoutProgram.objects.filter(
            user__isnull=False,
            is_active=True,
            end_date__isnull=True
        ).select_related('user').prefetch_related('days')
        
        self.stdout.write(f"📋 Encontrados {active_plans.count()} planes para revisar\n")
        
        reset_count = 0
        
        for plan in active_plans:
            try:
                previous_start_date = plan.start_date
                updated_plan = reset_weekly_workout_plan_if_needed(plan)
                
                if previous_start_date != updated_plan.start_date:
                    self.stdout.write(f"   ✅ Fecha de inicio inicializada: {plan.name} (Usuario: {plan.user.email})")
                    self.stdout.write(f"      Fecha de inicio: {updated_plan.start_date}")
                    reset_count += 1
                else:
                    self.stdout.write(f"   ℹ️  Plan sin cambios: {plan.name} (Usuario: {plan.user.email})")
                    self.stdout.write(f"      Fecha de inicio actual: {plan.start_date}")
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(
                    f"   ❌ Error revisando plan {plan.name}: {str(e)}"
                ))
        
        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(self.style.SUCCESS(f"✅ Proceso completado"))
        self.stdout.write(f"   Planes actualizados: {reset_count}")
        self.stdout.write("=" * 70)






