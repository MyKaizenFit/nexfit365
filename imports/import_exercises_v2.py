#!/usr/bin/env python3
"""
Script mejorado para importar ejercicios del PDF a la base de datos
"""
import re
import os
import sys

sys.path.insert(0, '/srv/mykaizenfit/pro/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
django.setup()

from workouts.models import Exercise
import uuid

DRIVE_FOLDER_ID = "1dbDvVZKOwYJ4A13FtVslIid2JKLcN4fG"

# Videos de Google Drive - nombres exactos
DRIVE_VIDEOS = [
    "ABDUCCIÓN en POLEA",
    "BUENOS DÍAS en MULTIPOWER",
    "CLAMSHELLS",
    "CRUNCH ABDOMINAL en POLEA ALTA",
    "CURL de BÍCEPS BAYESIAN",
    "CURL de BÍCEPS en POLEA con BARRA Z",
    "CURL de BÍCEPS en POLEA UNILATERAL",
    "CURL FEMORAL en MÁQUINA",
    "DOMINADA con BANDA ELÁSTICA",
    "DOMINADA PRONA",
    "ELEVACIÓN de TALÓN en MULTIPOWER",
    "EXTENSIÓN de CUÁDRICEPS en MÁQUINA",
    "EXTENSIÓN DE TRÍCEPS EN POLEA ALTA CON BARRA Z",
    "EXTENSIÓN de TRÍCEPS en POLEA ALTA",
    "HIP THRUST en MULTIPOWER GLUTE BUILDER",
    "HIPEREXTENSIONES con LASTRE",
    "HIPEREXTENSIONES en MÁQUINA GLUTE BUILDER",
    "HIPEREXTENSIONES",
    "JALÓN al PECHO AGARRE ESTRECHO",
    "JALÓN al PECHO AGARRE PRONO",
    "JALÓN al PECHO AGARRE SUPINO",
    "JALÓN al PECHO AGARRE UNILATERAL",
    "JALÓN al PECHO EN MÁQUINA",
    "PATADA de GLÚTEO en MÁQUINA",
    "PATADA de GLÚTEO en POLEA MEDIA",
    "PESO MUERTO PIERNAS RÍGIDAS en MULTIPOWER",
    "PESO MUERTO RUMANO en MULTIPOWER",
    "PESO MUERTO SUMO en MULTIPOWER",
    "PESO MUERTO UNILATERAL en MULTIPOWER",
    "PRENSA con PIES ARRIBA",
    "PRENSA de GLÚTEO en MULTIPOWER",
    "PRENSA UNILATERAL",
    "PRENSA",
    "PRES BANCA AGARRE ABIERTO en MULTIPOWER",
    "PRES BANCA AGARRE ESTRECHO en MULTIPOWER",
    "PRES BANCA en MULTIPOWER",
    "PRES BANCA INCLINADO en MULTIPOWER",
    "PRES MILITAR en MULTIPOWER",
    "PUENTE de GLÚTEO con PESO",
    "PUENTE DE GLÚTEO",
    "PULL OVER en MÁQUINA",
    "PULL OVER en POLEA ALTA",
    "REMO AGARRE NEUTRO en POLEA BAJA",
    "REMO AGARRE PRONO ABIERTO en POLEA BAJA",
    "REMO ALTO UNILATERAL en MÁQUINA",
    "REMO con BARRA",
    "REMO con MANCUERNA UNILATERAL",
]

def normalize(text):
    """Normaliza texto para comparación"""
    text = text.upper()
    replacements = {'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ñ': 'N'}
    for old, new in replacements.items():
        text = text.replace(old, new)
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def find_video(exercise_name):
    """Busca video que coincida EXACTAMENTE o muy similar"""
    exercise_norm = normalize(exercise_name)
    
    for video in DRIVE_VIDEOS:
        video_norm = normalize(video)
        
        # Coincidencia exacta
        if video_norm == exercise_norm:
            return video
        
        # El ejercicio contiene exactamente el nombre del video
        if video_norm in exercise_norm:
            # Verificar que no sea una coincidencia parcial incorrecta
            # Por ejemplo, "PESO MUERTO RUMANO" debe coincidir con "PESO MUERTO RUMANO en MULTIPOWER"
            # pero no con "PESO MUERTO SUMO"
            return video
    
    return None

def get_category(exercise_name, current_section):
    """Determina categoría basada en nombre y sección actual"""
    name = exercise_name.upper()
    
    # Por sección del PDF
    if 'SENTADILLA' in current_section or 'SENTADILLA' in name:
        return 'legs'
    if 'ZANCADA' in current_section or 'ZANCADA' in name:
        return 'legs'
    if 'PESO MUERTO' in current_section or 'PESO MUERTO' in name:
        return 'legs'
    if 'GLÚTEO' in current_section or 'HIP THRUST' in name or 'PUENTE' in name:
        return 'glutes'
    if 'STEP UP' in current_section or 'STEP UP' in name:
        return 'legs'
    if 'PRENSA' in current_section or 'PRENSA' in name:
        return 'legs'
    if 'FEMORAL' in name or 'CUÁDRICEPS' in name:
        return 'legs'
    if 'ESPALDA' in current_section or 'JALÓN' in name or 'REMO' in name or 'DOMINADA' in name:
        return 'back'
    if 'HOMBRO' in current_section or 'PRESS MILITAR' in name or 'ELEVACIÓN' in name:
        return 'shoulders'
    if 'PECHO' in current_section or 'PRESS BANCA' in name or 'PRES BANCA' in name or 'APERTURA' in name:
        return 'chest'
    if 'TRÍCEPS' in current_section or 'TRÍCEPS' in name or 'FONDOS' in name:
        return 'triceps'
    if 'BÍCEPS' in current_section or 'BÍCEPS' in name or 'CURL' in name:
        return 'biceps'
    if 'ANTEBRAZO' in current_section or 'MUÑECA' in name:
        return 'forearms'
    if 'CORE' in current_section or 'CRUNCH' in name or 'PLANCHA' in name or 'ABDOMIN' in name:
        return 'core'
    
    return 'strength'

def parse_exercises(filepath):
    """Parsea ejercicios del archivo de texto"""
    exercises = []
    current_section = ""
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Limpiar caracteres especiales
    content = content.replace('​', ' ')  # Zero-width space
    
    lines = content.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i].strip()
        
        # Detectar sección (empieza con emoji)
        if line.startswith('🟩') or line.startswith('🟥') or line.startswith('🟦') or line.startswith('🟧') or line.startswith('🟨') or line.startswith('🟪'):
            current_section = line
            i += 1
            continue
        
        # Detectar línea de ejercicio (puede tener espacios al inicio)
        match = re.match(r'^\s*(\d+)[.\s​]+(.*)$', line)
        if match:
            number = int(match.group(1))
            rest = match.group(2).strip()
            
            # Acumular líneas siguientes si el ejercicio está cortado
            while i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                # Parar si es otro ejercicio, sección, o línea vacía significativa
                if re.match(r'^\d+[.\s]', next_line) or next_line.startswith('🟩') or next_line.startswith('🟥') or next_line.startswith('🟦') or next_line.startswith('🟧') or next_line.startswith('🟨') or next_line.startswith('🟪') or (not next_line and rest.endswith('|')):
                    break
                # Si la línea continúa
                if next_line and not next_line.isupper() or '|' in next_line or next_line.startswith('Cuádriceps') or next_line.startswith('Glúteo') or next_line.startswith('Bíceps'):
                    rest += ' ' + next_line
                    i += 1
                else:
                    break
            
            # Parsear partes
            parts = rest.split('|')
            name = parts[0].strip() if parts else rest
            type_info = parts[1].strip() if len(parts) > 1 else ''
            muscles_str = parts[2].strip() if len(parts) > 2 else ''
            
            # Limpiar nombre
            name = re.sub(r'\s+', ' ', name).strip()
            
            if name and len(name) > 3:
                # Parsear músculos
                muscles = [m.strip() for m in re.split(r'[,\s]+', muscles_str) if m.strip() and len(m.strip()) > 2]
                
                exercises.append({
                    'number': number,
                    'name': name,
                    'type_info': type_info,
                    'muscles': muscles[:5],  # Máximo 5 músculos
                    'category': get_category(name, current_section),
                    'section': current_section,
                })
        
        i += 1
    
    return exercises

