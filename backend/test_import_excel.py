#!/usr/bin/env python
"""
Script para probar el endpoint de import de recetas con actualización
"""
import requests
import json
import io
from pathlib import Path
from openpyxl import Workbook

# URL base
BASE_URL = "http://localhost:8000"

# Credenciales del usuario admin
EMAIL = "admin@test.com"
PASSWORD = "Admin123456"

def get_token():
    """Obtener token JWT"""
    url = f"{BASE_URL}/api/auth/login/"
    payload = {
        "email": EMAIL,
        "password": PASSWORD
    }
    response = requests.post(url, json=payload)
    if response.status_code == 200:
        data = response.json()
        return data['access']
    return None

def test_import_excel_create():
    """Probar import Excel - crear nuevas recetas"""
    print("\n--- Testing Import Excel (CREATE) ---")
    
    # Crear archivo Excel
    wb = Workbook()
    ws = wb.active
    headers = ['name', 'description', 'category', 'calories', 'protein', 'carbs', 'fat', 'difficulty', 'image_url', 'ingredients', 'instructions']
    ws.append(headers)
    ws.append(['Smoothie Fresa', 'Smoothie con fresas', 'Desayunos', 200, 15, 30, 2, 'Fácil', '', 'Fresas + Leche', 'Licuar'])
    ws.append(['Burrito de Pollo', 'Burrito con pollo y verduras', 'Comidas', 450, 35, 50, 15, 'Medio', '', 'Tortilla + Pollo', 'Armar y servir'])
    
    # Guardar a bytes
    excel_bytes = io.BytesIO()
    wb.save(excel_bytes)
    excel_bytes.seek(0)
    
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{BASE_URL}/api/admin/nutrition/recipes/import-excel/"
    
    files = {'file': ('test.xlsx', excel_bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
    response = requests.post(url, headers=headers, files=files)
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Excel Import successful")
        print(f"  Created: {data.get('created')}")
        print(f"  Updated: {data.get('updated')}")
        print(f"  Skipped: {data.get('skipped')}")
    else:
        print(f"✗ Error: {response.text[:500]}")

def test_import_excel_update():
    """Probar import Excel - actualizar recetas existentes"""
    print("\n--- Testing Import Excel (UPDATE) ---")
    
    # Crear archivo Excel con una receta existente modificada
    wb = Workbook()
    ws = wb.active
    headers = ['name', 'description', 'category', 'calories', 'protein', 'carbs', 'fat', 'difficulty', 'image_url', 'ingredients', 'instructions']
    ws.append(headers)
    # Importar una receta que ya existe e cambiar algo
    ws.append(['Ensalada Griega', 'Ensalada griega MODIFICADA - con más queso', 'Ensaladas', 200, 10, 12, 8, 'Muy Fácil', '', 'Lechuga + Tomate', 'Picar bien'])
    ws.append(['Nueva Receta', 'Una receta nueva', 'Nuevas', 300, 20, 40, 5, 'Fácil', '', 'Ingredientes', 'Preparar'])
    
    # Guardar a bytes
    excel_bytes = io.BytesIO()
    wb.save(excel_bytes)
    excel_bytes.seek(0)
    
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{BASE_URL}/api/admin/nutrition/recipes/import-excel/"
    
    files = {'file': ('test.xlsx', excel_bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
    response = requests.post(url, headers=headers, files=files)
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Excel Import successful")
        print(f"  Created: {data.get('created')}")
        print(f"  Updated: {data.get('updated')}")
        print(f"  Skipped: {data.get('skipped')}")
    else:
        print(f"✗ Error: {response.text[:500]}")

if __name__ == "__main__":
    print("=" * 60)
    print("Excel Import Test")
    print("=" * 60)
    
    test_import_excel_create()
    test_import_excel_update()
    
    print("\n" + "=" * 60)
    print("Excel test completed")
    print("=" * 60)
