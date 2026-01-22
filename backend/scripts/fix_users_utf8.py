#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script específico para corregir problemas de codificación UTF-8 en usuarios (CustomUser).
Corrige first_name y last_name que pueden tener caracteres mal codificados.
"""
import os
import sys
import django
import re
import unicodedata
import io

# Configurar encoding para Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Configurar Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection
from django.db.models import Q
from accounts.models import CustomUser

# Mapeo específico para nombres propios comunes
NAME_FIXES = {
    # Nombres comunes mal codificados
    'Mar??a': 'María', 'Jos??': 'José', 'Mar??a Jos??': 'María José',
    'Garc??a': 'García', 'L??pez': 'López', 'Rodr??guez': 'Rodríguez',
    'Gonz??lez': 'González', 'Mart??nez': 'Martínez', 'S??nchez': 'Sánchez',
    'P??rez': 'Pérez', 'Fern??ndez': 'Fernández', 'G??mez': 'Gómez',
    'D??az': 'Díaz', 'Hern??ndez': 'Hernández', 'Moreno': 'Moreno',
    'Mu??oz': 'Muñoz', 'Alvarez': 'Álvarez', 'Jim??nez': 'Jiménez',
    'Ruiz': 'Ruiz', 'Romero': 'Romero', 'Torres': 'Torres',
    
    # Patrones comunes de codificación incorrecta
    'Ã³': 'ó', 'Ã©': 'é', 'Ã¡': 'á', 'Ã­': 'í', 'Ãº': 'ú', 'Ã±': 'ñ',
    'Ã': '',  # Eliminar caracteres sueltos mal codificados
}

def fix_string(text):
    """Corrige una cadena de texto con caracteres mal codificados"""
    if not text:
        return text
    
    if not isinstance(text, str):
        text = str(text)
    
    fixed = text
    
    # Primero corregir nombres completos conocidos
    for wrong, correct in NAME_FIXES.items():
        fixed = fixed.replace(wrong, correct)
    
    # Corregir patrones comunes de codificación incorrecta en nombres
    patterns = [
        # Patrones específicos para nombres propios
        (r'Mar(\?\?)a', 'María'),
        (r'Jos(\?\?)', 'José'),
        (r'Garc(\?\?)a', 'García'),
        (r'L(\?\?)pez', 'López'),
        (r'Rodr(\?\?)guez', 'Rodríguez'),
        (r'Gonz(\?\?)lez', 'González'),
        (r'Mart(\?\?)nez', 'Martínez'),
        (r'S(\?\?)nchez', 'Sánchez'),
        (r'P(\?\?)rez', 'Pérez'),
        (r'Fern(\?\?)ndez', 'Fernández'),
        (r'G(\?\?)mez', 'Gómez'),
        (r'D(\?\?)az', 'Díaz'),
        (r'Hern(\?\?)ndez', 'Hernández'),
        (r'Mu(\?\?)oz', 'Muñoz'),
        (r'Jim(\?\?)nez', 'Jiménez'),
        # Patrón genérico para acentos comunes
        (r'([A-Za-z])(\?\?)([a-z])', lambda m: m.group(1) + {'a': 'á', 'e': 'é', 'i': 'í', 'o': 'ó', 'u': 'ú'}.get(m.group(3).lower(), m.group(3)) + m.group(3) if m.group(3).lower() in 'aeiou' else m.group(0)),
    ]
    
    for pattern, replacement in patterns:
        try:
            if callable(replacement):
                fixed = re.sub(pattern, replacement, fixed, flags=re.IGNORECASE)
            else:
                fixed = re.sub(pattern, replacement, fixed, flags=re.IGNORECASE)
        except Exception as e:
            continue
    
    # Intentar corregir codificaciones incorrectas comunes
    try:
        # Si el texto parece estar en latin-1 pero debería ser UTF-8
        if 'Ã' in fixed:
            try:
                # Intentar decodificar como latin-1 y luego codificar como UTF-8
                fixed_bytes = fixed.encode('latin-1')
                fixed = fixed_bytes.decode('utf-8', errors='ignore')
            except:
                pass
    except:
        pass
    
    # Normalizar caracteres Unicode
    try:
        fixed = unicodedata.normalize('NFC', fixed)
    except:
        pass
    
    return fixed

def fix_user(user):
    """Corrige los campos de nombre de un usuario"""
    updated = False
    
    # Corregir first_name
    if user.first_name and ('??' in user.first_name or 'Ã' in user.first_name):
        old_first_name = user.first_name
        user.first_name = fix_string(user.first_name)
        if user.first_name != old_first_name:
            updated = True
    
    # Corregir last_name
    if user.last_name and ('??' in user.last_name or 'Ã' in user.last_name):
        old_last_name = user.last_name
        user.last_name = fix_string(user.last_name)
        if user.last_name != old_last_name:
            updated = True
    
    return updated

def main():
    
    # Verificar codificación de la base de datos
    try:
        with connection.cursor() as cursor:
            cursor.execute("SHOW client_encoding;")
            client_encoding = cursor.fetchone()[0]
            
            if client_encoding.upper() != 'UTF8':
                cursor.execute("SET client_encoding TO 'UTF8';")
    except Exception as e:
    
    # Buscar usuarios con problemas
    
    users_with_issues = CustomUser.objects.filter(
        Q(first_name__contains='??') |
        Q(last_name__contains='??') |
        Q(first_name__contains='Ã') |
        Q(last_name__contains='Ã')
    ).distinct()
    
    total_issues = users_with_issues.count()
    
    if total_issues == 0:
        return
    
    fixed_count = 0
    for user in users_with_issues:
        
        if fix_user(user):
            try:
                user.save()
                fixed_count += 1
            except Exception as e:
        else:
    
    
    # Mostrar algunos ejemplos de usuarios
    all_users = CustomUser.objects.all()[:10]
    for user in all_users:

if __name__ == '__main__':
    main()

