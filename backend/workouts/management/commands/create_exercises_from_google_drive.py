"""
Comando para crear ejercicios desde videos de Google Drive

Este script puede funcionar de dos formas:
1. Listar automáticamente archivos de una carpeta de Google Drive usando la API
2. Crear ejercicios desde un archivo JSON con la lista de videos

Formato del archivo JSON (si se usa --file):
[
  {
    "name": "Curl de Biceps",
    "file_id": "1ABC123def456GHI789jkl012MNO345",
    "category": "strength",
    "muscle_groups": ["biceps"]
  },
  ...
]

O simplemente una lista de objetos con 'name' y 'file_id':
[
  {
    "name": "Curl de Biceps",
    "file_id": "1ABC123def456GHI789jkl012MNO345"
  },
  ...
]
"""
import json
import os
import re
from django.core.management.base import BaseCommand
from django.conf import settings
from workouts.models import Exercise


def normalize_exercise_name(name: str) -> str:
    """
    Normaliza el nombre del ejercicio para que coincida con el formato del video
    - Elimina extensiones de archivo (.mp4, .mov, etc.)
    - Convierte a formato legible (capitaliza palabras)
    """
    # Eliminar extensiones de video comunes
    name = re.sub(r'\.(mp4|mov|avi|mkv|webm|flv|wmv)$', '', name, flags=re.IGNORECASE)
    
    # Limpiar espacios y caracteres especiales
    name = name.strip()
    
    # Capitalizar palabras (convertir "curl de biceps" a "Curl de Biceps")
    words = name.split()
    name = ' '.join(word.capitalize() for word in words)
    
    return name


def extract_exercise_name_from_filename(filename: str) -> str:
    """
    Extrae el nombre del ejercicio del nombre del archivo
    Ejemplo: "curl-de-biceps.mp4" -> "Curl de Biceps"
    """
    # Eliminar extensión
    name = re.sub(r'\.(mp4|mov|avi|mkv|webm|flv|wmv)$', '', filename, flags=re.IGNORECASE)
    
    # Reemplazar guiones y guiones bajos con espacios
    name = re.sub(r'[-_]', ' ', name)
    
    # Normalizar espacios múltiples
    name = re.sub(r'\s+', ' ', name).strip()
    
    # Capitalizar palabras
    words = name.split()
    name = ' '.join(word.capitalize() for word in words)
    
    return name


