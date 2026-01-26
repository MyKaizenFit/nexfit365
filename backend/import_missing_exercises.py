import csv
from django.core.management.base import BaseCommand
from workouts.models import Exercise
from django.utils.dateparse import parse_datetime

class Command(BaseCommand):
    help = 'Importa ejercicios desde un CSV exportado del backup antiguo, solo los que no existen actualmente.'

    def add_arguments(self, parser):
        parser.add_argument('csv_path', type=str, help='Ruta al archivo CSV de ejercicios a importar')

    def handle(self, *args, **options):
        csv_path = options['csv_path']
        with open(csv_path, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            count = 0
            for row in reader:
                if not Exercise.objects.filter(id=row['id']).exists():
                    ex = Exercise(
                        id=row['id'],
                        created_at=parse_datetime(row['created_at']) if row['created_at'] else None,
                        updated_at=parse_datetime(row['updated_at']) if row['updated_at'] else None,
                        name=row['name'],
                        description=row['description'],
                        instructions=row['instructions'],
                        category=row['category'],
                        muscle_groups=row['muscle_groups'],
                        equipment=row['equipment'],
                        difficulty=row['difficulty'],
                        video_url=row['video_url'],
                        image_url=row['image_url'],
                        google_drive_file_id=row['google_drive_file_id'],
                        video_file=row['video_file'],
                        thumbnail=row['thumbnail'],
                        is_system=row['is_system'].lower() in ('t','true','1'),
                        is_active=row['is_active'].lower() in ('t','true','1'),
                        tags=row['tags'],
                        created_by_id=row['created_by_id'] or None
                    )
                    ex.save()
                    count += 1
        self.stdout.write(self.style.SUCCESS(f'Ejercicios importados: {count}'))