def main():
    print("=" * 60)
    print("🏋️ IMPORTADOR DE EJERCICIOS v2")
    print("=" * 60)
    print()
    
    # Parsear - usar archivo layout que tiene mejor extracción
    print("📖 Parseando ejercicios...")
    exercises = parse_exercises('/srv/mykaizenfit/pro/imports/ejercicios_layout.txt')
    print(f"   Encontrados: {len(exercises)} ejercicios")
    print()
    
    # Estadísticas por categoría
    categories = {}
    for ex in exercises:
        cat = ex['category']
        categories[cat] = categories.get(cat, 0) + 1
    
    print("📊 Por categoría:")
    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        print(f"   {cat}: {count}")
    print()
    
    # Asociar videos
    with_video = 0
    video_matches = []
    for ex in exercises:
        video = find_video(ex['name'])
        if video:
            with_video += 1
            video_matches.append((ex['name'], video))
    
    print(f"🎬 Con video: {with_video}/{len(exercises)}")
    print()
    
    # Mostrar matches de video
    print("🎬 Ejercicios con video asociado:")
    for name, video in video_matches[:15]:
        print(f"   ✅ {name}")
        print(f"      → {video}")
    if len(video_matches) > 15:
        print(f"   ... y {len(video_matches) - 15} más")
    print()
    
    # Importar a BD
    print("💾 Importando a la base de datos...")
    
    # Eliminar existentes
    deleted = Exercise.objects.all().delete()[0]
    print(f"   🗑️ Eliminados {deleted} ejercicios existentes")
    
    created = 0
    for ex in exercises:
        video = find_video(ex['name'])
        
        # Instrucciones
        instructions = f"Ejercicio de {ex['category']}."
        if ex['type_info']:
            instructions += f" {ex['type_info']}."
        if ex['muscles']:
            instructions += f" Músculos: {', '.join(ex['muscles'])}."
        
        Exercise.objects.create(
            id=uuid.uuid4(),
            name=ex['name'],
            category=ex['category'],
            muscle_groups=ex['muscles'],
            instructions=instructions,
            video_url='',
            image_url='',
            google_drive_file_id=f"{video}.MOV" if video else '',
        )
        created += 1
    
    print(f"   ✅ Creados {created} ejercicios")
    print()
    print("=" * 60)
    print("✅ IMPORTACIÓN COMPLETADA")
    print("=" * 60)

if __name__ == '__main__':
    main()

