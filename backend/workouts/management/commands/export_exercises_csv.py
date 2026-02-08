# workouts/management/commands/export_exercises_csv.py
"""Exporta ejercicios a CSV."""
import csv
import json

from django.core.management.base import BaseCommand

from workouts.models import Exercise


class Command(BaseCommand):
    help = "Exportar ejercicios a un archivo CSV"

    def add_arguments(self, parser):
        parser.add_argument(
            "--output",
            default="exercises_export.csv",
            help="Ruta del CSV a generar",
        )
        parser.add_argument(
            "--template",
            action="store_true",
            help="Generar solo encabezados sin datos",
        )

    def handle(self, *args, **options):
        output_path = options["output"]
        template_only = options["template"]

        fields = [
            "id",
            "name",
            "description",
            "instructions",
            "category",
            "muscle_groups",
            "equipment",
            "difficulty",
            "video_url",
            "image_url",
            "google_drive_file_id",
            "is_system",
            "is_active",
            "tags",
        ]

        with open(output_path, "w", newline="", encoding="utf-8") as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fields)
            writer.writeheader()

            if template_only:
                self.stdout.write(self.style.SUCCESS(
                    f"Plantilla CSV generada en {output_path}"
                ))
                return

            exercises = Exercise.objects.all().order_by("name")
            for exercise in exercises:
                writer.writerow({
                    "id": str(exercise.id),
                    "name": exercise.name,
                    "description": exercise.description,
                    "instructions": exercise.instructions,
                    "category": exercise.category,
                    "muscle_groups": json.dumps(exercise.muscle_groups or [], ensure_ascii=False),
                    "equipment": json.dumps(exercise.equipment or [], ensure_ascii=False),
                    "difficulty": exercise.difficulty,
                    "video_url": exercise.video_url,
                    "image_url": exercise.image_url,
                    "google_drive_file_id": exercise.google_drive_file_id,
                    "is_system": str(exercise.is_system).lower(),
                    "is_active": str(exercise.is_active).lower(),
                    "tags": json.dumps(exercise.tags or [], ensure_ascii=False),
                })

        self.stdout.write(self.style.SUCCESS(
            f"Export completado: {output_path}"
        ))
