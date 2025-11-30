#!/usr/bin/env python
"""
Script para probar con una petición real como la del frontend
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
from rest_framework.test import APIClient

User = get_user_model()

def test_real_request():
    """Test con petición real como la del frontend"""
    print("🔍 Test con petición real como la del frontend...")
    
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
        print("\n🔍 Probando serializer...")
        serializer = ProgressPhotoSerializer(data=data)
        
        if serializer.is_valid():
            print("✅ Serializer válido")
            print("📊 Datos validados:", serializer.validated_data)
        else:
            print("❌ Serializer inválido:")
            for field, errors in serializer.errors.items():
                print(f"   {field}: {errors}")
            return False
        
        # Probar la petición real
        print("\n🔍 Probando petición real...")
        
        client = APIClient()
        client.force_authenticate(user=user)
        
        response = client.post('/api/progress-photos/', data, format='multipart')
        
        print(f"📥 Status: {response.status_code}")
        print(f"📥 Content-Type: {response.get('Content-Type', 'No especificado')}")
        
        if response.status_code == 500:
            print("❌ Error 500 - Revisando contenido...")
            try:
                content = response.content.decode('utf-8')
                print(f"📄 Contenido de la respuesta: {content[:500]}...")
            except:
                print("📄 No se pudo decodificar el contenido")
            return False
        elif response.status_code == 400:
            print("❌ Error 400 - Revisando errores...")
            try:
                errors = response.json()
                print(f"📄 Errores: {errors}")
            except:
                print("📄 No se pudo parsear la respuesta")
            return False
        else:
            print(f"✅ Respuesta exitosa: {response.data}")
        
        print("\n🎉 Petición real exitosa!")
        return True
        
    except Exception as e:
        print(f"❌ Error general: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("🚀 Test con petición real como la del frontend...")
    print("=" * 60)
    
    success = test_real_request()
    
    print("=" * 60)
    if success:
        print("🎉 Test exitoso!")
    else:
        print("💥 Test falló!")
