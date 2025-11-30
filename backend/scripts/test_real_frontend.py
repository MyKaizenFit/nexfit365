#!/usr/bin/env python
"""
Script para probar con imagen real simulando exactamente el frontend
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
from rest_framework.test import APIRequestFactory
from rest_framework.test import force_authenticate
from progress.views import ProgressPhotoViewSet

User = get_user_model()

def test_real_frontend():
    """Test con imagen real simulando frontend"""
    print("🔍 Test con imagen real simulando frontend...")
    
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
        
        # Buscar una imagen real
        image_paths = [
            "C:/Windows/Web/Wallpaper/Windows/img0.jpg",
            "C:/Windows/Web/Wallpaper/Windows/img0.png",
            "C:/Windows/System32/oobe/images/background.bmp"
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
        
        # Crear archivo como lo haría el frontend
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
        
        # Crear datos exactamente como los envía el frontend
        data = {
            'photo': test_file,
            'photo_type': 'front',
            'date': '2025-08-30',
            'weight': '80',  # Como string como lo envía el frontend
            'notes': 'Peso: 80 kg'
        }
        
        print("\n📝 Datos simulando frontend:")
        for key, value in data.items():
            print(f"   {key}: {value}")
        
        # Probar serializer primero
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
        
        # Probar la vista completa
        print("\n🔍 Probando vista completa...")
        factory = APIRequestFactory()
        
        # Crear request como lo haría el frontend
        request = factory.post('/api/progress-photos/', data, format='multipart')
        force_authenticate(request, user=user)
        
        # Configurar viewset
        viewset = ProgressPhotoViewSet()
        viewset.request = request
        viewset.action = 'create'
        viewset.kwargs = {}
        
        try:
            # Intentar crear
            response = viewset.create(request)
            print(f"✅ Vista funcionando - Status: {response.status_code}")
            print(f"📊 Respuesta: {response.data}")
            
        except Exception as e:
            print(f"❌ Error en la vista: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
        
        print("\n🎉 Test con imagen real exitoso!")
        return True
        
    except Exception as e:
        print(f"❌ Error general: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("🚀 Test con imagen real simulando frontend...")
    print("=" * 60)
    
    success = test_real_frontend()
    
    print("=" * 60)
    if success:
        print("🎉 Test completado!")
    else:
        print("💥 Test falló!")
