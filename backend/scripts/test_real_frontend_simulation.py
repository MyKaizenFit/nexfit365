#!/usr/bin/env python
"""
Script para simular el frontend con un archivo de imagen real
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
from progress.views import ProgressPhotoViewSet
from rest_framework.test import APIRequestFactory

User = get_user_model()

def test_real_frontend_simulation():
    """Simular frontend con archivo real"""
    print("🔍 Simulando frontend con archivo real...")
    
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
        
        # Crear datos exactamente como los envía el frontend
        data = {
            'photo': image_file,
            'photo_type': 'front',
            'date': '2025-08-30',
            'weight': '80',
            'notes': 'Peso: 80 kg'
        }
        
        print("📝 Datos preparados como los envía el frontend")
        
        # Probar serializer
        print("\n🔍 Probando serializer con archivo real...")
        serializer = ProgressPhotoSerializer(data=data)
        
        if serializer.is_valid():
            print("✅ Serializer válido con archivo real")
            print("📊 Datos validados:", serializer.validated_data)
        else:
            print("❌ Serializer inválido con archivo real:")
            for field, errors in serializer.errors.items():
                print(f"   {field}: {errors}")
            return False
        
        # Probar la vista
        print("\n🔍 Probando vista con archivo real...")
        
        factory = APIRequestFactory()
        request = factory.post('/api/progress-photos/', data, format='multipart')
        
        request.user = user
        request.data = data
        request.FILES = {'photo': image_file}
        
        viewset = ProgressPhotoViewSet()
        viewset.request = request
        viewset.action = 'create'
        viewset.kwargs = {}
        
        try:
            response = viewset.create(request)
            print(f"✅ Vista funcionando con archivo real - Status: {response.status_code}")
            print(f"📊 Respuesta: {response.data}")
            
        except Exception as e:
            print(f"❌ Error en la vista con archivo real: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
        
        print("\n🎉 Simulación del frontend con archivo real exitosa!")
        return True
        
    except Exception as e:
        print(f"❌ Error general: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("🚀 Simulación del frontend con archivo real...")
    print("=" * 60)
    
    success = test_real_frontend_simulation()
    
    print("=" * 60)
    if success:
        print("🎉 Simulación exitosa!")
    else:
        print("💥 Simulación falló!")
