#!/usr/bin/env python
"""
Script para probar la creación de ProgressPhoto y identificar problemas
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
from rest_framework.test import APIRequestFactory
from rest_framework.test import force_authenticate
from progress.views import ProgressPhotoViewSet

User = get_user_model()

def create_test_image():
    """Crear una imagen de test válida"""
    # Crear un archivo PNG válido (header PNG mínimo)
    png_header = b'\x89PNG\r\n\x1a\n'
    png_chunk = b'\x00\x00\x00\x0d'  # longitud del chunk IHDR
    png_chunk += b'IHDR'  # tipo de chunk
    png_chunk += b'\x00\x00\x00\x01'  # ancho 1px
    png_chunk += b'\x00\x00\x00\x01'  # alto 1px
    png_chunk += b'\x08'  # profundidad de color
    png_chunk += b'\x02'  # tipo de color (RGB)
    png_chunk += b'\x00'  # compresión
    png_chunk += b'\x00'  # filtro
    png_chunk += b'\x00'  # entrelazado
    
    # Calcular CRC (simplificado para test)
    import zlib
    crc = zlib.crc32(png_chunk[4:]) & 0xffffffff
    png_chunk += crc.to_bytes(4, 'big')
    
    # Chunk IEND
    png_end = b'\x00\x00\x00\x00' + b'IEND' + b'\xae\x42\x60\x82'
    
    # Imagen completa
    image_data = png_header + png_chunk + png_end
    
    return SimpleUploadedFile(
        name='test_image.png',
        content=image_data,
        content_type='image/png'
    )

def test_progress_photo_creation():
    """Test básico de creación de ProgressPhoto"""
    print("🧪 Iniciando test de ProgressPhoto...")
    
    try:
        # Crear un usuario de test
        user, created = User.objects.get_or_create(
            email='test@example.com',
            defaults={
                'username': 'testuser',
                'first_name': 'Test',
                'last_name': 'User'
            }
        )
        
        if created:
            user.set_password('testpass123')
            user.save()
            print(f"✅ Usuario de test creado: {user.email}")
        else:
            print(f"✅ Usuario de test existente: {user.email}")
        
        # Crear un archivo de test válido
        test_file = create_test_image()
        print("📁 Archivo de test PNG válido creado")
        
        # Crear datos para el serializer
        data = {
            'photo': test_file,
            'photo_type': 'front',
            'weight': 75.5,
            'notes': 'Test photo upload',
            'date': '2025-08-30'
        }
        
        print("📝 Datos de test preparados:", data)
        
        # Probar el serializer
        print("\n🔍 Probando serializer...")
        serializer = ProgressPhotoSerializer(data=data)
        if serializer.is_valid():
            print("✅ Serializer válido")
            print("📊 Datos validados:", serializer.validated_data)
        else:
            print("❌ Serializer inválido:")
            print("   Errores:", serializer.errors)
            return False
        
        # Probar la creación del modelo
        print("\n🔍 Probando creación del modelo...")
        try:
            progress_photo = serializer.save(user=user)
            print("✅ ProgressPhoto creado exitosamente")
            print(f"   ID: {progress_photo.id}")
            print(f"   Usuario: {progress_photo.user.email}")
            print(f"   Tipo: {progress_photo.photo_type}")
            print(f"   Peso: {progress_photo.weight}")
            
            # Limpiar
            progress_photo.delete()
            print("🧹 Objeto de test eliminado")
            
        except Exception as e:
            print(f"❌ Error al crear ProgressPhoto: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
        
        # Probar la vista
        print("\n🔍 Probando vista...")
        factory = APIRequestFactory()
        request = factory.post('/api/progress-photos/', data, format='multipart')
        force_authenticate(request, user=user)
        
        viewset = ProgressPhotoViewSet()
        viewset.request = request
        viewset.action = 'create'
        
        try:
            response = viewset.create(request)
            print(f"✅ Vista funcionando - Status: {response.status_code}")
        except Exception as e:
            print(f"❌ Error en la vista: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
        
        print("\n🎉 Todos los tests pasaron exitosamente!")
        return True
        
    except Exception as e:
        print(f"❌ Error general en el test: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_photo_type_validation():
    """Test de validación de photo_type"""
    print("\n🧪 Probando validación de photo_type...")
    
    valid_types = ['front', 'back', 'side', 'other']
    invalid_types = ['detail', 'invalid', 'test']
    
    for photo_type in valid_types:
        data = {'photo_type': photo_type}
        serializer = ProgressPhotoSerializer(data=data)
        if serializer.is_valid():
            print(f"✅ Tipo '{photo_type}' válido")
        else:
            print(f"❌ Tipo '{photo_type}' inválido: {serializer.errors}")
    
    for photo_type in invalid_types:
        data = {'photo_type': photo_type}
        serializer = ProgressPhotoSerializer(data=data)
        if not serializer.is_valid():
            print(f"✅ Tipo '{photo_type}' correctamente rechazado")
        else:
            print(f"❌ Tipo '{photo_type}' debería haber sido rechazado")

if __name__ == '__main__':
    print("🚀 Iniciando tests de ProgressPhoto...")
    print("=" * 50)
    
    # Test de validación de tipos
    test_photo_type_validation()
    
    # Test principal
    success = test_progress_photo_creation()
    
    print("=" * 50)
    if success:
        print("🎉 Todos los tests completados exitosamente!")
        sys.exit(0)
    else:
        print("💥 Algunos tests fallaron!")
        sys.exit(1)
