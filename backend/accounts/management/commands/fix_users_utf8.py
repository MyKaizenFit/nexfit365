# -*- coding: utf-8 -*-
"""
Comando de gestión de Django para corregir problemas de codificación UTF-8 en usuarios.
Uso: python manage.py fix_users_utf8
"""
from django.core.management.base import BaseCommand
from django.db import connection
from django.db.models import Q
from accounts.models import CustomUser
import re
import unicodedata


class Command(BaseCommand):
    help = 'Corrige problemas de codificación UTF-8 en los nombres de usuarios'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Muestra qué se corregiría sin hacer cambios',
        )

    # Mapeo específico para nombres propios comunes
    NAME_FIXES = {
        'Mar??a': 'María', 'Jos??': 'José', 'Mar??a Jos??': 'María José',
        'Garc??a': 'García', 'L??pez': 'López', 'Rodr??guez': 'Rodríguez',
        'Gonz??lez': 'González', 'Mart??nez': 'Martínez', 'S??nchez': 'Sánchez',
        'P??rez': 'Pérez', 'Fern??ndez': 'Fernández', 'G??mez': 'Gómez',
        'D??az': 'Díaz', 'Hern??ndez': 'Hernández', 'Moreno': 'Moreno',
        'Mu??oz': 'Muñoz', 'Alvarez': 'Álvarez', 'Jim??nez': 'Jiménez',
        'Ruiz': 'Ruiz', 'Romero': 'Romero', 'Torres': 'Torres',
        'Ã³': 'ó', 'Ã©': 'é', 'Ã¡': 'á', 'Ã­': 'í', 'Ãº': 'ú', 'Ã±': 'ñ',
        'Ã': '',
    }

    def fix_string(self, text):
        """Corrige una cadena de texto con caracteres mal codificados"""
        if not text:
            return text
        
        if not isinstance(text, str):
            text = str(text)
        
        fixed = text
        
        # Primero corregir nombres completos conocidos
        for wrong, correct in self.NAME_FIXES.items():
            fixed = fixed.replace(wrong, correct)
        
        # Corregir patrones comunes
        patterns = [
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
        ]
        
        for pattern, replacement in patterns:
            try:
                fixed = re.sub(pattern, replacement, fixed, flags=re.IGNORECASE)
            except Exception:
                continue
        
        # Intentar corregir codificaciones incorrectas
        try:
            if 'Ã' in fixed:
                try:
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

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        self.stdout.write("=" * 70)
        self.stdout.write("CORRIGIENDO CODIFICACION UTF-8 EN USUARIOS")
        self.stdout.write("=" * 70)
        
        if dry_run:
            self.stdout.write(self.style.WARNING("MODO DRY-RUN: No se haran cambios"))
        
        # Verificar codificación de la base de datos
        try:
            with connection.cursor() as cursor:
                cursor.execute("SHOW client_encoding;")
                client_encoding = cursor.fetchone()[0]
                self.stdout.write(f"\nCodificacion del cliente: {client_encoding}")
                
                if client_encoding.upper() != 'UTF8':
                    self.stdout.write(self.style.WARNING("Estableciendo UTF8..."))
                    cursor.execute("SET client_encoding TO 'UTF8';")
                    self.stdout.write(self.style.SUCCESS("Codificacion establecida a UTF8"))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Error al verificar codificacion: {e}"))
        
        # Buscar usuarios con problemas
        self.stdout.write("\nBuscando usuarios con problemas de codificacion...")
        
        users_with_issues = CustomUser.objects.filter(
            Q(first_name__contains='??') |
            Q(last_name__contains='??') |
            Q(first_name__contains='Ã') |
            Q(last_name__contains='Ã')
        ).distinct()
        
        total_issues = users_with_issues.count()
        self.stdout.write(f"Usuarios con problemas encontrados: {total_issues}\n")
        
        if total_issues == 0:
            self.stdout.write(self.style.SUCCESS("No se encontraron problemas de codificacion en usuarios"))
            return
        
        fixed_count = 0
        for user in users_with_issues:
            self.stdout.write(f"\nCorrigiendo usuario: {user.email}")
            self.stdout.write(f"   Nombre actual: {user.first_name} {user.last_name}")
            
            updated = False
            old_first_name = user.first_name
            old_last_name = user.last_name
            
            # Corregir first_name
            if user.first_name and ('??' in user.first_name or 'Ã' in user.first_name):
                user.first_name = self.fix_string(user.first_name)
                if user.first_name != old_first_name:
                    self.stdout.write(f"   OK first_name: '{old_first_name}' -> '{user.first_name}'")
                    updated = True
            
            # Corregir last_name
            if user.last_name and ('??' in user.last_name or 'Ã' in user.last_name):
                user.last_name = self.fix_string(user.last_name)
                if user.last_name != old_last_name:
                    self.stdout.write(f"   OK last_name: '{old_last_name}' -> '{user.last_name}'")
                    updated = True
            
            if updated:
                if not dry_run:
                    try:
                        user.save()
                        fixed_count += 1
                        self.stdout.write(self.style.SUCCESS(f"   Usuario corregido y guardado"))
                        self.stdout.write(f"   Nombre corregido: {user.first_name} {user.last_name}")
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"   Error guardando usuario: {e}"))
                else:
                    fixed_count += 1
                    self.stdout.write(self.style.WARNING(f"   [DRY-RUN] Se corregiria: {user.first_name} {user.last_name}"))
            else:
                self.stdout.write("   Sin cambios necesarios")
        
        self.stdout.write(f"\n{'='*70}")
        self.stdout.write(self.style.SUCCESS("PROCESO COMPLETADO"))
        if dry_run:
            self.stdout.write(f"   Usuarios que se corregirian: {fixed_count}/{total_issues}")
        else:
            self.stdout.write(f"   Usuarios corregidos: {fixed_count}/{total_issues}")
        self.stdout.write(f"{'='*70}\n")
        
        # Mostrar algunos ejemplos
        all_users = CustomUser.objects.all()[:10]
        self.stdout.write("\nEjemplos de usuarios (primeros 10):")
        for user in all_users:
            self.stdout.write(f"   - {user.email}: {user.first_name} {user.last_name}")





