#!/usr/bin/env python
"""
Script simple para probar la subida de archivos
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

def test_simple_upload():
    """Test simple de subida"""
    print("🧪 Test simple de subida...")
    
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
        
        # Intentar crear directamente en el modelo
        try:
            progress_photo = ProgressPhoto.objects.create(
                user=user,
                photo=test_file,
                photo_type='front',
                date='2025-08-30',
                weight=75.5,
                notes='Test directo'
            )
            
            print("✅ ProgressPhoto creado directamente")
            print(f"   ID: {progress_photo.id}")
            print(f"   Archivo: {progress_photo.photo}")
            print(f"   Tipo: {progress_photo.photo_type}")
            
            # Limpiar
            progress_photo.delete()
            print("🧹 Limpiado")
            
        except Exception as e:
            print(f"❌ Error al crear directamente: {str(e)}")
            import traceback
            traceback.print_exc()
            
        return True
        
    except Exception as e:
        print(f"❌ Error general: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("🚀 Test simple de subida...")
    print("=" * 40)
    
    success = test_simple_upload()
    
    print("=" * 40)
    if success:
        print("🎉 Test completado!")
    else:
        print("💥 Test falló!")
