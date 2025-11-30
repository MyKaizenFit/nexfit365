#!/usr/bin/env python
"""
Script para probar directamente la subida sin usar el cliente de test
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
from rest_framework.test import force_authenticate

User = get_user_model()

def test_direct_upload():
    """Test directo de subida sin cliente"""
    print("🔍 Test directo de subida...")
    
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
        
        # Crear archivo simple pero válido
        file_content = b'fake image content for testing'
        test_file = SimpleUploadedFile(
            name='test.jpg',
            content=file_content,
            content_type='image/jpeg'
        )
        
        print("📁 Archivo creado")
        
        # Crear datos
        data = {
            'photo': test_file,
            'photo_type': 'front',
            'date': '2025-08-30',
            'weight': '80',
            'notes': 'Test'
        }
        
        print("📝 Datos preparados")
        
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
        
        # Probar la vista directamente
        print("\n🔍 Probando vista directamente...")
        
        # Crear request manualmente
        factory = APIRequestFactory()
        request = factory.post('/api/progress-photos/', data, format='multipart')
        
        # Configurar request manualmente
        request.user = user
        request.data = data
        request.FILES = {'photo': test_file}
        
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
        
        print("\n🎉 Test directo exitoso!")
        return True
        
    except Exception as e:
        print(f"❌ Error general: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("🚀 Test directo de subida...")
    print("=" * 40)
    
    success = test_direct_upload()
    
    print("=" * 40)
    if success:
        print("🎉 Test completado!")
    else:
        print("💥 Test falló!")
