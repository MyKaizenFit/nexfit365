# workouts/management/commands/create_test_workout_history.py
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import random

from workouts.models import WorkoutLog, Exercise

User = get_user_model()


class Command(BaseCommand):
    help = 'Crea un historial de entrenamientos de prueba para un usuario específico'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            default='hjgf@jhg.ci',
            help='Email del usuario para el que crear el historial'
        )
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Número de días hacia atrás para crear entrenamientos'
        )
        parser.add_argument(
            '--count',
            type=int,
            default=15,
            help='Número de entrenamientos a crear'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Eliminar logs existentes antes de crear nuevos'
        )

    def handle(self, *args, **options):
        email = options['email']
        days_back = options['days']
        count = options['count']
        clear_existing = options['clear']

        # Buscar usuario
        try:
            user = User.objects.get(email=email)
            self.stdout.write(self.style.SUCCESS(f'Usuario encontrado: {user.email}'))
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Usuario no encontrado: {email}'))
            return

        # Eliminar logs existentes si se solicita
        if clear_existing:
            deleted_count = WorkoutLog.objects.filter(user=user).delete()[0]
            self.stdout.write(self.style.WARNING(f'Eliminados {deleted_count} logs existentes'))

        # Obtener ejercicios disponibles
        exercises = list(Exercise.objects.filter(is_active=True)[:20])
        if not exercises:
            self.stdout.write(self.style.ERROR('No hay ejercicios disponibles en la base de datos'))
            return

        self.stdout.write(f'Usando {len(exercises)} ejercicios disponibles')

        # Crear logs de entrenamiento
        created_count = 0
        base_date = timezone.now().date()

        # Crear entrenamientos distribuidos en el tiempo
        for i in range(count):
            # Distribuir los entrenamientos en el rango de días
            days_ago = random.randint(0, days_back)
            log_date = base_date - timedelta(days=days_ago)

            # Evitar crear múltiples logs el mismo día
            if WorkoutLog.objects.filter(user=user, date=log_date).exists():
                continue

            # Seleccionar ejercicios aleatorios (entre 4 y 8 ejercicios por entrenamiento)
            num_exercises = random.randint(4, 8)
            selected_exercises = random.sample(exercises, min(num_exercises, len(exercises)))

            # Crear exercises_data con datos realistas
            exercises_data = []
            for exercise in selected_exercises:
                # Número de series (entre 3 y 5)
                num_sets = random.randint(3, 5)
                sets = []

                # Peso base según el ejercicio (simulando progresión)
                base_weight = random.randint(20, 80)
                
                for set_num in range(1, num_sets + 1):
                    # Variar ligeramente el peso entre series
                    weight = base_weight + random.randint(-5, 5)
                    weight = max(10, weight)  # Mínimo 10kg
                    
                    # Repeticiones (entre 8 y 15)
                    reps = random.randint(8, 15)
                    
                    sets.append({
                        'completed': True,
                        'reps': reps,
                        'weight': float(weight),
                        'duration': None,
                        'rest_seconds': random.randint(60, 120)
                    })

                exercises_data.append({
                    'exercise_id': str(exercise.id),
                    'exercise_name': exercise.name,
                    'sets': sets,
                    'completed': True
                })

            # Calcular duración (aproximadamente 1 minuto por serie + descansos)
            total_sets = sum(len(ex['sets']) for ex in exercises_data)
            duration_minutes = total_sets * 2 + random.randint(10, 20)  # 2 min por serie + tiempo extra

            # Crear el log
            log = WorkoutLog.objects.create(
                user=user,
                date=log_date,
                duration_minutes=duration_minutes,
                completed=True,
                rating=random.choice([4, 5]),  # Calificación entre 4 y 5
                exercises_data=exercises_data,
                notes=random.choice([
                    'Buen entrenamiento, me sentí fuerte',
                    'Progresando bien en los pesos',
                    'Última serie fue difícil pero la completé',
                    'Excelente sesión, muy motivado',
                    'Notas: mantener buena forma',
                    ''
                ])
            )

            created_count += 1
            self.stdout.write(
                f'  ✅ Creado log para {log_date.strftime("%Y-%m-%d")} '
                f'({len(exercises_data)} ejercicios, {duration_minutes} min)'
            )

        # Calcular estadísticas
        total_logs = WorkoutLog.objects.filter(user=user, completed=True).count()
        total_tonnage = 0
        
        for log in WorkoutLog.objects.filter(user=user, completed=True):
            exercises_data = log.exercises_data or []
            for exercise_data in exercises_data:
                sets = exercise_data.get('sets', [])
                for set_data in sets:
                    if set_data.get('completed') and set_data.get('weight') and set_data.get('reps'):
                        weight = float(set_data['weight'])
                        reps = int(set_data['reps'])
                        total_tonnage += weight * reps

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'✅ Historial creado exitosamente!'))
        self.stdout.write(f'   - Logs creados: {created_count}')
        self.stdout.write(f'   - Total de logs: {total_logs}')
        self.stdout.write(f'   - Tonelaje total: {int(total_tonnage):,} kg')
        self.stdout.write(f'   - Tonelaje promedio: {int(total_tonnage / max(total_logs, 1)):,} kg por entrenamiento')


