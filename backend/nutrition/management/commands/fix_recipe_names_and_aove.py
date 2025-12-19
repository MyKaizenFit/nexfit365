"""
Comando para corregir nombres de recetas incompletos y reemplazar AOVE por aceite de oliva
"""
from django.core.management.base import BaseCommand
from django.db import models
from nutrition.models import Recipe
import json


class Command(BaseCommand):
    help = 'Corrige nombres de recetas incompletos y reemplaza AOVE por aceite de oliva'

    def handle(self, *args, **options):
        self.stdout.write("=" * 70)
        self.stdout.write(self.style.SUCCESS("🔧 CORRIGIENDO NOMBRES Y REEMPLAZANDO AOVE"))
        self.stdout.write("=" * 70 + "\n")
        
        # 1. Corregir nombres incompletos
        self.stdout.write("\n📝 Corrigiendo nombres incompletos...")
        incomplete_recipes = Recipe.objects.filter(name__endswith=' y')
        
        # Mapeo de nombres incompletos a completos basado en ingredientes/descripción
        name_fixes = {
            'CREMA 3 - Puré de Patata y': 'CREMA 3 - Puré de Patata y Zanahoria',
            'CREMA 5 - Puré de Boniato y': 'CREMA 5 - Puré de Boniato y Zanahoria',
            'CREMA 1 - Crema de Calabaza y': 'CREMA 1 - Crema de Calabaza y Zanahoria',
            'CREMA 11 - Crema de Patata y': 'CREMA 11 - Crema de Patata y Zanahoria',
            'BOWL 6 - Ensalada Mediterránea de Caballa y': 'BOWL 6 - Ensalada Mediterránea de Caballa y Verduras',
            'BOWL 8 - Bowl Power de Pollo hummus y': 'BOWL 8 - Bowl Power de Pollo, Hummus y Verduras',
            'BOWL 9 - Bowl Proteico de Ternera arroz y': 'BOWL 9 - Bowl Proteico de Ternera, Arroz y Verduras',
            'BOWL 20 - Bowl César Saludable con Pollo y': 'BOWL 20 - Bowl César Saludable con Pollo y Verduras',
            'TABLA 9 - Tabla Veggie con Hummus y': 'TABLA 9 - Tabla Veggie con Hummus y Verduras',
        }
        
        fixed_names = 0
        for recipe in incomplete_recipes:
            if recipe.name in name_fixes:
                old_name = recipe.name
                recipe.name = name_fixes[recipe.name]
                recipe.save()
                self.stdout.write(f"   ✅ {old_name} → {recipe.name}")
                fixed_names += 1
            else:
                self.stdout.write(self.style.WARNING(f"   ⚠️  No hay corrección para: {recipe.name}"))
        
        self.stdout.write(f"\n✅ Nombres corregidos: {fixed_names}")
        
        # 2. Reemplazar AOVE por aceite de oliva
        self.stdout.write("\n🔄 Reemplazando AOVE por aceite de oliva...")
        
        recipes_with_aove = Recipe.objects.filter(
            models.Q(ingredients__icontains='AOVE') | 
            models.Q(instructions__icontains='AOVE')
        )
        
        replaced_count = 0
        
        for recipe in recipes_with_aove:
            updated = False
            
            # Reemplazar en ingredientes
            if recipe.ingredients:
                if isinstance(recipe.ingredients, list):
                    ingredients_str = json.dumps(recipe.ingredients)
                    if 'AOVE' in ingredients_str:
                        ingredients_str = ingredients_str.replace('AOVE', 'aceite de oliva')
                        recipe.ingredients = json.loads(ingredients_str)
                        updated = True
                elif isinstance(recipe.ingredients, str):
                    if 'AOVE' in recipe.ingredients:
                        recipe.ingredients = recipe.ingredients.replace('AOVE', 'aceite de oliva')
                        updated = True
            
            # Reemplazar en instrucciones
            if recipe.instructions and 'AOVE' in recipe.instructions:
                recipe.instructions = recipe.instructions.replace('AOVE', 'aceite de oliva')
                updated = True
            
            if updated:
                recipe.save()
                self.stdout.write(f"   ✅ {recipe.name}")
                replaced_count += 1
        
        self.stdout.write(f"\n✅ Recetas actualizadas: {replaced_count}")
        
        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(self.style.SUCCESS("✅ Proceso completado"))
        self.stdout.write("=" * 70)
