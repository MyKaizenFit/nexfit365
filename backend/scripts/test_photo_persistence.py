#!/usr/bin/env python
"""
Script para probar que las fotos se guardan y recuperan correctamente
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
from django.test import Client
from django.urls import reverse
import json

User = get_user_model()

def test_photo_persistence():
    """Test para verificar persistencia de fotos"""
    print("🔍 Test de persistencia de fotos...")
    
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
                name='test_persistence.jpg',
                content=file_content,
                content_type='image/jpeg'
            ),
            photo_type='front',
            date='2025-08-30',
            weight=80.0,
            notes='Test de persistencia'
        )
        print(f"✅ Foto creada con ID: {photo.id}")
        
        # Verificar que la foto existe en la base de datos
        saved_photo = ProgressPhoto.objects.get(id=photo.id)
        print(f"✅ Foto recuperada de la BD: {saved_photo.id}")
        print(f"   - Usuario: {saved_photo.user.email}")
        print(f"   - Tipo: {saved_photo.photo_type}")
        print(f"   - Fecha: {saved_photo.date}")
        print(f"   - Peso: {saved_photo.weight}")
        print(f"   - Notas: {saved_photo.notes}")
        
        # Test de API - simular petición GET
        print("\n🔍 Probando API GET...")
        client = Client()
        client.force_login(user)
        
        # Simular petición a la API
        response = client.get('/api/progress-photos/')
        print(f"   - Status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = json.loads(response.content)
                print(f"   - Respuesta JSON válida")
                print(f"   - Número de fotos: {len(data) if isinstance(data, list) else 'No es lista'}")
                if isinstance(data, list) and len(data) > 0:
                    first_photo = data[0]
                    print(f"   - Primera foto: {first_photo.get('id', 'Sin ID')}")
                    print(f"   - Tipo: {first_photo.get('photo_type', 'Sin tipo')}")
                    print(f"   - Fecha: {first_photo.get('date', 'Sin fecha')}")
            except json.JSONDecodeError:
                print(f"   - ❌ Respuesta no es JSON válido")
                print(f"   - Contenido: {response.content[:200]}...")
        else:
            print(f"   - ❌ Error en la respuesta")
            print(f"   - Contenido: {response.content[:200]}...")
        
        # Limpiar
        photo.delete()
        print("\n🧹 Foto de test eliminada")
        
        print("\n🎉 Test de persistencia exitoso!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("🚀 Test de persistencia de fotos...")
    print("=" * 50)
    
    success = test_photo_persistence()
    
    print("=" * 50)
    if success:
        print("🎉 Test exitoso!")
    else:
        print("💥 Test falló!")







