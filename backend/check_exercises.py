from workouts.models import WorkoutProgram, Exercise
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.get(email='usuario@test.com')
program = WorkoutProgram.objects.filter(user=user, is_active=True).first()

print(f"\n📋 Programa: {program.name}")
print("=" * 60)

for day in program.days.all():
    print(f"\n🗓️  {day.name} ({day.day_of_week})")
    for ex in day.exercises.all():
        if ex.exercise:
            print(f"  • {ex.exercise.name}")
            print(f"    Sets: {ex.sets}, Reps: {ex.reps}")
