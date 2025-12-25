#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script completo para corregir problemas de codificación UTF-8 en la base de datos.
Incluye corrección de datos existentes y verificación de configuración.
"""
import os
import sys
import django
import re
import unicodedata

# Configurar Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection
from django.db.models import Q
from django.conf import settings

# Mapeo completo de caracteres mal codificados a caracteres correctos
CHAR_FIXES = {
    # Caracteres comunes mal codificados
    'C??sar': 'César', 'At??n': 'Atún', 'Mediterr??nea': 'Mediterránea',
    'Mediterr??neo': 'Mediterráneo', 'Salm??n': 'Salmón', 'Jazm??n': 'Jazmín',
    'PI??a': 'Piña', 'pi??a': 'piña', 'Pi??a': 'Piña', 'pi??a': 'piña',
    'Pur??': 'Puré', 'pur??': 'puré', 'Poch??': 'Poché', 'poch??': 'poché',
    'Piment??n': 'Pimentón', 'piment??n': 'pimentón', 'Jam??n': 'Jamón',
    'jam??n': 'jamón', 'D??tiles': 'Dátiles', 'd??tiles': 'dátiles',
    'Cl??sica': 'Clásica', 'cl??sica': 'clásica', 'Fantas??a': 'Fantasía',
    'fantas??a': 'fantasía', 'Lim??n': 'Limón', 'lim??n': 'limón',
    'Calabac??n': 'Calabacín', 'calabac??n': 'calabacín',
    
    # Planes y ejercicios
    'Recomposici??n': 'Recomposición', 'Definici??n': 'Definición',
    'P??rdida': 'Pérdida', 'D??ficit': 'Déficit', 'Super??vit': 'Superávit',
    'B??ceps': 'Bíceps', 'Tr??ceps': 'Tríceps', 'Cu??driceps': 'Cuádriceps',
    'Gl??teo': 'Glúteo', 'Gl??teos': 'Glúteos', '??xito': 'Éxito',
    'D??a': 'Día', 'D??as': 'Días', 'Mi??rcoles': 'Miércoles',
    'S??bado': 'Sábado', 'Pec??torales': 'Pectorales', 'Esp??alda': 'Espalda',
    'Homb??ros': 'Hombros', 'Piern??as': 'Piernas', 'Abducci??n': 'Abducción',
    'Elevaci??n': 'Elevación', 'Extensi??n': 'Extensión',
    'Hidrataci??n': 'Hidratación', 'Progresi??n': 'Progresión',
    'Consist??ncia': 'Consistencia', 'Perfecci??n': 'Perfección',
    'Prote??na': 'Proteína', 'Cal??rico': 'Calórico', 'Cal??rica': 'Calórica',
    'Moder??do': 'Moderado', 'Intens??vo': 'Intensivo', 'B??sica': 'Básica',
    'B??sico': 'Básico', '??nico': 'Único', '??nica': 'Única',
    'Peque??os': 'Pequeños', 'Peque??o': 'Pequeño', 'Despu??s': 'Después',
    'T?? mismo': 'Tú mismo', 't?? mismo': 'tú mismo',
    
    # Ejercicios específicos
    'Jal??n': 'Jalón', 'jal??n': 'jalón', 'M??quina': 'Máquina',
    'm??quina': 'máquina', 'El??stica': 'Elástica', 'el??stica': 'elástica',
    'R??gidas': 'Rígidas', 'r??gidas': 'rígidas', 'R??gida': 'Rígida',
    'r??gida': 'rígida',
    
    # Codificación incorrecta con Ã
    'DescripciÃ³n': 'Descripción', 'descripciÃ³n': 'descripción',
    'PreparaciÃ³n': 'Preparación', 'preparaciÃ³n': 'preparación',
    'MarÃa': 'María', 'GarcÃa': 'García', 'LÃ³pez': 'López',
    'JosÃ©': 'José', 'NiÃ±o': 'Niño', 'AÃ±o': 'Año',
    'CorazÃ³n': 'Corazón', 'EspaÃ±ol': 'Español',
    
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
    
    # Primero corregir palabras completas conocidas
    for wrong, correct in CHAR_FIXES.items():
        fixed = fixed.replace(wrong, correct)
    
    # Corregir patrones comunes de codificación incorrecta
    patterns = [
        # Patrones específicos conocidos
        (r'Mediterr(\?\?)nea', 'Mediterránea'),
        (r'Mediterr(\?\?)neo', 'Mediterráneo'),
        (r'C(\?\?)sar', 'César'),
        (r'At(\?\?)n', 'Atún'),
        (r'Salm(\?\?)n', 'Salmón'),
        (r'Jazm(\?\?)n', 'Jazmín'),
        (r'[Pp]i(\?\?)a', 'Piña'),
        (r'Pur(\?\?)', 'Puré'),
        (r'Poch(\?\?)', 'Poché'),
        (r'Piment(\?\?)n', 'Pimentón'),
        (r'Jam(\?\?)n', 'Jamón'),
        (r'D(\?\?)tiles', 'Dátiles'),
        (r'Cl(\?\?)sica', 'Clásica'),
        (r'Fantas(\?\?)a', 'Fantasía'),
        (r'Lim(\?\?)n', 'Limón'),
        (r'Calabac(\?\?)n', 'Calabacín'),
        (r'Descripci(\?\?)n', 'Descripción'),
        (r'Preparaci(\?\?)n', 'Preparación'),
        (r'Recomposici(\?\?)n', 'Recomposición'),
        (r'Definici(\?\?)n', 'Definición'),
        (r'P(\?\?)rdida', 'Pérdida'),
        (r'D(\?\?)ficit', 'Déficit'),
        (r'Super(\?\?)vit', 'Superávit'),
        (r'B(\?\?)ceps', 'Bíceps'),
        (r'Tr(\?\?)ceps', 'Tríceps'),
        (r'Cu(\?\?)driceps', 'Cuádriceps'),
        (r'Gl(\?\?)teo', 'Glúteo'),
        (r'Gl(\?\?)teos', 'Glúteos'),
        (r'\?\?xito', 'Éxito'),
        (r'D(\?\?)a', 'Día'),
        (r'D(\?\?)as', 'Días'),
        (r'Mi(\?\?)rcoles', 'Miércoles'),
        (r'S(\?\?)bado', 'Sábado'),
        (r'Pec(\?\?)torales', 'Pectorales'),
        (r'Esp(\?\?)alda', 'Espalda'),
        (r'Homb(\?\?)ros', 'Hombros'),
        (r'Piern(\?\?)as', 'Piernas'),
        (r'Abducci(\?\?)n', 'Abducción'),
        (r'Elevaci(\?\?)n', 'Elevación'),
        (r'Extensi(\?\?)n', 'Extensión'),
        (r'Hidrataci(\?\?)n', 'Hidratación'),
        (r'Progresi(\?\?)n', 'Progresión'),
        (r'Consist(\?\?)ncia', 'Consistencia'),
        (r'Perfecci(\?\?)n', 'Perfección'),
        (r'Prote(\?\?)na', 'Proteína'),
        (r'Cal(\?\?)rico', 'Calórico'),
        (r'Cal(\?\?)rica', 'Calórica'),
        (r'Moder(\?\?)do', 'Moderado'),
        (r'Intens(\?\?)vo', 'Intensivo'),
        (r'B(\?\?)sica', 'Básica'),
        (r'B(\?\?)sico', 'Básico'),
        (r'\?\?nico', 'Único'),
        (r'\?\?nica', 'Única'),
        (r'Peque(\?\?)os', 'Pequeños'),
        (r'Peque(\?\?)o', 'Pequeño'),
        (r'Despu(\?\?)s', 'Después'),
        (r'T(\?\?) mismo', 'Tú mismo'),
        (r'Jal(\?\?)n', 'Jalón'),
        (r'M(\?\?)quina', 'Máquina'),
        (r'El(\?\?)stica', 'Elástica'),
        (r'R(\?\?)gidas', 'Rígidas'),
        (r'R(\?\?)gida', 'Rígida'),
    ]
    
    for pattern, replacement in patterns:
        fixed = re.sub(pattern, replacement, fixed, flags=re.IGNORECASE)
    
    # Intentar corregir codificaciones incorrectas comunes
    # Si el texto tiene caracteres que parecen codificación incorrecta, intentar corregirlos
    try:
        # Si el texto parece estar en latin-1 pero debería ser UTF-8
        if 'Ã' in fixed or 'â€™' in fixed:
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

def fix_model_field(obj, field_name):
    """Corrige un campo específico de un modelo"""
    if not hasattr(obj, field_name):
        return False
    
    field_value = getattr(obj, field_name)
    if not field_value:
        return False
    
    updated = False
    
    # Si es una lista (JSONField), corregir cada elemento
    if isinstance(field_value, list):
        fixed_list = []
        changed = False
        for item in field_value:
            if isinstance(item, dict):
                fixed_item = {}
                for key, value in item.items():
                    if isinstance(value, str) and ('??' in value or 'Ã' in value):
                        fixed_item[key] = fix_string(value)
                        changed = True
                    else:
                        fixed_item[key] = value
                fixed_list.append(fixed_item)
            elif isinstance(item, str):
                if '??' in item or 'Ã' in item:
                    fixed_list.append(fix_string(item))
                    changed = True
                else:
                    fixed_list.append(item)
            else:
                fixed_list.append(item)
        
        if changed:
            setattr(obj, field_name, fixed_list)
            updated = True
    
    # Si es un string, corregirlo directamente
    elif isinstance(field_value, str) and ('??' in field_value or 'Ã' in field_value):
        fixed_value = fix_string(field_value)
        if fixed_value != field_value:
            setattr(obj, field_name, fixed_value)
            updated = True
    
    return updated

def fix_model(model_class, text_fields):
    """Corrige todos los campos de texto de un modelo"""
    print(f"\n{'='*70}")
    print(f"🔧 Corrigiendo: {model_class.__name__}")
    print(f"{'='*70}")
    
    # Buscar objetos con problemas
    query = Q()
    for field in text_fields:
        query |= Q(**{f'{field}__contains': '??'}) | Q(**{f'{field}__contains': 'Ã'})
    
    try:
        objects_with_issues = model_class.objects.filter(query).distinct()
        total_issues = objects_with_issues.count()
    except Exception as e:
        print(f"❌ Error al buscar objetos: {e}")
        return 0
    
    if total_issues == 0:
        print(f"✅ No se encontraron problemas en {model_class.__name__}")
        return 0
    
    print(f"📋 Objetos con problemas encontrados: {total_issues}\n")
    
    fixed_count = 0
    for obj in objects_with_issues:
        updated = False
        obj_str = str(obj)[:50]  # Limitar longitud para display
        print(f"  🔧 Corrigiendo: {obj_str}...")
        
        for field_name in text_fields:
            try:
                if fix_model_field(obj, field_name):
                    updated = True
                    print(f"    ✅ Campo '{field_name}' corregido")
            except Exception as e:
                print(f"    ❌ Error corrigiendo campo '{field_name}': {e}")
        
        if updated:
            try:
                obj.save()
                fixed_count += 1
                print(f"  ✅ Objeto corregido y guardado")
            except Exception as e:
                print(f"  ❌ Error guardando: {e}")
        else:
            print(f"  ⏭️  Sin cambios necesarios")
    
    return fixed_count

def verify_database_encoding():
    """Verifica y corrige la configuración de codificación de la base de datos"""
    print("=" * 70)
    print("🔍 VERIFICANDO CONFIGURACIÓN DE LA BASE DE DATOS")
    print("=" * 70)
    
    try:
        with connection.cursor() as cursor:
            # Verificar codificación de la base de datos
            cursor.execute("SELECT datname, pg_encoding_to_char(encoding) as encoding FROM pg_database WHERE datname = current_database();")
            db_info = cursor.fetchone()
            
            if db_info:
                db_name, encoding = db_info
                print(f"\n📊 Base de datos: {db_name}")
                print(f"   Codificación: {encoding}")
                
                if encoding.upper() != 'UTF8':
                    print(f"   ⚠️  ADVERTENCIA: La base de datos NO está usando UTF8")
                    print(f"      Se recomienda recrear la base de datos con UTF8")
                    print(f"      Comando sugerido:")
                    print(f"      CREATE DATABASE {db_name} WITH ENCODING 'UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8';")
                else:
                    print(f"   ✅ La base de datos está usando UTF8")
            
            # Verificar codificación del cliente
            cursor.execute("SHOW client_encoding;")
            client_encoding = cursor.fetchone()[0]
            print(f"\n📊 Cliente (conexión actual):")
            print(f"   Codificación: {client_encoding}")
            
            if client_encoding.upper() != 'UTF8':
                print(f"   ⚠️  ADVERTENCIA: El cliente NO está usando UTF8")
                print(f"      Intentando establecer UTF8...")
                try:
                    cursor.execute("SET client_encoding TO 'UTF8';")
                    print(f"      ✅ Codificación del cliente establecida a UTF8")
                except Exception as e:
                    print(f"      ❌ Error al establecer UTF8: {e}")
            else:
                print(f"   ✅ El cliente está usando UTF8")
                
    except Exception as e:
        print(f"❌ Error al verificar codificación: {e}")
        return False
    
    return True

def main():
    print("=" * 70)
    print("🔧 CORRECCIÓN COMPLETA DE CODIFICACIÓN UTF-8")
    print("=" * 70)
    
    # Verificar configuración de la base de datos
    verify_database_encoding()
    
    total_fixed = 0
    
    # Corregir Exercises
    try:
        from workouts.models import Exercise
        fixed = fix_model(Exercise, ['name', 'description', 'instructions'])
        total_fixed += fixed
    except Exception as e:
        print(f"❌ Error corrigiendo Exercise: {e}")
    
    # Corregir Recipes
    try:
        from nutrition.models import Recipe
        fixed = fix_model(Recipe, ['name', 'description', 'instructions'])
        total_fixed += fixed
    except Exception as e:
        print(f"❌ Error corrigiendo Recipe: {e}")
    
    # Corregir WellnessTips
    try:
        from dashboard.models import WellnessTip
        fixed = fix_model(WellnessTip, ['title', 'summary', 'content'])
        total_fixed += fixed
    except Exception as e:
        print(f"❌ Error corrigiendo WellnessTip: {e}")
    
    # Corregir NutritionPlans
    try:
        from nutrition.models import NutritionPlan
        fixed = fix_model(NutritionPlan, ['name', 'description'])
        total_fixed += fixed
    except Exception as e:
        print(f"❌ Error corrigiendo NutritionPlan: {e}")
    
    # Corregir PlanMeals
    try:
        from nutrition.models import PlanMeal
        fixed = fix_model(PlanMeal, ['name', 'description'])
        total_fixed += fixed
    except Exception as e:
        print(f"❌ Error corrigiendo PlanMeal: {e}")
    
    # Corregir WorkoutPrograms
    try:
        from workouts.models import WorkoutProgram
        fixed = fix_model(WorkoutProgram, ['name', 'description'])
        total_fixed += fixed
    except Exception as e:
        print(f"❌ Error corrigiendo WorkoutProgram: {e}")
    
    # Corregir WorkoutDays
    try:
        from workouts.models import WorkoutDay
        fixed = fix_model(WorkoutDay, ['name', 'notes'])
        total_fixed += fixed
    except Exception as e:
        print(f"❌ Error corrigiendo WorkoutDay: {e}")
    
    # Corregir MotivationalTips
    try:
        from notifications.models import MotivationalTip
        fixed = fix_model(MotivationalTip, ['title', 'content'])
        total_fixed += fixed
    except Exception as e:
        print(f"❌ Error corrigiendo MotivationalTip: {e}")
    
    # Corregir FeedbackMessages
    try:
        from notifications.models import FeedbackMessage
        fixed = fix_model(FeedbackMessage, ['message'])
        total_fixed += fixed
    except Exception as e:
        print(f"❌ Error corrigiendo FeedbackMessage: {e}")
    
    # Corregir CustomUser
    try:
        from accounts.models import CustomUser
        fixed = fix_model(CustomUser, ['first_name', 'last_name'])
        total_fixed += fixed
    except Exception as e:
        print(f"❌ Error corrigiendo CustomUser: {e}")
    
    print(f"\n{'='*70}")
    print(f"✅ PROCESO COMPLETADO")
    print(f"   Total de objetos corregidos: {total_fixed}")
    print(f"{'='*70}\n")
    
    if total_fixed > 0:
        print("💡 RECOMENDACIONES:")
        print("   1. Verificar los datos corregidos en la aplicación")
        print("   2. Ejecutar el script de diagnóstico para confirmar que no quedan problemas")
        print("   3. Asegurar que todas las nuevas inserciones usen UTF-8 correctamente")
    else:
        print("✅ No se encontraron problemas que corregir")

if __name__ == '__main__':
    main()