class Command(BaseCommand):
    help = 'Crea ejercicios desde videos de Google Drive'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            help='Ruta al archivo JSON con la lista de videos (nombre y file_id)',
        )
        parser.add_argument(
            '--folder-id',
            type=str,
            default='1dbDvVZKOwYJ4A13FtVslIid2JKLcN4fG',
            help='ID de la carpeta de Google Drive para listar videos automáticamente',
        )
        parser.add_argument(
            '--use-api',
            action='store_true',
            help='Usar API de Google Drive para listar archivos automáticamente (requiere credenciales)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Mostrar qué ejercicios se crearían sin crearlos realmente',
        )

    def handle(self, *args, **options):
        file_path = options.get('file')
        folder_id = options.get('folder_id')
        use_api = options.get('use_api')
        dry_run = options.get('dry_run')

        videos_data = []

        # Opción 1: Leer desde archivo JSON
        if file_path:
            if not os.path.isabs(file_path):
                backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
                file_path = os.path.join(backend_dir, file_path)

            if not os.path.exists(file_path):
                self.stdout.write(
                    self.style.ERROR(f'❌ El archivo {file_path} no existe.')
                )
                return

            self.stdout.write(f'📖 Leyendo videos desde {file_path}...')
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    videos_data = json.load(f)
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'❌ Error al leer el archivo: {e}'))
                return

        # Opción 2: Listar desde Google Drive usando API
        elif use_api:
            self.stdout.write(f'📁 Listando videos desde Google Drive (carpeta: {folder_id})...')
            try:
                videos_data = self.list_google_drive_files(folder_id)
                if not videos_data:
                    self.stdout.write(
                        self.style.WARNING('⚠️  No se encontraron videos. Verifica las credenciales y permisos.')
                    )
                    return
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'❌ Error al listar archivos de Google Drive: {e}\n')
                )
                self.stdout.write(
                    self.style.WARNING(
                        '💡 Sugerencia: Usa --file para proporcionar un archivo JSON con la lista de videos.\n'
                        '   O configura las credenciales de Google Drive API (ver documentación).'
                    )
                )
                return

        # Opción 3: Mostrar ayuda si no hay opciones
        else:
            self.stdout.write(
                self.style.WARNING(
                    '⚠️  Debes proporcionar una de las siguientes opciones:\n'
                    '   --file /ruta/al/archivo.json     Para crear desde un archivo JSON\n'
                    '   --use-api                        Para listar automáticamente desde Google Drive\n\n'
                    'Ejemplo de archivo JSON:\n'
                    '[\n'
                    '  {\n'
                    '    "name": "Curl de Biceps",\n'
                    '    "file_id": "1ABC123def456GHI789jkl012MNO345"\n'
                    '  },\n'
                    '  ...\n'
                    ']\n'
                )
            )
            return

        if not isinstance(videos_data, list):
            self.stdout.write(self.style.ERROR('❌ El archivo debe contener un array de videos'))
            return

        if dry_run:
            self.stdout.write(self.style.WARNING('\n🔍 DRY RUN - No se crearán ejercicios\n'))

        self.stdout.write(f'📝 Procesando {len(videos_data)} videos...\n')

        created = 0
        updated = 0
        skipped = 0
        errors = 0

        for video_data in videos_data:
            try:
                # Obtener nombre del ejercicio
                exercise_name = video_data.get('name', '').strip()
                
                # Si no hay nombre, intentar extraerlo del nombre del archivo
                if not exercise_name:
                    filename = video_data.get('filename', video_data.get('title', ''))
                    if filename:
                        exercise_name = extract_exercise_name_from_filename(filename)
                    else:
                        self.stdout.write(self.style.WARNING('   ⚠️  Video sin nombre, saltando...'))
                        skipped += 1
                        continue

                exercise_name = normalize_exercise_name(exercise_name)

                # Obtener file_id de Google Drive
                file_id = video_data.get('file_id') or video_data.get('id', '').strip()
                if not file_id:
                    self.stdout.write(
                        self.style.WARNING(f'   ⚠️  Video "{exercise_name}" sin file_id, saltando...')
                    )
                    skipped += 1
                    continue

                # Preparar datos del ejercicio
                exercise_data = {
                    'name': exercise_name,
                    'google_drive_file_id': file_id,
                    'category': video_data.get('category', '').strip() or 'strength',
                    'muscle_groups': video_data.get('muscle_groups', []),
                    'instructions': video_data.get('instructions', '').strip(),
                    'video_url': f"https://drive.google.com/file/d/{file_id}/preview",
                }

                if dry_run:
                    self.stdout.write(f'   📋 Se crearía: {exercise_name} (ID: {file_id[:20]}...)')
                    created += 1
                    continue

                # Crear o actualizar ejercicio
                exercise, was_created = Exercise.objects.get_or_create(
                    name=exercise_name,
                    defaults=exercise_data
                )

                if not was_created:
                    # Actualizar ejercicio existente con el ID de Google Drive
                    exercise.google_drive_file_id = file_id
                    exercise.video_url = exercise_data['video_url']
                    if exercise_data.get('category'):
                        exercise.category = exercise_data['category']
                    if exercise_data.get('muscle_groups'):
                        exercise.muscle_groups = exercise_data['muscle_groups']
                    if exercise_data.get('instructions'):
                        exercise.instructions = exercise_data['instructions']
                    exercise.save()
                    updated += 1
                    self.stdout.write(f'   ↻ Actualizado: {exercise_name} (ID: {file_id[:20]}...)')
                else:
                    created += 1
                    self.stdout.write(f'   ✓ Creado: {exercise_name} (ID: {file_id[:20]}...)')

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'   ❌ Error al procesar video: {video_data.get("name", "Desconocido")} - {e}'
                    )
                )
                errors += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Proceso completado:\n'
                f'   - {created} ejercicios creados\n'
                f'   - {updated} ejercicios actualizados\n'
                f'   - {skipped} videos omitidos\n'
                f'   - {errors} errores'
            )
        )

    def list_google_drive_files(self, folder_id: str):
        """
        Lista archivos de una carpeta de Google Drive usando la API
        
        Requiere:
        - GOOGLE_DRIVE_API_KEY en settings
        - O credenciales de servicio configuradas
        """
        try:
            from workouts.google_drive_service import get_google_drive_service
            
            service = get_google_drive_service()
            
            if not service.is_configured():
                raise Exception(
                    'Google Drive API no está configurada. '
                    'Configura GOOGLE_DRIVE_CREDENTIALS_PATH o GOOGLE_DRIVE_API_KEY en settings.'
                )
            
            videos = service.list_videos_from_folder(folder_id)
            return videos
            
        except ImportError:
            raise Exception(
                'Dependencias faltantes. '
                'Instálalos con: pip install google-api-python-client google-auth'
            )
        except Exception as e:
            raise Exception(f'Error al listar archivos de Google Drive: {e}')

