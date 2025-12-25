"""
Comando para actualizar referencias de recetas en comidas del plan
Reemplaza recetas desactivadas (con números) por sus versiones activas (sin números)
"""
from django.core.management.base import BaseCommand
from nutrition.models import PlanMeal, Recipe
import re


class Command(BaseCommand):
    help = 'Actualiza referencias de recetas en comidas del plan para usar versiones sin números'

    def handle(self, *args, **options):
        self.stdout.write("=" * 70)
        self.stdout.write(self.style.SUCCESS("🔧 ACTUALIZANDO REFERENCIAS DE RECETAS EN COMIDAS DEL PLAN"))
        self.stdout.write("=" * 70 + "\n")
        
        # Obtener todas las comidas del plan que tienen recetas sugeridas
        plan_meals = PlanMeal.objects.filter(plan__is_active=True).prefetch_related('suggested_recipes')
        
        updated_count = 0
        meals_updated = 0
        
        for meal in plan_meals:
            meal_updated = False
            recipes_to_remove = []
            recipes_to_add = []
            
            for recipe in meal.suggested_recipes.all():
                # Si la receta está inactiva o tiene números en el nombre, buscar su versión activa
                if not recipe.is_active or re.search(r'\d+', recipe.name):
                    # Buscar receta activa con nombre similar (sin números)
                    # Extraer el tipo y descripción del nombre
                    name_parts = recipe.name.split(' - ')
                    if len(name_parts) >= 2:
                        tipo = name_parts[0].strip()
                        descripcion = name_parts[1].strip()
                        
                        # Eliminar números del tipo
                        tipo_limpio = re.sub(r'\s+\d+\s*', ' ', tipo).strip()
                        
                        # Buscar receta activa con nombre similar
                        # Primero buscar por descripción exacta
                        active_recipe = Recipe.objects.filter(
                            is_active=True,
                            name__icontains=descripcion
                        ).exclude(id=recipe.id).first()
                        
                        # Si no encuentra, buscar por tipo y descripción
                        if not active_recipe:
                            search_pattern = f"{tipo_limpio} de {descripcion}"
                            active_recipe = Recipe.objects.filter(
                                is_active=True,
                                name__icontains=descripcion
                            ).exclude(id=recipe.id).first()
                        
                        # Si no encuentra, buscar solo por descripción sin el tipo
                        if not active_recipe:
                            # Extraer solo la parte descriptiva (después de "de" o similar)
                            if ' de ' in descripcion:
                                descripcion_simple = descripcion.split(' de ')[-1]
                            else:
                                descripcion_simple = descripcion
                            
                            active_recipe = Recipe.objects.filter(
                                is_active=True,
                                name__icontains=descripcion_simple
                            ).exclude(id=recipe.id).first()
                        
                        if active_recipe:
                            recipes_to_remove.append(recipe)
                            if active_recipe not in meal.suggested_recipes.all():
                                recipes_to_add.append(active_recipe)
                                self.stdout.write(f"   ✅ {meal.name}: {recipe.name} → {active_recipe.name}")
                                updated_count += 1
                                meal_updated = True
                        else:
                            self.stdout.write(self.style.WARNING(f"   ⚠️  {meal.name}: No se encontró receta activa para '{recipe.name}'"))
                            recipes_to_remove.append(recipe)
                            meal_updated = True
            
            # Actualizar las recetas sugeridas
            if meal_updated:
                for recipe_to_remove in recipes_to_remove:
                    meal.suggested_recipes.remove(recipe_to_remove)
                
                for recipe_to_add in recipes_to_add:
                    meal.suggested_recipes.add(recipe_to_add)
                
                meals_updated += 1
        
        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(self.style.SUCCESS(f"✅ Proceso completado"))
        self.stdout.write(f"   Comidas actualizadas: {meals_updated}")
        self.stdout.write(f"   Referencias actualizadas: {updated_count}")
        self.stdout.write("=" * 70)






