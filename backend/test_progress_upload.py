#!/usr/bin/env python3
"""
Script de prueba para verificar la subida de fotos de progreso
"""

import os
import sys
import django
from pathlib import Path

# Configurar Django
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from progress.models import ProgressPhoto
from progress.serializers import ProgressPhotoSerializer
from rest_framework.test import APITestCase
from rest_framework import status

User = get_user_model()

def test_progress_photo_creation():
    """Probar la creación de una foto de progreso"""
    try:
        # Crear usuario de prueba
        user, created = User.objects.get_or_create(
            email='test@example.com',
            defaults={
                'first_name': 'Test',
                'last_name': 'User',
                'password': 'testpass123'
            }
        )
        
        # Crear archivo de prueba
        file_content = b'fake-image-content'
        photo_file = SimpleUploadedFile(
            "test_photo.jpg",
            file_content,
            content_type="image/jpeg"
        )
        
        # Crear instancia del modelo
        photo = ProgressPhoto(
            user=user,
            photo=photo_file,
            photo_type='front',
            date='2025-08-30',
            weight=80.5,
            notes='Foto de prueba'
        )
        
        # Validar y guardar
        photo.full_clean()
        photo.save()
        
        print("✅ Foto de progreso creada exitosamente")
        print(f"   ID: {photo.id}")
        print(f"   Usuario: {photo.user.email}")
        print(f"   Tipo: {photo.photo_type}")
        print(f"   Peso: {photo.weight}")
        print(f"   Fecha: {photo.date}")
        
        # Probar serializer
        serializer = ProgressPhotoSerializer(photo)
        print("✅ Serializer funcionando correctamente")
        print(f"   Datos serializados: {serializer.data}")
        
        # Limpiar
        photo.delete()
        user.delete()
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_photo_type_validation():
    """Probar validación de tipos de foto"""
    try:
        # Tipos válidos
        valid_types = ['front', 'back', 'side', 'other']
        
        for photo_type in valid_types:
            # Crear usuario de prueba
            user, created = User.objects.get_or_create(
                email=f'test_{photo_type}@example.com',
                defaults={
                    'first_name': 'Test',
                    'last_name': 'User',
                    'password': 'testpass123'
                }
            )
            
            # Crear archivo de prueba
            file_content = b'fake-image-content'
            photo_file = SimpleUploadedFile(
                f"test_{photo_type}.jpg",
                file_content,
                content_type="image/jpeg"
            )
            
            # Crear instancia del modelo
            photo = ProgressPhoto(
                user=user,
                photo=photo_file,
                photo_type=photo_type,
                date='2025-08-30',
                weight=80.5
            )
            
            # Validar y guardar
            photo.full_clean()
            photo.save()
            
            print(f"✅ Tipo '{photo_type}' válido")
            
            # Limpiar
            photo.delete()
            user.delete()
        
        return True
        
    except Exception as e:
        print(f"❌ Error en validación de tipos: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("🧪 Probando creación de fotos de progreso...")
    print("=" * 50)
    
    success1 = test_progress_photo_creation()
    print()
    
    success2 = test_photo_type_validation()
    print()
    
    if success1 and success2:
        print("🎉 Todas las pruebas pasaron exitosamente!")
    else:
        print("💥 Algunas pruebas fallaron")
        sys.exit(1)
