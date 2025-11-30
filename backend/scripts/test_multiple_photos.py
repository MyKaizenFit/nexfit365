#!/usr/bin/env python
"""
Script para probar que se pueden crear múltiples fotos del mismo tipo en la misma fecha
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

def test_multiple_photos():
    """Test para verificar múltiples fotos"""
    print("🔍 Test de múltiples fotos...")
    
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
        
        # Crear primera foto
        print("\n🔍 Creando primera foto...")
        photo1 = ProgressPhoto.objects.create(
            user=user,
            photo=SimpleUploadedFile(
                name='test1.jpg',
                content=file_content,
                content_type='image/jpeg'
            ),
            photo_type='front',
            date='2025-08-30',
            weight=80.0,
            notes='Primera foto'
        )
        print(f"✅ Primera foto creada con ID: {photo1.id}")
        
        # Crear segunda foto del mismo tipo en la misma fecha
        print("\n🔍 Creando segunda foto del mismo tipo...")
        photo2 = ProgressPhoto.objects.create(
            user=user,
            photo=SimpleUploadedFile(
                name='test2.jpg',
                content=file_content,
                content_type='image/jpeg'
            ),
            photo_type='front',
            date='2025-08-30',
            weight=80.5,
            notes='Segunda foto'
        )
        print(f"✅ Segunda foto creada con ID: {photo2.id}")
        
        # Verificar que ambas fotos existen
        photos = ProgressPhoto.objects.filter(user=user, date='2025-08-30', photo_type='front')
        print(f"📊 Total de fotos del mismo tipo en la misma fecha: {photos.count()}")
        
        # Limpiar
        photo1.delete()
        photo2.delete()
        print("🧹 Fotos de test eliminadas")
        
        print("\n🎉 Test de múltiples fotos exitoso!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("🚀 Test de múltiples fotos...")
    print("=" * 50)
    
    success = test_multiple_photos()
    
    print("=" * 50)
    if success:
        print("🎉 Test exitoso!")
    else:
        print("💥 Test falló!")
