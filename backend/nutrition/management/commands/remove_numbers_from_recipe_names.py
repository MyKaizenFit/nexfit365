"""
Comando para eliminar números de los nombres de recetas y dejar solo nombres descriptivos
"""
from django.core.management.base import BaseCommand
import re
from nutrition.models import Recipe


class Command(BaseCommand):
    help = 'Elimina números de los nombres de recetas y deja solo nombres descriptivos'

    def handle(self, *args, **options):
        self.stdout.write("=" * 70)
        self.stdout.write(self.style.SUCCESS("🔧 ELIMINANDO NÚMEROS DE NOMBRES DE RECETAS"))
        self.stdout.write("=" * 70 + "\n")
        
        # Obtener todas las recetas activas con números en el nombre
        recipes = Recipe.objects.filter(is_active=True)
        
        updated_count = 0
        skipped_count = 0
        
        for recipe in recipes:
            original_name = recipe.name
            new_name = self.clean_recipe_name(original_name)
            
            if new_name != original_name:
                # Verificar si ya existe una receta con ese nombre
                existing = Recipe.objects.filter(name=new_name, is_active=True).exclude(id=recipe.id).first()
                
                if existing:
                    # Si existe, desactivar la receta con número (es un duplicado)
                    recipe.is_active = False
                    recipe.save()
                    self.stdout.write(self.style.WARNING(f"   ⚠️  Desactivada (duplicado): {original_name} → {new_name} (ya existe)"))
                    skipped_count += 1
                else:
                    recipe.name = new_name
                    recipe.save()
                    self.stdout.write(f"   ✅ {original_name} → {new_name}")
                    updated_count += 1
        
        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(self.style.SUCCESS(f"✅ Proceso completado"))
        self.stdout.write(f"   Recetas actualizadas: {updated_count}")
        self.stdout.write(f"   Recetas omitidas (duplicados): {skipped_count}")
        self.stdout.write("=" * 70)
    
    def clean_recipe_name(self, name):
        """
        Limpia el nombre de la receta eliminando números y formateando correctamente
        """
        # Patrón para encontrar números al inicio o después del tipo (TOSTADA 1, BOWL 10, etc.)
        # También maneja formatos como "TOSTADA 1 - Tostada de X" o "BOWL 10 - Bowl de X"
        
        # Caso 1: "TIPO NÚMERO - Descripción" → "TIPO de Descripción" o solo "Descripción"
        # También detecta casos con tipo capitalizado: "Tostada 1 - Tostada de X"
        pattern1 = r'^([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+)\s+\d+\s*-\s*(.+)$'
        match1 = re.match(pattern1, name)
        if match1:
            tipo = match1.group(1).strip()
            descripcion = match1.group(2).strip()
            
            # Si la descripción termina con "de" o está incompleta, mantener el nombre original
            if descripcion.endswith(' de') or descripcion.endswith(' con'):
                return name  # Mantener original si está incompleto
            
            # Si la descripción ya empieza con el tipo (case insensitive), solo usar la descripción
            tipo_lower = tipo.lower()
            descripcion_lower = descripcion.lower()
            
            if descripcion_lower.startswith(tipo_lower):
                # Ya tiene el tipo, solo devolver la descripción
                return descripcion
            elif descripcion_lower.startswith(tipo_lower.replace(' ', '')):
                # Tipo sin espacios (ej: "Bowl" en lugar de "BOWL")
                return descripcion
            else:
                # Limpiar la descripción de posibles repeticiones del tipo
                descripcion_limpia = re.sub(r'^' + re.escape(tipo) + r'\s+', '', descripcion, flags=re.IGNORECASE)
                descripcion_limpia = re.sub(r'^' + re.escape(tipo_lower) + r'\s+', '', descripcion_limpia, flags=re.IGNORECASE)
                
                # Si la descripción limpia empieza con "de", no agregar otro "de"
                if descripcion_limpia.lower().startswith('de '):
                    return f"{tipo} {descripcion_limpia}"
                else:
                    return f"{tipo} de {descripcion_limpia}"
        
        # Caso 2: "TIPO NÚMERO" sin descripción → mantener el tipo
        pattern2 = r'^([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+)\s+\d+\s*$'
        match2 = re.match(pattern2, name)
        if match2:
            tipo = match2.group(1).strip()
            return tipo
        
        # Caso 3: "TIPO NÚMERO Descripción" (sin guión) → "TIPO de Descripción"
        pattern3 = r'^([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+)\s+\d+\s+(.+)$'
        match3 = re.match(pattern3, name)
        if match3:
            tipo = match3.group(1).strip()
            descripcion = match3.group(2).strip()
            
            # Si la descripción termina con "de" o está incompleta, mantener el nombre original
            if descripcion.endswith(' de') or descripcion.endswith(' con'):
                return name
            
            tipo_lower = tipo.lower()
            descripcion_lower = descripcion.lower()
            
            if descripcion_lower.startswith(tipo_lower) or descripcion_lower.startswith(tipo_lower.replace(' ', '')):
                return descripcion
            else:
                descripcion_limpia = re.sub(r'^' + re.escape(tipo) + r'\s+', '', descripcion, flags=re.IGNORECASE)
                descripcion_limpia = re.sub(r'^' + re.escape(tipo_lower) + r'\s+', '', descripcion_limpia, flags=re.IGNORECASE)
                
                if descripcion_limpia.lower().startswith('de '):
                    return f"{tipo} {descripcion_limpia}"
                else:
                    return f"{tipo} de {descripcion_limpia}"
        
        # Si no coincide con ningún patrón, devolver el nombre original
        return name






