#!/usr/bin/env python3
"""
Script de prueba para verificar el endpoint de user-stats
"""

import requests
import json

def test_user_stats():
    print("=== PRUEBA DE USER-STATS ===")
    
    # 1. Hacer login para obtener token
    login_data = {
        'email': 'iago.v.lamas@gmail.com',
        'password': 'TestUser123!'
    }
    
    print("1. Haciendo login...")
    login_response = requests.post('http://localhost:8000/api/auth/login/', json=login_data)
    print(f"   Login Status: {login_response.status_code}")
    
    if login_response.status_code != 200:
        print("   Error en login")
        print("   Response:", login_response.text)
        return
    
    # 2. Extraer token
    login_json = login_response.json()
    access_token = login_json['access']
    print(f"   Token obtenido: {access_token[:50]}...")
    
    # 3. Probar endpoint de user-stats
    print("2. Probando endpoint de user-stats...")
    headers = {'Authorization': f'Bearer {access_token}'}
    stats_response = requests.get('http://localhost:8000/api/user-stats/', headers=headers)
    print(f"   Stats Status: {stats_response.status_code}")
    
    if stats_response.status_code == 200:
        stats_data = stats_response.json()
        print("   Stats obtenidos exitosamente:")
        print(f"   - Calorías hoy: {stats_data.get('calories_today', 'N/A')}")
        print(f"   - Entrenamientos esta semana: {stats_data.get('workouts_this_week', 'N/A')}")
        print(f"   - Peso actual: {stats_data.get('current_weight', 'N/A')}")
    else:
        print("   Error en user-stats:")
        print("   Response:", stats_response.text)
    
    print("=== FIN DE PRUEBA ===")

if __name__ == "__main__":
    test_user_stats()
