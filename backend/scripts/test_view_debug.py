#!/usr/bin/env python
"""
Script para debuggear la vista paso a paso
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
from rest_framework.test import APIClient

User = get_user_model()

def test_view_debug():
    """Debug de la vista paso a paso"""
    print("🔍 Debug de la vista...")
    
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
        
        # Crear archivo simple
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
        else:
            print("❌ Serializer inválido:")
            for field, errors in serializer.errors.items():
                print(f"   {field}: {errors}")
            return False
        
        # Probar la vista con APIClient
        print("\n🔍 Probando vista con APIClient...")
        
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
        elif response.status_code == 400:
            print("❌ Error 400 - Revisando errores...")
            try:
                errors = response.json()
                print(f"📄 Errores: {errors}")
            except:
                print("📄 No se pudo parsear la respuesta")
        else:
            print(f"✅ Respuesta exitosa: {response.data}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error general: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("🚀 Debug de la vista...")
    print("=" * 40)
    
    success = test_view_debug()
    
    print("=" * 40)
    if success:
        print("🎉 Debug completado!")
    else:
        print("💥 Debug falló!")
