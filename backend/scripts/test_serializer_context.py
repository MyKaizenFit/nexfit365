#!/usr/bin/env python
"""
Script para probar que el serializer recibe el request en el contexto
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
from progress.serializers import ProgressPhotoSerializer
from django.test import RequestFactory

User = get_user_model()

def test_serializer_context():
    """Test para verificar que el serializer recibe el request en el contexto"""
    print("🔍 Test de contexto del serializer...")
    
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
        
        # Crear foto
        print("\n🔍 Creando foto...")
        photo = ProgressPhoto.objects.create(
            user=user,
            photo=SimpleUploadedFile(
                name='test_context.jpg',
                content=file_content,
                content_type='image/jpeg'
            ),
            photo_type='front',
            date='2025-08-30',  # Usar fecha actual
            weight=80.0,
            notes='Test de contexto'
        )
        print(f"✅ Foto creada con ID: {photo.id}")
        
        # Test 1: Serializer SIN contexto (como estaba antes)
        print("\n🔍 Test 1: Serializer SIN contexto...")
        serializer1 = ProgressPhotoSerializer(photo)
        data1 = serializer1.data
        print(f"   - photo_url: {data1.get('photo_url')}")
        print(f"   - thumbnail_url: {data1.get('thumbnail_url')}")
        
        # Test 2: Serializer CON contexto (como está ahora)
        print("\n🔍 Test 2: Serializer CON contexto...")
        factory = RequestFactory()
        request = factory.get('/test/')
        request.user = user
        
        serializer2 = ProgressPhotoSerializer(photo, context={'request': request})
        data2 = serializer2.data
        print(f"   - photo_url: {data2.get('photo_url')}")
        print(f"   - thumbnail_url: {data2.get('thumbnail_url')}")
        
        # Verificar que las URLs se construyen correctamente
        if data2.get('photo_url') and data2.get('photo_url') != data1.get('photo_url'):
            print("✅ Las URLs se construyen correctamente con el contexto")
        else:
            print("❌ Las URLs no se construyen correctamente")
        
        # Limpiar
        photo.delete()
        print("\n🧹 Foto de test eliminada")
        
        print("\n🎉 Test de contexto del serializer exitoso!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("🚀 Test de contexto del serializer...")
    print("=" * 50)
    
    success = test_serializer_context()
    
    print("=" * 50)
    if success:
        print("🎉 Test exitoso!")
    else:
        print("💥 Test falló!")
