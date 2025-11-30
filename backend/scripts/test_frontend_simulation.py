#!/usr/bin/env python
"""
Script para simular exactamente lo que está enviando el frontend
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

def test_frontend_simulation():
    """Simular exactamente el frontend"""
    print("🔍 Simulando frontend...")
    
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
        
        # Crear archivo como lo haría el frontend
        # El frontend usa File object que viene del input file
        file_content = b'fake image content for testing'
        test_file = SimpleUploadedFile(
            name='test_image.jpg',  # Nombre como lo enviaría el frontend
            content=file_content,
            content_type='image/jpeg'
        )
        
        print("📁 Archivo creado como lo enviaría el frontend")
        
        # Crear datos exactamente como los envía el frontend
        data = {
            'photo': test_file,
            'photo_type': 'front',  # El frontend envía 'front'
            'date': '2025-08-30',  # El frontend envía fecha como string
            'weight': '80',  # El frontend envía peso como string
            'notes': 'Peso: 80 kg'  # El frontend envía notas
        }
        
        print("📝 Datos preparados como los envía el frontend")
        
        # Probar serializer primero
        print("\n🔍 Probando serializer con datos del frontend...")
        serializer = ProgressPhotoSerializer(data=data)
        
        if serializer.is_valid():
            print("✅ Serializer válido con datos del frontend")
            print("📊 Datos validados:", serializer.validated_data)
        else:
            print("❌ Serializer inválido con datos del frontend:")
            for field, errors in serializer.errors.items():
                print(f"   {field}: {errors}")
            return False
        
        # Probar la vista como la llamaría el frontend
        print("\n🔍 Probando vista con datos del frontend...")
        
        # Crear request como lo haría el frontend
        factory = APIRequestFactory()
        request = factory.post('/api/progress-photos/', data, format='multipart')
        
        # Configurar request como lo haría el frontend
        request.user = user
        request.data = data
        request.FILES = {'photo': test_file}
        
        # Configurar viewset
        viewset = ProgressPhotoViewSet()
        viewset.request = request
        viewset.action = 'create'
        viewset.kwargs = {}
        
        try:
            # Intentar crear como lo haría el frontend
            response = viewset.create(request)
            print(f"✅ Vista funcionando con datos del frontend - Status: {response.status_code}")
            print(f"📊 Respuesta: {response.data}")
            
        except Exception as e:
            print(f"❌ Error en la vista con datos del frontend: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
        
        print("\n🎉 Simulación del frontend exitosa!")
        return True
        
    except Exception as e:
        print(f"❌ Error general: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("🚀 Simulación del frontend...")
    print("=" * 50)
    
    success = test_frontend_simulation()
    
    print("=" * 50)
    if success:
        print("🎉 Simulación exitosa!")
    else:
        print("💥 Simulación falló!")
