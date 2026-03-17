#!/usr/bin/env python
"""
Script para probar el endpoint de import de recetas
"""
import pytest
import requests
import json
from pathlib import Path

pytestmark = pytest.mark.skip(reason="Script manual de integración, no test unitario pytest")

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
    print(f"Token request status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Token obtained: {data['access'][:50]}...")
        return data['access']
    else:
        print(f"✗ Error: {response.text}")
        return None

def test_export_csv(token):
    """Probar export CSV"""
    print("\n--- Testing Export CSV ---")
    headers = {
        "Authorization": f"Bearer {token}"
    }
    url = f"{BASE_URL}/api/admin/nutrition/recipes/export-csv/"
    response = requests.get(url, headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"✓ CSV Export successful")
        lines = response.text.split('\n')[:3]
        for line in lines:
            print(f"  {line}")
    else:
        print(f"✗ Error: {response.text[:200]}")

def test_export_excel(token):
    """Probar export Excel"""
    print("\n--- Testing Export Excel ---")
    headers = {
        "Authorization": f"Bearer {token}"
    }
    url = f"{BASE_URL}/api/admin/nutrition/recipes/export-excel/"
    response = requests.get(url, headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"✓ Excel Export successful ({len(response.content)} bytes)")
    else:
        print(f"✗ Error: {response.text[:200]}")

def test_import_csv(token):
    """Probar import CSV"""
    print("\n--- Testing Import CSV ---")
    
    # Leer archivo de test
    csv_path = Path("/srv/mykaizenfit/pro/test_import.csv")
    if not csv_path.exists():
        print(f"✗ File not found: {csv_path}")
        return
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    url = f"{BASE_URL}/api/admin/nutrition/recipes/import-csv/"
    with open(csv_path, 'rb') as f:
        files = {'file': f}
        response = requests.post(url, headers=headers, files=files)
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    if response.status_code == 200:
        data = response.json()
        print(f"✓ CSV Import successful")
        print(f"  Created: {data.get('created')}")
        print(f"  Updated: {data.get('updated')}")
        print(f"  Skipped: {data.get('skipped')}")
        if data.get('errors'):
            print(f"  Errors: {data['errors']}")
    else:
        print(f"✗ Error: {response.text[:500]}")

if __name__ == "__main__":
    print("=" * 60)
    print("Recipe Import/Export Endpoint Test")
    print("=" * 60)
    
    token = get_token()
    if not token:
        print("✗ Failed to get token")
        exit(1)
    
    test_export_csv(token)
    test_export_excel(token)
    test_import_csv(token)
    
    print("\n" + "=" * 60)
    print("Test completed")
    print("=" * 60)
