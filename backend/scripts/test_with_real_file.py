#!/usr/bin/env python
"""
Script para probar con un archivo de imagen real del sistema
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
from progress.serializers import ProgressPhotoSerializer
from progress.models import ProgressPhoto

User = get_user_model()

def test_with_real_file():
    """Test con archivo real del sistema"""
    print("🔍 Test con archivo real del sistema...")
    
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
        
        # Buscar archivos de imagen reales en el sistema
        image_paths = [
            "C:/Windows/System32/oobe/images/background.bmp",
            "C:/Windows/Web/Wallpaper/Windows/img0.jpg",
            "C:/Windows/Web/Wallpaper/Windows/img0.png",
            "C:/Windows/Web/Wallpaper/Windows/img0_1920x1200.jpg"
        ]
        
        image_file = None
        image_path = None
        
        for path in image_paths:
            if os.path.exists(path):
                try:
                    with open(path, 'rb') as f:
                        image_content = f.read()
                    
                    # Determinar content type basado en extensión
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
                    image_path = path
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
        
        # Crear datos
        data = {
            'photo': image_file,
            'photo_type': 'front',
            'date': '2025-08-30',
            'weight': '80',
            'notes': 'Test con archivo real'
        }
        
        print("📝 Datos preparados")
        
        # Probar serializer
        print("\n🔍 Probando serializer...")
        serializer = ProgressPhotoSerializer(data=data)
        
        if serializer.is_valid():
            print("✅ Serializer válido")
            print("📊 Datos validados:", serializer.validated_data)
            
            # Intentar guardar
            try:
                progress_photo = serializer.save(user=user)
                print(f"✅ ProgressPhoto creado con ID: {progress_photo.id}")
                print(f"📁 Archivo guardado en: {progress_photo.photo.path}")
                
                # Limpiar
                progress_photo.delete()
                print("🧹 Archivo de test eliminado")
                
                return True
                
            except Exception as e:
                print(f"❌ Error al guardar: {str(e)}")
                import traceback
                traceback.print_exc()
                return False
                
        else:
            print("❌ Serializer inválido:")
            for field, errors in serializer.errors.items():
                print(f"   {field}: {errors}")
            return False
        
    except Exception as e:
        print(f"❌ Error general: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("🚀 Test con archivo real del sistema...")
    print("=" * 50)
    
    success = test_with_real_file()
    
    print("=" * 50)
    if success:
        print("🎉 Test completado!")
    else:
        print("💥 Test falló!")
