# workouts/management/commands/import_exercises_csv.py
"""Importa ejercicios desde CSV."""
import csv
import json
from typing import List

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from workouts.models import Exercise


class Command(BaseCommand):
    help = "Importar ejercicios desde un archivo CSV"

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

                        exercise_id = row.get("id")
                        name = row.get("name")

                        if not name and not exercise_id:
                            skipped += 1
                            continue

                        defaults = {
                            "name": name,
                            "description": row.get("description", ""),
                            "instructions": row.get("instructions", ""),
                            "category": row.get("category") or "strength",
                            "muscle_groups": self._parse_list(row.get("muscle_groups")),
                            "equipment": self._parse_list(row.get("equipment")),
                            "difficulty": row.get("difficulty") or "beginner",
                            "video_url": row.get("video_url", ""),
                            "image_url": row.get("image_url", ""),
                            "google_drive_file_id": row.get("google_drive_file_id", ""),
                            "is_system": self._parse_bool(row.get("is_system"), default=False),
                            "is_active": self._parse_bool(row.get("is_active"), default=True),
                            "tags": self._parse_list(row.get("tags")),
                        }

                        lookup = {"id": exercise_id} if exercise_id else {"name": name}
                        obj, was_created = Exercise.objects.update_or_create(
                            **lookup, defaults=defaults
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

    def _parse_list(self, value: str) -> List[str]:
        if not value:
            return []
        trimmed = value.strip()
        if trimmed.startswith("[") or trimmed.startswith("{"):
            try:
                parsed = json.loads(trimmed)
                if isinstance(parsed, list):
                    return [str(item).strip() for item in parsed if str(item).strip()]
                if isinstance(parsed, str):
                    return [parsed]
            except json.JSONDecodeError:
                pass

        if "|" in trimmed:
            parts = [part.strip() for part in trimmed.split("|")]
        else:
            parts = [part.strip() for part in trimmed.split(",")]
        return [part for part in parts if part]

    def _parse_bool(self, value: str, default: bool) -> bool:
        if value is None or value == "":
            return default
        normalized = value.strip().lower()
        if normalized in {"1", "true", "yes", "y", "si", "s"}:
            return True
        if normalized in {"0", "false", "no", "n"}:
            return False
        return default
