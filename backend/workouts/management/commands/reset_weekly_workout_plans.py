"""
Comando para reiniciar planes de entrenamiento semanalmente
Este comando debe ejecutarse semanalmente (por ejemplo, cada lunes) para reiniciar los planes
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
from workouts.models import WorkoutProgram
from workouts.services import reset_weekly_workout_plan_if_needed

class Command(BaseCommand):
    help = 'Reinicia los planes de entrenamiento semanalmente (debe ejecutarse cada lunes)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Forzar reinicio incluso si no es lunes'
        )

    def handle(self, *args, **options):
        force = options['force']
        today = timezone.now().date()
        
        # Verificar que sea lunes (o forzar)
        if today.weekday() != 0 and not force:
            self.stdout.write(self.style.WARNING(
                f"⚠️  Hoy es {today.strftime('%A')}, no lunes. "
                "Usa --force para ejecutar de todas formas."
            ))
            return
        
        self.stdout.write("=" * 70)
        self.stdout.write(self.style.SUCCESS("🔄 REINICIANDO PLANES DE ENTRENAMIENTO SEMANALMENTE"))
        self.stdout.write("=" * 70 + "\n")
        
        # Obtener todos los planes activos de usuarios que no tengan fecha de fin
        # (planes que se reinician semanalmente)
        active_plans = WorkoutProgram.objects.filter(
            user__isnull=False,
            is_active=True,
            end_date__isnull=True  # Planes sin fecha de fin (reinicio semanal)
        ).select_related('user').prefetch_related('days')
        
        self.stdout.write(f"📋 Encontrados {active_plans.count()} planes para reiniciar\n")
        
        reset_count = 0
        
        for plan in active_plans:
            try:
                # Usar la función de servicios para reiniciar el plan
                updated_plan = reset_weekly_workout_plan_if_needed(plan)
                
                if updated_plan.start_date != plan.start_date:
                    self.stdout.write(f"   ✅ Plan reiniciado: {plan.name} (Usuario: {plan.user.email})")
                    self.stdout.write(f"      Nueva fecha de inicio: {updated_plan.start_date}")
                    reset_count += 1
                else:
                    self.stdout.write(f"   ℹ️  Plan no necesita reinicio: {plan.name} (Usuario: {plan.user.email})")
                    self.stdout.write(f"      Fecha de inicio actual: {plan.start_date}")
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(
                    f"   ❌ Error reiniciando plan {plan.name}: {str(e)}"
                ))
        
        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(self.style.SUCCESS(f"✅ Proceso completado"))
        self.stdout.write(f"   Planes reiniciados: {reset_count}")
        self.stdout.write("=" * 70)
        
        if reset_count > 0:
            self.stdout.write(self.style.SUCCESS(
                "\n💡 Tip: Configura este comando para ejecutarse automáticamente cada lunes "
                "usando cron (Linux) o Task Scheduler (Windows)"
            ))

