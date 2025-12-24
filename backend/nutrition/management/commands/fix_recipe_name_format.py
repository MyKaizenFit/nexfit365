"""
Comando para corregir el formato de nombres de recetas (eliminar "de" duplicados, mejorar formato)
"""
from django.core.management.base import BaseCommand
import re
from nutrition.models import Recipe


class Command(BaseCommand):
    help = 'Corrige el formato de nombres de recetas eliminando "de" duplicados y mejorando el formato'

    def handle(self, *args, **options):
        self.stdout.write("=" * 70)
        self.stdout.write(self.style.SUCCESS("🔧 CORRIGIENDO FORMATO DE NOMBRES DE RECETAS"))
        self.stdout.write("=" * 70 + "\n")
        
        recipes = Recipe.objects.filter(is_active=True)
        
        updated_count = 0
        
        for recipe in recipes:
            original_name = recipe.name
            new_name = self.fix_name_format(original_name)
            
            if new_name != original_name:
                # Verificar si ya existe una receta con ese nombre
                existing = Recipe.objects.filter(name=new_name, is_active=True).exclude(id=recipe.id).first()
                
                if existing:
                    self.stdout.write(self.style.WARNING(f"   ⚠️  Omitida (duplicado): {original_name} → {new_name}"))
                else:
                    recipe.name = new_name
                    recipe.save()
                    self.stdout.write(f"   ✅ {original_name} → {new_name}")
                    updated_count += 1
        
        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(self.style.SUCCESS(f"✅ Proceso completado"))
        self.stdout.write(f"   Recetas actualizadas: {updated_count}")
        self.stdout.write("=" * 70)
    
    def fix_name_format(self, name):
        """
        Corrige el formato del nombre eliminando "de" duplicados y mejorando el formato
        """
        # Eliminar "de" duplicados (ej: "BOWL de de X" → "BOWL de X")
        name = re.sub(r'\bde\s+de\b', 'de', name, flags=re.IGNORECASE)
        
        # Corregir casos como "BOWL de Bowl de X" → "Bowl de X"
        name = re.sub(r'^(BOWL|TOSTADA|CREMA|FAJITA|TABLA)\s+de\s+(Bowl|Tostada|Crema|Fajita|Tabla)\s+de\s+', r'\2 de ', name, flags=re.IGNORECASE)
        name = re.sub(r'^(BOWL|TOSTADA|CREMA|FAJITA|TABLA)\s+de\s+(Bowl|Tostada|Crema|Fajita|Tabla)\s+', r'\2 ', name, flags=re.IGNORECASE)
        
        # Corregir casos como "BOWL de Ensalada" → "Bowl de Ensalada" (capitalizar tipo)
        name = re.sub(r'^(BOWL|TOSTADA|CREMA|FAJITA|TABLA)\s+de\s+', 
                     lambda m: m.group(1).capitalize() + ' de ', 
                     name)
        
        # Corregir casos donde el tipo está en mayúsculas pero debería estar capitalizado
        # Solo si no empieza con "BOWL de", "TOSTADA de", etc.
        if not re.match(r'^(BOWL|TOSTADA|CREMA|FAJITA|TABLA)\s+de\s+', name, re.IGNORECASE):
            # Si el nombre empieza con tipo en mayúsculas seguido de espacio y algo más
            name = re.sub(r'^(BOWL|TOSTADA|CREMA|FAJITA|TABLA)\s+', 
                         lambda m: m.group(1).capitalize() + ' ', 
                         name)
        
        # Eliminar espacios múltiples
        name = re.sub(r'\s+', ' ', name).strip()
        
        return name




