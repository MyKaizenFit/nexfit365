from django.db import migrations, models
from django.db.models import Q
from django.db.models.functions import Lower
import re


def _normalize_name(name: str) -> str:
    return re.sub(r"\s+", " ", (name or "").strip())


def dedupe_exercises(apps, schema_editor):
    Exercise = apps.get_model('workouts', 'Exercise')
    WorkoutDayExercise = apps.get_model('workouts', 'WorkoutDayExercise')
    WorkoutLogExercise = apps.get_model('workouts', 'WorkoutLogExercise')
    ExerciseSubstitution = apps.get_model('workouts', 'ExerciseSubstitution')

    canonical_by_key = {}

    exercises = list(Exercise.objects.all().order_by('name', '-updated_at', '-created_at', 'id'))

    for exercise in exercises:
        normalized_name = _normalize_name(exercise.name)
        if exercise.name != normalized_name:
            exercise.name = normalized_name
            exercise.save(update_fields=['name'])

        key = normalized_name.casefold()

        canonical_id = canonical_by_key.get(key)
        if canonical_id is None:
            canonical_by_key[key] = exercise.id
            continue

        # Reasignar referencias de entrenamiento al ejercicio canónico.
        WorkoutDayExercise.objects.filter(exercise_id=exercise.id).update(exercise_id=canonical_id)
        WorkoutLogExercise.objects.filter(exercise_id=exercise.id).update(exercise_id=canonical_id)

        # Consolidar sustituciones sin romper restricciones de unicidad.
        substitutions = ExerciseSubstitution.objects.filter(
            Q(exercise_id=exercise.id) | Q(substitute_id=exercise.id)
        )

        for substitution in substitutions:
            new_exercise_id = canonical_id if substitution.exercise_id == exercise.id else substitution.exercise_id
            new_substitute_id = canonical_id if substitution.substitute_id == exercise.id else substitution.substitute_id

            # Evitar auto-sustituciones inválidas.
            if new_exercise_id == new_substitute_id:
                substitution.delete()
                continue

            duplicate_exists = ExerciseSubstitution.objects.filter(
                exercise_id=new_exercise_id,
                substitute_id=new_substitute_id,
            ).exclude(pk=substitution.pk).exists()

            if duplicate_exists:
                substitution.delete()
                continue

            changed = False
            if substitution.exercise_id != new_exercise_id:
                substitution.exercise_id = new_exercise_id
                changed = True
            if substitution.substitute_id != new_substitute_id:
                substitution.substitute_id = new_substitute_id
                changed = True
            if changed:
                substitution.save(update_fields=['exercise', 'substitute'])

        exercise.delete()


class Migration(migrations.Migration):

    atomic = False

    dependencies = [
        ('workouts', '0004_exercise_substitution'),
    ]

    operations = [
        migrations.RunPython(dedupe_exercises, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='exercise',
            constraint=models.UniqueConstraint(
                Lower('name'),
                name='unique_exercise_name_ci',
            ),
        ),
    ]
