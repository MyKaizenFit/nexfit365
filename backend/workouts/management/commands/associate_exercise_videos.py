"""
Comando para asociar videos de la carpeta media/exercises/videos/ con ejercicios existentes
"""
import os
import re
from pathlib import Path
from django.core.management.base import BaseCommand
from workouts.models import Exercise
from django.conf import settings


class Command(BaseCommand):
    help = 'Asocia videos de media/exercises/videos/ con ejercicios existentes'

    def handle(self, *args, **options):
        # Buscar en backend/media (donde están realmente los videos)
        # BASE_DIR es la raíz del proyecto, pero los videos están en backend/media
        base_dir = Path(settings.BASE_DIR)
        backend_dir = base_dir / 'backend'
        videos_dir = backend_dir / 'media' / 'exercises' / 'videos'
        
        # Intentar también en MEDIA_ROOT si existe
        if not videos_dir.exists():
            videos_dir = Path(settings.MEDIA_ROOT) / 'exercises' / 'videos'
            if not videos_dir.exists():
                self.stdout.write(self.style.ERROR(f"❌ Directorio no encontrado: {videos_dir}"))
                return
        
        # Obtener todos los archivos de video
        video_files = [f for f in os.listdir(videos_dir) if f.endswith(('.mov', '.MOV', '.mp4', '.MP4'))]
        
        self.stdout.write(f"\n📁 Encontrados {len(video_files)} videos en {videos_dir}\n")
        
        # Obtener todos los ejercicios
        exercises = Exercise.objects.all()
        self.stdout.write(f"🏋️ Encontrados {exercises.count()} ejercicios en la base de datos\n")
        
        # Crear diccionarios de búsqueda
        video_dict = {self._normalize_filename(f): f for f in video_files}
        exercise_dict = {self._normalize_exercise_name(e.name): e for e in exercises}
        
        # Intentar emparejar videos con ejercicios
        matched = []
        unmatched_videos = []
        
        for video_normalized, video_filename in video_dict.items():
            exercise = exercise_dict.get(video_normalized)
            if exercise:
                matched.append((exercise, video_filename))
            else:
                unmatched_videos.append(video_filename)
        
        self.stdout.write("=" * 80)
        self.stdout.write(self.style.SUCCESS("✅ VIDEOS ASOCIADOS:"))
        self.stdout.write("=" * 80)
        
        for exercise, video_filename in matched:
            rel_path = f"exercises/videos/{video_filename}"
            
            # Asociar el video al ejercicio
            exercise.video_file.name = rel_path
            exercise.save()
            
            self.stdout.write(f"✅ {exercise.name}")
            self.stdout.write(f"   Video: {video_filename}")
            self.stdout.write("")
        
        if unmatched_videos:
            self.stdout.write("=" * 80)
            self.stdout.write(self.style.WARNING("⚠️  VIDEOS SIN EMPAREJAR:"))
            self.stdout.write("=" * 80)
            for video in unmatched_videos:
                self.stdout.write(f"❓ {video}")
            self.stdout.write("")
        
        self.stdout.write("=" * 80)
        self.stdout.write(f"📊 RESUMEN:")
        self.stdout.write("=" * 80)
        self.stdout.write(self.style.SUCCESS(f"✅ Videos asociados: {len(matched)}"))
        self.stdout.write(self.style.WARNING(f"⚠️  Videos sin emparejar: {len(unmatched_videos)}"))
        self.stdout.write("")
        
        if len(matched) > 0:
            self.stdout.write(self.style.SUCCESS("✨ ¡Videos asociados exitosamente!"))
        else:
            self.stdout.write(self.style.WARNING("⚠️  No se encontraron emparejamientos. Verifica los nombres de los archivos."))
    
    def _normalize_filename(self, filename):
        """Normaliza el nombre de archivo para comparación"""
        # Remover extensión
        name = os.path.splitext(filename)[0]
        # Convertir a mayúsculas
        name = name.upper()
        # Remover espacios extra
        name = re.sub(r'\s+', ' ', name)
        return name.strip()
    
    def _normalize_exercise_name(self, name):
        """Normaliza el nombre del ejercicio para comparación"""
        # Convertir a mayúsculas
        name = name.upper()
        # Remover espacios extra
        name = re.sub(r'\s+', ' ', name)
        return name.strip()

