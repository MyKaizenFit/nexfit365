"""
Comando para asignar un plan de entrenamiento a un usuario
y configurar el reinicio semanal automático
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from workouts.models import WorkoutProgram, WorkoutDay, WorkoutDayExercise

CustomUser = get_user_model()


class Command(BaseCommand):
    help = 'Asigna un plan de entrenamiento a un usuario y configura reinicio semanal'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user-email',
            type=str,
            default='usuario@test.com',
            help='Email del usuario al que asignar el plan'
        )
        parser.add_argument(
            '--plan-id',
            type=str,
            help='ID del plan del sistema a asignar (si no se especifica, se asigna el primero disponible)'
        )

    def handle(self, *args, **options):
        user_email = options['user_email']
        plan_id = options.get('plan_id')
        
        self.stdout.write("=" * 70)
        self.stdout.write(self.style.SUCCESS("🏋️ ASIGNANDO PLAN DE ENTRENAMIENTO"))
        self.stdout.write("=" * 70 + "\n")
        
        # 1. Obtener usuario
        try:
            user = CustomUser.objects.get(email=user_email)
            self.stdout.write(f"✅ Usuario encontrado: {user.email} ({user.get_full_name()})")
        except CustomUser.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"❌ Usuario no encontrado: {user_email}"))
            return
        
        # 2. Obtener plan del sistema
        if plan_id:
            try:
                system_plan = WorkoutProgram.objects.get(
                    id=plan_id,
                    is_system=True,
                    is_active=True,
                    user__isnull=True
                )
            except WorkoutProgram.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"❌ Plan del sistema no encontrado con ID: {plan_id}"))
                return
        else:
            # Buscar el primer plan del sistema disponible
            system_plan = WorkoutProgram.objects.filter(
                is_system=True,
                is_active=True,
                user__isnull=True
            ).prefetch_related('days__exercises__exercise').first()
            
            if not system_plan:
                self.stdout.write(self.style.ERROR("❌ No hay planes del sistema disponibles"))
                return
        
        self.stdout.write(f"✅ Plan del sistema encontrado: {system_plan.name}")
        self.stdout.write(f"   - Días por semana: {system_plan.days_per_week}")
        self.stdout.write(f"   - Días de entrenamiento: {system_plan.days.count()}")
        
        # 3. Desactivar plan activo anterior del usuario
        existing_plan = WorkoutProgram.objects.filter(user=user, is_active=True).first()
        if existing_plan:
            existing_plan.is_active = False
            existing_plan.end_date = timezone.now().date()
            existing_plan.save()
            self.stdout.write(f"   ⚠️  Plan anterior desactivado: {existing_plan.name}")
        
        # 4. Crear nuevo plan para el usuario (copia del plan del sistema)
        # Calcular fecha de inicio (lunes de la semana actual)
        today = timezone.now().date()
        days_until_monday = (today.weekday() - 0) % 7  # 0 = lunes
        if days_until_monday == 0 and today.weekday() != 0:
            days_until_monday = 7
        start_date = today - timedelta(days=days_until_monday)
        # Si hoy es lunes, usar hoy
        if today.weekday() == 0:
            start_date = today
        
        # El plan durará indefinidamente (se reiniciará semanalmente)
        # No ponemos end_date para que sea continuo
        user_plan = WorkoutProgram.objects.create(
            user=user,
            name=f"{system_plan.name} - {user.get_full_name() or user.email}",
            description=system_plan.description or f"Plan de entrenamiento asignado desde {system_plan.name}",
            difficulty=system_plan.difficulty,
            goal=system_plan.goal,
            location=system_plan.location,
            days_per_week=system_plan.days_per_week,
            duration_weeks=1,  # Duración de 1 semana, se reinicia automáticamente
            estimated_duration_minutes=system_plan.estimated_duration_minutes,
            equipment_needed=system_plan.equipment_needed or [],
            start_date=start_date,
            end_date=None,  # Sin fecha de fin explícita, se reinicia semanalmente
            is_active=True,
            is_template=False,
            is_system=False,
            tags=system_plan.tags or []
        )
        
        # 5. Copiar días y ejercicios del plan del sistema
        days_copied = 0
        exercises_copied = 0
        
        system_days = system_plan.days.all().order_by('day_number', 'order_index')
        
        if system_days.exists():
            # Si el plan del sistema tiene días, copiarlos
            for system_day in system_days:
                user_day = WorkoutDay.objects.create(
                    program=user_plan,
                    day_of_week=system_day.day_of_week or '',
                    name=system_day.name,
                    day_number=system_day.day_number,
                    duration_minutes=system_day.duration_minutes,
                    is_rest_day=system_day.is_rest_day,
                    notes=system_day.notes or "",
                    order_index=system_day.order_index
                )
                days_copied += 1
                
                # Copiar ejercicios del día
                for system_exercise in system_day.exercises.all().order_by('order_index'):
                    WorkoutDayExercise.objects.create(
                        workout_day=user_day,
                        exercise=system_exercise.exercise,
                        sets=system_exercise.sets,
                        reps=system_exercise.reps,
                        weight=system_exercise.weight or "",
                        rest_seconds=system_exercise.rest_seconds,
                        notes=system_exercise.notes or "",
                        order_index=system_exercise.order_index
                    )
                    exercises_copied += 1
        else:
            # Si el plan del sistema no tiene días, crear días básicos
            from workouts.models import Exercise
            from random import sample
            
            # Obtener ejercicios disponibles
            available_exercises = list(Exercise.objects.filter(is_active=True)[:20])
            
            if not available_exercises:
                self.stdout.write(self.style.WARNING(
                    "⚠️  No hay ejercicios disponibles. El plan se creó sin días."
                ))
            else:
                # Crear días según days_per_week
                days_per_week = system_plan.days_per_week or 3
                day_names = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
                day_names_es = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
                
                # Seleccionar días de entrenamiento
                training_days = day_names[:days_per_week]
                
                for idx, day_name in enumerate(training_days):
                    is_rest = False
                    day_name_es = day_names_es[idx]
                    
                    user_day = WorkoutDay.objects.create(
                        program=user_plan,
                        day_of_week=day_name,
                        name=f"{day_name_es} - Entrenamiento",
                        day_number=idx + 1,
                        duration_minutes=system_plan.estimated_duration_minutes or 45,
                        is_rest_day=is_rest,
                        notes=f"Entrenamiento del plan {system_plan.name}",
                        order_index=idx
                    )
                    days_copied += 1
                    
                    # Asignar 4-6 ejercicios aleatorios a cada día
                    num_exercises = min(6, len(available_exercises))
                    day_exercises = sample(available_exercises, num_exercises) if len(available_exercises) >= num_exercises else available_exercises
                    
                    for ex_idx, exercise in enumerate(day_exercises):
                        WorkoutDayExercise.objects.create(
                            workout_day=user_day,
                            exercise=exercise,
                            sets=3,
                            reps="10-12",
                            weight="",
                            rest_seconds=60,
                            notes="",
                            order_index=ex_idx
                        )
                        exercises_copied += 1
        
        self.stdout.write(f"\n✅ Plan asignado exitosamente:")
        self.stdout.write(f"   - Plan: {user_plan.name}")
        self.stdout.write(f"   - Fecha de inicio: {start_date}")
        self.stdout.write(f"   - Días copiados: {days_copied}")
        self.stdout.write(f"   - Ejercicios copiados: {exercises_copied}")
        self.stdout.write(f"   - Reinicio semanal: Activado (sin fecha de fin)")
        
        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(self.style.SUCCESS("✅ Proceso completado"))
        self.stdout.write("=" * 70)
