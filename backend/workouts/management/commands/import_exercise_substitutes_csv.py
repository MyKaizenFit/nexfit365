# workouts/management/commands/import_exercise_substitutes_csv.py
"""Importa sustitutos de ejercicios desde CSV."""
import csv

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from workouts.models import Exercise, ExerciseSubstitution


class Command(BaseCommand):
    help = "Importar sustitutos de ejercicios desde un archivo CSV"

    def add_arguments(self, parser):
        parser.add_argument("--file", required=True, help="Ruta al archivo CSV")
        parser.add_argument("--dry-run", action="store_true", help="No guarda cambios")

    def handle(self, *args, **options):
        file_path = options["file"]
        dry_run = options["dry_run"]

        try:
            with open(file_path, "r", encoding="utf-8") as csvfile:
                reader = csv.DictReader(csvfile)
                if not reader.fieldnames:
                    raise CommandError("El CSV no tiene encabezados")

                created = 0
                updated = 0
                skipped = 0

                with transaction.atomic():
                    for raw_row in reader:
                        row = {
                            (key or "").strip().lower(): (value or "").strip()
                            for key, value in raw_row.items()
                        }

                        exercise = self._resolve_exercise(
                            row.get("exercise_id"),
                            row.get("exercise_name"),
                        )
                        substitute = self._resolve_exercise(
                            row.get("substitute_id"),
                            row.get("substitute_name"),
                        )

                        if not exercise or not substitute:
                            skipped += 1
                            continue

                        priority = self._parse_int(row.get("priority"), default=1)
                        notes = row.get("notes", "")

                        _, was_created = ExerciseSubstitution.objects.update_or_create(
                            exercise=exercise,
                            substitute=substitute,
                            defaults={"priority": priority, "notes": notes},
                        )
                        if was_created:
                            created += 1
                        else:
                            updated += 1

                    if dry_run:
                        raise RuntimeError("Dry run")

                self.stdout.write(self.style.SUCCESS(
                    f"Import completado. Creados: {created}, Actualizados: {updated}, Omitidos: {skipped}"
                ))

        except FileNotFoundError:
            raise CommandError(f"Archivo no encontrado: {file_path}")
        except RuntimeError as exc:
            if str(exc) == "Dry run":
                self.stdout.write(self.style.WARNING(
                    f"Dry run: Creados {created}, Actualizados {updated}, Omitidos {skipped}"
                ))
            else:
                raise

    def _resolve_exercise(self, exercise_id: str, exercise_name: str):
        if exercise_id:
            try:
                return Exercise.objects.get(id=exercise_id)
            except Exercise.DoesNotExist:
                return None
        if exercise_name:
            return Exercise.objects.filter(name__iexact=exercise_name).first()
        return None

    def _parse_int(self, value: str, default: int) -> int:
        if value is None or value == "":
            return default
        try:
            return int(value)
        except ValueError:
            return default
