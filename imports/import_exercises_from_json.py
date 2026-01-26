import os
import sys
import json
import uuid

sys.path.insert(0, '/srv/mykaizenfit/pro/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
django.setup()

from workouts.models import Exercise

EXERCISES_JSON = '/srv/mykaizenfit/pro/backend/exercises-complete.json'

def main():
    with open(EXERCISES_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Encontrados {len(data)} ejercicios en el JSON.")
    existentes = set(Exercise.objects.values_list('name', flat=True))
    nuevos = [e for e in data if e['name'] not in existentes]
    print(f"Ejercicios nuevos a importar: {len(nuevos)}")

    for e in nuevos:
        Exercise.objects.create(
            id=uuid.uuid4(),
            name=e.get('name', ''),
            category=e.get('category', ''),
            muscle_groups=e.get('muscle_groups', []),
            instructions=e.get('instructions', ''),
            video_url=e.get('video_url', ''),
            image_url=e.get('image_url', ''),
            google_drive_file_id=e.get('google_drive_file_id', ''),
        )
        print(f"✅ Importado: {e.get('name')}")
    print(f"Importación completada. Total importados: {len(nuevos)}")

if __name__ == '__main__':
    main()
