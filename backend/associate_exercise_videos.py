#!/usr/bin/env python3
"""
Script para asociar videos de la carpeta media/exercises/videos/ con ejercicios existentes
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.conf import settings
from workouts.models import Exercise
from pathlib import Path
import re

def normalize_filename(filename):
    """Normaliza el nombre de archivo para comparación"""
    # Remover extensión
    name = os.path.splitext(filename)[0]
    # Convertir a mayúsculas
    name = name.upper()
    # Remover espacios extra
    name = re.sub(r'\s+', ' ', name)
    return name.strip()

def normalize_exercise_name(name):
    """Normaliza el nombre del ejercicio para comparación"""
    # Convertir a mayúsculas
    name = name.upper()
    # Remover espacios extra
    name = re.sub(r'\s+', ' ', name)
    return name.strip()

def main():
    # Buscar en backend/media (donde están realmente los videos)
    backend_dir = Path(__file__).parent
    videos_dir = backend_dir / 'media' / 'exercises' / 'videos'
    
    if not videos_dir.exists():
        # Intentar también en MEDIA_ROOT
        videos_dir = settings.MEDIA_ROOT / 'exercises' / 'videos'
        if not videos_dir.exists():
            print(f"❌ Directorio no encontrado: {videos_dir}")
            return
    
    # Obtener todos los archivos de video
    video_files = [f for f in os.listdir(videos_dir) if f.endswith(('.mov', '.MOV', '.mp4', '.MP4'))]
    
    print(f"\n📁 Encontrados {len(video_files)} videos en {videos_dir}\n")
    
    # Obtener todos los ejercicios
    exercises = Exercise.objects.all()
    print(f"🏋️ Encontrados {exercises.count()} ejercicios en la base de datos\n")
    
    # Crear diccionarios de búsqueda
    video_dict = {normalize_filename(f): f for f in video_files}
    exercise_dict = {normalize_exercise_name(e.name): e for e in exercises}
    
    # Intentar emparejar videos con ejercicios
    matched = []
    unmatched_videos = []
    unmatched_exercises = []
    
    for video_normalized, video_filename in video_dict.items():
        exercise = exercise_dict.get(video_normalized)
        if exercise:
            matched.append((exercise, video_filename))
        else:
            unmatched_videos.append(video_filename)
    
    print("=" * 80)
    print("✅ VIDEOS ASOCIADOS:")
    print("=" * 80)
    
    for exercise, video_filename in matched:
        rel_path = f"exercises/videos/{video_filename}"
        
        # Asociar el video al ejercicio
        exercise.video_file.name = rel_path
        exercise.save()
        
        print(f"✅ {exercise.name}")
        print(f"   Video: {video_filename}")
        print()
    
    if unmatched_videos:
        print("=" * 80)
        print("⚠️  VIDEOS SIN EMPAREJAR:")
        print("=" * 80)
        for video in unmatched_videos:
            print(f"❓ {video}")
        print()
    
    print("=" * 80)
    print(f"📊 RESUMEN:")
    print("=" * 80)
    print(f"✅ Videos asociados: {len(matched)}")
    print(f"⚠️  Videos sin emparejar: {len(unmatched_videos)}")
    print()
    
    if len(matched) > 0:
        print("✨ ¡Videos asociados exitosamente!")
    else:
        print("⚠️  No se encontraron emparejamientos. Verifica los nombres de los archivos.")

if __name__ == '__main__':
    main()

