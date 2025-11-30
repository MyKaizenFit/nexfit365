#!/usr/bin/env python
"""
Script para debuggear el serializer paso a paso
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

User = get_user_model()

def debug_serializer():
    """Debuggear el serializer paso a paso"""
    print("🔍 Debuggeando serializer...")
    
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
        print(f"   Nombre: {test_file.name}")
        print(f"   Tamaño: {test_file.size}")
        print(f"   Content-Type: {test_file.content_type}")
        
        # Crear datos para el serializer
        data = {
            'photo': test_file,
            'photo_type': 'front',
            'weight': 75.5,
            'notes': 'Test photo upload',
            'date': '2025-08-30'
        }
        
        print("\n📝 Datos para serializer:")
        for key, value in data.items():
            print(f"   {key}: {value}")
        
        # Probar el serializer paso a paso
        print("\n🔍 Probando serializer...")
        
        # 1. Crear instancia
        serializer = ProgressPhotoSerializer(data=data)
        print("✅ Instancia del serializer creada")
        
        # 2. Verificar si es válido
        print("\n🔍 Verificando validación...")
        is_valid = serializer.is_valid()
        print(f"¿Es válido? {is_valid}")
        
        if not is_valid:
            print("\n❌ Errores de validación:")
            for field, errors in serializer.errors.items():
                print(f"   {field}: {errors}")
            
            # Intentar validar campo por campo
            print("\n🔍 Validando campos individuales...")
            
            for field_name, field_value in data.items():
                print(f"\n   Validando {field_name}...")
                try:
                    # Crear serializer con solo este campo
                    test_data = {field_name: field_value}
                    test_serializer = ProgressPhotoSerializer(data=test_data)
                    if test_serializer.is_valid():
                        print(f"      ✅ {field_name} válido")
                    else:
                        print(f"      ❌ {field_name} inválido: {test_serializer.errors}")
                except Exception as e:
                    print(f"      💥 Error validando {field_name}: {str(e)}")
        else:
            print("✅ Serializer válido")
            print("📊 Datos validados:", serializer.validated_data)
        
        return True
        
    except Exception as e:
        print(f"❌ Error general: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("🚀 Debug del serializer...")
    print("=" * 50)
    
    success = debug_serializer()
    
    print("=" * 50)
    if success:
        print("🎉 Debug completado!")
    else:
        print("💥 Debug falló!")
