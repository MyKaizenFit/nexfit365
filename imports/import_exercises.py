#!/usr/bin/env python3
"""
Script para importar ejercicios del PDF a la base de datos
Asocia videos de Google Drive cuando coincidan los nombres
"""
import re
import json
import os
import sys

# Añadir el path del backend
sys.path.insert(0, '/srv/mykaizenfit/pro/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Configurar Django
import django
django.setup()

from workouts.models import Exercise
import uuid

# ID de la carpeta de Google Drive
DRIVE_FOLDER_ID = "1dbDvVZKOwYJ4A13FtVslIid2JKLcN4fG"

# Videos disponibles en Google Drive (nombres sin extensión)
DRIVE_VIDEOS = {
    "ABDUCCIÓN en POLEA": "ABDUCCIÓN en POLEA.MOV",
    "BUENOS DÍAS en MULTIPOWER": "BUENOS DÍAS en MULTIPOWER.MOV",
    "CLAMSHELLS": "CLAMSHELLS.MOV",
    "CRUNCH ABDOMINAL en POLEA ALTA": "CRUNCH ABDOMINAL en POLEA ALTA.MOV",
    "CURL de BÍCEPS BAYESIAN": "CURL de BÍCEPS BAYESIAN.MOV",
    "CURL de BÍCEPS en POLEA con BARRA Z": "CURL de BÍCEPS en POLEA con BARRA Z.MOV",
    "CURL de BÍCEPS en POLEA UNILATERAL": "CURL de BÍCEPS en POLEA UNILATERAL.MOV",
    "CURL FEMORAL en MÁQUINA": "CURL FEMORAL en MÁQUINA.MOV",
    "DOMINADA con BANDA ELÁSTICA": "DOMINADA con BANDA ELÁSTICA.MOV",
    "DOMINADA PRONA": "DOMINADA PRONA.MOV",
    "ELEVACIÓN de TALÓN en MULTIPOWER": "ELEVACIÓN de TALÓN en MULTIPOWER.MOV",
    "EXTENSIÓN de CUÁDRICEPS en MÁQUINA": "EXTENSIÓN de CUÁDRICEPS en MÁQUINA.MOV",
    "EXTENSIÓN DE TRÍCEPS EN POLEA ALTA CON BARRA Z": "EXTENSIÓN DE TRÍCEPS EN POLEA ALTA CON BARRA Z.MOV",
    "EXTENSIÓN de TRÍCEPS en POLEA ALTA": "EXTENSIÓN de TRÍCEPS en POLEA ALTA.MOV",
    "HIP THRUST en MULTIPOWER GLUTE BUILDER": "HIP THRUST en MULTIPOWER GLUTE BUILDER.MOV",
    "HIPEREXTENSIONES con LASTRE": "HIPEREXTENSIONES con LASTRE.MOV",
    "HIPEREXTENSIONES en MÁQUINA GLUTE BUILDER": "HIPEREXTENSIONES en MÁQUINA GLUTE BUILDER.MOV",
    "HIPEREXTENSIONES": "HIPEREXTENSIONES.MOV",
    "JALÓN al PECHO AGARRE ESTRECHO": "JALÓN al PECHO AGARRE ESTRECHO.MOV",
    "JALÓN al PECHO AGARRE PRONO": "JALÓN al PECHO AGARRE PRONO.MOV",
    "JALÓN al PECHO AGARRE SUPINO": "JALÓN al PECHO AGARRE SUPINO.MOV",
    "JALÓN al PECHO AGARRE UNILATERAL": "JALÓN al PECHO AGARRE UNILATERAL.MOV",
    "JALÓN al PECHO EN MÁQUINA": "JALÓN al PECHO EN MÁQUINA.MOV",
    "PATADA de GLÚTEO en MÁQUINA": "PATADA de GLÚTEO en MÁQUINA.MOV",
    "PATADA de GLÚTEO en POLEA MEDIA": "PATADA de GLÚTEO en POLEA MEDIA.MOV",
    "PESO MUERTO PIERNAS RÍGIDAS en MULTIPOWER": "PESO MUERTO PIERNAS RÍGIDAS en MULTIPOWER.MOV",
    "PESO MUERTO RUMANO en MULTIPOWER": "PESO MUERTO RUMANO en MULTIPOWER.MOV",
    "PESO MUERTO SUMO en MULTIPOWER": "PESO MUERTO SUMO en MULTIPOWER.MOV",
    "PESO MUERTO UNILATERAL en MULTIPOWER": "PESO MUERTO UNILATERAL en MULTIPOWER.MOV",
    "PRENSA con PIES ARRIBA": "PRENSA con PIES ARRIBA.MOV",
    "PRENSA de GLÚTEO en MULTIPOWER": "PRENSA de GLÚTEO en MULTIPOWER.MOV",
    "PRENSA UNILATERAL": "PRENSA UNILATERAL.MOV",
    "PRENSA": "PRENSA.MOV",
    "PRES BANCA AGARRE ABIERTO en MULTIPOWER": "PRES BANCA AGARRE ABIERTO en MULTIPOWER.MOV",
    "PRES BANCA AGARRE ESTRECHO en MULTIPOWER": "PRES BANCA AGARRE ESTRECHO en MULTIPOWER.MOV",
    "PRES BANCA en MULTIPOWER": "PRES BANCA en MULTIPOWER.MOV",
    "PRES BANCA INCLINADO en MULTIPOWER": "PRES BANCA INCLINADO en MULTIPOWER.MOV",
    "PRES MILITAR en MULTIPOWER": "PRES MILITAR en MULTIPOWER.MOV",
    "PUENTE de GLÚTEO con PESO": "PUENTE de GLÚTEO con PESO.MOV",
    "PUENTE DE GLÚTEO": "PUENTE DE GLÚTEO.MOV",
    "PULL OVER en MÁQUINA": "PULL OVER en MÁQUINA.MOV",
    "PULL OVER en POLEA ALTA": "PULL OVER en POLEA ALTA.MOV",
    "REMO AGARRE NEUTRO en POLEA BAJA": "REMO AGARRE NEUTRO en POLEA BAJA.MOV",
    "REMO AGARRE PRONO ABIERTO en POLEA BAJA": "REMO AGARRE PRONO ABIERTO en POLEA BAJA.MOV",
    "REMO ALTO UNILATERAL en MÁQUINA": "REMO ALTO UNILATERAL en MÁQUINA.MOV",
    "REMO con BARRA": "REMO con BARRA.MOV",
    "REMO con MANCUERNA UNILATERAL": "REMO con MANCUERNA UNILATERAL.mov",
}

# Mapeo de categorías
CATEGORY_MAP = {
    'SENTADILLA': 'legs',
    'ZANCADA': 'legs',
    'PESO MUERTO': 'legs',
    'GLÚTEO': 'glutes',
    'HIP THRUST': 'glutes',
    'PUENTE': 'glutes',
    'STEP UP': 'legs',
    'PRENSA': 'legs',
    'CURL FEMORAL': 'legs',
    'EXTENSIÓN de CUÁDRICEPS': 'legs',
    'ABDUCCIÓN': 'glutes',
    'ADUCCIÓN': 'legs',
    'CLAMSHELLS': 'glutes',
    'HIPEREXTENSIONES': 'back',
    'BUENOS DÍAS': 'back',
    'JALÓN': 'back',
    'REMO': 'back',
    'DOMINADA': 'back',
    'PULL': 'back',
    'PRES BANCA': 'chest',
    'PRESS': 'chest',
    'APERTURAS': 'chest',
    'PRES MILITAR': 'shoulders',
    'ELEVACIÓN': 'shoulders',
    'FACE PULL': 'shoulders',
    'CURL de BÍCEPS': 'biceps',
    'CURL MARTILLO': 'biceps',
    'EXTENSIÓN de TRÍCEPS': 'triceps',
    'FONDOS': 'triceps',
    'CRUNCH': 'core',
    'PLANCHA': 'core',
    'ABDOMINALES': 'core',
}

def normalize_for_comparison(text):
    """Normaliza texto para comparación"""
    text = text.upper()
    # Eliminar acentos
    replacements = {'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ñ': 'N'}
    for old, new in replacements.items():
        text = text.replace(old, new)
    # Eliminar caracteres especiales
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def find_matching_video(exercise_name):
    """Busca un video que coincida con el ejercicio"""
    exercise_norm = normalize_for_comparison(exercise_name)
    
    best_match = None
    best_score = 0
    
    for video_name, video_file in DRIVE_VIDEOS.items():
        video_norm = normalize_for_comparison(video_name)
        
        # Coincidencia exacta
        if video_norm == exercise_norm:
            return video_name, video_file
        
        # Calcular similitud por palabras comunes
        video_words = set(video_norm.split())
        exercise_words = set(exercise_norm.split())
        common = video_words & exercise_words
        
        # Necesitamos al menos 2 palabras significativas en común
        significant_words = {w for w in common if len(w) > 3}
        score = len(significant_words)
        
        # Bonus si el video está contenido en el ejercicio
        if video_norm in exercise_norm:
            score += 5
        
        if score > best_score and score >= 2:
            best_score = score
            best_match = (video_name, video_file)
    
    return best_match if best_match else (None, None)

def get_category(exercise_name):
    """Determina la categoría del ejercicio"""
    name_upper = exercise_name.upper()
    
    for keyword, category in CATEGORY_MAP.items():
        if keyword in name_upper:
            return category
    
    return 'strength'  # Default

def parse_exercises_from_file(filepath):
    """Parsea ejercicios del archivo de texto"""
    exercises = []
    current_muscles = []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Detectar línea de ejercicio (empieza con número)
        match = re.match(r'^(\d+)[.\s​]+(.+)$', line)
        if match:
            number = match.group(1)
            rest = match.group(2)
            
            # Puede que el ejercicio continúe en la siguiente línea
            while i + 1 < len(lines) and not re.match(r'^\d+[.\s]', lines[i + 1].strip()) and not lines[i + 1].strip().startswith('🟩') and not lines[i + 1].strip().startswith('🟥') and not lines[i + 1].strip().startswith('🟦') and not lines[i + 1].strip().startswith('🟧') and not lines[i + 1].strip().startswith('🟨') and not lines[i + 1].strip().startswith('🟪') and lines[i + 1].strip() and '—' not in lines[i + 1]:
                i += 1
                rest += ' ' + lines[i].strip()
            
            # Parsear la línea completa
            parts = rest.split('|')
            if len(parts) >= 1:
                name = parts[0].strip()
                # Limpiar caracteres especiales
                name = re.sub(r'[​]+', '', name).strip()
                
                type_info = parts[1].strip() if len(parts) > 1 else ''
                muscles_str = parts[2].strip() if len(parts) > 2 else ''
                
                # Limpiar músculos
                muscles = [m.strip() for m in re.split(r'[,​]+', muscles_str) if m.strip()]
                
                if name:
                    exercises.append({
                        'number': int(number),
                        'name': name,
                        'type_info': type_info,
                        'muscles': muscles,
                        'category': get_category(name),
                    })
        
        i += 1
    
    return exercises

def import_to_database(exercises, dry_run=False):
    """Importa ejercicios a la base de datos"""
    
    if not dry_run:
        # Eliminar ejercicios existentes
        deleted_count = Exercise.objects.all().delete()[0]
        print(f"🗑️  Eliminados {deleted_count} ejercicios existentes")
    
    created = 0
    with_video = 0
    
    for ex in exercises:
        video_name, video_file = find_matching_video(ex['name'])
        
        # Construir URL de video de Google Drive si hay match
        video_url = None
        google_drive_id = None
        
        if video_file:
            # URL para embed de Google Drive
            google_drive_id = f"folder:{DRIVE_FOLDER_ID}/file:{video_file}"
            with_video += 1
        
        # Instrucciones básicas
        instructions = f"Ejercicio de {ex['category']}. "
        if ex['type_info']:
            instructions += f"Tipo: {ex['type_info']}. "
        if ex['muscles']:
            instructions += f"Músculos trabajados: {', '.join(ex['muscles'])}."
        
        if not dry_run:
            Exercise.objects.create(
                id=uuid.uuid4(),
                name=ex['name'],
                category=ex['category'],
                muscle_groups=ex['muscles'],
                instructions=instructions,
                video_url=video_url or '',
                image_url='',
                google_drive_file_id=google_drive_id or '',
            )
        
        created += 1
        
        # Mostrar progreso cada 50
        if created % 50 == 0:
            print(f"   Procesados {created} ejercicios...")
    
    return created, with_video

def main():
    print("=" * 60)
    print("🏋️ IMPORTADOR DE EJERCICIOS")
    print("=" * 60)
    print()
    
    # Parsear ejercicios
    print("📖 Parseando ejercicios del PDF...")
    exercises = parse_exercises_from_file('/srv/mykaizenfit/pro/imports/ejercicios.txt')
    print(f"   Encontrados: {len(exercises)} ejercicios")
    print()
    
    # Mostrar estadísticas por categoría
    categories = {}
    for ex in exercises:
        cat = ex['category']
        categories[cat] = categories.get(cat, 0) + 1
    
    print("📊 Por categoría:")
    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        print(f"   {cat}: {count}")
    print()
    
    # Contar ejercicios con video
    with_video = sum(1 for ex in exercises if find_matching_video(ex['name'])[0])
    print(f"🎬 Con video asociado: {with_video}/{len(exercises)}")
    print()
    
    # Mostrar algunos ejemplos
    print("📋 Ejemplos de ejercicios parseados:")
    for ex in exercises[:5]:
        video_name, _ = find_matching_video(ex['name'])
        video_status = f"🎬 {video_name}" if video_name else "❌ Sin video"
        print(f"   {ex['number']}. {ex['name']}")
        print(f"      Categoría: {ex['category']} | Músculos: {', '.join(ex['muscles'][:3])}")
        print(f"      Video: {video_status}")
        print()
    
    # Importar a la base de datos
    print("💾 Importando a la base de datos...")
    created, with_video_count = import_to_database(exercises, dry_run=False)
    
    print()
    print("=" * 60)
    print("✅ IMPORTACIÓN COMPLETADA")
    print("=" * 60)
    print(f"   Total importados: {created}")
    print(f"   Con video: {with_video_count}")
    print(f"   Sin video: {created - with_video_count}")
    print()

if __name__ == '__main__':
    main()






