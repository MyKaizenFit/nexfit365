from workouts.models import WorkoutLog, WorkoutLogExercise, WorkoutLogSet
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.get(email='usuario@test.com')

logs = WorkoutLog.objects.filter(user=user).order_by('date')
print(f'Total logs: {logs.count()}')

if logs.exists():
    print(f'\nPrimeros 10 logs:')
    for log in logs[:10]:
        day_name = log.workout_day.name if log.workout_day else "No day"
        print(f'  {log.date} - {day_name}')
        
    # Verificar sets de un log reciente
    recent_log = logs.last()
    print(f'\n\nDetalles del log más reciente ({recent_log.date}):')
    for log_ex in recent_log.log_exercises.all():
        print(f'\n  Ejercicio: {log_ex.exercise_name}')
        for s in log_ex.sets.all():
            if s.weight:
                print(f'    Set {s.set_number}: {s.reps} reps @ {s.weight}kg')
            elif s.duration_seconds:
                print(f'    Set {s.set_number}: {s.duration_seconds}s')
