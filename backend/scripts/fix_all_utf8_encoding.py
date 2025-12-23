#!/usr/bin/env python
"""
Script general para corregir la codificación UTF-8 en todas las tablas de la base de datos.
Corrige caracteres mal codificados como ?? por los caracteres correctos en todos los modelos.
"""
import os
import sys
import django
import re

# Configurar Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db.models import Q

# Mapeo de palabras mal codificadas a palabras correctas
WORD_FIXES = {
    # Recetas
    'C??sar': 'César', 'At??n': 'Atún', 'Mediterr??nea': 'Mediterránea',
    'Mediterr??neo': 'Mediterráneo', 'Salm??n': 'Salmón', 'Jazm??n': 'Jazmín',
    'PI??a': 'Piña', 'pi??a': 'piña', 'Pur??': 'Puré', 'pur??': 'puré',
    'Poch??': 'Poché', 'poch??': 'poché', 'Piment??n': 'Pimentón',
    'piment??n': 'pimentón', 'Jam??n': 'Jamón', 'jam??n': 'jamón',
    'D??tiles': 'Dátiles', 'd??tiles': 'dátiles', 'Cl??sica': 'Clásica',
    'cl??sica': 'clásica', 'Fantas??a': 'Fantasía', 'fantas??a': 'fantasía',
    'Lim??n': 'Limón', 'lim??n': 'limón', 'Calabac??n': 'Calabacín',
    'calabac??n': 'calabacín',
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
    # Patrones adicionales comunes
    'Agarre': 'Agarre',  # Ya está bien, pero por si acaso
}

def fix_string(text):
    """Corrige una cadena de texto con caracteres mal codificados"""
    if not text:
        return text
    
    fixed = str(text)
    # Primero corregir palabras completas conocidas
    for wrong, correct in WORD_FIXES.items():
        fixed = fixed.replace(wrong, correct)
    
    # Corrección inteligente: detectar patrones comunes de acentos en español
    # Patrón: letra + ?? + letra -> letra + acento + letra
    # Mapeo de contexto a acento correcto
    accent_map = {
        # Patrones comunes en español
        (r'([Aa])(\?\?)([lnrst])', 'á'),  # a??l -> ál, a??n -> án, etc.
        (r'([Ee])(\?\?)([lnrstx])', 'é'),  # e??l -> él, e??n -> én, etc.
        (r'([Ii])(\?\?)([lnrst])', 'í'),  # i??l -> íl, i??n -> ín, etc.
        (r'([Oo])(\?\?)([lnrst])', 'ó'),  # o??l -> ól, o??n -> ón, etc.
        (r'([Uu])(\?\?)([lnrst])', 'ú'),  # u??l -> úl, u??n -> ún, etc.
        # Casos específicos comunes
        (r'([Cc])(\?\?)(sar)', 'és'),  # C??sar -> César
        (r'([Aa])(\?\?)(t)', 'út'),   # At??n -> Atún
        (r'([Ss])(\?\?)(n)', 'ón'),   # Salm??n -> Salmón
        (r'([Jj])(\?\?)(n)', 'ón'),   # Jam??n -> Jamón
        (r'([Ll])(\?\?)(n)', 'ón'),   # Lim??n -> Limón
        (r'([Pp])(\?\?)(a)', 'iña'),  # Pi??a -> Piña
        (r'([Mm])(\?\?)(quina)', 'á'), # M??quina -> Máquina
        (r'([Jj])(\?\?)(al)', 'ó'),   # Jal??n -> Jalón
    }
    
    # Aplicar correcciones inteligentes
    for pattern, accent in accent_map:
        try:
            def replace_func(match):
                return match.group(1) + accent + match.group(3)
            fixed = re.sub(pattern, replace_func, fixed)
        except:
            continue
    
    # Corregir patrones comunes de codificación incorrecta
    # Patrón general: cualquier carácter seguido de ?? seguido de otro carácter
    # Esto captura casos como: Día, Bíceps, Tríceps, Cuádriceps, Glúteo, Éxito, etc.
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
        (r'\?\?xito', 'éxito'),
        (r'D(\?\?)a', 'Día'),
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
        (r'T(\?\?) mismo', 'tú mismo'),
        # Patrón genérico para caracteres con acento agudo (á, é, í, ó, ú)
        # Esto captura casos que no están en la lista específica
        (r'([A-Za-z])(\?\?)([a-z])', lambda m: m.group(1) + {'a': 'á', 'e': 'é', 'i': 'í', 'o': 'ó', 'u': 'ú'}.get(m.group(3).lower(), m.group(3)) + m.group(3) if m.group(3).lower() in 'aeiou' else m.group(0)),
    ]
    
    for pattern, replacement in patterns:
        fixed = re.sub(pattern, replacement, fixed)
    
    return fixed

def fix_model_field(obj, field_name):
    """Corrige un campo específico de un modelo"""
    if not hasattr(obj, field_name):
        return False
    
    field_value = getattr(obj, field_name)
    if not field_value:
        return False
    
    # Convertir a string si es necesario
    if isinstance(field_value, list):
        # Si es una lista (JSONField), corregir cada elemento
        fixed_list = []
        changed = False
        for item in field_value:
            if isinstance(item, dict):
                fixed_item = {}
                for key, value in item.items():
                    if isinstance(value, str) and ('??' in value or 'Ã³' in value):
                        fixed_item[key] = fix_string(value)
                        changed = True
                    else:
                        fixed_item[key] = value
                fixed_list.append(fixed_item)
            elif isinstance(item, str):
                if '??' in item or 'Ã³' in item:
                    fixed_list.append(fix_string(item))
                    changed = True
                else:
                    fixed_list.append(item)
            else:
                fixed_list.append(item)
        
        if changed:
            setattr(obj, field_name, fixed_list)
            return True
        return False
    
    if isinstance(field_value, str) and ('??' in field_value or 'Ã³' in field_value):
        fixed_value = fix_string(field_value)
        if fixed_value != field_value:
            setattr(obj, field_name, fixed_value)
            return True
    
    return False

def fix_model(model_class, text_fields):
    """Corrige todos los campos de texto de un modelo"""
    print(f"\n{'='*70}")
    print(f"🔧 Corrigiendo: {model_class.__name__}")
    print(f"{'='*70}")
    
    # Buscar objetos con problemas
    query = Q()
    for field in text_fields:
        query |= Q(**{f'{field}__contains': '??'}) | Q(**{f'{field}__contains': 'Ã³'})
    
    objects_with_issues = model_class.objects.filter(query).distinct()
    total_issues = objects_with_issues.count()
    
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
            if fix_model_field(obj, field_name):
                updated = True
                print(f"    ✅ Campo '{field_name}' corregido")
        
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

def main():
    print("=" * 70)
    print("🔧 CORRIGIENDO CODIFICACIÓN UTF-8 EN TODAS LAS TABLAS")
    print("=" * 70)
    
    total_fixed = 0
    
    # Corregir Exercises
    try:
        from workouts.models import Exercise
        fixed = fix_model(Exercise, ['name', 'description', 'instructions'])
        total_fixed += fixed
    except Exception as e:
        print(f"❌ Error corrigiendo Exercise: {e}")
    
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
    
    print(f"\n{'='*70}")
    print(f"✅ PROCESO COMPLETADO")
    print(f"   Total de objetos corregidos: {total_fixed}")
    print(f"{'='*70}\n")

if __name__ == '__main__':
    main()

