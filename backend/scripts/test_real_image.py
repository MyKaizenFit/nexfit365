#!/usr/bin/env python
"""
Script para probar con una imagen real del sistema
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

User = get_user_model()

def test_with_real_image():
    """Test con una imagen real"""
    print("🔍 Probando con imagen real...")
    
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
        
        # Buscar una imagen en el sistema
        image_paths = [
            "C:/Windows/System32/oobe/images/background.bmp",
            "C:/Windows/Web/Wallpaper/Windows/img0.jpg",
            "C:/Windows/Web/Wallpaper/Windows/img0.png",
            "C:/Windows/Web/Wallpaper/Windows/img0_1920x1200.jpg"
        ]
        
        image_path = None
        for path in image_paths:
            if os.path.exists(path):
                image_path = path
                break
        
        if not image_path:
            print("❌ No se encontró ninguna imagen del sistema")
            return False
        
        print(f"📁 Usando imagen: {image_path}")
        
        # Leer la imagen
        with open(image_path, 'rb') as f:
            image_content = f.read()
        
        # Crear archivo de test
        file_name = os.path.basename(image_path)
        content_type = 'image/jpeg' if file_name.endswith('.jpg') else 'image/png'
        
        test_file = SimpleUploadedFile(
            name=file_name,
            content=image_content,
            content_type=content_type
        )
        
        print(f"📁 Archivo creado: {file_name}")
        print(f"   Tamaño: {len(image_content)} bytes")
        print(f"   Content-Type: {content_type}")
        
        # Crear datos para el serializer
        data = {
            'photo': test_file,
            'photo_type': 'front',
            'weight': 75.5,
            'notes': 'Test con imagen real',
            'date': '2025-08-30'
        }
        
        # Probar el serializer
        print("\n🔍 Probando serializer...")
        serializer = ProgressPhotoSerializer(data=data)
        
        if serializer.is_valid():
            print("✅ Serializer válido")
            print("📊 Datos validados:", serializer.validated_data)
            
            # Intentar guardar
            try:
                progress_photo = serializer.save(user=user)
                print("✅ ProgressPhoto creado exitosamente")
                print(f"   ID: {progress_photo.id}")
                print(f"   Archivo: {progress_photo.photo}")
                
                # Limpiar
                progress_photo.delete()
                print("🧹 Limpiado")
                
            except Exception as e:
                print(f"❌ Error al guardar: {str(e)}")
                import traceback
                traceback.print_exc()
                
        else:
            print("❌ Serializer inválido:")
            for field, errors in serializer.errors.items():
                print(f"   {field}: {errors}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error general: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("🚀 Test con imagen real...")
    print("=" * 50)
    
    success = test_with_real_image()
    
    print("=" * 50)
    if success:
        print("🎉 Test completado!")
    else:
        print("💥 Test falló!")
