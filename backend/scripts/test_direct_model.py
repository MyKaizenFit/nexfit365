#!/usr/bin/env python
"""
Script para probar directamente el modelo sin usar herramientas de testing
"""

import os
import sys
import django
from pathlib import Path

# Agregar el directorio del proyecto al path
project_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_dir))

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from progress.models import ProgressPhoto

User = get_user_model()

def test_direct_model():
    """Test directo del modelo"""
    print("🔍 Test directo del modelo...")
    
    try:
        # Usuario de test
        user, created = User.objects.get_or_create(
            email='test@example.com',
            defaults={
                'username': 'testuser',
                'first_name': 'Test',
                'last_name': 'User'
            }
        )
        
        print(f"✅ Usuario: {user.email}")
        
        # Buscar archivo de imagen real
        image_paths = [
            "C:/Windows/Web/Wallpaper/Windows/img0.jpg",
            "C:/Windows/Web/Wallpaper/Windows/img0.png",
            "C:/Windows/System32/oobe/images/background.bmp"
        ]
        
        image_file = None
        for path in image_paths:
            if os.path.exists(path):
                try:
                    with open(path, 'rb') as f:
                        image_content = f.read()
                    
                    ext = Path(path).suffix.lower()
                    if ext == '.jpg' or ext == '.jpeg':
                        content_type = 'image/jpeg'
                        file_name = 'test_image.jpg'
                    elif ext == '.png':
                        content_type = 'image/png'
                        file_name = 'test_image.png'
                    elif ext == '.bmp':
                        content_type = 'image/bmp'
                        file_name = 'test_image.bmp'
                    else:
                        continue
                    
                    image_file = SimpleUploadedFile(
                        name=file_name,
                        content=image_content,
                        content_type=content_type
                    )
                    print(f"✅ Archivo encontrado: {path}")
                    print(f"📁 Tamaño: {len(image_content)} bytes")
                    print(f"🔧 Content-Type: {content_type}")
                    break
                    
                except Exception as e:
                    print(f"⚠️ No se pudo leer {path}: {e}")
                    continue
        
        if not image_file:
            print("❌ No se encontró ningún archivo de imagen válido")
            return False
        
        # Crear ProgressPhoto directamente
        print("\n🔍 Creando ProgressPhoto directamente...")
        
        try:
            progress_photo = ProgressPhoto.objects.create(
                user=user,
                photo=image_file,
                photo_type='front',
                date='2025-08-30',
                weight=80.0,
                notes='Test directo del modelo'
            )
            
            print(f"✅ ProgressPhoto creado con ID: {progress_photo.id}")
            print(f"📁 Archivo guardado en: {progress_photo.photo.path}")
            print(f"📊 Datos: {progress_photo.photo_type}, {progress_photo.weight}, {progress_photo.notes}")
            
            # Limpiar
            progress_photo.delete()
            print("🧹 Archivo de test eliminado")
            
            print("\n🎉 Test directo del modelo exitoso!")
            return True
            
        except Exception as e:
            print(f"❌ Error al crear ProgressPhoto: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
        
    except Exception as e:
        print(f"❌ Error general: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("🚀 Test directo del modelo...")
    print("=" * 50)
    
    success = test_direct_model()
    
    print("=" * 50)
    if success:
        print("🎉 Test exitoso!")
    else:
        print("💥 Test falló!")
